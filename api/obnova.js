/* POST /api/obnova?kod=MECH-... — nové predplatné na už existujúcu licenciu.

   Sem vedie odkaz, ktorý program ukáže, keď sa licencia zastaví (neprešla
   obnova alebo predplatné skončilo). Po zaplatení sa tá istá licencia
   predĺži — dielňa nezadáva nový kód a o dáta nepríde. */

var { PLANY, stripe, adresaWebu, nastavene } = require('./_stripe');
var { riadok } = require('./_db');

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { /* nie je JSON */ }
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return {};
}

function chceJson(req) {
  return String(req.headers.accept || '').indexOf('application/json') !== -1;
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var u = telo(req);
  var kod = String((req.query && req.query.kod) || u.kod || '').trim().toUpperCase();
  var plan = String((req.query && req.query.plan) || u.plan || '').trim();

  if (!/^[A-Z0-9-]{8,40}$/.test(kod)) {
    res.status(400).json({ ok: false, chyba: 'Neplatný licenčný kód.' });
    return;
  }
  if (!nastavene()) {
    res.redirect(303, '/obnova.html?kod=' + encodeURIComponent(kod) + '&chyba=brana');
    return;
  }

  try {
    var licencia = await riadok(
      'SELECT kod, dielna, kontakt FROM licencie WHERE kod = $1', [kod]);
    if (!licencia) {
      res.status(404).json({ ok: false, chyba: 'Takýto licenčný kód neexistuje.' });
      return;
    }

    /* keď plán nie je zadaný, použije sa ten, ktorý si dielňa kúpila naposledy */
    if (!PLANY[plan] || plan === 'demo') {
      var minula = await riadok(
        `SELECT plan FROM platby WHERE kod = $1 AND plan IN ('rok', 'mesiac')
          ORDER BY cas DESC LIMIT 1`, [kod]);
      plan = (minula && minula.plan) || 'rok';
    }
    var p = PLANY[plan];

    var polozka = { quantity: 1 };
    if (p.cena) {
      polozka.price = p.cena;
    } else {
      polozka.price_data = {
        currency: 'eur',
        unit_amount: p.suma,
        recurring: { interval: p.obdobie },
        product_data: { name: p.nazov, description: p.popis }
      };
    }

    var web = adresaWebu(req);
    var relacia = await stripe('/checkout/sessions', {
      mode: 'subscription',
      locale: 'sk',
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      customer_email: licencia.kontakt || undefined,
      success_url: web + '/hotovo.html?relacia={CHECKOUT_SESSION_ID}',
      cancel_url: web + '/obnova.html?kod=' + encodeURIComponent(kod) + '&zrusene=1',
      metadata: { plan: plan, kod: kod },
      subscription_data: { metadata: { plan: plan, kod: kod } },
      line_items: [polozka]
    });

    if (chceJson(req)) { res.status(200).json({ ok: true, url: relacia.url }); return; }
    res.redirect(303, relacia.url);
  } catch (e) {
    console.error('obnova:', kod, e.message);
    if (chceJson(req)) {
      res.status(e.stav || 502).json({ ok: false, chyba: 'Platbu sa nepodarilo založiť.' });
      return;
    }
    res.redirect(303, '/obnova.html?kod=' + encodeURIComponent(kod) + '&chyba=platba&dovod=' +
      encodeURIComponent(String(e.message || '').slice(0, 150)));
  }
};
