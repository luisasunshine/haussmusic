import React from 'react';
import { motion } from 'framer-motion';
import BackgroundMedia from '@/components/media/BackgroundMedia';
import ArtistNameBanner from '@/components/home/ArtistNameBanner';

/**
 * Destaque do topo da Home.
 *
 * O bloco tem altura fixa e o texto assenta sobre a arte, com degradê no pé.
 * O que muda entre os dois usos é como a arte preenche — e a distinção é
 * deliberada, não descuido:
 *
 *  - `fit="cover"` na faixa em destaque. O fundo ali é o banner de perfil
 *    do artista, uma foto: cortar as bordas dela não custa nada e o bloco
 *    fica preenchido de ponta a ponta. Vem com escurecimento, porque o
 *    título precisa de contraste contra uma foto que pode ser clara.
 *
 *  - `fit="contain"` nos banners do admin. Ali a arte é uma peça fechada,
 *    com tipografia dentro dela — cortar as bordas comeria justamente o que
 *    foi desenhado. Aparece inteira, e o fundo que sobra é o preço.
 */
export default function HeroSlide({
  fit = 'contain',  // 'cover' preenche e corta as bordas | 'contain' mostra inteira
  preservarBrilho = false, // arte de banner não leva o escurecimento da foto
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

  const cobre = fit === 'cover';
  const objeto = cobre ? 'object-cover' : 'object-contain';
  // A foto de fundo precisa perder brilho para o título ler por cima; a
  // arte fechada do banner, não — ela é para ser vista como foi entregue.
  // Peso do escurecimento: a foto de fundo da faixa em destaque aguenta
  // (e precisa) perder brilho; a arte de um banner, não — ali o degradê do
  // pé já dá contraste ao texto sem apagar o desenho.
  const tratamento = cobre && !preservarBrilho
    ? { filter: 'saturate(1.15) brightness(0.62)' }
    : undefined;

  const Art = ({ className = '' }) => {
    if (!hasMedia) return <ArtistNameBanner name={fallbackName || title} className={className} />;
    if (isVideo) {
      return (
        <BackgroundMedia
          src={media}
          alt=""
          className={`w-full h-full ${objeto} ${className}`}
          style={tratamento}
        />
      );
    }
    return (
      <img
        src={media}
        alt=""
        className={`w-full h-full ${objeto} ${className}`}
        style={tratamento}
        decoding="async"
      />
    );
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
          background: cobre
            ? 'linear-gradient(to top, rgba(5,5,6,0.92) 0%, rgba(5,5,6,0.42) 40%, rgba(5,5,6,0.10) 75%, transparent 100%)'
            : 'linear-gradient(to top, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.55) 26%, rgba(5,5,6,0.08) 52%, transparent 70%)',
        }}
      />

      {/* Brilho frio do backup, só sobre a foto de fundo. */}
      {cobre && hasMedia && !preservarBrilho && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 62% 38%, rgba(216,216,226,0.18) 0%, transparent 70%)' }}
        />
      )}

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
