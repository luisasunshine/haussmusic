import React, { useEffect, useRef } from 'react';
import { subscribeLevels } from '@/lib/audioBus';

/**
 * Visualizador ligado ao som real.
 *
 * A versão anterior sorteava alturas com Math.random() dentro de uma
 * animação do framer-motion: bonito, mas descolado da música — as barras
 * subiam no silêncio e ignoravam a batida. Agora cada barra é uma faixa de
 * frequência lida do AnalyserNode compartilhado, no mesmo quadro que o
 * vinil e o brilho da capa usam. Quando a Web Audio API não está
 * disponível, o audioBus entrega um pulso simulado e o desenho continua o
 * mesmo.
 *
 * Desenhado em canvas: 64 barras espelhadas a 60fps em DOM causariam 128
 * mutações de layout por quadro.
 */
export default function AudioVisualizer({
  isPlaying,
  bars = 56,
  className = '',
  height = 80,
  mirrored = true,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const smoothed = useRef(new Float32Array(bars));

  useEffect(() => {
    smoothed.current = new Float32Array(bars);
  }, [bars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.02 });
    io.observe(wrap);

    const draw = (state) => {
      if (!visible || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      const gap = Math.max(1.5, w / bars * 0.28);
      const barW = Math.max(1.5, (w - gap * (bars - 1)) / bars);
      const baseline = mirrored ? h / 2 : h;
      const maxH = mirrored ? h / 2 - 2 : h - 2;

      const bins = state.bins;
      const useReal = bins && bins.length > 0 && !state.simulated;

      for (let i = 0; i < bars; i++) {
        let v;
        if (useReal) {
          // Distribuição logarítmica: os graves ocupam poucos bins mas
          // muito da percepção, então merecem mais barras.
          const t0 = (i / bars) ** 1.85;
          const t1 = ((i + 1) / bars) ** 1.85;
          const a = Math.floor(t0 * bins.length);
          const b = Math.max(a + 1, Math.floor(t1 * bins.length));
          let sum = 0;
          for (let k = a; k < b && k < bins.length; k++) sum += bins[k];
          v = sum / ((b - a) * 255);
          // Compensa a queda natural de energia nos agudos.
          v *= 1 + (i / bars) * 1.3;
        } else {
          const phase = performance.now() / 380;
          v = state.level * (0.55 + 0.45 * Math.abs(Math.sin(phase + i * 0.42)));
        }

        v = Math.min(1, v);
        // Sobe rápido, cai devagar — é assim que um VU meter se lê.
        const prev = smoothed.current[i] || 0;
        smoothed.current[i] = v > prev ? prev + (v - prev) * 0.55 : prev + (v - prev) * 0.14;

        const bh = Math.max(2, smoothed.current[i] * maxH);
        const x = i * (barW + gap);

        const grad = ctx.createLinearGradient(0, baseline - bh, 0, baseline);
        grad.addColorStop(0, 'rgba(255,255,255,0.98)');
        grad.addColorStop(0.45, 'rgba(216,216,226,0.85)');
        grad.addColorStop(1, 'rgba(120,120,138,0.35)');
        ctx.fillStyle = grad;

        const r = Math.min(barW / 2, 2.5);
        roundRect(ctx, x, baseline - bh, barW, bh, r);
        ctx.fill();

        if (mirrored) {
          ctx.globalAlpha = 0.28;
          roundRect(ctx, x, baseline, barW, bh * 0.62, r);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Brilho geral acompanhando o volume, para o conjunto "acender".
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(216,216,226,${state.level * 0.06})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    };

    const unsub = subscribeLevels(draw);

    return () => {
      unsub();
      ro.disconnect();
      io.disconnect();
    };
  }, [bars, mirrored]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
      data-playing={isPlaying ? 'true' : 'false'}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
