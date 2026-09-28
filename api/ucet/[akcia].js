/* /api/ucet/<akcia> — Môj účet: správa licencie cez web.

   Účet = všetky licencie, ktoré majú prihlásený e-mail v stĺpci kontakt
   alebo email. Prihlásiť sa dá dvoma spôsobmi:
     * licenčný kód + e-mail → na e-mail príde 6-ciferný kód. Je náhodný,
       platí 15 minút, dá sa použiť raz a po použití, 5 zlých pokusoch
       alebo prepadnutí sa z DB zmaže (v DB je len jeho HMAC odtlačok),
     * Google — len keď si ho dielňa v účte najprv sama prepojí (po
       prihlásení kódom). Na jeden účet jeden Google účet a naopak.
       Kód z e-mailu funguje aj naďalej.

   Dáta z programu (zákazky, sklad…) sem nepatria — tie sú len na počítači
   v dielni. Web k nim ani nemá prístup (pozri _db.js). Program sa aj
   naďalej aktivuje len licenčným kódom.

   Tabuľky: ucet_kody, ucet_prepojenia, odstupenia (tools/ucet.sql).

   Akcie:
     GET  nastavenia                          → čo je zapnuté (Google)
     POST poziadat    { licencia, email }     → pošle 6-ciferný kód e-mailom
     POST overit      { email, kod }          → overí kód, nastaví cookie gs_ucet
     GET  google[?prepojit=1]                 → presmeruje na Google
     GET  google-spat                         → návrat z Google
     POST odpojit-google                      → zruší prepojenie
     GET  ja                                  → licencie, zariadenia, platby
     POST portal      { kod }                 → odkaz do Stripe portálu
     POST zmazat-ucet                         → zmaže účet (prepojenia, kódy)
     POST odhlasit                            → zmaže cookie
     POST odstupenie  { meno, email, zmluva, poznamka }
                      → odstúpenie od zmluvy (§ 20a zákona č. 108/2024 Z. z.),
                        bez prihlásenia; potvrdenie príde e-mailom */

var crypto = require('crypto');
var { sql, riadok } = require('../_db');
var { stripe, adresaWebu, nastavene } = require('../_stripe');
var { otpBlok, tlacidlo, obalka, odosli, FONT } = require('../_email-vzhlad');

var COOKIE = 'gs_ucet';
var COOKIE_OAUTH = 'gs_ucet_oauth';
var PLATNOST = 8 * 3600;          // relácia v sekundách
var KOD_MINUT = 15;               // platnosť 6-ciferného kódu
var KOD_POKUSOV = 5;              // potom sa kód zmaže a treba požiadať znova
var KOD_ZNOVA_SEKUND = 60;        // najskôr po tomto čase možno poslať nový

var ENV = process.env;
var GOOGLE = Boolean(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET);
var RESEND = Boolean(ENV.RESEND_API_KEY && ENV.RESEND_FROM);
var PODPORA = 'support@gridservis.app';

/* ---------- podpisy a cookies ---------- */

/* Podpisový kľúč. Najlepšie vlastný UCET_TAJOMSTVO; inak sa odvodí
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

function relacia(req) {
  var o = otvor(cookie(req, COOKIE));
  return o && o.e ? o.e : null;
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

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function vlastnenaLicencia(kod, email) {
  return riadok(
    `SELECT kod FROM licencie
      WHERE kod = $1 AND (lower(kontakt) = lower($2) OR lower(email) = lower($2))`,
    [kod, email]);
}

async function posliEmail(sprava) {
  var r = await odosli(Object.assign({ from: ENV.RESEND_FROM, reply_to: PODPORA }, sprava));
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text().catch(function () { return ''; })));
}

function h1(text) {
  return '\n      <h1 style="margin:0 0 14px;font-family:' + FONT + ';font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-.01em;color:#0d1117;">' + text + '</h1>';
}

/* návrat z Google späť na stránku, prípadne so správou */
function naStranku(req, res, sprava, ok) {
  res.setHeader('Set-Cookie', noveCookies);
  var q = sprava ? '?' + (ok ? 'info' : 'chyba') + '=' + encodeURIComponent(sprava) : '';
  res.redirect(303, adresaWebu(req) + '/ucet.html' + q);
}

/* payload z id_tokenu. Podpis sa neoveruje zámerne: token prišiel priamo
   zo servera Google cez HTTPS ako odpoveď na výmenu kódu, nie od
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
  /* jedným klikom: stránka si kód a e-mail prečíta z časti za #, ktorá sa
     na server ani do logov nikdy neposiela */
  var klik = web + '/ucet.html#prihlasit=' + encodeURIComponent(email) + ':' + kod;
  var obsah =
    h1('Prihlásenie do účtu') +
    '\n      <p style="margin:0 0 4px;color:#0d1117;">Na prihlásenie do správy licencie GridServis zadajte tento kód:</p>' +
    otpBlok(kod, 'KÓD NA PRIHLÁSENIE') +
    '\n      <p style="margin:0;color:#55606e;font-size:14px;">Platí ' + KOD_MINUT + ' minút a dá sa použiť len raz. Kód nemusíte prepisovať — stačí kliknúť:</p>' +
    tlacidlo('Prihlásiť sa jedným klikom →', klik) +
    '\n      <p style="margin:18px 0 0;color:#55606e;font-size:14px;">Ak ste o prihlásenie nežiadali, e-mail pokojne ignorujte — bez kódu sa do účtu nikto nedostane.</p>';
  await posliEmail({
    to: [email],
    subject: kod + ' — kód na prihlásenie do GridServis',
    html: obalka('Kód na prihlásenie', obsah, '', PODPORA),
    text: 'Kód na prihlásenie do správy licencie GridServis: ' + kod +
      '\n\nPlatí ' + KOD_MINUT + ' minút a dá sa použiť len raz.' +
      '\nPrihlásenie jedným klikom: ' + klik +
      '\n\nAk ste o prihlásenie nežiadali, e-mail ignorujte.' +
      '\nOtázky: ' + PODPORA
  });
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
    res.status(503).json({ ok: false, chyba: 'Odosielanie e-mailov nie je nastavené.' });
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

/* ---------- Google: prepojenie a prihlásenie ---------- */

function spatUrl(req) {
  return adresaWebu(req) + '/api/ucet/google-spat';
}

function zacniGoogle(req, res) {
  var prepojit = String((req.query && req.query.prepojit) || '') === '1';
  var email = relacia(req);
  if (prepojit && !email) return naStranku(req, res, 'Najprv sa prihláste kódom z e-mailu.');

  var stav = crypto.randomBytes(18).toString('base64url');
  var nonce = crypto.randomBytes(18).toString('base64url');
  /* návrat z Google je presmerovanie z inej domény — SameSite=Lax */
  nastavCookie(COOKIE_OAUTH, zapecat({ s: stav, n: nonce, p: prepojit ? email : '' }, 600), 600, 'Lax');
  res.setHeader('Set-Cookie', noveCookies);
  res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: ENV.GOOGLE_CLIENT_ID, redirect_uri: spatUrl(req),
    response_type: 'code', scope: 'openid email', state: stav, nonce: nonce,
    prompt: 'select_account'
  }));
}

async function googleSpat(req, res) {
  var q = req.query || {};
  var o = otvor(cookie(req, COOKIE_OAUTH));
  nastavCookie(COOKIE_OAUTH, '', 0, 'Lax');
  if (!o || !q.state || !rovnake(o.s, q.state)) return naStranku(req, res, 'Prihlásenie vypršalo, skúste to znova.');
  if (!q.code) return naStranku(req, res, 'Prihlásenie cez Google bolo zrušené.');

  var r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: q.code, client_id: ENV.GOOGLE_CLIENT_ID, client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: spatUrl(req), grant_type: 'authorization_code'
    })
  });
  var t = await r.json().catch(function () { return {}; });
  var id = obsahTokenu(t.id_token);
  if (!r.ok || !id || id.aud !== ENV.GOOGLE_CLIENT_ID || id.nonce !== o.n || !id.sub ||
      ['accounts.google.com', 'https://accounts.google.com'].indexOf(id.iss) === -1) {
    console.error('ucet: google', r.status, t.error || '');
    return naStranku(req, res, 'Google prihlásenie sa nepodarilo overiť.');
  }
  var gEmail = String(id.email || '').toLowerCase();

  /* prepojenie: prihlásený účet si pridáva svoj Google */
  if (o.p) {
    var iny = await riadok(
      `SELECT ucet_email FROM ucet_prepojenia WHERE poskytovatel = 'google' AND sub = $1`, [id.sub]);
    if (iny && iny.ucet_email !== o.p) {
      return naStranku(req, res, 'Tento Google účet je už prepojený s iným účtom GridServis.');
    }
    /* jeden Google na účet — nové prepojenie nahradí staré */
    await sql(
      `INSERT INTO ucet_prepojenia (ucet_email, poskytovatel, sub, email_poskytovatela, vytvorene)
       VALUES ($1, 'google', $2, $3, now())
       ON CONFLICT (ucet_email, poskytovatel) DO UPDATE
          SET sub = EXCLUDED.sub, email_poskytovatela = EXCLUDED.email_poskytovatela, vytvorene = now()`,
      [o.p, id.sub, gEmail]);
    prihlas(o.p);
    return naStranku(req, res, 'Google účet ' + gEmail + ' je prepojený. Odteraz sa môžete prihlásiť aj cez Google.', true);
  }

  /* prihlásenie: len prepojený Google účet */
  var p = await riadok(
    `SELECT ucet_email FROM ucet_prepojenia WHERE poskytovatel = 'google' AND sub = $1`, [id.sub]);
  if (!p) {
    return naStranku(req, res, 'Tento Google účet nie je prepojený so žiadnou licenciou. Prihláste sa kódom z e-mailu a v účte kliknite na „Prepojiť s Google“.');
  }
  await sql(`UPDATE ucet_prepojenia SET naposledy = now() WHERE poskytovatel = 'google' AND sub = $1`, [id.sub]);
  prihlas(p.ucet_email);
  naStranku(req, res);
}

/* ---------- účet ---------- */

async function ja(req, res, email) {
  var licencie = await sql(
    `SELECT kod, dielna, max_zariadeni, platna_do, stav
       FROM licencie WHERE lower(kontakt) = lower($1) OR lower(email) = lower($1)
      ORDER BY platna_do DESC NULLS LAST`, [email]);

  var kody = licencie.map(function (l) { return l.kod; });
  var zariadenia = [];
  var platby = [];
  if (kody.length) {
    /* kódy majú len [A-Z0-9-], takže ich možno bezpečne poslať ako pole */
    var pole = '{' + kody.join(',') + '}';
    zariadenia = await sql(
      `SELECT kod, odtlacok, nazov_pc, os, verzia_appky, stav, aktivovane, posledna_kontrola
         FROM zariadenia WHERE kod = ANY($1::text[]) ORDER BY aktivovane`, [pole]);
    platby = await sql(
      `SELECT cas, druh, plan, suma, mena, stav, kod,
              (stripe_zakaznik IS NOT NULL) AS cez_stripe
         FROM platby WHERE kod = ANY($1::text[])
        ORDER BY cas DESC LIMIT 30`, [pole]);
  }
  var google = await riadok(
    `SELECT email_poskytovatela FROM ucet_prepojenia WHERE ucet_email = $1 AND poskytovatel = 'google'`, [email]);

  res.status(200).json({
    ok: true,
    email: email,
    google: { zapnute: GOOGLE, prepojene: google ? google.email_poskytovatela || 'prepojené' : '' },
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
  var r = await stripe('/billing_portal/sessions', {
    customer: platba.stripe_zakaznik,
    return_url: adresaWebu(req) + '/ucet.html',
    locale: 'sk'
  });
  res.status(200).json({ ok: true, url: r.url });
}

/* Zmazanie účtu na webe: prepojenie s Google, rozpracované kódy a prihlásenie.
   Licencia sama sa nemaže — je to zmluva, na ktorej beží program v dielni,
   a doklady o platbách treba podľa zákona uchovať. O výmaz ostatných
   osobných údajov sa dá požiadať e-mailom (pozri ochrana-sukromia.html). */
async function zmazatUcet(req, res, email) {
  await sql('DELETE FROM ucet_prepojenia WHERE ucet_email = $1', [email]);
  await sql('DELETE FROM ucet_kody WHERE email = $1', [email]);
  nastavCookie(COOKIE, '', 0);
  res.setHeader('Set-Cookie', noveCookies);
  res.status(200).json({ ok: true });
}

/* ---------- odstúpenie od zmluvy (§ 20a zákona č. 108/2024 Z. z.) ---------- */

async function odstupenie(req, res) {
  var u = telo(req);
  var meno = String(u.meno || '').trim().slice(0, 120);
  var email = String(u.email || '').trim().toLowerCase().slice(0, 200);
  var zmluva = String(u.zmluva || '').trim().slice(0, 200);
  var poznamka = String(u.poznamka || '').trim().slice(0, 2000);

  /* pasca na roboty — skryté pole vyplní len robot */
  if (u.web) { res.status(200).json({ ok: true }); return; }

  if (!meno || !JE_EMAIL.test(email) || !zmluva) {
    res.status(400).json({ ok: false, chyba: 'Vyplňte meno, e-mail a údaje o zmluve.' });
    return;
  }
  if (!RESEND) {
    res.status(503).json({ ok: false, chyba: 'Odoslanie teraz nefunguje. Odstúpte prosím e-mailom na ' + PODPORA + '.' });
    return;
  }

  var zaznam = await riadok(
    `INSERT INTO odstupenia (meno, email, zmluva, poznamka) VALUES ($1, $2, $3, $4)
     RETURNING id, cas`, [meno, email, zmluva, poznamka]);
  var kedy = new Date(zaznam.cas).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' });
  var cislo = 'O' + String(zaznam.id).padStart(5, '0');

  var riadky = [
    ['Číslo odstúpenia', cislo],
    ['Dátum a čas', kedy],
    ['Meno a priezvisko', meno],
    ['E-mail', email],
    ['Zmluva (licenčný kód / objednávka)', zmluva],
    ['Poznámka', poznamka || '—']
  ];
  var tabulka = '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e8ebf0;border-radius:12px;">' +
    riadky.map(function (r) {
      return '<tr><td style="padding:10px 14px;border-bottom:1px solid #e8ebf0;color:#55606e;font-size:13px;">' + esc(r[0]) +
        '</td><td style="padding:10px 14px;border-bottom:1px solid #e8ebf0;font-size:14px;color:#0d1117;"><b>' + esc(r[1]) + '</b></td></tr>';
    }).join('') + '</table>';
  var text = riadky.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');

  try {
    /* potvrdenie spotrebiteľovi na trvanlivom médiu */
    await posliEmail({
      to: [email],
      subject: 'Potvrdenie odstúpenia od zmluvy ' + cislo + ' — GridServis',
      html: obalka('Potvrdenie odstúpenia od zmluvy',
        h1('Odstúpenie od zmluvy sme prijali') +
        '\n      <p style="margin:0;color:#0d1117;">Potvrdzujeme, že sme prijali vaše odstúpenie od zmluvy s týmto obsahom:</p>' +
        tabulka +
        '\n      <p style="margin:0;color:#55606e;font-size:14px;">Ak vám vzniká nárok na vrátenie platby, vrátime ju rovnakým spôsobom, akým prišla, najneskôr do 14 dní. Ozveme sa vám e-mailom.</p>',
        '', PODPORA),
      text: 'Potvrdzujeme prijatie odstúpenia od zmluvy.\n\n' + text +
        '\n\nAk vám vzniká nárok na vrátenie platby, vrátime ju do 14 dní.\nOtázky: ' + PODPORA
    });
    /* kópia predávajúcemu */
    await posliEmail({
      to: [PODPORA],
      reply_to: email,
      subject: 'Odstúpenie od zmluvy ' + cislo + ' — ' + zmluva,
      html: obalka('Odstúpenie od zmluvy', h1('Nové odstúpenie od zmluvy') + tabulka, '', PODPORA),
      text: text
    });
  } catch (e) {
    console.error('odstupenie: email', cislo, e.message);
    res.status(502).json({ ok: false, cislo: cislo, chyba: 'Odstúpenie je zapísané (' + cislo + '), ale potvrdenie sa nepodarilo odoslať. Napíšte prosím na ' + PODPORA + '.' });
    return;
  }
  res.status(200).json({ ok: true, cislo: cislo, cas: kedy });
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
      res.status(200).json({ ok: true, google: GOOGLE, email: RESEND });
      return;
    }
    if (akcia === 'odhlasit' && post) {
      nastavCookie(COOKIE, '', 0);
      res.setHeader('Set-Cookie', noveCookies);
      res.status(200).json({ ok: true });
      return;
    }
    if (akcia === 'odstupenie' && post) { await odstupenie(req, res); return; }
    if (akcia === 'poziadat' && post) { await poziadat(req, res); return; }
    if (akcia === 'overit' && post) { await overit(req, res); return; }
    if (akcia === 'google' && GOOGLE) { zacniGoogle(req, res); return; }
    if (akcia === 'google-spat' && GOOGLE) { await googleSpat(req, res); return; }

    var email = relacia(req);
    if (!email) {
      res.status(401).json({ ok: false, chyba: 'Nie ste prihlásený.' });
      return;
    }
    if (akcia === 'ja') { await ja(req, res, email); return; }
    if (akcia === 'portal' && post) { await portal(req, res, email); return; }
    if (akcia === 'odpojit-google' && post) {
      await sql(`DELETE FROM ucet_prepojenia WHERE ucet_email = $1 AND poskytovatel = 'google'`, [email]);
      res.status(200).json({ ok: true });
      return;
    }
    if (akcia === 'zmazat-ucet' && post) { await zmazatUcet(req, res, email); return; }

    res.status(404).json({ ok: false, chyba: 'Neznáma akcia.' });
  } catch (e) {
    console.error('ucet:', akcia, e.message);
    if (akcia === 'google-spat') { naStranku(req, res, 'Prihlásenie sa nepodarilo.'); return; }
    res.status(e.stav || 502).json({ ok: false, chyba: 'Niečo sa pokazilo, skúste to o chvíľu.' });
  }
};
