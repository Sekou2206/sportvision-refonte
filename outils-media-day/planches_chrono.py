# Planches chronologiques d'un _A TRIER : chaque photo numérotée, avec l'écart depuis la précédente.
# Usage : python3 planches_chrono.py "<dossier _A TRIER>"   (écrit rows.json, v_*.jpg et pl_N.jpg ici)
import os, sys, datetime, json
from PIL import Image, ImageDraw, ImageFont, ImageOps
src = sys.argv[1]; rows = []
for f in sorted(os.listdir(src)):
    if f.startswith('._') or not f.lower().endswith(('.jpg', '.jpeg')): continue
    with Image.open(os.path.join(src, f)) as im:
        ex = im.getexif(); sub = ex.get_ifd(0x8769); dt = sub.get(36867) or ex.get(306); ss = str(sub.get(37521) or '0').strip()
        t = datetime.datetime.strptime(dt, '%Y:%m:%d %H:%M:%S').timestamp() + float('0.' + ss)
        im.draft('RGB', (700, 700)); im = ImageOps.exif_transpose(im); im.thumbnail((330, 330)); im.save(f'v_{f}', quality=80)
    rows.append((t, f))
rows.sort(); json.dump(rows, open('rows.json', 'w'))
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 26); cols, n = 8, 32
for s in range(0, len(rows), n):
    part = rows[s:s + n]; P = Image.new('RGB', (cols * 250, ((len(part) + cols - 1) // cols) * 372), 'white'); d = ImageDraw.Draw(P)
    for i, (t, f) in enumerate(part):
        k = s + i; im = Image.open(f'v_{f}'); im.thumbnail((244, 330)); x, y = (i % cols) * 250, (i // cols) * 372
        P.paste(im, (x + 3, y + 38)); gap = t - rows[k - 1][0] if k else 0
        d.text((x + 6, y + 4), f'{k+1}', fill='black', font=font); d.text((x + 90, y + 4), f'+{gap:.0f}s', fill=('red' if gap >= 8 else 'gray'), font=font)
    P.save(f'pl_{s//n+1}.jpg', quality=82)
print(len(rows), 'photos,', (len(rows) + n - 1) // n, 'planches ;', datetime.datetime.fromtimestamp(rows[0][0]), '→', datetime.datetime.fromtimestamp(rows[-1][0]))
