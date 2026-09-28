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
    var r = await fetch('/api/ucet/' + akcia, {
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

  function zariadenie(z, l, moznoPresun) {
    var odtlacok = String(z.odtlacok || '');
    var detail = [z.os, z.verzia_appky ? 'v' + z.verzia_appky : '', z.stav,
      z.aktivovane ? 'od ' + datum(z.aktivovane) : '',
      z.posledna_kontrola ? 'naposledy ' + datum(z.posledna_kontrola) : ''].filter(Boolean).join(' · ');
    return '<li><div>' +
      '<b>' + esc(z.nazov_pc || 'Počítač') + '</b>' +
      '<code title="' + esc(odtlacok) + '">' + esc(odtlacok.slice(0, 18)) + (odtlacok.length > 18 ? '…' : '') + '</code>' +
      '<small>' + esc(detail) + '</small>' +
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
        '<div><dt>Platí do</dt><dd>' + esc(l.platna_do ? datum(l.platna_do) : 'bez obmedzenia') + '</dd></div>' +
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
    hlas('');
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

  var krok1 = $('krok1');
  var krok2 = $('krok2');
  var odpocet = null;

  function ukazKrok(n) {
    krok1.hidden = n !== 1;
    krok2.hidden = n !== 2;
    clearInterval(odpocet);
  }

  /* 15 minút na zadanie kódu; potom treba požiadať o nový */
  function spustOdpocet(minut) {
    var koniec = Date.now() + minut * 60000;
    function tik() {
      var zostava = Math.max(0, Math.round((koniec - Date.now()) / 1000));
      $('odpocet').textContent = Math.floor(zostava / 60) + ':' + String(zostava % 60).padStart(2, '0');
      if (!zostava) {
        clearInterval(odpocet);
        krok2.kod.disabled = true;
        krok2.querySelector('[type=submit]').disabled = true;
        hlas('Kód vypršal. Požiadajte o nový.');
      }
    }
    clearInterval(odpocet);
    krok2.kod.disabled = false;
    krok2.querySelector('[type=submit]').disabled = false;
    tik();
    odpocet = setInterval(tik, 1000);
  }

  async function nastavenia() {
    var n = await api('nastavenia');
    $('google').hidden = !n.google;
    $('apple').hidden = !n.apple;
    $('socialne').hidden = !(n.google || n.apple);
  }

  async function nacitaj() {
    var d = await api('ja');
    if (d.ok) { vykresli(d); return; }
    prehlad.hidden = true;
    formular.hidden = false;
    ukazKrok(1);
    if (d.stav === 503) { hlas('Správa účtu zatiaľ nie je na tomto nasadení zapnutá.'); return; }
    nastavenia();
    var q = new URLSearchParams(location.search);
    /* licenčný kód z odkazu (napr. z programu) sa predvyplní */
    if (q.get('kod') && !krok1.licencia.value) krok1.licencia.value = q.get('kod');
    /* chyba po návrate z Google / Apple */
    if (q.get('chyba')) hlas(q.get('chyba'));
  }

  async function poziadat(tl) {
    tl.disabled = true;
    hlas('');
    try {
      var d = await api('poziadat', {
        licencia: krok1.licencia.value.trim(),
        email: krok1.email.value.trim()
      });
      if (d.ok) {
        $('kam').textContent = krok1.email.value.trim();
        krok2.reset();
        ukazKrok(2);
        spustOdpocet(d.minut || 15);
        krok2.kod.focus();
      } else {
        hlas(d.chyba || 'Kód sa nepodarilo poslať.');
      }
    } catch (err) {
      hlas('Spojenie zlyhalo, skúste to znova.');
    }
    tl.disabled = false;
  }

  krok1.addEventListener('submit', function (e) {
    e.preventDefault();
    poziadat(krok1.querySelector('button'));
  });

  $('znova').addEventListener('click', function () { poziadat(this); });
  $('spat').addEventListener('click', function () { hlas(''); ukazKrok(1); });

  krok2.kod.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    if (this.value.length === 6) krok2.requestSubmit();
  });

  krok2.addEventListener('submit', async function (e) {
    e.preventDefault();
    var tl = krok2.querySelector('[type=submit]');
    if (tl.disabled) return;
    tl.disabled = true;
    hlas('');
    try {
      var d = await api('overit', { email: krok1.email.value.trim(), kod: krok2.kod.value });
      if (d.ok) {
        clearInterval(odpocet);
        history.replaceState(null, '', location.pathname);
        await nacitaj();
      } else {
        hlas(d.chyba || 'Prihlásenie zlyhalo.');
        if (d.znova) { ukazKrok(1); } else { krok2.kod.select(); }
      }
    } catch (err) {
      hlas('Spojenie zlyhalo, skúste to znova.');
    }
    tl.disabled = false;
  });

  $('odhlasit').addEventListener('click', async function () {
    await api('odhlasit', {});
    krok1.reset();
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
