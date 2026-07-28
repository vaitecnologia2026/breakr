"""Gera icone 512x512 e feature graphic 1024x500 da Play Store."""
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "..", "assets", "icon.png")

# icone 512x512 (a Play Store exige 512x512 PNG 32-bit)
icon = Image.open(src).convert("RGB").resize((512, 512), Image.LANCZOS)
icon.save(os.path.join(here, "icon-512.png"), "PNG", optimize=True)
print("wrote icon-512.png")

# feature graphic 1024x500 — fundo #0F0D05 com a brasa e o wordmark
BG = (0x0F, 0x0D, 0x05)
fg = Image.new("RGB", (1024, 500), BG)

brasa = Image.open(src).convert("RGBA")
# recorta o brasa do icone (sem o fundo arredondado) reaproveitando o proprio icone:
# apenas colamos o icone inteiro reduzido a esquerda.
target_h = 300
ratio = target_h / brasa.size[1]
brasa_r = brasa.resize((int(brasa.size[0] * ratio), target_h), Image.LANCZOS)
fg.paste(brasa_r, (110, (500 - target_h) // 2), brasa_r)

# wordmark "Breakr" a direita usando a logo branca oficial se possivel
logo_path = os.path.join(here, "..", "public", "breakr-logo-branca.png")
if os.path.exists(logo_path):
    logo = Image.open(logo_path).convert("RGBA")
    lh = 120
    lr = lh / logo.size[1]
    logo_r = logo.resize((int(logo.size[0] * lr), lh), Image.LANCZOS)
    fg.paste(logo_r, (470, (500 - lh) // 2), logo_r)

fg.save(os.path.join(here, "feature-graphic-1024x500.png"), "PNG", optimize=True)
print("wrote feature-graphic-1024x500.png")
