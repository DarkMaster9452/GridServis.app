/* POST /api/udalost — anonymný záznam o pohybe po webe.

   Ukladá sa typ udalosti, plán, stránka, zdroj návštevy, na čo sa kliklo,
   hĺbka scrollu, čas na stránke a hrubý typ zariadenia (mobil / tablet /
   počítač, prehliadač, systém). Žiadne cookies, žiadna IP adresa návštevníka,
   žiadny údaj, podľa ktorého by sa dal človek nájsť. IP sa len na okamih
   porovná so zoznamom adries majiteľa (tabuľka web_vylucene) a nezapíše sa.
   Identifikátor relácie je náhodné číslo, ktoré žije len v jednej karte
   prehliadača a po zavretí zmizne. */

var { sql, nastavena } = require('./_db');

var TYPY = ['zobrazenie', 'klik', 'klik_predplatit', 'klik_demo', 'pokladna',
            'platba_hotova', 'scroll', 'cas'];
var PLANY = ['demo', 'mesiac', 'rok', ''];
var ZARIADENIA = ['mobil', 'tablet', 'pocitac', ''];

function orez(hodnota, dlzka) {
  return String(hodnota === undefined || hodnota === null ? '' : hodnota).slice(0, dlzka);
}

function cele(hodnota, min, max) {
  var n = parseInt(hodnota, 10);
  if (!isFinite(n)) return '';
  return Math.max(min, Math.min(max, n));
}

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

function adresa(req) {
  var h = req.headers || {};
  var ip = String(h['x-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim();
  return ip || (req.socket && req.socket.remoteAddress) || '';
}

/* hrubé rozpoznanie prehliadača a systému z User-Agent (nič sa neukladá celé) */
function rozpoznaj(ua) {
  var prehliadac = 'iný';
  if (/edg\//i.test(ua)) prehliadac = 'Edge';
  else if (/opr\/|opera/i.test(ua)) prehliadac = 'Opera';
  else if (/firefox|fxios/i.test(ua)) prehliadac = 'Firefox';
  else if (/chrome|crios/i.test(ua)) prehliadac = 'Chrome';
  else if (/safari/i.test(ua)) prehliadac = 'Safari';

  var system = 'iný';
  if (/windows/i.test(ua)) system = 'Windows';
  else if (/android/i.test(ua)) system = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) system = 'iOS';
  else if (/mac os x|macintosh/i.test(ua)) system = 'macOS';
  else if (/linux|cros/i.test(ua)) system = 'Linux';

  var bot = !ua || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|node-fetch|axios|go-http|java\//i.test(ua);
  return { prehliadac: prehliadac, system: system, bot: bot };
}

/* zoznam vylúčených adries sa drží v pamäti minútu, nech sa DB nepýta pri každom kliku */
var vylucene = { cas: 0, zoznam: [] };
async function jeVylucena(ip) {
  if (!ip) return false;
  if (Date.now() - vylucene.cas > 60000) {
    try {
      var r = await sql('SELECT ip FROM web_vylucene');
      vylucene = { cas: Date.now(), zoznam: r.map(function (x) { return x.ip; }) };
    } catch (e) {
      vylucene.cas = Date.now();          // tabuľka nemusí existovať, nič sa nestane
    }
  }
  return vylucene.zoznam.indexOf(ip) !== -1;
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  if (!nastavena()) {
    res.status(204).end();               // bez databázy sa proste nezbiera nič
    return;
  }

  var u = telo(req);
  var typ = orez(u.typ, 40);
  if (TYPY.indexOf(typ) === -1) {
    res.status(400).end();
    return;
  }
  if (await jeVylucena(adresa(req))) {
    res.status(204).end();               // vlastné návštevy majiteľa sa nepočítajú
    return;
  }

  var plan = orez(u.plan, 20);
  if (PLANY.indexOf(plan) === -1) plan = '';
  var zariadenie = orez(u.zariadenie, 10);
  if (ZARIADENIA.indexOf(zariadenie) === -1) zariadenie = '';
  var ua = rozpoznaj(orez(req.headers && req.headers['user-agent'], 300));

  try {
    try {
      await sql(
        `INSERT INTO udalosti_web (relacia, typ, plan, stranka, zdroj, ciel, sekcia, x_pct, y_pct,
                                   hodnota, zariadenie, prehliadac, system, jazyk, sirka, bot)
         VALUES (NULLIF($1, ''), $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''),
                 NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, '')::smallint, NULLIF($9, '')::smallint,
                 NULLIF($10, '')::integer, NULLIF($11, ''), $12, $13, NULLIF($14, ''),
                 NULLIF($15, '')::integer, $16::boolean)`,
        [orez(u.relacia, 40), typ, plan, orez(u.stranka, 120), orez(u.zdroj, 120),
         orez(u.ciel, 120), orez(u.sekcia, 60), cele(u.x, 0, 100), cele(u.y, 0, 100),
         cele(u.hodnota, 0, 86400), zariadenie, ua.prehliadac, ua.system,
         orez(u.jazyk, 10), cele(u.sirka, 0, 10000), ua.bot]
      );
    } catch (e) {
      // migrácia 05_web_statistiky.sql ešte nebola spustená — zapíšu sa aspoň základné údaje
      await sql(
        `INSERT INTO udalosti_web (relacia, typ, plan, stranka, zdroj)
         VALUES (NULLIF($1, ''), $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))`,
        [orez(u.relacia, 40), typ, plan, orez(u.stranka, 120), orez(u.zdroj, 120)]
      );
    }
  } catch (e) {
    console.error('udalost:', e.message);
  }
  res.status(204).end();                  // stránke je odpoveď jedno
};
