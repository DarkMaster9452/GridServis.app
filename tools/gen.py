# -*- coding: utf-8 -*-
"""Vygeneruje statické HTML stránky webu Mechanik (bez build kroku v repe)."""
import os, io

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = '/api/stiahnut'

# Údaje o predávajúcom. Doplniť pred spustením webu.
FIRMA = {
    'nazov':  '[doplniť obchodné meno]',
    'adresa': '[doplniť sídlo alebo miesto podnikania]',
    'ico':    '[doplniť IČO]',
    'dic':    '[doplniť DIČ]',
    'dph':    '[doplniť IČ DPH, alebo uviesť, že nie ste platiteľ DPH]',
    'zapis':  '[doplniť zápis v živnostenskom alebo obchodnom registri]',
    'email':  'strananek@gmail.com',
}

PAGES = [
    ('index.html',    'Domov'),
    ('funkcie.html',  'Funkcie'),
    ('cennik.html',   'Cenník'),
    ('stiahnut.html', 'Demo'),
    ('faq.html',      'FAQ'),
    ('kontakt.html',  'Kontakt'),
]

def head(active, title, desc):
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
<meta name="theme-color" content="#101722">
<link rel="icon" href="assets/img/favicon.svg">
<link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
<a class="skip" href="#obsah">Preskočiť na obsah</a>

<header class="hdr" id="hdr">
  <div class="wrap hdr__in">
    <a class="logo" href="index.html">
      <span class="logo__mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5.3 5.3l-8 8a2.8 2.8 0 0 1-4-4l8-8a4 4 0 0 0-1.3-1.3z"/></svg></span>
      <span class="logo__txt">Mechanik<em>správa autoservisu</em></span>
    </a>
    <nav class="hdr__nav" aria-label="Hlavná navigácia">
%s
    </nav>
    <a class="btn btn--pri btn--sm hdr__cta" href="cennik.html" data-buy>Kúpiť licenciu</a>
    <button class="hdr__burger" id="burger" aria-expanded="false" aria-controls="mnav" aria-label="Otvoriť menu"><span></span><span></span><span></span></button>
  </div>
  <nav class="hdr__mobile" id="mnav" hidden aria-label="Mobilná navigácia">
%s
  </nav>
</header>

<main id="obsah">
''' % (title, desc, title, desc, nav, mnav)


FOOT = '''</main>

<footer class="foot">
  <div class="wrap foot__in">
    <div class="foot__brand">
      <a class="logo logo--foot" href="index.html">
        <span class="logo__mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5.3 5.3l-8 8a2.8 2.8 0 0 1-4-4l8-8a4 4 0 0 0-1.3-1.3z"/></svg></span>
        <span class="logo__txt">Mechanik</span>
      </a>
      <p>Program na vedenie zákaziek, skladu a fakturácie v autoservise. Beží na Windows, dáta zostávajú na vašom počítači.</p>
    </div>
    <div class="foot__col">
      <h3>Program</h3>
      <a href="funkcie.html">Funkcie</a>
      <a href="cennik.html">Cenník a licencia</a>
      <a href="stiahnut.html">Demo na vyskúšanie</a>
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
      <a href="obchodne-podmienky.html#odstupenie">Vrátenie peňazí</a>
      <a href="ochrana-sukromia.html">Ochrana súkromia</a>
      <a href="cookies.html">Cookies</a>
    </div>
  </div>
  <div class="wrap foot__bot">
    <span>&copy; <span data-rok>2026</span> FIRMA_NAZOV</span>
    <span>Verzia <span data-tag>1.5.1</span> pre Windows 10 a 11</span>
  </div>
</footer>

<script src="assets/js/main.js"></script>
</body>
</html>
'''.replace('FIRMA_NAZOV', FIRMA['nazov'])


def shot(img, alt, label, cls=''):
    return '''<figure class="shot %s">
  <img src="assets/img/%s" alt="%s" %s width="1600" height="1000">
  <figcaption>%s</figcaption>
</figure>''' % (cls, img, alt,
                 'fetchpriority="high"' if 'hero' in cls else 'loading="lazy"', label)


def dl_btn(text='Stiahnuť demo', cls='btn--gh btn--lg'):
    return '<a class="btn %s" href="%s" data-dl>%s</a>' % (cls, DL, text)


def buy_btn(text='Kúpiť licenciu', cls='btn--pri btn--lg'):
    return '<a class="btn %s" href="cennik.html" data-buy>%s</a>' % (cls, text)


# ============================================================ DOMOV
index = head('index.html', 'Mechanik — program na správu autoservisu',
             'Zákazky, zákazníci, sklad dielov, cenník prác, faktúry a štatistiky pre autoservis. Windows program, jednorazová licencia, bez mesačných poplatkov.') + '''
<section class="hero">
  <div class="wrap hero__in">
    <div class="hero__txt">
      <h1>Celý servis v jednom programe.<br>Od príjmu auta po faktúru.</h1>
      <p class="lead">Mechanik vedie zákazky, zákazníkov, sklad dielov aj cenník prác. Zo zákazky vytlačíte zákazkový list, faktúru aj štítok na kľúče. Program beží na počítači v dielni, dáta máte u seba.</p>
      <div class="row">
        ''' + buy_btn('Kúpiť licenciu &mdash; od 359,99 €') + dl_btn() + '''
      </div>
      <p class="fine">Demo si stiahnete zadarmo. Plnú verziu sprístupní zakúpená licencia &middot; Windows 10 a 11 &middot; verzia <span data-tag>1.5.1</span></p>
    </div>
  </div>
  <div class="wrap hero__shot">
    ''' + shot('prehlad.png', 'Úvodná obrazovka programu Mechanik s prehľadom zákaziek a tržieb', 'Mechanik — Prehľad', 'shot--hero') + '''
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
      ''' + shot('zakazky.png', 'Zoznam zákaziek s filtrami podľa stavu', 'Zákazky') + '''
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
      ''' + shot('statistiky.png', 'Štatistiky tržieb a zákaziek', 'Štatistiky') + '''
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <header class="shead">
      <h2>Zaplatíte raz</h2>
      <p>Licencia je jednorazová a viaže sa na počet počítačov, na ktorých program používate. Žiadne predplatné, žiadne obnovovanie.</p>
    </header>
    <div class="teaser">
      <div class="teaser__price"><b>od 359,99 €</b><span>jednorazovo za jeden počítač</span></div>
      <p>Pri viacerých počítačoch v dielni cena za kus klesá. Presnú sumu spočíta kalkulačka v cenníku.</p>
      <a class="btn btn--gh" href="cennik.html">Spočítať cenu</a>
    </div>
  </div>
</section>

<section class="cta">
  <div class="wrap cta__in">
    <h2>Najprv demo, potom rozhodnutie</h2>
    <p>Demo si stiahnete hneď a vyskúšate na vlastných zákazkách. Licenciu kupujete až vtedy, keď viete, že vám program sadol.</p>
    <div class="row row--c">
      ''' + buy_btn() + dl_btn('Stiahnuť demo', 'btn--gh btn--lg btn--onDark') + '''
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ FUNKCIE
def blok(anchor, tag, h2, p, body_ul, img, alt, label, rev=False):
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
                 tag, h2, p, lis, shot(img, alt, label))


funkcie = head('funkcie.html', 'Funkcie — Mechanik',
               'Prehľad obrazoviek programu Mechanik: zákazky, detail zákazky, zákazníci, sklad dielov, cenník prác, štatistiky a nastavenia dielne.') + '''
<section class="phead">
  <div class="wrap">
    <h1>Čo Mechanik vie</h1>
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
    'zakazky.png', 'Zoznam zákaziek s filtrami podľa stavu', 'Zákazky') + blok('detail', 'Detail zákazky',
    'Všetko o jednej oprave na štyroch záložkách',
    'Zákazka má záložky Údaje, Práce a cena, Fotky a História vozidla. V hlavičke je číslo, auto, stav km a zákazník.',
    ['Vozidlo: značka, model, rok, ŠPZ, stav km, VIN, motor, palivo, prevodovka, farba',
     'Načítanie údajov z VIN, aby ste ich neprepisovali ručne',
     'Objednanie na termín, pridanie do Google kalendára alebo stiahnutie .ics',
     'Štítky ako reklamácia, čaká na diel či poistná udalosť',
     'Tlač: zákazkový list (PDF), faktúra (PDF), štítok na kľúče, šablóny'],
    'zakazka-udaje.png', 'Detail zákazky so záložkou Údaje', 'Zákazka Z2026-0001 — Údaje', rev=True) + blok('prace', 'Práce a cena',
    'Úkony z cenníka, diely zo skladu, cena sa dopočíta',
    'Na záložke Práce a cena zapíšete, čo sa robilo. Úkon pridáte z cenníka aj s normohodinami, cena práce vyjde z hodinovej sadzby dielne.',
    ['Vykonané úkony s hodinami a sadzbou, spolu za prácu',
     'Vymenené diely a materiál s množstvom, jednotkou a cenou za kus',
     'Výdaj dielu priamo zo skladu, takže stav sedí',
     'Textový popis vykonanej práce, ktorý ide na zákazkový list'],
    'zakazka-prace.png', 'Záložka Práce a cena s úkonmi a dielmi', 'Zákazka Z2026-0001 — Práce a cena') + blok('zakaznici', 'Zákazníci',
    'Kartotéka s autami a útratou',
    'Každý zákazník má kartu s telefónom, autami, počtom zákaziek, celkovou útratou a dátumom poslednej návštevy.',
    ['Označenie pravidelných zákazníkov',
     'Upozornenie na otvorené a neuhradené zákazky',
     'Filtre: všetci, pravidelní, otvorené, neuhradené',
     'Vyhľadávanie podľa mena, telefónu, ŠPZ alebo auta'],
    'zakaznici.png', 'Karty zákazníkov s prehľadom zákaziek', 'Zákazníci', rev=True) + blok('sklad', 'Sklad',
    'Diely s cenami, maržou a miestom v regáli',
    'Sklad ukáže, čo máte na regáli, za koľko ste to kúpili a za koľko predávate. Program rovno počíta hodnotu skladu aj maržu.',
    ['Katalógové číslo, množstvo, jednotka a umiestnenie (napríklad Regál C1)',
     'Nákupná cena, predajná cena a marža na kus',
     'Hodnota skladu v nákupných cenách aj predajná hodnota',
     'Upozornenie na položky pod minimom cez filter Dochádzajúce'],
    'sklad.png', 'Skladová evidencia dielov', 'Sklad') + blok('cennik-prac', 'Cenník prác',
    'Normohodiny raz zadáte a už len vyberáte',
    'Cenník obsahuje úkony rozdelené do kategórií ako brzdy, motor, podvozok, klimatizácia, pneumatiky či diagnostika. Pri každom je počet hodín.',
    ['Cena úkonu sa počíta ako hodiny krát sadzba dielne',
     'Zmena hodinovej sadzby prepočíta celý cenník',
     'Vlastné úkony si doplníte kedykoľvek',
     'Úkon sa do zákazky pridá aj s hodinami'],
    'cennik-prac.png', 'Cenník prác s kategóriami a normohodinami', 'Cenník prác', rev=True) + blok('statistiky', 'Štatistiky',
    'Výkon dielne bez ručného počítania',
    'Štatistiky za zvolený rok ukážu, koľko zákaziek prešlo dielňou, aké boli tržby a kde sa peniaze tvoria.',
    ['Tržby z práce oproti tržbám z dielov v eurách aj percentách',
     'Počet zákaziek a tržby po mesiacoch',
     'Rozdelenie zákaziek podľa stavu a suma neuhradených',
     'Najčastejšie značky vozidiel, najhodnotnejší zákazníci, najpoužívanejšie diely'],
    'statistiky.png', 'Štatistiky tržieb a zákaziek', 'Štatistiky') + blok('nastavenia', 'Nastavenia',
    'Údaje dielne, sadzba a fakturačné náležitosti',
    'Čo zadáte v nastaveniach, to sa tlačí do hlavičky zákazkových listov a faktúr. Nastavenie je jednorazové.',
    ['Názov dielne, adresa, telefón, e-mail a web',
     'Hodinová sadzba, mena a predpona čísla zákazky',
     'IBAN, splatnosť faktúr, predpona čísla faktúry',
     'IČ DPH a sadzba DPH pre platiteľov'],
    'nastavenia.png', 'Nastavenia dielne, cien a faktúr', 'Nastavenia', rev=True) + '''
<section class="cta">
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
cennik = head('cennik.html', 'Cenník a licencia — Mechanik',
              'Jednorazová licencia na program Mechanik. Cena závisí od počtu počítačov, na ktorých program používate. Kalkulačka a postup objednávky.') + '''
<section class="phead">
  <div class="wrap">
    <h1>Zaplatíte raz, používate natrvalo</h1>
    <p class="lead">Licencia sa kupuje na počítač. Koľko počítačov v dielni Mechanika používa, toľko licencií potrebujete. Nič sa neobnovuje a nič sa neplatí mesačne. Plnú verziu programu sprístupní zakúpená licencia, demo je zadarmo.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="calc">
      <div class="calc__in">
        <h2>Kalkulačka ceny</h2>
        <p class="calc__q">Na koľkých počítačoch budete Mechanika používať?</p>
        <output class="calc__val" id="hodnota" for="pocet">1 počítač</output>
        <input class="slider" id="pocet" type="range" min="1" max="11" step="1" value="1"
               aria-label="Počet počítačov, posledná poloha je cena na mieru">
        <div class="scale"><span>1</span><span>5</span><span>10</span><span>na mieru</span></div>
      </div>
      <div class="calc__out">
        <span class="calc__lbl" id="sumaLbl">Jednorazovo spolu</span>
        <b class="calc__sum" id="suma">359,99 €</b>
        <span class="calc__per" id="perks">359,99 € za počítač</span>
        <span class="calc__save" id="uspora" hidden></span>
        <a class="btn btn--pri btn--full" id="kupit" href="cennik.html" data-buy>Kúpiť licenciu</a>
        <a class="calc__alt" id="objednat" href="kontakt.html">alebo objednať e-mailom</a>
        <span class="calc__note" id="poznamka">Cena je konečná a platí sa raz. Po zaplatení dostanete odkaz na stiahnutie plnej verzie, licenčný kľúč a faktúru.</span>
      </div>
    </div>

    <div class="tiers">
      <h3>Ako sa cena počíta</h3>
      <table class="tbl">
        <thead><tr><th>Počet počítačov</th><th>Cena za počítač</th><th>Príklad</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>359,99 €</td><td>1 &times; 359,99 = <b>359,99 €</b></td></tr>
          <tr><td>2 až 4</td><td>319,99 €</td><td>3 &times; 319,99 = <b>959,97 €</b></td></tr>
          <tr><td>5 až 9</td><td>279,99 €</td><td>6 &times; 279,99 = <b>1 679,94 €</b></td></tr>
          <tr><td>10 a viac</td><td>239,99 €</td><td>12 &times; 239,99 = <b>2 879,88 €</b></td></tr>
        </tbody>
      </table>
      <p class="fine">Nižšia sadzba platí na všetky počítače v objednávke, nielen na tie nad hranicou.</p>
    </div>

    <div class="two">
      <div class="box box--ok">
        <h3>V cene je</h3>
        <ul class="ticks">
          <li>Stiahnutie plnej verzie programu</li>
          <li>Používanie bez časového obmedzenia</li>
          <li>Všetky moduly, žiadne platené doplnky</li>
          <li>Opravy chýb a aktualizácie v rámci zakúpenej verzie</li>
          <li>Prenos licencie na nový počítač po dohode</li>
          <li>E-mailová podpora pri inštalácii a nastavení</li>
        </ul>
      </div>
      <div class="box">
        <h3>V cene nie je</h3>
        <ul class="crosses">
          <li>Prechod na budúcu veľkú verziu programu</li>
          <li>Úpravy programu na mieru</li>
          <li>Prevádzka na serveri alebo zdieľaná databáza medzi počítačmi</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="sec sec--alt">
  <div class="wrap wrap--mid">
    <header class="shead">
      <h2>Ako to prebieha</h2>
      <p>Najprv demo, potom platba. Plná verzia sa sťahuje až po zakúpení licencie.</p>
    </header>
    <ol class="steps">
      <li><span>1</span><div><h3>Vyskúšate demo</h3><p>Demo si stiahnete zadarmo a bez registrácie. Zadáte pár zákaziek a pozriete, či vám sedí ovládanie a tlač dokladov.</p></div></li>
      <li><span>2</span><div><h3>Zvolíte počet počítačov</h3><p>V kalkulačke vyššie nastavíte, na koľkých staniciach budete program používať. Cena sa prepočíta hneď.</p></div></li>
      <li><span>3</span><div><h3>Zaplatíte</h3><p>Cez platobnú bránu kartou, alebo prevodom na faktúru, ak vám to vyhovuje viac. Platí sa raz.</p></div></li>
      <li><span>4</span><div><h3>Dostanete plnú verziu</h3><p>E-mailom príde odkaz na stiahnutie plnej verzie, licenčný kľúč pre každý počítač a faktúra.</p></div></li>
      <li><span>5</span><div><h3>Nainštalujete a aktivujete</h3><p>Kľúč vložíte v Nastaveniach do poľa Licencia a program sa odomkne.</p></div></li>
    </ol>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <header class="shead">
      <h2>Otázky k licencii</h2>
    </header>
    <div class="faq">
      <details><summary>Naozaj sa neplatí nič mesačne?</summary><p>Nie. Licencia je jednorazová platba. Po zaplatení program používate bez ďalších nákladov.</p></details>
      <details><summary>Vymenil som počítač, čo s licenciou?</summary><p>Napíšte mi a kľúč prepíšem na nový počítač. Za prenos sa neplatí, počet licencií zostáva rovnaký.</p></details>
      <details><summary>Potrebujem licenciu aj na počítač doma?</summary><p>Ak tam program spúšťate, áno. Licencia sa počíta na počítač, nie na človeka.</p></details>
      <details><summary>Dostanem faktúru na firmu?</summary><p>Áno. V objednávke uveďte názov, adresu, IČO a prípadne IČ DPH a faktúra príde na tieto údaje.</p></details>
      <details><summary>Čo ak sa program neosvedčí?</summary><p>Preto je tu demo. Vyskúšate ho pred kúpou, a ak vám nesadne, licenciu jednoducho nekúpite.</p></details>
      <details><summary>Potrebujem viac ako desať licencií.</summary><p>Posuňte kalkulačku úplne doprava na možnosť na mieru a napíšte mi. Pri väčšom počte staníc dohodneme cenu individuálne.</p></details>
      <details><summary>Ako je to s aktualizáciami?</summary><p>Opravy a vylepšenia v rámci zakúpenej verzie sú zdarma. Novú inštalačku stiahnete z rovnakého miesta a dáta zostanú zachované.</p></details>
    </div>
  </div>
</section>

<section class="cta">
  <div class="wrap cta__in">
    <h2>Najprv skúsiť, potom platiť</h2>
    <p>Stiahnite si demo a pozrite, či vám sadne. Kúpu vyriešime, keď budete vedieť.</p>
    <div class="row row--c">
      ''' + buy_btn() + dl_btn('Stiahnuť demo', 'btn--gh btn--lg btn--onDark') + '''
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ STIAHNUŤ
stiahnut = head('stiahnut.html', 'Demo Mechanik pre Windows',
                'Demo programu Mechanik na vyskúšanie zadarmo, systémové požiadavky a postup inštalácie. Plná verzia sa sťahuje po zakúpení licencie.') + '''
<section class="phead">
  <div class="wrap">
    <h1>Demo na vyskúšanie</h1>
    <p class="lead">Jeden inštalačný súbor, bez účtu a bez zadávania karty. Plnú verziu programu sprístupní zakúpená licencia.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="dl">
      <div class="dl__l">
        <span class="dl__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg></span>
        <div>
          <b>MechanikSetup.exe &mdash; demo</b>
          <span>Verzia <span data-tag>1.5.1</span> &middot; <span data-size>~41 MB</span> &middot; Windows 10 a 11, 64-bit<span data-date></span></span>
        </div>
      </div>
      ''' + dl_btn('Stiahnuť demo', 'btn--pri btn--lg') + '''
    </div>
    <p class="fine center">Sťahujete vždy poslednú vydanú verziu. Demo je zadarmo, plnú verziu dostanete po zakúpení licencie &mdash; <a href="cennik.html">pozrieť cenník</a>.</p>

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
          <li>Stiahnite MechanikSetup.exe a spustite ho.</li>
          <li>Ak Windows zobrazí modré okno SmartScreen, kliknite na <b>Ďalšie informácie</b> a potom na <b>Spustiť tak či tak</b>.</li>
          <li>Potvrďte inštaláciu a počkajte, kým sa program nainštaluje.</li>
          <li>Spustite Mechanik a v Nastaveniach vyplňte údaje dielne a hodinovú sadzbu.</li>
          <li>Založte prvú zákazku tlačidlom Nová zákazka.</li>
        </ol>
      </div>
    </div>

    <div class="warn">
      <h3>Prečo Windows hlási neznámeho vydavateľa</h3>
      <p>Inštalačka zatiaľ nemá zakúpený podpisový certifikát, preto ju SmartScreen označí ako neznámu. Súbor sťahujete priamo z tejto stránky, takže viete, odkiaľ pochádza. Po kliknutí na Ďalšie informácie a Spustiť tak či tak inštalácia normálne pokračuje.</p>
    </div>

    <div class="two two--top">
      <div class="box">
        <h3>Prechod z dema na plnú verziu</h3>
        <p>Po zakúpení licencie dostanete e-mailom odkaz na plnú verziu a licenčný kľúč. Inštalačku spustíte cez demo, zákazky zapísané v deme zostanú zachované a kľúč potom vložíte v Nastaveniach.</p>
      </div>
      <div class="box">
        <h3>Zálohovanie dát</h3>
        <p>Dáta sú v databáze na vašom počítači, nie v cloude. Odporúčam kopírovať ju raz za čas na USB kľúč alebo do cloudového disku, rovnako ako zálohujete účtovníctvo.</p>
      </div>
    </div>
  </div>
</section>

<section class="cta">
  <div class="wrap cta__in">
    <h2>Demo vám sadlo?</h2>
    <p>Licenciu kúpite v cenníku. Ak sa niečo zaseklo pri inštalácii, napíšte mi, čo hlási počítač.</p>
    <div class="row row--c">
      ''' + buy_btn() + '''
      <a class="btn btn--gh btn--lg btn--onDark" href="kontakt.html">Napísať</a>
    </div>
  </div>
</section>
''' + FOOT


# ============================================================ FAQ
faq = head('faq.html', 'Časté otázky — Mechanik',
           'Odpovede na otázky o programe Mechanik: dáta, licencia, viac počítačov, faktúry, DPH, zálohovanie a podpora.') + '''
<section class="phead">
  <div class="wrap">
    <h1>Časté otázky</h1>
    <p class="lead">Ak tu odpoveď nenájdete, napíšte mi a doplním ju.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar">
    <h2 class="gh">Program a dáta</h2>
    <div class="faq">
      <details><summary>Kde sú uložené moje zákazky?</summary><p>V databáze na počítači, kde je Mechanik nainštalovaný. Nič sa neposiela na cudzí server, takže údaje o zákazníkoch zostávajú v dielni.</p></details>
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

    <h2 class="gh">Licencia a platba</h2>
    <div class="faq">
      <details><summary>Koľko to stojí?</summary><p>Jednorazovo od 359,99 € za jeden počítač. Pri viacerých počítačoch cena za kus klesá, presnú sumu spočíta <a href="cennik.html">kalkulačka v cenníku</a>.</p></details>
      <details><summary>Kde stiahnem plnú verziu?</summary><p>Odkaz na stiahnutie dostanete e-mailom po zaplatení licencie, spolu s licenčným kľúčom a faktúrou. Zo stránky sa sťahuje len demo.</p></details>
      <details><summary>Je to predplatné?</summary><p>Nie. Platíte raz a program používate ďalej bez mesačných poplatkov.</p></details>
      <details><summary>Musím platiť hneď?</summary><p>Nie. Najprv si stiahnete demo a vyskúšate ho. Licenciu kupujete až potom.</p></details>
      <details><summary>Ako prebieha platba?</summary><p>Cez platobnú bránu kartou, prípadne prevodom na faktúru. Po zaplatení príde e-mailom odkaz na plnú verziu a licenčný kľúč.</p></details>
      <details><summary>Čím sa demo líši od plnej verzie?</summary><p>Demo slúži na vyskúšanie ovládania a tlače dokladov. Plnú verziu bez obmedzení sprístupní zakúpená licencia.</p></details>
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
kontakt = head('kontakt.html', 'Kontakt — Mechanik',
               'Kontakt na objednávku licencie, podporu pri inštalácii a hlásenie chýb v programe Mechanik.') + '''
<section class="phead">
  <div class="wrap">
    <h1>Napíšte mi</h1>
    <p class="lead">Objednávka licencie, pomoc s inštaláciou alebo hlásenie chyby. Ozvem sa hneď, ako to bude možné.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--mid">
    <div class="two two--top">
      <div class="box box--big">
        <h3>Objednávka licencie</h3>
        <p>Najrýchlejšie to ide cez kalkulačku v cenníku. Ak chcete platiť prevodom na faktúru alebo potrebujete viac ako desať licencií, napíšte mi počet počítačov a fakturačné údaje dielne: názov, adresu, IČO a prípadne IČ DPH.</p>
        <p class="mailrow"><a class="btn btn--pri" data-mail="objednavka">Napísať e-mail</a>
        <a class="btn btn--gh" href="cennik.html">Prejsť do cenníka</a></p>
        <p class="fine">E-mail: <a data-mail-txt href="#">&nbsp;</a></p>
      </div>
      <div class="box box--big">
        <h3>Podpora a chyby</h3>
        <p>Ak sa program správa inak, než má, napíšte čo ste robili, čo sa stalo a akú verziu používate. Verzia je v ľavom dolnom rohu programu.</p>
        <p class="mailrow"><a class="btn btn--gh" data-mail="podpora">Napísať e-mail</a></p>
      </div>
    </div>

    <div class="box box--big">
      <h3>Predávajúci</h3>
      <dl class="specs">
        <div><dt>Obchodné meno</dt><dd>FIRMA_NAZOV</dd></div>
        <div><dt>Sídlo</dt><dd>FIRMA_ADRESA</dd></div>
        <div><dt>IČO</dt><dd>FIRMA_ICO</dd></div>
        <div><dt>DIČ</dt><dd>FIRMA_DIC</dd></div>
        <div><dt>IČ DPH</dt><dd>FIRMA_DPH</dd></div>
        <div><dt>Zápis</dt><dd>FIRMA_ZAPIS</dd></div>
        <div><dt>E-mail</dt><dd><a data-mail-txt href="#">&nbsp;</a></dd></div>
      </dl>
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


# ============================================================ PRÁVNE STRÁNKY
# Texty sú pripravený návrh podľa slovenskej a európskej úpravy.
# Pred spustením webu ich dajte skontrolovať právnikovi a doplňte
# údaje v premennej FIRMA na začiatku súboru.

PREVADZKOVATEL = '''
      <dl class="specs">
        <div><dt>Obchodné meno</dt><dd>FIRMA_NAZOV</dd></div>
        <div><dt>Sídlo</dt><dd>FIRMA_ADRESA</dd></div>
        <div><dt>IČO</dt><dd>FIRMA_ICO</dd></div>
        <div><dt>DIČ</dt><dd>FIRMA_DIC</dd></div>
        <div><dt>IČ DPH</dt><dd>FIRMA_DPH</dd></div>
        <div><dt>Zápis</dt><dd>FIRMA_ZAPIS</dd></div>
        <div><dt>E-mail</dt><dd><a data-mail-txt href="#">&nbsp;</a></dd></div>
      </dl>'''


sukromie = head('ochrana-sukromia.html', 'Ochrana súkromia — Mechanik',
                'Aké osobné údaje spracúvame pri predaji programu Mechanik, na aký účel, ako dlho a aké práva máte.') + '''
<section class="phead">
  <div class="wrap wrap--nar">
    <h1>Ochrana súkromia</h1>
    <p class="lead">Tento web nepoužíva analytiku, reklamné nástroje ani profilovanie. Nižšie je popísané, čo sa deje s údajmi, ktoré mi pošlete pri objednávke alebo v e-maili.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2>Kto údaje spracúva</h2>
    ''' + PREVADZKOVATEL + '''

    <h2>Údaje v programe zostávajú u vás</h2>
    <p>Mechanik je program, ktorý beží na vašom počítači a ukladá dáta do databázy na tom istom počítači. Zákazky, zákazníci, vozidlá ani sklad sa nikam neodosielajú. K týmto údajom nemám prístup a nespracúvam ich. Za ich ochranu vo svojej dielni zodpovedáte vy ako prevádzkovateľ voči svojim zákazníkom.</p>

    <h2>Aké údaje spracúvam</h2>
    <ul>
      <li><b>Pri objednávke licencie:</b> obchodné meno, adresa, IČO, DIČ prípadne IČ DPH, e-mail a údaje o platbe.</li>
      <li><b>Pri e-mailovej komunikácii:</b> e-mailová adresa, meno a obsah správy, ktorý mi pošlete.</li>
      <li><b>Pri prevádzke webu:</b> technické záznamy hostingu, napríklad IP adresa a čas požiadavky, ktoré vznikajú automaticky a slúžia na prevádzku a bezpečnosť.</li>
    </ul>
    <p>Nezbieram nič, čo na vybavenie objednávky alebo odpoveď nepotrebujem. Web neobsahuje formuláre, ktoré by údaje odosielali na server — kontakt prebieha e-mailom.</p>

    <h2>Na akom právnom základe a prečo</h2>
    <ul>
      <li><b>Plnenie zmluvy</b> podľa čl. 6 ods. 1 písm. b) GDPR — dodanie licencie, kľúča a podpory.</li>
      <li><b>Zákonná povinnosť</b> podľa čl. 6 ods. 1 písm. c) GDPR — vystavenie a uchovanie účtovných dokladov.</li>
      <li><b>Oprávnený záujem</b> podľa čl. 6 ods. 1 písm. f) GDPR — odpoveď na e-mail, ktorý mi napíšete, a bezpečnosť webu.</li>
    </ul>

    <h2>Ako dlho ich uchovávam</h2>
    <ul>
      <li>Účtovné doklady po dobu, ktorú predpisuje zákon o účtovníctve, teda desať rokov.</li>
      <li>Údaje o licencii po dobu jej platnosti, aby sa dal kľúč obnoviť alebo preniesť.</li>
      <li>E-mailovú komunikáciu najviac dva roky od poslednej správy.</li>
    </ul>

    <h2>Komu sa údaje dostanú</h2>
    <p>Len tomu, kto sa podieľa na vybavení objednávky: poskytovateľovi hostingu webu, poskytovateľovi platobnej brány, poskytovateľovi e-mailovej schránky a účtovníkovi. Údaje nepredávam a neposkytujem na marketing. Mimo Európskeho hospodárskeho priestoru ich neprenášam nad rámec toho, čo vyplýva z použitia uvedených služieb, ktoré majú na takýto prenos vlastné záruky.</p>

    <h2>Vaše práva</h2>
    <p>Máte právo na prístup k svojim údajom, na ich opravu, výmaz, obmedzenie spracúvania, na prenosnosť a právo namietať proti spracúvaniu založenému na oprávnenom záujme. Stačí napísať na e-mail uvedený vyššie. Ak si myslíte, že s údajmi nakladám nesprávne, môžete podať sťažnosť Úradu na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava.</p>

    <h2>Automatizované rozhodovanie</h2>
    <p>Žiadne nerobím. Údaje sa nepoužívajú na profilovanie ani na automatizované rozhodnutia s právnym účinkom.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


cookies = head('cookies.html', 'Cookies — Mechanik',
               'Tento web nepoužíva sledovacie ani analytické cookies. Vysvetlenie, čo sa v prehliadači ukladá a prečo nie je zobrazovaná lišta so súhlasom.') + '''
<section class="phead">
  <div class="wrap wrap--nar">
    <h1>Cookies</h1>
    <p class="lead">Krátka odpoveď: tento web nepoužíva sledovacie ani analytické cookies a nezobrazuje lištu so súhlasom, pretože nie je čo odsúhlasovať.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2>Čo web nepoužíva</h2>
    <ul>
      <li>Žiadnu analytiku návštevnosti.</li>
      <li>Žiadne reklamné ani remarketingové skripty.</li>
      <li>Žiadne tlačidlá ani vložený obsah zo sociálnych sietí.</li>
      <li>Žiadne externé písma ani knižnice načítavané z cudzích serverov.</li>
    </ul>
    <p>Stránky si okrem obsahu z tejto domény nesťahujú nič ďalšie, takže o vás nikto tretí nedostane informáciu, že ste tu boli.</p>

    <h2>Čo sa môže uložiť</h2>
    <p>Poskytovateľ hostingu môže nastaviť technické cookies nutné na prevádzku a bezpečnosť, napríklad na rozloženie záťaže alebo ochranu pred zneužitím. Takéto cookies neslúžia na sledovanie a podľa zákona o elektronických komunikáciách nevyžadujú súhlas.</p>

    <h2>Ako si cookies zmazať</h2>
    <p>V nastaveniach prehliadača v časti Súkromie alebo Ochrana osobných údajov nájdete zoznam uložených údajov pre jednotlivé stránky a možnosť ich vymazať. Blokovanie cookies fungovanie tohto webu neobmedzí.</p>

    <h2>Súvisiace</h2>
    <p>Podrobnosti o tom, aké údaje spracúvam pri objednávke a v komunikácii, nájdete v <a href="ochrana-sukromia.html">ochrane súkromia</a>.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


vop = head('obchodne-podmienky.html', 'Obchodné podmienky — Mechanik',
           'Všeobecné obchodné podmienky predaja licencie na program Mechanik vrátane dodania, licenčných podmienok, odstúpenia od zmluvy a reklamácií.') + '''
<section class="phead">
  <div class="wrap wrap--nar">
    <h1>Obchodné podmienky</h1>
    <p class="lead">Podmienky predaja licencie na program Mechanik. Vzťahujú sa na každú objednávku uskutočnenú cez tento web alebo e-mailom.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--nar doc">
    <h2 id="predavajuci">1. Predávajúci</h2>
    ''' + PREVADZKOVATEL + '''
    <p>Orgán dozoru: Slovenská obchodná inšpekcia, Inšpektorát SOI pre príslušný kraj, oddelenie ochrany spotrebiteľa.</p>

    <h2 id="predmet">2. Čo sa predáva</h2>
    <p>Predmetom je licencia na používanie počítačového programu Mechanik, ktorý slúži na vedenie zákaziek, zákazníkov, skladu a fakturácie v autoservise. Program sa dodáva elektronicky a inštaluje sa na počítač kupujúceho.</p>
    <p>Licencia sa kupuje na počet počítačov, na ktorých bude program spustený. Cena je jednorazová a neúčtujú sa žiadne opakované poplatky.</p>

    <h2 id="objednavka">3. Objednávka a uzavretie zmluvy</h2>
    <p>Kupujúci si v cenníku zvolí počet počítačov a objednávku odošle cez platobnú bránu alebo e-mailom. Zmluva je uzavretá potvrdením objednávky zo strany predávajúceho. Pred odoslaním objednávky je kupujúci oboznámený s cenou, rozsahom licencie a týmito podmienkami.</p>

    <h2 id="cena">4. Cena a platba</h2>
    <p>Ceny uvedené v cenníku sú konečné za jeden počítač pri danom počte licencií. Informácia o DPH vyplýva z údajov predávajúceho uvedených vyššie. Platí sa cez platobnú bránu alebo prevodom na základe faktúry. Faktúra sa vystavuje elektronicky a posiela e-mailom.</p>

    <h2 id="dodanie">5. Dodanie</h2>
    <p>Po pripísaní platby posiela predávajúci na e-mail kupujúceho odkaz na stiahnutie plnej verzie programu a licenčný kľúč pre každý zakúpený počítač. Dodanie prebieha bez zbytočného odkladu. Ak by dodanie meškalo, kupujúci má právo od zmluvy odstúpiť.</p>
    <p>Program na vyskúšanie je dostupný ako demo zadarmo ešte pred kúpou.</p>

    <h2 id="licencia">6. Licenčné podmienky</h2>
    <p>Kupujúci získava nevýhradné právo používať program na dohodnutom počte počítačov, časovo neobmedzene. Program zostáva duševným vlastníctvom predávajúceho.</p>
    <p>Kupujúci nesmie program ani licenčný kľúč ďalej predávať, prenajímať, sprístupňovať tretím osobám ani rozmnožovať nad rámec zakúpeného počtu počítačov. Nesmie program spätne prekladať, dekompilovať ani inak zisťovať jeho zdrojový kód, s výnimkou prípadov, ktoré výslovne pripúšťa zákon.</p>
    <p>Prenos licencie na iný počítač kupujúceho je možný po dohode s predávajúcim.</p>

    <h2 id="odstupenie">7. Odstúpenie od zmluvy a vrátenie peňazí</h2>
    <p>Kupujúci, ktorý je spotrebiteľom, má právo odstúpiť od zmluvy do štrnástich dní od jej uzavretia bez uvedenia dôvodu.</p>
    <p>Program sa však dodáva ako digitálny obsah, ktorý sa neposiela na hmotnom nosiči. Ak kupujúci pri objednávke výslovne súhlasí so začatím dodávania pred uplynutím lehoty na odstúpenie a vyhlási, že bol poučený o strate tohto práva, právo na odstúpenie mu podľa § 7 ods. 6 písm. l) zákona č. 102/2014 Z. z. zaniká momentom sprístupnenia programu na stiahnutie.</p>
    <p>Práve preto je k dispozícii demo. Odporúčam vyskúšať ho pred kúpou.</p>
    <p>Ak právo na odstúpenie nezaniklo, kupujúci ho uplatní e-mailom na adrese uvedenej vyššie. Predávajúci vráti peniaze rovnakým spôsobom, akým platba prišla, najneskôr do štrnástich dní od doručenia odstúpenia.</p>

    <h2 id="reklamacie">8. Reklamácie a vady</h2>
    <p>Ak program nefunguje tak, ako je popísané na tomto webe, kupujúci to oznámi e-mailom. V hlásení pomôže uviesť verziu programu, verziu systému Windows, znenie chybovej hlášky a postup, ktorý k chybe viedol.</p>
    <p>Predávajúci vybaví reklamáciu najneskôr do tridsiatich dní od jej uplatnenia. Vadu odstráni opravou programu, poskytnutím opravenej verzie, primeranou zľavou alebo vrátením ceny, podľa povahy vady.</p>
    <p>Záruka sa nevzťahuje na chyby spôsobené zásahom do programu, prevádzkou na nepodporovanom systéme, poškodením databázy zo strany kupujúceho alebo stratou dát, ktoré kupujúci nezálohoval.</p>

    <h2 id="spory">9. Riešenie sporov</h2>
    <p>Spory sa riešia prednostne dohodou. Spotrebiteľ má právo obrátiť sa na predávajúceho so žiadosťou o nápravu, a ak na ňu predávajúci odpovie zamietavo alebo neodpovie do tridsiatich dní, môže podať návrh na začatie alternatívneho riešenia sporu subjektu podľa zákona č. 391/2015 Z. z., najmä Slovenskej obchodnej inšpekcii. Návrh sa dá podať aj cez platformu Európskej komisie na riešenie sporov online.</p>

    <h2 id="zaverecne">10. Záverečné ustanovenia</h2>
    <p>Vzťahy neupravené týmito podmienkami sa riadia právnym poriadkom Slovenskej republiky, najmä Občianskym zákonníkom, zákonom č. 102/2014 Z. z. a zákonom č. 250/2007 Z. z., ak je kupujúci spotrebiteľom.</p>
    <p>Predávajúci môže podmienky meniť. Na už uzavreté zmluvy sa vzťahuje znenie platné v čase objednávky.</p>

    <p class="doc__date">Účinné od <span data-rok>2026</span>.</p>
  </div>
</section>
''' + FOOT


for name, content in [('index.html', index), ('funkcie.html', funkcie),
                      ('cennik.html', cennik), ('stiahnut.html', stiahnut),
                      ('faq.html', faq), ('kontakt.html', kontakt),
                      ('ochrana-sukromia.html', sukromie), ('cookies.html', cookies),
                      ('obchodne-podmienky.html', vop)]:
    content = content.replace('</a><a class="btn', '</a>\n        <a class="btn')
    for kluc, hodnota in FIRMA.items():
        content = content.replace('FIRMA_' + kluc.upper(), hodnota)
    with io.open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(content)
    print('napísané', name)
