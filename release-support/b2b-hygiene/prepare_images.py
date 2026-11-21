"""One-off: convert the generated interiors, the certificate and our own job photos into release/assets/b2b.

    python release-support/b2b-hygiene/prepare_images.py <generated-png-dir> <certificate.png> <dir-with-hotel-matratzenreinigung_N.jpg>

The interiors are AI-generated (labelled "Generált kép" on the pages); the job photos are our own.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[2] / 'release' / 'assets' / 'b2b'
gen, cert, photos = map(Path, sys.argv[1:4])
OUT.mkdir(parents=True, exist_ok=True)

for png in sorted(gen.glob('*.png')):
    name = png.stem if png.stem.startswith('seg-') else ('magyarorszag' if png.stem == 'hub' else png.stem)
    if png.stem.startswith('test'):
        continue
    im = Image.open(png).convert('RGB')
    for w in (800, 1600):
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(OUT / f'szalloda-matrac-{name}-{w}.webp', quality=76, method=6)
    if not png.stem.startswith('seg-'):  # 1200x630 social image, centre crop
        h = round(im.width * 630 / 1200); top = (im.height - h) // 2
        im.crop((0, top, im.width, top + h)).resize((1200, 630), Image.LANCZOS).save(OUT / f'og-szalloda-matrac-{name}.jpg', quality=82, optimize=True, progressive=True)

c = Image.open(cert).convert('RGB')
c.save(OUT / 'tanusitvany-sablon.webp', quality=86, method=6)
# Hero thumbnail: sample name + red MINTA stamp, never mistaken for an issued certificate.
s = c.copy(); d = ImageDraw.Draw(s)
f = ImageFont.truetype(str(Path(sys.argv[2]).with_name('RobotoCondensed.ttf')), 46); f.set_variation_by_axes([300])
d.text((527, 690), 'MINTA SZÁLLODA', font=f, fill=(20, 20, 20), anchor='ms')
st = Image.new('RGBA', s.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
fs = ImageFont.truetype(str(Path(sys.argv[2]).with_name('RobotoCondensed.ttf')), 170); fs.set_variation_by_axes([800])
sd.rounded_rectangle((180, 610, 875, 830), radius=24, outline=(176, 40, 31, 70), width=12)
sd.text((527, 785), 'MINTA', font=fs, fill=(176, 40, 31, 60), anchor='ms')
st = st.rotate(28, center=(527, 720), resample=Image.BICUBIC)
s = Image.alpha_composite(s.convert('RGBA'), st).convert('RGB')
s.resize((480, round(s.height * 480 / s.width)), Image.LANCZOS).save(OUT / 'tanusitvany-minta-480.webp', quality=84, method=6)

for i, n in enumerate((2, 1, 4, 5), 1):  # own job photos (Lehrhotel Semmering, 2026)
    im = Image.open(photos / f'hotel-matratzenreinigung_{n}.jpg').convert('RGB')
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(OUT / f'matractisztitas-munka-{i}.webp', quality=78, method=6)
print(len(list(OUT.iterdir())), 'files,', sum(p.stat().st_size for p in OUT.iterdir()) // 1024, 'KB')
