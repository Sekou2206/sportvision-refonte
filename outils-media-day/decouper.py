# Découpe une série de media day en paquets (un par joueur) d'après les temps morts entre photos,
# et écrit une planche de vérification. Usage :
#   python3 decouper.py "<dossier _A TRIER>" "<fichier noms.txt, un nom de dossier par ligne, dans l'ordre de passage>" [seuil_secondes=25]
# Sortie : paquets.json (à côté de noms.txt) et VERIFICATION_n.jpg dans le dossier parent de _A TRIER.
# À SAVOIR (Villemomble, 06/10/2026) : un joueur refait parfois une pose après une longue pause (le
# paquet suivant commence alors par une photo de lui), et deux joueurs peuvent se suivre de moins de
# 25 s. Le nombre de paquets ne suffit pas : vérifier chaque transition à l'oeil avant de ranger.
import sys, os, json, datetime
from PIL import Image, ImageDraw, ImageFont
src, noms_txt = sys.argv[1], sys.argv[2]; seuil = float(sys.argv[3]) if len(sys.argv) > 3 else 25
noms = [l.strip() for l in open(noms_txt, encoding='utf-8') if l.strip()]
rows = []
for f in sorted(os.listdir(src)):
    if f.startswith('._') or not f.lower().endswith(('.jpg', '.jpeg')): continue
    with Image.open(os.path.join(src, f)) as im:
        ex = im.getexif(); sub = ex.get_ifd(0x8769)
        dt = sub.get(36867) or ex.get(306); ss = str(sub.get(37521) or '0').strip()
    t = datetime.datetime.strptime(dt, '%Y:%m:%d %H:%M:%S').timestamp() + float('0.' + ss)
    rows.append((t, f))
rows.sort()
paquets = [[rows[0]]]
for a, b in zip(rows, rows[1:]):
    (paquets.append([b]) if b[0] - a[0] > seuil else paquets[-1].append(b))
print(f'{len(rows)} photos, {len(paquets)} paquets pour {len(noms)} noms')
for i, p in enumerate(paquets):
    print(f"P{i+1:02d} {len(p):3d} photos  -> {noms[i] if i < len(noms) else '?'}")
json.dump([{'nom': noms[i] if i < len(noms) else None, 'fichiers': [f for _, f in p]} for i, p in enumerate(paquets)],
          open(os.path.join(os.path.dirname(noms_txt), 'paquets.json'), 'w'), ensure_ascii=False, indent=1)
