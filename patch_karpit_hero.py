# -*- coding: utf-8 -*-
"""Egyszeri: kárpittisztítás aloldalak hero → split + trust badge (mint karpittisztitas-gyor.html)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

TRUST_ASIDE = r"""            <aside class="subpage-hero-trust" aria-label="Garanciák és minőség">
                <article class="trust-badge-card">
                    <span class="trust-badge-card__tag">GARANCIA</span>
                    <div class="trust-badge-card__visual">
                        <img src="img/elegedettseg-garancia.webp" width="176" height="176"
                            alt="Elégedettségi garancia jelvény" loading="lazy" decoding="async">
                    </div>
                    <h3 class="trust-badge-card__title">100% elégedettségi garancia</h3>
                    <p class="trust-badge-card__desc">Vagy pénzvisszafizetés – ígérjük</p>
                </article>
                <article class="trust-badge-card">
                    <span class="trust-badge-card__tag">BIO</span>
                    <div class="trust-badge-card__visual">
                        <img src="img/vegyszermentes-karpittisztitas-2.webp" width="176" height="176"
                            alt="Vegyszermentes kárpittisztítás jelvény" loading="lazy" decoding="async">
                    </div>
                    <h3 class="trust-badge-card__title">100% vegyszermentes &amp; ökológiai</h3>
                    <p class="trust-badge-card__desc">Gyermek- és allergiabarát</p>
                </article>
                <article class="trust-badge-card">
                    <span class="trust-badge-card__tag">HIVATALOS</span>
                    <div class="trust-badge-card__visual">
                        <img src="img/karpittisztitas-kanape.webp" width="176" height="176"
                            alt="ECO Clean kárpittisztítás hivatalos jelvény" loading="lazy" decoding="async">
                    </div>
                    <h3 class="trust-badge-card__title">Szabadalmaztatott, tanúsított technológia</h3>
                    <p class="trust-badge-card__desc">Hivatalosan engedélyezett eljárás</p>
                </article>
                <article class="trust-badge-card">
                    <span class="trust-badge-card__tag">BEVIZSGÁLT</span>
                    <div class="trust-badge-card__visual">
                        <img src="img/vegyszermentes-karpittisztito.webp" width="176" height="176"
                            alt="Vegyszermentes tisztító, bevizsgált minőség jelvény" loading="lazy" decoding="async">
                    </div>
                    <h3 class="trust-badge-card__title">99,9% atkaeltávolítás</h3>
                    <p class="trust-badge-card__desc">Klinikailag tesztelt és igazolt</p>
                </article>
            </aside>"""


def patch_hero(html: str) -> tuple[str, bool]:
    start = html.find('<section class="subpage-hero"')
    if start == -1:
        return html, False
    end = html.find('</section>', start)
    if end == -1:
        return html, False
    end += len('</section>')
    hero = html[start:end]
    if 'subpage-hero-container--split' in hero:
        return html, False

    hero2 = hero
    if '<section class="subpage-hero">' in hero2:
        hero2 = hero2.replace(
            '<section class="subpage-hero">',
            '<section class="subpage-hero" id="main-content">',
            1,
        )

    if '<div class="subpage-hero-container">' not in hero2:
        return html, False

    hero2 = hero2.replace(
        '<div class="subpage-hero-container">',
        '<div class="subpage-hero-container subpage-hero-container--split">\n            <div class="subpage-hero-content">',
        1,
    )

    replacement = (
        "            </div>\n            </div>\n"
        + TRUST_ASIDE
        + "\n        </div>\n    </section>"
    )
    hero3 = re.sub(
        r"            </div>\s*</div>\s*</section>\s*$",
        replacement,
        hero2,
        count=1,
    )
    if hero3 == hero2:
        return html, False

    return html[:start] + hero3 + html[end:], True


def main():
    files = sorted(ROOT.glob("karpittisztitas-*.html"))
    ok = 0
    skip = 0
    for path in files:
        if path.name == "karpittisztitas-gyor.html":
            skip += 1
            continue
        text = path.read_text(encoding="utf-8")
        new_text, changed = patch_hero(text)
        if changed:
            path.write_text(new_text, encoding="utf-8")
            ok += 1
            print("OK", path.name)
        else:
            print("SKIP", path.name)
    print("Patched:", ok, "Skipped:", skip + (len(files) - ok - skip))


if __name__ == "__main__":
    main()
