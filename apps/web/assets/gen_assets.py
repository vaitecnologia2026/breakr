"""
Gera os assets-fonte do app Breakr a partir da marca "brasa":
  - assets/icon.png    1024x1024  (fundo #0F0D05 arredondado + brasa gradiente)
  - assets/splash.png  2732x2732  (fundo #0F0D05 + brasa centralizada)

A brasa é o path do favicon.svg (viewBox 0 0 32 32):
  M18.5 4 9 18h6l-2.5 10L23 13h-6.2L18.5 4Z
com gradiente linear #94122C -> #CA3F17 -> #FF9406 (userSpaceOnUse 6,4 -> 26,28).
"""
import os
from PIL import Image, ImageDraw

BG = (0x0F, 0x0D, 0x05)          # #0F0D05
G0 = (0x94, 0x12, 0x2C)          # #94122C
G1 = (0xCA, 0x3F, 0x17)          # #CA3F17
G2 = (0xFF, 0x94, 0x06)          # #FF9406

# Path do favicon em coordenadas 0..32
PATH = [
    (18.5, 4), (9, 18), (15, 18), (12.5, 28), (23, 13), (16.8, 13), (18.5, 4),
]

# Gradiente do SVG: eixo de (6,4) a (26,28), stops em 0, 0.48, 1
GRAD_P0 = (6.0, 4.0)
GRAD_P1 = (26.0, 28.0)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def grad_color(t):
    t = max(0.0, min(1.0, t))
    if t <= 0.48:
        return lerp(G0, G1, t / 0.48)
    return lerp(G1, G2, (t - 0.48) / 0.52)


def build_gradient_tile(size):
    """Gera um tile RGBA do gradiente ao longo do eixo GRAD_P0->GRAD_P1 (em espaço 0..32)."""
    dx = GRAD_P1[0] - GRAD_P0[0]
    dy = GRAD_P1[1] - GRAD_P0[1]
    denom = dx * dx + dy * dy
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        uy = y / size * 32.0
        for x in range(size):
            ux = x / size * 32.0
            t = ((ux - GRAD_P0[0]) * dx + (uy - GRAD_P0[1]) * dy) / denom
            px[x, y] = grad_color(t)
    return img


def render_brasa(canvas_size, scale, offset):
    """Desenha a brasa (com gradiente) num RGBA canvas_size, com fator scale e offset (px)."""
    SS = 4  # supersampling
    s = canvas_size * SS
    # máscara do path
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    pts = [((px * scale + offset[0]) * SS, (py * scale + offset[1]) * SS) for (px, py) in PATH]
    md.polygon(pts, fill=255)
    # gradiente
    grad = build_gradient_tile(s)
    # aplica offset/scale ao gradiente: gerar gradiente no mesmo referencial do path.
    # build_gradient_tile mapeia 0..s -> 0..32; precisamos que o gradiente acompanhe
    # a brasa transformada. Reconstruímos com a mesma transformação inversa:
    grad = Image.new("RGB", (s, s))
    gp = grad.load()
    dx = GRAD_P1[0] - GRAD_P0[0]
    dy = GRAD_P1[1] - GRAD_P0[1]
    denom = dx * dx + dy * dy
    for y in range(s):
        uy = ((y / SS) - offset[1]) / scale
        for x in range(s):
            ux = ((x / SS) - offset[0]) / scale
            t = ((ux - GRAD_P0[0]) * dx + (uy - GRAD_P0[1]) * dy) / denom
            gp[x, y] = grad_color(t)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out.resize((canvas_size, canvas_size), Image.LANCZOS)


def make_icon(path, size=1024):
    # brasa ocupa ~62% do canvas, centralizada
    scale = size / 32.0 * 0.62
    brasa_w = 32 * scale
    offset = ((size - brasa_w) / 2, (size - brasa_w) / 2)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # fundo arredondado
    r = int(size * 0.22)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg)
    bd.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG + (255,))
    img = Image.alpha_composite(img, bg)
    brasa = render_brasa(size, scale, offset)
    img = Image.alpha_composite(img, brasa)
    img.convert("RGB").save(path, "PNG")
    print("wrote", path, size)


def make_splash(path, size=2732):
    scale = size / 32.0 * 0.26  # brasa menor, centralizada em canvas grande
    brasa_w = 32 * scale
    offset = ((size - brasa_w) / 2, (size - brasa_w) / 2)
    img = Image.new("RGBA", (size, size), BG + (255,))
    brasa = render_brasa(size, scale, offset)
    img = Image.alpha_composite(img, brasa)
    img.convert("RGB").save(path, "PNG")
    print("wrote", path, size)


here = os.path.dirname(os.path.abspath(__file__))
make_icon(os.path.join(here, "icon.png"), 1024)
make_splash(os.path.join(here, "splash.png"), 2732)
