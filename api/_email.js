/* E-maily zákazníkom cez Resend: licencia, presun, demo a spätná väzba.

   Keď nie je nastavený RESEND_API_KEY alebo RESEND_FROM, e-mail sa nepošle
   a nič sa nepokazí — kód zostáva na stránke po platbe a v admin aplikácii.
   Odosielanie preto nikdy nesmie zhodiť vydanie licencie. */

var V = require('./_email-vzhlad');

var KLUC = process.env.RESEND_API_KEY || '';
var ODOSIELATEL = process.env.RESEND_FROM || '';
var ODPOVED = process.env.RESEND_REPLY_TO || 'support@gridservis.app';

async function posliSpravu(sprava, moznosti) {
  if (!sprava.to[0] || !KLUC || !ODOSIELATEL) return false;
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
      ['Stiahnite program', 'Inštalačka je na stránke <a href="' + web + '/stiahnut.html" style="color:#2563eb;">gridservis.app/stiahnut</a>.'],
      ['Spustite inštaláciu', SMARTSCREEN],
      ['Zadajte licenčný kód', 'Pri prvom spustení vložte kód vyššie. Licencia platí na jeden počítač.']
    ]) +
    V.tlacidlo('Stiahnuť program &rarr;', web + '/stiahnut.html') +
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
    '1. Stiahnite program na ' + web + '/stiahnut.html',
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
  });
}

/* ---------- presun licencie na iný počítač ---------- */

function presunHtml(kod, web) {
  var obsah =
    V.pozdrav() +
    V.nadpis('Počítač je', 'uvoľnený') +
    V.odsek('presun licencie na iný počítač je zaplatený. Predošlý počítač je odhlásený.') +
    V.kodBlok(kod, 'VÁŠ LICENČNÝ KÓD') +
    V.kroky([
      ['Nainštalujte program na nový počítač', 'Inštalačka je na stránke <a href="' + web + '/stiahnut.html" style="color:#2563eb;">gridservis.app/stiahnut</a>.'],
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

module.exports = {
  posli: posli,
  posliPresun: posliPresun,
  posliDemo: posliDemo,
  posliRecenziu: posliRecenziu,
  /* pre náhľady */
  licenciaHtml: licenciaHtml, presunHtml: presunHtml, demoHtml: demoHtml, recenziaHtml: recenziaHtml,
  nastavene: function () { return Boolean(KLUC && ODOSIELATEL); }
};
