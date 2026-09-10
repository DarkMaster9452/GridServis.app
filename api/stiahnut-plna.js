/* GET /api/stiahnut-plna — priame stiahnutie plnej inštalačky bez platby.

   Zámerne bez overenia objednávky: samotný program sa bez licenčného
   kľúča neodomkne, takže stiahnutie plnej inštalačky vopred nič
   nesprístupňuje. Kľúč vydá až /api/stiahnut po zaplatenom predplatnom. */

var { posledneVydanie, hlavicky } = require('./_release');

module.exports = async function (req, res) {
  try {
    var v = await posledneVydanie(false);
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
    console.error('stiahnut-plna:', e.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('Inštalačka je momentálne nedostupná. Skúste to prosím neskôr.');
  }
};
