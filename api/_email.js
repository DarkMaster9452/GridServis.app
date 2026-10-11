/* E-maily zákazníkom cez Resend: licencia, presun, demo a spätná väzba.

   Keď nie je nastavený RESEND_API_KEY alebo RESEND_FROM, e-mail sa nepošle
   a nič sa nepokazí — kód zostáva na stránke po platbe a v admin aplikácii.
   Odosielanie preto nikdy nesmie zhodiť vydanie licencie. */

var V = require('./_email-vzhlad');

var KLUC = process.env.RESEND_API_KEY || '';
var ODOSIELATEL = process.env.RESEND_FROM || '';
var ODPOVED = process.env.RESEND_REPLY_TO || 'support@gridservis.app';

/* vysoká priorita — v Outlooku, Apple Mail a Thunderbirde červený výkričník;
   Gmail ju ignoruje. Len pre e-maily, na ktorých zákazníkovi naozaj záleží. */
var DOLEZITE = { 'X-Priority': '1', Importance: 'high' };

function suma(centy, mena) {
  var n = (Number(centy) || 0) / 100;
  return n.toFixed(2).replace('.', ',') + ' ' + (String(mena || 'eur').toLowerCase() === 'eur' ? '€' : String(mena).toUpperCase());
}

function datum(iso) {
  var d = String(iso || '').slice(0, 10).split('-');
  return d.length === 3 ? Number(d[2]) + '. ' + Number(d[1]) + '. ' + d[0] : String(iso || '');
}

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

async function posliSpravu(sprava, moznosti) {
  if (!sprava.to[0] || !KLUC || !ODOSIELATEL) return false;
  if (moznosti && moznosti.dolezite) sprava.headers = Object.assign({}, sprava.headers, DOLEZITE);
  try {
    var r = await V.odosli(Object.assign({ from: ODOSIELATEL, reply_to: ODPOVED }, sprava), moznosti);
    if (!r.ok) {
      console.error('email:', r.status, await r.text().catch(function () { return ''; }));
      return false;
    }
    return true;
  } catch (e) {
    console.error('email:', e.message);
    return false;
  }
}

var PRAVNE = 'Potvrdenie: pri objednávke ste výslovne súhlasili so sprístupnením programu pred uplynutím lehoty na odstúpenie a vyhlásili ste, že ste boli poučený, že tým strácate právo na odstúpenie od zmluvy (§ 19 ods. 1 zákona č. 108/2024 Z. z.).';
var SMARTSCREEN = 'Windows ukáže upozornenie SmartScreen, lebo súbor nemá podpisový certifikát — kliknite na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>, nie je to vírus.';

/* ---------- licencia po kúpe predplatného ---------- */

function licenciaHtml(meno, kod, plan, platnaDo, web) {
  var obdobie = plan === 'rok' ? 'ročné' : 'mesačné';
  var obsah =
    V.pozdrav(meno) +
    V.nadpis('Licencia je', 'aktívna') +
    V.odsek('ďakujeme za ' + obdobie + ' predplatné programu GridServis. Licencia je aktívna a program je pripravený na prvú zákazku.') +
    V.kodBlok(kod, 'VÁŠ LICENČNÝ KÓD') +
    V.odsek('Odložte si ho — budete ho potrebovať pri prvom spustení aj pri presune na iný počítač.', true) +
    V.podnadpis('Ako začať') +
    V.kroky([
      ['Stiahnite program', 'Inštalačka sa stiahne hneď po kliknutí na <a href="' + web + '/api/stiahnut-plna" style="color:#2563eb;">tento odkaz</a> — bez platby, licenciu už máte.'],
      ['Spustite inštaláciu', SMARTSCREEN],
      ['Zadajte licenčný kód', 'Pri prvom spustení vložte kód vyššie. Licencia platí na jeden počítač.']
    ]) +
    V.tlacidlo('Stiahnuť program &rarr;', web + '/api/stiahnut-plna') +
    V.odsek('Predplatné platí do <b>' + platnaDo + '</b>, potom sa samo obnoví. Zrušiť ho, obnoviť alebo presunúť licenciu na iný počítač viete v <a href="' + web + '/ucet.html" style="color:#2563eb;">Mojom účte</a>.', true) +
    V.tmavyPruh('Menej chaosu, viac času na autá.', 'Ak niečo nesedí, stačí odpovedať na tento e-mail.') +
    V.kontaktKarta() +
    V.drobne(PRAVNE);
  return V.obalka('Licencia je aktívna', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Váš licenčný kód GridServis a postup, ako program spustiť.' });
}

function licenciaText(meno, kod, plan, platnaDo, web) {
  var obdobie = plan === 'rok' ? 'ročné' : 'mesačné';
  return [
    'Dobrý deň' + (meno ? ', ' + meno : '') + ',',
    '',
    'ďakujeme za ' + obdobie + ' predplatné programu GridServis. Licencia je aktívna.',
    '',
    'Licenčný kód: ' + kod,
    'Predplatné platí do: ' + platnaDo,
    '',
    'Ako začať:',
    '1. Stiahnite program (bez platby, licenciu už máte): ' + web + '/api/stiahnut-plna',
    '2. Spustite inštaláciu. Windows ukáže upozornenie SmartScreen, lebo súbor',
    '   nemá podpisový certifikát — kliknite na Ďalšie informácie a Spustiť tak či tak.',
    '3. Pri prvom spustení zadajte kód vyššie. Licencia platí na jeden počítač.',
    '',
    'Predplatné sa obnovuje automaticky. Zrušiť ho, obnoviť alebo presunúť',
    'licenciu na iný počítač viete v Mojom účte na ' + web + '/ucet.html,',
    'alebo nám napíšte na ' + ODPOVED + ', telefón ' + V.TELEFON + '.',
    '',
    PRAVNE,
    '',
    'Pekný deň',
    'Tím GridServis'
  ].join('\n');
}

async function posli(email, kod, plan, platnaDo, adresaWebu, meno) {
  return posliSpravu({
    to: [email],
    subject: 'Licencia GridServis je aktívna — váš kód',
    html: licenciaHtml(meno, kod, plan, platnaDo, adresaWebu),
    text: licenciaText(meno, kod, plan, platnaDo, adresaWebu)
  }, { dolezite: true });
}

/* ---------- presun licencie na iný počítač ---------- */

function presunHtml(kod, web) {
  var obsah =
    V.pozdrav() +
    V.nadpis('Počítač je', 'uvoľnený') +
    V.odsek('presun licencie na iný počítač je zaplatený. Predošlý počítač je odhlásený.') +
    V.kodBlok(kod, 'VÁŠ LICENČNÝ KÓD') +
    V.kroky([
      ['Nainštalujte program na nový počítač', 'Inštalačka sa stiahne hneď po kliknutí na <a href="' + web + '/api/stiahnut-plna" style="color:#2563eb;">tento odkaz</a> — bez platby, licenciu už máte.'],
      ['Zadajte ten istý kód', 'Pri spustení vložte kód vyššie. Licencia ani jej platnosť sa nemenili.']
    ]) +
    V.kontaktKarta('Niečo nesedí? Ozvite sa nám') +
    V.podpis();
  return V.obalka('Počítač je uvoľnený', obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Presun licencie je zaplatený, na novom počítači zadajte ten istý kód.' });
}

async function posliPresun(email, kod, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Presun licencie zaplatený — počítač je uvoľnený',
    html: presunHtml(kod, adresaWebu),
    text: [
      'Dobrý deň,', '',
      'presun licencie ' + kod + ' na iný počítač je zaplatený. Predošlý počítač je odhlásený.', '',
      'Na novom počítači zadajte pri spustení programu ten istý kód: ' + kod + '.',
      'Licencia ani jej platnosť sa nemenili.', '',
      'Otázky? Napíšte na ' + ODPOVED + ' alebo zavolajte na ' + V.TELEFON + '.', '',
      'Tím GridServis'
    ].join('\n')
  });
}

/* ---------- privítanie po objednaní dema ---------- */

function demoHtml(meno, web) {
  var obsah =
    V.pozdrav(meno) +
    V.nadpis('Demo je', 'pripravené') +
    V.odsek('ďakujeme, že ste si objednali demo programu GridServis. Môžete si v ňom v pokoji vyskúšať zákazky, zákazníkov, sklad aj štatistiky.') +
    V.kroky([
      ['Stiahnite demo', 'Inštalačka je na stránke <a href="' + web + '/stiahnut.html" style="color:#2563eb;">gridservis.app/stiahnut</a>.'],
      ['Spustite inštaláciu', SMARTSCREEN],
      ['Vyskúšajte prvú zákazku', 'Založte zákazníka, auto a zákazku — za pár minút uvidíte, ako vám GridServis uľahčí deň.']
    ]) +
    V.tlacidlo('Stiahnuť demo &rarr;', web + '/stiahnut.html') +
    V.odsek('Ak niečo nepôjde alebo vám niečo bude chýbať, stačí odpovedať na tento e-mail. Každú správu čítame.', true) +
    V.tmavyPruh('Menej chaosu, viac času na autá.', 'GridServis vám šetrí čas a znižuje administratívu.') +
    V.kontaktKarta() +
    V.podpis();
  return V.obalka('Demo je pripravené', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Odkaz na stiahnutie dema GridServis a ako začať.' });
}

function demoText(meno, web) {
  return [
    'Dobrý deň' + (meno ? ', ' + meno : '') + ',', '',
    'ďakujeme, že ste si objednali demo programu GridServis.',
    'Stiahnete ho tu: ' + web + '/stiahnut.html', '',
    'Windows pri inštalácii ukáže upozornenie SmartScreen, lebo súbor nemá',
    'podpisový certifikát — kliknite na Ďalšie informácie a Spustiť tak či tak.', '',
    'Ak niečo nepôjde alebo vám niečo bude chýbať, stačí odpovedať na tento e-mail.',
    'Telefón: ' + V.TELEFON, '',
    'Pekný deň',
    'Tím GridServis'
  ].join('\n');
}

async function posliDemo(email, adresaWebu, meno) {
  return posliSpravu({
    to: [email],
    subject: 'Demo GridServis je pripravené na stiahnutie',
    html: demoHtml(meno, adresaWebu),
    text: demoText(meno, adresaWebu)
  });
}

/* ---------- spätná väzba po deme s ponukou 3 mesiacov zadarmo ----------
   Posiela sa prvým pár zákazníkom dema (viď _objednavka.js), naplánovane
   o pár dní po objednávke. */

var OTAZKY = [
  ['Inštalácia', 'Podarilo sa program nainštalovať a spustiť bez problémov?'],
  ['Čo vám sedí', 'Čo sa vám páčilo a čo ste využili najviac?'],
  ['Čo chýba', 'Čo vám chýba alebo čo by ste zmenili, aby ste ho v dielni používali každý deň?'],
  ['Čo bolo nejasné', 'Bolo niečo mätúce alebo ste niečo nevedeli nájsť?']
];

function recenziaHtml(meno, web) {
  var obsah =
    V.pozdrav(meno) +
    V.nadpis('Prebehlo všetko', 'v&nbsp;poriadku?') +
    V.odsek('pred pár dňami ste si u nás objednali demo programu GridServis. Chceli sme sa opýtať, či sa vám ho podarilo stiahnuť, nainštalovať a či všetko fungovalo tak, ako malo.') +
    V.odsek('Ak niečo nešlo, stačí odpovedať na tento e-mail a pomôžeme vám to rozbehnúť.') +
    V.podnadpis('Len začíname, preto nám na vašom názore', 'veľmi záleží') +
    V.odsek('GridServis je nový program a staviame ho spolu s autoservismi, ako je ten váš. Budeme radi za pár viet, aj kritických:', true) +
    V.kroky(OTAZKY) +
    V.odsek('Stačí kliknúť na <b>Odpovedať</b> vo svojej pošte a napísať pár viet. Každú správu čítame.') +
    V.modraKarta({
      stitok: 'PRE PRVÉ DIELNE',
      titulok: '3 mesiace plnej verzie zadarmo',
      text: 'Ak by ste chceli GridServis vyskúšať naplno, radi vám dáme <b style="color:#ffffff;">3 mesiace plnej verzie bez poplatku</b>. Na oplátku nám počas toho občas poviete, čo funguje, čo je zle a čo by ste zmenili. Nič sa automaticky neplatí, po troch mesiacoch sa sami rozhodnete, či pokračovať.',
      tlacidlo: ['Mám záujem &rarr;', 'mailto:' + ODPOVED + '?subject=' + encodeURIComponent('Mám záujem o 3 mesiace GridServis')],
      poznamka: 'Alebo len odpíšte „mám záujem“ a licenciu vám pošleme.'
    }) +
    V.tmavyPruh('Menej chaosu, viac času na autá.', 'To je náš cieľ. S vašou pomocou sa k nemu dostaneme rýchlejšie.') +
    V.kontaktKarta() +
    V.podpis('Ďakujeme, že ste to s nami skúsili.');
  return V.obalka('Prebehlo všetko v poriadku?', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Radi by sme vedeli, či demo funguje, ako má, a čo by ste na GridServise zlepšili.' });
}

function recenziaText(meno) {
  return [
    'Dobrý deň' + (meno ? ', ' + meno : '') + ',', '',
    'pred pár dňami ste si u nás objednali demo programu GridServis. Chceli sme sa opýtať, či sa vám ho podarilo stiahnuť, nainštalovať a či všetko fungovalo tak, ako malo.', '',
    'Ak niečo nešlo, stačí odpovedať na tento e-mail a pomôžeme vám to rozbehnúť.', '',
    'Len začíname, preto nám na vašom názore veľmi záleží. Budeme radi za pár viet, aj kritických:', ''
  ].concat(OTAZKY.map(function (o, i) { return (i + 1) + '. ' + o[0] + ': ' + o[1]; })).concat([
    '',
    'PRE PRVÉ DIELNE: 3 mesiace plnej verzie zadarmo',
    'Ak by ste chceli GridServis vyskúšať naplno, radi vám dáme 3 mesiace plnej verzie bez poplatku. Na oplátku nám počas toho občas poviete, čo funguje, čo je zle a čo by ste zmenili. Nič sa automaticky neplatí, po troch mesiacoch sa sami rozhodnete, či pokračovať.',
    'Stačí odpísať „mám záujem“ a licenciu vám pošleme.', '',
    'Radšej telefonicky? ' + V.TELEFON + ' · www.gridservis.app', '',
    'Ďakujeme, že ste to s nami skúsili.',
    'Tím GridServis'
  ]).join('\n');
}

/* za = počet dní, o koľko neskôr Resend e-mail odošle */
async function posliRecenziu(email, adresaWebu, meno, za) {
  var kedy = za ? new Date(Date.now() + za * 86400000).toISOString() : null;
  return posliSpravu({
    to: [email],
    subject: 'Prebehlo všetko v poriadku s GridServisom?',
    html: recenziaHtml(meno, adresaWebu),
    text: recenziaText(meno)
  }, { naplanovat: kedy, kluc: 'recenzia-' + String(email).toLowerCase() });
}


/* ---------- platba za obnovu neprešla ---------- */

function platbaHtml(m, web) {
  var zaplatit = m.faktura || (web + '/ucet.html');
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Platba za predplatné', 'neprešla') +
    V.odsek('pri obnove predplatného GridServis sa nepodarilo strhnúť platbu <b>' + suma(m.suma, m.mena) + '</b>. Najčastejšie ide o kartu, ktorej skončila platnosť, alebo o nedostatok prostriedkov na účte.') +
    V.kroky([
      ['Zaplaťte faktúru', 'Kliknite na tlačidlo nižšie a zaplaťte hoci aj inou kartou.'],
      ['Alebo zmeňte kartu', 'V <a href="' + web + '/ucet.html" style="color:#2563eb;">Mojom účte</a> → Spravovať predplatné. Ďalšia obnova už pôjde z novej karty.']
    ]) +
    V.tlacidlo('Zaplatiť faktúru &rarr;', zaplatit) +
    V.odsek('Platbu sa automaticky pokúsime strhnúť znova o pár dní. Licencia ' + (m.kod ? '<b>' + m.kod + '</b> ' : '') + 'zatiaľ funguje. Ak sa platbu nepodarí uhradiť, program sa po skončení zaplateného obdobia zastaví — vaše dáta v počítači zostanú.', true) +
    V.kontaktKarta('Potrebujete pomôcť?') +
    V.podpis();
  return V.obalka('Platba neprešla', obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Obnova predplatného GridServis sa nepodarila — stačí zaplatiť faktúru alebo zmeniť kartu.' });
}

async function posliPlatbaNepresla(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Platba za GridServis neprešla — zaplaťte, prosím, faktúru',
    html: platbaHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'pri obnove predplatného GridServis sa nepodarilo strhnúť platbu ' + suma(m.suma, m.mena) + '.', '',
      'Zaplatiť faktúru: ' + (m.faktura || adresaWebu + '/ucet.html'),
      'Zmeniť kartu: ' + adresaWebu + '/ucet.html (Spravovať predplatné)', '',
      'Platbu sa pokúsime strhnúť znova o pár dní. Licencia zatiaľ funguje; ak sa platbu',
      'nepodarí uhradiť, program sa po skončení obdobia zastaví — dáta v počítači zostanú.', '',
      'Otázky: ' + ODPOVED + ' · ' + V.TELEFON, '',
      'Tím GridServis'
    ].join('\n')
  }, { dolezite: true, kluc: m.kluc });
}

/* ---------- predplatné skončilo ---------- */

function koniecHtml(m, web) {
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Predplatné', 'skončilo') +
    V.odsek('vaše predplatné programu GridServis skončilo a licencia <b>' + m.kod + '</b> sa zastavila. Vaše dáta — zákazky, zákazníci aj sklad — zostávajú uložené v počítači.') +
    V.kroky([
      ['Obnovte predplatné', 'Na ten istý licenčný kód — nič nové nezadávate.'],
      ['Pokračujte tam, kde ste skončili', 'Program sa odomkne a uvidíte všetky svoje dáta.']
    ]) +
    V.tlacidlo('Obnoviť predplatné &rarr;', web + '/obnova.html?kod=' + encodeURIComponent(m.kod)) +
    V.odsek('Ak ste predplatné zrušili zámerne, budeme radi, keď nám odpíšete, čo vám chýbalo. Pomôže nám to GridServis zlepšiť.', true) +
    V.kontaktKarta() +
    V.podpis('Ďakujeme, že ste s nami boli.');
  return V.obalka('Predplatné skončilo', obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Licencia sa zastavila, dáta zostávajú v počítači. Obnoviť ju môžete na ten istý kód.' });
}

async function posliKoniecPredplatneho(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Predplatné GridServis skončilo — vaše dáta zostávajú',
    html: koniecHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'vaše predplatné programu GridServis skončilo a licencia ' + m.kod + ' sa zastavila.',
      'Dáta (zákazky, zákazníci, sklad) zostávajú uložené v počítači.', '',
      'Obnoviť predplatné na ten istý kód: ' + adresaWebu + '/obnova.html?kod=' + encodeURIComponent(m.kod), '',
      'Ak ste predplatné zrušili zámerne, odpíšte nám, prosím, čo vám chýbalo.', '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: m.kluc });
}

/* ---------- obnova predplatného zaplatená ---------- */

function obnovaHtml(m, web) {
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Licencia je', 'predĺžená') +
    V.odsek('ďakujeme, platba <b>' + suma(m.suma, m.mena) + '</b> za predplatné GridServis prešla. Licencia <b>' + m.kod + '</b> platí do <b>' + datum(m.platnaDo) + '</b>.') +
    (m.faktura ? V.tlacidlo('Stiahnuť faktúru &rarr;', m.faktura, true) : '') +
    V.odsek('Nemusíte nič robiť — program beží ďalej. Predplatné spravujete v <a href="' + web + '/ucet.html" style="color:#2563eb;">Mojom účte</a>.', true) +
    V.podpis();
  return V.obalka('Licencia je predĺžená', obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Platba prešla, licencia GridServis platí ďalej.' });
}

async function posliObnovaZaplatena(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Licencia GridServis je predĺžená do ' + datum(m.platnaDo),
    html: obnovaHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'platba ' + suma(m.suma, m.mena) + ' za predplatné GridServis prešla.',
      'Licencia ' + m.kod + ' platí do ' + datum(m.platnaDo) + '.', '',
      (m.faktura ? 'Faktúra: ' + m.faktura + '\n' : '') +
      'Predplatné spravujete v Mojom účte: ' + adresaWebu + '/ucet.html', '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: m.kluc });
}

/* ---------- skúšobná licencia (3 mesiace zadarmo za spätnú väzbu) ---------- */

function skusobnaHtml(m, web) {
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Vaše ' + m.mesiace + ' mesiace', 'zadarmo') +
    V.odsek('ďakujeme, že nám pomôžete GridServis zlepšovať. Tu je licencia na plnú verziu — bez platby a bez záväzkov.') +
    V.kodBlok(m.kod, 'VÁŠ LICENČNÝ KÓD') +
    V.odsek('Licencia platí do <b>' + datum(m.platnaDo) + '</b>. Nič sa automaticky neplatí, pred koncom vám pripomenieme, ako pokračovať.', true) +
    V.podnadpis('Ako začať') +
    V.kroky([
      ['Stiahnite plnú verziu', 'Inštalačka sa stiahne hneď po kliknutí na <a href="' + web + '/api/stiahnut-plna" style="color:#2563eb;">tento odkaz</a> — bez platby, licenciu už máte.'],
      ['Spustite inštaláciu', SMARTSCREEN],
      ['Zadajte licenčný kód', 'Pri prvom spustení vložte kód vyššie.']
    ]) +
    V.tlacidlo('Stiahnuť plnú verziu &rarr;', web + '/api/stiahnut-plna') +
    V.modraKarta({
      stitok: 'VAŠA SPÄTNÁ VÄZBA',
      titulok: 'Píšte nám, čo funguje a čo nie',
      text: 'Kedykoľvek odpovedzte na tento e-mail — čo vám chýba, čo vás zdržuje, čo by ste zmenili. Každú správu čítame a podľa nich GridServis upravujeme.'
    }) +
    V.kontaktKarta() +
    V.podpis('Ďakujeme, že ste do toho išli s nami.');
  return V.obalka('Vaše ' + m.mesiace + ' mesiace zadarmo', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Licencia na plnú verziu GridServis na ' + m.mesiace + ' mesiace zadarmo.' });
}

async function posliSkusobnu(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Vaša licencia GridServis na ' + m.mesiace + ' mesiace zadarmo',
    html: skusobnaHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'ďakujeme, že nám pomôžete GridServis zlepšovať. Tu je licencia na plnú verziu na ' + m.mesiace + ' mesiace zadarmo.', '',
      'Licenčný kód: ' + m.kod,
      'Platí do: ' + datum(m.platnaDo), '',
      'Ako začať:',
      '1. Stiahnite plnú verziu (bez platby): ' + adresaWebu + '/api/stiahnut-plna',
      '2. Spustite inštaláciu (pri upozornení SmartScreen: Ďalšie informácie → Spustiť tak či tak).',
      '3. Pri prvom spustení zadajte kód vyššie.', '',
      'Kedykoľvek nám odpíšte, čo funguje a čo nie. Nič sa automaticky neplatí.', '',
      'Tím GridServis'
    ].join('\n')
  }, { dolezite: true, kluc: m.kluc });
}

/* ---------- skúšobná licencia končí o 7 dní ---------- */

function koniecSkusobnejHtml(m, web) {
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Skúšobné obdobie končí', 'o&nbsp;7&nbsp;dní') +
    V.odsek('vaša skúšobná licencia <b>' + m.kod + '</b> platí do <b>' + datum(m.platnaDo) + '</b>. Ak chcete GridServis používať aj ďalej, stačí si vybrať predplatné — licenčný kód aj všetky dáta zostanú.') +
    V.kroky([
      ['Ročné predplatné', '<b>199,99 €</b> ročne — ušetríte 39,89 € oproti mesačnému.'],
      ['Mesačné predplatné', '<b>19,99 €</b> mesačne, zrušíte kedykoľvek.']
    ]) +
    V.tlacidlo('Pokračovať s predplatným &rarr;', web + '/obnova.html?kod=' + encodeURIComponent(m.kod)) +
    V.odsek('Ak sa rozhodnete nepokračovať, program sa po skončení zastaví a dáta zostanú v počítači. Budeme radi, keď nám napíšete, prečo — pomôže nám to.', true) +
    V.kontaktKarta() +
    V.podpis();
  return V.obalka('Skúšobné obdobie končí o 7 dní', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Licencia GridServis platí ešte 7 dní. Pokračovať môžete na ten istý kód.' });
}

async function posliKoniecSkusobnej(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Skúšobné obdobie GridServis končí o 7 dní',
    html: koniecSkusobnejHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'vaša skúšobná licencia ' + m.kod + ' platí do ' + datum(m.platnaDo) + '.',
      'Ak chcete pokračovať, vyberte si predplatné — kód aj dáta zostanú:',
      '- ročne 199,99 € (ušetríte 39,89 €)',
      '- mesačne 19,99 €, zrušíte kedykoľvek', '',
      'Pokračovať: ' + adresaWebu + '/obnova.html?kod=' + encodeURIComponent(m.kod), '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: m.kluc });
}

/* ---------- týždeň po deme: plná verzia ---------- */

function demoPlnaHtml(meno, web) {
  var obsah =
    V.pozdrav(meno) +
    V.nadpis('Ako vám sedí', 'GridServis?') +
    V.odsek('pred týždňom ste si stiahli demo programu GridServis. Dúfame, že ste si ho stihli vyskúšať na pár skutočných zákazkách.') +
    V.podnadpis('S plnou verziou máte') +
    V.kroky([
      ['Prehľad o zákazkách', 'Stav opráv, termíny a detaily zákaziek v reálnom čase.'],
      ['Správu zákazníkov', 'Všetky kontakty a história servisu na jednom mieste.'],
      ['Rýchle štatistiky', 'Prehľad o výkonnosti a využití kapacít vášho servisu.']
    ]) +
    V.modraKarta({
      stitok: 'PLNÁ VERZIA',
      titulok: 'Od 19,99 € mesačne',
      text: 'Bez viazanosti, zrušiť môžete kedykoľvek. Pri ročnom predplatnom ušetríte 39,89 €.',
      tlacidlo: ['Pozrieť cenník &rarr;', web + '/cennik.html']
    }) +
    V.odsek('Niečo vám v deme chýbalo alebo nefungovalo? Odpíšte nám — čítame každú správu.', true) +
    V.tmavyPruh('Menej chaosu, viac času na autá.', 'GridServis vám šetrí čas a znižuje administratívu.') +
    V.kontaktKarta() +
    V.podpis();
  return V.obalka('Ako vám sedí GridServis?', obsah, web, ODPOVED,
    { hlavicka: 'app', predhlavicka: 'Týždeň po deme: čo vám GridServis dá v plnej verzii.' });
}

async function posliDemoPlnaVerzia(email, adresaWebu, meno, kluc) {
  return posliSpravu({
    to: [email],
    subject: 'Ako vám sedí GridServis?',
    html: demoPlnaHtml(meno, adresaWebu),
    text: [
      'Dobrý deň' + (meno ? ', ' + meno : '') + ',', '',
      'pred týždňom ste si stiahli demo programu GridServis. Dúfame, že ste si ho stihli vyskúšať.', '',
      'Plná verzia je od 19,99 € mesačne, bez viazanosti. Pri ročnom predplatnom ušetríte 39,89 €.',
      'Cenník: ' + adresaWebu + '/cennik.html', '',
      'Niečo vám v deme chýbalo? Odpíšte nám, čítame každú správu.', '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: kluc });
}

/* ---------- mesiac po kúpe: hodnotenie 1–10 ---------- */

function dotaznikHtml(meno, web) {
  var cisla = '';
  for (var i = 1; i <= 10; i++) {
    cisla += '<td align="center" style="padding:0 2px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>' +
      '<td align="center" height="40" bgcolor="' + (i >= 9 ? '#2563eb' : '#e6eeff') + '" style="height:40px;background-color:' + (i >= 9 ? '#2563eb' : '#e6eeff') + ';border-radius:9px;">' +
      '<a href="mailto:' + ODPOVED + '?subject=' + encodeURIComponent('Hodnotenie GridServis: ' + i + '/10') + '" style="display:block;line-height:40px;font-size:15px;font-weight:800;color:' + (i >= 9 ? '#ffffff' : '#2563eb') + ';text-decoration:none;">' + i + '</a>' +
      '</td></tr></table></td>';
  }
  var obsah =
    V.pozdrav(meno) +
    V.nadpis('Ako ste spokojní', 's GridServisom?') +
    V.odsek('používate GridServis už mesiac. Ako pravdepodobne by ste ho odporučili inému autoservisu? Kliknite na číslo od 1 do 10 — otvorí sa krátky e-mail, ktorý nám odošlete.') +
    '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 6px;"><tr>' + cisla + '</tr></table>' +
    '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="font-size:12px;color:#8a93a1;">vôbec nie</td><td align="right" style="font-size:12px;color:#8a93a1;">určite áno</td></tr></table>' +
    V.odsek('A ak nám k tomu pripíšete jednu vec, ktorú by sme mali zlepšiť, budete mať zásluhu na ďalšej verzii.', true) +
    V.podpis('Ďakujeme!');
  return V.obalka('Ako ste spokojní s GridServisom?', obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Jedno kliknutie: ohodnoťte GridServis od 1 do 10.' });
}

async function posliDotaznik(email, adresaWebu, meno, kluc) {
  return posliSpravu({
    to: [email],
    subject: 'Ako ste spokojní s GridServisom? (1 kliknutie)',
    html: dotaznikHtml(meno, adresaWebu),
    text: [
      'Dobrý deň' + (meno ? ', ' + meno : '') + ',', '',
      'používate GridServis už mesiac. Ako pravdepodobne by ste ho odporučili inému autoservisu',
      'na stupnici od 1 do 10? Stačí odpovedať na tento e-mail jedným číslom.', '',
      'A ak pripíšete jednu vec, ktorú zlepšiť, budeme radi.', '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: kluc });
}

/* ---------- nová verzia programu ---------- */

/* poznámky k vydaniu z GitHubu (markdown) → jednoduchý zoznam */
function poznamkyHtml(text) {
  var riadky = String(text || '').split(/\r?\n/).map(function (r) { return r.trim(); }).filter(Boolean).slice(0, 15);
  var body = riadky.filter(function (r) { return /^[-*•]\s+/.test(r); });
  var zoznam = (body.length ? body : riadky).map(function (r) {
    var t = esc(r.replace(/^[-*•#]+\s*/, '')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return '<li style="margin:0 0 6px;">' + t + '</li>';
  }).join('');
  return zoznam ? '\n      <ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#0d1117;">' + zoznam + '</ul>' : '';
}

function verziaHtml(m, web) {
  var obsah =
    V.pozdrav(m.meno) +
    V.nadpis('Nová verzia', esc(m.verzia)) +
    V.odsek('vyšla nová verzia programu GridServis <b>' + esc(m.verzia) + '</b>.') +
    (m.poznamky ? V.podnadpis('Čo je nové') + poznamkyHtml(m.poznamky) : '') +
    V.tlacidlo('Stiahnuť novú verziu &rarr;', web + '/api/stiahnut-plna') +
    V.odsek('Nainštalujte ju cez pôvodný program — licencia aj dáta zostanú.', true) +
    V.podpis();
  return V.obalka('Nová verzia GridServis ' + esc(m.verzia), obsah, web, ODPOVED,
    { hlavicka: 'mriezka', predhlavicka: 'Vyšla nová verzia GridServis ' + esc(m.verzia) + '.' });
}

async function posliNovaVerzia(email, m, adresaWebu) {
  return posliSpravu({
    to: [email],
    subject: 'Nová verzia GridServis ' + m.verzia,
    html: verziaHtml(m, adresaWebu),
    text: [
      'Dobrý deň' + (m.meno ? ', ' + m.meno : '') + ',', '',
      'vyšla nová verzia programu GridServis ' + m.verzia + '.', '',
      String(m.poznamky || '').slice(0, 1500), '',
      'Stiahnuť: ' + adresaWebu + '/api/stiahnut-plna',
      'Nainštalujte ju cez pôvodný program — licencia aj dáta zostanú.', '',
      'Tím GridServis'
    ].join('\n')
  }, { kluc: m.kluc });
}

module.exports = {
  posli: posli,
  posliPresun: posliPresun,
  posliDemo: posliDemo,
  posliRecenziu: posliRecenziu,
  posliPlatbaNepresla: posliPlatbaNepresla,
  posliKoniecPredplatneho: posliKoniecPredplatneho,
  posliObnovaZaplatena: posliObnovaZaplatena,
  posliSkusobnu: posliSkusobnu,
  posliKoniecSkusobnej: posliKoniecSkusobnej,
  posliDemoPlnaVerzia: posliDemoPlnaVerzia,
  posliDotaznik: posliDotaznik,
  posliNovaVerzia: posliNovaVerzia,
  nastavene: function () { return Boolean(KLUC && ODOSIELATEL); }
};
