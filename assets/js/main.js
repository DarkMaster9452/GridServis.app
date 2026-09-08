/* Mechanik — landing page interactions */
(function () {
  'use strict';

  var REPO = 'DarkMaster9452/Custom-Autoservis-manager';
  var ASSET = 'MechanikSetup.exe';

  /* ---- sticky nav shadow ---- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobilne-menu');
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    burger.setAttribute('aria-label', open ? 'Otvoriť menu' : 'Zavrieť menu');
    menu.hidden = open;
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      burger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  });

  /* ---- year ---- */
  document.getElementById('rok').textContent = String(new Date().getFullYear());

  /* ---- scroll reveal ---- */
  if ('IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.card, .step, .split__txt, .split__box, .dl, .faq details, .band__in');
    Array.prototype.forEach.call(targets, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 6) * 55 + 'ms';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ---- latest release info from GitHub (progressive enhancement) ---- */
  function mb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (rel) {
      var tag = (rel.tag_name || '').replace(/^v/, '');
      if (tag) {
        Array.prototype.forEach.call(
          document.querySelectorAll('[data-release-tag]'),
          function (el) { el.textContent = tag; }
        );
      }

      var asset = (rel.assets || []).filter(function (a) {
        return a.name === ASSET;
      })[0] || (rel.assets || [])[0];

      if (asset) {
        Array.prototype.forEach.call(
          document.querySelectorAll('[data-release-size]'),
          function (el) { el.textContent = mb(asset.size); }
        );
        Array.prototype.forEach.call(
          document.querySelectorAll('a[data-download-link]'),
          function (el) { el.href = asset.browser_download_url; }
        );
      }

      if (rel.published_at) {
        var d = new Date(rel.published_at).toLocaleDateString('sk-SK', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        Array.prototype.forEach.call(
          document.querySelectorAll('[data-release-date]'),
          function (el) { el.textContent = ', vydaná ' + d; }
        );
      }
    })
    .catch(function () {
      /* ponecháme statické hodnoty z HTML */
    });
})();
