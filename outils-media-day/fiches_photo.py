# Photo de fiche (carré 800 centré sur le visage) à partir de la meilleure photo de face de chaque personne.
# Usage : python3 fiches_photo.py <reglages.json> <dossier de travail des références> <dossier de sortie>
import json, os, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(sys.argv[1])); refs = json.load(open(os.path.join(sys.argv[2], 'refs.json'))); out = sys.argv[3]; os.makedirs(out, exist_ok=True)
for p in G['personnes']:
    r = refs.get(p.get('player_id') or '', [])
    if not r: print('SANS PHOTO', p['dossier']); continue
    src = os.path.join(G['dossier'], p['dossier'], G['sous_dossier'], r[0])     # la première choisie est la meilleure de face
    v = subprocess.run([os.path.join(ICI, 'avatar'), os.path.join(out, p['player_id'] + '.jpg'), src], capture_output=True, text=True).stdout.strip()
    if v != 'ok': print('KO', p['dossier'], v)
