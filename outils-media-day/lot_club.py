# Pose toutes les photos d'un media day sur le fond du club, un fond PAR FORMAT de photo (recadrages).
# Usage : python3 lot_club.py "<Media day>" "<sous-dossier de sortie>" <ecusson.png> <clair> <moyen> <fonce> <lisere> [dossier1 dossier2 …]
import os, re, subprocess, sys
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__))
MD, sous, logo, *reste = sys.argv[1:]; couleurs, seuls = reste[:4], reste[4:]
env = dict(os.environ, FOND_RETRAIT=os.environ.get('FOND_RETRAIT', '3'))
fonds = {}; total = 0
for d in sorted(os.listdir(MD)):
    p = os.path.join(MD, d)
    if not (os.path.isdir(p) and re.match(r'\d\d ', d)) or (seuls and d not in seuls): continue
    out = os.path.join(p, sous); par_taille = {}
    for f in sorted(os.listdir(p)):
        if f.startswith('._') or not f.lower().endswith(('.jpg', '.jpeg')): continue
        with Image.open(os.path.join(p, f)) as im:
            w, h = im.size
            if im.getexif().get(274, 1) in (5, 6, 7, 8): w, h = h, w
        par_taille.setdefault((w, h), []).append(os.path.join(p, f))
    if not par_taille: print('VIDE', d); continue
    os.makedirs(out, exist_ok=True); ok = 0; n = sum(len(v) for v in par_taille.values())
    for (w, h), fichiers in par_taille.items():
        if (w, h) not in fonds:
            fonds[(w, h)] = os.path.join(ICI, f'_fond_{w}x{h}.jpg')
            subprocess.run([sys.executable, os.path.join(ICI, 'fond_club2.py'), logo, fonds[(w, h)], *couleurs, str(w), str(h)], check=True)
        r = subprocess.run([os.path.join(ICI, 'fond_club'), fonds[(w, h)], out] + fichiers, capture_output=True, text=True, env=env)
        for l in (r.stdout + r.stderr).strip().splitlines():
            if l.startswith('ok'): ok += 1
            if not l.startswith('ok') or not l.endswith('sur 1'): print('   >>', d, l)
    total += ok; print(f'{d} : {ok}/{n}', flush=True)
for f in fonds.values(): os.remove(f)
print('TOTAL', total)
