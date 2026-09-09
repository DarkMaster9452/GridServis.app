/* GET /api/pristup?relacia=cs_... — overí, či je objednávka dokončená.
   Stránka hotovo.html si podľa toho vypýta stiahnutie a text pre plán. */

var { overRelaciu } = require('./_stripe');

module.exports = async function (req, res) {
  var id = (req.query && req.query.relacia) || '';

  res.setHeader('Cache-Control', 'no-store');

  try {
    var v = await overRelaciu(id);
    res.status(200).json({ ok: true, plan: v.plan, email: v.email, suma: v.suma });
  } catch (e) {
    res.status(e.stav || 502).json({ ok: false, chyba: e.message });
  }
};
