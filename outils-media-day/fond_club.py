# Fonds Villemomble pour le media day : écusson détouré + deux variantes de fond (4128 x 6192).
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import sys
W, H = 4128, 6192
src = Image.open('/Users/fouka/Downloads/logo villemomble.jpeg').convert('RGB')
# écusson : on agrandit d'abord, puis on vide le bleu ciel extérieur depuis les coins (le liseré marine protège l'intérieur)
k = 6
g = src.resize((src.width*k, src.height*k), Image.LANCZOS)
m = g.copy()
for xy in [(0,0),(m.width-1,0),(0,m.height-1),(m.width-1,m.height-1)]:
    ImageDraw.floodfill(m, xy, (255,0,255), thresh=60)
diff = ImageChops.difference(m, Image.new('RGB', m.size, (255,0,255))).convert('L')
alpha = diff.point(lambda v: 0 if v == 0 else 255).filter(ImageFilter.GaussianBlur(2)).point(lambda v: 0 if v<128 else min(255,(v-128)*2))
crest = g.convert('RGBA'); crest.putalpha(alpha)
crest = crest.crop(alpha.getbbox())
crest.save('ecusson.png'); print('ecusson', crest.size)

CIEL=(147,205,234); CIEL_CLAIR=(196,229,246); CIEL_FONCE=(96,165,208); MARINE=(27,38,74)
def degrade(c_centre, c_bord, cx=0.5, cy=0.36):
    # dégradé radial : 0 au centre, 255 au bord ; ellipse plus haute que large, centrée sur le buste
    rw, rh = int(W*1.9), int(H*1.5)
    rad = Image.radial_gradient('L').resize((rw, rh), Image.BICUBIC)
    d = Image.new('L', (W, H), 255)
    d.paste(rad, (int(W*cx - rw/2), int(H*cy - rh/2)))
    return Image.composite(Image.new('RGB',(W,H),c_bord), Image.new('RGB',(W,H),c_centre), d)

def colle(fond, im, x, y, op=1.0):
    if op < 1: 
        im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v*op)))
    fond.alpha_composite(im, (int(x), int(y)))

# A : mur de logos (comme une toile d'interview), légèrement flou pour la profondeur
A = degrade(CIEL_CLAIR, CIEL).convert('RGBA')
hc = 620; c = crest.resize((int(crest.width*hc/crest.height), hc), Image.LANCZOS)
pas_x, pas_y = 1032, 900
r = 0
y = -hc//2
while y < H:
    dec = 0 if r % 2 == 0 else pas_x//2
    x = -pas_x + dec + (pas_x - c.width)//2
    while x < W:
        colle(A, c, x, y); x += pas_x
    y += pas_y; r += 1
A = A.filter(ImageFilter.GaussianBlur(5))
A.convert('RGB').save('fond_A_mur.jpg', quality=93)

# B : dégradé ciel, grand écusson en filigrane derrière le joueur, bandeau marine en bas, écusson net en haut à gauche
B = degrade(CIEL_CLAIR, CIEL_FONCE).convert('RGBA')
hb = 4300; big = crest.resize((int(crest.width*hb/crest.height), hb), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
colle(B, big, (W-big.width)//2, 500, 0.30)
d = ImageDraw.Draw(B)
d.polygon([(0,H-900),(W,H-1700),(W,H),(0,H)], fill=MARINE+(255,))
d.polygon([(0,H-1010),(W,H-1810),(W,H-1740),(0,H-940)], fill=(255,255,255,255))
hs = 760; small = crest.resize((int(crest.width*hs/crest.height), hs), Image.LANCZOS)
colle(B, small, 230, 230)
B.convert('RGB').save('fond_B_filigrane.jpg', quality=93)
for n in ['fond_A_mur','fond_B_filigrane']:
    Image.open(n+'.jpg').resize((W//6,H//6)).save(n+'_v.jpg')
