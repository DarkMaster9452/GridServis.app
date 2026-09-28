/* Spoločný vizuál pre e-maily GridServis. Farby, radius a font sú prevzaté
   1:1 z assets/css/styles.css, aby e-mail pôsobil ako súčasť tej istej
   značky, nie ako cudzí systém. */

var FARBY = {
  tmava: '#101722',
  ink: '#0d1117',
  mut: '#55606e',
  linka: '#e8ebf0',
  bg: '#ffffff',
  bg2: '#f7f8fa',
  acc: '#2563eb'
};

var RADIUS = '14px';

/* Logo ide do e-mailu priamo ako PNG príloha (inline, cid:), nie odkazom
   na web — zobrazí sa aj vtedy, keď klient blokuje obrázky z internetu,
   a v e-maile nie je žiadna adresa. Súbor je kópia assets/img/gridservis-logo.png. */
var fs = require('fs');
var path = require('path');
var LOGO_CID = 'gridservis-logo';
var logoBase64 = null;

function prilohy() {
  if (logoBase64 === null) {
    try { logoBase64 = fs.readFileSync(path.join(__dirname, '_logo.png')).toString('base64'); }
    catch (e) { logoBase64 = ''; console.error('email: logo', e.message); }
  }
  return logoBase64
    ? [{ filename: 'gridservis-logo.png', content: logoBase64, content_type: 'image/png', content_id: LOGO_CID }]
    : [];
}
/* Rovnaké písma ako na webe. Názvy s medzerou musia byť v jednoduchých
   úvodzovkách — dvojité by predčasne ukončili atribút style="…" a e-mailový
   klient by celý štýl zahodil (kód bol potom malý a obyčajným písmom). */
var FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI Variable Text','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
var MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

function tlacidlo(text, href) {
  return '\n  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">' +
    '\n    <tr><td style="border-radius:10px;background:' + FARBY.acc + ';">' +
    '\n      <a href="' + href + '" style="display:inline-block;padding:13px 26px;font-family:' + FONT + ';font-size:15px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">' + text + '</a>' +
    '\n    </td></tr>\n  </table>';
}

/* Licenčný kód — zvýraznený monospace blok, ako .kod na webe. */
function kodBlok(hodnota, popis) {
  return '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">' +
    '\n    <tr><td align="center" style="padding:22px;border:2px solid ' + FARBY.tmava + ';border-radius:' + RADIUS + ';background:' + FARBY.bg + ';">' +
    '\n      <div style="font-family:' + FONT + ';font-size:11px;line-height:1;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:' + FARBY.mut + ';margin-bottom:8px;">' + (popis || 'LICENČNÝ KÓD') + '</div>' +
    '\n      <div style="font-family:' + MONO + ';font-size:26px;line-height:1.4;font-weight:700;letter-spacing:.06em;color:' + FARBY.ink + ';background:' + FARBY.bg2 + ';display:inline-block;padding:4px 14px;border-radius:10px;">' + hodnota + '</div>' +
    '\n    </td></tr>\n  </table>';
}

/* Hlavička e-mailu — biela, so skutočným logom, rovnako ako .hdr na webe
   (ten je tiež svetlý s tmavým logom, nie tmavý pruh). */
function znacka() {
  return '\n  <tr><td style="background:' + FARBY.bg + ';padding:22px 32px;border-radius:' + RADIUS + ' ' + RADIUS + ' 0 0;border-bottom:1px solid ' + FARBY.linka + ';">' +
    '\n    <img src="cid:' + LOGO_CID + '" width="160" height="32" alt="GridServis" style="display:block;width:160px;height:32px;border:0;">' +
    '\n  </td></tr>';
}

function paticka(odpoved) {
  return '\n  <tr><td style="padding:24px 32px;background:' + FARBY.bg2 + ';border-radius:0 0 ' + RADIUS + ' ' + RADIUS + ';border-top:1px solid ' + FARBY.linka + ';">' +
    '\n    <p style="margin:0 0 6px;font-family:' + FONT + ';font-size:12.5px;line-height:1.6;color:' + FARBY.mut + ';">GridServis — program na správu autoservisu</p>' +
    '\n    <p style="margin:0;font-family:' + FONT + ';font-size:12px;line-height:1.6;color:#8a93a1;">' +
    '\n      Otázky k licencii? Napíšte na <a href="mailto:' + odpoved + '" style="color:#8a93a1;">' + odpoved + '</a>.' +
    '\n    </p>' +
    '\n  </td></tr>';
}

/* Zabalí telo e-mailu do jednotného vizuálu. */
function obalka(predmet, obsahHtml, webUrl, odpoved) {   // webUrl sa už nepoužíva, ostáva kvôli volaniam
  return '<!doctype html>' +
    '\n<html lang="sk">' +
    '\n<head>' +
    '\n<meta charset="utf-8">' +
    '\n<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '\n<meta name="color-scheme" content="light">' +
    '\n<title>' + predmet + '</title>' +
    '\n</head>' +
    '\n<body style="margin:0;padding:32px 16px;background:' + FARBY.bg2 + ';font-family:' + FONT + ';font-size:15px;line-height:1.65;color:' + FARBY.ink + ';">' +
    '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:' + FARBY.bg + ';border-radius:' + RADIUS + ';overflow:hidden;box-shadow:0 2px 6px rgba(13,17,23,.05),0 18px 40px -28px rgba(13,17,23,.28);">' +
    znacka() +
    '\n    <tr><td style="padding:34px 32px 12px;">' +
    obsahHtml +
    '\n    </td></tr>' +
    paticka(odpoved) +
    '\n  </table>' +
    '\n</body>' +
    '\n</html>';
}

/* Veľký jednorazový kód na prihlásenie. E-mail nevie spustiť skript, takže
   „klik a skopírovať“ sa nedá; kód je preto veľký, dá sa ľahko označiť
   a Gmail/iOS ho z predmetu samy ponúknu na skopírovanie. */
function otpBlok(hodnota, popis) {
  return '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">' +
    '\n    <tr><td align="center" style="padding:26px 18px;border:2px solid ' + FARBY.tmava + ';border-radius:' + RADIUS + ';background:' + FARBY.bg + ';">' +
    '\n      <div style="font-family:' + FONT + ';font-size:11px;line-height:1;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:' + FARBY.mut + ';margin-bottom:12px;">' + (popis || 'KÓD') + '</div>' +
    '\n      <div style="font-family:' + MONO + ';font-size:44px;line-height:1.2;font-weight:700;letter-spacing:.18em;color:' + FARBY.ink + ';background:' + FARBY.bg2 + ';display:inline-block;padding:8px 10px 8px 18px;border-radius:12px;-webkit-user-select:all;user-select:all;">' + hodnota + '</div>' +
    '\n    </td></tr>\n  </table>';
}

/* Odoslanie cez Resend s logom ako inline prílohou. Keby Resend prílohu
   odmietol (4xx), pošle sa e-mail znova bez nej a logo sa načíta z webu —
   radšej logo z internetu než žiadny e-mail. */
var LOGO_WEB = 'https://www.gridservis.app/assets/img/gridservis-logo.png';

async function odosli(sprava) {
  var hlavicky = { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' };
  var r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: hlavicky,
    body: JSON.stringify(Object.assign({ attachments: prilohy() }, sprava))
  });
  if (!r.ok && r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403 && r.status !== 429) {
    console.error('email: bez prílohy', r.status, await r.text().catch(function () { return ''; }));
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: hlavicky,
      body: JSON.stringify(Object.assign({}, sprava, {
        html: String(sprava.html || '').split('cid:' + LOGO_CID).join(LOGO_WEB)
      }))
    });
  }
  return r;
}

module.exports = { tlacidlo: tlacidlo, kodBlok: kodBlok, otpBlok: otpBlok, obalka: obalka, prilohy: prilohy, odosli: odosli, FONT: FONT };
