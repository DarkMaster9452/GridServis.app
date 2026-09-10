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
var FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
var MONO = 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace';

function tlacidlo(text, href) {
  return '\n  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">' +
    '\n    <tr><td style="border-radius:10px;background:' + FARBY.acc + ';">' +
    '\n      <a href="' + href + '" style="display:inline-block;padding:13px 26px;font:600 15px/1 ' + FONT + ';color:#ffffff;text-decoration:none;border-radius:10px;">' + text + '</a>' +
    '\n    </td></tr>\n  </table>';
}

/* Licenčný kód — zvýraznený monospace blok, ako .kod na webe. */
function kodBlok(hodnota, popis) {
  return '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">' +
    '\n    <tr><td align="center" style="padding:22px;border:2px solid ' + FARBY.tmava + ';border-radius:' + RADIUS + ';background:' + FARBY.bg + ';">' +
    '\n      <div style="font:600 11px/1 ' + FONT + ';letter-spacing:.11em;text-transform:uppercase;color:' + FARBY.mut + ';margin-bottom:8px;">' + (popis || 'LICENČNÝ KÓD') + '</div>' +
    '\n      <div style="font:700 26px/1.4 ' + MONO + ';letter-spacing:.06em;color:' + FARBY.ink + ';background:' + FARBY.bg2 + ';display:inline-block;padding:4px 14px;border-radius:10px;">' + hodnota + '</div>' +
    '\n    </td></tr>\n  </table>';
}

/* Hlavička e-mailu — biela, so skutočným logom, rovnako ako .hdr na webe
   (ten je tiež svetlý s tmavým logom, nie tmavý pruh). */
function znacka(webUrl) {
  return '\n  <tr><td style="background:' + FARBY.bg + ';padding:22px 32px;border-radius:' + RADIUS + ' ' + RADIUS + ' 0 0;border-bottom:1px solid ' + FARBY.linka + ';">' +
    '\n    <img src="' + webUrl + '/assets/img/gridservis-logo.png" width="149" height="30" alt="GridServis" style="display:block;width:149px;height:30px;border:0;">' +
    '\n  </td></tr>';
}

function paticka(webUrl, odpoved) {
  return '\n  <tr><td style="padding:24px 32px;background:' + FARBY.bg2 + ';border-radius:0 0 ' + RADIUS + ' ' + RADIUS + ';border-top:1px solid ' + FARBY.linka + ';">' +
    '\n    <p style="margin:0 0 6px;font:400 12.5px/1.6 ' + FONT + ';color:' + FARBY.mut + ';">' +
    '\n      GridServis — program na správu autoservisu · ' +
    '\n      <a href="' + webUrl + '" style="color:' + FARBY.mut + ';text-decoration:underline;">' + webUrl.replace('https://', '').replace('http://', '') + '</a>' +
    '\n    </p>' +
    '\n    <p style="margin:0;font:400 12px/1.6 ' + FONT + ';color:#8a93a1;">' +
    '\n      Otázky k licencii? Napíšte na <a href="mailto:' + odpoved + '" style="color:#8a93a1;">' + odpoved + '</a>.' +
    '\n    </p>' +
    '\n  </td></tr>';
}

/* Zabalí telo e-mailu do jednotného vizuálu. */
function obalka(predmet, obsahHtml, webUrl, odpoved) {
  return '<!doctype html>' +
    '\n<html lang="sk">' +
    '\n<head>' +
    '\n<meta charset="utf-8">' +
    '\n<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '\n<meta name="color-scheme" content="light">' +
    '\n<title>' + predmet + '</title>' +
    '\n</head>' +
    '\n<body style="margin:0;padding:32px 16px;background:' + FARBY.bg2 + ';font:400 15px/1.65 ' + FONT + ';color:' + FARBY.ink + ';">' +
    '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:' + FARBY.bg + ';border-radius:' + RADIUS + ';overflow:hidden;box-shadow:0 2px 6px rgba(13,17,23,.05),0 18px 40px -28px rgba(13,17,23,.28);">' +
    znacka(webUrl) +
    '\n    <tr><td style="padding:34px 32px 12px;">' +
    obsahHtml +
    '\n    </td></tr>' +
    paticka(webUrl, odpoved) +
    '\n  </table>' +
    '\n</body>' +
    '\n</html>';
}

module.exports = { tlacidlo: tlacidlo, kodBlok: kodBlok, obalka: obalka };
