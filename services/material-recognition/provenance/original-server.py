#!/usr/bin/env python3
"""Karpit-anyag felismero: statikus kiszolgalo + Anthropic proxy. Nulla fuggoseg.

  set ANTHROPIC_API_KEY=sk-...
  python server.py            # http://localhost:8000
  python server.py --selftest
"""
import base64, json, os, sys, time, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).parent
LOG = HERE / "log"
MODEL = os.environ.get("KARPIT_MODEL", "claude-opus-5")
MAX_UPLOAD = 6 * 1024 * 1024
NAPI_LIMIT = int(os.environ.get("KARPIT_NAPI_LIMIT", 200))   # osszes elemzes / nap
IP_LIMIT = int(os.environ.get("KARPIT_IP_LIMIT", 10))        # egy latogato / ora

# ponytail: memoriaban tartott szamlalok - ujrainditasra nullazodnak, egy processzre
# ervenyesek. Ha tobb worker vagy tartos kvota kell, tedd sqlite-ba.
_napi = {"nap": "", "db": 0}
_ipnaplo = {}


def kvota(ip):
    """None ha mehet, kulonben a visszautasitas oka."""
    ma = time.strftime("%Y-%m-%d")
    if _napi["nap"] != ma:
        _napi.update(nap=ma, db=0)
    if _napi["db"] >= NAPI_LIMIT:
        return "napi"
    most = time.time()
    friss = [t for t in _ipnaplo.get(ip, []) if most - t < 3600]
    if len(friss) >= IP_LIMIT:
        _ipnaplo[ip] = friss
        return "ip"
    _ipnaplo[ip] = friss + [most]
    _napi["db"] += 1
    return None


def extract_json(text):
    """A modell valasza korul lehet magyarazo szoveg vagy ```json kerites."""
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("nincs JSON a valaszban")
    return json.loads(text[start:end + 1])


def analyze(b64, media_type, note):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY nincs beallitva")
    payload = {
        "model": MODEL,
        # Adaptiv gondolkodas alapbol be van kapcsolva: a thinking tokenek is
        # ide szamitanak, ezert boven meretezve - csak a ténylegesen generaltat fizeted.
        "max_tokens": 8000,
        "system": (HERE / "prompt.txt").read_text(encoding="utf-8"),
        "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
            {"type": "text", "text": note.strip() or "Elemezd a kepet."},
        ]}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode(),
        headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                 "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        body = json.load(r)
    return extract_json("".join(b.get("text", "") for b in body["content"]))


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            self._send(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
        else:
            self._send(404, {"hiba": "nincs ilyen oldal"})

    def do_POST(self):
        if self.path != "/api":
            return self._send(404, {"hiba": "nincs ilyen vegpont"})
        # ponytail: az X-Forwarded-For-t elhisszuk - csak sajat reverse proxy mogott futtasd,
        # kozvetlen internetre kitéve barki hamisithatja es megkerulheti az IP-limitet.
        ip = (self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
              or self.client_address[0])
        ok = kvota(ip)
        if ok == "napi":
            return self._send(429, {"hiba": "A mai keret elfogyott. Holnap újra elérhető."})
        if ok == "ip":
            return self._send(429, {"hiba": "Túl sok kérés egymás után. Próbáld újra később."})
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD:
            return self._send(413, {"hiba": "tul nagy kep"})
        try:
            body = json.loads(self.rfile.read(n))
            b64 = body["image"].split(",")[-1]          # data: URL prefix levagasa
            result = analyze(b64, body.get("media_type", "image/jpeg"), body.get("note", ""))
        except urllib.error.HTTPError as e:
            print(f"[HIBA] API {e.code}: {e.read().decode()[:400]}", file=sys.stderr)
            return self._send(502, {"hiba": "Az elemzés most nem érhető el. Próbáld újra pár perc múlva."})
        except Exception as e:
            print(f"[HIBA] {type(e).__name__}: {e}", file=sys.stderr)
            return self._send(502, {"hiba": "Az elemzés most nem érhető el. Próbáld újra pár perc múlva."})
        # Veletlen utotag: ket egyidejű keres ugyanabban a masodpercben kulonben
        # ugyanazt a fajlnevet kapna, es az egyik kep felulirna a masikat.
        stamp = time.strftime("%Y%m%d-%H%M%S") + "-" + os.urandom(3).hex()
        (LOG / f"{stamp}.jpg").write_bytes(base64.b64decode(b64))
        with (LOG / "eredmenyek.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"kep": f"{stamp}.jpg", **result}, ensure_ascii=False) + "\n")
        self._send(200, result)

    def log_message(self, *a):
        pass


def selftest():
    assert extract_json('```json\n{"anyag": "bársony", "biztonsag": 80}\n```')["anyag"] == "bársony"
    assert extract_json('Itt a valasz: {"a": {"b": 1}} vege.')["a"]["b"] == 1
    for bad in ("nincs itt semmi", "}{"):
        try:
            extract_json(bad); assert False, bad
        except ValueError:
            pass
    assert (HERE / "prompt.txt").exists() and (HERE / "index.html").exists()
    globals()["IP_LIMIT"], globals()["NAPI_LIMIT"] = 2, 3
    _napi.update(nap="", db=0); _ipnaplo.clear()
    assert [kvota("1.1.1.1") for _ in range(3)] == [None, None, "ip"], "IP-limit nem fog"
    assert kvota("2.2.2.2") is None and kvota("3.3.3.3") == "napi", "napi limit nem fog"
    assert "claude" not in (HERE / "index.html").read_text(encoding="utf-8").lower()
    print("selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest(); sys.exit()
    LOG.mkdir(exist_ok=True)
    port = int(os.environ.get("PORT", 8000))
    print(f"Modell: {MODEL}\nNyitva: http://localhost:{port}  (telefonrol: http://<gep-IP>:{port})")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
