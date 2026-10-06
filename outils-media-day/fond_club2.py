# Fond « filigrane » aux couleurs d'un club (celui retenu par Fouka pour Villemomble le 06/10/2026) :
# dégradé clair, grand écusson estompé derrière le joueur, bandeau foncé en bas avec liseré, petit écusson net en haut à gauche.
# Usage : python3 fond_club2.py <ecusson.png (fond transparent)> <sortie.jpg> <clair> <moyen> <fonce> <lisere> [largeur hauteur]
# (couleurs en #rrggbb). Le dessin se proportionne à la largeur ; le bandeau reste ancré en bas : une photo recadrée garde tout.
import sys
from PIL import Image, ImageDraw, ImageFilter
W, H = (int(sys.argv[7]), int(sys.argv[8])) if len(sys.argv) > 8 else (4128, 6192)
k = W / 4128
logo, sortie = sys.argv[1], sys.argv[2]
hexa = lambda s: tuple(int(s.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
CLAIR, MOYEN, FONCE, LISERE = map(hexa, sys.argv[3:7])
crest = Image.open(logo).convert('RGBA'); crest = crest.crop(crest.getchannel('A').getbbox())
rw, rh = int(W * 1.9), int(W * 2.25)
rad = Image.radial_gradient('L').resize((rw, rh), Image.BICUBIC)
m = Image.new('L', (W, H), 255); m.paste(rad, (int(W * 0.5 - rw / 2), int(W * 0.54 - rh / 2)))
B = Image.composite(Image.new('RGB', (W, H), MOYEN), Image.new('RGB', (W, H), CLAIR), m).convert('RGBA')
def colle(im, x, y, op=1.0):
    if op < 1: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * op)))
    B.alpha_composite(im, (int(x), int(y)))
lb = int(W * 0.84); big = crest.resize((lb, int(crest.height * lb / crest.width)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4 * k))
colle(big, (W - big.width) // 2, 560 * k, 0.30)
d = ImageDraw.Draw(B)
d.polygon([(0, H - 900 * k), (W, H - 1700 * k), (W, H), (0, H)], fill=FONCE + (255,))
d.polygon([(0, H - 1010 * k), (W, H - 1810 * k), (W, H - 1740 * k), (0, H - 940 * k)], fill=LISERE + (255,))
hs = int(760 * k); small = crest.resize((int(crest.width * hs / crest.height), hs), Image.LANCZOS)
colle(small, 230 * k, 230 * k)
B.convert('RGB').save(sortie, quality=93)
