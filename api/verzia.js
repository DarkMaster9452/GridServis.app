/* GET /api/verzia — číslo verzie, veľkosť a dátum poslednej inštalačky.
   Parameter demo=1 vráti údaje o demo inštalačke namiesto plnej verzie. */

var { posledneVydanie } = require('./_release');

module.exports = async function (req, res) {
  var demo = String((req.query && req.query.demo) || '') === '1';
  try {
    var v = await posledneVydanie(demo);
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    res.status(200).json({
      verzia: (v.rel.tag_name || '').replace(/^v/, ''),
      subor: v.asset ? v.asset.name : null,
      velkost: v.asset ? v.asset.size : null,
      vydane: v.rel.published_at || null
    });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ chyba: 'Údaje o verzii sa nepodarilo načítať.' });
  }
};
