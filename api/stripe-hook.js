/* POST /api/stripe-hook — udalosti zo Stripe.

   Čo rieši:
     checkout.session.completed   prvá platba → vydá licenciu a pošle kód
     invoice.paid                 obnova → predĺži platnosť, dielňa nič nepocíti
     invoice.payment_failed       neúspešná platba → poznámka, Stripe skúša znova
     customer.subscription.deleted predplatné skončilo → licencia sa zastaví

   Bezpečnosť: podpis sa overuje podľa STRIPE_WEBHOOK_SECRET a navyše sa každý
   objekt načíta priamo zo Stripe, takže na podvrhnutú správu sa nedá nachytať. */

var crypto = require('crypto');
var { stripe, adresaWebu } = require('./_stripe');
var { predlz, poznamka, zapisPlatbu } = require('./_licencia');
var { spracuj, koniecObdobia } = require('./_objednavka');

var TAJOMSTVO = process.env.STRIPE_WEBHOOK_SECRET || '';
var TOLERANCIA = 300;         // sekúnd, o koľko smie byť správa stará

function surove(req) {
  return new Promise(function (hotovo, zle) {
    var kusy = [];
    req.on('data', function (k) { kusy.push(k); });
    req.on('end', function () { hotovo(Buffer.concat(kusy).toString('utf8')); });
    req.on('error', zle);
  });
}

function podpisSedi(telo, hlavicka) {
  var casti = String(hlavicka || '').split(',');
  var cas = '';
  var podpisy = [];
  casti.forEach(function (c) {
    var kus = c.split('=');
    if (kus[0] === 't') cas = kus[1];
    if (kus[0] === 'v1') podpisy.push(kus[1]);
  });
  if (!cas || !podpisy.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(cas)) > TOLERANCIA) return false;

  var ocakavany = crypto.createHmac('sha256', TAJOMSTVO)
    .update(cas + '.' + telo).digest('hex');
  return podpisy.some(function (p) {
    var a = Buffer.from(ocakavany);
    var b = Buffer.from(String(p));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function id(hodnota) {
  if (!hodnota) return '';
  return typeof hodnota === 'string' ? hodnota : String(hodnota.id || '');
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ chyba: 'Len POST.' });
    return;
  }

  var telo;
  try {
    telo = typeof req.body === 'string' ? req.body
      : (req.body ? JSON.stringify(req.body) : await surove(req));
  } catch (e) {
    res.status(400).json({ chyba: 'Telo sa nepodarilo prečítať.' });
    return;
  }

  if (TAJOMSTVO && !podpisSedi(telo, req.headers['stripe-signature'])) {
    console.error('stripe-hook: nesedí podpis');
    res.status(400).json({ chyba: 'Neplatný podpis.' });
    return;
  }

  var udalost;
  try {
    udalost = JSON.parse(telo);
  } catch (e) {
    res.status(400).json({ chyba: 'Telo nie je JSON.' });
    return;
  }

  var typ = String(udalost.type || '');
  var objekt = (udalost.data && udalost.data.object) || {};
  var web = adresaWebu(req);

  try {
    if (typ === 'checkout.session.completed') {
      /* načítame reláciu priamo zo Stripe, nie z tela správy */
      var relacia = await stripe('/checkout/sessions/' + objekt.id);
      var v = await spracuj(relacia, web);
      console.log('stripe-hook: checkout', objekt.id, v && v.kod ? 'licencia ' + v.kod : 'bez licencie');

    } else if (typ === 'invoice.paid' || typ === 'invoice.payment_succeeded') {
      var faktura = await stripe('/invoices/' + objekt.id);
      /* prvú faktúru predplatného už vybavil checkout — nezapisujeme ju dvakrát */
      if (faktura.billing_reason !== 'subscription_create' && id(faktura.subscription)) {
        var predplatne = await stripe('/subscriptions/' + id(faktura.subscription));
        var o = await predlz(id(faktura.subscription), koniecObdobia(predplatne), {
          stripe_id: faktura.id,
          email: faktura.customer_email || '',
          suma: faktura.amount_paid,
          mena: faktura.currency
        });
        console.log('stripe-hook: obnova', id(faktura.subscription),
          o ? 'licencia ' + o.kod + ' do ' + o.platna_do : 'licencia sa nenašla');
      }

    } else if (typ === 'invoice.payment_failed') {
      var neuspesna = await stripe('/invoices/' + objekt.id);
      if (id(neuspesna.subscription)) {
        await zapisPlatbu({
          stripe_id: neuspesna.id,
          druh: 'obnova',
          stav: 'neuspesna',
          email: neuspesna.customer_email || '',
          suma: neuspesna.amount_due,
          mena: neuspesna.currency,
          stripe_zakaznik: id(neuspesna.customer),
          stripe_predplatne: id(neuspesna.subscription)
        });
        await poznamka(id(neuspesna.subscription),
          'platba neprešla ' + new Date().toISOString().slice(0, 10));
      }

    } else if (typ === 'customer.subscription.deleted') {
      /* predplatné skončilo — licencia sa zastaví, dáta v programe zostávajú */
      var kod = await poznamka(objekt.id,
        'predplatné skončilo ' + new Date().toISOString().slice(0, 10));
      if (kod) {
        var { sql } = require('./_db');
        await sql("UPDATE licencie SET platna_do = current_date WHERE kod = $1", [kod]);
      }
      console.log('stripe-hook: koniec predplatného', objekt.id, kod || '');
    }
  } catch (e) {
    console.error('stripe-hook:', typ, e.message);
    /* 500 → Stripe to skúsi znova, nič sa nestratí */
    res.status(500).json({ chyba: 'Spracovanie zlyhalo.' });
    return;
  }

  res.status(200).json({ ok: true });
};

/* telo musí zostať také, aké prišlo — inak nesedí podpis */
module.exports.config = { api: { bodyParser: false } };
