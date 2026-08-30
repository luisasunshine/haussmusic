import React from 'react';
import { motion } from 'framer-motion';
import BackgroundMedia from '@/components/media/BackgroundMedia';
import ArtistNameBanner from '@/components/home/ArtistNameBanner';

/**
 * Layout do destaque do topo — split cinematográfico.
 *
 * O problema que isto resolve: a arte enviada pelo admin é quase sempre
 * quadrada, e o bloco do hero é largo. Com `object-contain` sobravam dois
 * vazios pretos gigantes dos lados; com `object-cover` a imagem era
 * decapitada. Aqui a MESMA imagem aparece duas vezes: desfocada e ampliada
 * cobrindo o fundo (é ela que dá cor ao bloco e mata o vazio) e inteira,
 * emoldurada, à direita. Nada é cortado e nada fica vazio, seja a arte
 * quadrada, vertical ou horizontal.
 *
 * Em telas estreitas a coluna da arte sai de cena e o texto ocupa tudo,
 * sobre o fundo desfocado.
 *
 * Duas variantes, e a distinção importa:
 *
 *  - "split" é para a faixa em destaque, onde a arte é só uma capa e o
 *    título precisa ser escrito por nós;
 *  - "full" é para os banners do admin, que já são peças fechadas — com
 *    a tipografia dentro da própria imagem. Ali dividir a tela em duas
 *    encolheria a arte e repetiria o título ao lado dela. Então o banner
 *    aparece inteiro, ocupando o bloco, exatamente como era antes.
 */
export default function HeroSlide({
  variant = 'split', // 'split' = texto + arte emoldurada | 'full' = banner inteiro
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
    return <img src={media} alt="" className={`w-full h-full object-contain ${className}`} />;
  };

  // ---- Banner inteiro ----------------------------------------------------
  if (variant === 'full') {
    return (
      <div
        className={`relative w-full h-full ${onActivate ? 'cursor-pointer' : ''}`}
        onClick={onActivate}
        style={{ background: 'var(--v-void)' }}
      >
        <div className="absolute inset-0">
          <Art className="w-full h-full" />
        </div>

        {/* Escurece só o pé do bloco, o bastante para o texto colar sobre a
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

  // ---- Split ---------------------------------------------------------------
  return (
    <div
      className={`relative w-full h-full ${onActivate ? 'cursor-pointer' : ''}`}
      onClick={onActivate}
    >
      {/* ---- Fundo: a própria arte, ampliada e desfocada ---- */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {hasMedia ? (
          <>
            <img
              src={media}
              alt=""
              className="w-full h-full object-cover"
              style={{ transform: 'scale(1.25)', filter: 'blur(46px) saturate(190%) brightness(0.95)' }}
            />
            {/* Escurece o suficiente para o texto ganhar contraste, mas
                deixa a cor da capa aparecer. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(100deg, rgba(5,5,6,0.90) 0%, rgba(5,5,6,0.62) 46%, rgba(5,5,6,0.18) 74%, rgba(5,5,6,0.45) 100%)',
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(120deg,#1b1b22 0%,#0b0b0e 60%,#050506 100%)' }}
          />
        )}
        {/* Brilho frio no canto, para o bloco não ficar chapado */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(700px 320px at 78% 30%, rgba(216,216,226,0.16), transparent 70%)' }}
        />
      </div>

      {/* ---- Conteúdo ---- */}
      <div className="relative h-full v-scene">
        <div className="h-full max-w-[1400px] mx-auto flex items-center gap-6 px-6 lg:px-10">

          {/* Texto */}
          <div className="flex-1 min-w-0 v-3d" style={{ transform: 'translateZ(20px)' }}>
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.4 }}
                className="text-velvet-silver text-[11px] font-bold uppercase tracking-[0.3em] mb-2.5"
              >
                {eyebrow}
              </motion.p>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`text-3xl lg:text-5xl font-black v-chrome-text v-chrome-text-live v-display leading-[1.05] mb-2 ${titleClassName}`}
              style={{ textWrap: 'balance' }}
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.45 }}
                className="text-white/75 text-sm lg:text-base mb-1 line-clamp-2 max-w-xl"
              >
                {subtitle}
              </motion.p>
            )}

            {meta && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.26, duration: 0.45 }}
                className="text-white/50 text-xs lg:text-sm mt-1"
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

          {/* Arte — moldura flutuante, some no mobile */}
          <motion.div
            initial={{ opacity: 0, x: 26, rotateY: -12 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ rotateY: -9, rotateX: 5, scale: 1.03 }}
            className="hidden md:block relative shrink-0 h-[74%] aspect-square rounded-2xl overflow-hidden v-3d"
            style={{
              transform: 'translateZ(56px)',
              transformStyle: 'preserve-3d',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 40px 80px -30px rgba(0,0,0,1), 0 0 60px -24px rgba(216,216,226,0.5)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <Art />
            {/* Verniz metálico na moldura */}
            <span
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.20), transparent 42%)' }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
