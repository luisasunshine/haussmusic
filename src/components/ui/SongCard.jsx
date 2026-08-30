import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, Heart, Music2, Timer, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { getItemLabel } from '@/lib/utils';
import AddToPlaylistMenu from '@/components/playlist/AddToPlaylistMenu';

/**
 * Linha de faixa.
 *
 * Mudanças em relação à versão anterior:
 *  - a linha inteira virou um elemento focável e operável por teclado
 *    (antes era uma <div> com onClick: invisível para quem navega no Tab);
 *  - o equalizador da faixa tocando pulsa com o áudio real, não com um
 *    loop fixo;
 *  - hover ganha aresta cromada, brilho especular e leve avanço em Z.
 */
export default function SongCard({
  song, isPlaying, isCurrentSong, onPlay, onFavorite, index,
  hidePlaylistButton = false, isScheduled = false, scheduledDatetime = null, isLiked,
}) {
  const liked = isLiked !== undefined ? isLiked : song.is_favorite;
  const [copied, setCopied] = useState(false);

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
  });
  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: () => base44.entities.Artist.list('-created_date', 200),
  });
  const label = getItemLabel(song, labels, artists);

  const formatDuration = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?song=${song.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const activate = () => {
    if (isScheduled && scheduledDatetime) {
      const d = new Date(scheduledDatetime);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      toast(`${song.title}`, {
        description: `Estreia em ${dateStr} às ${timeStr}`,
        icon: <Timer className="w-4 h-4 text-amber-300" />,
      });
    } else if (!isScheduled) {
      onPlay(song);
    }
  };

  const stateLabel = isScheduled
    ? `${song.title}, de ${song.artist} — em breve`
    : `Tocar ${song.title}, de ${song.artist}`;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={stateLabel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // O atraso escalonado para depois do 20º item só faria o usuário
      // esperar por nada, então ele é limitado.
      transition={{ delay: Math.min(index, 20) * 0.02, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      }}
      className={`group relative flex items-center gap-3 p-2.5 rounded-2xl v-specular transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60 ${
        isScheduled ? 'opacity-55 cursor-default' : 'cursor-pointer hover:-translate-y-[2px]'
      } ${
        isCurrentSong
          ? 'bg-white/[0.07] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
          : isScheduled ? 'border border-transparent' : 'border border-transparent hover:bg-white/[0.045] hover:border-white/[0.09]'
      }`}
    >
      {/* Marca da faixa ativa */}
      {isCurrentSong && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full"
          style={{ background: 'linear-gradient(180deg,#ffffff,#9a9aa8)', boxShadow: '0 0 10px rgba(216,216,226,0.9)' }}
        />
      )}

      {/* Número / play */}
      <div className="w-8 flex items-center justify-center shrink-0">
        <span className={`text-xs font-mono tabular-nums group-hover:hidden ${isCurrentSong ? 'text-velvet-silver' : 'text-velvet-faint'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.1 }}
          aria-label={isCurrentSong && isPlaying ? 'Pausar' : 'Tocar'}
          className="btn-green hidden group-hover:flex items-center justify-center w-8 h-8"
          onClick={(e) => { e.stopPropagation(); onPlay(song); }}
        >
          {isCurrentSong && isPlaying
            ? <Pause className="w-3.5 h-3.5 fill-current" />
            : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </motion.button>
      </div>

      {/* Capa */}
      <div
        className={`relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/[0.04] transition-transform duration-300 group-hover:scale-105 ${
          isCurrentSong && isPlaying ? 'v-audio-glow' : ''
        }`}
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {song.cover_url ? (
          <img src={song.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-4 h-4 text-velvet-faint" />
          </div>
        )}

        {/* Equalizador — as barras respiram com o som real (--v-level) */}
        {isCurrentSong && isPlaying && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-end justify-center gap-[2px] pb-[13px]">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[2px] rounded-full bg-velvet-silver"
                style={{
                  height: `calc(3px + var(--v-level) * ${[13, 18, 11, 16][i]}px)`,
                  transition: 'height 90ms linear',
                  transitionDelay: `${i * 22}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold truncate transition-colors ${isCurrentSong ? 'text-velvet-silver' : 'text-velvet-text'}`}>
          {song.title}
        </h4>
        <p className="text-xs text-velvet-dim truncate">
          {song.artist}
          {song.featuring && <span className="text-velvet-faint"> feat. {song.featuring}</span>}
        </p>
        {label && <p className="text-[10px] text-velvet-faint truncate">{label.name}</p>}
      </div>

      {song.album && (
        <div className="hidden lg:block w-36 shrink-0">
          <p className="text-xs text-velvet-dim truncate">{song.album}</p>
        </div>
      )}

      {song.plays > 0 && (
        <div className="hidden md:block w-16 text-right shrink-0">
          <span className="text-xs text-velvet-faint tabular-nums">{song.plays.toLocaleString('pt-BR')}</span>
        </div>
      )}

      {!isScheduled && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleShare(); }}
            className="p-1.5 rounded-lg text-velvet-faint hover:text-velvet-text hover:bg-white/[0.09] transition-colors"
            title="Copiar link"
            aria-label="Copiar link da faixa"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFavorite(song); }}
            aria-label={liked ? 'Remover dos curtidos' : 'Curtir'}
            aria-pressed={liked}
            className={`p-1.5 rounded-lg transition-colors ${
              liked ? 'text-velvet-silver' : 'text-velvet-faint hover:text-velvet-text hover:bg-white/[0.09]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}

      {isScheduled && <span className="v-badge-dim shrink-0">Em breve</span>}

      <div className="w-12 text-right shrink-0">
        <span className="text-xs text-velvet-faint tabular-nums">{formatDuration(song.duration)}</span>
      </div>

      {!hidePlaylistButton && (
        <div className={`transition-opacity duration-200 shrink-0 ${isScheduled ? 'opacity-0' : 'opacity-50 group-hover:opacity-100'}`}>
          <AddToPlaylistMenu songId={song.id} />
        </div>
      )}
    </motion.div>
  );
}
