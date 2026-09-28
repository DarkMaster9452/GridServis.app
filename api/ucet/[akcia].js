/* /api/ucet/<akcia> — SKÚŠOBNÁ správa licencie cez web (len preview).

   Prihlásenie tromi spôsobmi, všetky vedú k tomu istému: overenému e-mailu.
   Účet = všetky licencie, ktoré majú tento e-mail ako kontakt.
     * licenčný kód + e-mail → na e-mail príde 6-ciferný kód, platí 15 minút,
       dá sa použiť raz a po použití (alebo 5 zlých pokusoch) sa z DB zmaže,
     * Google (OAuth, keď sú nastavené GOOGLE_CLIENT_ID a GOOGLE_CLIENT_SECRET),
     * Apple (Sign in with Apple, keď sú nastavené APPLE_*).

   Dáta z programu (zákazky, sklad…) sem nepatria — tie sú len na počítači
   v dielni. Web k nim ani nemá prístup (pozri _db.js).

   Celé to tvoria len tieto súbory a jedna tabuľka, dajú sa zmazať bez náhrady:
     api/ucet/[akcia].js, public/ucet.html, public/assets/js/ucet.js,
     public/assets/css/ucet.css, tools/ucet-kody.sql (DROP TABLE ucet_kody)

   Akcie:
     GET  nastavenia                         → ktoré prihlásenia sú zapnuté
     POST poziadat   { licencia, email }     → pošle 6-ciferný kód e-mailom
     POST overit     { email, kod }          → overí kód, nastaví cookie gs_ucet
     GET  google / apple                     → presmeruje na prihlásenie
     GET  google-spat, POST apple-spat       → návrat z Google / Apple
     GET  ja                                 → licencie, zariadenia, platby
     POST portal     { kod }                 → odkaz do Stripe portálu
     POST odhlasit                           → zmaže cookie */

var crypto = require('crypto');
var { sql, riadok } = require('../_db');
var { stripe, adresaWebu, nastavene } = require('../_stripe');
var { kodBlok, obalka } = require('../_email-vzhlad');

var COOKIE = 'gs_ucet';
var COOKIE_OAUTH = 'gs_ucet_oauth';
var PLATNOST = 8 * 3600;          // relácia v sekundách
var KOD_MINUT = 15;               // platnosť 6-ciferného kódu
var KOD_POKUSOV = 5;              // potom sa kód zmaže a treba požiadať znova
var KOD_ZNOVA_SEKUND = 60;        // najskôr po tomto čase možno poslať nový

var ENV = process.env;
var GOOGLE = Boolean(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET);
var APPLE = Boolean(ENV.APPLE_CLIENT_ID && ENV.APPLE_TEAM_ID && ENV.APPLE_KEY_ID && ENV.APPLE_PRIVATE_KEY);
var RESEND = Boolean(ENV.RESEND_API_KEY && ENV.RESEND_FROM);
var ODPOVED = ENV.RESEND_REPLY_TO || 'strananekm@gmail.com';

/* ---------- podpisy a cookies ---------- */

/* Podpisový kľúč. Najlepšie vlastný UCET_TAJOMSTVO; na skúšku sa odvodí
   z DATABASE_URL, ktorá je tak či tak tajná. */
function kluc() {
  var zaklad = ENV.UCET_TAJOMSTVO || ENV.DATABASE_URL || '';
  if (!zaklad) return null;
  return crypto.createHash('sha256').update('gridservis-ucet|' + zaklad).digest();
}

function hmac(data) {
  return crypto.createHmac('sha256', kluc()).update(data).digest('base64url');
}

function rovnake(a, b) {
  a = Buffer.from(String(a)); b = Buffer.from(String(b));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function zapecat(obsah, sekund) {
  var data = Buffer.from(JSON.stringify(Object.assign({}, obsah, {
    x: Math.floor(Date.now() / 1000) + sekund
  }))).toString('base64url');
  return data + '.' + hmac(data);
}

function otvor(t) {
  if (!t || !kluc()) return null;
  var casti = String(t).split('.');
  if (casti.length !== 2 || !rovnake(hmac(casti[0]), casti[1])) return null;
  try {
    var o = JSON.parse(Buffer.from(casti[0], 'base64url').toString());
    return o.x && o.x > Date.now() / 1000 ? o : null;
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

var noveCookies = [];
function nastavCookie(meno, hodnota, vek, sameSite) {
  noveCookies.push(meno + '=' + encodeURIComponent(hodnota) +
    '; Path=/api/ucet; HttpOnly; Secure; SameSite=' + (sameSite || 'Strict') + '; Max-Age=' + vek);
}

function prihlas(email) {
  nastavCookie(COOKIE, zapecat({ e: String(email).toLowerCase() }, PLATNOST), PLATNOST);
}

/* ---------- pomocníci ---------- */

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { /* nie je JSON */ }
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return {};
}

var JE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vlastnenaLicencia(kod, email) {
  return riadok(
    `SELECT kod FROM licencie WHERE kod = $1 AND lower(kontakt) = lower($2)`,
    [kod, email]);
}

/* návrat z Google/Apple späť na stránku, prípadne s chybou */
function naStranku(req, res, chyba) {
  res.setHeader('Set-Cookie', noveCookies);
  res.redirect(303, adresaWebu(req) + '/ucet.html' + (chyba ? '?chyba=' + encodeURIComponent(chyba) : ''));
}

/* payload z id_tokenu. Podpis sa neoveruje zámerne: token prišiel priamo
   zo servera Google/Apple cez HTTPS ako odpoveď na výmenu kódu, nie od
   prehliadača — tak to pripúšťa aj dokumentácia Google. */
function obsahTokenu(idToken) {
  var casti = String(idToken || '').split('.');
  if (casti.length !== 3) return null;
  try { return JSON.parse(Buffer.from(casti[1], 'base64url').toString()); } catch (e) { return null; }
}

/* ---------- 6-ciferný kód e-mailom ---------- */

function hashKodu(email, kod) {
  return hmac('kod|' + email + '|' + kod);
}

async function posliKod(email, kod, web) {
  var obsah =
    '\n      <h1 style="margin:0 0 14px;font:700 22px/1.3 -apple-system,sans-serif;letter-spacing:-.01em;">Prihlásenie do účtu</h1>' +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Na prihlásenie do správy licencie GridServis zadajte tento kód:</p>' +
    kodBlok(kod, 'KÓD NA PRIHLÁSENIE') +
    '\n      <p style="margin:0;color:#55606e;font-size:14px;">Platí ' + KOD_MINUT + ' minút a dá sa použiť len raz. Ak ste o prihlásenie nežiadali, e-mail pokojne ignorujte.</p>';
  var r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ENV.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: ENV.RESEND_FROM, to: [email], reply_to: ODPOVED,
      subject: kod + ' — kód na prihlásenie do GridServis',
      html: obalka('Kód na prihlásenie', obsah, web, ODPOVED),
      text: 'Kód na prihlásenie do správy licencie GridServis: ' + kod +
        '\n\nPlatí ' + KOD_MINUT + ' minút a dá sa použiť len raz.' +
        '\nAk ste o prihlásenie nežiadali, e-mail ignorujte.'
    })
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text().catch(function () { return ''; })));
}

async function poziadat(req, res) {
  var u = telo(req);
  var licencia = String(u.licencia || '').trim().toUpperCase();
  var email = String(u.email || '').trim().toLowerCase();

  if (!/^[A-Z0-9-]{8,40}$/.test(licencia) || !JE_EMAIL.test(email)) {
    res.status(400).json({ ok: false, chyba: 'Zadajte licenčný kód aj e-mail.' });
    return;
  }
  if (!RESEND) {
    res.status(503).json({ ok: false, chyba: 'Odosielanie e-mailov nie je na tomto nasadení nastavené.' });
    return;
  }

  /* upratovanie: prepadnuté kódy v DB nezostávajú */
  await sql('DELETE FROM ucet_kody WHERE plati_do < now()');

  /* rovnaká odpoveď pre zlý kód aj zlý e-mail — nech sa nedá hádať,
     ktorý z nich existuje */
  if (!(await vlastnenaLicencia(licencia, email))) {
    res.status(401).json({ ok: false, chyba: 'Licenčný kód a e-mail k sebe nesedia.' });
    return;
  }

  var posledny = await riadok(
    `SELECT extract(epoch FROM now() - vytvorene) AS pred FROM ucet_kody WHERE email = $1`, [email]);
  if (posledny && Number(posledny.pred) < KOD_ZNOVA_SEKUND) {
    res.status(429).json({ ok: false, chyba: 'Kód sme práve poslali. Nový si môžete vyžiadať o minútu.' });
    return;
  }

  /* úplne náhodný kód z kryptografického generátora, 000000–999999 */
  var kod = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

  /* v DB je len odtlačok kódu, nie kód samotný; nový kód nahradí starý */
  await sql(
    `INSERT INTO ucet_kody (email, kod_hash, plati_do, pokusy, vytvorene)
     VALUES ($1, $2, now() + make_interval(mins => $3::int), 0, now())
     ON CONFLICT (email) DO UPDATE
        SET kod_hash = EXCLUDED.kod_hash, plati_do = EXCLUDED.plati_do,
            pokusy = 0, vytvorene = now()`,
    [email, hashKodu(email, kod), KOD_MINUT]);

  try {
    await posliKod(email, kod, adresaWebu(req));
  } catch (e) {
    console.error('ucet: email', e.message);
    await sql('DELETE FROM ucet_kody WHERE email = $1', [email]);
    res.status(502).json({ ok: false, chyba: 'E-mail sa nepodarilo odoslať, skúste to znova.' });
    return;
  }
  res.status(200).json({ ok: true, minut: KOD_MINUT });
}

async function overit(req, res) {
  var u = telo(req);
  var email = String(u.email || '').trim().toLowerCase();
  var kod = String(u.kod || '').replace(/\D/g, '');

  if (!JE_EMAIL.test(email) || kod.length !== 6) {
    res.status(400).json({ ok: false, chyba: 'Zadajte 6-ciferný kód z e-mailu.' });
    return;
  }

  await sql('DELETE FROM ucet_kody WHERE plati_do < now()');
  var zaznam = await riadok(
    'SELECT kod_hash, pokusy FROM ucet_kody WHERE email = $1', [email]);
  if (!zaznam) {
    res.status(410).json({ ok: false, znova: true, chyba: 'Kód vypršal alebo už bol použitý. Požiadajte o nový.' });
    return;
  }

  if (!rovnake(zaznam.kod_hash, hashKodu(email, kod))) {
    var pokusy = Number(zaznam.pokusy) + 1;
    if (pokusy >= KOD_POKUSOV) {
      await sql('DELETE FROM ucet_kody WHERE email = $1', [email]);
      res.status(410).json({ ok: false, znova: true, chyba: 'Príliš veľa zlých pokusov. Požiadajte o nový kód.' });
      return;
    }
    await sql('UPDATE ucet_kody SET pokusy = $2 WHERE email = $1', [email, pokusy]);
    res.status(401).json({ ok: false, chyba: 'Nesprávny kód. Zostáva pokusov: ' + (KOD_POKUSOV - pokusy) + '.' });
    return;
  }

  /* jednorazový — po úspechu sa hneď zmaže */
  await sql('DELETE FROM ucet_kody WHERE email = $1', [email]);
  prihlas(email);
  res.setHeader('Set-Cookie', noveCookies);
  res.status(200).json({ ok: true });
}

/* ---------- Google ---------- */

function spatUrl(req, kto) {
  return adresaWebu(req) + '/api/ucet/' + kto + '-spat';
}

function zacniOAuth(req, res, kto) {
  var stav = crypto.randomBytes(18).toString('base64url');
  var nonce = crypto.randomBytes(18).toString('base64url');
  /* Apple sa vracia POSTom z inej domény — cookie musí byť SameSite=None */
  nastavCookie(COOKIE_OAUTH, zapecat({ s: stav, n: nonce, k: kto }, 600), 600, 'None');
  res.setHeader('Set-Cookie', noveCookies);

  var p;
  if (kto === 'google') {
    p = new URLSearchParams({
      client_id: ENV.GOOGLE_CLIENT_ID, redirect_uri: spatUrl(req, 'google'),
      response_type: 'code', scope: 'openid email', state: stav, nonce: nonce,
      prompt: 'select_account'
    });
    res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?' + p);
  } else {
    p = new URLSearchParams({
      client_id: ENV.APPLE_CLIENT_ID, redirect_uri: spatUrl(req, 'apple'),
      response_type: 'code', response_mode: 'form_post', scope: 'email',
      state: stav, nonce: nonce
    });
    res.redirect(302, 'https://appleid.apple.com/auth/authorize?' + p);
  }
}

function overStav(req, kto, stav) {
  var o = otvor(cookie(req, COOKIE_OAUTH));
  nastavCookie(COOKIE_OAUTH, '', 0, 'None');
  if (!o || o.k !== kto || !stav || !rovnake(o.s, stav)) return null;
  return o;
}

async function googleSpat(req, res) {
  var q = req.query || {};
  var o = overStav(req, 'google', q.state);
  if (!o) return naStranku(req, res, 'Prihlásenie vypršalo, skúste to znova.');
  if (!q.code) return naStranku(req, res, 'Prihlásenie cez Google bolo zrušené.');

  var r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: q.code, client_id: ENV.GOOGLE_CLIENT_ID, client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: spatUrl(req, 'google'), grant_type: 'authorization_code'
    })
  });
  var t = await r.json().catch(function () { return {}; });
  var id = obsahTokenu(t.id_token);
  if (!r.ok || !id || id.aud !== ENV.GOOGLE_CLIENT_ID || id.nonce !== o.n ||
      ['accounts.google.com', 'https://accounts.google.com'].indexOf(id.iss) === -1 ||
      !id.email || id.email_verified !== true) {
    console.error('ucet: google', r.status, t.error || '');
    return naStranku(req, res, 'Google prihlásenie sa nepodarilo overiť.');
  }
  prihlas(id.email);
  naStranku(req, res);
}

/* ---------- Apple ---------- */

/* Apple chce namiesto hesla krátkodobý JWT podpísaný kľúčom .p8 (ES256) */
function appleTajomstvo() {
  var teraz = Math.floor(Date.now() / 1000);
  var hlava = Buffer.from(JSON.stringify({ alg: 'ES256', kid: ENV.APPLE_KEY_ID })).toString('base64url');
  var telo = Buffer.from(JSON.stringify({
    iss: ENV.APPLE_TEAM_ID, iat: teraz, exp: teraz + 300,
    aud: 'https://appleid.apple.com', sub: ENV.APPLE_CLIENT_ID
  })).toString('base64url');
  var kluc = String(ENV.APPLE_PRIVATE_KEY).replace(/\\n/g, '\n');
  var podpis = crypto.sign('sha256', Buffer.from(hlava + '.' + telo),
    { key: kluc, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return hlava + '.' + telo + '.' + podpis;
}

async function appleSpat(req, res) {
  var u = telo(req);
  var o = overStav(req, 'apple', u.state);
  if (!o) return naStranku(req, res, 'Prihlásenie vypršalo, skúste to znova.');
  if (!u.code) return naStranku(req, res, 'Prihlásenie cez Apple bolo zrušené.');

  var r = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: u.code, client_id: ENV.APPLE_CLIENT_ID, client_secret: appleTajomstvo(),
      redirect_uri: spatUrl(req, 'apple'), grant_type: 'authorization_code'
    })
  });
  var t = await r.json().catch(function () { return {}; });
  var id = obsahTokenu(t.id_token);
  var overeny = id && (id.email_verified === true || id.email_verified === 'true');
  if (!r.ok || !id || id.aud !== ENV.APPLE_CLIENT_ID || id.iss !== 'https://appleid.apple.com' ||
      id.nonce !== o.n || !id.email || !overeny) {
    console.error('ucet: apple', r.status, t.error || '');
    return naStranku(req, res, 'Apple prihlásenie sa nepodarilo overiť.');
  }
  prihlas(id.email);
  naStranku(req, res);
}

/* ---------- účet ---------- */

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
  noveCookies = [];
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  var akcia = String((req.query && req.query.akcia) || '');
  var post = req.method === 'POST';

  if (!kluc()) {
    res.status(503).json({ ok: false, chyba: 'Účet nie je nastavený.' });
    return;
  }

  try {
    if (akcia === 'nastavenia') {
      res.status(200).json({ ok: true, google: GOOGLE, apple: APPLE, email: RESEND });
      return;
    }
    if (akcia === 'odhlasit' && post) {
      nastavCookie(COOKIE, '', 0);
      res.setHeader('Set-Cookie', noveCookies);
      res.status(200).json({ ok: true });
      return;
    }
    if (akcia === 'poziadat' && post) { await poziadat(req, res); return; }
    if (akcia === 'overit' && post) { await overit(req, res); return; }
    if (akcia === 'google' && GOOGLE) { zacniOAuth(req, res, 'google'); return; }
    if (akcia === 'apple' && APPLE) { zacniOAuth(req, res, 'apple'); return; }
    if (akcia === 'google-spat' && GOOGLE) { await googleSpat(req, res); return; }
    if (akcia === 'apple-spat' && APPLE && post) { await appleSpat(req, res); return; }

    var relacia = otvor(cookie(req, COOKIE));
    if (!relacia || !relacia.e) {
      res.status(401).json({ ok: false, chyba: 'Nie ste prihlásený.' });
      return;
    }
    if (akcia === 'ja') { await ja(req, res, relacia.e); return; }
    if (akcia === 'portal' && post) { await portal(req, res, relacia.e); return; }

    res.status(404).json({ ok: false, chyba: 'Neznáma akcia.' });
  } catch (e) {
    console.error('ucet:', akcia, e.message);
    if (/-spat$/.test(akcia)) { naStranku(req, res, 'Prihlásenie sa nepodarilo.'); return; }
    res.status(e.stav || 502).json({ ok: false, chyba: 'Niečo sa pokazilo, skúste to o chvíľu.' });
  }
};
