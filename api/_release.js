/* Spoločný pomocník: zistí posledné vydanie a inštalačku.
   Údaje o zdroji sú len na serveri, do prehliadača sa nedostanú. */

var REPO  = process.env.RELEASE_REPO  || '';
var ASSET = process.env.RELEASE_ASSET || '';
var ASSET_DEMO = process.env.RELEASE_ASSET_DEMO || '';
var TOKEN = process.env.RELEASE_TOKEN || '';
var API = process.env.GITHUB_API || 'https://api.github.com';   // prepínateľné pri testovaní

function hlavicky(accept) {
  var h = { Accept: accept, 'User-Agent': 'autoagenda-web' };
  if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
  return h;
}

/* Vo vydaní sú dve inštalačky: plná verzia a demo s limitmi. Rozlišujú sa
   podľa názvu súboru — demo ho má v mene. Presné názvy sa dajú určiť
   premennými RELEASE_ASSET a RELEASE_ASSET_DEMO. */
function vyber(assets, demo) {
  var i;
  var chceny = demo ? ASSET_DEMO : ASSET;

  if (chceny) {
    for (i = 0; i < assets.length; i++) {
      if (assets[i].name === chceny) return assets[i];
    }
  }
  for (i = 0; i < assets.length; i++) {
    var meno = assets[i].name || '';
    if (!/\.exe$/i.test(meno)) continue;
    if (demo === /demo/i.test(meno)) return assets[i];
  }
  /* keď vydanie demo inštalačku ešte nemá, radšej dáme tú, ktorá tam je */
  for (i = 0; i < assets.length; i++) {
    if (/\.exe$/i.test(assets[i].name || '')) return assets[i];
  }
  return assets.length ? assets[0] : null;
}


async function posledneVydanie(demo) {
  if (!REPO) throw new Error('RELEASE_REPO nie je nastavené');

  var r = await fetch(API + '/repos/' + REPO + '/releases/latest',
    { headers: hlavicky('application/vnd.github+json') });

  if (!r.ok) throw new Error('vydanie sa nepodarilo načítať (' + r.status + ')');

  var rel = await r.json();
  return { rel: rel, asset: vyber(rel.assets || [], demo) };
}

module.exports = { posledneVydanie: posledneVydanie, hlavicky: hlavicky };
