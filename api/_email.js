/* Odoslanie licenčného kódu e-mailom cez Resend.

   Keď nie je nastavený RESEND_API_KEY alebo RESEND_FROM, e-mail sa nepošle
   a nič sa nepokazí — kód zostáva na stránke po platbe a v admin aplikácii.
   Odosielanie preto nikdy nesmie zhodiť vydanie licencie. */

var { tlacidlo, kodBlok, obalka, odosli, FONT } = require('./_email-vzhlad');

var KLUC = process.env.RESEND_API_KEY || '';
var ODOSIELATEL = process.env.RESEND_FROM || '';
var ODPOVED = process.env.RESEND_REPLY_TO || 'support@gridservis.app';

function text(kod, plan, platnaDo, adresaWebu) {
  var obdobie = plan === 'rok' ? 'ročné' : 'mesačné';
  return [
    'Dobrý deň,',
    '',
    'ďakujem za ' + obdobie + ' predplatné programu GridServis.',
    '',
    'Licenčný kód: ' + kod,
    'Predplatné platí do: ' + platnaDo,
    '',
    'Ako ho použiť:',
    '1. Stiahnite si program na ' + adresaWebu + '/stiahnut.html',
    '2. Spustite inštalačku. Windows ukáže upozornenie SmartScreen, lebo súbor',
    '   nemá podpisový certifikát — kliknite na Ďalšie informácie a Spustiť tak či tak.',
    '3. Pri prvom spustení zadajte kód vyššie. Licencia platí na jeden počítač.',
    '',
    'Potvrdenie: pri objednávke ste výslovne súhlasili so sprístupnením programu',
    'pred uplynutím lehoty na odstúpenie a vyhlásili ste, že ste boli poučený,',
    'že tým strácate právo na odstúpenie od zmluvy (§ 19 ods. 1 zákona č. 108/2024 Z. z.).',
    '',
    'Predplatné sa obnovuje automaticky. Zrušiť ho, obnoviť alebo presunúť',
    'licenciu na iný počítač viete v Mojom účte na ' + adresaWebu + '/ucet.html,',
    'alebo mi napíšte na ' + ODPOVED + '.',
    '',
    'Pekný deň'
  ].join('\n');
}

function html(meno, kod, plan, platnaDo, adresaWebu) {
  var obdobie = plan === 'rok' ? 'ročné' : 'mesačné';
  var pozdrav = meno ? ', ' + meno : '';
  var obsah =
    '\n      <h1 style="margin:0 0 14px;font-family:' + FONT + ';font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-.01em;">Vitaj v GridServise' + pozdrav + '!</h1>' +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Ďakujem za ' + obdobie + ' predplatné — licencia je aktívna a program je pripravený na prvú zákazku.</p>' +
    kodBlok(kod, 'TVOJ LICENČNÝ KÓD') +
    '\n      <p style="margin:0;color:#55606e;font-size:14px;">Odlož si ho — budeš ho potrebovať pri prvom spustení aj pri prípadnom prenose na iný počítač.</p>' +
    '\n      <p style="margin:22px 0 0;color:#0d1117;">Predplatné platí do <b>' + platnaDo + '</b>, potom sa samo obnoví (dá sa kedykoľvek zrušiť v <a href="' + adresaWebu + '/ucet.html" style="color:#2563eb;">Mojom účte</a> na webe).</p>' +
    tlacidlo('Stiahnuť program →', adresaWebu + '/stiahnut.html') +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Windows pri inštalácii ukáže upozornenie SmartScreen, lebo súbor nemá podpisový certifikát — kliknite na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>, nie je to vírus.</p>' +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Niečo nesedí alebo máš otázku? Napíš na <a href="mailto:' + ODPOVED + '" style="color:#2563eb;">' + ODPOVED + '</a>.</p>' +
    '\n      <p style="margin:18px 0 0;color:#8a93a1;font-size:12px;">Potvrdenie: pri objednávke ste výslovne súhlasili so sprístupnením programu pred uplynutím lehoty na odstúpenie a vyhlásili ste, že ste boli poučený, že tým strácate právo na odstúpenie od zmluvy (§ 19 ods. 1 zákona č. 108/2024 Z. z.).</p>';
  return obalka('Vitaj v GridServise — licencia je aktívna', obsah, adresaWebu, ODPOVED);
}

async function posli(email, kod, plan, platnaDo, adresaWebu, meno) {
  if (!email || !KLUC || !ODOSIELATEL) return false;
  try {
    var r = await odosli({
      from: ODOSIELATEL,
      to: [email],
      reply_to: ODPOVED,
      subject: 'Vitaj v GridServise — licencia je aktívna',
      html: html(meno, kod, plan, platnaDo, adresaWebu),
      text: text(kod, plan, platnaDo, adresaWebu)
    });
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

/* e-mail dielni po zaplatenom presune licencie na iný počítač */
async function posliPresun(email, kod, adresaWebu) {
  if (!email || !KLUC || !ODOSIELATEL) return false;
  var obsah =
    '\n      <h1 style="margin:0 0 14px;font-family:' + FONT + ';font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-.01em;">Počítač je uvoľnený</h1>' +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Presun licencie ' + kod + ' na iný počítač je zaplatený. Predošlý počítač je odhlásený.</p>' +
    '\n      <p style="margin:18px 0 0;color:#0d1117;">Na novom počítači zadajte pri spustení programu ten istý kód: <b>' + kod + '</b>. Licencia ani jej platnosť sa nemenili.</p>' +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Niečo nesedí alebo máte otázku? Napíšte na <a href="mailto:' + ODPOVED + '" style="color:#2563eb;">' + ODPOVED + '</a>.</p>';
  var telo = obalka('Presun licencie zaplatený — počítač je uvoľnený', obsah, adresaWebu, ODPOVED);
  var text = [
    'Dobrý deň,', '',
    'presun licencie ' + kod + ' na iný počítač je zaplatený. Predošlý počítač je odhlásený.', '',
    'Na novom počítači zadajte pri spustení programu ten istý kód: ' + kod + '.',
    'Licencia ani jej platnosť sa nemenili.', '',
    'Otázky? Napíšte na ' + ODPOVED + '.'
  ].join('\n');
  try {
    var r = await odosli({
      from: ODOSIELATEL, to: [email], reply_to: ODPOVED,
      subject: 'Presun licencie zaplatený — počítač je uvoľnený',
      html: telo, text: text
    });
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

/* e-mail po objednaní dema: privítanie a prosba o spätnú väzbu.
   Demo nemá licenčný kód, preto len odkaz na stiahnutie. */
async function posliDemo(email, adresaWebu, meno) {
  if (!email || !KLUC || !ODOSIELATEL) return false;
  var pozdrav = meno ? ', ' + meno : '';
  var otazky = [
    'Čo sa ti na programe páčilo a čo ti naopak prekážalo?',
    'Čo by si zmenil alebo zjednodušil?',
    'Čo ti v programe chýba, aby si ho mohol používať v dielni každý deň?',
    'Je niečo, čo ti nebolo jasné alebo čo si nevedel nájsť?'
  ];
  var zoznam = otazky.map(function (o) {
    return '<li style="margin:0 0 6px;">' + o + '</li>';
  }).join('');
  var obsah =
    '\n      <h1 style="margin:0 0 14px;font-family:' + FONT + ';font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-.01em;">Vitaj v GridServise' + pozdrav + '!</h1>' +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Ďakujem, že si si objednal demo programu GridServis. Môžeš si v ňom v pokoji vyskúšať zákazky, zákazníkov aj sklad.</p>' +
    tlacidlo('Stiahnuť demo →', adresaWebu + '/stiahnut.html') +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Windows pri inštalácii ukáže upozornenie SmartScreen, lebo súbor nemá podpisový certifikát — klikni na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>, nie je to vírus.</p>' +
    '\n      <h2 style="margin:26px 0 8px;font-family:' + FONT + ';font-size:17px;line-height:1.3;font-weight:700;">Tvoj názor mi pomôže</h2>' +
    '\n      <p style="margin:0 0 10px;color:#0d1117;">GridServis ešte rastie a rozhoduje v ňom hlas ľudí z dielní. Keď si ho vyskúšaš, odpíš mi na tento e-mail aspoň pár viet:</p>' +
    '\n      <ul style="margin:0 0 10px;padding-left:20px;color:#0d1117;">' + zoznam + '</ul>' +
    '\n      <p style="margin:0;color:#0d1117;">Stačí odpovedať priamo na tento e-mail. Čítam každú odpoveď a rád sa k nej vrátim.</p>' +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Niečo nesedí alebo máš otázku? Napíš na <a href="mailto:' + ODPOVED + '" style="color:#2563eb;">' + ODPOVED + '</a>.</p>';
  var telo = obalka('Vitaj v GridServise — demo je pripravené', obsah, adresaWebu, ODPOVED);
  var text = [
    'Vitaj v GridServise' + pozdrav + '!', '',
    'Ďakujem, že si si objednal demo programu GridServis.',
    'Stiahneš ho tu: ' + adresaWebu + '/stiahnut.html', '',
    'Windows pri inštalácii ukáže upozornenie SmartScreen, lebo súbor nemá',
    'podpisový certifikát — klikni na Ďalšie informácie a Spustiť tak či tak.', '',
    'Tvoj názor mi pomôže. Keď si program vyskúšaš, odpíš mi na tento e-mail:',
  ].concat(otazky.map(function (o, i) { return (i + 1) + '. ' + o; })).concat([
    '', 'Čítam každú odpoveď.', '',
    'Otázky? Napíš na ' + ODPOVED + '.', '', 'Pekný deň'
  ]).join('\n');
  try {
    var r = await odosli({
      from: ODOSIELATEL, to: [email], reply_to: ODPOVED,
      subject: 'Vitaj v GridServise — demo je pripravené a rád si vypočujem tvoj názor',
      html: telo, text: text
    });
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

module.exports = {
  posli: posli,
  posliDemo: posliDemo,
  posliPresun: posliPresun,
  nastavene: function () { return Boolean(KLUC && ODOSIELATEL); }
};
