# -*- coding: utf-8 -*-
"""Vygeneruje statické HTML stránky webu GridServis (bez build kroku v repe)."""
import os, io, re

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ZNACKA = 'GridServis'

# Ostrá adresa webu. Apex gridservis.app presmerováva (308) na www, takže
# kánonické odkazy, sitemapa aj og:url musia ukazovať na tvar s www.
WEB = 'https://www.gridservis.app'

# Predávajúci. Program predáva fyzická osoba, nie firma, preto tu nie sú
# IČO, DIČ ani zápis v registri — kontakt prebieha e-mailom.
PREDAJCA = {
    'email': 'strananekm@gmail.com',
}

# Ceny predplatného. Rovnaké hodnoty sú v assets/js/main.js (premenná CENY).
CENY = {'rok': 199.99, 'mesiac': 19.99}

ROCNE_MESACNE = CENY['mesiac'] * 12          # 239,88 € — rok platený po mesiacoch
USPORA = ROCNE_MESACNE - CENY['rok']         # 39,89 € — zľava pri ročnom predplatnom
MESACNE_Z_ROCNEHO = CENY['rok'] / 12         # 16,67 € — koľko vyjde mesiac pri ročnom


def eur(n):
    """Suma v slovenskom tvare, napríklad 1 199,99 €."""
    cele, des = ('%.2f' % n).split('.')
    skupiny = ''
    while len(cele) > 3:
        skupiny = ' ' + cele[-3:] + skupiny
        cele = cele[:-3]
    return cele + skupiny + ',' + des + ' €'


ROK = eur(CENY['rok'])
MESIAC = eur(CENY['mesiac'])

LOGO = ('<img src="assets/img/gridservis-logo.png" width="838" height="168" alt="GridServis">')

# Verzia programu sa nikde nepíše natvrdo. Doplní ju /api/verzia z posledného
# vydania na GitHube; kým neodpovie, ostane zobrazená náhrada v [data-rel-off].
VERZIA = ('<span data-rel-off>posledná vydaná verzia</span>'
          '<span data-rel hidden>verzia <span data-tag></span></span>')

PAGES = [
    ('index.html',    'Domov'),
    ('funkcie.html',  'Funkcie'),
    ('cennik.html',   'Cenník'),
    ('stiahnut.html', 'Inštalácia'),
    ('faq.html',      'FAQ'),
    ('kontakt.html',  'Kontakt'),
]


def head(active, title, desc, extra=''):
    """Hlavička stránky. `active` je názov vlastného súboru — slúži na
    zvýraznenie v menu aj na kánonickú adresu. `extra` sa vloží na koniec
    <head>, používa ho napríklad JSON-LD na cenníku."""
    kanon = WEB + '/' + ('' if active == 'index.html' else active)
    nav = '\n'.join(
        '      <a href="%s"%s>%s</a>' % (h, ' class="on"' if h == active else '', t)
        for h, t in PAGES)
    mnav = '\n'.join(
        '    <a href="%s"%s>%s</a>' % (h, ' class="on"' if h == active else '', t)
        for h, t in PAGES)
    return '''<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta property="og:site_name" content="%s">
<meta property="og:url" content="%s">
<meta property="og:image" content="%s/assets/img/og-gridservis.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="GridServis — celý servis v jednom programe">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="%s">
<meta name="theme-color" content="#101722">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/img/favicon-180.png">
<link rel="stylesheet" href="assets/css/styles.css">
%s</head>
<body>
<a class="skip" href="#obsah">Preskočiť na obsah</a>

<header class="hdr" id="hdr">
  <div class="wrap hdr__in">
    <a class="logo" href="index.html">
      LOGO
    </a>
    <nav class="hdr__nav" aria-label="Hlavná navigácia">
%s
    </nav>
    <a class="btn btn--pri btn--sm hdr__cta" href="cennik.html" data-buy>Predplatiť</a>
    <button class="hdr__burger" id="burger" aria-expanded="false" aria-controls="mnav" aria-label="Otvoriť menu"><span></span><span></span><span></span></button>
  </div>
  <nav class="hdr__mobile" id="mnav" hidden aria-label="Mobilná navigácia">
%s
  </nav>
</header>

<main id="obsah">
''' % (title, desc, title, desc, ZNACKA, kanon, WEB, kanon, extra, nav, mnav)


FOOT = '''</main>

<footer class="foot">
  <div class="wrap foot__in">
    <div class="foot__brand">
      <a class="logo logo--foot" href="index.html">
        LOGO
      </a>
      <p>Program na vedenie zákaziek, skladu a fakturácie v autoservise. Beží na Windows, dáta zostávajú na vašom počítači.</p>
    </div>
    <div class="foot__col">
      <h3>Program</h3>
      <a href="funkcie.html">Funkcie</a>
      <a href="cennik.html">Cenník a predplatné</a>
      <a href="stiahnut.html">Inštalácia programu</a>
    </div>
    <div class="foot__col">
      <h3>Podpora</h3>
      <a href="faq.html">Časté otázky</a>
      <a href="kontakt.html">Kontakt</a>
      <a href="kontakt.html" data-mail="podpora">Nahlásiť chybu</a>
    </div>
    <div class="foot__col">
      <h3>Právne</h3>
      <a href="obchodne-podmienky.html">Obchodné podmienky</a>
      <a href="obchodne-podmienky.html#odstupenie">Zrušenie a vrátenie peňazí</a>
      <a href="ochrana-sukromia.html">Ochrana súkromia</a>
      <a href="cookies.html">Cookies</a>
    </div>
  </div>
  <div class="wrap foot__bot">
    <span>&copy; <span data-rok>2026</span> ZNACKA</span>
    <span><span data-rel hidden>Verzia <span data-tag></span> &middot; </span>pre Windows 10 a 11</span>
  </div>
</footer>

<script src="assets/js/main.js"></script>
</body>
</html>
'''


def shot(img, alt, cls=''):
    """Snímka obrazovky. Pod obrázkom už nie je popiska, alt stačí."""
    return '''<figure class="shot %s">
  <img src="assets/img/%s" alt="%s" %s width="1600" height="1000">
</figure>''' % (cls, img, alt,
                'fetchpriority="high"' if 'hero' in cls else 'loading="lazy"')


def dl_btn(text='Stiahnuť demo', cls='btn--gh btn--lg'):
    """Odkaz na stránku s demom. Samotné stiahnutie je až za objednávkou."""
    return '<a class="btn %s" href="stiahnut.html">%s</a>' % (cls, text)


def buy_btn(text='Predplatiť', cls='btn--pri btn--lg'):
    return '<a class="btn %s" href="cennik.html">%s</a>' % (cls, text)


# Poučenie, ktoré musí kupujúci pri digitálnom obsahu výslovne odsúhlasiť.
# Bez neho mu právo na odstúpenie do 14 dní nezaniká — § 7 ods. 6 písm. l)
# zákona č. 102/2014 Z. z. Checkbox je povinný a overuje ho aj server.
SUHLAS = ('  <label class="suhlas">\n'
          '    <input type="checkbox" name="suhlas" value="1" required>\n'
          '    <span>Súhlasím so začatím sťahovania programu ihneď po zaplatení a beriem'
          ' na vedomie, že tým <b>strácam právo na odstúpenie od zmluvy do 14 dní</b>.'
          ' <a href="obchodne-podmienky.html#odstupenie">Prečítať poučenie</a></span>\n'
          '  </label>\n')


def platba_btn(plan, text, cls='btn--pri btn--lg'):
    """Tlačidlo, ktoré založí platbu v Stripe. Je to formulár, takže
    funguje aj bez JavaScriptu a prehliadač ho nepredbieha načítaním.

    Pri platených plánoch je nad tlačidlom povinný súhlas so stratou práva
    na odstúpenie; demo za 0 € ho nepotrebuje, nič sa pri ňom neplatí."""
    return ('<form class="pay" method="post" action="/api/checkout">\n'
            '  <input type="hidden" name="plan" value="%s">\n'
            '%s'
            '  <button class="btn %s" type="submit">%s</button>\n'
            '</form>') % (plan, SUHLAS if plan != 'demo' else '', cls, text)



# Štruktúrované dáta o programe. Google vďaka nim vie ukázať cenu priamo vo
# výsledkoch hľadania. Cena sa berie z CENY, nech nemôže rozísť s cenníkom.
CENNIK_LD = '''<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "%s",
  "description": "Program na vedenie zákaziek, zákazníkov, skladu a fakturácie v autoservise. Beží na Windows, dáta zostávajú na počítači používateľa.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Windows 10, Windows 11",
  "inLanguage": "sk",
  "url": "%s/",
  "image": "%s/assets/img/og-gridservis.png",
  "offers": [
    {
      "@type": "Offer",
      "name": "Ročné predplatné",
      "price": "%.2f",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "url": "%s/cennik.html"
    },
    {
      "@type": "Offer",
      "name": "Mesačné predplatné",
      "price": "%.2f",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "url": "%s/cennik.html"
    }
  ]
}
</script>
''' % (ZNACKA, WEB, WEB, CENY['rok'], WEB, CENY['mesiac'], WEB)


OZNAM = '<p class="oznam" id="oznam" hidden></p>'


# Upozornenie, ktoré musí kupujúci vidieť ešte pred zaplatením.
VAROVANIE = '''<div class="warn" id="upozornenie">
      <h3>Skôr než zaplatíte: Windows bude hlásiť, že súbor nie je bezpečný</h3>
      <p>Inštalačka programu ZNACKA nemá zakúpený podpisový certifikát. Windows ju preto pri spustení
      označí modrým oknom SmartScreen s textom o neznámom vydavateľovi a o tom, že súbor môže
      byť nebezpečný. Nejde o vírus ani o chybu programu, iba o to, že certifikát stojí peniaze
      a zatiaľ ho nemám kúpený.</p>
      <p>Inštalácia normálne pokračuje po kliknutí na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>.
      Rovnaké hlásenie uvidíte aj pri plnej verzii po zaplatení, preto to píšem ešte pred platbou.
      Ak vám to prekáža, vyskúšajte najprv <a href="stiahnut.html">demo</a> — je zadarmo a hlási to isté.</p>
    </div>'''


# ============================================================ DOMOV
index = head('index.html', 'ZNACKA — program na správu autoservisu',
             'Zákazky, zákazníci, sklad dielov, cenník prác, faktúry a štatistiky pre autoservis. Windows program, predplatné ROK ročne alebo MESIAC mesačne.') + '''
<section class="hero mriezka">
  <div class="wrap hero__in">
    <div class="hero__txt">
      <h1>Celý servis v jednom programe.<br>Od príjmu auta po faktúru.</h1>
      <p class="lead">ZNACKA vedie zákazky, zákazníkov, sklad dielov aj cenník prác. Zo zákazky vytlačíte zákazkový list, faktúru aj štítok na kľúče. Program beží na počítači v dielni, dáta máte u seba.</p>
      <div class="row">
        ''' + buy_btn('Predplatiť &mdash; ROK za rok') + dl_btn('Vyskúšať demo') + '''
      </div>
      <p class="fine">Demo je zadarmo, stačí zadať e-mail. Plnú verziu sprístupní predplatné &middot; Windows 10 a 11 &middot; ''' + VERZIA + '''</p>
    </div>
  </div>
  <div class="wrap hero__shot">
    ''' + shot('prehlad.png', 'Úvodná obrazovka programu ZNACKA s prehľadom zákaziek a tržieb', 'shot--hero') + '''
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="tri">
      <div class="tri__i">
        <h3>Zákazka drží všetko pokope</h3>
        <p>Zákazník, auto, popis závady, vykonané úkony, vymenené diely, fotky a cena. Nič nehľadáte po zošitoch a esemeskách.</p>
      </div>
      <div class="tri__i">
        <h3>História auta na jeden klik</h3>
        <p>Pri každom vozidle vidíte, čo sa na ňom robilo minule. Podľa ŠPZ alebo VIN nájdete zákazku spred roka za pár sekúnd.</p>
      </div>
      <div class="tri__i">
        <h3>Doklady sa vytlačia samé</h3>
        <p>Zákazkový list a faktúra v PDF s rozpisom prác a dielov. Hodinovú sadzbu, DPH aj číslovanie si nastavíte raz.</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="wrap">
    <header class="shead">
      <h2>Čo je v programe</h2>
      <p>Sedem obrazoviek, ktoré pokrývajú bežný deň v dielni.</p>
    </header>
    <div class="mods">
      <a class="mod" href="funkcie.html#zakazky"><b>Zákazky</b><span>Zoznam s filtrami podľa stavu, vyhľadávanie podľa mena, ŠPZ aj čísla zákazky, export do CSV.</span></a>
      <a class="mod" href="funkcie.html#detail"><b>Detail zákazky</b><span>Údaje o aute vrátane VIN, termín objednania, fotky, história vozidla, tlač dokladov.</span></a>
      <a class="mod" href="funkcie.html#zakaznici"><b>Zákazníci</b><span>Karty zákazníkov s autami, počtom zákaziek, útratou a označením pravidelných.</span></a>
      <a class="mod" href="funkcie.html#sklad"><b>Sklad</b><span>Diely s katalógovým číslom, umiestnením v regáli, nákupnou a predajnou cenou aj maržou.</span></a>
      <a class="mod" href="funkcie.html#cennik-prac"><b>Cenník prác</b><span>Úkony rozdelené do kategórií s normohodinami. Cena práce sa počíta zo sadzby dielne.</span></a>
      <a class="mod" href="funkcie.html#statistiky"><b>Štatistiky</b><span>Tržby po mesiacoch, pomer práce a dielov, rozdelenie zákaziek podľa stavu, najčastejšie značky.</span></a>
      <a class="mod" href="funkcie.html#nastavenia"><b>Nastavenia</b><span>Údaje dielne do hlavičky dokladov, hodinová sadzba, IBAN, splatnosť, DPH a číslovanie.</span></a>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="alt">
      <div class="alt__txt">
        <p class="tagline">Zákazky</p>
        <h2>Vidíte, čo je rozrobené a čo čaká na diel</h2>
        <p>Zoznam zákaziek sa dá filtrovať podľa stavu: prijaté, v riešení, čaká na diely, hotové, vydané. Vyhľadávanie berie meno zákazníka, značku, ŠPZ aj číslo zákazky.</p>
        <ul class="ticks">
          <li>Automatické číslovanie v tvare Z2026-0001</li>
          <li>Farebné označenie stavu v zozname aj v prehľade</li>
          <li>Export celého zoznamu do CSV</li>
        </ul>
        <a class="link" href="funkcie.html#zakazky">Podrobnosti o zákazkách</a>
      </div>
      ''' + shot('zakazky.png', 'Zoznam zákaziek s filtrami podľa stavu') + '''
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="wrap">
    <div class="alt alt--rev">
      <div class="alt__txt">
        <p class="tagline">Štatistiky</p>
        <h2>Na konci mesiaca nič nedopočítavate</h2>
        <p>Program ukáže tržby po mesiacoch, koľko z nich je za prácu a koľko za diely, čo je neuhradené, ktoré značky vozidiel chodia najčastejšie a ktorí zákazníci nechajú v dielni najviac.</p>
        <ul class="ticks">
          <li>Počet zákaziek a tržby po mesiacoch</li>
          <li>Rozdelenie zákaziek podľa stavu</li>
          <li>Najhodnotnejší zákazníci a najčastejšie diely</li>
        </ul>
        <a class="link" href="funkcie.html#statistiky">Podrobnosti o štatistikách</a>
      </div>
      ''' + shot('statistiky.png', 'Štatistiky tržieb a zákaziek') + '''
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="wrap wrap--mid">
    <header class="shead">
      <h2>Jedna cena za celý program</h2>
      <p>Predplatné na jeden počítač. Obnovuje sa samo, zrušiť ho viete v programe.</p>
    </header>
    <div class="pricebig">
      <p class="pricebig__lbl">Ročné predplatné</p>
      <p class="pricebig__sum"><b>ROK</b><span>/ rok</span></p>
      <p class="pricebig__save">Ušetríte USPORA oproti mesačnému</p>
      <p class="pricebig__note">To je MESACNE_Z_ROCNEHO na mesiac. Mesačne bez viazanosti vyjde na MESIAC.</p>
      <div class="row row--c">
        ''' + buy_btn('Prejsť do cenníka') + '''
        ''' + dl_btn('Najprv skúsiť demo') + '''
      </div>
    </div>
  </div>
</section>

<section class="cta mriezka">
  <div class="wrap cta__in">
    <h2>Najprv demo, potom rozhodnutie</h2>
    <p>Demo si stiahnete hneď a vyskúšate na vlastných zákazkách. Predplatné riešite až vtedy, keď viete, že vám program sadol.</p>
    <div class="row row--c">
      ''' + buy_btn() + dl_btn('Stiahnuť demo', 'btn--gh btn--lg btn--onDark') + '''
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ FUNKCIE
def blok(anchor, tag, h2, p, body_ul, img, alt, rev=False):
    lis = '\n'.join('          <li>%s</li>' % x for x in body_ul)
    return '''
<section class="sec%s" id="%s">
  <div class="wrap">
    <div class="alt%s">
      <div class="alt__txt">
        <p class="tagline">%s</p>
        <h2>%s</h2>
        <p>%s</p>
        <ul class="ticks">
%s
        </ul>
      </div>
      %s
    </div>
  </div>
</section>''' % (' sec--alt' if rev else '', anchor, ' alt--rev' if rev else '',
                 tag, h2, p, lis, shot(img, alt))


funkcie = head('funkcie.html', 'Funkcie — ZNACKA',
               'Prehľad obrazoviek programu ZNACKA: zákazky, detail zákazky, zákazníci, sklad dielov, cenník prác, štatistiky a nastavenia dielne.') + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Čo program vie</h1>
    <p class="lead">Obrazovky nižšie sú z bežiaceho programu. Ukážkové dáta patria vymyslenej dielni AutoServis Horák.</p>
  </div>
</section>
''' + blok('zakazky', 'Zákazky',
    'Zoznam zákaziek s filtrami a vyhľadávaním',
    'Základná obrazovka pri pulte. Vidíte všetky zákazky s číslom, zákazníkom, vozidlom, popisom práce, cenou, stavom a dátumom prijatia.',
    ['Filtre: otvorené, prijaté, v riešení, čaká na diely, hotové, vydané',
     'Vyhľadávanie podľa mena, značky, ŠPZ alebo čísla zákazky',
     'Stĺpec s fotkou, aby ste auto spoznali aj bez otvárania zákazky',
     'Export do CSV pre účtovníčku alebo Excel'],
    'zakazky.png', 'Zoznam zákaziek s filtrami podľa stavu') + blok('detail', 'Detail zákazky',
    'Všetko o jednej oprave na štyroch záložkách',
    'Zákazka má záložky Údaje, Práce a cena, Fotky a História vozidla. V hlavičke je číslo, auto, stav km a zákazník.',
    ['Vozidlo: značka, model, rok, ŠPZ, stav km, VIN, motor, palivo, prevodovka, farba',
     'Načítanie údajov z VIN, aby ste ich neprepisovali ručne',
     'Objednanie na termín, pridanie do Google kalendára alebo stiahnutie .ics',
     'Štítky ako reklamácia, čaká na diel či poistná udalosť',
     'Tlač: zákazkový list (PDF), faktúra (PDF), štítok na kľúče, šablóny'],
    'zakazka-udaje.png', 'Detail zákazky so záložkou Údaje', rev=True) + blok('prace', 'Práce a cena',
    'Úkony z cenníka, diely zo skladu, cena sa dopočíta',
    'Na záložke Práce a cena zapíšete, čo sa robilo. Úkon pridáte z cenníka aj s normohodinami, cena práce vyjde z hodinovej sadzby dielne.',
    ['Vykonané úkony s hodinami a sadzbou, spolu za prácu',
     'Vymenené diely a materiál s množstvom, jednotkou a cenou za kus',
     'Výdaj dielu priamo zo skladu, takže stav sedí',
     'Textový popis vykonanej práce, ktorý ide na zákazkový list'],
    'zakazka-prace.png', 'Záložka Práce a cena s úkonmi a dielmi') + blok('zakaznici', 'Zákazníci',
    'Kartotéka s autami a útratou',
    'Každý zákazník má kartu s telefónom, autami, počtom zákaziek, celkovou útratou a dátumom poslednej návštevy.',
    ['Označenie pravidelných zákazníkov',
     'Upozornenie na otvorené a neuhradené zákazky',
     'Filtre: všetci, pravidelní, otvorené, neuhradené',
     'Vyhľadávanie podľa mena, telefónu, ŠPZ alebo auta'],
    'zakaznici.png', 'Karty zákazníkov s prehľadom zákaziek', rev=True) + blok('sklad', 'Sklad',
    'Diely s cenami, maržou a miestom v regáli',
    'Sklad ukáže, čo máte na regáli, za koľko ste to kúpili a za koľko predávate. Program rovno počíta hodnotu skladu aj maržu.',
    ['Katalógové číslo, množstvo, jednotka a umiestnenie (napríklad Regál C1)',
     'Nákupná cena, predajná cena a marža na kus',
     'Hodnota skladu v nákupných cenách aj predajná hodnota',
     'Upozornenie na položky pod minimom cez filter Dochádzajúce'],
    'sklad.png', 'Skladová evidencia dielov') + blok('cennik-prac', 'Cenník prác',
    'Normohodiny raz zadáte a už len vyberáte',
    'Cenník obsahuje úkony rozdelené do kategórií ako brzdy, motor, podvozok, klimatizácia, pneumatiky či diagnostika. Pri každom je počet hodín.',
    ['Cena úkonu sa počíta ako hodiny krát sadzba dielne',
     'Zmena hodinovej sadzby prepočíta celý cenník',
     'Vlastné úkony si doplníte kedykoľvek',
     'Úkon sa do zákazky pridá aj s hodinami'],
    'cennik-prac.png', 'Cenník prác s kategóriami a normohodinami', rev=True) + blok('statistiky', 'Štatistiky',
    'Výkon dielne bez ručného počítania',
    'Štatistiky za zvolený rok ukážu, koľko zákaziek prešlo dielňou, aké boli tržby a kde sa peniaze tvoria.',
    ['Tržby z práce oproti tržbám z dielov v eurách aj percentách',
     'Počet zákaziek a tržby po mesiacoch',
     'Rozdelenie zákaziek podľa stavu a suma neuhradených',
     'Najčastejšie značky vozidiel, najhodnotnejší zákazníci, najpoužívanejšie diely'],
    'statistiky.png', 'Štatistiky tržieb a zákaziek') + blok('nastavenia', 'Nastavenia',
    'Údaje dielne, sadzba a fakturačné náležitosti',
    'Čo zadáte v nastaveniach, to sa tlačí do hlavičky zákazkových listov a faktúr. Nastavenie je jednorazové.',
    ['Názov dielne, adresa, telefón, e-mail a web',
     'Hodinová sadzba, mena a predpona čísla zákazky',
     'IBAN, splatnosť faktúr, predpona čísla faktúry',
     'IČ DPH a sadzba DPH pre platiteľov'],
    'nastavenia.png', 'Nastavenia dielne, cien a faktúr', rev=True) + '''
<section class="cta mriezka">
  <div class="wrap cta__in">
    <h2>Pozrite si to naživo</h2>
    <p>Demo sa nainštaluje za pár minút a vyskúšate ho na vlastných zákazkách.</p>
    <div class="row row--c">
      ''' + buy_btn() + dl_btn('Stiahnuť demo', 'btn--gh btn--lg btn--onDark') + '''
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ CENNÍK
cennik = head('cennik.html', 'Cenník a predplatné — ZNACKA',
              'Predplatné programu ZNACKA: ROK ročne alebo MESIAC mesačne na jeden počítač. Ročné je o USPORA lacnejšie. Demo je zadarmo.',
              extra=CENNIK_LD) + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Ročne ROK, mesačne MESIAC</h1>
    <p class="lead">Predplatné platí na jeden počítač a sprístupní celý program bez obmedzení. Ročné predplatné je o USPORA lacnejšie ako dvanásť mesačných platieb. Demo si vyskúšate zadarmo ešte pred platbou.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    ''' + OZNAM + '''
    <div class="plans">
      <article class="plan plan--best">
        <div class="plan__head">
          <h2>Ročne</h2>
          <span class="plan__badge">Ušetríte USPORA</span>
        </div>
        <p class="plan__price"><b>ROK</b><span>/ rok</span></p>
        <p class="plan__per">Vychádza na MESACNE_Z_ROCNEHO mesačne. Dvanásť mesačných platieb by stálo ROCNE_MESACNE.</p>
''' + platba_btn('rok', 'Predplatiť na rok', 'btn--pri btn--lg btn--full') + '''
        <ul class="ticks">
          <li>Celý program bez obmedzení na dvanásť mesiacov</li>
          <li>Opravy chýb a nové verzie počas predplatného</li>
          <li>Jedna platba za rok, obnovuje sa sama</li>
          <li>E-mailová podpora pri inštalácii a nastavení</li>
        </ul>
      </article>
      <article class="plan">
        <div class="plan__head">
          <h2>Mesačne</h2>
          <span class="plan__badge plan__badge--mut">Zrušíte kedykoľvek</span>
        </div>
        <p class="plan__price"><b>MESIAC</b><span>/ mesiac</span></p>
        <p class="plan__per">Za rok to je ROCNE_MESACNE, teda o USPORA viac ako ročné predplatné.</p>
''' + platba_btn('mesiac', 'Predplatiť na mesiac', 'btn--gh btn--lg btn--full') + '''
        <ul class="ticks">
          <li>Celý program bez obmedzení na jeden mesiac</li>
          <li>Opravy chýb a nové verzie počas predplatného</li>
          <li>Obnovu vypnete v programe, ďalší mesiac sa neplatí</li>
          <li>E-mailová podpora pri inštalácii a nastavení</li>
        </ul>
      </article>
    </div>
    <p class="fine center">Ceny sú konečné, za jeden počítač. Predplatné sa po skončení obdobia obnoví samo, kým ho nezrušíte v programe v Nastaveniach. Potrebujete program na viacerých staniciach? <a data-mail="viac" href="kontakt.html">Napíšte mi</a> a dohodneme cenu.</p>

    ''' + VAROVANIE + '''

    <div class="two two--top">
      <div class="box box--ok">
        <h3>V predplatnom je</h3>
        <ul class="ticks">
          <li>Plná verzia programu bez obmedzení</li>
          <li>Všetky moduly, žiadne platené doplnky</li>
          <li>Opravy chýb a nové verzie počas predplatného</li>
          <li>Prenos na nový počítač po dohode</li>
          <li>E-mailová podpora pri inštalácii a nastavení</li>
        </ul>
      </div>
      <div class="box">
        <h3>V predplatnom nie je</h3>
        <ul class="crosses">
          <li>Používanie programu po skončení predplatného</li>
          <li>Preloženie licencie na iný počítač zadarmo — stojí 10 € a rieši sa e-mailom</li>
          <li>Úpravy programu na mieru</li>
          <li>Prevádzka na serveri alebo zdieľaná databáza medzi počítačmi</li>
          <li>Podpisový certifikát inštalačky, preto Windows hlási neznámeho vydavateľa</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="wrap wrap--mid">
    <header class="shead">
      <h2>Ako to prebieha</h2>
      <p>Najprv demo, potom platba. Plná verzia sa sťahuje až po zaplatení predplatného.</p>
    </header>
    <ol class="steps">
      <li><span>1</span><div><h3>Vyskúšate demo</h3><p>Demo je zadarmo, stiahne sa cez objednávku za 0 €, kde zadáte len e-mail. Zapíšete pár zákaziek a pozriete, či vám sedí ovládanie a tlač dokladov.</p></div></li>
      <li><span>2</span><div><h3>Zvolíte obdobie</h3><p>Ročné predplatné za ROK, alebo mesačné za MESIAC bez viazanosti. Ročné je o USPORA lacnejšie.</p></div></li>
      <li><span>3</span><div><h3>Prečítate si upozornenie</h3><p>Inštalačka nie je podpísaná certifikátom, takže Windows ju označí za nebezpečnú. <a href="#upozornenie">Vysvetlenie je vyššie</a>, ešte pred platbou.</p></div></li>
      <li><span>4</span><div><h3>Zaplatíte</h3><p>Tlačidlo otvorí pokladňu Stripe, kde zaplatíte kartou. Po skončení obdobia sa predplatné obnoví samo; vypnúť sa dá v programe.</p></div></li>
      <li><span>5</span><div><h3>Nainštalujete a aktivujete</h3><p>Licenčný kód sa ukáže hneď po zaplatení a príde aj e-mailom. Zadáte ho pri prvom spustení a program sa odomkne na tomto počítači.</p></div></li>
    </ol>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <header class="shead">
      <h2>Otázky k predplatnému</h2>
    </header>
    <div class="faq">
      <details><summary>Prečo je ročné predplatné výhodnejšie?</summary><p>Ročné stojí ROK, dvanásť mesačných platieb ROCNE_MESACNE. Rozdiel je USPORA, ktoré pri ročnej platbe neplatíte.</p></details>
      <details><summary>Obnovuje sa predplatné samo?</summary><p>Áno. Po skončení obdobia sa z karty strhne ďalšia platba a licencia sa predĺži — v programe si ničoho nevšimnete. Obnovu vypnete v programe v Nastaveniach alebo mi napíšte.</p></details>
      <details><summary>Čo sa stane, keď platba neprejde?</summary><p>Licencia sa zastaví a program sa uzamkne. Dáta zostávajú na vašom počítači a viete si ich vyexportovať aj v tomto stave. Program ukáže odkaz na obnovenie; po zaplatení sa tá istá licencia predĺži a pokračujete tam, kde ste skončili.</p></details>
      <details><summary>Vymenil som počítač, čo s licenciou?</summary><p>Licencia sa pri aktivácii naviaže na jeden počítač a sama sa z neho neuvoľní. Napíšte mi a preložím ju na nový — za preloženie účtujem 10 €.</p></details>
      <details><summary>Potrebujem program aj na počítač doma?</summary><p>Ak tam program spúšťate, potrebujete druhé predplatné. Ozvite sa, pri viacerých staniciach dohodneme cenu.</p></details>
      <details><summary>Čo ak sa program neosvedčí?</summary><p>Preto je tu demo. Vyskúšate ho pred platbou, a ak vám nesadne, predplatné jednoducho nekúpite.</p></details>
      <details><summary>Ako prebieha platba?</summary><p>Cez pokladňu Stripe. Kliknete na Predplatiť, na stránke Stripe zaplatíte kartou a vrátite sa späť na stiahnutie. Údaje o karte idú priamo Stripe, ja sa k nim nedostanem.</p></details>
      <details><summary>Prečo aj pri deme zadávam e-mail?</summary><p>Demo sa sťahuje cez objednávku za 0 €. Karta sa nezadáva, e-mail potrebujem na to, aby som vedel, komu poslať licenčný kľúč, keby ste sa neskôr rozhodli pre predplatné.</p></details>
      <details><summary>Prečo Windows hlási, že inštalačka nie je bezpečná?</summary><p>Nemá zakúpený podpisový certifikát. <a href="#upozornenie">Podrobne to vysvetľujem vyššie</a> a to isté platí pre demo aj pre plnú verziu.</p></details>
    </div>
  </div>
</section>

<section class="cta mriezka">
  <div class="wrap cta__in">
    <h2>Najprv skúsiť, potom platiť</h2>
    <p>Stiahnite si demo a pozrite, či vám sadne. Predplatné vyriešime, keď budete vedieť.</p>
    <div class="row row--c">
      ''' + buy_btn() + dl_btn('Stiahnuť demo', 'btn--gh btn--lg btn--onDark') + '''
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ STIAHNUŤ
stiahnut = head('stiahnut.html', 'Inštalácia ZNACKA pre Windows',
                'Stiahnutie programu ZNACKA: skúšobná verzia zadarmo aj plná verzia, systémové požiadavky a postup inštalácie. Plnú verziu odomkne licencia z predplatného.') + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Inštalácia programu</h1>
    <p class="lead">Skúšobnú verziu stiahnete hneď zadarmo cez objednávku za 0 € (len e-mail, kartu Stripe nepýta). Plnú verziu si môžete stiahnuť priamo, na jej odomknutie ale budete potrebovať licenciu z predplatného.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    ''' + OZNAM + '''
    <div class="dl-list">
      <div class="dl">
        <div class="dl__l">
          <span class="dl__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg></span>
          <div>
            <b>Skúšobná verzia</b>
            <span>Zadarmo, cez objednávku za 0 &euro; &middot; Windows 10 a 11, 64-bit</span>
          </div>
        </div>
        ''' + platba_btn('demo', 'Získať zadarmo', 'btn--pri btn--lg') + '''
      </div>
      <div class="dl">
        <div class="dl__l">
          <span class="dl__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg></span>
          <div>
            <b><span data-file>Inštalačný súbor</span> &mdash; plná verzia</b>
            <span><span data-rel-off>Posledná vydaná verzia</span><span data-rel hidden>Verzia <span data-tag></span><span data-size-wrap> &middot; <span data-size></span></span><span data-date-wrap> &middot; vydané <span data-date></span></span></span> &middot; Windows 10 a 11, 64-bit</span>
          </div>
        </div>
        <a class="btn btn--gh btn--lg" href="/api/stiahnut-plna" id="stiahni-plnu">Stiahnuť plnú verziu</a>
      </div>
    </div>
    <p class="fine center">Skúšobnú verziu si vyžiadate cez pokladňu Stripe za 0 &euro;, kartu nezadávate, stačí e-mail. Plnú verziu si stiahnete rovno bez objednávky &mdash; program sa spustí, no na odomknutie bez obmedzení potrebuje licenčný kľúč, ktorý dostanete po zaplatení predplatného. Po kliknutí na stiahnutie plnej verzie vás preto rovno prehodím do <a href="cennik.html">cenníka</a>.</p>

    <div class="warn">
      <h3>Windows bude hlásiť, že súbor nie je bezpečný</h3>
      <p>Inštalačka nemá zakúpený podpisový certifikát, preto ju SmartScreen označí ako súbor od neznámeho vydavateľa, ktorý môže poškodiť počítač. Nie je to vírus, súbor sťahujete priamo z tejto stránky. Po kliknutí na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b> inštalácia normálne pokračuje. Rovnaké hlásenie uvidíte aj pri plnej verzii po zaplatení predplatného.</p>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>Systémové požiadavky</h3>
        <dl class="specs">
          <div><dt>Systém</dt><dd>Windows 10 alebo 11, 64-bit</dd></div>
          <div><dt>Pamäť</dt><dd>4 GB RAM a viac</dd></div>
          <div><dt>Disk</dt><dd>približne 300 MB</dd></div>
          <div><dt>Rozlíšenie</dt><dd>1366 &times; 768 a viac</dd></div>
          <div><dt>Internet</dt><dd>len na stiahnutie a aktualizácie</dd></div>
        </dl>
      </div>
      <div class="box">
        <h3>Inštalácia krok za krokom</h3>
        <ol class="ol">
          <li>Stiahnite inštalačku a spustite ju.</li>
          <li>Keď Windows zobrazí modré okno SmartScreen, kliknite na <b>Ďalšie informácie</b> a potom na <b>Spustiť tak či tak</b>.</li>
          <li>Potvrďte inštaláciu a počkajte, kým sa program nainštaluje.</li>
          <li>Spustite program a v Nastaveniach vyplňte údaje dielne a hodinovú sadzbu.</li>
          <li>Založte prvú zákazku tlačidlom Nová zákazka.</li>
        </ol>
      </div>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>Prechod z dema na plnú verziu</h3>
        <p>Po zaplatení predplatného dostanete e-mailom odkaz na plnú verziu a licenčný kľúč. Inštalačku spustíte cez demo, zákazky zapísané v deme zostanú zachované a kľúč potom vložíte v Nastaveniach.</p>
      </div>
      <div class="box">
        <h3>Zálohovanie dát</h3>
        <p>Dáta sú v databáze na vašom počítači, nie v cloude. Odporúčam kopírovať ju raz za čas na USB kľúč alebo do cloudového disku, rovnako ako zálohujete účtovníctvo.</p>
      </div>
    </div>
  </div>
</section>

<section class="cta mriezka">
  <div class="wrap cta__in">
    <h2>Demo vám sadlo?</h2>
    <p>Predplatné vybavíte v cenníku. Ak sa niečo zaseklo pri inštalácii, napíšte mi, čo hlási počítač.</p>
    <div class="row row--c">
      ''' + buy_btn() + '''
      <a class="btn btn--gh btn--lg btn--onDark" href="kontakt.html">Napísať</a>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ FAQ
faq = head('faq.html', 'Časté otázky — ZNACKA',
           'Odpovede na otázky o programe ZNACKA: dáta, predplatné, viac počítačov, faktúry, DPH, zálohovanie a podpora.') + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Časté otázky</h1>
    <p class="lead">Ak tu odpoveď nenájdete, napíšte mi a doplním ju.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <h2 class="gh">Program a dáta</h2>
    <div class="faq">
      <details><summary>Kde sú uložené moje zákazky?</summary><p>V databáze na počítači, kde je program nainštalovaný. Nič sa neposiela na cudzí server, takže údaje o zákazníkoch zostávajú v dielni.</p></details>
      <details><summary>Funguje program bez internetu?</summary><p>Databáza je na vašom počítači, takže na bežnú prácu so zákazkami pripojenie netreba. Internet potrebujete na stiahnutie programu a aktualizácií.</p></details>
      <details><summary>Beží to na Macu alebo v mobile?</summary><p>Nie. Aktuálna verzia je program pre Windows 10 a 11.</p></details>
      <details><summary>Môžu na dátach robiť dvaja ľudia naraz?</summary><p>Program je stavaný na jeden počítač s vlastnou databázou. Zdieľanú databázu medzi viacerými stanicami zatiaľ nerieši.</p></details>
      <details><summary>Ako prenesiem dáta na iný počítač?</summary><p>Skopírujete súbor databázy zo starého počítača do nového a program ju načíta. Napíšte mi a pošlem presný postup pre vašu verziu.</p></details>
    </div>

    <h2 class="gh">Zákazky a doklady</h2>
    <div class="faq">
      <details><summary>Vystavuje program faktúry?</summary><p>Áno, priamo z detailu zákazky. Faktúra v PDF obsahuje rozpis vykonaných prác aj každého dielu zvlášť.</p></details>
      <details><summary>Zvládne DPH?</summary><p>Áno. V nastaveniach zapnete, že ste platiteľ, zadáte IČ DPH a sadzbu. Faktúry sa potom počítajú s DPH.</p></details>
      <details><summary>Čo je štítok na kľúče?</summary><p>Malý štítok s číslom zákazky, ŠPZ a menom zákazníka. Vytlačíte ho zo zákazky a zavesíte ku kľúčom, aby sa autá nepomiešali.</p></details>
      <details><summary>Dá sa zákazka objednať na termín?</summary><p>Áno. Nastavíte dátum a čas a termín pridáte do Google kalendára alebo stiahnete ako súbor .ics do vlastného kalendára.</p></details>
      <details><summary>Vidím, čo sa na aute robilo minule?</summary><p>Áno, na záložke História vozidla. Auto sa páruje podľa ŠPZ a VIN, takže vidíte všetky predchádzajúce zákazky.</p></details>
    </div>

    <h2 class="gh">Predplatné a platba</h2>
    <div class="faq">
      <details><summary>Koľko to stojí?</summary><p>ROK za rok, alebo MESIAC za mesiac bez viazanosti. Ročné predplatné je o USPORA lacnejšie, podrobnosti sú v <a href="cennik.html">cenníku</a>.</p></details>
      <details><summary>Je to predplatné, alebo sa platí raz?</summary><p>Je to predplatné. Platí sa za obdobie, ktoré si zvolíte — rok alebo mesiac — a po jeho skončení sa obnovuje samo, kým obnovu nevypnete.</p></details>
      <details><summary>Strháva sa platba automaticky?</summary><p>Áno, po skončení obdobia sa predplatné obnoví z tej istej karty. Obnovu vypnete v programe v Nastaveniach — licencia potom dobehne do konca zaplateného obdobia a ďalej sa neúčtuje.</p></details>
      <details><summary>Čo ak platba neprejde?</summary><p>Licencia sa zastaví a program sa uzamkne, dáta vám zostanú. Program ukáže odkaz na obnovenie; po zaplatení pokračuje tá istá licencia. Exportovať dáta sa dá aj v zastavenom stave.</p></details>
      <details><summary>Dá sa licencia preložiť na iný počítač?</summary><p>Sama sa neuvoľní — po aktivácii je naviazaná na ten počítač. Napíšte mi a preložím ju; za preloženie účtujem 10 €.</p></details>
      <details><summary>Ako prebieha platba?</summary><p>Cez pokladňu Stripe, kartou. Po zaplatení sa vrátite na stránku, odkiaľ sa dá hneď stiahnuť inštalačka. Údaje o karte spracúva Stripe, ja ich nevidím.</p></details>
      <details><summary>Kde stiahnem plnú verziu?</summary><p>Hneď po zaplatení na stránke, na ktorú vás Stripe vráti. Licenčný kľúč k nej pošlem e-mailom.</p></details>
      <details><summary>Prečo sa demo sťahuje cez pokladňu, keď je zadarmo?</summary><p>Aby som vedel, kto si program skúša, a mal kam poslať kľúč, keby ste si predplatné kúpili. Suma je 0 €, karta sa nezadáva, stačí e-mail.</p></details>
      <details><summary>Musím platiť hneď?</summary><p>Nie. Najprv si stiahnete demo, ktoré nič nestojí, a vyskúšate ho. Predplatné riešite až potom.</p></details>
      <details><summary>Prečo Windows pri inštalácii hlási, že súbor nie je bezpečný?</summary><p>Inštalačka nemá zakúpený podpisový certifikát, takže SmartScreen ju označí za súbor od neznámeho vydavateľa. Píšem to aj <a href="cennik.html#upozornenie">v cenníku ešte pred platbou</a>. Inštalácia pokračuje cez Ďalšie informácie a Spustiť tak či tak.</p></details>
      <details><summary>Čím sa demo líši od plnej verzie?</summary><p>Demo slúži na vyskúšanie ovládania a tlače dokladov. Plnú verziu bez obmedzení sprístupní zaplatené predplatné.</p></details>
    </div>

    <h2 class="gh">Podpora</h2>
    <div class="faq">
      <details><summary>Našiel som chybu.</summary><p>Napíšte mi cez <a href="kontakt.html">kontakt</a>. Uveďte, čo ste robili, čo program vypísal a akú verziu používate.</p></details>
      <details><summary>Chýba mi funkcia, ktorú by som potreboval.</summary><p>Ozvite sa. Návrhy zo servisov, ktoré program reálne používajú, majú prednosť.</p></details>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ KONTAKT
kontakt = head('kontakt.html', 'Kontakt — ZNACKA',
               'Kontakt na objednávku predplatného, podporu pri inštalácii a hlásenie chýb v programe ZNACKA.') + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Napíšte mi</h1>
    <p class="lead">Objednávka predplatného, pomoc s inštaláciou alebo hlásenie chyby. Ozvem sa hneď, ako to bude možné.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="two two--top">
      <div class="box box--big">
        <h3>Objednávka predplatného</h3>
        <p>Napíšte mi, či chcete ročné predplatné za ROK, alebo mesačné za MESIAC, a na koľkých počítačoch bude program bežať. Pošlem pokyny na platbu a po jej prijatí odkaz na plnú verziu s licenčným kľúčom.</p>
        <p class="mailrow"><a class="btn btn--pri" data-mail="objednavka">Napísať e-mail</a>
        <a class="btn btn--gh" href="cennik.html">Prejsť do cenníka</a></p>
      </div>
      <div class="box box--big">
        <h3>Podpora a chyby</h3>
        <p>Ak sa program správa inak, než má, napíšte čo ste robili, čo sa stalo a akú verziu používate. Verzia je v ľavom dolnom rohu programu.</p>
        <p class="mailrow"><a class="btn btn--gh" data-mail="podpora">Napísať e-mail</a></p>
      </div>
    </div>

    <div class="box box--big">
      <h3>Kontakt</h3>
      <dl class="specs">
        <div><dt>E-mail</dt><dd><a data-mail-txt href="#">&nbsp;</a></dd></div>
        <div><dt>Predávajúci</dt><dd>fyzická osoba, nie obchodná spoločnosť</dd></div>
        <div><dt>Odpoveď</dt><dd>zvyčajne do dvoch pracovných dní</dd></div>
      </dl>
      <p class="fine">Program predávam sám, popri práci. Nemám firmu ani zákaznícku linku, všetko rieši e-mail vyššie.</p>
    </div>

    <div class="box box--big">
      <h3>Čo mi pomôže pri riešení problému</h3>
      <ul class="ticks">
        <li>Verzia programu z ľavého dolného rohu</li>
        <li>Windows 10 alebo 11</li>
        <li>Presné znenie hlášky, ideálne screenshot</li>
        <li>Čo ste robili tesne pred tým, než sa to stalo</li>
      </ul>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ PO PLATBE
# Sem vráti Stripe kupujúceho po dokončení objednávky. Stránka si sama
# overí reláciu cez /api/pristup a až potom ukáže odkaz na stiahnutie.
# V navigácii nie je, chodí sa na ňu len z pokladne.

hotovo = head('hotovo.html', 'Stiahnutie &mdash; ZNACKA',
              'Potvrdenie objednávky a stiahnutie programu ZNACKA.') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1 id="hlava">Overujem objednávku</h1>
    <p class="lead" id="podnadpis">Chvíľu to potrvá, stránku zatiaľ nezatvárajte.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="kod kod--skryty" id="licencia" hidden>
      <span class="kod__lbl">Licenčný kód</span>
      <span class="kod__box">
        <b class="kod__val" id="kodhodnota">&mdash;</b>
        <button class="kod__odhal" type="button" id="odhalit">&#128065;&#65039; Zobraziť kód</button>
      </span>
      <button class="btn btn--gh btn--sm" type="button" id="kopiruj" hidden>&#128203; Kopírovať</button>
      <span class="kod__note" id="kodpozn"></span>
    </div>

    <div class="dl-list" id="stiahnutie" hidden>
      <div class="dl" id="dl-plna" hidden>
        <div class="dl__l">
          <span class="dl__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg></span>
          <div>
            <b>GridServis</b>
            <span id="info-plna">načítavam údaje o vydaní&hellip;</span>
          </div>
        </div>
        <a class="btn btn--pri btn--lg" id="odkaz-plna" href="#">Stiahnuť</a>
      </div>
      <div class="dl" id="dl-demo" hidden>
        <div class="dl__l">
          <span class="dl__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg></span>
          <div>
            <b>GridServis &mdash; demo</b>
            <span id="info-demo">načítavam údaje o vydaní&hellip;</span>
          </div>
        </div>
        <a class="btn btn--pri btn--lg" id="odkaz-demo" href="#">Stiahnuť</a>
      </div>
    </div>

    <p class="fine center" id="poznamka" hidden></p>

    <div class="box box--big" id="problem" hidden>
      <h3>Objednávku sa nepodarilo overiť</h3>
      <p id="problemtext">Skúste stránku obnoviť. Ak ste práve zaplatili a stále to nejde, napíšte mi a stiahnutie sprístupním ručne.</p>
      <p class="mailrow"><a class="btn btn--pri" data-mail="podpora">Napísať e-mail</a>
      <a class="btn btn--gh" href="cennik.html">Späť do cenníka</a></p>
    </div>

    <div class="warn" id="varovanie" hidden>
      <h3>Windows bude hlásiť, že súbor nie je bezpečný</h3>
      <p>Inštalačka nemá zakúpený podpisový certifikát, preto ju SmartScreen označí ako súbor od neznámeho vydavateľa. Nie je to vírus. Po kliknutí na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b> inštalácia normálne pokračuje.</p>
    </div>

    <div class="two two--top" id="navod" hidden>
      <div class="box">
        <h3>Systémové požiadavky</h3>
        <dl class="specs">
          <div><dt>Systém</dt><dd>Windows 10 alebo 11, 64-bit</dd></div>
          <div><dt>Pamäť</dt><dd>4 GB RAM a viac</dd></div>
          <div><dt>Disk</dt><dd>približne 300 MB</dd></div>
          <div><dt>Rozlíšenie</dt><dd>1366 &times; 768 a viac</dd></div>
          <div><dt>Internet</dt><dd>len na stiahnutie a aktualizácie</dd></div>
        </dl>
      </div>
      <div class="box">
        <h3>Inštalácia a spustenie</h3>
        <ol class="ol">
          <li>Stiahnite si inštalačku vyššie a spustite ju.</li>
          <li>Keď Windows zobrazí modré okno SmartScreen, kliknite na <b>Ďalšie informácie</b> a potom na <b>Spustiť tak či tak</b>.</li>
          <li>Potvrďte inštaláciu a počkajte, kým sa program nainštaluje.</li>
          <li id="krok-kod">Pri prvom spustení zadajte licenčný kód z tejto stránky (odhaľte ho vyššie) &mdash; program sa tým odomkne pre tento počítač.</li>
          <li>V Nastaveniach vyplňte údaje dielne a hodinovú sadzbu a založte prvú zákazku tlačidlom Nová zákazka.</li>
        </ol>
      </div>
    </div>

    <div class="two two--top" id="dalej" hidden>
      <div class="box">
        <h3>Odkaz si odložte</h3>
        <p>Táto stránka funguje aj neskôr, kým máte v adrese číslo objednávky. Odložte si ju do záložiek, keby ste inštalačku potrebovali stiahnuť znova.</p>
      </div>
      <div class="box">
        <h3>Niečo nesedí?</h3>
        <p>Napíšte mi na e-mail v <a href="kontakt.html">kontakte</a> a pošlite číslo objednávky z adresy tejto stránky. Ozvem sa hneď, ako to bude možné.</p>
      </div>
    </div>
  </div>
</section>
''' + '<script src="assets/js/confetti.js"></script>' + FOOT


# ============================================================ OBNOVENIE
# Sem vedie odkaz, ktorý program ukáže, keď sa licencia zastaví. Kód si
# stránka prečíta z adresy a po zaplatení sa tá istá licencia predĺži.

obnova = head('obnova.html', 'Obnovenie licencie — ZNACKA',
              'Obnovenie zastavenej licencie programu ZNACKA. Po zaplatení sa licencia predĺži a dáta zostávajú.') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Obnovenie licencie</h1>
    <p class="lead">Zaplatením sa tá istá licencia predĺži. Kód sa nemení, program sa odomkne a zákazky, sklad ani nastavenia sa nikam nestratia.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    ''' + OZNAM + '''

    <div class="kod" id="licencia">
      <span class="kod__lbl">Licencia na obnovenie</span>
      <b class="kod__val" id="kodhodnota">&mdash;</b>
      <span class="kod__note" id="kodpozn">Kód si stránka prečíta z odkazu, ktorý ukázal program. Ak je prázdny, otvorte odkaz znova z programu alebo mi napíšte.</span>
    </div>

    <div class="plans">
      <article class="plan plan--best">
        <div class="plan__head">
          <h2>Ročne</h2>
          <span class="plan__badge">Ušetríte USPORA</span>
        </div>
        <p class="plan__price"><b>ROK</b><span>/ rok</span></p>
        <p class="plan__per">Obnoví licenciu na ďalších dvanásť mesiacov a ďalej sa obnovuje sama.</p>
        <form class="pay" method="post" action="/api/obnova">
          <input type="hidden" name="kod" value="" data-kod>
          <input type="hidden" name="plan" value="rok">
          <button class="btn btn--pri btn--lg btn--full" type="submit">Obnoviť na rok</button>
        </form>
      </article>
      <article class="plan">
        <div class="plan__head">
          <h2>Mesačne</h2>
          <span class="plan__badge plan__badge--mut">Zrušíte kedykoľvek</span>
        </div>
        <p class="plan__price"><b>MESIAC</b><span>/ mesiac</span></p>
        <p class="plan__per">Obnoví licenciu na jeden mesiac a ďalej sa obnovuje sama.</p>
        <form class="pay" method="post" action="/api/obnova">
          <input type="hidden" name="kod" value="" data-kod>
          <input type="hidden" name="plan" value="mesiac">
          <button class="btn btn--gh btn--lg btn--full" type="submit">Obnoviť na mesiac</button>
        </form>
      </article>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>O dáta neprídete</h3>
        <p>Zákazky, zákazníci aj sklad sú v databáze na vašom počítači. Kým je licencia zastavená, program ich nezahodí — po zaplatení sa všetko otvorí tam, kde ste skončili. Aj v zastavenom stave si viete dáta vyexportovať.</p>
      </div>
      <div class="box">
        <h3>Niečo nesedí?</h3>
        <p>Ak vám platba neprešla alebo potrebujete licenciu preložiť na iný počítač, napíšte mi na <a data-mail-txt href="#">&nbsp;</a> a dohodneme sa.</p>
      </div>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ PRÁVNE STRÁNKY
# Texty sú pripravený návrh podľa slovenskej a európskej úpravy.
# Pred spustením webu ich dajte skontrolovať právnikovi.

PREDAVAJUCI = '''
      <dl class="specs">
        <div><dt>Predávajúci</dt><dd>fyzická osoba, nie obchodná spoločnosť</dd></div>
        <div><dt>E-mail</dt><dd><a data-mail-txt href="#">&nbsp;</a></dd></div>
      </dl>'''


sukromie = head('ochrana-sukromia.html', 'Ochrana súkromia — ZNACKA',
                'Aké osobné údaje spracúvam pri predaji predplatného programu ZNACKA, na aký účel, ako dlho a aké práva máte.') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Ochrana súkromia</h1>
    <p class="lead">Tento web nepoužíva analytiku, reklamné nástroje ani profilovanie. Nižšie je popísané, čo sa deje s údajmi, ktoré mi pošlete pri objednávke alebo v e-maili.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2>Kto údaje spracúva</h2>
    ''' + PREDAVAJUCI + '''

    <h2>Údaje v programe zostávajú u vás</h2>
    <p>ZNACKA je program, ktorý beží na vašom počítači a ukladá dáta do databázy na tom istom počítači. Zákazky, zákazníci, vozidlá ani sklad sa nikam neodosielajú. K týmto údajom nemám prístup a nespracúvam ich. Za ich ochranu vo svojej dielni zodpovedáte vy ako prevádzkovateľ voči svojim zákazníkom.</p>

    <h2>Aké údaje spracúvam</h2>
    <ul>
      <li><b>Pri objednávke predplatného:</b> e-mail, prípadne meno a fakturačná adresa, a údaje o platbe. Platbu spracúva Stripe; číslo karty sa ku mne nedostane, vidím len jej posledné štvorčíslie a stav platby.</li>
      <li><b>Pri stiahnutí dema:</b> e-mail, ktorý zadáte v objednávke za 0 €. Slúži na sprístupnenie stiahnutia a na to, aby som vedel, komu poslať licenčný kľúč, ak si predplatné kúpite.</li>
      <li><b>Pri e-mailovej komunikácii:</b> e-mailová adresa, meno a obsah správy, ktorý mi pošlete.</li>
      <li><b>Pri prevádzke webu:</b> technické záznamy hostingu, napríklad IP adresa a čas požiadavky, ktoré vznikajú automaticky a slúžia na prevádzku a bezpečnosť.</li>
      <li><b>Pri pohybe po webe:</b> anonymné počítadlo návštevnosti — typ udalosti (zobrazenie stránky, kliknutie na predplatné, dokončená platba), názov stránky a doména, z ktorej ste prišli. Nezapisuje sa IP adresa ani nič, podľa čoho by sa dal človek identifikovať, a nepoužívajú sa na to cookies. Slúži mi to len na to, aby som vedel, ktoré časti webu ľuďom nesadli.</li>
    </ul>
    <p>Nezbieram nič, čo na vybavenie objednávky alebo odpoveď nepotrebujem. Web neobsahuje formuláre, ktoré by údaje odosielali na server — kontakt prebieha e-mailom.</p>

    <h2>Na akom právnom základe a prečo</h2>
    <ul>
      <li><b>Plnenie zmluvy</b> podľa čl. 6 ods. 1 písm. b) GDPR — sprístupnenie programu, licenčného kľúča a podpory.</li>
      <li><b>Zákonná povinnosť</b> podľa čl. 6 ods. 1 písm. c) GDPR — uchovanie dokladov o platbe, ak to zákon vyžaduje.</li>
      <li><b>Oprávnený záujem</b> podľa čl. 6 ods. 1 písm. f) GDPR — odpoveď na e-mail, ktorý mi napíšete, a bezpečnosť webu.</li>
    </ul>

    <h2>Ako dlho ich uchovávam</h2>
    <ul>
      <li>Doklady o platbe po dobu, ktorú predpisuje zákon.</li>
      <li>Údaje o predplatnom po dobu jeho platnosti, aby sa dal kľúč obnoviť alebo preniesť.</li>
      <li>E-mailovú komunikáciu najviac dva roky od poslednej správy.</li>
    </ul>

    <h2>Komu sa údaje dostanú</h2>
    <p>Len tomu, kto sa podieľa na vybavení objednávky: poskytovateľovi hostingu webu, platobnej bráne Stripe Payments Europe, Ltd., službe na odosielanie e-mailov s licenčným kódom a poskytovateľovi e-mailovej schránky. Údaje nepredávam a neposkytujem na marketing. Mimo Európskeho hospodárskeho priestoru ich neprenášam nad rámec toho, čo vyplýva z použitia uvedených služieb, ktoré majú na takýto prenos vlastné záruky.</p>

    <h2>Vaše práva</h2>
    <p>Máte právo na prístup k svojim údajom, na ich opravu, výmaz, obmedzenie spracúvania, na prenosnosť a právo namietať proti spracúvaniu založenému na oprávnenom záujme. Stačí napísať na e-mail uvedený vyššie. Ak si myslíte, že s údajmi nakladám nesprávne, môžete podať sťažnosť Úradu na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava.</p>

    <h2>Údaje o licencii</h2>
    <p>K vydanej licencii si vediem licenčný kód, e-mail z objednávky, obdobie platnosti a záznam o počítači, na ktorom je licencia aktivovaná (názov počítača, verzia systému a programu, odtlačok počítača). Slúži to na overovanie licencie, riešenie problémov a na to, aby sa jeden kód nepoužíval na viacerých počítačoch, než koľko je zaplatených. Program tieto údaje posiela pri aktivácii a potom pri občasnej kontrole licencie.</p>

    <h2>Automatizované rozhodovanie</h2>
    <p>Žiadne nerobím. Údaje sa nepoužívajú na profilovanie ani na automatizované rozhodnutia s právnym účinkom.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


cookies = head('cookies.html', 'Cookies — ZNACKA',
               'Tento web nepoužíva sledovacie ani analytické cookies. Vysvetlenie, čo sa v prehliadači ukladá a prečo nie je zobrazovaná lišta so súhlasom.') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Cookies</h1>
    <p class="lead">Krátka odpoveď: tento web nepoužíva sledovacie ani analytické cookies a nezobrazuje lištu so súhlasom, pretože nie je čo odsúhlasovať.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2>Čo web nepoužíva</h2>
    <ul>
      <li>Žiadnu cudziu analytiku typu Google Analytics.</li>
      <li>Žiadne reklamné ani remarketingové skripty.</li>
      <li>Žiadne tlačidlá ani vložený obsah zo sociálnych sietí.</li>
      <li>Žiadne externé písma ani knižnice načítavané z cudzích serverov.</li>
    </ul>
    <p>Stránky si okrem obsahu z tejto domény nesťahujú nič ďalšie, takže o vás nikto tretí nedostane informáciu, že ste tu boli.</p>

    <h2>Čo sa môže uložiť</h2>
    <p>Poskytovateľ hostingu môže nastaviť technické cookies nutné na prevádzku a bezpečnosť, napríklad na rozloženie záťaže alebo ochranu pred zneužitím. Takéto cookies neslúžia na sledovanie a podľa zákona o elektronických komunikáciách nevyžadujú súhlas.</p>

    <h2>Vlastné počítadlo návštevnosti</h2>
    <p>Web si počíta, koľkokrát sa zobrazila ktorá stránka a koľkokrát niekto klikol na predplatné alebo demo. Zapisuje sa len typ udalosti, názov stránky a doména, z ktorej ste prišli — žiadna IP adresa a nič, podľa čoho by sa dal človek identifikovať. Nepoužívajú sa na to cookies; jednotlivé zobrazenia spája náhodné číslo uložené v pamäti karty prehliadača (sessionStorage), ktoré sa po jej zavretí zmaže a nikam sa neposiela.</p>

    <h2>Ako si cookies zmazať</h2>
    <p>V nastaveniach prehliadača v časti Súkromie alebo Ochrana osobných údajov nájdete zoznam uložených údajov pre jednotlivé stránky a možnosť ich vymazať. Blokovanie cookies fungovanie tohto webu neobmedzí.</p>

    <h2>Súvisiace</h2>
    <p>Podrobnosti o tom, aké údaje spracúvam pri objednávke a v komunikácii, nájdete v <a href="ochrana-sukromia.html">ochrane súkromia</a>.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


vop = head('obchodne-podmienky.html', 'Obchodné podmienky — ZNACKA',
           'Všeobecné obchodné podmienky predplatného programu ZNACKA vrátane ceny, dodania, trvania predplatného, odstúpenia od zmluvy a reklamácií.') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Obchodné podmienky</h1>
    <p class="lead">Podmienky predaja predplatného programu ZNACKA. Vzťahujú sa na každú objednávku uskutočnenú cez tento web alebo e-mailom.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2 id="predavajuci">1. Predávajúci</h2>
    ''' + PREDAVAJUCI + '''
    <p>Program predáva fyzická osoba, nie obchodná spoločnosť. Komunikácia prebieha e-mailom uvedeným vyššie.</p>
    <p>Orgán dozoru: Slovenská obchodná inšpekcia, Inšpektorát SOI pre príslušný kraj, oddelenie ochrany spotrebiteľa.</p>

    <h2 id="predmet">2. Čo sa predáva</h2>
    <p>Predmetom je predplatné na používanie počítačového programu ZNACKA, ktorý slúži na vedenie zákaziek, zákazníkov, skladu a fakturácie v autoservise. Program sa dodáva elektronicky a inštaluje sa na počítač kupujúceho.</p>
    <p>Predplatné sa kupuje na jeden počítač, na ktorom bude program spustený. Pri viacerých staniciach sa počet predplatných dohodne e-mailom.</p>

    <h2 id="objednavka">3. Objednávka a uzavretie zmluvy</h2>
    <p>Kupujúci si v cenníku zvolí ročné alebo mesačné predplatné a objednávku odošle cez pokladňu Stripe alebo e-mailom. Zmluva je uzavretá potvrdením objednávky zo strany predávajúceho. Pred odoslaním objednávky je kupujúci oboznámený s cenou, rozsahom predplatného, upozornením na nepodpísanú inštalačku a týmito podmienkami.</p>

    <h2 id="cena">4. Cena a platba</h2>
    <p>Ročné predplatné stojí ROK, mesačné MESIAC. Ceny sú konečné, platia za jeden počítač a v rovnakej výške sa účtujú aj pri automatickej obnove. Preloženie licencie na iný počítač stojí jednorazovo 10 €. Platba prebieha kartou cez poskytovateľa platobnej brány Stripe Payments Europe, Ltd.; predávajúci sa k údajom o karte nedostane. Doklad o zaplatení posiela predávajúci elektronicky na e-mail kupujúceho.</p>

    <h2 id="trvanie">5. Trvanie, automatická obnova a ukončenie</h2>
    <p>Predplatné začína plynúť dňom sprístupnenia plnej verzie a trvá zvolené obdobie, teda dvanásť mesiacov pri ročnom a jeden mesiac pri mesačnom predplatnom.</p>
    <p>Predplatné sa po skončení obdobia automaticky obnovuje a z platobného prostriedku kupujúceho sa strhne cena ďalšieho obdobia v rovnakej výške, akú kupujúci pri objednávke odsúhlasil. Po každej úspešnej platbe sa licencia predĺži bez zásahu kupujúceho.</p>
    <p>Kupujúci môže automatickú obnovu kedykoľvek vypnúť — priamo v programe v Nastaveniach alebo e-mailom predávajúcemu. Predplatné potom dobehne do konca zaplateného obdobia a ďalšia platba sa nestrhne.</p>
    <p>Ak platba neprejde, licencia sa po uplynutí zaplateného obdobia zastaví a program sa uzamkne. Dáta zapísané v programe zostávajú v databáze na počítači kupujúceho a kupujúci si ich vie vyexportovať aj v tomto stave. Program zároveň ponúkne odkaz na obnovenie; po zaplatení sa tá istá licencia predĺži.</p>

    <h2 id="dodanie">6. Dodanie</h2>
    <p>Po pripísaní platby posiela predávajúci na e-mail kupujúceho odkaz na stiahnutie plnej verzie programu a licenčný kľúč. Dodanie prebieha bez zbytočného odkladu. Ak by dodanie meškalo, kupujúci má právo od zmluvy odstúpiť.</p>
    <p>Program na vyskúšanie je dostupný ako demo zadarmo ešte pred zaplatením. Demo sa sprístupňuje cez objednávku s nulovou cenou, v ktorej kupujúci uvedie e-mail; platobné údaje sa pri nej nezadávajú a nevzniká platobná povinnosť.</p>

    <h2 id="podpis">7. Upozornenie na nepodpísanú inštalačku</h2>
    <p>Inštalačný súbor programu nie je podpísaný certifikátom pre podpisovanie kódu. Windows preto pri jeho spustení zobrazí upozornenie SmartScreen o neznámom vydavateľovi a o možnom riziku. Ide o dôsledok chýbajúceho certifikátu, nie o vlastnosť programu. Kupujúci berie túto skutočnosť na vedomie pred zaplatením; upozornenie je uvedené v <a href="cennik.html#upozornenie">cenníku</a> aj na stránke <a href="stiahnut.html">demo</a>.</p>

    <h2 id="licencia">8. Licenčné podmienky</h2>
    <p>Kupujúci získava nevýhradné právo používať program na jednom počítači počas trvania predplatného. Program zostáva duševným vlastníctvom predávajúceho.</p>
    <p>Kupujúci nesmie program ani licenčný kľúč ďalej predávať, prenajímať, sprístupňovať tretím osobám ani rozmnožovať nad rámec zaplateného počtu počítačov. Nesmie program spätne prekladať, dekompilovať ani inak zisťovať jeho zdrojový kód, s výnimkou prípadov, ktoré výslovne pripúšťa zákon.</p>
    <p>Licencia sa pri aktivácii naviaže na konkrétny počítač a sama sa z neho neuvoľní. Preloženie na iný počítač vybaví predávajúci po e-mailovej žiadosti; za preloženie si účtuje jednorazový poplatok 10 €.</p>

    <h2 id="odstupenie">9. Odstúpenie od zmluvy a vrátenie peňazí</h2>
    <p>Kupujúci, ktorý je spotrebiteľom, má právo odstúpiť od zmluvy do štrnástich dní od jej uzavretia bez uvedenia dôvodu.</p>
    <p>Program sa však dodáva ako digitálny obsah, ktorý sa neposiela na hmotnom nosiči. Ak kupujúci pri objednávke výslovne súhlasí so začatím dodávania pred uplynutím lehoty na odstúpenie a vyhlási, že bol poučený o strate tohto práva, právo na odstúpenie mu podľa § 7 ods. 6 písm. l) zákona č. 102/2014 Z. z. zaniká momentom sprístupnenia programu na stiahnutie.</p>
    <p>Práve preto je k dispozícii demo. Odporúčam vyskúšať ho pred zaplatením.</p>
    <p>Ak právo na odstúpenie nezaniklo, kupujúci ho uplatní e-mailom na adrese uvedenej vyššie. Predávajúci vráti peniaze rovnakým spôsobom, akým platba prišla, najneskôr do štrnástich dní od doručenia odstúpenia.</p>

    <h2 id="reklamacie">10. Reklamácie a vady</h2>
    <p>Ak program nefunguje tak, ako je popísané na tomto webe, kupujúci to oznámi e-mailom. V hlásení pomôže uviesť verziu programu, verziu systému Windows, znenie chybovej hlášky a postup, ktorý k chybe viedol.</p>
    <p>Predávajúci vybaví reklamáciu najneskôr do tridsiatich dní od jej uplatnenia. Vadu odstráni opravou programu, poskytnutím opravenej verzie, primeranou zľavou alebo vrátením ceny, podľa povahy vady.</p>
    <p>Za vadu sa nepovažuje upozornenie systému Windows na nepodpísanú inštalačku podľa bodu 7.</p>
    <p>Záruka sa nevzťahuje na chyby spôsobené zásahom do programu, prevádzkou na nepodporovanom systéme, poškodením databázy zo strany kupujúceho alebo stratou dát, ktoré kupujúci nezálohoval.</p>

    <h2 id="spory">11. Riešenie sporov</h2>
    <p>Spory sa riešia prednostne dohodou. Spotrebiteľ má právo obrátiť sa na predávajúceho so žiadosťou o nápravu, a ak na ňu predávajúci odpovie zamietavo alebo neodpovie do tridsiatich dní, môže podať návrh na začatie alternatívneho riešenia sporu subjektu podľa zákona č. 391/2015 Z. z., najmä Slovenskej obchodnej inšpekcii. Návrh sa dá podať aj cez platformu Európskej komisie na riešenie sporov online.</p>

    <h2 id="zaverecne">12. Záverečné ustanovenia</h2>
    <p>Vzťahy neupravené týmito podmienkami sa riadia právnym poriadkom Slovenskej republiky, najmä Občianskym zákonníkom, zákonom č. 102/2014 Z. z. a zákonom č. 250/2007 Z. z., ak je kupujúci spotrebiteľom.</p>
    <p>Predávajúci môže podmienky meniť. Na už uzavreté zmluvy sa vzťahuje znenie platné v čase objednávky.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT



# ============================================================ 404
# Vercel túto stránku ukáže pri každej neexistujúcej adrese. Keďže adresa
# môže byť ľubovoľne hlboká (/nieco/ine/), odkazy sa nižšie prepíšu na
# absolútne — relatívne by z podadresára ukazovali vedľa.
stranka404 = head('404.html', 'Stránka sa nenašla — ZNACKA',
                  'Takáto stránka na webe ZNACKA nie je. Vráťte sa na domovskú stránku alebo do cenníka.',
                  extra='<meta name="robots" content="noindex">\n') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Takáto stránka tu nie je</h1>
    <p class="lead">Adresa je asi preklep alebo starý odkaz. Program aj cenník nájdete cez menu vyššie, alebo rovno tu:</p>
    <div class="row">
      <a class="btn btn--pri btn--lg" href="index.html">Domov</a>
      <a class="btn btn--gh btn--lg" href="cennik.html">Cenník</a>
      <a class="btn btn--gh btn--lg" href="stiahnut.html">Stiahnuť demo</a>
    </div>
    <p class="fine">Ak ste sem prišli z odkazu na tomto webe, <a data-mail="podpora" href="kontakt.html">napíšte mi</a> a opravím ho.</p>
  </div>
</section>
''' + FOOT


NAHRADY = [
    ('LOGO', LOGO),
    ('ZNACKA', ZNACKA),
    ('ROCNE_MESACNE', eur(ROCNE_MESACNE)),
    ('MESACNE_Z_ROCNEHO', eur(MESACNE_Z_ROCNEHO)),
    ('USPORA', eur(USPORA)),
    ('ROK', ROK),
    ('MESIAC', MESIAC),
]

def absolutne(html):
    """Relatívne odkazy prepíše na absolútne (assets/x → /assets/x).
    Potrebuje to 404.html, ktorá sa zobrazuje aj na hlbokých adresách."""
    return re.sub(r'(href|src)="(?!https?:|//|/|#|mailto:|data:)', r'\1="/', html)


for name, content in [('index.html', index), ('funkcie.html', funkcie),
                      ('cennik.html', cennik), ('stiahnut.html', stiahnut),
                      ('faq.html', faq), ('kontakt.html', kontakt),
                      ('hotovo.html', hotovo), ('obnova.html', obnova),
                      ('ochrana-sukromia.html', sukromie), ('cookies.html', cookies),
                      ('obchodne-podmienky.html', vop),
                      ('404.html', stranka404)]:
    content = content.replace('</a><a class="btn', '</a>\n        <a class="btn')
    for kluc, hodnota in NAHRADY:
        content = content.replace(kluc, hodnota)
    if name == '404.html':
        content = absolutne(content)
    with io.open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(content)
    print('napísané', name)


# ============================================================ SITEMAP, ROBOTS
# Sitemapa sa generuje spolu so stránkami, nech sa pri pridaní novej stránky
# nezabudne. Sú v nej len verejné stránky — hotovo.html a obnova.html sa
# otvárajú z odkazu s parametrami a v hľadaní nemajú čo robiť.
SITEMAP = [
    ('',                          '1.0'),
    ('funkcie.html',              '0.9'),
    ('cennik.html',               '0.9'),
    ('stiahnut.html',             '0.8'),
    ('faq.html',                  '0.7'),
    ('kontakt.html',              '0.6'),
    ('obchodne-podmienky.html',   '0.3'),
    ('ochrana-sukromia.html',     '0.3'),
    ('cookies.html',              '0.3'),
]

riadky = '\n'.join(
    '  <url><loc>%s/%s</loc><priority>%s</priority></url>' % (WEB, cesta, prio)
    for cesta, prio in SITEMAP)

with io.open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + riadky + '\n</urlset>\n')
print('napísané sitemap.xml')

with io.open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf-8') as f:
    f.write('User-agent: *\n'
            'Allow: /\n'
            '\n'
            'Sitemap: %s/sitemap.xml\n' % WEB)
print('napísané robots.txt')
