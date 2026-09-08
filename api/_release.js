/* Spoločný pomocník: zistí posledné vydanie a inštalačku.
   Údaje o zdroji sú len na serveri, do prehliadača sa nedostanú. */

var REPO  = process.env.RELEASE_REPO  || '';
var ASSET = process.env.RELEASE_ASSET || 'MechanikSetup.exe';
var TOKEN = process.env.RELEASE_TOKEN || '';

function hlavicky(accept) {
  var h = { Accept: accept, 'User-Agent': 'mechanik-web' };
  if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
  return h;
}

async function posledneVydanie() {
  if (!REPO) throw new Error('RELEASE_REPO nie je nastavené');

  var r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest',
    { headers: hlavicky('application/vnd.github+json') });

  if (!r.ok) throw new Error('vydanie sa nepodarilo načítať (' + r.status + ')');

  var rel = await r.json();
  var assets = rel.assets || [];
  var a = null;

  for (var i = 0; i < assets.length; i++) {
    if (assets[i].name === ASSET) { a = assets[i]; break; }
  }
  if (!a && assets.length) a = assets[0];

  return { rel: rel, asset: a };
}

module.exports = { posledneVydanie: posledneVydanie, hlavicky: hlavicky };
