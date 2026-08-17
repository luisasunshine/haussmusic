(() => {
  const intro = document.querySelector('[data-vv-intro]');
  const canvas = document.querySelector('[data-vv-intro-canvas]');
  const logo = document.querySelector('[data-vv-intro-logo]');
  if (!intro || !canvas || !logo || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro?.remove();
    return;
  }

  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 260 }, () => ({
    x: Math.random(), y: Math.random(), z: Math.random(),
    size: .35 + Math.random() * 1.3, speed: .035 + Math.random() * .1,
    tint: Math.random() > .55
  }));
  let width = 0;
  let height = 0;
  let raf = 0;
  let start = 0;
  let impacted = false;

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const clamp = value => Math.max(0, Math.min(1, value));
  const easeOutBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

  const draw = now => {
    if (!start) start = now;
    const elapsed = (now - start) / 1000;
    ctx.clearRect(0, 0, width, height);
    particles.forEach(particle => {
      particle.z += particle.speed * .016;
      if (particle.z > 1) particle.z = 0;
      const depth = .28 + particle.z * 1.5;
      const x = width / 2 + (particle.x - .5) * width * depth;
      const y = height / 2 + (particle.y - .5) * height * depth;
      const alpha = (.25 + particle.z * .55) * (1 - clamp((elapsed - 2.15) / .6));
      ctx.beginPath();
      ctx.fillStyle = particle.tint ? `rgba(177,181,219,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.arc(x, y, particle.size * depth, 0, Math.PI * 2);
      ctx.fill();
    });

    const fly = clamp((elapsed - .15) / 1);
    const eased = easeOutBack(fly);
    const rotate = -80 * (1 - fly);
    const depth = -900 * (1 - eased);
    const scale = .4 + .6 * eased;
    logo.style.opacity = String(clamp(fly * 2.2));
    logo.style.transform = `translate(-50%,-50%) perspective(900px) translateZ(${depth}px) rotateY(${rotate}deg) scale(${scale})`;

    if (elapsed >= 1.1 && !impacted) {
      impacted = true;
      intro.classList.add('is-impact');
    }
    if (elapsed >= 2.2) {
      const exit = clamp((elapsed - 2.2) / .55);
      logo.style.opacity = String(1 - clamp(exit * 1.3));
      logo.style.transform = `translate(-50%,-50%) perspective(900px) translateZ(${exit * 700}px) rotateY(${exit * 190}deg) scale(${1 + exit * 1.6})`;
    }
    if (elapsed >= 2.75) intro.classList.add('is-leaving');
    if (elapsed >= 3.3) {
      intro.remove();
      return;
    }
    raf = requestAnimationFrame(draw);
  };

  resize();
  addEventListener('resize', resize);
  raf = requestAnimationFrame(draw);
  addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
  }, { once: true });
})();
