/* POST /api/udalost — anonymný záznam o pohybe po webe.

   Ukladá sa len typ udalosti, plán, stránka a zdroj návštevy. Žiadne cookies,
   žiadna IP adresa, žiadny údaj, podľa ktorého by sa dal človek nájsť.
   Identifikátor relácie je náhodné číslo, ktoré žije len v jednej karte
   prehliadača a po zavretí zmizne. */

var { sql, nastavena } = require('./_db');

var TYPY = ['zobrazenie', 'klik_predplatit', 'klik_demo', 'pokladna', 'platba_hotova'];
var PLANY = ['demo', 'mesiac', 'rok', ''];

function orez(hodnota, dlzka) {
  return String(hodnota === undefined || hodnota === null ? '' : hodnota).slice(0, dlzka);
}

function telo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
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
  var plan = orez(u.plan, 20);
  if (PLANY.indexOf(plan) === -1) plan = '';

  try {
    await sql(
      `INSERT INTO udalosti_web (relacia, typ, plan, stranka, zdroj)
       VALUES (NULLIF($1, ''), $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))`,
      [orez(u.relacia, 40), typ, plan, orez(u.stranka, 120), orez(u.zdroj, 120)]
    );
  } catch (e) {
    console.error('udalost:', e.message);
  }
  res.status(204).end();                  // stránke je odpoveď jedno
};
