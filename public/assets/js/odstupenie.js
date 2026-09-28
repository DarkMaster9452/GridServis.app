/* Odstúpenie od zmluvy (odstupenie.html) — § 20a zákona č. 108/2024 Z. z.
   Dva kroky: vyplnenie a osobitné potvrdenie. Potvrdenie na trvanlivom
   médiu posiela server e-mailom (api/ucet/[akcia].js, akcia odstupenie). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('odst-form');
  var kontrola = $('odst-kontrola');
  var hotovo = $('odst-hotovo');
  var oznam = $('oznam');
  var udaje = null;

  function hlas(text) { oznam.textContent = text || ''; oznam.hidden = !text; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* licenčný kód z odkazu (napr. z účtu) sa predvyplní */
  var kod = new URLSearchParams(location.search).get('kod');
  if (kod) form.zmluva.value = kod;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hlas('');
    udaje = {
      meno: form.meno.value.trim(),
      email: form.email.value.trim(),
      zmluva: form.zmluva.value.trim(),
      poznamka: form.poznamka.value.trim(),
      web: form.web.value
    };
    if (!udaje.meno || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(udaje.email) || !udaje.zmluva) {
      hlas('Vyplňte meno, e-mail a licenčný kód alebo číslo objednávky.');
      return;
    }
    $('odst-suhrn').innerHTML = [
      ['Meno a priezvisko', udaje.meno],
      ['E-mail', udaje.email],
      ['Zmluva', udaje.zmluva],
      ['Poznámka', udaje.poznamka || '—']
    ].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    form.hidden = true;
    kontrola.hidden = false;
    $('odst-potvrdit').focus();
  });

  $('odst-upravit').addEventListener('click', function () {
    kontrola.hidden = true;
    form.hidden = false;
  });

  $('odst-potvrdit').addEventListener('click', async function () {
    var tl = this;
    tl.disabled = true;
    hlas('');
    try {
      var r = await fetch('/api/ucet/odstupenie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(udaje)
      });
      var d = await r.json();
      if (d.ok) {
        $('odst-vysledok').innerHTML = 'Číslo odstúpenia <b>' + esc(d.cislo || '') + '</b>' +
          (d.cas ? ', prijaté ' + esc(d.cas) : '') + '.';
        kontrola.hidden = true;
        hotovo.hidden = false;
      } else {
        hlas(d.chyba || 'Odoslanie zlyhalo. Odstúpte prosím e-mailom na support@gridservis.app.');
      }
    } catch (e) {
      hlas('Spojenie zlyhalo. Skúste to znova alebo odstúpte e-mailom na support@gridservis.app.');
    }
    tl.disabled = false;
  });
})();
