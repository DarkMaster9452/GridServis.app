/* /api/admin/<akcia> — úlohy mimo bežnej objednávky. Len s tajným kľúčom.

   Akcie:
     GET  cron[?nanecisto=1]   denné e-maily (spúšťa Vercel Cron, viď vercel.json):
                                 * skúšobná licencia končí o 7 dní
                                 * týždeň po deme → plná verzia (nie prvým 5,
                                   tí dostali ponuku 3 mesiacov zadarmo)
                                 * mesiac po kúpe → hodnotenie 1–10
                                 * deň po vydaní novej verzie → čo je nové
                               nanecisto=1 nič nepošle, len vráti, komu by išlo
     POST skusobna { email, meno?, mesiace? }
                               vydá skúšobnú licenciu (predvolene 3 mesiace)
                               a pošle e-mail s kódom

   Overenie: hlavička Authorization: Bearer <CRON_SECRET alebo GRIDSERVIS_ADMIN_TOKEN>.
   Vercel Cron posiela CRON_SECRET sám, keď je nastavený v premenných. Bez
   nastaveného kľúča je endpoint vypnutý.

   Všetko je v jednom súbore, lebo Vercel Hobby dovolí najviac 12 funkcií. */

var crypto = require('crypto');
var { sql, riadok } = require('../_db');
var { adresaWebu } = require('../_stripe');
var { volnyKod, zapisPlatbu } = require('../_licencia');
var { posledneVydanie } = require('../_release');
var { jeVlastnyEmail } = require('../_objednavka');
var email = require('../_email');

var KLUCE = [process.env.CRON_SECRET, process.env.GRIDSERVIS_ADMIN_TOKEN].filter(Boolean);
var MAX_RECENZII = parseInt(process.env.GRIDSERVIS_RECENZIE_MAX || '5', 10);
var MAX_NA_BEH = 80;            // e-mailov za jeden beh (limit času funkcie)
var PAUZA_MS = 600;             // Resend dovolí 2 požiadavky za sekundu
var JE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function overeny(req) {
  var h = String(req.headers.authorization || '');
  if (!KLUCE.length || h.indexOf('Bearer ') !== 0) return false;
  var dany = Buffer.from(h.slice(7));
  return KLUCE.some(function (k) {
    var b = Buffer.from(k);
    return b.length === dany.length && crypto.timingSafeEqual(b, dany);
  });
}

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function den(posun) {
  var d = new Date(Date.now() + posun * 86400000);
  return d.toISOString().slice(0, 10);
}

function pauza() {
  return new Promise(function (hotovo) { setTimeout(hotovo, PAUZA_MS); });
}

/* ---------- jednotlivé denné úlohy: každá vráti zoznam { email, posli } ---------- */

async function koniecSkusobnych(web) {
  var riadky = await sql(
    `SELECT kod, COALESCE(NULLIF(email, ''), kontakt) AS email, dielna, platna_do
       FROM licencie
      WHERE typ_licencie = 'trial_admin' AND stav = 'aktivna'
        AND platna_do = current_date + 7`);
  return riadky.filter(function (r) { return JE_EMAIL.test(r.email || ''); }).map(function (r) {
    return {
      email: r.email, uloha: 'koniec-skusobnej',
      posli: function () {
        return email.posliKoniecSkusobnej(r.email, {
          meno: r.dielna && r.dielna !== r.email ? r.dielna : '', kod: r.kod, platnaDo: r.platna_do,
          kluc: 'koniec-skusobnej-' + r.kod
        }, web);
      }
    };
  });
}

async function demoPlnaVerzia(web) {
  /* prví zákazníci dema podľa prvej objednávky — tí dostali ponuku zadarmo */
  var dema = await sql(
    `SELECT lower(email) AS email, min(cas)::date::text AS prve
       FROM platby WHERE plan = 'demo' AND email <> ''
      GROUP BY 1 ORDER BY min(cas)`);
  var platiaci = (await sql(
    `SELECT DISTINCT lower(email) AS email FROM platby
      WHERE plan IN ('mesiac', 'rok') AND email <> ''
     UNION
     SELECT DISTINCT lower(COALESCE(NULLIF(email, ''), kontakt)) FROM licencie`))
    .map(function (r) { return r.email; });

  var ini = dema.filter(function (r) { return !jeVlastnyEmail(r.email); });
  var prvi = ini.slice(0, MAX_RECENZII).map(function (r) { return r.email; });
  var pred7 = den(-7);

  return ini.filter(function (r) {
    return r.prve === pred7 && prvi.indexOf(r.email) === -1 && platiaci.indexOf(r.email) === -1;
  }).map(function (r) {
    return {
      email: r.email, uloha: 'demo-plna',
      posli: function () { return email.posliDemoPlnaVerzia(r.email, web, '', 'demo-plna-' + r.email); }
    };
  });
}

async function dotaznik(web) {
  var riadky = await sql(
    `SELECT DISTINCT lower(email) AS email FROM platby
      WHERE druh = 'checkout' AND plan IN ('mesiac', 'rok') AND email <> ''
        AND cas::date = current_date - 30`);
  return riadky.filter(function (r) { return !jeVlastnyEmail(r.email); }).map(function (r) {
    return {
      email: r.email, uloha: 'dotaznik',
      posli: function () { return email.posliDotaznik(r.email, web, '', 'dotaznik-' + r.email); }
    };
  });
}

async function novaVerzia(web) {
  if (!process.env.RELEASE_REPO) return [];
  var v = await posledneVydanie(false);
  var vydane = String(v.rel.published_at || '').slice(0, 10);
  /* cron beží raz denne, takže každé vydanie spracuje práve raz — deň po ňom */
  if (!vydane || vydane !== den(-1) || v.rel.prerelease || v.rel.draft) return [];
  var verzia = String(v.rel.tag_name || v.rel.name || '').replace(/^v/, '');
  var riadky = await sql(
    `SELECT DISTINCT lower(COALESCE(NULLIF(email, ''), kontakt)) AS email FROM licencie
      WHERE stav = 'aktivna' AND (platna_do IS NULL OR platna_do >= current_date)`);
  return riadky.filter(function (r) { return JE_EMAIL.test(r.email || ''); }).map(function (r) {
    return {
      email: r.email, uloha: 'nova-verzia',
      posli: function () {
        return email.posliNovaVerzia(r.email, {
          verzia: verzia, poznamky: v.rel.body || '', kluc: 'verzia-' + verzia + '-' + r.email
        }, web);
      }
    };
  });
}

async function cron(req, res) {
  var nanecisto = String((req.query && req.query.nanecisto) || '') === '1';
  var web = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/+$/, '') : 'https://www.gridservis.app';
  var ulohy = [koniecSkusobnych, demoPlnaVerzia, dotaznik, novaVerzia];
  var zoznam = [];
  var chyby = [];
  for (var i = 0; i < ulohy.length; i++) {
    try { zoznam = zoznam.concat(await ulohy[i](web)); }
    catch (e) { chyby.push(ulohy[i].name + ': ' + e.message); console.error('cron:', ulohy[i].name, e.message); }
  }

  var odoslane = 0;
  var prehlad = [];
  for (var j = 0; j < zoznam.length && j < MAX_NA_BEH; j++) {
    var z = zoznam[j];
    var ok = null;
    if (!nanecisto) {
      ok = await z.posli();
      if (ok) odoslane++;
      await pauza();
    }
    prehlad.push({ uloha: z.uloha, email: z.email, odoslane: ok });
  }
  if (zoznam.length > MAX_NA_BEH) chyby.push('neodoslaných pre limit: ' + (zoznam.length - MAX_NA_BEH));

  console.log('cron:', nanecisto ? 'nanečisto' : 'odoslané ' + odoslane + '/' + Math.min(zoznam.length, MAX_NA_BEH),
    chyby.length ? 'chyby: ' + chyby.join(' | ') : '');
  res.status(200).json({ ok: true, nanecisto: nanecisto, odoslane: odoslane, emaily: prehlad, chyby: chyby });
}

async function skusobna(req, res) {
  var u = telo(req);
  var adresa = String(u.email || '').trim().toLowerCase();
  var meno = String(u.meno || '').trim().slice(0, 120);
  var mesiace = Math.min(12, Math.max(1, parseInt(u.mesiace || '3', 10) || 3));
  if (!JE_EMAIL.test(adresa)) {
    res.status(400).json({ ok: false, chyba: 'Chýba platný e-mail.' });
    return;
  }

  var uz = await riadok(
    `SELECT kod, platna_do FROM licencie
      WHERE typ_licencie = 'trial_admin' AND stav = 'aktivna' AND platna_do >= current_date
        AND (lower(email) = $1 OR lower(kontakt) = $1)`, [adresa]);
  if (uz) {
    res.status(409).json({ ok: false, chyba: 'Tento e-mail už má aktívnu skúšobnú licenciu.', kod: uz.kod, platna_do: uz.platna_do });
    return;
  }

  var kod = await volnyKod();
  var l = await riadok(
    `INSERT INTO licencie (kod, dielna, kontakt, email, max_zariadeni, platna_do, stav, poznamka, typ_licencie)
     VALUES ($1, $2, $3, $3, 1, (current_date + make_interval(months => $4::int))::date, 'aktivna', $5, 'trial_admin')
     RETURNING platna_do::text AS platna_do`,
    [kod, meno || adresa, adresa, mesiace, 'GridServis web · ' + email.mesiaceText(mesiace) + ' zadarmo za spätnú väzbu']);
  await zapisPlatbu({
    stripe_id: 'skusobna-' + kod, druh: 'skusobna', plan: 'skusobna', email: adresa,
    suma: 0, mena: 'eur', kod: kod, poznamka: email.mesiaceText(mesiace) + ' zadarmo za spätnú väzbu'
  });
  var poslany = await email.posliSkusobnu(adresa, {
    meno: meno, kod: kod, platnaDo: l.platna_do, mesiace: mesiace, kluc: 'skusobna-' + kod
  }, adresaWebu(req));

  console.log('admin: skúšobná licencia', kod, 'do', l.platna_do, poslany ? 'e-mail odoslaný' : 'e-mail NEodoslaný');
  res.status(200).json({ ok: true, kod: kod, platna_do: l.platna_do, poslany: poslany });
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!overeny(req)) {
    res.status(401).json({ ok: false, chyba: 'Neoprávnený prístup.' });
    return;
  }
  var akcia = String((req.query && req.query.akcia) || '');
  try {
    if (akcia === 'cron') { await cron(req, res); return; }
    if (akcia === 'skusobna' && req.method === 'POST') { await skusobna(req, res); return; }
    res.status(404).json({ ok: false, chyba: 'Neznáma akcia.' });
  } catch (e) {
    console.error('admin:', akcia, e.message);
    res.status(500).json({ ok: false, chyba: e.message });
  }
};
