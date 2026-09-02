"""Génère l'image Open Graph (1200x630) de Rem pour Google/partages sociaux."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).parent
WOFF2 = ROOT / "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2"
TTF = ROOT / "assets/space-grotesk-700.ttf"
LOGO = ROOT / "src-tauri/icons/128x128@2x.png"
OUT = ROOT / "landing/public/og.png"

W, H = 1200, 630
C1 = (109, 40, 217)   # #6d28d9
C2 = (168, 85, 247)   # #a855f7
C3 = (217, 70, 239)   # #d946ef


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad(t):
    return lerp(C1, C2, t * 2) if t < 0.5 else lerp(C2, C3, (t - 0.5) * 2)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not TTF.exists():
        f = TTFont(str(WOFF2)); f.flavor = None; f.save(str(TTF))

    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = grad((x + y) / (W + H))
    d = ImageDraw.Draw(img)

    # halo sombre bas pour lisibilité
    overlay = Image.new("L", (W, H), 0)
    ImageDraw.Draw(overlay).rectangle([0, 0, W, H], fill=60)
    img = Image.composite(Image.new("RGB", (W, H), (10, 6, 18)), img, overlay)
    d = ImageDraw.Draw(img)

    brand = ImageFont.truetype(str(TTF), 130)
    tag = ImageFont.truetype(str(TTF), 44)
    url = ImageFont.truetype(str(TTF), 32)

    d.text((80, 150), "REM", font=brand, fill=(255, 255, 255))
    d.text((84, 300), "Contrôle ton PC depuis", font=tag, fill=(240, 230, 255))
    d.text((84, 352), "ton téléphone.", font=tag, fill=(240, 230, 255))
    d.text((84, 470), "souris · clavier · écran · caméra · audio", font=url, fill=(210, 190, 245))
    d.text((84, 520), "rem.nade.click", font=url, fill=(255, 255, 255))

    # logo à droite
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((300, 300))
        img.paste(logo, (W - 380, H // 2 - 150), logo)

    img.save(OUT)
    print("og ->", OUT)


if __name__ == "__main__":
    main()
