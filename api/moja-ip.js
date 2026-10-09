/* GET /api/moja-ip — vráti adresu, z ktorej prišla žiadosť.
   Používa ju admin na vylúčenie vlastného počítača zo štatistík. Nič sa neukladá. */

module.exports = function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  var h = req.headers || {};
  var ip = String(h['x-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim()
    || (req.socket && req.socket.remoteAddress) || '';
  res.status(200).json({ ip: ip });
};
