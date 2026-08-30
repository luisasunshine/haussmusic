import React from 'react';
import { motion } from 'framer-motion';
import BackgroundMedia from '@/components/media/BackgroundMedia';
import ArtistNameBanner from '@/components/home/ArtistNameBanner';

/**
 * Destaque do topo da Home.
 *
 * A arte aparece inteira, ocupando o bloco, com um degradê só no pé para o
 * texto assentar sobre ela. É o mesmo layout para a faixa em destaque e
 * para os banners do admin.
 *
 * Houve aqui uma versão "split" — texto à esquerda, a arte reduzida numa
 * moldura à direita e a própria imagem desfocada preenchendo o fundo. A
 * intenção era matar as faixas pretas das laterais quando a arte é
 * quadrada, mas o custo era alto: a peça enviada aparecia pequena, com uma
 * cópia borrada de si mesma atrás. Entre um vazio honesto e uma miniatura,
 * a arte inteira ganha.
 */
export default function HeroSlide({
  media,            // url da imagem/vídeo
  isVideo = false,
  fallbackName,     // usado quando não há mídia
  eyebrow,
  title,
  subtitle,
  meta,             // linha extra pequena (plays, selo…)
  actions,          // nós React: botões
  onActivate,       // clique no bloco inteiro
  titleClassName = '',
}) {
  const hasMedia = !!media;

  const Art = ({ className = '' }) => {
    if (!hasMedia) return <ArtistNameBanner name={fallbackName || title} className={className} />;
    if (isVideo) {
      return <BackgroundMedia src={media} alt="" className={`w-full h-full object-contain ${className}`} />;
    }
    return <img src={media} alt="" className={`w-full h-full object-contain ${className}`} decoding="async" />;
  };

  return (
    <div
      className={`relative w-full h-full ${onActivate ? 'cursor-pointer' : ''}`}
      onClick={onActivate}
      style={{ background: 'var(--v-void)' }}
    >
      <div className="absolute inset-0">
        <Art className="w-full h-full" />
      </div>

      {/* Escurece só o pé do bloco: o bastante para o texto assentar sobre a
          arte sem cobri-la. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.55) 26%, rgba(5,5,6,0.08) 52%, transparent 70%)',
        }}
      />

      <div className="relative h-full flex items-end p-6 lg:p-9">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.4 }}
              className="text-velvet-silver text-[11px] font-bold uppercase tracking-[0.3em] mb-2"
            >
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`text-3xl lg:text-5xl font-black v-chrome-text v-chrome-text-live v-display leading-[1.05] ${titleClassName}`}
            style={{ textWrap: 'balance' }}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="text-white/80 text-sm lg:text-base mt-2 line-clamp-2"
            >
              {subtitle}
            </motion.p>
          )}

          {meta && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26, duration: 0.45 }}
              className="text-white/55 text-xs lg:text-sm mt-1.5"
            >
              {meta}
            </motion.div>
          )}

          {actions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mt-5 flex-wrap"
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
