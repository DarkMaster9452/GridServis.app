/* GET /api/pristup?relacia=cs_... — overí objednávku a vráti, čo k nej patrí.

   Keď ide o zaplatené predplatné a licencia k nemu ešte nie je (webhook mešká
   alebo nie je nastavený), vydá sa práve tu. Kupujúci tak kód uvidí hneď. */

var { overRelaciu, stripe, adresaWebu } = require('./_stripe');
var { spracuj } = require('./_objednavka');

module.exports = async function (req, res) {
  var id = (req.query && req.query.relacia) || '';

  res.setHeader('Cache-Control', 'no-store');

  try {
    var v = await overRelaciu(id);
    var odpoved = { ok: true, plan: v.plan, email: v.email, suma: v.suma, kod: '' };

    /* licenciu vydávame len pri predplatnom; demo ju nepotrebuje */
    if (v.plan === 'rok' || v.plan === 'mesiac') {
      try {
        var relacia = await stripe('/checkout/sessions/' + id);
        var vysledok = await spracuj(relacia, adresaWebu(req));
        if (vysledok) {
          odpoved.kod = vysledok.kod || '';
          odpoved.platna_do = vysledok.platna_do || '';
          odpoved.poslany = Boolean(vysledok.poslany);
        }
      } catch (e) {
        /* platba je v poriadku, len licencia zatiaľ nie je — stránka to povie
           a kód dorazí e-mailom, keď webhook prejde */
        console.error('pristup: licencia', id, e.message);
      }
    }

    res.status(200).json(odpoved);
  } catch (e) {
    res.status(e.stav || 502).json({ ok: false, chyba: e.message });
  }
};
