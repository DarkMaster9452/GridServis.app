/* Spoločný pomocník pre Stripe. Volá REST API cez fetch, aby web
   nepotreboval žiadnu závislosť ani build krok.

   Tajný kľúč je len na serveri, do prehliadača sa nedostane. */

var KLUC = process.env.STRIPE_SECRET_KEY || '';
var API = process.env.STRIPE_API || 'https://api.stripe.com';

/* Musí byť aspoň 2025-03-31.basil — staršie verzie API Managed Payments
   (zapnuté na účte) vôbec nepoznajú a každú reláciu rovno odmietnu.
   Objednávky za 0 € (demo) zvláda Checkout od 2023-08-16, takže v tejto
   verzii to naďalej funguje. */
var VERZIA = '2025-03-31.basil';

/* Managed Payments odmietne položku bez daňového kódu produktu
   ("the product tax code is missing"). txcd_10103001 = Software as a Service,
   business use — program sa predáva dielňam ako predplatné. Pre ceny
   zo STRIPE_PRICE_* treba kód nastaviť na produkte v Stripe dashboarde. */
var DANOVY_KOD = process.env.STRIPE_TAX_CODE || 'txcd_10103001';

/* Plány. Sumy sú v centoch a musia sedieť s cenami na webe
   (CENY v tools/gen.py a v assets/js/main.js).
   STRIPE_PRICE_* je nepovinné: keď je vyplnené, použije sa cena
   založená v Stripe a suma nižšie sa ignoruje. */
var PLANY = {
  demo: {
    suma: 0,
    obdobie: '',                 // jednorazová objednávka, nie predplatné
    nazov: 'GridServis — demo',
    popis: 'Bezplatné stiahnutie dema programu GridServis.',
    cena: process.env.STRIPE_PRICE_DEMO || '',
    spat: '/stiahnut.html'
  },
  mesiac: {
    suma: 1999,
    obdobie: 'month',
    nazov: 'GridServis — mesačné predplatné',
    popis: 'Predplatné programu GridServis na jeden počítač, obnovuje sa každý mesiac.',
    cena: process.env.STRIPE_PRICE_MESIAC || '',
    spat: '/cennik.html',
    dalsi: {
      suma: 999,
      nazov: 'GridServis — ďalší počítač (mesačne)',
      popis: 'Každý ďalší počítač k mesačnému predplatnému GridServis.',
      cena: process.env.STRIPE_PRICE_MESIAC_PC || ''
    }
  },
  rok: {
    suma: 19999,
    obdobie: 'year',
    nazov: 'GridServis — ročné predplatné',
    popis: 'Predplatné programu GridServis na jeden počítač, obnovuje sa každý rok.',
    cena: process.env.STRIPE_PRICE_ROK || '',
    spat: '/cennik.html',
    dalsi: {
      suma: 9999,
      nazov: 'GridServis — ďalší počítač (ročne)',
      popis: 'Každý ďalší počítač k ročnému predplatnému GridServis.',
      cena: process.env.STRIPE_PRICE_ROK_PC || ''
    }
  },
  presun: {
    suma: 500,
    obdobie: '',                 // jednorazový poplatok, nie predplatné
    nazov: 'GridServis — presun licencie na iný počítač',
    popis: 'Jednorazový poplatok za uvoľnenie počítača a presun licencie na iný.',
    cena: process.env.STRIPE_PRICE_PRESUN || '',
    spat: '/presun.html'
  }
};

/* Koľko počítačov sa dá objednať cez web; viac sa dohodne e-mailom.
   Rovnaké číslo je v tools/gen.py (MAX_PC). */
var MAX_PC = 10;

function pocetPc(hodnota) {
  var n = parseInt(hodnota, 10);
  if (!(n >= 1)) return 1;
  return Math.min(n, MAX_PC);
}

/* Položky do pokladne: prvý počítač za plnú cenu, každý ďalší za cenu
   z `dalsi`. Pri predplatnom sa obe položky obnovujú spolu. */
function polozky(p, pocitace) {
  function polozka(zdroj, kusov) {
    var x = { quantity: kusov };
    if (zdroj.cena) {
      x.price = zdroj.cena;
    } else {
      x.price_data = {
        currency: 'eur',
        unit_amount: zdroj.suma,
        product_data: { name: zdroj.nazov, description: zdroj.popis, tax_code: DANOVY_KOD }
      };
      if (p.obdobie) x.price_data.recurring = { interval: p.obdobie };
    }
    return x;
  }
  var vysledok = [polozka(p, 1)];
  var navyse = pocetPc(pocitace) - 1;
  if (navyse > 0 && p.dalsi) vysledok.push(polozka(p.dalsi, navyse));
  return vysledok;
}

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
      'User-Agent': 'gridservis-web'
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
    typ: (r.metadata && r.metadata.typ) || '',
    kod: (r.metadata && r.metadata.kod) || '',
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
  DANOVY_KOD: DANOVY_KOD,
  MAX_PC: MAX_PC,
  pocetPc: pocetPc,
  polozky: polozky,
  stripe: stripe,
  chyba: chyba,
  jeRelacia: jeRelacia,
  overRelaciu: overRelaciu,
  adresaWebu: adresaWebu,
  nastavene: function () { return Boolean(KLUC); }
};
