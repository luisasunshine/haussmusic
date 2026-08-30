import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddToPlaylistMenu from '@/components/playlist/AddToPlaylistMenu';

/**
 * Linha do ranking.
 *
 * O pódio agora é metálico de verdade — platina, prata e aço escovado, cada
 * medalha com gradiente e realce próprios — em vez de amarelo/laranja
 * saturados que brigavam com o preto e prata do resto do app. As métricas
 * (rosa e ciano antes) passaram a viver na mesma paleta.
 */

const PODIUM = {
  1: {
    bg: 'linear-gradient(145deg,#ffffff 0%,#e8e8f0 35%,#a8a8b8 70%,#f2f2f7 100%)',
    fg: '#0b0b0e',
    ring: 'rgba(255,255,255,0.85)',
    glow: '0 0 18px rgba(255,255,255,0.55)',
  },
  2: {
    bg: 'linear-gradient(145deg,#e2e2ea 0%,#b4b4c2 45%,#8d8d9c 100%)',
    fg: '#0b0b0e',
    ring: 'rgba(226,226,234,0.6)',
    glow: '0 0 12px rgba(216,216,226,0.4)',
  },
  3: {
    bg: 'linear-gradient(145deg,#b0b0be 0%,#82828f 45%,#5f5f6b 100%)',
    fg: '#0b0b0e',
    ring: 'rgba(176,176,190,0.5)',
    glow: '0 0 10px rgba(176,176,190,0.3)',
  },
};

export default function RankingCard({ item, rank, type }) {
  const isSong = !!item.audio_url;
  const podium = PODIUM[rank];

  const handlePlay = () => {
    if (isSong) window.dispatchEvent(new CustomEvent('playSong', { detail: item }));
  };

  const metric = type === 'likes' ? (item.likes || 0) : (item.plays || 0);
  const MetricIcon = type === 'likes' ? Heart : Play;

  const content = (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.015, 0.5), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 4 }}
      onClick={isSong ? handlePlay : undefined}
      onKeyDown={isSong ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlay(); }
      } : undefined}
      role={isSong ? 'button' : undefined}
      tabIndex={isSong ? 0 : undefined}
      aria-label={isSong ? `Tocar ${item.title}, de ${item.artist}` : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl pl-9 pr-3 py-2.5 v-specular transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60 ${
        isSong ? 'cursor-pointer' : ''
      } ${
        podium
          ? 'bg-white/[0.07] border border-white/[0.14] hover:bg-white/[0.10]'
          : 'bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.14]'
      }`}
    >
      {/* Medalha */}
      <div
        className="absolute left-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums"
        style={podium ? {
          background: podium.bg,
          color: podium.fg,
          boxShadow: `inset 0 1px 0 ${podium.ring}, ${podium.glow}`,
        } : {
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--v-text-dim)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {rank === 1 ? <Crown className="w-3.5 h-3.5" strokeWidth={2.6} /> : rank}
      </div>

      {/* Capa */}
      <div className="relative shrink-0">
        <div
          className="w-11 h-11 rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-105"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {item.cover_url ? (
            <img src={item.cover_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/[0.05]" />
          )}
        </div>
        {isSong && (
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-velvet-text truncate group-hover:text-velvet-silver transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-velvet-dim truncate">
          {item.artist}
          {item.featuring && <span className="text-velvet-faint"> feat. {item.featuring}</span>}
        </p>
      </div>

      {/* Métrica */}
      <div className="flex items-center gap-1.5 shrink-0 text-velvet-silver">
        <MetricIcon className="w-3.5 h-3.5 fill-current" />
        <span className="text-xs font-semibold tabular-nums">{metric.toLocaleString('pt-BR')}</span>
      </div>

      {isSong && (
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <AddToPlaylistMenu
            songId={item.id}
            buttonClassName="p-1.5 rounded-lg text-velvet-faint hover:text-velvet-text hover:bg-white/[0.09] transition-all"
            iconClassName="w-4 h-4"
          />
        </div>
      )}
    </motion.div>
  );

  if (isSong) return content;
  return <Link to={`${createPageUrl('Release')}?id=${item.id}`}>{content}</Link>;
}
