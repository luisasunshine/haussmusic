import React, { useEffect, useRef } from 'react';
import { subscribeLevels } from '@/lib/audioBus';

/**
 * Fundo vivo: partículas de prata em profundidade, com paralaxe do
 * ponteiro e um leve empurrão a cada pico do som.
 *
 * É um canvas único e barato (nenhum nó de DOM por partícula), fixo atrás
 * de toda a interface. Ele para sozinho quando a aba perde o foco.
 */
export default function VelvetBackdrop({ density = 0.00006, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, dpr = 1;
    let particles = [];
    let raf = null;
    let level = 0;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(140, Math.max(28, Math.round(w * h * density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.85 + 0.15,   // profundidade: manda no tamanho e na paralaxe
        r: Math.random() * 1.6 + 0.35,
        vy: (Math.random() * 0.16 + 0.03),
        vx: (Math.random() - 0.5) * 0.08,
        tw: Math.random() * Math.PI * 2,   // fase do cintilar
      }));
    };
    build();

    const onResize = () => build();
    const onMove = (e) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });

    const unsub = subscribeLevels((s) => { level = s.level; });

    let running = true;
    const onVisibility = () => {
      running = !document.hidden;
      if (running && raf == null) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const frame = () => {
      if (!running) { raf = null; return; }
      raf = requestAnimationFrame(frame);

      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;

      ctx.clearRect(0, 0, w, h);

      const px = (pointer.x - 0.5) * 42;
      const py = (pointer.y - 0.5) * 28;
      const kick = 1 + level * 1.6;

      for (const p of particles) {
        p.y -= p.vy * (0.6 + level * 2.2);
        p.x += p.vx;
        p.tw += 0.02;

        if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;

        // Quanto mais perto (z alto), mais a partícula acompanha o ponteiro.
        const dx = p.x + px * p.z;
        const dy = p.y + py * p.z;

        const twinkle = 0.55 + Math.sin(p.tw) * 0.45;
        const alpha = p.z * 0.4 * twinkle;
        const radius = p.r * p.z * kick;

        ctx.beginPath();
        ctx.arc(dx, dy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,226,238,${alpha.toFixed(3)})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0, opacity: 0.75 }}
    />
  );
}
