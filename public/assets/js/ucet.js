/* Môj účet — SKÚŠOBNÁ správa licencie (ucet.html + api/ucet.js).
   Zobrazuje len licenčné údaje z webu; dáta z programu tu nikdy nie sú. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var formular = $('prihlasenie');
  var prehlad = $('prehlad');
  var oznam = $('oznam');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hlas(text) {
    oznam.textContent = text || '';
    oznam.hidden = !text;
  }

  function datum(d) {
    if (!d) return '—';
    var x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
    return isNaN(x) ? String(d).slice(0, 10) : x.toLocaleDateString('sk-SK');
  }

  function suma(centy, mena) {
    if (centy === null || centy === undefined || centy === '') return '—';
    return (Number(centy) / 100).toLocaleString('sk-SK', {
      style: 'currency', currency: String(mena || 'eur').toUpperCase()
    });
  }

  function dniDo(d) {
    if (!d) return null;
    var koniec = new Date(d + 'T23:59:59');
    return Math.ceil((koniec - new Date()) / 86400000);
  }

  async function api(akcia, data) {
    var r = await fetch('/api/ucet?akcia=' + akcia, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    var j = {};
    try { j = await r.json(); } catch (e) { /* prázdna odpoveď */ }
    j.stav = r.status;
    return j;
  }

  /* obnova a presun idú cez existujúce koncové body webu */
  async function presmeruj(url, data, tlacidlo) {
    tlacidlo.disabled = true;
    try {
      var r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      var j = await r.json();
      if (j.ok && j.url) { location.href = j.url; return; }
      hlas(j.chyba || 'Nepodarilo sa to.');
    } catch (e) {
      hlas('Spojenie zlyhalo, skúste to znova.');
    }
    tlacidlo.disabled = false;
  }

  /* ---------- zobrazenie ---------- */

  function stavLicencie(l) {
    var dni = dniDo(l.platna_do);
    if (l.stav !== 'aktivna') return { text: l.stav || 'neaktívna', cls: '' };
    if (dni !== null && dni < 0) return { text: 'vypršala', cls: 'u-stav--warn' };
    if (dni !== null && dni <= 14) return { text: 'končí o ' + dni + ' d', cls: 'u-stav--warn' };
    return { text: 'aktívna', cls: 'u-stav--ok' };
  }

  /* stĺpce tabuľky zariadenia sa môžu líšiť — vyberie sa, čo tam je */
  function pole(z, vzor) {
    for (var k in z) if (vzor.test(k) && z[k]) return z[k];
    return '';
  }

  function zariadenie(z, l, moznoPresun) {
    var nazov = pole(z, /^(nazov|meno|pc|pocitac|hostname)$/i);
    var kedy = pole(z, /(aktiv|vytvor|cas|datum|posled)/i);
    var odtlacok = String(z.odtlacok || '');
    return '<li><div>' +
      (nazov ? '<b>' + esc(nazov) + '</b>' : '') +
      '<code title="' + esc(odtlacok) + '">' + esc(odtlacok.slice(0, 18)) + (odtlacok.length > 18 ? '…' : '') + '</code>' +
      '<small>' + esc(z.stav || '') + (kedy ? ' · od ' + esc(datum(kedy)) : '') + '</small>' +
      '</div>' +
      (moznoPresun
        ? '<button class="btn btn--gh btn--sm" type="button" data-presun="' + esc(l.kod) + '" data-pc="' + esc(odtlacok) + '">Uvoľniť (5 €)</button>'
        : '') +
      '</li>';
  }

  function karta(l) {
    var s = stavLicencie(l);
    var dni = dniDo(l.platna_do);
    var aktivna = l.stav === 'aktivna' && (dni === null || dni >= 0);
    var pc = l.zariadenia || [];

    var akcie = '';
    if (l.predplatne) {
      akcie += '<button class="btn btn--pri btn--sm" type="button" data-portal="' + esc(l.kod) + '">Spravovať predplatné</button>';
    }
    if (!aktivna || (!l.predplatne && dni !== null && dni <= 14)) {
      akcie += '<button class="btn btn--' + (l.predplatne ? 'gh' : 'pri') + ' btn--sm" type="button" data-obnova="' + esc(l.kod) + '">Obnoviť licenciu</button>';
    }

    return '<article class="u-lic">' +
      '<div class="u-lic__hlava"><div>' +
        '<span class="u-lic__kod">' + esc(l.kod) + '</span>' +
        '<span class="u-lic__dielna">' + esc(l.dielna || '') + '</span>' +
      '</div><span class="u-stav ' + s.cls + '">' + esc(s.text) + '</span></div>' +
      '<dl class="specs">' +
        '<div><dt>Platí do</dt><dd>' + esc(datum(l.platna_do)) + '</dd></div>' +
        '<div><dt>Počítače</dt><dd>' + pc.length + ' / ' + l.max_zariadeni + '</dd></div>' +
        '<div><dt>Predplatné</dt><dd>' + (l.predplatne ? 'cez web (Stripe)' : 'bez automatickej obnovy') + '</dd></div>' +
      '</dl>' +
      (pc.length
        ? '<ul class="u-pc">' + pc.map(function (z) { return zariadenie(z, l, aktivna); }).join('') + '</ul>'
        : '<p class="u-pc__nic">Licencia zatiaľ nie je aktivovaná na žiadnom počítači.</p>') +
      (akcie ? '<div class="u-lic__akcie">' + akcie + '</div>' : '') +
      '</article>';
  }

  var DRUH = { checkout: 'Nákup', obnova: 'Obnova', presun: 'Presun' };
  var PLAN = { rok: 'ročné', mesiac: 'mesačné', presun: '' };

  function vykresli(d) {
    $('kto').textContent = d.email;
    var lic = d.licencie || [];

    var aktivne = lic.filter(function (l) {
      var dni = dniDo(l.platna_do);
      return l.stav === 'aktivna' && (dni === null || dni >= 0);
    });
    var najblizsia = aktivne.map(function (l) { return l.platna_do; }).filter(Boolean).sort()[0];
    var pocitace = lic.reduce(function (n, l) { return n + (l.zariadenia || []).length; }, 0);

    $('stat').innerHTML =
      '<div><b>' + aktivne.length + ' / ' + lic.length + '</b><span>aktívne licencie</span></div>' +
      '<div><b>' + pocitace + '</b><span>aktivované počítače</span></div>' +
      '<div><b>' + esc(najblizsia ? datum(najblizsia) : '—') + '</b><span>najbližšie obnovenie</span></div>';

    $('licencie').innerHTML = lic.length
      ? lic.map(karta).join('')
      : '<p class="u-pc__nic">K tomuto e-mailu nie je žiadna licencia.</p>';

    var riadky = (d.platby || []).map(function (p) {
      return '<tr><td>' + esc(datum(p.cas)) + '</td>' +
        '<td>' + esc((DRUH[p.druh] || p.druh || '') + (PLAN[p.plan] ? ' · ' + PLAN[p.plan] : '')) + '</td>' +
        '<td><code>' + esc(p.kod || '') + '</code></td>' +
        '<td>' + esc(suma(p.suma, p.mena)) + '</td>' +
        '<td>' + esc(p.stav || '') + '</td></tr>';
    });
    $('platby').tBodies[0].innerHTML = riadky.length
      ? riadky.join('')
      : '<tr><td class="u-prazdne" colspan="5">Zatiaľ žiadne platby cez web.</td></tr>';

    $('nadpis').textContent = 'Môj účet';
    $('uvod').textContent = 'Licencie, počítače a platby k vášmu e-mailu. Zákazky ani iné dáta z programu tu nie sú — tie zostávajú na počítači v dielni.';
    formular.hidden = true;
    prehlad.hidden = false;
  }

  async function nacitaj() {
    var d = await api('ja');
    if (d.ok) { hlas(''); vykresli(d); return; }
    prehlad.hidden = true;
    formular.hidden = false;
    if (d.stav === 503) hlas('Správa účtu zatiaľ nie je na tomto nasadení zapnutá.');
    /* kód z odkazu (napr. z programu) sa predvyplní */
    var kod = new URLSearchParams(location.search).get('kod');
    if (kod && !formular.kod.value) formular.kod.value = kod;
  }

  /* ---------- udalosti ---------- */

  formular.addEventListener('submit', async function (e) {
    e.preventDefault();
    var tl = formular.querySelector('button');
    tl.disabled = true;
    hlas('');
    try {
      var d = await api('prihlasit', {
        kod: formular.kod.value.trim(),
        email: formular.email.value.trim()
      });
      if (d.ok) { await nacitaj(); } else { hlas(d.chyba || 'Prihlásenie zlyhalo.'); }
    } catch (err) {
      hlas('Spojenie zlyhalo, skúste to znova.');
    }
    tl.disabled = false;
  });

  $('odhlasit').addEventListener('click', async function () {
    await api('odhlasit', {});
    formular.reset();
    $('nadpis').textContent = 'Správa licencie';
    nacitaj();
  });

  $('licencie').addEventListener('click', async function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    hlas('');

    if (t.dataset.portal) {
      t.disabled = true;
      var d = await api('portal', { kod: t.dataset.portal });
      if (d.ok && d.url) { location.href = d.url; return; }
      hlas(d.chyba || 'Odkaz sa nepodarilo pripraviť.');
      t.disabled = false;
    } else if (t.dataset.obnova) {
      presmeruj('/api/obnova', { kod: t.dataset.obnova }, t);
    } else if (t.dataset.presun) {
      if (!confirm('Uvoľniť tento počítač? Po zaplatení 5 € sa odhlási a licenciu aktivujete na inom počítači tým istým kódom.')) return;
      presmeruj('/api/presun', { kod: t.dataset.presun, pc: t.dataset.pc }, t);
    }
  });

  nacitaj();
})();
