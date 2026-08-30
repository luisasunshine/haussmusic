import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_ROTATE_MS = 7000;

// Limites da altura do bloco. Sem o teto, um banner quadrado esticaria o
// hero para a largura inteira e empurraria a página toda para baixo.
const ALTURA_MIN = 260;
const ALTURA_MAX = 560;

/**
 * Carrossel do topo da Home.
 *
 * Gira sozinho entre a faixa em destaque e os banners ativos do admin, cada
 * slide com a sua própria duração. Setas no hover, setas do teclado e
 * pontinhos para quem quiser adiantar — mas nada interrompe a rotação
 * exceto a aba sair de foco, porque não faz sentido gastar animação para
 * ninguém.
 *
 * A altura do bloco acompanha a proporção da arte do slide atual. Com
 * altura fixa, uma imagem panorâmica aparecia inteira mas encolhida, entre
 * duas faixas pretas — e cortá-la para preencher não era opção. Medindo a
 * proporção real da mídia e ajustando a altura, a arte ocupa a largura toda
 * sem perder um pixel. Fica limitada por ALTURA_MIN/ALTURA_MAX: arte muito
 * quadrada ainda sobra espaço nas laterais, o que é geometria, não bug.
 */
export default function HomeHeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [altura, setAltura] = useState(ALTURA_MAX);
  const wrapRef = useRef(null);

  const count = slides.length;
  const slide = slides[index] || slides[0];
  const durationMs = slide?.durationSeconds ? slide.durationSeconds * 1000 : DEFAULT_ROTATE_MS;

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const go = useCallback((next) => {
    setIndex((i) => ((next % count) + count) % count);
  }, [count]);

  // Avanço automático. Pausa com a aba em segundo plano — não faz sentido
  // gastar animação para ninguém — e retoma o ciclo inteiro ao voltar.
  useEffect(() => {
    if (count < 2) return undefined;

    let timer = null;
    const agendar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIndex((i) => (i + 1) % count), durationMs);
    };
    agendar();

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
      else agendar();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count, index, durationMs]);

  // Mede a arte do slide atual e ajusta a altura do bloco para ela caber
  // inteira ocupando a largura. Roda a cada troca de slide e a cada
  // mudança de largura da janela.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    let cancelado = false;

    const ajustar = () => {
      if (cancelado) return;
      const midia = wrap.querySelector('img, video');
      if (!midia) return;

      const w = midia.naturalWidth || midia.videoWidth;
      const h = midia.naturalHeight || midia.videoHeight;
      if (!w || !h) return;

      const largura = wrap.clientWidth;
      if (!largura) return;

      const ideal = largura * (h / w);
      setAltura(Math.round(Math.max(ALTURA_MIN, Math.min(ALTURA_MAX, ideal))));
    };

    ajustar();

    // A imagem do slide pode ainda não ter carregado quando o efeito roda.
    const midia = wrap.querySelector('img, video');
    midia?.addEventListener('load', ajustar);
    midia?.addEventListener('loadedmetadata', ajustar);

    const ro = new ResizeObserver(ajustar);
    ro.observe(wrap);

    return () => {
      cancelado = true;
      midia?.removeEventListener('load', ajustar);
      midia?.removeEventListener('loadedmetadata', ajustar);
      ro.disconnect();
    };
  }, [index, count]);

  if (count === 0) return null;

  const multi = count > 1;

  return (
    <div
      ref={wrapRef}
      className="group relative rounded-3xl overflow-hidden mb-8 v-chrome-edge"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        height: altura,
        transition: 'height 480ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
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

          {/* Indicadores no canto inferior direito, longe do texto do slide */}
          <div className="absolute bottom-4 right-4 z-40 flex items-center gap-3">
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

        </>
      )}
    </div>
  );
}
