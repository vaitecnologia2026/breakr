"""
Gera screenshots 1080x1920 on-brand para a Play Store.
Breakr é um OS interno (login-gated), então usamos frames de marketing com a
identidade da marca (brasa + wordmark + headlines), padrão para apps enterprise.
"""
import os
from PIL import Image, ImageDraw, ImageFont

here = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(here, "screenshots")
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 1920
BG = (0x0F, 0x0D, 0x05)
G1 = (0xCA, 0x3F, 0x17)
G2 = (0xFF, 0x94, 0x06)
WHITE = (245, 245, 245)
MUTED = (170, 165, 155)

ICON = os.path.join(here, "..", "assets", "icon.png")
LOGO = os.path.join(here, "..", "public", "breakr-logo-branca.png")


def font(sz, bold=True):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, sz)
            except Exception:
                continue
    return ImageFont.load_default()


def wrap(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def gradient_bar(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    for i in range(w):
        t = i / max(1, w - 1)
        c = tuple(int(G1[k] + (G2[k] - G1[k]) * t) for k in range(3))
        d.line([(x + i, y), (x + i, y + h)], fill=c)


def make(idx, headline, sub):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # topo: wordmark
    logo = Image.open(LOGO).convert("RGBA")
    lh = 110
    lr = lh / logo.size[1]
    logo_r = logo.resize((int(logo.size[0] * lr), lh), Image.LANCZOS)
    img.paste(logo_r, ((W - logo_r.size[0]) // 2, 150), logo_r)

    # barra gradiente decorativa
    gradient_bar(img, (W - 160) // 2, 320, 160, 10)

    # icone grande central
    icon = Image.open(ICON).convert("RGBA")
    isz = 460
    icon_r = icon.resize((isz, isz), Image.LANCZOS)
    img.paste(icon_r, ((W - isz) // 2, 470), icon_r)

    # headline
    fh = font(78, bold=True)
    lines = wrap(d, headline, fh, W - 160)
    y = 1050
    for ln in lines:
        tw = d.textlength(ln, font=fh)
        d.text(((W - tw) / 2, y), ln, font=fh, fill=WHITE)
        y += 96

    # subtitle
    fs = font(42, bold=False)
    y += 40
    for ln in wrap(d, sub, fs, W - 200):
        tw = d.textlength(ln, font=fs)
        d.text(((W - tw) / 2, y), ln, font=fs, fill=MUTED)
        y += 58

    img.save(os.path.join(OUT, f"screenshot-{idx}.png"), "PNG", optimize=True)
    print("wrote", f"screenshot-{idx}.png")


make(1, "Acenda a operação.", "O sistema operacional da Breakr, na palma da mão.")
make(2, "CRM, Financeiro e Projetos", "Comercial, cobranças, contratos e portais de cliente em um só lugar.")
make(3, "Marketing e Tráfego", "Campanhas, criativos, aprovações e métricas integradas.")
make(4, "RH, Squads e Metas", "Recrutamento, desempenho, comunicação e gestão de pessoas.")
make(5, "Quando os padrões não servem, nós quebramos.", "Uma plataforma única para toda a operação da Breakr.")
