/* POST /api/checkout — založí platbu v Stripe a presmeruje na bránu.

   plan = demo (0 €), mesiac alebo rok. Demo je tiež objednávka, len za
   nulovú sumu: Checkout pri nej nepýta kartu, iba e-mail. Stiahnutie
   sa sprístupní až po dokončení tejto objednávky. */

var { PLANY, stripe, adresaWebu, nastavene } = require('./_stripe');

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
  var plan = String((req.query && req.query.plan) || telo(req).plan || '');
  var p = Object.prototype.hasOwnProperty.call(PLANY, plan) ? PLANY[plan] : null;

  res.setHeader('Cache-Control', 'no-store');

  if (!p) {
    res.status(400).json({ chyba: 'Neznámy plán.' });
    return;
  }

  if (!nastavene()) {
    /* Bez kľúča sa platba založiť nedá. Stránka na to upozorní a ponúkne
       objednávku e-mailom. */
    if (chceJson(req)) { res.status(503).json({ chyba: 'Platobná brána nie je nastavená.' }); return; }
    res.redirect(303, p.spat + '?chyba=brana');
    return;
  }

  var polozka = { quantity: 1 };
  if (p.cena) {
    polozka.price = p.cena;
  } else {
    polozka.price_data = {
      currency: 'eur',
      unit_amount: p.suma,
      product_data: { name: p.nazov, description: p.popis }
    };
  }

  var web = adresaWebu(req);

  try {
    var relacia = await stripe('/checkout/sessions', {
      mode: 'payment',
      locale: 'sk',
      /* Pri nulovej sume Checkout kartu nepýta. */
      payment_method_collection: 'if_required',
      billing_address_collection: 'auto',
      success_url: web + '/hotovo.html?relacia={CHECKOUT_SESSION_ID}',
      cancel_url: web + p.spat + '?zrusene=1',
      metadata: { plan: plan },
      line_items: [polozka]
    });

    if (chceJson(req)) { res.status(200).json({ url: relacia.url }); return; }
    res.redirect(303, relacia.url);
  } catch (e) {
    console.error('checkout:', e.message);
    if (chceJson(req)) {
      res.status(e.stav || 502).json({ chyba: 'Platbu sa nepodarilo založiť.' });
      return;
    }
    res.redirect(303, p.spat + '?chyba=platba');
  }
};
