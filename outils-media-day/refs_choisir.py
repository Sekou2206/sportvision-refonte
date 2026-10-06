# Choisit jusqu'à cinq photos de référence par personne (angles différents, visage visible) et les prépare en 1600 px.
# Usage : python3 refs_choisir.py <reglages.json> <dossier de travail>   (écrit refs.json et les fichiers <player_id>_<n>.jpg)
import json, os, subprocess, sys
from PIL import Image, ImageOps
ICI = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(sys.argv[1])); T = sys.argv[2]; os.makedirs(T, exist_ok=True); refs = {}
for p in G['personnes']:
    if not p.get('player_id'): continue
    d = os.path.join(G['dossier'], p['dossier'], G['sous_dossier'])
    fs = sorted(os.path.join(d, f) for f in os.listdir(d) if f.lower().endswith('.jpg') and not f.startswith('._'))
    r = [l.split('\t') for l in subprocess.run([os.path.join(ICI, 'visage_info')] + fs, capture_output=True, text=True).stdout.strip().splitlines()]
    c = [(x[0], abs(float(x[3])), float(x[4])) for x in r if len(x) > 2 and x[1] == '1' and float(x[4]) >= 0.30]
    pris = []
    def prendre(l):
        l = [x for x in l if x not in pris]
        if l and len(pris) < 5: pris.append(l[0])
    prendre(sorted([x for x in c if x[1] <= 12], key=lambda x: -x[2]))        # d'abord la meilleure de face
    prendre(sorted(c, key=lambda x: -x[1]))                                   # la plus de profil
    prendre(sorted([x for x in c if 10 <= x[1] <= 32], key=lambda x: -x[2]))  # un trois-quarts
    for _ in range(5): prendre(sorted(c, key=lambda x: -x[2]))                # puis les plus nettes
    refs[p['player_id']] = []
    for k, x in enumerate(pris):
        im = ImageOps.exif_transpose(Image.open(x[0])); im.thumbnail((1600, 2400), Image.LANCZOS)
        im.convert('RGB').save(os.path.join(T, f"{p['player_id']}_{k+1}.jpg"), quality=85); refs[p['player_id']].append(os.path.basename(x[0]))
    print(p['dossier'][:26].ljust(26), len(pris), 'sur', len(fs), '' if len(pris) >= 3 else '  <<< peu de visages')
json.dump(refs, open(os.path.join(T, 'refs.json'), 'w'), indent=1)
