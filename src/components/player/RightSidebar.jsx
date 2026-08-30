import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Music2, Mic, ChevronDown, Disc3, Image as ImageIcon } from 'lucide-react';
import ChromeVinyl from '@/components/fx/ChromeVinyl';
import AudioVisualizer from '@/components/player/AudioVisualizer';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getItemLabel } from '@/lib/utils';
import BackgroundMedia from '@/components/media/BackgroundMedia';
import LyricsView from '@/components/player/LyricsView';
import CreditsView from '@/components/player/CreditsView';

export default function RightSidebar({ song, onClose, currentTime = 0, duration = 0, onSeek, isPlaying = false }) {
  const videoRef = useRef(null);
  const [artist, setArtist] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  // Alterna entre a arte da faixa e o vinil de cromo em 3D. A escolha fica
  // guardada, porque é preferência de quem ouve, não da faixa.
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

  // A different track is now playing — drop back out of the lyrics/credits
  // view so it doesn't sit there showing the previous song's info.
  useEffect(() => { setShowLyrics(false); setShowCredits(false); }, [song?.id]);

  const credits = Array.isArray(song?.credits) ? song.credits.filter((c) => c && (c.title || c.description)) : [];
  const hasLyrics = Array.isArray(song?.lyrics) && song.lyrics.length > 0;
  const podcastCategories = Array.isArray(song?.categories) ? song.categories.filter(Boolean) : [];

  useEffect(() => {
    const loadArtist = async () => {
      try {
        const users = await base44.entities.User.list();
        const found = users.find(u =>
          u.display_name === song?.artist || u.full_name === song?.artist
        );
        setArtist(found || null);
      } catch (error) {
        console.error('Error loading artist:', error);
      }
    };
    if (song?.artist) loadArtist();
  }, [song?.artist, song?.id]);

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
  });
  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: () => base44.entities.Artist.list('-created_date', 200),
  });
  const label = getItemLabel(song, labels, artists);

  if (!song) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="v-glass-strong fixed right-0 top-0 bottom-0 w-full max-w-sm border-l z-40 flex flex-col"
    >
      {/* Media + title hero — the video/cover fades to black at the bottom
          so the title/artist read clearly instead of fighting the footage */}
      <div className="relative w-full aspect-[3/4] flex-shrink-0 overflow-hidden" style={{ background: 'var(--v-void)' }}>
        {vinylMode ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Fundo desfocado da própria capa: dá cor ao painel sem
                competir com o disco. */}
            {song.cover_url && (
              <img
                src={song.cover_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-125 opacity-25"
                style={{ filter: 'blur(28px) saturate(140%)' }}
              />
            )}
            <ChromeVinyl coverUrl={song.cover_url} isPlaying={isPlaying} size={280} />
          </div>
        ) : song.background_video_url ? (
          <BackgroundMedia
            src={song.background_video_url}
            alt={song.title}
            videoRef={videoRef}
            className="w-full h-full object-cover"
          />
        ) : song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#d8d8e2]/20 to-[#101014]">
            <Music2 className="w-20 h-20 text-[#62626e]" />
          </div>
        )}

        {/* Darken toward the top (legible close button) and toward the
            bottom (legible title), leaving the middle of the footage clear */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* Close — collapses the panel back off the right edge, matching
            the direction it slides out */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleVinyl}
            title={vinylMode ? 'Mostrar a capa' : 'Mostrar o vinil 3D'}
            aria-label={vinylMode ? 'Mostrar a capa' : 'Mostrar o vinil 3D'}
            aria-pressed={vinylMode}
            className={`p-2.5 rounded-xl backdrop-blur-sm transition-colors ${
              vinylMode ? 'bg-white/20 text-white' : 'bg-black/45 hover:bg-black/65 text-white/80'
            }`}
          >
            {vinylMode ? <ImageIcon className="w-4 h-4" /> : <Disc3 className="w-4 h-4" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            title="Recolher"
            aria-label="Recolher painel"
            className="p-2.5 bg-black/45 hover:bg-black/65 backdrop-blur-sm rounded-xl transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {/* Title/artist/feat sit directly on the faded-out footage */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-lg">{song.title}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sem artista cadastrado, o link apontava para "?id=" e caía
                numa página vazia — nesse caso mostramos só o nome. */}
            <Link
              to={artist?.id ? `${createPageUrl('ArtistProfile')}?id=${artist.id}` : '#'}
              onClick={(e) => { if (!artist?.id) e.preventDefault(); }}
              className={`flex items-center gap-1.5 ${artist?.id ? 'hover:underline' : 'cursor-default'}`}
            >
              <span className="text-white/90 font-medium drop-shadow">{song.artist}</span>
              {artist?.verified && (
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </Link>
            {song.featuring && (
              <span className="text-white/60 text-sm drop-shadow">feat. {song.featuring}</span>
            )}
          </div>
          {label && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-white/70 drop-shadow">
              {label.logo ? (
                <img src={label.logo} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <Music2 className="w-3 h-3" />
              )}
              <span>{label.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Data — plays, rating, duration, genre, credits. Bottom padding
          keeps the last item (credits) clear of the mini player bar, which
          is fixed over the bottom of the whole screen including this panel. */}
      {/* Espectro ao vivo — a mesma leitura de áudio que move o vinil. */}
      <div className="px-5 pt-4 shrink-0">
        <AudioVisualizer isPlaying={isPlaying} bars={44} height={48} />
      </div>

      <div className="flex-1 p-6 pt-4 pb-28 overflow-y-auto min-h-0">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-2xl v-specular" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-bold text-white">{(song.plays || 0).toLocaleString()}</p>
              <p className="text-[10px] text-[#9a9aa6] uppercase tracking-wider">Plays</p>
            </div>
            <div className="text-center p-3 rounded-2xl v-specular" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-bold text-white">{song.rating > 0 ? song.rating.toFixed(1) : '—'}</p>
              <p className="text-[10px] text-[#9a9aa6] uppercase tracking-wider">Rating</p>
            </div>
            <div className="text-center p-3 rounded-2xl v-specular" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-bold text-white">{song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '—'}</p>
              <p className="text-[10px] text-[#9a9aa6] uppercase tracking-wider">Duração</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {song.is_podcast ? (
              podcastCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {podcastCategories.map((category) => (
                    <span key={category} className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#d8d8e2]/10 text-[#d8d8e2] border border-[#d8d8e2]/20">
                      {category}
                    </span>
                  ))}
                </div>
              ) : <span className="text-xs text-white/40">Podcast</span>
            ) : song.genre ? (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#d8d8e2]/10 text-[#d8d8e2] border border-[#d8d8e2]/20">
                {song.genre}
              </span>
            ) : <span />}

            <button
              onClick={() => setShowLyrics(true)}
              title={hasLyrics ? 'Ver letra' : 'Sem letra disponível'}
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors flex-shrink-0 ${
                hasLyrics
                  ? 'bg-[#d8d8e2]/10 text-[#d8d8e2] border-[#d8d8e2]/20 hover:bg-[#d8d8e2]/15'
                  : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Credits — opens the full list in an overlay instead of an inline
              list, since the persistent mini player at the bottom of the
              screen can cover the tail end of a long list otherwise */}
          {credits.length > 0 && (
            <button
              onClick={() => setShowCredits(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-white transition-all"
            >
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold">Créditos</p>
                <p className="text-xs opacity-60 truncate">{credits.length} {credits.length === 1 ? 'crédito' : 'créditos'}</p>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 text-white/40 flex-shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Synced lyrics overlay */}
      <AnimatePresence>
        {showLyrics && (
          <LyricsView
            song={song}
            currentTime={currentTime}
            duration={duration || song.duration || 0}
            onSeek={onSeek}
            onClose={() => setShowLyrics(false)}
          />
        )}
      </AnimatePresence>

      {/* Credits overlay */}
      <AnimatePresence>
        {showCredits && (
          <CreditsView song={song} credits={credits} onClose={() => setShowCredits(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
