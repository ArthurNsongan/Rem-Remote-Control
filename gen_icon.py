"""Génère le logo REM (carré dégradé violet, coins arrondis, 'R' Space Grotesk)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).parent
WOFF2 = ROOT / "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2"
TTF = ROOT / "assets/space-grotesk-700.ttf"
OUT = ROOT / "assets/logo.png"

S = 1024
RADIUS = int(S * 0.235)

# couleurs (inspirées de l'app : violet → magenta)
C1 = (109, 40, 217)    # #6d28d9
C2 = (168, 85, 247)    # #a855f7
C3 = (217, 70, 239)    # #d946ef


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad(t):
    return lerp(C1, C2, t * 2) if t < 0.5 else lerp(C2, C3, (t - 0.5) * 2)


def main():
    OUT.parent.mkdir(exist_ok=True)
    # woff2 -> ttf
    if not TTF.exists():
        f = TTFont(str(WOFF2))
        f.flavor = None
        f.save(str(TTF))

    # dégradé diagonal
    base = Image.new("RGB", (S, S))
    px = base.load()
    for y in range(S):
        for x in range(S):
            px[x, y] = grad((x + y) / (2 * S))

    # halo radial clair en haut-gauche
    glow = Image.new("L", (S, S), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-S * 0.3, -S * 0.4, S * 0.8, S * 0.7], fill=70)
    base = Image.composite(Image.new("RGB", (S, S), (255, 255, 255)), base, glow.point(lambda v: v // 2))

    # masque coins arrondis
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=RADIUS, fill=255)

    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(base, (0, 0), mask)

    # liseré interne subtil
    ImageDraw.Draw(img).rounded_rectangle(
        [6, 6, S - 7, S - 7], radius=RADIUS - 6, outline=(255, 255, 255, 60), width=4
    )

    # "R"
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(TTF), int(S * 0.62))
    # ombre douce
    d.text((S / 2, S / 2 + 8), "R", font=font, anchor="mm", fill=(60, 10, 90, 120))
    d.text((S / 2, S / 2), "R", font=font, anchor="mm", fill=(255, 255, 255, 255))

    img.save(OUT)
    print("logo ->", OUT)


if __name__ == "__main__":
    main()
