import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipForward, SkipBack, Heart, Repeat, Shuffle, Volume2, GitMerge, Mic } from 'lucide-react';
import AddToPlaylistMenu from '@/components/playlist/AddToPlaylistMenu';
import ActiveGlow from '@/components/player/ActiveGlow';
import LyricsView from '@/components/player/LyricsView';
import ChromeVinyl from '@/components/fx/ChromeVinyl';
import AudioVisualizer from '@/components/player/AudioVisualizer';

export default function ExpandedMobilePlayer({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  isFavorite,
  onFavoriteToggle,
  repeatMode,
  onToggleRepeat,
  shuffleEnabled,
  onToggleShuffle,
  crossfadeEnabled,
  onToggleCrossfade,
  volume,
  onVolumeChange,
}) {
  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const [showLyrics, setShowLyrics] = useState(false);
  useEffect(() => { setShowLyrics(false); }, [currentSong?.id]);

  // Toque na arte alterna entre a capa e o vinil de cromo.
  const [vinylMode, setVinylMode] = useState(() => {
    try { return localStorage.getItem('velvet:vinyl') === '1'; } catch { return false; }
  });
  const toggleVinyl = () => {
    setVinylMode((v) => {
      const next = !v;
      try { localStorage.setItem('velvet:vinyl', next ? '1' : '0'); } catch { /* modo privado */ }
      return next;
    });
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[9999] lg:hidden overflow-hidden"
          style={{ background: 'var(--v-abyss)' }}
        >
          {/* A própria capa, desfocada, pinta o fundo da tela cheia — o
              player passa a ter a cor da faixa em vez de um cinza fixo. */}
          {currentSong?.cover_url && (
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <img
                src={currentSong.cover_url}
                alt=""
                className="w-full h-full object-cover scale-125 opacity-35"
                style={{ filter: 'blur(46px) saturate(150%)' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,5,6,0.55), rgba(5,5,6,0.92))' }} />
            </div>
          )}
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
            <button onClick={onClose} className="p-2 text-[#9a9aa6] active:text-white">
              <ChevronDown className="w-6 h-6" />
            </button>
            <span className="text-xs text-[#62626e] font-medium">TOCANDO AGORA</span>
            <button
              onClick={() => setShowLyrics(true)}
              title="Letra"
              className={`p-2 transition-colors ${Array.isArray(currentSong?.lyrics) && currentSong.lyrics.length > 0 ? 'text-[#d8d8e2] active:text-white' : 'text-[#62626e] active:text-white'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Synced lyrics overlay */}
          <AnimatePresence>
            {showLyrics && (
              <LyricsView
                song={currentSong}
                currentTime={currentTime}
                duration={duration || currentSong?.duration || 0}
                onSeek={onSeek}
                onClose={() => setShowLyrics(false)}
              />
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full overflow-y-auto pb-safe">
            {/* Album art - large */}
            <div className="flex-1 flex items-center justify-center px-6 py-6">
              <button
                type="button"
                onClick={toggleVinyl}
                aria-label={vinylMode ? 'Mostrar a capa' : 'Mostrar o vinil 3D'}
                className="relative"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {vinylMode ? (
                    <motion.div
                      key="vinyl"
                      initial={{ opacity: 0, rotateY: -70, scale: 0.9 }}
                      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      exit={{ opacity: 0, rotateY: 70, scale: 0.9 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChromeVinyl coverUrl={currentSong?.cover_url} isPlaying={isPlaying} size={264} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cover"
                      initial={{ opacity: 0, rotateY: 70, scale: 0.9 }}
                      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      exit={{ opacity: 0, rotateY: -70, scale: 0.9 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="w-64 h-64 rounded-2xl overflow-hidden v-audio-glow"
                      style={{ border: '1px solid rgba(255,255,255,0.16)' }}
                    >
                      {currentSong?.cover_url ? (
                        <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                          <div className="w-24 h-24 rounded-xl bg-white/[0.07]" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Espectro ao vivo */}
            <div className="px-8">
              <AudioVisualizer isPlaying={isPlaying} bars={36} height={44} />
            </div>

            {/* Song info */}
            <div className="px-6 pt-2 pb-6 text-center">
              <h1 className="text-2xl font-bold text-velvet-text truncate mb-2">{currentSong?.title}</h1>
              <p className="text-base text-[#9a9aa6] truncate">{currentSong?.artist}</p>
            </div>

            {/* Progress bar */}
            <div className="px-6 pb-8">
              <div
                className="relative h-2 bg-[#1c1c22] rounded-full cursor-pointer group/progress mb-4"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#d8d8e2] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-active/progress:opacity-100"
                  style={{ left: `${progressPct}%`, marginLeft: '-8px' }}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-[#9a9aa6]">
                <span className="tabular-nums">{formatTime(currentTime)}</span>
                <span className="tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="px-6 pb-8 flex items-center justify-center gap-6">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onToggleShuffle}
                className={`relative p-3 rounded-full transition-colors ${
                  shuffleEnabled ? 'text-[#d8d8e2] bg-[#d8d8e2]/10' : 'text-[#9a9aa6]'
                }`}
              >
                {shuffleEnabled && <ActiveGlow />}
                <Shuffle className="relative z-10 w-6 h-6" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onPrevious}
                className="p-3 rounded-full text-white"
              >
                <SkipBack className="w-8 h-8 fill-current" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={onPlayPause}
                className="w-20 h-20 btn-green flex items-center justify-center shadow-2xl flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-black fill-black" />
                ) : (
                  <Play className="w-8 h-8 text-black fill-black ml-1" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onNext}
                className="p-3 rounded-full text-white"
              >
                <SkipForward className="w-8 h-8 fill-current" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onFavoriteToggle}
                className={`relative p-3 rounded-full transition-colors ${
                  isFavorite ? 'text-[#d8d8e2] bg-[#d8d8e2]/10' : 'text-[#9a9aa6]'
                }`}
              >
                {isFavorite && <ActiveGlow />}
                <Heart className={`relative z-10 w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            {/* Secondary controls */}
            <div className="px-6 pb-12 space-y-4">
              <div className="flex items-center justify-center gap-6">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onToggleRepeat}
                  className={`relative p-2 rounded-full transition-colors ${
                    repeatMode ? 'text-[#d8d8e2] bg-[#d8d8e2]/10' : 'text-[#9a9aa6]'
                  }`}
                >
                  {repeatMode && <ActiveGlow />}
                  <Repeat className="relative z-10 w-5 h-5" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onToggleCrossfade}
                  className={`relative p-2 rounded-full transition-colors ${
                    crossfadeEnabled ? 'text-[#d8d8e2] bg-[#d8d8e2]/10' : 'text-[#9a9aa6]'
                  }`}
                  title="Crossfade entre faixas"
                >
                  {crossfadeEnabled && <ActiveGlow />}
                  <GitMerge className="relative z-10 w-5 h-5" />
                </motion.button>

                {currentSong && (
                  <AddToPlaylistMenu
                    songId={currentSong.id}
                    buttonClassName="p-2 rounded-full text-[#9a9aa6] transition-colors"
                    iconClassName="w-5 h-5"
                    align="start"
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-[#9a9aa6] flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={onVolumeChange}
                  className="flex-1"
                  style={{
                    background: `linear-gradient(to right, #d8d8e2 0%, #d8d8e2 ${
                      volume * 100
                    }%, #26262e ${volume * 100}%, #26262e 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}