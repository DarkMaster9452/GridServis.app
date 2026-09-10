/* Odoslanie licenčného kódu e-mailom cez Resend.

   Keď nie je nastavený RESEND_API_KEY alebo RESEND_FROM, e-mail sa nepošle
   a nič sa nepokazí — kód zostáva na stránke po platbe a v admin aplikácii.
   Odosielanie preto nikdy nesmie zhodiť vydanie licencie. */

var { tlacidlo, kodBlok, obalka } = require('./_email-vzhlad');

var KLUC = process.env.RESEND_API_KEY || '';
var ODOSIELATEL = process.env.RESEND_FROM || '';
var ODPOVED = process.env.RESEND_REPLY_TO || 'strananekm@gmail.com';

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
    'Predplatné sa obnovuje automaticky. Zrušiť ho viete v programe',
    'v Nastaveniach, alebo mi napíšte na ' + ODPOVED + '.',
    '',
    'Pekný deň'
  ].join('\n');
}

function html(meno, kod, plan, platnaDo, adresaWebu) {
  var obdobie = plan === 'rok' ? 'ročné' : 'mesačné';
  var pozdrav = meno ? ', ' + meno : '';
  var obsah =
    '\n      <h1 style="margin:0 0 14px;font:700 22px/1.3 -apple-system,sans-serif;letter-spacing:-.01em;">Vitaj v GridServise' + pozdrav + '!</h1>' +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Ďakujem za ' + obdobie + ' predplatné — licencia je aktívna a program je pripravený na prvú zákazku.</p>' +
    kodBlok(kod, 'TVOJ LICENČNÝ KÓD') +
    '\n      <p style="margin:0;color:#55606e;font-size:14px;">Odlož si ho — budeš ho potrebovať pri prvom spustení aj pri prípadnom prenose na iný počítač.</p>' +
    '\n      <p style="margin:22px 0 0;color:#0d1117;">Predplatné platí do <b>' + platnaDo + '</b>, potom sa samo obnoví (dá sa kedykoľvek zrušiť priamo v programe, v Nastaveniach).</p>' +
    tlacidlo('Stiahnuť program →', adresaWebu + '/stiahnut.html') +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Windows pri inštalácii ukáže upozornenie SmartScreen, lebo súbor nemá podpisový certifikát — kliknite na <b>Ďalšie informácie</b> a <b>Spustiť tak či tak</b>, nie je to vírus.</p>' +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Niečo nesedí alebo máš otázku? Napíš na <a href="mailto:' + ODPOVED + '" style="color:#2563eb;">' + ODPOVED + '</a>.</p>';
  return obalka('Vitaj v GridServise — licencia je aktívna', obsah, adresaWebu, ODPOVED);
}

async function posli(email, kod, plan, platnaDo, adresaWebu, meno) {
  if (!email || !KLUC || !ODOSIELATEL) return false;
  try {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + KLUC,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: ODOSIELATEL,
        to: [email],
        reply_to: ODPOVED,
        subject: 'Vitaj v GridServise — licencia je aktívna',
        html: html(meno, kod, plan, platnaDo, adresaWebu),
        text: text(kod, plan, platnaDo, adresaWebu)
      })
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

module.exports = { posli: posli, nastavene: function () { return Boolean(KLUC && ODOSIELATEL); } };
