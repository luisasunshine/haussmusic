/**
 * Campo de estrelas — o mesmo fundo do Velvet Music, portado para JS puro.
 *
 * Partículas de prata em profundidade, com paralaxe do ponteiro: as mais
 * próximas (z alto) acompanham o cursor mais que as distantes, e é isso que
 * dá a sensação de camadas em vez de pontinhos chapados.
 *
 * Um canvas só, nenhum nó de DOM por partícula. Para quando a aba perde o
 * foco e nem chega a rodar para quem pediu menos movimento no sistema.
 *
 * No Music o mesmo fundo também reage ao volume da faixa; aqui não há
 * áudio tocando, então ele fica só com a deriva e a paralaxe.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'vv-starfield';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  var w = 0, h = 0, dpr = 1;
  var particles = [];
  var raf = null;
  var rodando = true;
  var ponteiro = { x: 0.5, y: 0.5, ax: 0.5, ay: 0.5 };

  var DENSIDADE = 0.00006;

  function montar() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var quantidade = Math.min(140, Math.max(28, Math.round(w * h * DENSIDADE)));
    particles = [];
    for (var i = 0; i < quantidade; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.85 + 0.15,   // profundidade: manda no tamanho e na paralaxe
        r: Math.random() * 1.6 + 0.35,
        vy: Math.random() * 0.16 + 0.03,
        vx: (Math.random() - 0.5) * 0.08,
        tw: Math.random() * Math.PI * 2,  // fase do cintilar
      });
    }
  }

  function quadro() {
    if (!rodando) { raf = null; return; }
    raf = requestAnimationFrame(quadro);

    ponteiro.x += (ponteiro.ax - ponteiro.x) * 0.045;
    ponteiro.y += (ponteiro.ay - ponteiro.y) * 0.045;

    ctx.clearRect(0, 0, w, h);

    var px = (ponteiro.x - 0.5) * 42;
    var py = (ponteiro.y - 0.5) * 28;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y -= p.vy * 0.6;
      p.x += p.vx;
      p.tw += 0.02;

      if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
      if (p.x < -6) p.x = w + 6;
      if (p.x > w + 6) p.x = -6;

      var dx = p.x + px * p.z;
      var dy = p.y + py * p.z;
      var cintilar = 0.55 + Math.sin(p.tw) * 0.45;

      ctx.beginPath();
      ctx.arc(dx, dy, p.r * p.z, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(226,226,238,' + (p.z * 0.4 * cintilar).toFixed(3) + ')';
      ctx.fill();
    }
  }

  window.addEventListener('resize', montar);
  window.addEventListener('pointermove', function (e) {
    ponteiro.ax = e.clientX / window.innerWidth;
    ponteiro.ay = e.clientY / window.innerHeight;
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    rodando = !document.hidden;
    if (rodando && raf === null) raf = requestAnimationFrame(quadro);
  });

  montar();
  raf = requestAnimationFrame(quadro);
})();
