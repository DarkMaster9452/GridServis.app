/* Spoločný pomocník pre Stripe. Volá REST API cez fetch, aby web
   nepotreboval žiadnu závislosť ani build krok.

   Tajný kľúč je len na serveri, do prehliadača sa nedostane. */

var KLUC = process.env.STRIPE_SECRET_KEY || '';
var API = process.env.STRIPE_API || 'https://api.stripe.com';

/* Od verzie 2023-08-16 zvláda Checkout objednávky za 0 €, teda demo. */
var VERZIA = '2023-08-16';

/* Plány. Sumy sú v centoch a musia sedieť s cenami na webe
   (CENY v tools/gen.py a v assets/js/main.js).
   STRIPE_PRICE_* je nepovinné: keď je vyplnené, použije sa cena
   založená v Stripe a suma nižšie sa ignoruje. */
var PLANY = {
  demo: {
    suma: 0,
    obdobie: '',                 // jednorazová objednávka, nie predplatné
    nazov: 'AutoAgenda — demo',
    popis: 'Bezplatné stiahnutie dema programu AutoAgenda.',
    cena: process.env.STRIPE_PRICE_DEMO || '',
    spat: '/stiahnut.html'
  },
  mesiac: {
    suma: 1999,
    obdobie: 'month',
    nazov: 'AutoAgenda — mesačné predplatné',
    popis: 'Predplatné programu AutoAgenda na jeden počítač, obnovuje sa každý mesiac.',
    cena: process.env.STRIPE_PRICE_MESIAC || '',
    spat: '/cennik.html'
  },
  rok: {
    suma: 19999,
    obdobie: 'year',
    nazov: 'AutoAgenda — ročné predplatné',
    popis: 'Predplatné programu AutoAgenda na jeden počítač, obnovuje sa každý rok.',
    cena: process.env.STRIPE_PRICE_ROK || '',
    spat: '/cennik.html'
  }
};

function chyba(stav, sprava) {
  var e = new Error(sprava);
  e.stav = stav;
  return e;
}

/* Stripe berie telo ako form-encoded s hranatými zátvorkami:
   line_items[0][price_data][currency]=eur */
function zakoduj(hodnota, kluc, von) {
  von = von || [];
  if (hodnota === null || hodnota === undefined) return von;

  if (Array.isArray(hodnota)) {
    hodnota.forEach(function (v, i) { zakoduj(v, kluc + '[' + i + ']', von); });
  } else if (typeof hodnota === 'object') {
    Object.keys(hodnota).forEach(function (k) {
      zakoduj(hodnota[k], kluc ? kluc + '[' + k + ']' : k, von);
    });
  } else {
    von.push(encodeURIComponent(kluc) + '=' + encodeURIComponent(String(hodnota)));
  }
  return von;
}

async function stripe(cesta, telo) {
  if (!KLUC) throw chyba(503, 'Platobná brána nie je nastavená.');

  var moznosti = {
    method: telo ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + KLUC,
      'Stripe-Version': VERZIA,
      'User-Agent': 'autoagenda-web'
    }
  };
  if (telo) {
    moznosti.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    moznosti.body = zakoduj(telo, '').join('&');
  }

  var r = await fetch(API + '/v1' + cesta, moznosti);
  var data = null;
  try { data = await r.json(); } catch (e) { data = null; }

  if (!r.ok) {
    var sprava = (data && data.error && data.error.message) ||
      ('Stripe odpovedal ' + r.status);
    /* Zlý alebo chýbajúci kľúč je chyba nastavenia, nie kupujúceho. */
    if (r.status === 401) throw chyba(503, sprava);
    if (r.status === 404) throw chyba(404, sprava);
    throw chyba(502, sprava);
  }
  return data || {};
}

/* Identifikátor relácie z Checkoutu, napríklad cs_test_a1B2... */
function jeRelacia(id) {
  return typeof id === 'string' && /^cs_[A-Za-z0-9_]{10,200}$/.test(id);
}

/* Zaplatená relácia sprístupní stiahnutie. Demo za 0 € vráti
   payment_status = no_payment_required, preto obe hodnoty. */
async function overRelaciu(id) {
  if (!jeRelacia(id)) throw chyba(400, 'Neplatný identifikátor platby.');

  var r;
  try {
    r = await stripe('/checkout/sessions/' + id);
  } catch (e) {
    if (e.stav === 404) throw chyba(402, 'Objednávka sa nenašla.');
    throw e;
  }

  var ok = r.status === 'complete' &&
    (r.payment_status === 'paid' || r.payment_status === 'no_payment_required');

  if (!ok) throw chyba(402, 'Platba zatiaľ nie je dokončená.');

  return {
    plan: (r.metadata && r.metadata.plan) || '',
    email: (r.customer_details && r.customer_details.email) || '',
    suma: r.amount_total,
    mena: r.currency
  };
}

function adresaWebu(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  var host = req.headers['x-forwarded-host'] || req.headers.host || '';
  var proto = req.headers['x-forwarded-proto'] || 'https';
  return proto + '://' + host;
}

module.exports = {
  PLANY: PLANY,
  stripe: stripe,
  chyba: chyba,
  jeRelacia: jeRelacia,
  overRelaciu: overRelaciu,
  adresaWebu: adresaWebu,
  nastavene: function () { return Boolean(KLUC); }
};
