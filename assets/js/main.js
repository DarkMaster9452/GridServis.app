/* AutoAgenda — web. Menu, predplatné, údaje o poslednom vydaní. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     NASTAVENIA — tu sa mení e-mail, adresy platobnej brány a ceny.
     Ceny musia sedieť s hodnotami v tools/gen.py (premenná CENY).
     ------------------------------------------------------------------ */
  var EMAIL = 'strananekm@gmail.com';    // kontakt na objednávky a podporu

  var PLATBA = {                         // TODO: adresy platobnej brány.
    rok: '',                             // Kým sú prázdne, tlačidlá
    mesiac: ''                           // Predplatiť vedú na objednávku
  };                                     // e-mailom.

  var CENY = { rok: 199.99, mesiac: 19.99 };

  var NAZOV = { rok: 'ročné predplatné', mesiac: 'mesačné predplatné' };


  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  function eur(n) {
    return n.toLocaleString('sk-SK', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' €';
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
    objednavka: 'Objednávka predplatného AutoAgenda',
    podpora: 'AutoAgenda — podpora',
    viac: 'AutoAgenda — predplatné pre viac počítačov'
  };
  each('[data-mail]', function (el) {
    el.href = mailto(PREDMET[el.getAttribute('data-mail')] || 'AutoAgenda');
  });
  each('[data-mail-txt]', function (el) {
    el.textContent = EMAIL;
    el.href = 'mailto:' + EMAIL;
  });

  /* ---------------- tlačidlá predplatného ----------------
     Odkazy bez hodnoty (data-buy="") vedú z HTML do cenníka.
     Karty v cenníku majú data-buy="rok" alebo "mesiac": ak je
     nastavená platobná brána, idú na ňu, inak na objednávku e-mailom. */
  each('a[data-buy]', function (el) {
    var plan = el.getAttribute('data-buy');
    if (!plan || !CENY[plan]) return;
    if (PLATBA[plan]) { el.href = PLATBA[plan]; return; }
    el.href = mailto(
      'Objednávka predplatného AutoAgenda — ' + NAZOV[plan],
      'Dobrý deň,\n\nmám záujem o ' + NAZOV[plan] + ' programu AutoAgenda' +
      ' za ' + eur(CENY[plan]) + (plan === 'rok' ? ' na rok' : ' na mesiac') + '.\n\n' +
      'Počet počítačov: 1\nMeno alebo názov dielne: \nAdresa: \n\n' +
      'Beriem na vedomie, že inštalačka nie je podpísaná certifikátom' +
      ' a Windows pri jej spustení zobrazí varovanie.\n\nĎakujem.\n');
  });

  /* ---------------- údaje o poslednom vydaní ----------------
     Číslo verzie, veľkosť aj názov súboru berie /api/verzia priamo
     z posledného vydania na GitHube. Kým endpoint neodpovie, zostáva
     zobrazená len náhrada v [data-rel-off] a nič sa nevypisuje natvrdo. */
  fetch('/api/verzia', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (v) {
      if (!v.verzia) return;

      each('[data-tag]', function (el) { el.textContent = v.verzia; });

      if (v.subor) {
        each('[data-file]', function (el) { el.textContent = v.subor; });
      }
      if (v.velkost) {
        each('[data-size]', function (el) {
          el.textContent = (v.velkost / 1048576).toFixed(0) + ' MB';
        });
      } else {
        each('[data-size-wrap]', function (el) { el.hidden = true; });
      }
      if (v.vydane) {
        var d = new Date(v.vydane).toLocaleDateString('sk-SK', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        each('[data-date]', function (el) { el.textContent = d; });
      } else {
        each('[data-date-wrap]', function (el) { el.hidden = true; });
      }

      each('[data-rel]', function (el) { el.hidden = false; });
      each('[data-rel-off]', function (el) { el.hidden = true; });
    })
    .catch(function () { /* zostane náhradný text v [data-rel-off] */ });
})();
