# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parent

repls = [
    (
        "<strong>15+ év tapasztalat</strong>, <strong>191+ elégedett\n"
        "                    ügyfél</strong>,",
        "<strong>2004 óta</strong>, <strong>200+ 5*-os értékelés</strong>,",
    ),
    ("⭐ 5.0 (191+ vélemény)", "⭐ 5.0 (200+ 5*-os értékelés)"),
    (
        '                    <span class="number">15+</span>\n'
        '                    <span class="label">év tapasztalat</span>',
        '                    <span class="number">2004</span>\n'
        '                    <span class="label">óta</span>',
    ),
    (
        '                    <span class="number">191+</span>\n'
        '                    <span class="label">elégedett ügyfél</span>',
        '                    <span class="number">200+</span>\n'
        '                    <span class="label">5*-os értékelés</span>',
    ),
    ("15+ év tapasztalat, 191+ elégedett ügyfél", "2004 óta, 200+ 5*-os értékelés"),
    ("15+ év tapasztalat.", "2004 óta."),
    (
        "15+ év\n                    tapasztalat, 191+ elégedett ügyfél,",
        "2004 óta, 200+ 5*-os értékelés,",
    ),
    ("191+ elégedett ügyfél ", "200+ 5*-os értékelés "),
]

for p in sorted(root.glob("karpittisztitas*.html")):
    t = p.read_text(encoding="utf-8")
    orig = t
    for a, b in repls:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("OK", p.name)
