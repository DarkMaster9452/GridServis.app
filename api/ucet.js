/* /api/ucet?akcia=… — SKÚŠOBNÁ správa licencie cez web (len preview).

   Dielňa sa prihlási licenčným kódom a e-mailom, na ktorý bola licencia
   vydaná. Potom vidí všetky svoje licencie, aktivované počítače a platby,
   a odtiaľto si otvorí Stripe portál (zrušenie obnovy, faktúry). Obnova
   a presun na iný počítač idú cez existujúce /api/obnova a /api/presun.

   Dáta z programu (zákazky, sklad…) sem nepatria — tie sú len na počítači
   v dielni. Web k nim ani nemá prístup (pozri _db.js).

   Celé to tvoria len tieto súbory, dajú sa zmazať bez náhrady:
     api/ucet.js, public/ucet.html, public/assets/js/ucet.js,
     public/assets/css/ucet.css

   Akcie:
     POST prihlasit  { kod, email }  → nastaví cookie gs_ucet
     GET  ja                         → licencie, zariadenia, platby
     POST portal     { kod }         → odkaz do Stripe portálu
     POST odhlasit                   → zmaže cookie */

var crypto = require('crypto');
var { sql, riadok } = require('./_db');
var { stripe, adresaWebu, nastavene } = require('./_stripe');

var COOKIE = 'gs_ucet';
var PLATNOST = 8 * 3600;      // sekundy, potom sa treba prihlásiť znova

/* Podpisový kľúč relácie. Najlepšie vlastný UCET_TAJOMSTVO; na skúšku sa
   odvodí z DATABASE_URL, ktorá je tak či tak tajná. */
function kluc() {
  var zaklad = process.env.UCET_TAJOMSTVO || process.env.DATABASE_URL || '';
  if (!zaklad) return null;
  return crypto.createHash('sha256').update('gridservis-ucet|' + zaklad).digest();
}

function podpis(data) {
  return crypto.createHmac('sha256', kluc()).update(data).digest('base64url');
}

function token(email) {
  var data = Buffer.from(JSON.stringify({
    e: email, x: Math.floor(Date.now() / 1000) + PLATNOST
  })).toString('base64url');
  return data + '.' + podpis(data);
}

function overToken(t) {
  if (!t || !kluc()) return null;
  var casti = String(t).split('.');
  if (casti.length !== 2) return null;
  var ocakavany = Buffer.from(podpis(casti[0]));
  var prijaty = Buffer.from(casti[1]);
  if (ocakavany.length !== prijaty.length || !crypto.timingSafeEqual(ocakavany, prijaty)) return null;
  try {
    var o = JSON.parse(Buffer.from(casti[0], 'base64url').toString());
    if (!o.e || !o.x || o.x < Date.now() / 1000) return null;
    return o.e;
  } catch (e) { return null; }
}

function cookie(req, meno) {
  var riadky = String(req.headers.cookie || '').split(';');
  for (var i = 0; i < riadky.length; i++) {
    var c = riadky[i].trim();
    if (c.indexOf(meno + '=') === 0) return decodeURIComponent(c.slice(meno.length + 1));
  }
  return '';
}

function nastavCookie(res, hodnota, vek) {
  res.setHeader('Set-Cookie',
    COOKIE + '=' + encodeURIComponent(hodnota) +
    '; Path=/api/ucet; HttpOnly; Secure; SameSite=Strict; Max-Age=' + vek);
}

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { /* nie je JSON */ }
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return {};
}

function vlastnenaLicencia(kod, email) {
  return riadok(
    `SELECT kod FROM licencie WHERE kod = $1 AND lower(kontakt) = lower($2)`,
    [kod, email]);
}

async function prihlasit(req, res) {
  var u = telo(req);
  var kod = String(u.kod || '').trim().toUpperCase();
  var email = String(u.email || '').trim().toLowerCase();

  if (!/^[A-Z0-9-]{8,40}$/.test(kod) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, chyba: 'Zadajte licenčný kód aj e-mail.' });
    return;
  }
  /* rovnaká odpoveď pre zlý kód aj zlý e-mail — nech sa nedá hádať,
     ktorý z nich existuje */
  if (!(await vlastnenaLicencia(kod, email))) {
    res.status(401).json({ ok: false, chyba: 'Kód a e-mail k sebe nesedia.' });
    return;
  }
  nastavCookie(res, token(email), PLATNOST);
  res.status(200).json({ ok: true });
}

async function ja(req, res, email) {
  var licencie = await sql(
    `SELECT kod, dielna, max_zariadeni, platna_do, stav
       FROM licencie WHERE lower(kontakt) = lower($1)
      ORDER BY platna_do DESC NULLS LAST`, [email]);

  var kody = licencie.map(function (l) { return l.kod; });
  var zariadenia = [];
  var platby = [];
  if (kody.length) {
    /* kódy majú len [A-Z0-9-], takže ich možno bezpečne poslať ako pole */
    var pole = '{' + kody.join(',') + '}';
    zariadenia = await sql(
      `SELECT * FROM zariadenia WHERE kod = ANY($1::text[])`, [pole]);
    platby = await sql(
      `SELECT cas, druh, plan, suma, mena, stav, kod,
              (stripe_zakaznik IS NOT NULL) AS cez_stripe
         FROM platby WHERE kod = ANY($1::text[])
        ORDER BY cas DESC LIMIT 30`, [pole]);
  }

  res.status(200).json({
    ok: true,
    email: email,
    licencie: licencie.map(function (l) {
      return {
        kod: l.kod,
        dielna: l.dielna,
        max_zariadeni: Number(l.max_zariadeni) || 1,
        platna_do: String(l.platna_do || '').slice(0, 10),
        stav: l.stav,
        zariadenia: zariadenia.filter(function (z) { return z.kod === l.kod; }),
        predplatne: platby.some(function (p) { return p.kod === l.kod && p.cez_stripe; })
      };
    }),
    platby: platby.map(function (p) {
      return {
        cas: p.cas, druh: p.druh, plan: p.plan, suma: p.suma,
        mena: p.mena, stav: p.stav, kod: p.kod
      };
    })
  });
}

async function portal(req, res, email) {
  var kod = String(telo(req).kod || '').trim().toUpperCase();
  if (!(await vlastnenaLicencia(kod, email))) {
    res.status(403).json({ ok: false, chyba: 'Táto licencia nepatrí k vášmu účtu.' });
    return;
  }
  if (!nastavene()) {
    res.status(503).json({ ok: false, chyba: 'Platobná brána nie je nastavená.' });
    return;
  }
  var platba = await riadok(
    `SELECT stripe_zakaznik FROM platby
      WHERE kod = $1 AND stripe_zakaznik IS NOT NULL
      ORDER BY cas DESC LIMIT 1`, [kod]);
  if (!platba) {
    res.status(404).json({ ok: false, chyba: 'K tejto licencii nie je predplatné cez web.' });
    return;
  }
  var relacia = await stripe('/billing_portal/sessions', {
    customer: platba.stripe_zakaznik,
    return_url: adresaWebu(req) + '/ucet.html',
    locale: 'sk'
  });
  res.status(200).json({ ok: true, url: relacia.url });
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  var akcia = String((req.query && req.query.akcia) || '');
  var post = req.method === 'POST';

  if (!kluc()) {
    res.status(503).json({ ok: false, chyba: 'Účet nie je nastavený.' });
    return;
  }

  try {
    if (akcia === 'odhlasit' && post) {
      nastavCookie(res, '', 0);
      res.status(200).json({ ok: true });
      return;
    }
    if (akcia === 'prihlasit' && post) { await prihlasit(req, res); return; }

    var email = overToken(cookie(req, COOKIE));
    if (!email) {
      res.status(401).json({ ok: false, chyba: 'Nie ste prihlásený.' });
      return;
    }
    if (akcia === 'ja') { await ja(req, res, email); return; }
    if (akcia === 'portal' && post) { await portal(req, res, email); return; }

    res.status(404).json({ ok: false, chyba: 'Neznáma akcia.' });
  } catch (e) {
    console.error('ucet:', akcia, e.message);
    res.status(e.stav || 502).json({ ok: false, chyba: 'Niečo sa pokazilo, skúste to o chvíľu.' });
  }
};
