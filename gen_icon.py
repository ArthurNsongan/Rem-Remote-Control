"""Génère le logo REM : un toucher sur le trackpad, en relief.

Tuile violette aux coins arrondis, un point blanc entouré de deux ondes, une
ombre décalée sous le point et un reflet en haut de la tuile. Le relief passe
par des aplats superposés plutôt que par du flou, pour rester net en 16 px.

Le dessin est fait en 120 unités, puis rendu à 4× la taille finale et réduit :
Pillow n'anticrénelle pas ses cercles, le suréchantillonnage s'en charge.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent
OUT = ROOT / "assets/logo.png"

S = 1024          # taille finale
SS = S * 4        # taille de travail
U = SS / 120      # une unité du dessin, en pixels de travail

TUILE = (109, 40, 217)        # #6d28d9
REFLET = (124, 58, 237)       # #7c3aed
ONDE_EXT = (196, 181, 253)    # #c4b5fd
ONDE_INT = (233, 213, 255)    # #e9d5ff
OMBRE = (76, 29, 149)         # #4c1d95
POINT = (255, 255, 255)


def disque(d: ImageDraw.ImageDraw, cx, cy, r, fill):
    d.ellipse([(cx - r) * U, (cy - r) * U, (cx + r) * U, (cy + r) * U], fill=fill)


def anneau(d: ImageDraw.ImageDraw, cx, cy, r, w, fill):
    """Anneau centré sur le rayon `r`, d'épaisseur `w` (Pillow trace vers l'intérieur)."""
    e = r + w / 2
    d.ellipse(
        [(cx - e) * U, (cy - e) * U, (cx + e) * U, (cy + e) * U],
        outline=fill,
        width=round(w * U),
    )


def main():
    OUT.parent.mkdir(exist_ok=True)

    dessin = Image.new("RGB", (SS, SS), TUILE)
    d = ImageDraw.Draw(dessin)

    # Reflet : une ellipse claire qui déborde du haut, coupée par la tuile.
    d.ellipse([(60 - 92) * U, (-12 - 54) * U, (60 + 92) * U, (-12 + 54) * U], fill=REFLET)

    anneau(d, 60, 60, 42, 4, ONDE_EXT)
    anneau(d, 60, 60, 26, 7, ONDE_INT)
    disque(d, 64, 65, 12, OMBRE)   # ombre décalée vers le bas-droite
    disque(d, 60, 60, 12, POINT)

    # Coins arrondis : 28 unités sur 120, comme la maquette.
    masque = Image.new("L", (SS, SS), 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, SS - 1, SS - 1], radius=round(28 * U), fill=255)

    img = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    img.paste(dessin, (0, 0), masque)

    img.resize((S, S), Image.LANCZOS).save(OUT)
    print("logo ->", OUT)


if __name__ == "__main__":
    main()
