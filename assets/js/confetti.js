/* GridServis — konfety.
   Malý vlastný prehrávač konfiet, aby web nemusel ťahať žiadnu knižnicu
   z cudzej domény (rovnaké pravidlo ako pri písmach či analytike — nič
   sa nesťahuje odinakiaľ). Podporuje len to, čo web reálne používa:
   particleCount, spread, startVelocity, ticks, origin {x, y}, zIndex.

   Použitie je zámerne rovnaké ako u bežných knižníc na konfety:
     confetti({ particleCount: 60, spread: 360, origin: { x: .5, y: .3 } });
*/
(function (root) {
  'use strict';

  var FARBY = ['#2563eb', '#16713f', '#f2b705', '#e0483c', '#7c3aed', '#0d1117'];
  var platno = null;
  var ctx = null;
  var castice = [];
  var bezi = false;
  var znizenyPohyb = false;

  try {
    znizenyPohyb = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* zostane false */ }

  function pripravPlatno(zIndex) {
    if (platno) return;
    platno = document.createElement('canvas');
    platno.setAttribute('aria-hidden', 'true');
    platno.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:' + Math.max(1000, zIndex || 0) + ';';
    document.body.appendChild(platno);
    ctx = platno.getContext('2d');
    zmenaVelkosti();
    window.addEventListener('resize', zmenaVelkosti);
  }

  function zmenaVelkosti() {
    if (!platno) return;
    platno.width = window.innerWidth;
    platno.height = window.innerHeight;
  }

  function novaCasticka(x, y, uhol, rychlost) {
    var smer = uhol * (Math.PI / 180);
    return {
      x: x, y: y,
      vx: Math.cos(smer) * rychlost,
      vy: -Math.sin(smer) * rychlost,
      farba: FARBY[(Math.random() * FARBY.length) | 0],
      velkost: 6 + Math.random() * 5,
      rotacia: Math.random() * 360,
      otacanie: -6 + Math.random() * 12,
      tvar: Math.random() < 0.5 ? 'stvorec' : 'kruh',
      zivot: 0
    };
  }

  function krok() {
    if (!ctx) return;
    ctx.clearRect(0, 0, platno.width, platno.height);
    var este = [];
    for (var i = 0; i < castice.length; i++) {
      var c = castice[i];
      c.zivot++;
      if (c.zivot > c.ticks) continue;

      c.vy += 0.55;               // gravitácia
      c.vx *= 0.98;                // odpor vzduchu
      c.x += c.vx * 0.5;
      c.y += c.vy * 0.5;
      c.rotacia += c.otacanie;

      var priehladnost = 1 - c.zivot / c.ticks;
      if (c.y > platno.height + 40) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(priehladnost, 0);
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotacia * Math.PI) / 180);
      ctx.fillStyle = c.farba;
      if (c.tvar === 'kruh') {
        ctx.beginPath();
        ctx.arc(0, 0, c.velkost / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-c.velkost / 2, -c.velkost / 2, c.velkost, c.velkost);
      }
      ctx.restore();

      este.push(c);
    }
    castice = este;

    if (castice.length) {
      requestAnimationFrame(krok);
    } else {
      bezi = false;
      if (platno) { platno.parentNode.removeChild(platno); platno = null; ctx = null; }
    }
  }

  function confetti(volby) {
    if (znizenyPohyb) return;   // rešpektujeme nastavenie systému
    volby = volby || {};

    var pocet = Math.max(1, Math.round(volby.particleCount || 50));
    var spread = volby.spread || 45;
    var rychlost = volby.startVelocity || 45;
    var ticks = volby.ticks || 200;
    var origin = volby.origin || { x: 0.5, y: 0.5 };

    pripravPlatno(volby.zIndex);
    var stred = 90;   // hore
    var x = origin.x * window.innerWidth;
    var y = origin.y * window.innerHeight;

    for (var i = 0; i < pocet; i++) {
      var uhol = stred + (Math.random() - 0.5) * spread;
      var c = novaCasticka(x, y, uhol, rychlost * (0.6 + Math.random() * 0.6));
      c.ticks = ticks;
      castice.push(c);
    }

    if (!bezi) { bezi = true; requestAnimationFrame(krok); }
  }

  root.confetti = confetti;
})(window);
