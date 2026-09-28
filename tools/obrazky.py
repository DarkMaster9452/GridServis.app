# -*- coding: utf-8 -*-
"""Vygeneruje logá, ikony a obrázky, ktoré sa nedajú poskladať v HTML.

  assets/img/gridservis-logo.png   logo so znakom a nápisom (z predlohy)
  assets/img/gridservis-napis.png  samotný nápis GRIDSERVIS (z predlohy)
  assets/img/logo-256/512.png      samotný znak G (z predlohy)
  assets/img/favicon-*.png         ikony webu (zo znaku G)
  assets/img/og-gridservis.png     náhľad 1200 × 630 do Messengeru a na Facebook
  favicon.ico                      ikona pre prehliadače, ktoré si pýtajú /favicon.ico

Logá sa nekreslia nanovo — berú sa z pôvodných PNG v tools/predloha/.
Z predlohy sa len odstráni biely podklad a sivé pomocné linky mriežky.

Spúšťa sa ručne, len keď sa mení značka alebo veta pod logom:

    pip install pillow
    python3 tools/obrazky.py

Potrebuje Pillow. Výstupy sú v repe, takže pri bežnom generovaní stránok
(tools/gen.py) sa nič sťahovať ani inštalovať nemusí.
"""
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(KOREN, 'public')   # web sa nasadzuje z public/, nie z koreňa repa
IMG = os.path.join(OUT, 'assets', 'img')
PREDLOHA = os.path.join(KOREN, 'tools', 'predloha')

# Pomocné linky mriežky v predlohe majú jas okolo 180–245, samotná kresba
# je čierna. Všetko svetlejšie ako PRAH je podklad alebo mriežka.
PRAH = 160

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


def bez_podkladu(nazov):
    """Predloha bez bieleho podkladu a mriežky: čierna kresba s priehľadnosťou.
    Tvary ani farba sa nemenia, zmizne len to, čo nie je kresba."""
    jas = Image.open(os.path.join(PREDLOHA, nazov)).convert('L')
    tma = jas.point(lambda v: 255 - v)
    # linky mriežky sú hrubé 1 px: uzavretie zaplní tie, čo idú cez kresbu,
    # otvorenie zmaže tie na bielom podklade. Hrubšie ťahy loga ostanú.
    tma = tma.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    tma = tma.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    jas = tma.point(lambda v: 255 - v)
    kryvost = jas.point(lambda v: 0 if v >= PRAH else int(round((PRAH - v) * 255.0 / PRAH)))
    kryvost = kryvost.point(lambda v: 255 if v > 235 else v)
    logo = Image.new('RGBA', jas.size, (0, 0, 0, 0))
    logo.putalpha(kryvost)
    return logo.crop(kryvost.getbbox())


def ulozit(obr, nazov):
    cesta = os.path.join(IMG, nazov)
    obr.save(cesta, 'PNG', optimize=True)
    print('napísané', os.path.relpath(cesta, OUT), obr.size)


def na_stvorec(obr, strana, okraj, podklad=None):
    """Vycentruje obrázok do štvorca s daným okrajom (podiel strany)."""
    vnutro = int(round(strana * (1 - 2 * okraj)))
    mierka = vnutro / float(max(obr.size))
    zmensene = obr.resize((max(1, int(round(obr.width * mierka))),
                           max(1, int(round(obr.height * mierka)))), Image.LANCZOS)
    stvorec = Image.new('RGBA', (strana, strana), podklad or (0, 0, 0, 0))
    stvorec.alpha_composite(zmensene, ((strana - zmensene.width) // 2,
                                       (strana - zmensene.height) // 2))
    return stvorec


def loga():
    cele = bez_podkladu('logo-cele.png')
    # rovnaký rozmer 838 × 168 ako doteraz, nech netreba meniť width/height v HTML
    platno = Image.new('RGBA', (838, 168), (0, 0, 0, 0))
    platno.alpha_composite(cele, ((838 - cele.width) // 2, (168 - cele.height) // 2))
    ulozit(platno, 'gridservis-logo.png')

    ulozit(bez_podkladu('logo-napis.png'), 'gridservis-napis.png')

    znak = bez_podkladu('logo-znak.png')
    ulozit(na_stvorec(znak, 512, 0.02), 'logo-512.png')
    ulozit(na_stvorec(znak, 256, 0.02), 'logo-256.png')
    ulozit(na_stvorec(znak, 512, 0.04), 'favicon-512.png')
    # iOS priehľadnosť vyplní čiernou, preto biely podklad
    ulozit(na_stvorec(znak, 180, 0.1, (255, 255, 255, 255)).convert('RGB'), 'favicon-180.png')
    ulozit(na_stvorec(znak, 32, 0.0), 'favicon-32.png')


def og():
    plagat = Image.new('RGB', (SIRKA, VYSKA), TMAVA)

    biela = Image.new('RGB', (SIRKA, VYSKA), (255, 255, 255))
    plagat.paste(biela, (0, 0), mriezka())

    # Logo je čierna kresba na priehľadnom podklade. Na tmavé pozadie sa
    # vykreslí nabielo — priehľadnosť ostane, farba sa zmení na bielu.
    kryvost = Image.open(os.path.join(IMG, 'gridservis-logo.png')).getchannel('A')
    logo = Image.new('RGBA', kryvost.size, (255, 255, 255, 255))
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
    loga()
    og()
    ico()
