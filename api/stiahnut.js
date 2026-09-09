/* GET /api/stiahnut?relacia=cs_... — presmeruje na inštalačku posledného
   vydania, ale až po dokončenej objednávke v Stripe. Platí to pre demo
   (objednávka za 0 €) aj pre zaplatené predplatné.

   Verzia inštalačky sa vždy určuje podľa objednávky: k plánu rok/mesiac
   patrí plná verzia, k demo objednávke demo inštalačka. Zámerne nejde
   voliť inak — kto si kúpil predplatné, nedostane demo, a naopak.

   Pri súkromnom zdroji sa použije podpísaná adresa, ktorú vráti server,
   takže sa v prehliadači neobjaví adresa repozitára. */

var { posledneVydanie, hlavicky } = require('./_release');
var { overRelaciu } = require('./_stripe');

/* Únik pre vývoj a testovanie: STIAHNUT_BEZ_PLATBY=1 vypne zámok.
   Na ostrom webe zostáva nenastavené. */
var BEZ_PLATBY = process.env.STIAHNUT_BEZ_PLATBY === '1';

function odmietni(res, stav, sprava) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(stav).send(
    '<!DOCTYPE html><html lang="sk"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Stiahnutie nie je sprístupnené — GridServis</title>' +
    '<link rel="icon" href="/assets/img/favicon.svg">' +
    '<link rel="stylesheet" href="/assets/css/styles.css"></head><body>' +
    '<section class="phead"><div class="wrap wrap--nar">' +
    '<h1>Stiahnutie nie je sprístupnené</h1>' +
    '<p class="lead">' + sprava + '</p>' +
    '<p><a class="btn btn--pri" href="/stiahnut.html">Získať demo</a> ' +
    '<a class="btn btn--gh" href="/cennik.html">Cenník</a></p>' +
    '</div></section></body></html>'
  );
}

module.exports = async function (req, res) {
  var id = (req.query && req.query.relacia) || '';
  var demo = true;

  if (!BEZ_PLATBY) {
    try {
      var objednavka = await overRelaciu(id);
      /* demo objednávka dostane demo inštalačku, predplatné plnú verziu */
      demo = objednavka.plan !== 'rok' && objednavka.plan !== 'mesiac';
    } catch (e) {
      odmietni(res, e.stav === 402 ? 402 : 403,
        'Inštalačka sa sťahuje až po dokončení objednávky. Demo je zadarmo,' +
        ' objednávka za 0 € slúži len na potvrdenie e-mailu.');
      return;
    }
  }

  try {
    var v = await posledneVydanie(demo);
    if (!v.asset) throw new Error('vydanie neobsahuje inštalačku');

    if (process.env.RELEASE_TOKEN) {
      var r = await fetch(v.asset.url, {
        headers: hlavicky('application/octet-stream'),
        redirect: 'manual'
      });
      var kam = r.headers.get('location');
      if (kam) {
        res.setHeader('Cache-Control', 'no-store');
        res.redirect(302, kam);
        return;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, v.asset.browser_download_url);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('Inštalačka je momentálne nedostupná. Skúste to prosím neskôr.');
  }
};
