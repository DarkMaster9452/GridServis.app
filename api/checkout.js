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
    /* Predplatné potrebuje opakovanie; demo za 0 € je jednorazová objednávka. */
    if (p.obdobie) polozka.price_data.recurring = { interval: p.obdobie };
  }

  var web = adresaWebu(req);

  try {
    var poziadavka = {
      mode: p.obdobie ? 'subscription' : 'payment',
      locale: 'sk',
      /* Pri nulovej sume Checkout kartu nepýta sám, od verzie API
         2023-08-16 je to predvolené správanie jednorazovej platby.
         Parameter payment_method_collection sa sem neposiela, v tomto
         režime ho Stripe neberie. */
      billing_address_collection: 'auto',
      /* Predávajúci daň neúčtuje a ceny sú konečné, takže automatický
         výpočet dane sa vypína. Keby zostal zapnutý (Stripe Tax na účte),
         Checkout by pri položke pýtal daňový kód a reláciu by odmietol. */
      automatic_tax: { enabled: false },
      success_url: web + '/hotovo.html?relacia={CHECKOUT_SESSION_ID}',
      cancel_url: web + p.spat + '?zrusene=1',
      metadata: { plan: plan },
      line_items: [polozka]
    };
    /* nech je plán vidieť aj na predplatnom, nielen na objednávke */
    if (p.obdobie) poziadavka.subscription_data = { metadata: { plan: plan } };

    var relacia = await stripe('/checkout/sessions', poziadavka);

    if (chceJson(req)) { res.status(200).json({ url: relacia.url }); return; }
    res.redirect(303, relacia.url);
  } catch (e) {
    /* Hláška zo Stripe ide do logu funkcie (Vercel → Logs) a skrátená
       aj na stránku, aby bolo pri nastavovaní vidieť, čo mu vadí. */
    console.error('checkout:', plan, e.message);
    if (chceJson(req)) {
      res.status(e.stav || 502).json({ chyba: 'Platbu sa nepodarilo založiť.', dovod: e.message });
      return;
    }
    res.redirect(303, p.spat + '?chyba=platba&dovod=' +
      encodeURIComponent(String(e.message || '').slice(0, 150)));
  }
};
