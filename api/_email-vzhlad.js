/* Spoločný vizuál pre e-maily GridServis. Vychádza z reklám GridServis
   („Čo je GridServis?“ a „Download our App“): modrá hlavička s mriežkou
   a bielym logom, telo na svetlej mriežke, veľký nadpis s modrou časťou,
   kroky v modrých štvorčekoch, tmavý pruh a kontaktná karta.

   Farby, písmo a krok mriežky (34 px) sú z assets/css/styles.css. Každé
   pozadie má aj bgcolor, lebo niektoré klienty štýl `background` zahodia. */

var fs = require('fs');
var path = require('path');

var WEB = 'https://www.gridservis.app';
var TELEFON = process.env.GRIDSERVIS_TELEFON || '0904 917 880';

var FARBY = {
  ink: '#0d1117',
  mut: '#55606e',
  mut2: '#8a93a1',
  linka: '#e8ebf0',
  mriezka: '#e4e8ef',
  bg: '#ffffff',
  bg2: '#f7f8fa',
  okolie: '#eef1f5',
  acc: '#2563eb',
  accSvetla: '#e6eeff',
  tmava: '#161a22'
};

/* Rovnaké písma ako na webe. Názvy s medzerou musia byť v jednoduchých
   úvodzovkách — dvojité by predčasne ukončili atribút style="…". */
var FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
var MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

/* Hlavičky idú do e-mailu ako inline PNG prílohy (cid:) — zobrazia sa aj
   vtedy, keď klient blokuje obrázky z internetu. Súbory v api/ sú kópie
   z assets/img. Pozadia (mriežka) sa cez cid nedajú, tie sú odkazom na web. */
var HLAVICKY = {
  app: { cid: 'gridservis-app', subor: '_hlavicka-app.png', web: WEB + '/assets/img/email-spatna-vazba.png', vyska: 280 },
  mriezka: { cid: 'gridservis-hlavicka', subor: '_hlavicka.png', web: WEB + '/assets/img/email-hlavicka.png', vyska: 150 }
};
var MRIEZKA = WEB + '/assets/img/email-mriezka.png';
var MRIEZKA_MODRA = WEB + '/assets/img/email-mriezka-modra.png';
var obsahSuborov = {};

function prilohy(html) {
  html = String(html || '');
  var vysledok = [];
  Object.keys(HLAVICKY).forEach(function (k) {
    var h = HLAVICKY[k];
    if (html.indexOf('cid:' + h.cid) === -1) return;
    if (!(h.subor in obsahSuborov)) {
      try { obsahSuborov[h.subor] = fs.readFileSync(path.join(__dirname, h.subor)).toString('base64'); }
      catch (e) { obsahSuborov[h.subor] = ''; console.error('email: hlavička', e.message); }
    }
    if (obsahSuborov[h.subor]) {
      vysledok.push({ filename: h.cid + '.png', content: obsahSuborov[h.subor], content_type: 'image/png', content_id: h.cid });
    }
  });
  return vysledok;
}

/* cid: → odkaz na web (pre naplánované e-maily a ako záloha) */
function bezPriloh(html) {
  var s = String(html || '');
  Object.keys(HLAVICKY).forEach(function (k) {
    s = s.split('cid:' + HLAVICKY[k].cid).join(HLAVICKY[k].web);
  });
  return s;
}

/* ---------- stavebné bloky ---------- */

function modre(text) {
  return text ? ' <span style="color:' + FARBY.acc + ';">' + text + '</span>' : '';
}

/* veľký nadpis s modrou časťou, ako „Čo je GridServis?“ v reklame */
function nadpis(text, modraCast) {
  return '\n      <h1 style="margin:0 0 18px;font-family:' + FONT + ';font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:' + FARBY.ink + ';">' + text + modre(modraCast) + '</h1>';
}

function podnadpis(text, modraCast) {
  return '\n      <h2 style="margin:28px 0 8px;font-family:' + FONT + ';font-size:20px;line-height:1.3;font-weight:800;color:' + FARBY.ink + ';">' + text + modre(modraCast) + '</h2>';
}

function pozdrav(meno) {
  return '\n      <p style="margin:0 0 10px;font-size:15px;line-height:1.5;color:' + FARBY.mut + ';">Dobrý deň' + (meno ? ', ' + meno : '') + ',</p>';
}

function odsek(html, tlmeny) {
  return '\n      <p style="margin:0 0 14px;font-size:' + (tlmeny ? '14px' : '16px') + ';line-height:1.6;color:' + (tlmeny ? FARBY.mut : FARBY.ink) + ';">' + html + '</p>';
}

/* očíslované kroky v modrých štvorčekoch, ako zoznam funkcií v reklame */
function kroky(polozky) {
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">' +
    polozky.map(function (p, i) {
      return '\n        <tr>' +
        '<td width="44" valign="top" style="padding:0 14px 16px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="40" height="40" align="center" bgcolor="' + FARBY.accSvetla + '" style="width:40px;height:40px;background-color:' + FARBY.accSvetla + ';border-radius:10px;font-family:' + FONT + ';font-size:17px;font-weight:800;color:' + FARBY.acc + ';">' + (i + 1) + '</td></tr></table></td>' +
        '<td valign="top" style="padding:0 0 16px;font-family:' + FONT + ';"><b style="font-size:15px;color:' + FARBY.ink + ';">' + p[0] + '</b><br><span style="font-size:14px;line-height:1.5;color:' + FARBY.mut + ';">' + p[1] + '</span></td>' +
        '</tr>';
    }).join('') +
    '\n      </table>';
}

function tlacidlo(text, href, bezZaloznehoOdkazu) {
  /* modré pozadie je trikrát (bgcolor, td aj odkaz), aby biely text nikdy
     neostal na bielom; pod tlačidlom je aj obyčajný odkaz */
  return '\n      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">' +
    '\n        <tr><td bgcolor="' + FARBY.acc + '" style="background-color:' + FARBY.acc + ';border-radius:10px;">' +
    '\n          <a href="' + href + '" style="display:inline-block;padding:14px 28px;font-family:' + FONT + ';font-size:15px;line-height:1;font-weight:700;color:#ffffff;background-color:' + FARBY.acc + ';border:1px solid ' + FARBY.acc + ';border-radius:10px;text-decoration:none;">' + text + '</a>' +
    '\n        </td></tr>\n      </table>' +
    (bezZaloznehoOdkazu ? '' :
      '\n      <p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:' + FARBY.mut + ';">Alebo otvorte: <a href="' + href + '" style="color:' + FARBY.acc + ';">' + href.replace(/^https?:\/\//, '').replace(/^mailto:/, '') + '</a></p>');
}

/* zvýraznený kód (licencia) */
function kodBlok(hodnota, popis) {
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">' +
    '\n        <tr><td align="center" bgcolor="' + FARBY.bg + '" style="padding:22px 16px;background-color:' + FARBY.bg + ';border:2px solid ' + FARBY.acc + ';border-radius:14px;">' +
    '\n          <div style="font-family:' + FONT + ';font-size:11px;line-height:1;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:' + FARBY.acc + ';margin-bottom:10px;">' + (popis || 'LICENČNÝ KÓD') + '</div>' +
    '\n          <div style="font-family:' + MONO + ';font-size:24px;line-height:1.4;font-weight:700;letter-spacing:.06em;color:' + FARBY.ink + ';">' + hodnota + '</div>' +
    '\n        </td></tr>\n      </table>';
}

/* veľký jednorazový kód na prihlásenie — dá sa ľahko označiť a Gmail/iOS
   ho z predmetu samy ponúknu na skopírovanie */
function otpBlok(hodnota, popis) {
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">' +
    '\n        <tr><td align="center" bgcolor="' + FARBY.bg + '" style="padding:24px 16px;background-color:' + FARBY.bg + ';border:2px solid ' + FARBY.acc + ';border-radius:14px;">' +
    '\n          <div style="font-family:' + FONT + ';font-size:11px;line-height:1;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:' + FARBY.acc + ';margin-bottom:12px;">' + (popis || 'KÓD') + '</div>' +
    '\n          <div style="font-family:' + MONO + ';font-size:42px;line-height:1.2;font-weight:700;letter-spacing:.18em;color:' + FARBY.ink + ';-webkit-user-select:all;user-select:all;">' + hodnota + '</div>' +
    '\n        </td></tr>\n      </table>';
}

/* modrá karta s mriežkou — ponuka alebo dôležitá výzva */
function modraKarta(m) {
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + FARBY.acc + '" style="margin:8px 0 16px;background-color:' + FARBY.acc + ';border-radius:16px;">' +
    '\n        <tr><td background="' + MRIEZKA_MODRA + '" bgcolor="' + FARBY.acc + '" style="background-color:' + FARBY.acc + ';background-image:url(\'' + MRIEZKA_MODRA + '\');background-repeat:repeat;border-radius:16px;padding:26px 26px 24px;font-family:' + FONT + ';">' +
    (m.stitok ? '\n          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:999px;padding:5px 12px;font-size:11px;line-height:1;font-weight:800;letter-spacing:.08em;color:' + FARBY.acc + ';">' + m.stitok + '</td></tr></table>' : '') +
    '\n          <p style="margin:14px 0 8px;font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-.01em;color:#ffffff;">' + m.titulok + '</p>' +
    '\n          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#e3ecff;">' + m.text + '</p>' +
    (m.tlacidlo ?
      '\n          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:10px;">' +
      '<a href="' + m.tlacidlo[1] + '" style="display:inline-block;padding:14px 26px;font-size:15px;line-height:1;font-weight:800;color:' + FARBY.acc + ';background-color:#ffffff;border:1px solid #ffffff;border-radius:10px;text-decoration:none;">' + m.tlacidlo[0] + '</a>' +
      '</td></tr></table>' : '') +
    (m.poznamka ? '\n          <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#c9d8ff;">' + m.poznamka + '</p>' : '') +
    '\n        </td></tr>\n      </table>';
}

/* tmavý pruh z reklamy „Menej chaosu, viac času na autá.“ */
function tmavyPruh(titulok, text) {
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + FARBY.tmava + '" style="margin:8px 0 16px;background-color:' + FARBY.tmava + ';border-radius:14px;">' +
    '\n        <tr>' +
    '<td width="64" valign="middle" style="padding:20px 0 20px 20px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="44" height="44" align="center" bgcolor="' + FARBY.acc + '" style="width:44px;height:44px;background-color:' + FARBY.acc + ';border-radius:11px;font-family:' + FONT + ';font-size:22px;font-weight:700;color:#ffffff;">&#8599;</td></tr></table></td>' +
    '<td valign="middle" style="padding:20px 20px 20px 14px;font-family:' + FONT + ';">' +
    '<p style="margin:0 0 4px;font-size:18px;line-height:1.25;font-weight:800;color:#ffffff;">' + (titulok || 'Menej chaosu, viac času na autá.') + '</p>' +
    (text ? '<p style="margin:0;font-size:13px;line-height:1.5;color:#98a3b3;">' + text + '</p>' : '') +
    '</td></tr>\n      </table>';
}

/* kontaktná karta zo spodku reklamy „Download our App“ */
function kontaktKarta(titulok) {
  var tel = TELEFON.replace(/\s+/g, '');
  return '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + FARBY.bg + '" style="margin:0 0 8px;background-color:' + FARBY.bg + ';border:1px solid ' + FARBY.mriezka + ';border-radius:14px;">' +
    '\n        <tr><td align="center" style="padding:18px 16px;font-family:' + FONT + ';">' +
    '<p style="margin:0 0 6px;font-size:16px;font-weight:800;color:' + FARBY.ink + ';">' + (titulok || 'Radšej telefonicky?') + '</p>' +
    '<p style="margin:0;font-size:14px;line-height:1.6;color:' + FARBY.mut + ';">' +
    '<a href="tel:+421' + tel.replace(/^0/, '') + '" style="color:' + FARBY.acc + ';text-decoration:none;font-weight:700;">' + TELEFON + '</a>' +
    ' &nbsp;·&nbsp; <a href="' + WEB + '" style="color:' + FARBY.acc + ';text-decoration:none;font-weight:700;">www.gridservis.app</a></p>' +
    '</td></tr>\n      </table>';
}

function podpis(veta) {
  return '\n      <p style="margin:24px 0 4px;font-size:15px;line-height:1.6;color:' + FARBY.ink + ';">' + (veta || 'Pekný deň') + '</p>' +
    '\n      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;font-weight:700;color:' + FARBY.ink + ';">Tím GridServis</p>';
}

function drobne(html) {
  return '\n      <p style="margin:18px 0 20px;font-size:12px;line-height:1.6;color:' + FARBY.mut2 + ';">' + html + '</p>';
}

/* ---------- obal ---------- */

function hlavicka(typ) {
  var h = HLAVICKY[typ] || HLAVICKY.mriezka;
  /* keď klient obrázok zablokuje, ostane modrý pruh s bielym nápisom (alt) */
  return '\n    <tr><td bgcolor="' + FARBY.acc + '" height="' + h.vyska + '" style="background-color:' + FARBY.acc + ';line-height:0;font-size:0;">' +
    '\n      <img src="cid:' + h.cid + '" width="560" height="' + h.vyska + '" alt="GridServis" style="display:block;width:100%;max-width:560px;height:auto;border:0;color:#ffffff;font-family:' + FONT + ';font-size:28px;font-weight:700;line-height:' + (h.vyska / 2) + 'px;text-align:center;">' +
    '\n    </td></tr>';
}

function paticka(odpoved) {
  var hodnoty = ['Spoľahlivý', 'Úspora času', 'Vyššia efektivita', 'Spokojní zákazníci'];
  return '\n    <tr><td bgcolor="' + FARBY.bg2 + '" style="background-color:' + FARBY.bg2 + ';border-top:1px solid ' + FARBY.linka + ';padding:18px 20px;">' +
    '\n      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    hodnoty.map(function (h) {
      return '<td align="center" width="25%" style="font-family:' + FONT + ';font-size:12px;line-height:1.4;color:' + FARBY.mut + ';"><span style="color:' + FARBY.acc + ';font-weight:700;">&#10003;</span><br>' + h + '</td>';
    }).join('') +
    '</tr></table>' +
    '\n    </td></tr>' +
    '\n    <tr><td bgcolor="' + FARBY.bg2 + '" align="center" style="background-color:' + FARBY.bg2 + ';padding:0 20px 22px;font-family:' + FONT + ';font-size:12px;line-height:1.6;color:' + FARBY.mut2 + ';">' +
    'GridServis — program na správu autoservisu · <a href="mailto:' + odpoved + '" style="color:' + FARBY.mut2 + ';">' + odpoved + '</a>' +
    '\n    </td></tr>';
}

/* Zabalí telo e-mailu do jednotného vizuálu.
   moznosti: true/'mriezka' = modrá hlavička s logom, 'app' = hlavička so
   screenshotom aplikácie, alebo { hlavicka, predhlavicka } */
function obalka(predmet, obsahHtml, webUrl, odpoved, moznosti) {   // webUrl sa nepoužíva, ostáva kvôli volaniam
  var m = typeof moznosti === 'object' && moznosti ? moznosti : { hlavicka: moznosti === 'app' ? 'app' : 'mriezka' };
  var predhlavicka = m.predhlavicka
    ? '\n<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + FARBY.okolie + ';">' + m.predhlavicka + '</div>'
    : '';
  return '<!doctype html>' +
    '\n<html lang="sk">' +
    '\n<head>' +
    '\n<meta charset="utf-8">' +
    '\n<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '\n<meta name="color-scheme" content="light">' +
    '\n<title>' + predmet + '</title>' +
    '\n</head>' +
    '\n<body bgcolor="' + FARBY.okolie + '" style="margin:0;padding:0;background-color:' + FARBY.okolie + ';">' +
    predhlavicka +
    '\n<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + FARBY.okolie + '" style="background-color:' + FARBY.okolie + ';">' +
    '\n<tr><td align="center" style="padding:32px 12px;">' +
    '\n  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + FARBY.bg + '" style="max-width:560px;background-color:' + FARBY.bg + ';border-radius:16px;overflow:hidden;font-family:' + FONT + ';color:' + FARBY.ink + ';">' +
    hlavicka(m.hlavicka) +
    '\n    <tr><td background="' + MRIEZKA + '" bgcolor="' + FARBY.bg + '" style="background-color:' + FARBY.bg + ';background-image:url(\'' + MRIEZKA + '\');background-repeat:repeat;padding:34px 32px 8px;font-family:' + FONT + ';">' +
    obsahHtml +
    '\n    </td></tr>' +
    paticka(odpoved) +
    '\n  </table>' +
    '\n</td></tr>' +
    '\n</table>' +
    '\n</body>' +
    '\n</html>';
}

/* ---------- odoslanie cez Resend ----------
   Hlavičky idú ako inline prílohy. Keby Resend prílohu odmietol (4xx),
   pošle sa e-mail znova bez nej a obrázky sa načítajú z webu.
   moznosti.naplanovat (ISO dátum) = Resend ho odošle neskôr; naplánovaný
   e-mail ide bez príloh, obrázky z webu. moznosti.kluc = Idempotency-Key. */
async function odosli(sprava, moznosti) {
  moznosti = moznosti || {};
  var hlavicky = { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' };
  if (moznosti.kluc) hlavicky['Idempotency-Key'] = moznosti.kluc;

  if (moznosti.naplanovat) {
    return fetch('https://api.resend.com/emails', {
      method: 'POST', headers: hlavicky,
      body: JSON.stringify(Object.assign({}, sprava, { html: bezPriloh(sprava.html), scheduled_at: moznosti.naplanovat }))
    });
  }

  var r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: hlavicky,
    body: JSON.stringify(Object.assign({ attachments: prilohy(sprava.html) }, sprava))
  });
  if (!r.ok && r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403 && r.status !== 429) {
    console.error('email: bez prílohy', r.status, await r.text().catch(function () { return ''; }));
    delete hlavicky['Idempotency-Key'];
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: hlavicky,
      body: JSON.stringify(Object.assign({}, sprava, { html: bezPriloh(sprava.html) }))
    });
  }
  return r;
}

module.exports = {
  obalka: obalka, odosli: odosli, prilohy: prilohy, bezPriloh: bezPriloh,
  nadpis: nadpis, podnadpis: podnadpis, pozdrav: pozdrav, odsek: odsek, kroky: kroky,
  tlacidlo: tlacidlo, kodBlok: kodBlok, otpBlok: otpBlok, modraKarta: modraKarta,
  tmavyPruh: tmavyPruh, kontaktKarta: kontaktKarta, podpis: podpis, drobne: drobne,
  FONT: FONT, FARBY: FARBY, TELEFON: TELEFON
};
