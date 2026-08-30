import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, Heart, Volume2, Volume1, VolumeX,
  Repeat, Maximize2, Music2, GitMerge, Shuffle,
} from 'lucide-react';
import AddToPlaylistMenu from '@/components/playlist/AddToPlaylistMenu';
import ActiveGlow from '@/components/player/ActiveGlow';

/**
 * Barra do player.
 *
 * Melhorias sobre a versão anterior:
 *  - a barra de progresso agora é um slider de verdade: arrasta (não só
 *    clica), aceita teclado (setas, Home/End) e anuncia posição para
 *    leitores de tela;
 *  - passar o mouse mostra o tempo exato daquele ponto antes de soltar;
 *  - a capa reage ao som e ganha reflexo;
 *  - todo botão tem rótulo acessível — antes eram ícones mudos.
 */

function formatTime(t) {
  if (!t || Number.isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Botão de alternância do player, com halo quando ligado. */
function ToggleButton({ on, onClick, label, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={`relative p-2 rounded-xl transition-all duration-200 ${
        on ? 'text-velvet-silver' : 'text-velvet-dim hover:text-velvet-text hover:bg-white/[0.07]'
      } ${className}`}
    >
      {on && <ActiveGlow rounded="rounded-xl" />}
      <span className="relative z-10 block">{children}</span>
    </button>
  );
}

export default function MiniPlayer({
  currentSong, isPlaying, onPlayPause, onNext, onPrevious,
  progress, currentTime, duration, onSeek,
  onExpand, isFavorite, onFavoriteToggle,
  volume, isMuted, onVolumeChange, onToggleMute,
  repeatMode, onToggleRepeat,
  crossfadeEnabled, onToggleCrossfade,
  shuffleEnabled, onToggleShuffle,
  onExpandMobile,
}) {
  const barRef = useRef(null);
  const [hoverPct, setHoverPct] = useState(null);
  const [dragging, setDragging] = useState(false);

  const pctFromEvent = useCallback((clientX) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const seekTo = useCallback((pct) => {
    if (!duration) return;
    onSeek(pct * duration);
  }, [duration, onSeek]);

  // Arrastar: captura o ponteiro para o gesto não se perder se o cursor
  // sair da barra no meio do movimento.
  const onPointerDown = (e) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    const p = pctFromEvent(e.clientX);
    setHoverPct(p);
    seekTo(p);
  };

  const onPointerMove = (e) => {
    if (!duration) return;
    const p = pctFromEvent(e.clientX);
    setHoverPct(p);
    if (dragging) seekTo(p);
  };

  const onPointerUp = (e) => {
    if (dragging) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setDragging(false);
    }
  };

  const onKeyDown = (e) => {
    if (!duration) return;
    const step = e.shiftKey ? 30 : 5;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); onSeek(Math.min(duration, currentTime + step)); break;
      case 'ArrowLeft':  e.preventDefault(); onSeek(Math.max(0, currentTime - step)); break;
      case 'Home':       e.preventDefault(); onSeek(0); break;
      case 'End':        e.preventDefault(); onSeek(Math.max(0, duration - 1)); break;
      default: break;
    }
  };

  if (!currentSong) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shownPct = hoverPct != null ? hoverPct * 100 : progressPct;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const cover = currentSong.cover_url;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:px-3 lg:pb-3 lg:pl-[100px] pointer-events-none">
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="v-glass-strong v-chrome-edge pointer-events-auto mx-auto lg:max-w-6xl overflow-hidden lg:rounded-3xl border-t lg:border"
      >
        {/* ---------- Barra de progresso ---------- */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Posição da faixa"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration) || 0}
          aria-valuenow={Math.floor(currentTime) || 0}
          aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => !dragging && setHoverPct(null)}
          onKeyDown={onKeyDown}
          className="group/progress relative h-2 cursor-pointer touch-none select-none focus:outline-none"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-white/[0.10]" />

          {/* Prévia até onde o cursor está */}
          {hoverPct != null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] bg-white/[0.18]"
              style={{ width: `${hoverPct * 100}%` }}
            />
          )}

          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] group-hover/progress:h-[5px] transition-[height]"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #8f8f9d 0%, #d8d8e2 60%, #ffffff 100%)',
              boxShadow: '0 0 12px rgba(216,216,226,0.55)',
            }}
          />

          <div
            className="absolute top-1/2 w-3.5 h-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full opacity-0 group-hover/progress:opacity-100 group-focus-visible/progress:opacity-100 transition-opacity"
            style={{
              left: `${progressPct}%`,
              background: 'linear-gradient(180deg,#ffffff,#c2c2d0)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.7)',
              opacity: dragging ? 1 : undefined,
            }}
          />

          {/* Tempo do ponto sob o cursor */}
          {hoverPct != null && duration > 0 && (
            <div
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums text-velvet-text v-glass pointer-events-none whitespace-nowrap"
              style={{ left: `${shownPct}%` }}
            >
              {formatTime(hoverPct * duration)}
            </div>
          )}
        </div>

        {/* ---------- Mobile ---------- */}
        <div className="flex lg:hidden flex-col gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={onExpandMobile}
            className="flex items-center gap-3 min-w-0 text-left active:opacity-60"
            aria-label={`Abrir player — ${currentSong.title}`}
          >
            <div className="relative w-12 h-12 shrink-0">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover v-audio-glow"
                  style={{ border: '1px solid rgba(255,255,255,0.14)' }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-velvet-faint" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-velvet-text text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-velvet-dim text-xs truncate">{currentSong.artist}</p>
            </div>
            <span className="text-[11px] text-velvet-faint tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </button>

          <div className="flex items-center justify-center gap-3">
            <ToggleButton on={shuffleEnabled} onClick={onToggleShuffle} label="Modo aleatório">
              <Shuffle className="w-4 h-4" />
            </ToggleButton>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Faixa anterior"
              className="p-2 rounded-xl text-velvet-dim active:bg-white/10"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
              className="btn-green w-14 h-14 flex items-center justify-center shrink-0"
            >
              {isPlaying
                ? <Pause className="w-5 h-5 fill-current" />
                : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </motion.button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima faixa"
              className="p-2 rounded-xl text-velvet-dim active:bg-white/10"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <ToggleButton on={isFavorite} onClick={onFavoriteToggle} label={isFavorite ? 'Remover dos curtidos' : 'Curtir'}>
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </ToggleButton>
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-3">
          {/* Faixa atual */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0 group/cover v-scene-tight">
              {cover ? (
                <motion.img
                  src={cover}
                  alt=""
                  whileHover={{ rotateY: -14, rotateX: 6, scale: 1.06 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-14 h-14 rounded-xl object-cover v-audio-glow"
                  style={{ border: '1px solid rgba(255,255,255,0.16)', transformStyle: 'preserve-3d' }}
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-velvet-faint" />
                </div>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={onExpand}
                aria-label="Abrir tocando agora"
                className="absolute inset-0 rounded-xl bg-black/70 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover/cover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </motion.button>
            </div>

            <div className="min-w-0">
              <p className="text-velvet-text text-sm font-semibold truncate">{currentSong.title}</p>
              <p className="text-velvet-dim text-xs truncate">
                {currentSong.artist}
                {currentSong.featuring && (
                  <span className="text-velvet-faint"> feat. {currentSong.featuring}</span>
                )}
              </p>
            </div>
          </div>

          {/* Transporte */}
          <div className="flex items-center justify-center gap-1">
            <ToggleButton on={shuffleEnabled} onClick={onToggleShuffle} label="Modo aleatório">
              <Shuffle className="w-4 h-4" />
            </ToggleButton>
            <ToggleButton on={repeatMode} onClick={onToggleRepeat} label="Repetir faixa">
              <Repeat className="w-4 h-4" />
            </ToggleButton>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Faixa anterior"
              className="p-2 rounded-xl text-velvet-dim hover:text-velvet-text hover:bg-white/[0.07] transition-all"
            >
              <SkipBack className="w-[18px] h-[18px]" />
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
              className="btn-green w-11 h-11 mx-1 flex items-center justify-center"
            >
              {isPlaying
                ? <Pause className="w-[18px] h-[18px] fill-current" />
                : <Play className="w-[18px] h-[18px] fill-current ml-0.5" />}
            </motion.button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima faixa"
              className="p-2 rounded-xl text-velvet-dim hover:text-velvet-text hover:bg-white/[0.07] transition-all"
            >
              <SkipForward className="w-[18px] h-[18px]" />
            </button>

            <ToggleButton on={isFavorite} onClick={onFavoriteToggle} label={isFavorite ? 'Remover dos curtidos' : 'Curtir'}>
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </ToggleButton>
            <ToggleButton on={crossfadeEnabled} onClick={onToggleCrossfade} label="Crossfade entre faixas">
              <GitMerge className="w-4 h-4" />
            </ToggleButton>

            <AddToPlaylistMenu
              songId={currentSong.id}
              buttonClassName="p-2 rounded-xl text-velvet-dim hover:text-velvet-text hover:bg-white/[0.07] transition-all"
              iconClassName="w-4 h-4"
            />
          </div>

          {/* Tempo + volume */}
          <div className="flex items-center gap-2 flex-1 justify-end text-xs text-velvet-dim">
            <span className="tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
            <span className="text-velvet-faint">/</span>
            <span className="tabular-nums w-10">{formatTime(duration)}</span>

            <div className="flex items-center gap-1.5 ml-3 w-[124px]">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Reativar som' : 'Silenciar'}
                aria-pressed={isMuted}
                className="p-1.5 rounded-lg text-velvet-dim hover:text-velvet-text hover:bg-white/[0.07] transition-all shrink-0"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0" max="1" step="0.01"
                value={isMuted ? 0 : volume}
                onChange={onVolumeChange}
                aria-label="Volume"
                className="w-full"
                style={{
                  background: `linear-gradient(to right, #ffffff 0%, #d8d8e2 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.14) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.14) 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
