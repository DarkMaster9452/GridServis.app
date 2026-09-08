/* Mechanik — web. Menu, kalkulačka licencie, údaje o poslednom vydaní. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     NASTAVENIA — tu meňte kontaktný e-mail a ceny licencie.
     ------------------------------------------------------------------ */
  var EMAIL = 'licencia@mechanik.sk';   // TODO: doplniť skutočný e-mail

  var PASMA = [                          // od koľkých počítačov platí cena za kus
    { od: 10, cena: 89 },
    { od: 5,  cena: 109 },
    { od: 2,  cena: 129 },
    { od: 1,  cena: 149 }
  ];

  var REPO = 'DarkMaster9452/Custom-Autoservis-manager';
  var ASSET = 'MechanikSetup.exe';

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  function eur(n) {
    return n.toLocaleString('sk-SK') + ' €';
  }

  function cenaZaKus(pocet) {
    for (var i = 0; i < PASMA.length; i++) {
      if (pocet >= PASMA[i].od) return PASMA[i].cena;
    }
    return PASMA[PASMA.length - 1].cena;
  }

  /* ---------------- hlavička ---------------- */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var stick = function () { hdr.classList.toggle('on', window.scrollY > 6); };
    window.addEventListener('scroll', stick, { passive: true });
    stick();
  }

  var burger = document.getElementById('burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Otvoriť menu' : 'Zavrieť menu');
      mnav.hidden = open;
    });
  }

  each('[data-rok]', function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------------- e-mailové odkazy ---------------- */
  var PREDMET = {
    objednavka: 'Objednávka licencie Mechanik',
    podpora: 'Mechanik — podpora'
  };
  each('[data-mail]', function (el) {
    el.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(PREDMET[el.getAttribute('data-mail')] || 'Mechanik');
  });
  each('[data-mail-txt]', function (el) {
    el.textContent = EMAIL;
    el.href = 'mailto:' + EMAIL;
  });

  /* ---------------- kalkulačka licencie ---------------- */
  var pocetEl = document.getElementById('pocet');
  if (pocetEl) {
    var sumaEl = document.getElementById('suma');
    var perEl = document.getElementById('perks');
    var usporaEl = document.getElementById('uspora');
    var objEl = document.getElementById('objednat');
    var zaklad = cenaZaKus(1);

    var prepocitaj = function () {
      var n = parseInt(pocetEl.value, 10);
      if (isNaN(n) || n < 1) n = 1;
      if (n > 50) n = 50;
      pocetEl.value = n;

      var kus = cenaZaKus(n);
      var spolu = kus * n;
      var uspora = zaklad * n - spolu;

      sumaEl.textContent = eur(spolu);
      perEl.textContent = eur(kus) + ' za počítač' + (n > 1 ? ' × ' + n + ' počítačov' : '');

      if (uspora > 0) {
        usporaEl.textContent = 'Ušetríte ' + eur(uspora);
        usporaEl.hidden = false;
      } else {
        usporaEl.hidden = true;
      }

      objEl.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent('Objednávka licencie Mechanik — ' + n + ' PC') +
        '&body=' + encodeURIComponent(
          'Dobrý deň,\n\nmám záujem o licenciu na program Mechanik.\n\n' +
          'Počet počítačov: ' + n + '\n' +
          'Cena podľa kalkulačky: ' + eur(spolu) + ' jednorazovo\n\n' +
          'Fakturačné údaje:\n' +
          'Názov dielne: \nAdresa: \nIČO: \nIČ DPH: \n\n' +
          'Ďakujem.\n');

      each('.quick button', function (b) {
        b.classList.toggle('on', parseInt(b.getAttribute('data-set'), 10) === n);
      });
    };

    each('[data-step]', function (b) {
      b.addEventListener('click', function () {
        pocetEl.value = (parseInt(pocetEl.value, 10) || 1) + parseInt(b.getAttribute('data-step'), 10);
        prepocitaj();
      });
    });
    each('[data-set]', function (b) {
      b.addEventListener('click', function () {
        pocetEl.value = b.getAttribute('data-set');
        prepocitaj();
      });
    });
    pocetEl.addEventListener('input', prepocitaj);
    pocetEl.addEventListener('change', prepocitaj);
    prepocitaj();
  }

  /* ---------------- údaje o poslednom vydaní ---------------- */
  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (rel) {
      var tag = (rel.tag_name || '').replace(/^v/, '');
      if (tag) each('[data-tag]', function (el) { el.textContent = tag; });

      var a = (rel.assets || []).filter(function (x) { return x.name === ASSET; })[0] || (rel.assets || [])[0];
      if (a) {
        each('[data-size]', function (el) {
          el.textContent = (a.size / 1048576).toFixed(0) + ' MB';
        });
        each('a[data-dl]', function (el) { el.href = a.browser_download_url; });
      }
      if (rel.published_at) {
        var d = new Date(rel.published_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });
        each('[data-date]', function (el) { el.textContent = ' · vydané ' + d; });
      }
    })
    .catch(function () { /* zostanú hodnoty zapísané v HTML */ });
})();
