# -*- coding: utf-8 -*-
"""Vygeneruje dva obrázky, ktoré sa nedajú poskladať v HTML.

  assets/img/og-gridservis.png   náhľad 1200 × 630 do Messengeru a na Facebook
  favicon.ico                    ikona pre prehliadače, ktoré si pýtajú /favicon.ico

Spúšťa sa ručne, len keď sa mení značka alebo veta pod logom:

    pip install pillow
    python3 tools/obrazky.py

Potrebuje Pillow. Výstupy sú v repe, takže pri bežnom generovaní stránok
(tools/gen.py) sa nič sťahovať ani inštalovať nemusí.
"""
import os

from PIL import Image, ImageChops, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(OUT, 'assets', 'img')

# Rozmer, ktorý čakajú Facebook, Messenger aj Twitter/X.
SIRKA, VYSKA = 1200, 630

TMAVA = (16, 23, 34)             # --dark zo styles.css
VETA = u'Celý servis v jednom programe'
PODVETA = u'Zákazky · sklad · fakturácia · Windows'

KROK = 42                        # rozostup mriežky, väčší ako na webe kvôli náhľadu
PISMA = [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]


def pismo(velkost):
    """Prvé dostupné bezpätkové písmo s diakritikou; inak vstavané."""
    for cesta in PISMA:
        if os.path.exists(cesta):
            return ImageFont.truetype(cesta, velkost)
    return ImageFont.load_default()


def mriezka():
    """Priehľadnosť mriežky: tenké linky, ktoré sa ku krajom vytrácajú.
    Vráti masku, cez ktorú sa na tmavé pozadie nanesie biela."""
    linky = Image.new('L', (SIRKA, VYSKA), 0)
    kresli = ImageDraw.Draw(linky)
    for x in range(0, SIRKA + KROK, KROK):
        kresli.line([(x, 0), (x, VYSKA)], fill=255)
    for y in range(0, VYSKA + KROK, KROK):
        kresli.line([(0, y), (SIRKA, y)], fill=255)

    # radiálne stmavenie od stredu k okrajom, nech linky nerušia text
    stmavenie = Image.new('L', (SIRKA, VYSKA), 0)
    body = stmavenie.load()
    stred_x, stred_y = SIRKA / 2.0, VYSKA * 0.42
    najdalej = (stred_x ** 2 + stred_y ** 2) ** 0.5
    for y in range(VYSKA):
        for x in range(SIRKA):
            d = (((x - stred_x) ** 2 + (y - stred_y) ** 2) ** 0.5) / najdalej
            body[x, y] = int(max(0.0, 1.0 - d * 1.15) * 52)

    return Image.eval(ImageChops.multiply(linky, stmavenie), lambda v: v)


def og():
    plagat = Image.new('RGB', (SIRKA, VYSKA), TMAVA)

    biela = Image.new('RGB', (SIRKA, VYSKA), (255, 255, 255))
    plagat.paste(biela, (0, 0), mriezka())

    # Logo je čierna kresba na bielom podklade. Na tmavé pozadie sa nedá
    # položiť tak, ako je — jas sa preto použije ako priehľadnosť a samotné
    # logo sa vykreslí nabielo. Biely podklad tým zmizne úplne.
    zdroj = Image.open(os.path.join(IMG, 'gridservis-logo.png')).convert('L')
    kryvost = zdroj.point(lambda v: 255 - v)
    # slabé pomocné linky v predlohe sa neprenášajú, ostane len kresba
    kryvost = kryvost.point(lambda v: 0 if v < 60 else v)
    logo = Image.new('RGBA', zdroj.size, (255, 255, 255, 0))
    logo.putalpha(kryvost)
    logo = Image.composite(Image.new('RGBA', zdroj.size, (255, 255, 255, 255)),
                           logo, kryvost)
    logo.putalpha(kryvost)
    sirka_loga = 660
    logo = logo.resize((sirka_loga, int(logo.height * sirka_loga / float(logo.width))),
                       Image.LANCZOS)
    plagat.paste(logo, ((SIRKA - logo.width) // 2, 168), logo)

    kresli = ImageDraw.Draw(plagat)

    def na_stred(text, y, font, farba):
        l, t, p, d = kresli.textbbox((0, 0), text, font=font)
        kresli.text(((SIRKA - (p - l)) / 2 - l, y), text, font=font, fill=farba)
        return d - t

    y = 168 + logo.height + 54
    y += na_stred(VETA, y, pismo(52), (255, 255, 255)) + 26
    na_stred(PODVETA, y, pismo(28), (150, 162, 178))

    # tenký modrý pás dole — rovnaký akcent ako tlačidlá na webe
    kresli.rectangle([0, VYSKA - 8, SIRKA, VYSKA], fill=(37, 99, 235))

    cesta = os.path.join(IMG, 'og-gridservis.png')
    plagat.save(cesta, 'PNG', optimize=True)
    print('napísané', os.path.relpath(cesta, OUT), plagat.size)


def ico():
    """Prehliadače a crawlery si pýtajú /favicon.ico aj keď máme PNG ikony."""
    zdroj = Image.open(os.path.join(IMG, 'favicon-512.png')).convert('RGBA')
    cesta = os.path.join(OUT, 'favicon.ico')
    zdroj.save(cesta, 'ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('napísané', os.path.relpath(cesta, OUT))


if __name__ == '__main__':
    og()
    ico()
