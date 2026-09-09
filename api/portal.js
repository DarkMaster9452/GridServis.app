/* POST /api/portal — odkaz do Stripe portálu, kde sa dá zrušiť obnova.

   Volá to program z Nastavení: pošle licenčný kód a odtlačok počítača.
   Odkaz dostane len ten, kto má kód a zároveň sedí ako aktivované zariadenie,
   takže sa k cudziemu predplatnému nikto nedostane. */

var { stripe, adresaWebu, nastavene } = require('./_stripe');
var { riadok } = require('./_db');

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var u = telo(req);
  var kod = String((req.query && req.query.kod) || u.kod || '').trim().toUpperCase();
  var odtlacok = String((req.query && req.query.odtlacok) || u.odtlacok || '').trim();

  if (!kod || !odtlacok) {
    res.status(400).json({ ok: false, chyba: 'Chýba licenčný kód alebo odtlačok počítača.' });
    return;
  }
  if (!nastavene()) {
    res.status(503).json({ ok: false, chyba: 'Platobná brána nie je nastavená.' });
    return;
  }

  try {
    var zariadenie = await riadok(
      `SELECT 1 FROM zariadenia WHERE kod = $1 AND odtlacok = $2 AND stav = 'aktivne'`,
      [kod, odtlacok]);
    if (!zariadenie) {
      res.status(403).json({ ok: false, chyba: 'Tento počítač nie je aktivovaný na daný kód.' });
      return;
    }

    var platba = await riadok(
      `SELECT stripe_zakaznik FROM platby
        WHERE kod = $1 AND stripe_zakaznik IS NOT NULL
        ORDER BY cas DESC LIMIT 1`, [kod]);
    if (!platba) {
      res.status(404).json({
        ok: false,
        chyba: 'K tejto licencii nie je predplatné cez web. Napíšte predajcovi.'
      });
      return;
    }

    var relacia = await stripe('/billing_portal/sessions', {
      customer: platba.stripe_zakaznik,
      return_url: adresaWebu(req) + '/index.html',
      locale: 'sk'
    });
    res.status(200).json({ ok: true, url: relacia.url });
  } catch (e) {
    console.error('portal:', e.message);
    res.status(e.stav || 502).json({ ok: false, chyba: 'Odkaz sa nepodarilo pripraviť.' });
  }
};
