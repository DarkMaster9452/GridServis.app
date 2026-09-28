# -*- coding: utf-8 -*-
"""Vygeneruje statické HTML stránky webu GridServis (bez build kroku v repe)."""
import os, io, re

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(KOREN, 'public')   # web sa nasadzuje z public/, nie z koreňa repa

ZNACKA = 'GridServis'

# Ostrá adresa webu. Apex gridservis.app presmerováva (308) na www, takže
# kánonické odkazy, sitemapa aj og:url musia ukazovať na tvar s www.
WEB = 'https://www.gridservis.app'

# Predávajúci. Program predáva fyzická osoba, nie firma, preto tu nie sú
# IČO, DIČ ani zápis v registri — kontakt prebieha e-mailom.
PREDAJCA = {
    'email': 'support@gridservis.app',
}

# Ceny predplatného. Rovnaké hodnoty sú v assets/js/main.js (premenná CENY).
CENY = {'rok': 199.99, 'mesiac': 19.99}

# Každý ďalší počítač nad prvý. Rovnaké sumy sú v api/_stripe.js (PLANY.*.dalsi)
# a v assets/js/main.js (DALSI_PC). Cez web sa dá objednať najviac MAX_PC.
DALSI_PC = {'rok': 99.99, 'mesiac': 9.99}
MAX_PC = 10
# Predplatné na viac počítačov je zatiaľ „čoskoro“ — na webe sa ukazuje len
# ako pripravované a server ho nepustí, kým nie je VIAC_PC=1 (api/_stripe.js).
# Po spustení: VIAC_PC = True tu aj na Verceli, texty nižšie sa prepnú samé.
VIAC_PC = False

ROCNE_MESACNE = CENY['mesiac'] * 12          # 239,88 € — rok platený po mesiacoch
USPORA = ROCNE_MESACNE - CENY['rok']         # 39,89 € — zľava pri ročnom predplatnom
MESACNE_Z_ROCNEHO = CENY['rok'] / 12         # 16,67 € — koľko vyjde mesiac pri ročnom

# Presun licencie na iný počítač. Rovnaká suma je v api/_stripe.js (PLANY.presun).
PRESUN = 5

# Stránky, na ktoré sa chodí len z odkazu s parametrami (z programu alebo
# z pokladne). Blokuje ich meta tag, nie robots.txt — zakázanú stránku by
# Google neprečítal, noindex by nevidel a adresu by mohol zaindexovať aj tak.
NOINDEX = '<meta name="robots" content="noindex, nofollow">\n'

# Stránky, ktoré sú verejné a prelinkované, ale nemajú sa indexovať —
# v hľadaní má byť len domov, cenník a stiahnutie (demo). "follow" necháva
# Google prejsť odkazy na cenník aj demo, ktoré tieto stránky obsahujú.
NOINDEX_FOLLOW = '<meta name="robots" content="noindex, follow">\n'


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


# Tlačidlo do správy licencie (ucet.html). Stránka sa píše ručne, nie tu,
# lebo je to aplikácia — hlavičku však zdieľa s ostatnými.
UCET_IKONA = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
              'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
              '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>')


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
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="512x512" href="assets/img/favicon-512.png">
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
    <a class="btn btn--gh btn--sm hdr__cta hdr__ucet" href="ucet.html">%s</a>
    <a class="btn btn--pri btn--sm hdr__cta" href="cennik.html" data-buy>Predplatiť</a>
    <button class="hdr__burger" id="burger" aria-expanded="false" aria-controls="mnav" aria-label="Otvoriť menu"><span></span><span></span><span></span></button>
  </div>
  <nav class="hdr__mobile" id="mnav" hidden aria-label="Mobilná navigácia">
%s
    <a href="ucet.html"%s>Môj účet</a>
  </nav>
</header>

<main id="obsah">
''' % (title, desc, title, desc, ZNACKA, kanon, WEB, kanon, extra, nav,
       UCET_IKONA + 'Prihlásiť', mnav, ' class="on"' if active == 'ucet.html' else '')


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
      <a href="ucet.html">Môj účet</a>
    </div>
    <div class="foot__col">
      <h3>Právne</h3>
      <a href="obchodne-podmienky.html">Obchodné podmienky</a>
      <a href="odstupenie.html">Odstúpiť od zmluvy tu</a>
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


def foot(*skripty):
    """Pätička s ďalšími skriptmi za main.js (napríklad ucet.js)."""
    return FOOT.replace('</body>', ''.join(
        '<script src="assets/js/%s"></script>\n' % x for x in skripty) + '</body>')


def shot(img, alt, cls=''):
    """Snímka obrazovky. Pod obrázkom už nie je popiska, alt stačí."""
    return '''<figure class="shot %s">
  <img src="assets/img/%s" alt="%s" %s decoding="async" width="1600" height="1000">
</figure>''' % (cls, img, alt,
                'fetchpriority="high"' if 'hero' in cls else 'loading="lazy"')


def dl_btn(text='Stiahnuť demo', cls='btn--gh btn--lg'):
    """Odkaz na stránku s demom. Samotné stiahnutie je až za objednávkou."""
    return '<a class="btn %s" href="stiahnut.html">%s</a>' % (cls, text)


def buy_btn(text='Predplatiť', cls='btn--pri btn--lg'):
    return '<a class="btn %s" href="cennik.html">%s</a>' % (cls, text)


# Poučenie, ktoré musí kupujúci pri digitálnom obsahu výslovne odsúhlasiť.
# Bez neho mu právo na odstúpenie do 14 dní nezaniká — § 19 ods. 1
# zákona č. 108/2024 Z. z. (predtým § 7 ods. 6 písm. l) zák. 102/2014).
# Checkbox je povinný a overuje ho aj server.
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
            + ('  <input type="hidden" name="pocitace" value="1" data-pocitace>\n' if plan != 'demo' else '') +
            '%s'
            '  <button class="btn %s" type="submit">%s</button>\n'
            '</form>') % (plan, SUHLAS if plan != 'demo' else '', cls, text)



# Štruktúrované dáta o programe (na domovskej stránke aj v cenníku). Google
# vďaka nim vie ukázať cenu priamo vo výsledkoch hľadania. Cena sa berie
# z CENY, nech sa nemôže rozísť s cenníkom.
PROGRAM_LD ='''<script type="application/ld+json">
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
# Tretia karta „Viac počítačov — Čoskoro“ v skrátenej podobe (domovská stránka).
PLAN_COSKORO_KRATKY = '''      <article class="plan plan--coskoro" aria-labelledby="coskoro-domov">
        <div class="plan__rozmazane" aria-hidden="true">
          <div class="plan__head">
            <h2>Viac počítačov</h2>
            <span class="plan__badge plan__badge--mut">Pre väčšie dielne</span>
          </div>
          <p class="plan__price"><b>+ DALSI_ROK</b><span>/ PC / rok</span></p>
          <p class="plan__per">Prvý počítač za plnú cenu, každý ďalší lacnejšie.</p>
          <span class="btn btn--gh btn--lg btn--full">Zvoliť počet počítačov</span>
        </div>
        <div class="plan__coskoro">
          <span class="coskoro">Čoskoro</span>
          <h2 id="coskoro-domov">Viac počítačov</h2>
          <p>Predplatné na viac počítačov pripravujeme.</p>
        </div>
      </article>'''


index = head('index.html', 'ZNACKA — program na správu autoservisu',
             'Zákazky, zákazníci, sklad dielov, cenník prác, faktúry a štatistiky pre autoservis. Windows program s predplatným, vyskúšajte demo zadarmo.',
             extra=PROGRAM_LD) + '''
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
  <div class="wrap">
    <header class="shead">
      <h2>Jedna cena za celý program</h2>
      <p>Predplatné na jeden počítač, viac počítačov čoskoro. Obnovuje sa samo, zrušiť ho viete v programe.</p>
    </header>
    <div class="plans plans--tri plans--kratke pulz pulz--velky">
      <article class="plan plan--best">
        <div class="plan__head">
          <h2>Ročne</h2>
          <span class="plan__badge">Ušetríte USPORA</span>
        </div>
        <p class="plan__price"><b>ROK</b><span>/ rok</span></p>
        <p class="plan__per">Vychádza na MESACNE_Z_ROCNEHO mesačne.</p>
        <a class="btn btn--pri btn--lg btn--full" href="cennik.html">Predplatiť na rok</a>
      </article>
      <article class="plan">
        <div class="plan__head">
          <h2>Mesačne</h2>
          <span class="plan__badge plan__badge--mut">Zrušíte kedykoľvek</span>
        </div>
        <p class="plan__price"><b>MESIAC</b><span>/ mesiac</span></p>
        <p class="plan__per">Bez viazanosti, obnovu vypnete v programe.</p>
        <a class="btn btn--gh btn--lg btn--full" href="cennik.html">Predplatiť na mesiac</a>
      </article>
''' + ('' if VIAC_PC else PLAN_COSKORO_KRATKY) + '''
    </div>
    <div class="row row--c plans__pod">
      <a class="link" href="cennik.html">Celý cenník a čo je v predplatnom</a>
      <a class="link" href="stiahnut.html">Najprv skúsiť demo</a>
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
               'Prehľad obrazoviek programu ZNACKA: zákazky, detail zákazky, zákazníci, sklad dielov, cenník prác, štatistiky a nastavenia dielne.',
               extra=NOINDEX_FOLLOW) + '''
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
# Výber počtu počítačov (keď bude VIAC_PC zapnuté) a jeho „čoskoro“ verzia.
PC_VOLBA = '''<div class="pc-volba" data-pc-volba data-max="MAX_PC_N">
      <div class="pc-volba__txt">
        <b>Na koľko počítačov?</b>
        <span>Prvý za plnú cenu, každý ďalší za DALSI_ROK ročne alebo DALSI_MESIAC mesačne.</span>
      </div>
      <div class="pc-volba__krok" role="group" aria-label="Počet počítačov">
        <button type="button" data-pc="-1" aria-label="Menej počítačov">−</button>
        <output data-pc-pocet aria-live="polite">1</output>
        <button type="button" data-pc="1" aria-label="Viac počítačov">+</button>
      </div>
    </div>'''

# Tretí plán v cenníku, kým predplatné na viac PC nie je spustené:
# obsah je rozmazaný a cez neho je nápis Čoskoro.
PLAN_COSKORO = '''      <article class="plan plan--coskoro" aria-labelledby="coskoro-nadpis">
        <div class="plan__rozmazane" aria-hidden="true">
          <div class="plan__head">
            <h2>Viac počítačov</h2>
            <span class="plan__badge plan__badge--mut">Pre väčšie dielne</span>
          </div>
          <p class="plan__price"><b>+ DALSI_ROK</b><span>/ PC / rok</span></p>
          <p class="plan__per">Prvý počítač za plnú cenu, každý ďalší lacnejšie. Počet si zvolíte sami.</p>
          <span class="btn btn--gh btn--lg btn--full">Zvoliť počet počítačov</span>
          <ul class="ticks">
            <li>Jeden licenčný kód pre všetky počítače</li>
            <li>Počet počítačov si zvolíte sami</li>
            <li>Každý ďalší počítač lacnejšie</li>
            <li>Všetko ako pri ročnom a mesačnom</li>
          </ul>
        </div>
        <div class="plan__coskoro">
          <span class="coskoro">Čoskoro</span>
          <h2 id="coskoro-nadpis">Viac počítačov</h2>
          <p>Predplatné, v ktorom si zvolíte počet počítačov, pripravujeme. Dovtedy mi <a data-mail="viac" href="kontakt.html">napíšte</a> a dohodneme cenu.</p>
        </div>
      </article>'''


# Porovnanie pod plánmi: čo v predplatnom je (✓) a čo nie (–).
def _riadok(nazov, mesiac, rok, pozn=''):
    znak = lambda x: ('<td class="ano"><span aria-label="áno">✓</span></td>' if x
                      else '<td class="nie"><span aria-label="nie">–</span></td>')
    return ('        <tr><th scope="row">%s%s</th>%s%s</tr>\n'
            % (nazov, ('<small>%s</small>' % pozn) if pozn else '', znak(mesiac), znak(rok)))

POROVNANIE = ('''<div class="porovnanie">
      <h2>Čo je v predplatnom</h2>
      <table class="porovnanie__tab">
        <thead><tr><th scope="col"><span class="sr">Funkcia</span></th><th scope="col">Mesačne</th><th scope="col">Ročne</th></tr></thead>
        <tbody>
'''
    + _riadok('Celý program bez obmedzení', True, True, 'zákazky, zákazníci, sklad, cenník prác, faktúry, štatistiky')
    + _riadok('Všetky moduly, žiadne platené doplnky', True, True)
    + _riadok('Opravy chýb a nové verzie', True, True, 'počas celého predplatného')
    + _riadok('E-mailová podpora', True, True, 'pri inštalácii a nastavení')
    + _riadok('Správa licencie v Mojom účte', True, True, 'platnosť, počítače, platby')
    + _riadok('Dáta zostávajú u vás', True, True, 'na počítači v dielni, nie v cudzom cloude')
    + _riadok('Automatická obnova, zrušíte kedykoľvek', True, True)
    + _riadok('Jedna platba za celý rok', False, True)
    + _riadok('Ušetríte USPORA ročne', False, True)
    + _riadok('Presun licencie na iný počítač zadarmo', False, False, 'stojí jednorazovo PRESUN_SUMA, zaplatíte ho z programu')
    + _riadok('Používanie po skončení predplatného', False, False, 'dáta si viete vyexportovať aj potom')
    + _riadok('Úpravy programu na mieru', False, False)
    + _riadok('Zdieľaná databáza medzi počítačmi', False, False, 'každý počítač má vlastnú')
    + _riadok('Podpisový certifikát inštalačky', False, False, 'preto Windows hlási neznámeho vydavateľa')
    + '''        </tbody>
      </table>
    </div>''')


cennik = head('cennik.html', 'Cenník a predplatné — ZNACKA',
              'Predplatné programu ZNACKA: ROK ročne alebo MESIAC mesačne na jeden počítač. Ročné je o USPORA lacnejšie. Demo je zadarmo.',
              extra=PROGRAM_LD) + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Ročne ROK, mesačne MESIAC</h1>
    <p class="lead">Predplatné platí na jeden počítač a sprístupní celý program bez obmedzení. Ročné predplatné je o USPORA lacnejšie ako dvanásť mesačných platieb. Demo si vyskúšate zadarmo ešte pred platbou.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ''' + OZNAM + '''
    ''' + (PC_VOLBA if VIAC_PC else '') + '''
    <div class="plans plans--tri pulz pulz--velky">
      <article class="plan plan--best">
        <div class="plan__head">
          <h2>Ročne</h2>
          <span class="plan__badge">Ušetríte USPORA</span>
        </div>
        <p class="plan__price"><b data-cena="rok" data-zaklad="CENA_ROK_N" data-dalsi="DALSI_ROK_N">ROK</b><span>/ rok</span></p>
        <p class="plan__per" data-per="rok">Vychádza na MESACNE_Z_ROCNEHO mesačne. Dvanásť mesačných platieb by stálo ROCNE_MESACNE.</p>
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
        <p class="plan__price"><b data-cena="mesiac" data-zaklad="CENA_MESIAC_N" data-dalsi="DALSI_MESIAC_N">MESIAC</b><span>/ mesiac</span></p>
        <p class="plan__per" data-per="mesiac">Za rok to je ROCNE_MESACNE, teda o USPORA viac ako ročné predplatné.</p>
''' + platba_btn('mesiac', 'Predplatiť na mesiac', 'btn--gh btn--lg btn--full') + '''
        <ul class="ticks">
          <li>Celý program bez obmedzení na jeden mesiac</li>
          <li>Opravy chýb a nové verzie počas predplatného</li>
          <li>Obnovu vypnete v programe, ďalší mesiac sa neplatí</li>
          <li>E-mailová podpora pri inštalácii a nastavení</li>
        </ul>
      </article>
''' + ('' if VIAC_PC else PLAN_COSKORO) + '''
    </div>
    <p class="fine center">Ceny sú konečné, za jeden počítač. Predplatné sa po skončení obdobia obnoví samo, kým ho nezrušíte v programe v Nastaveniach. Predplatné na viac počítačov pripravujeme — dovtedy mi <a data-mail="viac" href="kontakt.html">napíšte</a> a dohodneme cenu.</p>

    ''' + VAROVANIE + '''

    ''' + POROVNANIE + '''
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
      <details><summary>Obnovuje sa predplatné samo?</summary><p>Áno. Po skončení obdobia sa z karty strhne ďalšia platba a licencia sa predĺži — v programe si ničoho nevšimnete. Obnovu vypnete v programe v Nastaveniach, licencia potom dobehne do konca zaplateného obdobia a ďalej sa neúčtuje.</p></details>
      <details><summary>Ako prebieha platba?</summary><p>Cez pokladňu Stripe. Kliknete na Predplatiť, na stránke Stripe zaplatíte kartou a vrátite sa späť na stiahnutie. Údaje o karte idú priamo Stripe, ja sa k nim nedostanem.</p></details>
      <details><summary>Čo ak sa program neosvedčí?</summary><p>Preto je tu demo. Vyskúšate ho pred platbou, a ak vám nesadne, predplatné jednoducho nekúpite. Ďalšie odpovede sú v <a href="faq.html">častých otázkach</a>.</p></details>
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
           'Odpovede na najčastejšie otázky o programe ZNACKA: kde sú dáta, čo program tlačí, koľko stojí a ako sa dá vyskúšať.',
           extra=NOINDEX_FOLLOW) + '''
<section class="phead mriezka">
  <div class="wrap">
    <h1>Časté otázky</h1>
    <p class="lead">Osem otázok, ktoré dostávam najčastejšie. Ak tu odpoveď nenájdete, <a href="kontakt.html">napíšte mi</a> a doplním ju.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <div class="faq">
      <details><summary>Kde sú uložené moje zákazky?</summary><p>V databáze na počítači, kde je program nainštalovaný. Nič sa neposiela na cudzí server, takže údaje o zákazníkoch aj o autách zostávajú v dielni. Na bežnú prácu so zákazkami preto netreba ani internet.</p></details>
      <details><summary>Čo potrebujem, aby to bežalo?</summary><p>Windows 10 alebo 11 a bežný počítač. Na Macu ani v mobile program nebeží. Je stavaný na jeden počítač s vlastnou databázou — zdieľanú databázu medzi viacerými stanicami zatiaľ nerieši.</p></details>
      <details><summary>Vystavuje program faktúry? Zvládne DPH?</summary><p>Áno, faktúru aj zákazkový list vytlačíte priamo z detailu zákazky, v PDF a s rozpisom prác a každého dielu zvlášť. Ak ste platiteľ DPH, zapnete to v nastaveniach a faktúry sa počítajú s DPH.</p></details>
      <details><summary>Vidím, čo sa na aute robilo minule?</summary><p>Áno, na záložke História vozidla. Auto sa páruje podľa ŠPZ a VIN, takže pri každej ďalšej návšteve vidíte všetky predchádzajúce zákazky aj s cenou.</p></details>
      <details><summary>Koľko to stojí?</summary><p>ROK za rok, alebo MESIAC za mesiac bez viazanosti — na jeden počítač. Predplatné na viac počítačov čoskoro pribudne. Ročné predplatné je o USPORA lacnejšie ako dvanásť mesačných platieb. Podrobnosti sú v <a href="cennik.html">cenníku</a>.</p></details>
      <details><summary>Dá sa program najprv vyskúšať?</summary><p>Áno, na to je demo. Nič nestojí, stiahnete si ho hneď a zapíšete doň vlastné zákazky. Predplatné riešite až vtedy, keď viete, že vám program sadol.</p></details>
      <details><summary>Čo sa stane, keď predplatné skončí?</summary><p>Program sa uzamkne, ale dáta vám zostanú na počítači a viete si ich vyexportovať aj v tomto stave. Po zaplatení pokračuje tá istá licencia tam, kde ste skončili. Obnovu vypnete v programe v Nastaveniach.</p></details>
      <details><summary>Prečo Windows hlási, že inštalačka nie je bezpečná?</summary><p>Nemá zakúpený podpisový certifikát, takže SmartScreen ju označí za súbor od neznámeho vydavateľa. Nie je to vírus ani chyba programu. Inštalácia pokračuje cez <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>. Píšem to aj <a href="cennik.html#upozornenie">v cenníku ešte pred platbou</a>.</p></details>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ KONTAKT
kontakt = head('kontakt.html', 'Kontakt — ZNACKA',
               'Kontakt na objednávku predplatného, podporu pri inštalácii a hlásenie chýb v programe ZNACKA.',
               extra=NOINDEX_FOLLOW) + '''
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
        <p>Ročné predplatné za ROK alebo mesačné za MESIAC si kúpite priamo v cenníku. Zaplatíte kartou cez Stripe a licenčný kód sa ukáže hneď po platbe, príde aj e-mailom. Napíšte mi, ak potrebujete program na viacerých počítačoch — dohodneme cenu.</p>
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
              'Potvrdenie objednávky a stiahnutie programu ZNACKA.',
              extra=NOINDEX) + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1 id="hlava">Overujem objednávku</h1>
    <p class="lead" id="podnadpis">Chvíľu to potrvá, stránku zatiaľ nezatvárajte.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="kod" id="presun-hotovo" hidden>
      <span class="kod__lbl">Licencia</span>
      <b class="kod__val" id="presun-kod">&mdash;</b>
      <span class="kod__note">Na novom počítači zadajte pri spustení programu tento istý kód. Predošlý počítač je odhlásený, licencia ani jej platnosť sa nemenia.</span>
    </div>

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
              'Obnovenie zastavenej licencie programu ZNACKA. Po zaplatení sa licencia predĺži a dáta zostávajú.',
              extra=NOINDEX) + '''
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
        <p>Ak vám platba neprešla, napíšte mi na <a data-mail-txt href="#">&nbsp;</a> a dohodneme sa. Presun licencie na iný počítač spustíte priamo z programu.</p>
      </div>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ PRESUN LICENCIE
# Sem vedie odkaz z programu s parametrami ?kod=…&pc=… (kód licencie a odtlačok
# počítača, ktorý sa má uvoľniť). Po zaplatení vráti Stripe kupujúceho na hotovo.html.

presun = head('presun.html', 'Presun licencie — ZNACKA',
              'Presun licencie programu ZNACKA na iný počítač za jednorazový poplatok.',
              extra=NOINDEX) + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Presun licencie na iný počítač</h1>
    <p class="lead">Jednorazový poplatok PRESUN_SUMA. Po zaplatení sa tento počítač uvoľní a na novom sa prihlásite tým istým kódom. Licencia ani jej platnosť sa nemenia.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    ''' + OZNAM + '''

    <div class="kod" id="licencia">
      <span class="kod__lbl">Licencia na presun</span>
      <b class="kod__val" id="kodhodnota">&mdash;</b>
      <span class="kod__note" id="kodpozn">Tento odkaz otvorte priamo z aplikácie ZNACKA — appka doňho vloží kód aj odtlačok počítača, ktorý sa má uvoľniť.</span>
    </div>

    <div class="plans" id="plany" hidden>
      <article class="plan plan--best">
        <div class="plan__head">
          <h2>Presun na iný počítač</h2>
          <span class="plan__badge">Jednorazovo</span>
        </div>
        <p class="plan__price"><b>PRESUN_SUMA</b><span>/ jednorazovo</span></p>
        <p class="plan__per">Uvoľní tento počítač, aby ste sa mohli tým istým kódom prihlásiť na novom. Licencia sa nemení.</p>
        <button class="btn btn--pri btn--lg btn--full" type="button" id="zaplatit">Zaplatiť PRESUN_SUMA a uvoľniť počítač</button>
      </article>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>Čo sa presunom zmení</h3>
        <p>Nič na licencii — kód, platnosť ani zákazky sa nemenia. Zmení sa len to, ktorý počítač je na kód prihlásený.</p>
      </div>
      <div class="box">
        <h3>Niečo nesedí?</h3>
        <p>Ak odkaz nefunguje alebo platba neprešla, napíšte mi na <a data-mail-txt href="#">&nbsp;</a> a dohodneme sa.</p>
      </div>
    </div>
  </div>
</section>
<script>
(function () {
  var q = new URLSearchParams(location.search);
  var kod = (q.get('kod') || '').trim().toUpperCase();
  var pc = (q.get('pc') || '').trim();

  var oznam = document.getElementById('oznam');
  var kodhodnota = document.getElementById('kodhodnota');
  var kodpozn = document.getElementById('kodpozn');
  var plany = document.getElementById('plany');
  var tlacidlo = document.getElementById('zaplatit');

  function ukazOznam(text) {
    oznam.textContent = text;
    oznam.hidden = false;
  }

  if (q.get('zrusene')) {
    ukazOznam('Platba bola zrušená a nič sa nestrhlo. Skúsiť znova môžete kedykoľvek z aplikácie.');
  }

  if (!kod || !pc) {
    ukazOznam('Tento odkaz otvorte priamo z aplikácie ZNACKA.');
    return;
  }

  kodhodnota.textContent = kod;
  kodpozn.textContent = 'Po zaplatení sa tento počítač uvoľní a na novom sa prihlásite kódom ' + kod + '. Licencia ani jej platnosť sa nemenia.';
  plany.hidden = false;

  tlacidlo.addEventListener('click', function () {
    tlacidlo.disabled = true;
    tlacidlo.textContent = 'Pripravujem platbu…';
    fetch('/api/presun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ kod: kod, pc: pc })
    })
      .then(function (r) { return r.json().then(function (v) { return { stav: r.status, v: v }; }); })
      .then(function (r) {
        if (r.v && r.v.ok && r.v.url) { location.href = r.v.url; return; }
        throw new Error((r.v && r.v.chyba) || 'Platbu sa nepodarilo založiť.');
      })
      .catch(function (e) {
        tlacidlo.disabled = false;
        tlacidlo.textContent = 'Zaplatiť PRESUN_SUMA a uvoľniť počítač';
        ukazOznam(e.message || 'Platbu sa nepodarilo založiť. Skúste to prosím znova, alebo mi napíšte.');
      });
  });
})();
</script>
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
                'Aké osobné údaje spracúvam pri predaji predplatného programu ZNACKA, na aký účel, ako dlho a aké práva máte.',
                extra=NOINDEX_FOLLOW) + '''
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
    <p>Nezbieram nič, čo na vybavenie objednávky alebo odpoveď nepotrebujem.</p>

    <h2 id="ucet">Môj účet na webe</h2>
    <ul>
      <li><b>Prihlásenie kódom:</b> licenčný kód a e-mail, ktoré zadáte, a jednorazový 6-ciferný kód, ktorý vám pošlem. V databáze nie je kód samotný, len jeho zašifrovaný odtlačok, a zmaže sa hneď po prihlásení, po piatich zlých pokusoch alebo najneskôr po 15 minútach.</li>
      <li><b>Prihlásenie cez Google:</b> len ak si ho v účte sami prepojíte. Od Google dostanem iba identifikátor vášho účtu a e-mail — žiadne kontakty, súbory ani heslo. Prepojenie trvá, kým ho neodpojíte alebo nezmažete účet.</li>
      <li><b>Čo v účte vidíte:</b> údaje o vašich licenciách, počítačoch a platbách, ktoré už spracúvam kvôli licencii (pozri nižšie). Dáta z programu, IP adresy počítačov ani údaje o karte sa v účte nezobrazujú.</li>
      <li><b>Zmazanie účtu:</b> tlačidlom Zmazať účet v Mojom účte sa hneď zmaže prihlásenie, prepojenie s Google a rozpracované kódy. Licencia a doklady o platbách ostávajú, lebo sú potrebné na fungovanie programu a zákon vyžaduje ich uchovanie. O výmaz ostatných údajov môžete požiadať e-mailom.</li>
    </ul>

    <h2 id="odstupenie">Odstúpenie od zmluvy</h2>
    <p>Ak použijete formulár <a href="odstupenie.html">Odstúpiť od zmluvy tu</a>, spracúvam meno, e-mail, licenčný kód alebo číslo objednávky, poznámku a čas odoslania. Slúži to na vybavenie odstúpenia a potvrdenie, ktoré vám musím poslať podľa zákona o ochrane spotrebiteľa. Záznam uchovávam, kým možno uplatniť nároky z odstúpenia, najviac štyri roky.</p>

    <h2>Na akom právnom základe a prečo</h2>
    <ul>
      <li><b>Plnenie zmluvy</b> podľa čl. 6 ods. 1 písm. b) GDPR — sprístupnenie programu, licenčného kľúča a podpory.</li>
      <li><b>Zákonná povinnosť</b> podľa čl. 6 ods. 1 písm. c) GDPR — uchovanie dokladov o platbe, ak to zákon vyžaduje, a vybavenie odstúpenia od zmluvy.</li>
      <li><b>Plnenie zmluvy</b> aj pri Mojom účte — prihlásenie a správa licencie, ktorú ste si kúpili. Prepojenie s Google je dobrovoľné a zapnete ho sami.</li>
      <li><b>Oprávnený záujem</b> podľa čl. 6 ods. 1 písm. f) GDPR — odpoveď na e-mail, ktorý mi napíšete, a bezpečnosť webu.</li>
    </ul>

    <h2>Ako dlho ich uchovávam</h2>
    <ul>
      <li>Doklady o platbe po dobu, ktorú predpisuje zákon.</li>
      <li>Údaje o predplatnom po dobu jeho platnosti, aby sa dal kľúč obnoviť alebo preniesť.</li>
      <li>E-mailovú komunikáciu najviac dva roky od poslednej správy.</li>
      <li>Jednorazové kódy na prihlásenie najviac 15 minút, prihlásenie v prehliadači 8 hodín.</li>
      <li>Prepojenie s Google, kým ho neodpojíte alebo nezmažete účet.</li>
    </ul>

    <h2>Komu sa údaje dostanú</h2>
    <p>Len tomu, kto sa podieľa na vybavení objednávky: poskytovateľovi hostingu webu, platobnej bráne Stripe Payments Europe, Ltd., službe na odosielanie e-mailov s licenčným kódom a kódmi na prihlásenie, poskytovateľovi databázy a poskytovateľovi e-mailovej schránky. Ak si prepojíte prihlásenie cez Google, Google Ireland Limited sa dozvie, že sa prihlasujete na tento web. Údaje nepredávam a neposkytujem na marketing. Mimo Európskeho hospodárskeho priestoru ich neprenášam nad rámec toho, čo vyplýva z použitia uvedených služieb, ktoré majú na takýto prenos vlastné záruky.</p>

    <h2>Vaše práva</h2>
    <p>Máte právo na prístup k svojim údajom, na ich opravu, výmaz, obmedzenie spracúvania, na prenosnosť a právo namietať proti spracúvaniu založenému na oprávnenom záujme. Účet na webe si zmažete sami v <a href="ucet.html">Mojom účte</a>; v ostatných prípadoch stačí napísať na e-mail uvedený vyššie a odpoviem najneskôr do mesiaca. Ak si myslíte, že s údajmi nakladám nesprávne, môžete podať sťažnosť Úradu na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava.</p>

    <h2>Údaje o licencii</h2>
    <p>K vydanej licencii si vediem licenčný kód, e-mail z objednávky, obdobie platnosti a záznam o počítači, na ktorom je licencia aktivovaná (názov počítača, verzia systému a programu, odtlačok počítača). Slúži to na overovanie licencie, riešenie problémov a na to, aby sa jeden kód nepoužíval na viacerých počítačoch, než koľko je zaplatených. Program tieto údaje posiela pri aktivácii a potom pri občasnej kontrole licencie.</p>

    <h2>Automatizované rozhodovanie</h2>
    <p>Žiadne nerobím. Údaje sa nepoužívajú na profilovanie ani na automatizované rozhodnutia s právnym účinkom.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


cookies = head('cookies.html', 'Cookies — ZNACKA',
               'Tento web nepoužíva sledovacie ani analytické cookies. Vysvetlenie, čo sa v prehliadači ukladá a prečo nie je zobrazovaná lišta so súhlasom.',
               extra=NOINDEX_FOLLOW) + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Cookies</h1>
    <p class="lead">Krátka odpoveď: tento web nepoužíva sledovacie ani analytické cookies a nezobrazuje lištu so súhlasom, pretože nie je čo odsúhlasovať. Jediné vlastné cookies sú technické — na prihlásenie do Môjho účtu.</p>
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

    <h2>Cookies pri prihlásení do Môjho účtu</h2>
    <p>Iba ak sa prihlásite do <a href="ucet.html">Môjho účtu</a>, web uloží tieto technické cookies. Bez nich by prihlásenie nefungovalo, preto podľa § 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických komunikáciách nevyžadujú súhlas. Nesledujú vás, neposielajú sa nikomu tretiemu a prehliadač ich posiela len na adresu prihlasovania, nie na ostatné stránky webu.</p>
    <dl class="specs">
      <div><dt>gs_ucet</dt><dd>udržiava prihlásenie, platí 8 hodín alebo do odhlásenia</dd></div>
      <div><dt>gs_ucet_oauth</dt><dd>ochrana pri prihlásení cez Google, platí 10 minút</dd></div>
    </dl>

    <h2>Vlastné počítadlo návštevnosti</h2>
    <p>Web si počíta, koľkokrát sa zobrazila ktorá stránka a koľkokrát niekto klikol na predplatné alebo demo. Zapisuje sa len typ udalosti, názov stránky a doména, z ktorej ste prišli — žiadna IP adresa a nič, podľa čoho by sa dal človek identifikovať. Nepoužívajú sa na to cookies; jednotlivé zobrazenia spája náhodné číslo uložené v pamäti karty prehliadača (sessionStorage), ktoré sa po jej zavretí zmaže a nikam sa neposiela.</p>

    <h2>Ako si cookies zmazať</h2>
    <p>V nastaveniach prehliadača v časti Súkromie alebo Ochrana osobných údajov nájdete zoznam uložených údajov pre jednotlivé stránky a možnosť ich vymazať. Blokovanie cookies fungovanie tohto webu neobmedzí, len sa nebudete môcť prihlásiť do Môjho účtu.</p>

    <h2>Súvisiace</h2>
    <p>Podrobnosti o tom, aké údaje spracúvam pri objednávke a v komunikácii, nájdete v <a href="ochrana-sukromia.html">ochrane súkromia</a>.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


vop = head('obchodne-podmienky.html', 'Obchodné podmienky — ZNACKA',
           'Všeobecné obchodné podmienky predplatného programu ZNACKA vrátane ceny, dodania, trvania predplatného, odstúpenia od zmluvy a reklamácií.',
           extra=NOINDEX_FOLLOW) + '''
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
    <p>Predplatné sa kupuje na jeden počítač, na ktorom bude program spustený. Predplatné na viac počítačov sa pripravuje; dovtedy sa počet predplatných pri viacerých staniciach dohodne e-mailom.</p>

    <h2 id="objednavka">3. Objednávka a uzavretie zmluvy</h2>
    <p>Kupujúci si v cenníku zvolí ročné alebo mesačné predplatné a objednávku odošle cez pokladňu Stripe alebo e-mailom. Zmluva je uzavretá potvrdením objednávky zo strany predávajúceho. Pred odoslaním objednávky je kupujúci oboznámený s cenou, rozsahom predplatného, upozornením na nepodpísanú inštalačku a týmito podmienkami.</p>

    <h2 id="cena">4. Cena a platba</h2>
    <p>Ročné predplatné stojí ROK, mesačné MESIAC. Ceny sú konečné, platia za jeden počítač a v rovnakej výške sa účtujú aj pri automatickej obnove. Presun licencie na iný počítač stojí jednorazovo PRESUN_SUMA. Platba prebieha kartou cez poskytovateľa platobnej brány Stripe Payments Europe, Ltd.; predávajúci sa k údajom o karte nedostane. Doklad o zaplatení posiela predávajúci elektronicky na e-mail kupujúceho.</p>

    <h2 id="trvanie">5. Trvanie, automatická obnova a ukončenie</h2>
    <p>Predplatné začína plynúť dňom sprístupnenia plnej verzie a trvá zvolené obdobie, teda dvanásť mesiacov pri ročnom a jeden mesiac pri mesačnom predplatnom.</p>
    <p>Predplatné sa po skončení obdobia automaticky obnovuje a z platobného prostriedku kupujúceho sa strhne cena ďalšieho obdobia v rovnakej výške, akú kupujúci pri objednávke odsúhlasil. Po každej úspešnej platbe sa licencia predĺži bez zásahu kupujúceho.</p>
    <p>Kupujúci môže automatickú obnovu kedykoľvek vypnúť — priamo v programe v Nastaveniach alebo e-mailom predávajúcemu. Predplatné potom dobehne do konca zaplateného obdobia a ďalšia platba sa nestrhne.</p>
    <p>Ak platba neprejde, licencia sa po uplynutí zaplateného obdobia zastaví a program sa uzamkne. Dáta zapísané v programe zostávajú v databáze na počítači kupujúceho a kupujúci si ich vie vyexportovať aj v tomto stave. Program zároveň ponúkne odkaz na obnovenie; po zaplatení sa tá istá licencia predĺži.</p>

    <h2 id="dodanie">6. Dodanie</h2>
    <p>Po pripísaní platby posiela predávajúci na e-mail kupujúceho odkaz na stiahnutie plnej verzie programu a licenčný kľúč. Dodanie prebieha bez zbytočného odkladu. Ak by dodanie meškalo, kupujúci má právo od zmluvy odstúpiť.</p>
    <p>Program na vyskúšanie je dostupný ako demo zadarmo ešte pred zaplatením. Demo sa sprístupňuje cez objednávku s nulovou cenou, v ktorej kupujúci uvedie e-mail; platobné údaje sa pri nej nezadávajú a nevzniká platobná povinnosť.</p>

    <h2 id="ucet">6a. Môj účet na webe</h2>
    <p>Kupujúci si môže licenciu spravovať na webe v <a href="ucet.html">Mojom účte</a> — vidí tam platnosť licencie, aktivované počítače a platby, spravuje predplatné a uvoľní počítač. Účet nie je potrebné zakladať ani používať; program funguje len s licenčným kódom.</p>
    <p>Do účtu sa kupujúci prihlási licenčným kódom a e-mailom, na ktorý je licencia vedená. Na tento e-mail príde jednorazový 6-ciferný kód platný 15 minút. Ak si to kupujúci v účte zapne, môže sa prihlasovať aj cez svoj účet Google. Kupujúci je povinný chrániť svoj e-mail a licenčný kód pred zneužitím.</p>
    <p>Účet môže kupujúci kedykoľvek sám zmazať priamo v Mojom účte. Zmazaním účtu sa nezruší licencia ani predplatné — tie sa ukončujú podľa bodu 5.</p>

    <h2 id="podpis">7. Upozornenie na nepodpísanú inštalačku</h2>
    <p>Inštalačný súbor programu nie je podpísaný certifikátom pre podpisovanie kódu. Windows preto pri jeho spustení zobrazí upozornenie SmartScreen o neznámom vydavateľovi a o možnom riziku. Ide o dôsledok chýbajúceho certifikátu, nie o vlastnosť programu. Kupujúci berie túto skutočnosť na vedomie pred zaplatením; upozornenie je uvedené v <a href="cennik.html#upozornenie">cenníku</a> aj na stránke <a href="stiahnut.html">demo</a>.</p>

    <h2 id="licencia">8. Licenčné podmienky</h2>
    <p>Kupujúci získava nevýhradné právo používať program na jednom počítači počas trvania predplatného. Program zostáva duševným vlastníctvom predávajúceho.</p>
    <p>Kupujúci nesmie program ani licenčný kľúč ďalej predávať, prenajímať, sprístupňovať tretím osobám ani rozmnožovať nad rámec zaplateného počtu počítačov. Nesmie program spätne prekladať, dekompilovať ani inak zisťovať jeho zdrojový kód, s výnimkou prípadov, ktoré výslovne pripúšťa zákon.</p>
    <p>Licencia sa pri aktivácii naviaže na konkrétny počítač a sama sa z neho neuvoľní. Presun na iný počítač si kupujúci spustí priamo z programu. Po zaplatení jednorazového poplatku PRESUN_SUMA sa pôvodný počítač uvoľní a na novom sa kupujúci prihlási tým istým licenčným kódom; licencia ani jej platnosť sa nemenia.</p>

    <h2 id="odstupenie">9. Odstúpenie od zmluvy a vrátenie peňazí</h2>
    <p>Kupujúci, ktorý je spotrebiteľom, má právo odstúpiť od zmluvy do štrnástich dní od jej uzavretia bez uvedenia dôvodu.</p>
    <p>Program sa však dodáva ako digitálny obsah, ktorý sa neposiela na hmotnom nosiči. Ak kupujúci pri objednávke výslovne súhlasí so začatím dodávania pred uplynutím lehoty na odstúpenie a vyhlási, že bol poučený o strate tohto práva, právo na odstúpenie mu podľa § 19 ods. 1 zákona č. 108/2024 Z. z. o ochrane spotrebiteľa zaniká momentom sprístupnenia programu na stiahnutie. Predávajúci mu tento súhlas a vyhlásenie potvrdí e-mailom.</p>
    <p>Práve preto je k dispozícii demo. Odporúčam vyskúšať ho pred zaplatením.</p>
    <p>Ak právo na odstúpenie nezaniklo, kupujúci od zmluvy odstúpi cez funkciu <a href="odstupenie.html"><b>Odstúpiť od zmluvy tu</b></a>, ktorá je dostupná na každej stránke webu bez prihlásenia, alebo e-mailom na adrese uvedenej vyššie. Po odoslaní cez web dostane kupujúci bez zbytočného odkladu potvrdenie s obsahom odstúpenia, dátumom a časom na svoj e-mail. Predávajúci vráti peniaze rovnakým spôsobom, akým platba prišla, najneskôr do štrnástich dní od doručenia odstúpenia.</p>

    <h2 id="reklamacie">10. Reklamácie a vady</h2>
    <p>Ak program nefunguje tak, ako je popísané na tomto webe, kupujúci to oznámi e-mailom. V hlásení pomôže uviesť verziu programu, verziu systému Windows, znenie chybovej hlášky a postup, ktorý k chybe viedol.</p>
    <p>Predávajúci vybaví reklamáciu najneskôr do tridsiatich dní od jej uplatnenia. Vadu odstráni opravou programu, poskytnutím opravenej verzie, primeranou zľavou alebo vrátením ceny, podľa povahy vady.</p>
    <p>Za vadu sa nepovažuje upozornenie systému Windows na nepodpísanú inštalačku podľa bodu 7.</p>
    <p>Záruka sa nevzťahuje na chyby spôsobené zásahom do programu, prevádzkou na nepodporovanom systéme, poškodením databázy zo strany kupujúceho alebo stratou dát, ktoré kupujúci nezálohoval.</p>

    <h2 id="spory">11. Riešenie sporov</h2>
    <p>Spory sa riešia prednostne dohodou. Spotrebiteľ má právo obrátiť sa na predávajúceho so žiadosťou o nápravu, a ak na ňu predávajúci odpovie zamietavo alebo neodpovie do tridsiatich dní, môže podať návrh na začatie alternatívneho riešenia sporu subjektu podľa zákona č. 391/2015 Z. z., najmä Slovenskej obchodnej inšpekcii.</p>

    <h2 id="zaverecne">12. Záverečné ustanovenia</h2>
    <p>Vzťahy neupravené týmito podmienkami sa riadia právnym poriadkom Slovenskej republiky, najmä Občianskym zákonníkom a zákonom č. 108/2024 Z. z. o ochrane spotrebiteľa, ak je kupujúci spotrebiteľom.</p>
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
    <p class="e404">4<span>0</span>4</p>
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


# ============================================================ MÔJ ÚČET
# Správa licencie cez web. Logika je v assets/js/ucet.js a api/ucet/[akcia].js,
# tu je len kostra stránky.
ucet = head('ucet.html', 'Môj účet — ZNACKA',
            'Správa licencie programu ZNACKA — platnosť, počítače a predplatné.',
            extra=NOINDEX + '<link rel="stylesheet" href="assets/css/ucet.css">\n') + '''
<section class="phead mriezka">
  <div class="wrap wrap--mid">
    <p class="tagline">Môj účet</p>
    <h1 id="nadpis">Správa licencie</h1>
    <p class="lead" id="uvod">Prihláste sa licenčným kódom a e-mailom, na ktorý prišiel — pošleme vám jednorazový kód. Uvidíte platnosť licencie, aktivované počítače a platby. Zákazky ani iné dáta z programu tu nie sú &mdash; tie zostávajú na počítači v dielni.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <p class="oznam" id="oznam" hidden></p>

    <!-- prihlásenie -->
    <div class="pulz pulz--velky u-login-obal" id="prihlasenie" hidden>
    <div class="box u-login u-login--velke">
      <h2 class="u-login__nadpis">Prihlásenie</h2>

      <div class="u-soc" id="socialne" hidden>
        <a class="btn btn--gh btn--lg btn--full u-soc__btn" id="google" href="/api/ucet/google" hidden>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.73Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z"/><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z"/></svg>
          Prihlásiť sa cez Google
        </a>
        <p class="u-deli"><span>alebo licenčným kódom</span></p>
      </div>

      <!-- krok 1: licencia + e-mail -->
      <form class="u-krok" id="krok1" novalidate>
        <label class="u-pole">
          <span>Licenčný kód</span>
          <input name="licencia" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MECH-XXXX-XXXX-XXXX" maxlength="19" required data-licencia>
        </label>
        <label class="u-pole">
          <span>E-mail</span>
          <input name="email" type="email" autocomplete="email" placeholder="dielna@priklad.sk" required>
        </label>
        <button class="btn btn--gh btn--lg btn--full" type="submit">Poslať kód na e-mail</button>
      </form>

      <!-- krok 2: 6-ciferný kód -->
      <form class="u-krok" id="krok2" novalidate hidden>
        <p class="u-info">Na <b id="kam"></b> sme poslali 6-ciferný kód.</p>
        <label class="u-pole">
          <span>Kód z e-mailu</span>
          <input class="u-otp" name="kod" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="000000" required>
        </label>
        <button class="btn btn--pri btn--lg btn--full" type="submit">Prihlásiť sa</button>
        <p class="fine u-cas">Kód platí ešte <b id="odpocet">15:00</b>. <button class="u-link" type="button" id="znova">Poslať nový</button> · <button class="u-link" type="button" id="spat">Zmeniť údaje</button></p>
      </form>

      <p class="fine">Cez Google sa prihlásite, len ak ste si ho v účte najprv prepojili.</p>
    </div>
    </div>

    <!-- prehľad po prihlásení -->
    <div id="prehlad" hidden>
      <div class="u-lista">
        <span>Prihlásený ako <b id="kto"></b></span>
        <button class="btn btn--gh btn--sm" id="odhlasit" type="button">Odhlásiť</button>
      </div>

      <div class="u-stat" id="stat"></div>

      <h2 class="u-h2">Licencie</h2>
      <div class="u-grid" id="licencie"></div>

      <h2 class="u-h2">Platby</h2>
      <div class="u-tab-wrap">
        <table class="u-tab" id="platby">
          <thead><tr><th>Dátum</th><th>Druh</th><th>Licencia</th><th>Suma</th><th>Stav</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>

      <h2 class="u-h2">Účet</h2>
      <div class="u-grid u-grid--ucet">
        <article class="u-lic" id="google-box" hidden>
          <h3>Prihlásenie cez Google</h3>
          <p class="u-pc__nic" id="google-stav"></p>
          <div class="u-lic__akcie" id="google-akcie"></div>
        </article>
        <article class="u-lic">
          <h3>Odstúpenie od zmluvy</h3>
          <p class="u-pc__nic">Ak ste spotrebiteľ a máte právo odstúpiť od zmluvy, urobíte to cez formulár — potvrdenie príde e-mailom.</p>
          <div class="u-lic__akcie"><a class="btn btn--gh btn--sm" href="odstupenie.html">Odstúpiť od zmluvy tu</a></div>
        </article>
        <article class="u-lic u-lic--zmazat">
          <h3>Zmazať účet</h3>
          <p class="u-pc__nic">Zmaže prihlásenie na webe a prepojenie s Google. Licencia v programe funguje ďalej a doklady o platbách musíme podľa zákona uchovať. O výmaz ďalších údajov môžete požiadať na <a href="mailto:support@gridservis.app">support@gridservis.app</a>.</p>
          <div class="u-lic__akcie"><button class="btn btn--gh btn--sm u-zmazat" id="zmazat" type="button">Zmazať účet</button></div>
        </article>
      </div>
    </div>
  </div>
</section>
''' + foot('ucet.js')


# ============================================================ ODSTÚPENIE
# Funkcia na odstúpenie od zmluvy podľa § 20a zákona č. 108/2024 Z. z.
# (povinná od 19. 6. 2026): dostupná bez prihlásenia, označená „odstúpiť
# od zmluvy tu“, s osobitným potvrdením a potvrdením e-mailom.
odstupenie = head('odstupenie.html', 'Odstúpenie od zmluvy — ZNACKA',
                  'Formulár na odstúpenie od zmluvy o predplatnom programu ZNACKA. Potvrdenie príde e-mailom.',
                  extra=NOINDEX_FOLLOW + '<link rel="stylesheet" href="assets/css/ucet.css">\n') + '''
<section class="phead mriezka">
  <div class="wrap wrap--nar">
    <h1>Odstúpenie od zmluvy</h1>
    <p class="lead">Tu odstúpite od zmluvy o predplatnom bez prihlásenia a bez písania e-mailu. Po odoslaní vám hneď príde potvrdenie s dátumom a časom.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <p class="oznam" id="oznam" hidden></p>

    <form class="box u-login" id="odst-form" novalidate>
      <h3>Údaje o zmluve</h3>
      <label class="u-pole"><span>Meno a priezvisko</span>
        <input name="meno" autocomplete="name" required maxlength="120"></label>
      <label class="u-pole"><span>E-mail z objednávky</span>
        <input name="email" type="email" autocomplete="email" required maxlength="200"></label>
      <label class="u-pole"><span>Licenčný kód alebo číslo objednávky</span>
        <input name="zmluva" autocomplete="off" spellcheck="false" placeholder="MECH-XXXX-XXXX-XXXX" required maxlength="200"></label>
      <label class="u-pole"><span>Poznámka (nepovinné)</span>
        <textarea name="poznamka" rows="3" maxlength="2000"></textarea></label>
      <label class="u-skryte" aria-hidden="true">Web <input name="web" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn--pri btn--lg btn--full" type="submit">Odstúpiť od zmluvy tu</button>
    </form>

    <div class="box u-login" id="odst-kontrola" hidden>
      <h3>Skontrolujte a potvrďte</h3>
      <dl class="specs" id="odst-suhrn"></dl>
      <p class="fine">Kliknutím na tlačidlo nižšie odstupujete od zmluvy.</p>
      <button class="btn btn--pri btn--lg btn--full" id="odst-potvrdit" type="button">Potvrdiť odstúpenie od zmluvy</button>
      <button class="btn btn--gh btn--full" id="odst-upravit" type="button">Upraviť údaje</button>
    </div>

    <div class="box box--ok u-login" id="odst-hotovo" hidden>
      <h3>Odstúpenie je odoslané</h3>
      <p id="odst-vysledok"></p>
      <p class="fine">Potvrdenie s obsahom odstúpenia a presným časom sme poslali na váš e-mail. Ak vám vzniká nárok na vrátenie platby, vrátime ju do 14 dní rovnakým spôsobom, akým prišla.</p>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>Kedy môžete odstúpiť</h3>
        <p>Spotrebiteľ môže odstúpiť do 14 dní od uzavretia zmluvy. Pri programe, ktorý ste si so svojím výslovným súhlasom stiahli ešte pred uplynutím tejto lehoty, právo na odstúpenie zaniklo — podrobnosti sú v <a href="obchodne-podmienky.html#odstupenie">obchodných podmienkach</a>. Formulár prijmeme v každom prípade a odpovieme vám.</p>
      </div>
      <div class="box">
        <h3>Chcete len zrušiť obnovu?</h3>
        <p>Automatickú obnovu predplatného vypnete kedykoľvek v programe v Nastaveniach alebo v <a href="ucet.html">Mojom účte</a>. Predplatné potom dobehne do konca zaplateného obdobia.</p>
      </div>
    </div>
  </div>
</section>
''' + foot('odstupenie.js')



NAHRADY = [
    ('PRESUN_SUMA', '%d €' % PRESUN),
    ('DALSI_ROK_N', '%.2f' % DALSI_PC['rok']),
    ('DALSI_MESIAC_N', '%.2f' % DALSI_PC['mesiac']),
    ('CENA_ROK_N', '%.2f' % CENY['rok']),
    ('CENA_MESIAC_N', '%.2f' % CENY['mesiac']),
    ('DALSI_ROK', eur(DALSI_PC['rok'])),
    ('DALSI_MESIAC', eur(DALSI_PC['mesiac'])),
    ('MAX_PC_N', str(MAX_PC)),
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
                      ('presun.html', presun),
                      ('ochrana-sukromia.html', sukromie), ('cookies.html', cookies),
                      ('obchodne-podmienky.html', vop),
                      ('ucet.html', ucet), ('odstupenie.html', odstupenie),
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
# nezabudne. Sú v nej len verejné stránky — hotovo, obnova a presun sa
# otvárajú z odkazu s parametrami a majú noindex (pozri NOINDEX).
SITEMAP = [
    ('',                          '1.0'),
    ('cennik.html',               '0.9'),
    ('stiahnut.html',             '0.8'),
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
            'Disallow: /api/\n'
            '\n'
            'Sitemap: %s/sitemap.xml\n' % WEB)
print('napísané robots.txt')
