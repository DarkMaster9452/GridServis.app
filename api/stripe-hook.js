/* POST /api/stripe-hook — udalosti zo Stripe.

   Čo rieši:
     checkout.session.completed   prvá platba → vydá licenciu a pošle kód
     invoice.paid                 obnova → predĺži platnosť, dielňa nič nepocíti
     invoice.payment_failed       neúspešná platba → poznámka, Stripe skúša znova
     customer.subscription.deleted predplatné skončilo → licencia sa zastaví

   Bezpečnosť: podpis sa overuje podľa STRIPE_WEBHOOK_SECRET; keď sa overiť
   nedá (Vercel telo rozparsuje), udalosť sa načíta zo Stripe podľa id. Navyše
   sa každý objekt načíta priamo zo Stripe, takže na podvrhnutú správu sa nedá
   nachytať. */

var crypto = require('crypto');
var { stripe, adresaWebu } = require('./_stripe');
var { predlz, poznamka, zapisPlatbu } = require('./_licencia');
var { sql } = require('./_db');
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

/* predplatné faktúry; od API 2025-03-31.basil je v parent.subscription_details */
function predplatneFaktury(f) {
  return id(f.subscription) ||
    id(f.parent && f.parent.subscription_details && f.parent.subscription_details.subscription);
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ chyba: 'Len POST.' });
    return;
  }

  /* Vercel telo s hlavičkou application/json prečíta a rozparsuje sám
     (bodyParser: false platí len v Next.js), takže surové bajty, z ktorých
     Stripe počítal podpis, často nemáme. JSON.stringify ich nevráti — Stripe
     posiela telo s odsadením. Preto: keď surové telo máme, overí sa podpis;
     keď nie, udalosť sa načíta priamo zo Stripe podľa id. */
  var surovyText = null;
  var udalost;
  try {
    if (Buffer.isBuffer(req.body)) surovyText = req.body.toString('utf8');
    else if (typeof req.body === 'string') surovyText = req.body;
    else if (req.body && typeof req.body === 'object') udalost = req.body;
    else surovyText = await surove(req);
    if (surovyText !== null) udalost = JSON.parse(surovyText);
  } catch (e) {
    res.status(400).json({ chyba: 'Telo sa nepodarilo prečítať.' });
    return;
  }

  /* udalosti, ktoré nespracúvame (napr. billing_portal.* pri otvorení portálu),
     potvrdíme hneď — inak by ich Stripe opakoval a hlásil webhook ako zlyhávajúci */
  var SPRACUVANE = ['checkout.session.completed', 'invoice.paid', 'invoice.payment_succeeded',
    'invoice.payment_failed', 'customer.subscription.deleted'];
  var typTela = String((udalost && udalost.type) || '');
  if (typTela && SPRACUVANE.indexOf(typTela) === -1) {
    console.log('stripe-hook: ignorujem', typTela);
    res.status(200).json({ ok: true, ignorovane: true });
    return;
  }

  var overena = Boolean(TAJOMSTVO && surovyText !== null &&
    podpisSedi(surovyText, req.headers['stripe-signature']));

  if (!overena) {
    var idUdalosti = String((udalost && udalost.id) || '');
    if (!/^evt_[A-Za-z0-9_]{8,120}$/.test(idUdalosti)) {
      console.error('stripe-hook: nesedí podpis a chýba id udalosti', JSON.stringify({
        telo: surovyText === null ? typeof req.body : 'text ' + surovyText.length + ' B',
        kluce: udalost && typeof udalost === 'object' ? Object.keys(udalost).slice(0, 12) : [],
        typ: typTela, id: idUdalosti.slice(0, 12), objekt: udalost && udalost.object,
        agent: String(req.headers['user-agent'] || '').slice(0, 60)
      }));
      res.status(400).json({ chyba: 'Neplatný podpis.' });
      return;
    }
    try {
      /* udalosť, ktorá nie je v našom Stripe účte, tu skončí na 404 */
      udalost = await stripe('/events/' + idUdalosti);
      console.log('stripe-hook: podpis sa nedal overiť (' +
        (surovyText === null ? 'telo prišlo rozparsované' : 'nesedí') + '), udalosť overená cez API', idUdalosti);
    } catch (e) {
      if (e.stav === 404) {
        console.error('stripe-hook: neznáma udalosť', idUdalosti);
        res.status(400).json({ chyba: 'Neplatný podpis.' });
        return;
      }
      console.error('stripe-hook: overenie cez API zlyhalo', e.message);
      res.status(500).json({ chyba: 'Overenie zlyhalo.' });
      return;
    }
  }

  var typ = String(udalost.type || '');
  var objekt = (udalost.data && udalost.data.object) || {};
  var web = adresaWebu(req);

  try {
    if (typ === 'checkout.session.completed') {
      /* načítame reláciu priamo zo Stripe, nie z tela správy */
      var relacia = await stripe('/checkout/sessions/' + objekt.id);
      var meta = relacia.metadata || {};

      /* presun licencie na iný počítač — nevydáva sa licencia, len sa uvoľní PC */
      if (meta.typ === 'presun') {
        await sql('DELETE FROM zariadenia WHERE kod = $1 AND odtlacok = $2', [meta.kod, meta.pc]);
        await zapisPlatbu({
          stripe_id: relacia.id,
          druh: 'presun',
          plan: 'presun',
          email: (relacia.customer_details && relacia.customer_details.email) || '',
          suma: relacia.amount_total,
          mena: relacia.currency || 'eur',
          kod: meta.kod,
          poznamka: 'presun na iný počítač · uvoľnený odtlačok ' + meta.pc
        });
        var email = require('./_email');
        if (email.posliPresun) {
          await email.posliPresun((relacia.customer_details && relacia.customer_details.email) || '', meta.kod, web);
        }
        console.log('stripe-hook: presun', objekt.id, 'licencia ' + meta.kod + ' PC uvoľnený');
        res.status(200).json({ ok: true });
        return;
      }

      var v = await spracuj(relacia, web);
      console.log('stripe-hook: checkout', objekt.id, v && v.kod ? 'licencia ' + v.kod : 'bez licencie');

    } else if (typ === 'invoice.paid' || typ === 'invoice.payment_succeeded') {
      var faktura = await stripe('/invoices/' + objekt.id);
      /* prvú faktúru predplatného už vybavil checkout — nezapisujeme ju dvakrát */
      var subFaktury = predplatneFaktury(faktura);
      if (faktura.billing_reason !== 'subscription_create' && subFaktury) {
        var predplatne = await stripe('/subscriptions/' + subFaktury);
        var o = await predlz(subFaktury, koniecObdobia(predplatne), {
          stripe_id: faktura.id,
          email: faktura.customer_email || '',
          suma: faktura.amount_paid,
          mena: faktura.currency
        });
        console.log('stripe-hook: obnova', subFaktury,
          o ? 'licencia ' + o.kod + ' do ' + o.platna_do : 'licencia sa nenašla');
        if (o && faktura.customer_email && faktura.amount_paid > 0) {
          await require('./_email').posliObnovaZaplatena(faktura.customer_email, {
            meno: faktura.customer_name || '', kod: o.kod, platnaDo: o.platna_do,
            suma: faktura.amount_paid, mena: faktura.currency,
            faktura: faktura.invoice_pdf || faktura.hosted_invoice_url || '',
            kluc: 'obnova-' + faktura.id
          }, web);
        }
      }

    } else if (typ === 'invoice.payment_failed') {
      var neuspesna = await stripe('/invoices/' + objekt.id);
      var subNeuspesnej = predplatneFaktury(neuspesna);
      if (subNeuspesnej) {
        await zapisPlatbu({
          stripe_id: neuspesna.id,
          druh: 'obnova',
          stav: 'neuspesna',
          email: neuspesna.customer_email || '',
          suma: neuspesna.amount_due,
          mena: neuspesna.currency,
          stripe_zakaznik: id(neuspesna.customer),
          stripe_predplatne: subNeuspesnej
        });
        var kodNeuspesnej = await poznamka(subNeuspesnej,
          'platba neprešla ' + new Date().toISOString().slice(0, 10));
        /* e-mail len pri prvom neúspechu — Stripe potom skúša znova a každý
           ďalší pokus by poslal ďalší e-mail */
        if (neuspesna.customer_email && (neuspesna.attempt_count || 1) <= 1) {
          await require('./_email').posliPlatbaNepresla(neuspesna.customer_email, {
            meno: neuspesna.customer_name || '', kod: kodNeuspesnej || '',
            suma: neuspesna.amount_due, mena: neuspesna.currency,
            faktura: neuspesna.hosted_invoice_url || '',
            kluc: 'platba-' + neuspesna.id
          }, web);
        }
      }

    } else if (typ === 'customer.subscription.deleted') {
      /* predplatné skončilo — licencia sa zastaví, dáta v programe zostávajú */
      var kod = await poznamka(objekt.id,
        'predplatné skončilo ' + new Date().toISOString().slice(0, 10));
      if (kod) {
        await sql("UPDATE licencie SET platna_do = current_date WHERE kod = $1", [kod]);
        var lic = await require('./_db').riadok(
          "SELECT COALESCE(NULLIF(email, ''), kontakt) AS email, dielna FROM licencie WHERE kod = $1", [kod]);
        if (lic && /@/.test(lic.email || '')) {
          await require('./_email').posliKoniecPredplatneho(lic.email, {
            meno: lic.dielna && lic.dielna !== lic.email ? lic.dielna : '', kod: kod,
            kluc: 'koniec-' + objekt.id
          }, web);
        }
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
