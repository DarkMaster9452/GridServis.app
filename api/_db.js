/* Spojenie na licenčnú databázu (Neon) cez HTTPS rozhranie.

   Web používa rolu web_klient, ktorá vidí len licencie, platby, návštevnosť
   a zariadenia. K zákazníckym dátam dielní (tabuľka zaznamy) ani k podpisovému
   tajomstvu sa nedostane, aj keby sa niekto dostal k premenným prostredia. */

var URL_DB = process.env.DATABASE_URL || '';

function chyba(stav, sprava) {
  var e = new Error(sprava);
  e.stav = stav;
  return e;
}

/* Adresa SQL rozhrania sa odvodí z pripojenia: rovnaký hostiteľ bez -pooler.
   Dá sa prebiť premennou NEON_SQL_URL. */
function adresa() {
  if (process.env.NEON_SQL_URL) return process.env.NEON_SQL_URL;
  if (!URL_DB) throw chyba(503, 'Databáza nie je nastavená.');
  var host = URL_DB.split('@')[1];
  if (!host) throw chyba(503, 'DATABASE_URL má neznámy tvar.');
  host = host.split('/')[0].replace('-pooler', '');
  return 'https://' + host + '/sql';
}

async function sql(dotaz, parametre) {
  if (!URL_DB) throw chyba(503, 'Databáza nie je nastavená.');

  var r = await fetch(adresa(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': URL_DB,
      'User-Agent': 'autoagenda-web'
    },
    body: JSON.stringify({
      query: dotaz,
      params: (parametre || []).map(function (p) {
        return p === null || p === undefined ? null : String(p);
      })
    })
  });

  var data = null;
  try { data = await r.json(); } catch (e) { data = null; }

  if (!r.ok || !data || !data.rows) {
    var sprava = (data && (data.message || data.error)) || ('databáza odpovedala ' + r.status);
    throw chyba(502, String(sprava));
  }
  return data.rows;
}

/* prvý riadok alebo null */
async function riadok(dotaz, parametre) {
  var riadky = await sql(dotaz, parametre);
  return riadky.length ? riadky[0] : null;
}

module.exports = {
  sql: sql,
  riadok: riadok,
  chyba: chyba,
  nastavena: function () { return Boolean(URL_DB); }
};
