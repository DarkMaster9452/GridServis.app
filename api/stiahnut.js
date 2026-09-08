/* GET /api/stiahnut — presmeruje na inštalačku posledného vydania.
   Pri súkromnom zdroji sa použije podpísaná adresa, ktorú vráti server,
   takže sa v prehliadači neobjaví adresa repozitára. */

var { posledneVydanie, hlavicky } = require('./_release');

module.exports = async function (req, res) {
  try {
    var v = await posledneVydanie();
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
