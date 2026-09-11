/* GridServis — web. Menu, predplatné, údaje o poslednom vydaní. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     NASTAVENIA — tu sa mení e-mail na objednávky a podporu.

     Ceny a plány sú na serveri v api/_stripe.js (premenná PLANY), lebo
     platbu zakladá Stripe. Texty s cenami na stránkach vychádzajú
     z premennej CENY v tools/gen.py; obe musia sedieť.
     ------------------------------------------------------------------ */
  var EMAIL = 'strananekm@gmail.com';    // kontakt na objednávky a podporu


  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
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
    objednavka: 'Objednávka predplatného GridServis',
    podpora: 'GridServis — podpora',
    viac: 'GridServis — predplatné pre viac počítačov'
  };
  each('[data-mail]', function (el) {
    el.href = mailto(PREDMET[el.getAttribute('data-mail')] || 'GridServis');
  });
  each('[data-mail-txt]', function (el) {
    el.textContent = EMAIL;
    el.href = 'mailto:' + EMAIL;
  });

  /* ---------------- meranie návštevnosti ----------------
     Anonymné: žiadne cookies, žiadna IP. Identifikátor návštevy je náhodné
     číslo, ktoré žije len v jednej karte prehliadača. Keď sa nedá uložiť
     (súkromné okno), pošle sa udalosť bez neho. */
  function navsteva() {
    try {
      var id = sessionStorage.getItem('aa_navsteva');
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('aa_navsteva', id);
      }
      return id;
    } catch (e) {
      return '';
    }
  }

  function zdroj() {
    try {
      return document.referrer ? new URL(document.referrer).hostname : '';
    } catch (e) {
      return '';
    }
  }

  function zapis(typ, plan) {
    var udaje = JSON.stringify({
      typ: typ,
      plan: plan || '',
      stranka: location.pathname.replace(/^.*\//, '') || 'index.html',
      relacia: navsteva(),
      zdroj: zdroj()
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/udalost', new Blob([udaje], { type: 'application/json' }));
        return;
      }
    } catch (e) { /* skúsime to cez fetch */ }
    try {
      fetch('/api/udalost', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: udaje
      }).catch(function () {});
    } catch (e) { /* meranie nikdy nesmie prekážať stránke */ }
  }

  zapis('zobrazenie');

  /* kliky na tlačidlá — vidno, kde ľudia odpadnú */
  each('form.pay', function (f) {
    f.addEventListener('submit', function () {
      var plan = (f.querySelector('input[name="plan"]') || {}).value || '';
      zapis('pokladna', plan);
    });
  });
  each('a[href$="cennik.html"]', function (a) {
    a.addEventListener('click', function () { zapis('klik_predplatit'); });
  });
  each('a[href$="stiahnut.html"]', function (a) {
    a.addEventListener('click', function () { zapis('klik_demo'); });
  });

  /* ---------------- odkaz na pokladňu ----------------
     Tlačidlá Predplatiť a Získať demo sú formuláre na /api/checkout,
     ktorý založí platbu v Stripe a presmeruje na jeho pokladňu.
     Sem sa vraciame len s oznamom, keď sa niečo nepodarilo. */
  var oznam = document.getElementById('oznam');
  if (oznam) {
    var dovod = new URLSearchParams(location.search);
    var text = '';
    if (dovod.get('zrusene')) {
      text = 'Platba bola zrušená a nič sa nestrhlo. Skúsiť znova môžete kedykoľvek.';
    } else if (dovod.get('chyba') === 'brana') {
      text = 'Platobná brána zatiaľ nie je nastavená. Napíšte mi a objednávku vybavíme e-mailom.';
    } else if (dovod.get('chyba') === 'suhlas') {
      text = 'Bez zaškrtnutého súhlasu so začatím sťahovania sa objednávka' +
        ' založiť nedá. Zaškrtnite políčko nad tlačidlom a skúste to znova.';
    } else if (dovod.get('chyba') === 'platba') {
      text = 'Platbu sa nepodarilo založiť. Skúste to prosím znova, alebo mi napíšte.';
    }
    if (text) {
      oznam.textContent = text + ' ';
      /* Pri chýbajúcom súhlase nemá zmysel ponúkať objednávku e-mailom —
         chyba je na strane formulára a rieši sa zaškrtnutím políčka. */
      if (dovod.get('chyba') && dovod.get('chyba') !== 'suhlas') {
        var odkaz = document.createElement('a');
        odkaz.textContent = 'Napísať e-mail';
        odkaz.href = mailto(PREDMET.objednavka);
        oznam.appendChild(odkaz);
      }
      /* Hláška z platobnej brány, nech je pri nastavovaní vidieť,
         prečo sa platba nezaložila. */
      if (dovod.get('dovod')) {
        var detail = document.createElement('span');
        detail.className = 'oznam__detail';
        detail.textContent = dovod.get('dovod');
        oznam.appendChild(detail);
      }
      oznam.hidden = false;
    }
  }

  /* ---------------- stránka na obnovenie licencie ----------------
     Kód príde v adrese z programu; doplní sa do formulárov aj na obrazovku. */
  var kodZAdresy = (new URLSearchParams(location.search).get('kod') || '')
    .trim().toUpperCase();
  if (document.querySelector('form.pay [data-kod]')) {
    each('form.pay [data-kod]', function (pole) { pole.value = kodZAdresy; });
    var zobrazenie = document.getElementById('kodhodnota');
    if (zobrazenie && kodZAdresy) {
      zobrazenie.textContent = kodZAdresy;
      document.getElementById('kodpozn').textContent =
        'Po zaplatení sa predĺži práve táto licencia. Kód zostáva rovnaký, ' +
        'v programe ho nemusíte zadávať znova.';
    }
  }

  /* ---------------- stránka po platbe ----------------
     Stripe sem vráti kupujúceho s číslom relácie. Server ju overí
     a až potom sa ukáže odkaz na stiahnutie. */
  var hlava = document.getElementById('hlava');
  if (hlava) {
    var podnadpis = document.getElementById('podnadpis');
    var problem = document.getElementById('problem');
    var problemtext = document.getElementById('problemtext');
    var relacia = new URLSearchParams(location.search).get('relacia') || '';

    var zle = function (sprava) {
      hlava.textContent = 'Objednávku sa nepodarilo overiť';
      podnadpis.textContent = 'Bez potvrdenej objednávky sa inštalačka nesťahuje.';
      if (sprava) problemtext.textContent = sprava;
      problem.hidden = false;
    };

    /* ---- licenčný kód: skrytý blurom, odhalí sa kliknutím na emoji,
       kliknutím na odhalený kód sa skopíruje ---- */
    var ukazKod = function (v) {
      var box = document.getElementById('licencia');
      if (!box) return;
      var hodnota = document.getElementById('kodhodnota');
      var odhal = document.getElementById('odhalit');
      var kopiruj = document.getElementById('kopiruj');

      if (!v.kod) {
        document.getElementById('kodpozn').textContent =
          'Kód sa práve vydáva. Príde vám e-mailom o pár sekúnd; ak nie, napíšte mi.';
        if (odhal) odhal.hidden = true;
        box.hidden = false;
        return;
      }

      hodnota.textContent = v.kod;
      document.getElementById('kodpozn').textContent =
        'Kliknutím na oko kód odhalíte, kliknutím na kód ho skopírujete. Zadajte ho pri prvom spustení programu. Licencia platí na jeden počítač' +
        (v.platna_do ? ' do ' + v.platna_do : '') + '.' +
        (v.poslany && v.email ? ' Poslal som ho aj na ' + v.email + '.'
                              : ' Odložte si ho, budete ho potrebovať pri inštalácii.');
      box.hidden = false;

      var kopirovat = function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(v.kod).then(function () {
          hodnota.classList.add('je-skopirovany');
          if (kopiruj) {
            kopiruj.textContent = 'Skopírované';
            setTimeout(function () {
              kopiruj.textContent = '📋 Kopírovať';
              hodnota.classList.remove('je-skopirovany');
            }, 2000);
          } else {
            setTimeout(function () { hodnota.classList.remove('je-skopirovany'); }, 2000);
          }
        });
      };

      if (odhal) {
        odhal.addEventListener('click', function () {
          hodnota.classList.add('je-odhaleny');
          odhal.hidden = true;
          if (kopiruj && navigator.clipboard) kopiruj.hidden = false;
        });
      }
      hodnota.addEventListener('click', function () {
        if (hodnota.classList.contains('je-odhaleny')) kopirovat();
      });
      if (kopiruj) kopiruj.addEventListener('click', kopirovat);
    };

    /* ---- stiahnutie: ukáže sa len tá inštalačka, ktorá zodpovedá
       objednávke — platená dostane plnú verziu, demo objednávka demo ---- */
    var naplnStiahnutie = function (demo, elInfo, elOdkaz) {
      elOdkaz.href = '/api/stiahnut?relacia=' + encodeURIComponent(relacia);
      fetch('/api/verzia' + (demo ? '?demo=1' : ''), { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (v) {
          if (!v.verzia) return Promise.reject(0);
          var casti = ['Verzia ' + v.verzia];
          if (v.velkost) casti.push((v.velkost / 1048576).toFixed(0) + ' MB');
          casti.push('Windows 10 a 11, 64-bit');
          elInfo.textContent = casti.join(' · ');
        })
        .catch(function () {
          elInfo.textContent = 'Posledná vydaná verzia · Windows 10 a 11, 64-bit';
        });
    };

    /* ---- konfety pri kúpe: pár vĺn zo spodných rohov nahor ---- */
    var oslavKupu = function () {
      if (typeof window.confetti !== 'function') return;
      var trvanie = 5000;
      var koniec = Date.now() + trvanie;
      var vychodzie = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function nahodne(min, max) { return Math.random() * (max - min) + min; }

      var interval = setInterval(function () {
        var zostava = koniec - Date.now();
        if (zostava <= 0) { clearInterval(interval); return; }
        var pocet = 50 * (zostava / trvanie);
        window.confetti(Object.assign({}, vychodzie, {
          particleCount: pocet,
          origin: { x: nahodne(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        window.confetti(Object.assign({}, vychodzie, {
          particleCount: pocet,
          origin: { x: nahodne(0.7, 0.9), y: Math.random() - 0.2 }
        }));
      }, 250);
    };

    var dobre = function (v) {
      var platene = v.plan === 'rok' || v.plan === 'mesiac';
      hlava.textContent = platene ? 'Predplatné je zaplatené' : 'Demo je pripravené';
      podnadpis.textContent = platene
        ? 'Ďakujem. Licenčný kód aj inštalačku máte nižšie.'
        : 'Objednávka za 0 € prešla, platiť sa nič nemuselo. Inštalačku stiahnete tlačidlom nižšie.';

      var poznamka = document.getElementById('poznamka');
      poznamka.textContent = platene
        ? 'Potvrdenie o platbe pošle Stripe e-mailom. Predplatné sa obnovuje automaticky, zrušiť sa dá v programe v Nastaveniach.'
        : 'Demo slúži na vyskúšanie a nič nevyžaduje. Plnú verziu bez obmedzení odomkne licenčný kód po zaplatení predplatného.';
      poznamka.hidden = false;

      /* platená objednávka dostane len plnú verziu a licenciu, demo
         objednávka len demo — nič z toho druhého sa tu neukáže */
      if (platene) {
        ukazKod(v);
        naplnStiahnutie(false, document.getElementById('info-plna'), document.getElementById('odkaz-plna'));
        document.getElementById('dl-plna').hidden = false;
        oslavKupu();
      } else {
        naplnStiahnutie(true, document.getElementById('info-demo'), document.getElementById('odkaz-demo'));
        document.getElementById('dl-demo').hidden = false;
      }
      zapis('platba_hotova', v.plan);

      document.getElementById('stiahnutie').hidden = false;
      document.getElementById('varovanie').hidden = false;

      var navod = document.getElementById('navod');
      var krokKod = document.getElementById('krok-kod');
      if (krokKod) krokKod.hidden = !platene;
      if (navod) navod.hidden = false;

      document.getElementById('dalej').hidden = false;
    };

    if (!relacia) {
      zle('Adresa neobsahuje číslo objednávky. Stiahnutie začnite na stránke s demom alebo v cenníku.');
    } else {
      fetch('/api/pristup?relacia=' + encodeURIComponent(relacia),
        { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (v) { return { r: r, v: v }; }); })
        .then(function (o) {
          if (o.r.ok && o.v.ok) dobre(o.v);
          else zle(o.v && o.v.chyba ? o.v.chyba : '');
        })
        .catch(function () { zle('Server neodpovedal. Skúste stránku obnoviť.'); });
    }
  }

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

  /* ---------------- stiahnutie plnej verzie bez licencie ----------------
     Tlačidlo stiahne inštalačku rovno (prehliadač zostane na stránke, je
     to súbor, nie stránka), a keďže bez licencie sa program neodomkne,
     hneď potom pošleme do cenníka, kde sa licencia kúpi. */
  var plna = document.getElementById('stiahni-plnu');
  if (plna) {
    plna.addEventListener('click', function () {
      setTimeout(function () { location.href = 'cennik.html'; }, 300);
    });
  }
})();
