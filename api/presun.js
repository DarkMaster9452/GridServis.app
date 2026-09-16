/* POST /api/presun  telo: { kod, pc } — presun licencie na iný počítač za 5 €.

   Appka pošle dielňu sem, keď chce uvoľniť tento počítač a prihlásiť sa tým
   istým kódom na novom. Licencia a jej platnosť sa nemenia — mení sa len
   záznam v `zariadenia`, a to až webhook po zaplatení (viď stripe-hook.js). */

var { PLANY, stripe, adresaWebu, nastavene, chyba } = require('./_stripe');
var { riadok } = require('./_db');

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { /* nie je JSON */ }
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return {};
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var u = telo(req);
  var kod = String((req.query && req.query.kod) || u.kod || '').trim().toUpperCase();
  var pc = String((req.query && req.query.pc) || u.pc || '').trim();

  if (!/^[A-Z0-9-]{8,40}$/.test(kod) || !pc) {
    res.status(400).json({ ok: false, chyba: 'Chýba licenčný kód alebo odtlačok počítača.' });
    return;
  }
  if (!nastavene()) {
    res.status(503).json({ ok: false, chyba: 'Platobná brána nie je nastavená.' });
    return;
  }

  try {
    var licencia = await riadok(
      `SELECT kod, kontakt FROM licencie WHERE kod = $1 AND stav = 'aktivna'`, [kod]);
    if (!licencia) {
      res.status(404).json({ ok: false, chyba: 'Takáto aktívna licencia neexistuje.' });
      return;
    }

    var zariadenie = await riadok(
      `SELECT 1 FROM zariadenia WHERE kod = $1 AND odtlacok = $2`, [kod, pc]);
    if (!zariadenie) {
      res.status(404).json({ ok: false, chyba: 'Tento počítač nie je na danú licenciu aktivovaný.' });
      return;
    }

    var cena = PLANY.presun && PLANY.presun.cena;
    if (!cena) throw chyba(503, 'Cena za presun nie je nastavená.');

    var web = adresaWebu(req);
    var relacia = await stripe('/checkout/sessions', {
      mode: 'payment',
      locale: 'sk',
      customer_email: licencia.kontakt || undefined,
      success_url: web + '/hotovo.html?relacia={CHECKOUT_SESSION_ID}',
      cancel_url: web + '/presun.html?kod=' + encodeURIComponent(kod) + '&pc=' + encodeURIComponent(pc) + '&zrusene=1',
      metadata: { typ: 'presun', kod: kod, pc: pc },
      line_items: [{ price: cena, quantity: 1 }]
    });

    res.status(200).json({ ok: true, url: relacia.url });
  } catch (e) {
    console.error('presun:', kod, e.message);
    res.status(e.stav || 502).json({ ok: false, chyba: 'Platbu sa nepodarilo založiť.' });
  }
};
