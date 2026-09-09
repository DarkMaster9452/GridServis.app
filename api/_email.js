/* Odoslanie licenčného kódu e-mailom cez Resend.

   Keď nie je nastavený RESEND_API_KEY alebo RESEND_FROM, e-mail sa nepošle
   a nič sa nepokazí — kód zostáva na stránke po platbe a v admin aplikácii.
   Odosielanie preto nikdy nesmie zhodiť vydanie licencie. */

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

async function posli(email, kod, plan, platnaDo, adresaWebu) {
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
        subject: 'GridServis — licenčný kód ' + kod,
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
