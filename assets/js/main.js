/* Mechanik — web. Menu, kalkulačka licencie, údaje o poslednom vydaní. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     NASTAVENIA — tu sa mení e-mail, adresa platobnej brány a ceny.
     ------------------------------------------------------------------ */
  var EMAIL = 'strananek@gmail.com';     // kontakt na objednávky a podporu

  var PLATBA = '';                       // TODO: adresa platobnej brány.
                                         // Kým je prázdna, tlačidlá Kúpiť
                                         // vedú do cenníka, respektíve na
                                         // objednávku e-mailom.

  var PASMA = [                          // od koľkých počítačov platí cena za kus
    { od: 10, cena: 239.99 },
    { od: 5,  cena: 279.99 },
    { od: 2,  cena: 319.99 },
    { od: 1,  cena: 359.99 }
  ];

  var MAX = 10;                          // nad tento počet sa cena rieši dohodou


  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  function eur(n) {
    return n.toLocaleString('sk-SK', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' €';
  }

  function cenaZaKus(pocet) {
    for (var i = 0; i < PASMA.length; i++) {
      if (pocet >= PASMA[i].od) return PASMA[i].cena;
    }
    return PASMA[PASMA.length - 1].cena;
  }

  function pocitace(n) {
    if (n === 1) return '1 počítač';
    if (n < 5) return n + ' počítače';
    return n + ' počítačov';
  }

  function mailto(predmet, telo) {
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(predmet) +
      (telo ? '&body=' + encodeURIComponent(telo) : '');
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
    el.href = mailto(PREDMET[el.getAttribute('data-mail')] || 'Mechanik');
  });
  each('[data-mail-txt]', function (el) {
    el.textContent = EMAIL;
    el.href = 'mailto:' + EMAIL;
  });

  /* ---------------- tlačidlá Kúpiť ---------------- */
  /* Kým nie je nastavená platobná brána, ostávajú odkazy z HTML. */
  if (PLATBA) {
    each('a[data-buy]', function (el) { el.href = PLATBA; });
  }

  /* ---------------- kalkulačka licencie ---------------- */
  var slider = document.getElementById('pocet');
  if (slider) {
    var hodnotaEl = document.getElementById('hodnota');
    var lblEl = document.getElementById('sumaLbl');
    var sumaEl = document.getElementById('suma');
    var perEl = document.getElementById('perks');
    var usporaEl = document.getElementById('uspora');
    var kupitEl = document.getElementById('kupit');
    var objEl = document.getElementById('objednat');
    var poznEl = document.getElementById('poznamka');
    var zaklad = cenaZaKus(1);

    var TELO_NA_MIERU =
      'Dobrý deň,\n\npotrebujem licenciu na program Mechanik pre viac ako ' +
      MAX + ' počítačov.\n\nPočet počítačov: \n\nFakturačné údaje:\n' +
      'Názov dielne: \nAdresa: \nIČO: \nIČ DPH: \n\nĎakujem.\n';

    var prepocitaj = function () {
      var n = parseInt(slider.value, 10) || 1;
      var naMieru = n > MAX;

      slider.setAttribute('aria-valuetext', naMieru ? 'cena na mieru' : pocitace(n));

      if (naMieru) {
        hodnotaEl.textContent = 'Viac ako ' + MAX + ' počítačov';
        lblEl.textContent = 'Cena na mieru';
        sumaEl.textContent = 'Dohodou';
        perEl.textContent = 'Napíšte mi, koľko staníc potrebujete, a pošlem ponuku.';
        usporaEl.hidden = true;
        kupitEl.textContent = 'Napísať e-mail';
        kupitEl.href = mailto('Licencia Mechanik — viac ako ' + MAX + ' PC', TELO_NA_MIERU);
        objEl.hidden = true;
        poznEl.textContent = 'Pri väčšom počte staníc dohodneme cenu aj spôsob nasadenia individuálne.';
        return;
      }

      var kus = cenaZaKus(n);
      var spolu = kus * n;
      var uspora = zaklad * n - spolu;

      hodnotaEl.textContent = pocitace(n);
      lblEl.textContent = 'Jednorazovo spolu';
      sumaEl.textContent = eur(spolu);
      perEl.textContent = eur(kus) + ' za počítač' + (n > 1 ? ' × ' + n : '');

      if (uspora > 0) {
        usporaEl.textContent = 'Ušetríte ' + eur(uspora);
        usporaEl.hidden = false;
      } else {
        usporaEl.hidden = true;
      }

      kupitEl.textContent = 'Kúpiť licenciu';
      kupitEl.href = PLATBA || 'kontakt.html';
      objEl.hidden = false;
      objEl.href = mailto('Objednávka licencie Mechanik — ' + n + ' PC',
        'Dobrý deň,\n\nmám záujem o licenciu na program Mechanik.\n\n' +
        'Počet počítačov: ' + n + '\n' +
        'Cena podľa kalkulačky: ' + eur(spolu) + ' jednorazovo\n\n' +
        'Fakturačné údaje:\nNázov dielne: \nAdresa: \nIČO: \nIČ DPH: \n\nĎakujem.\n');
      poznEl.textContent = 'Cena je konečná a platí sa raz. Po zaplatení dostanete odkaz na stiahnutie plnej verzie, licenčný kľúč a faktúru.';
    };

    slider.addEventListener('input', prepocitaj);
    slider.addEventListener('change', prepocitaj);
    prepocitaj();
  }

  /* ---------------- údaje o poslednom vydaní ---------------- */
  /* Číslo verzie a veľkosť dodá vlastný endpoint. Kým neodpovie,
     platia hodnoty zapísané priamo v HTML. */
  fetch('/api/verzia', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (v) {
      if (v.verzia) {
        each('[data-tag]', function (el) { el.textContent = v.verzia; });
      }
      if (v.velkost) {
        each('[data-size]', function (el) {
          el.textContent = (v.velkost / 1048576).toFixed(0) + ' MB';
        });
      }
      if (v.vydane) {
        var d = new Date(v.vydane).toLocaleDateString('sk-SK', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        each('[data-date]', function (el) { el.textContent = ' · vydané ' + d; });
      }
    })
    .catch(function () { /* zostanú hodnoty zapísané v HTML */ });
})();
