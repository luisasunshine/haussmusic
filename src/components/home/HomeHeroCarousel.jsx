import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const DEFAULT_ROTATE_MS = 7000;

/**
 * Carrossel do topo da Home.
 *
 * Além do que já fazia, três coisas que faltavam para ele parecer acabado:
 *
 *  - uma barra de progresso mostrando quanto falta para o próximo slide,
 *    em vez de a troca simplesmente acontecer sem aviso;
 *  - pausa ao passar o mouse (e um botão de pausar), porque um banner que
 *    troca sozinho enquanto a pessoa está lendo é irritante;
 *  - navegação por seta do teclado quando o carrossel está focado.
 *
 * A rotação também para quando a aba sai de foco — não faz sentido gastar
 * animação para ninguém.
 */
export default function HomeHeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [progress, setProgress] = useState(0);
  const wrapRef = useRef(null);

  const count = slides.length;
  const slide = slides[index] || slides[0];
  const durationMs = slide?.durationSeconds ? slide.durationSeconds * 1000 : DEFAULT_ROTATE_MS;

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const go = useCallback((next) => {
    setIndex((i) => ((next % count) + count) % count);
    setProgress(0);
  }, [count]);

  // Um único rAF controla avanço e barra: dois timers separados sairiam de
  // sincronia e a barra terminaria antes (ou depois) da troca.
  useEffect(() => {
    if (count < 2 || paused || manualPause) return undefined;

    let raf = null;
    let start = performance.now();
    let stopped = false;

    const tick = (now) => {
      if (stopped) return;
      const p = Math.min(1, (now - start) / durationMs);
      setProgress(p);
      if (p >= 1) {
        setIndex((i) => (i + 1) % count);
        start = now;
        setProgress(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) { stopped = true; if (raf) cancelAnimationFrame(raf); }
      else { stopped = false; start = performance.now(); raf = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count, index, durationMs, paused, manualPause]);

  if (count === 0) return null;

  const multi = count > 1;

  return (
    <div
      ref={wrapRef}
      className="group relative rounded-3xl overflow-hidden mb-8 v-chrome-edge h-[300px] sm:h-[340px] lg:h-[380px]"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      }}
      tabIndex={multi ? 0 : undefined}
      role={multi ? 'region' : undefined}
      aria-roledescription={multi ? 'carrossel' : undefined}
      aria-label={multi ? `Destaques, ${index + 1} de ${count}` : undefined}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.995 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {slide.render()}
        </motion.div>
      </AnimatePresence>

      {multi && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Destaque anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full v-glass flex items-center justify-center text-velvet-text opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Próximo destaque"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full v-glass flex items-center justify-center text-velvet-text opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Controles no canto inferior direito, longe do texto do slide */}
          <div className="absolute bottom-4 right-4 z-40 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setManualPause((v) => !v)}
              aria-label={manualPause ? 'Retomar rotação' : 'Pausar rotação'}
              className="w-7 h-7 rounded-full v-glass flex items-center justify-center text-velvet-dim hover:text-velvet-text opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              {manualPause ? <Play className="w-3 h-3 fill-current ml-0.5" /> : <Pause className="w-3 h-3 fill-current" />}
            </button>

            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ir para o destaque ${i + 1}`}
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-7 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Barra de progresso rente à borda de baixo */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-40">
            <div
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #8f8f9d, #d8d8e2 60%, #ffffff)',
                boxShadow: '0 0 10px rgba(216,216,226,0.6)',
                transition: progress === 0 ? 'none' : 'width 80ms linear',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
