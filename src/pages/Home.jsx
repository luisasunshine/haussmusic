import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Heart, Music2, TrendingUp, Star, Calendar, User, Timer, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HomeHeroCarousel from '@/components/home/HomeHeroCarousel';
import HeroSlide from '@/components/home/HeroSlide';
import SectionHeader from '@/components/home/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import MoodPlaylists from '@/components/home/MoodPlaylists';
import PublicPlaylists from '@/components/home/PublicPlaylists';

// A abertura em three.js é pesada e só roda na primeira visita da sessão.
// Mantê-la fora do pacote principal tira ~674 KB do carregamento de todo
// mundo que já viu a intro.
const VelvetIntro = lazy(() => import('@/components/home/VelvetIntro'));
import { DiscordIcon } from '@/components/social/SocialBrandIcons';
import { hasUserType } from '@/lib/utils';
import { useSongLikes } from '@/lib/songLikes';
import Reveal from '@/components/fx/Reveal';

const pills = [
  { label: 'Tudo', key: 'all' },
  { label: 'Músicas', key: 'songs' },
  { label: 'Álbuns', key: 'albums' },
  { label: 'Artistas', key: 'artists' },
  { label: 'Podcasts', key: 'podcasts' },
];

function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPlays(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function Home() {
  const [activePill, setActivePill] = useState('all');
  const [activePodcastCategory, setActivePodcastCategory] = useState('all');
  const [currentPlayingSong, setCurrentPlayingSong] = useState(null);
  const [activeSongId, setActiveSongId] = useState(null);
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('hasSeenIntro'));
  const [peopleTab, setPeopleTab] = useState('artists');
  const queryClient = useQueryClient();

  // Handle shared song from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    if (songId) {
      const timer = setTimeout(() => {
        const song = queryClient.getQueryData(['songs'])?.find(s => s.id === songId);
        if (song) {
          window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
          setCurrentPlayingSong(song);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  useEffect(() => {
    const handlePlaySong = (e) => setCurrentPlayingSong(e.detail);
    window.addEventListener('playSong', handlePlaySong);
    return () => window.removeEventListener('playSong', handlePlaySong);
  }, []);

  useEffect(() => {
    const handleActiveSongChanged = (event) => {
      setActiveSongId(event.detail?.id || null);
    };
    window.addEventListener('activeSongChanged', handleActiveSongChanged);
    return () => window.removeEventListener('activeSongChanged', handleActiveSongChanged);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('hasSeenIntro', 'true');
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { isLiked, toggle } = useSongLikes(user?.email);

  // Shared ['songs'] cache — fetch the full list (same queryFn everywhere so
  // observers don't clobber each other); the sections below sort/slice it.
  const { data: allSongs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date'),
    refetchInterval: 15000,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const all = await base44.entities.Post.list('-created_date', 20);
      return all;
    },
    refetchInterval: 15000,
  });

  // A wider, polled pool keeps the artist grid and sidebar current even when
  // artists and listeners are unevenly mixed in recent signups.
  const { data: recentUsers = [] } = useQuery({
    queryKey: ['recent-users-sidebar'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    refetchInterval: 15000,
  });
  const recentArtists = recentUsers.filter(u => hasUserType(u, 'artista')).slice(0, 15);
  // Every account defaults to user_type ['ouvinte'] at signup, and granting
  // another cargo adds to that array rather than replacing it. Only
  // artistas are excluded from "Ouvintes" here — staff and gravadora
  // accounts are still fine to show there.
  const recentListeners = recentUsers
    .filter(u => hasUserType(u, 'ouvinte') && !hasUserType(u, 'artista'))
    .slice(0, 15);

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const logoUrl = appSettings.find(s => s.key === 'logo_url')?.value || '/logo.png';
  const discordUrl = appSettings.find(s => s.key === 'discord_url')?.value;
  const revistaUrl = appSettings.find(s => s.key === 'revista_url')?.value;

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: () => base44.entities.Banner.list('-created_date', 10),
  });
  const activeBanners = banners.filter(b => b.is_active !== false);

  const scheduledAlbums = new Set(posts.filter(p => p.is_scheduled && p.scheduled_datetime && new Date(p.scheduled_datetime) > new Date()).map(p => p.title));
  const isSongScheduled = (song) => song.album && scheduledAlbums.has(song.album);
  // Podcasts ride the same Song/Post tables but must stay out of the music
  // rows — split them off here so every music section works off musicSongs.
  const musicSongs = allSongs.filter(s => !s.is_podcast);
  const podcastShows = posts.filter(p => p.is_podcast).slice(0, 12);
  const podcastEpisodes = [...allSongs].filter(s => s.is_podcast).sort((a, b) => (b.plays || 0) - (a.plays || 0));
  const podcastCategories = [...new Set(podcastEpisodes.flatMap((episode) => Array.isArray(episode.categories) ? episode.categories : []))].sort();
  const visiblePodcastEpisodes = activePodcastCategory === 'all'
    ? podcastEpisodes
    : podcastEpisodes.filter((episode) => episode.categories?.includes(activePodcastCategory));
  const topPlayed = [...musicSongs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 8);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSongs = [...musicSongs]
    .filter(s => new Date(s.created_date) >= oneMonthAgo)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);
  const topRated = [...musicSongs].filter(s => s.rating > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  const trending = [...musicSongs].filter(s => {
    const days = (Date.now() - new Date(s.created_date)) / 86400000;
    return days <= 14 && (s.plays || 0) > 5;
  }).sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6);

  const featuredSong = topPlayed[0];
  const featuredSongScheduled = featuredSong ? isSongScheduled(featuredSong) : false;
  const recentAlbums = posts.filter(p => p.type === 'album' || p.type === 'ep').slice(0, 8);
  // The artists tab uses this same refreshed data as the sidebar so profile
  // photos do not get stuck on a stale URL after a backend/domain change.
  const songArtists = recentArtists;

  const { data: featuredArtist } = useQuery({
    queryKey: ['featured-artist', featuredSong?.artist],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.display_name === featuredSong.artist || u.full_name === featuredSong.artist) || null;
    },
    enabled: !!featuredSong?.artist,
  });

  const featuredBackdrop = featuredArtist?.profile_banner;

  const getScheduledInfo = (song) => {
    if (!song.album) return null;
    return posts.find(p => p.title === song.album && p.is_scheduled && p.scheduled_datetime);
  };

  const dispatchPlaySong = (song) => {
    if (isSongScheduled(song)) {
      const post = getScheduledInfo(song);
      if (post?.scheduled_datetime) {
        const d = new Date(post.scheduled_datetime);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        toast(`${song.title}`, {
          description: `Estreia em ${dateStr} às ${timeStr}`,
          icon: <Timer className="w-4 h-4 text-amber-400" />,
        });
      }
      return;
    }
    if (currentPlayingSong?.id === song.id) {
      window.dispatchEvent(new CustomEvent('togglePlayPause'));
    } else {
      setCurrentPlayingSong(song);
      window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
    }
  };

  const toggleFavorite = (song, e) => {
    e.stopPropagation();
    toggle(song);
  };

  const filteredSongs = activePill === 'songs' ? allSongs :
    activePill === 'albums' ? recentAlbums :
    activePill === 'artists' ? songArtists : allSongs;

  // Hero rotates between the "Mais Ouvidas" song card and every active
  // admin banner, one slide at a time — same spot, same size, so an admin
  // adding a banner just means the rotation gets one slide longer.
  // Hero: a faixa "Mais Ouvidas" mais um slide por banner ativo do admin,
  // todos no mesmo layout split (HeroSlide) — texto à esquerda, arte
  // emoldurada à direita, fundo desfocado da própria imagem.
  const heroSlides = [
    ...(featuredSong ? [{
      key: `song-${featuredSong.id}`,
      render: () => (
        <HeroSlide
          media={featuredBackdrop || featuredSong.cover_url}
          fallbackName={featuredSong.artist}
          eyebrow="Mais ouvidas"
          title={featuredSong.title}
          subtitle={`${featuredSong.artist}${featuredSong.featuring ? ` feat. ${featuredSong.featuring}` : ''}`}
          meta={
            <span className="flex items-center gap-2">
              <span>{formatPlays(featuredSong.plays)} plays</span>
              {featuredSong.album && (<><span className="opacity-40">·</span><span>{featuredSong.album}</span></>)}
            </span>
          }
          onActivate={featuredSongScheduled ? undefined : () => dispatchPlaySong(featuredSong)}
          actions={
            featuredSongScheduled ? (
              <span className="v-badge-dim px-4 py-2 text-xs">Em breve</span>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(featuredSong); }}
                  aria-label={currentPlayingSong?.id === featuredSong.id ? 'Pausar' : 'Tocar destaque'}
                  className="btn-green h-12 px-6 flex items-center gap-2.5 shadow-halo"
                >
                  {currentPlayingSong?.id === featuredSong.id
                    ? <><Pause className="w-5 h-5 fill-current" /> Pausar</>
                    : <><Play className="w-5 h-5 fill-current" /> Tocar</>}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => toggleFavorite(featuredSong, e)}
                  aria-label={isLiked(featuredSong) ? 'Remover dos curtidos' : 'Curtir'}
                  aria-pressed={isLiked(featuredSong)}
                  className={`btn-ghost-metal w-12 h-12 flex items-center justify-center ${
                    isLiked(featuredSong) ? 'text-velvet-silver' : ''
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked(featuredSong) ? 'fill-current' : ''}`} />
                </motion.button>
              </>
            )
          }
        />
      ),
    }] : []),
    ...activeBanners.map((banner) => ({
      key: `banner-${banner.id}`,
      durationSeconds: banner.duration_seconds || 7,
      render: () => (
        <HeroSlide
          variant="full"
          media={banner.image_url}
          isVideo={/\.(mp4|webm|mov)(\?|$)/i.test(banner.image_url || '')}
          fallbackName={banner.title}
          eyebrow={banner.category || 'Destaque'}
          title={banner.title}
          subtitle={banner.artist_name || banner.description}
          meta={banner.artist_name && banner.description ? banner.description : null}
          actions={
            banner.link_url ? (
              <a
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="btn-green h-11 px-6 inline-flex items-center"
              >
                {banner.button_text || 'Saiba mais'}
              </a>
            ) : null
          }
        />
      ),
    })),
  ];

  return (
    <>
      {/* Intro Splash */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] overflow-hidden"
            style={{ background: 'radial-gradient(circle at 50% 45%, #1c1c28 0%, #0a0a0f 60%, #050506 100%)' }}
          >
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-28 h-28 object-contain animate-pulse"
                    style={{ filter: 'drop-shadow(0 8px 30px rgba(216,216,226,0.4))' }}
                  />
                </div>
              }
            >
              <VelvetIntro logoUrl={logoUrl} onComplete={handleIntroComplete} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 lg:px-6 py-4 lg:py-6 max-w-[1600px] mx-auto">

          {/* Top Filter Pills */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {pills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setActivePill(pill.key)}
                  className={activePill === pill.key ? 'btn-pill-active' : 'btn-pill-inactive'}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => discordUrl ? window.open(discordUrl, '_blank', 'noopener') : toast('Em Breve!')}
                title="Discord"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#5865F2]/20 border border-white/10 hover:border-[#5865F2]/40 flex items-center justify-center text-[#9a9aa6] hover:text-[#5865F2] transition-colors"
              >
                <DiscordIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => revistaUrl ? window.open(revistaUrl, '_blank', 'noopener') : toast('Em Breve!')}
                title="Revista"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d8d8e2]/20 border border-white/10 hover:border-[#d8d8e2]/40 flex items-center justify-center text-[#9a9aa6] hover:text-[#d8d8e2] transition-colors"
              >
                <img src="/logo2.png" alt="Revista" className="w-5 h-5 object-contain" />
              </button>
            </div>
          </div>

          {/* Hero Carousel — "Mais Ouvidas" + active admin banners, rotating */}
          <HomeHeroCarousel slides={heroSlides} />

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Main Content */}
            <div className="flex-1 min-w-0">

              {/* ALL view: show song sections */}
              {activePill === 'all' && (
                <>
                  {/* Trending Now */}
                  {trending.length > 0 && (
                    <Reveal as="section" className="mb-8">
                      <SectionHeader
                          title="Em Alta"
                          subtitle="O que está bombando agora"
                          icon={TrendingUp}
                        />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                        {trending.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="cover-hover relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#1c1c22]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/20 to-[#101014] flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#62626e]" />
                                </div>
                              )}
                              {scheduled ? (
                                <div className="absolute top-2 left-2 v-badge-dim">Em Breve</div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{song.artist}</p>
                            {song.plays > 0 && (
                              <p className="text-[11px] text-[#62626e] mt-1">{formatPlays(song.plays)} plays</p>
                            )}
                          </motion.div>
                        )})}
                      </div>
                    </Reveal>
                  )}

                  {/* Community playlists marked public, newest first */}
                  <PublicPlaylists songs={musicSongs} />

                  {/* Auto-curated mood collections built from the catalogue */}
                  <MoodPlaylists songs={musicSongs} onPlaySong={dispatchPlaySong} userEmail={user?.email} />

                  {/* Podcasts */}
                  {podcastShows.length > 0 && (
                    <Reveal as="section" className="mb-8">
                      <SectionHeader
                          title="Podcasts"
                          subtitle="Conversas e histórias em áudio"
                          icon={Mic}
                        />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                        {podcastShows.map((show, i) => {
                          const firstEp = podcastEpisodes.find(e => e.album === show.title);
                          return (
                            <motion.div
                              key={show.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="card-spotify group cursor-pointer"
                              onClick={() => { window.location.href = createPageUrl('Release') + '?id=' + show.id; }}
                            >
                              <div className="cover-hover relative aspect-square rounded-xl overflow-hidden mb-3 bg-[#1c1c22]">
                                {show.cover_url ? (
                                  <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/30 to-[#101014] flex items-center justify-center">
                                    <Mic className="w-9 h-9 text-[#d8d8e2]/60" />
                                  </div>
                                )}
                                {firstEp && (
                                  <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); dispatchPlaySong(firstEp); }}
                                    className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                  >
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  </motion.button>
                                )}
                              </div>
                              <h3 className="font-bold text-white text-sm truncate">{show.title}</h3>
                              <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{show.artist}</p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </Reveal>
                  )}

                  {/* Recent Releases */}
                  {recentSongs.length > 0 && (
                    <Reveal as="section" className="mb-8">
                      <SectionHeader
                          title="Lançamentos Recentes"
                          subtitle="As músicas mais recentes"
                          icon={Calendar}
                        />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {recentSongs.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="cover-hover relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#1c1c22]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-velvet-raised/60 to-velvet-surface flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#62626e]" />
                                </div>
                              )}
                              {scheduled ? (
                                <div className="absolute top-2 left-2 v-badge-dim">Em Breve</div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{song.artist}</p>
                          </motion.div>
                        )})}
                      </div>
                    </Reveal>
                  )}

                  {/* Top Rated */}
                  {topRated.length > 0 && (
                    <Reveal as="section" className="mb-8">
                      <SectionHeader
                          title="Melhor Avaliadas"
                          subtitle="As favoritas da comunidade"
                          icon={Star}
                        />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                        {topRated.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="cover-hover relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#1c1c22]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-yellow-900/60 to-amber-950 flex items-center justify-center">
                                  <Star className="w-8 h-8 text-[#62626e]" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-[#d8d8e2] fill-current" />
                                <span className="text-[11px] font-bold text-white">{song.rating.toFixed(1)}</span>
                              </div>
                              {!scheduled && (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                              {scheduled && (
                                <div className="absolute top-2 right-2 v-badge-dim">Em Breve</div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{song.artist}</p>
                          </motion.div>
                        )})}
                      </div>
                    </Reveal>
                  )}
                </>
              )}

              {/* SONGS view: full song grid */}
              {activePill === 'songs' && (
                <Reveal as="section" className="mb-8">
                  <SectionHeader
                    title="Todas as músicas"
                    subtitle="O catálogo completo do selo"
                    icon={Music2}
                    count={musicSongs.length}
                  />
                  {musicSongs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {musicSongs.map((song, i) => {
                        const scheduled = isSongScheduled(song);
                        return (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => dispatchPlaySong(song)}
                          className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="cover-hover relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#1c1c22]">
                            {song.cover_url ? (
                              <img src={song.cover_url} alt={song.title} className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/20 to-[#101014] flex items-center justify-center">
                                <Music2 className="w-8 h-8 text-[#62626e]" />
                              </div>
                            )}
                            {scheduled ? (
                              <div className="absolute top-2 left-2 v-badge-dim">Em Breve</div>
                            ) : (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => toggleFavorite(song, e)}
                                  className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song) ? 'text-[#d8d8e2]' : 'text-white hover:text-[#d8d8e2]'}`}
                                >
                                  <Heart className={`w-4 h-4 ${isLiked(song) ? 'fill-current' : ''}`} />
                                </motion.button>
                              </>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                          <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{song.artist}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-[#62626e]">{formatDuration(song.duration)}</span>
                            {song.plays > 0 && (
                              <span className="text-[11px] text-[#62626e]">{formatPlays(song.plays)} plays</span>
                            )}
                          </div>
                        </motion.div>
                      )})}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Music2}
                      title="Nenhuma música por aqui ainda"
                      description="Assim que o primeiro lançamento for publicado, ele aparece nesta lista."
                    />
                  )}
                </Reveal>
              )}

              {/* ALBUMS view: show album/EP releases */}
              {activePill === 'albums' && (
                <Reveal as="section" className="mb-8">
                  <SectionHeader
                    title="Álbuns e EPs"
                    subtitle="Lançamentos completos do selo"
                    icon={Calendar}
                    count={recentAlbums.length}
                  />
                  {recentAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {recentAlbums.map((album, i) => (
                        <Link key={album.id} to={createPageUrl('Release') + '?id=' + album.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="card-spotify group"
                          >
                            <div className="cover-hover relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#1c1c22]">
                              {album.cover_url ? (
                                <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-velvet-raised/60 to-velvet-surface flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#62626e]" />
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{album.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{album.artist}</p>
                            <span className="text-[10px] text-[#62626e] uppercase">{album.type}</span>
                            {album.is_scheduled && (
                              <span className="inline-block mt-1 v-badge-dim">Em Breve</span>
                            )}
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title="Nenhum álbum ou EP publicado"
                      description="Álbuns e EPs criados no painel do artista aparecem aqui."
                    />
                  )}
                </Reveal>
              )}

              {/* PODCASTS view: podcast shows */}
              {activePill === 'podcasts' && (
                <Reveal as="section" className="mb-8">
                  <SectionHeader
                          title="Podcasts"
                          subtitle="Conversas e histórias em áudio"
                          icon={Mic}
                        />
                  {podcastShows.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                      {podcastShows.map((show, i) => {
                        const firstEp = podcastEpisodes.find((episode) => episode.album === show.title);
                        return (
                          <motion.div
                            key={show.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="card-spotify group cursor-pointer"
                            onClick={() => { window.location.href = createPageUrl('Release') + '?id=' + show.id; }}
                          >
                            <div className="cover-hover relative aspect-square rounded-xl overflow-hidden mb-3 bg-[#1c1c22]">
                              {show.cover_url ? (
                                <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/30 to-[#101014] flex items-center justify-center">
                                  <Mic className="w-9 h-9 text-[#d8d8e2]/60" />
                                </div>
                              )}
                              {firstEp && (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(event) => { event.stopPropagation(); dispatchPlaySong(firstEp); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                </motion.button>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{show.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{show.artist}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Music2} title="Nenhum podcast publicado ainda" compact />
                  )}

                  {podcastEpisodes.length > 0 && (
                    <Reveal as="section" className="mt-10">
                      <SectionHeader
                        title="Ouça por categoria"
                        subtitle="Encontre episódios pelo assunto que mais te interessa"
                        icon={Mic}
                      />

                      {podcastCategories.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
                          <button
                            onClick={() => setActivePodcastCategory('all')}
                            className={activePodcastCategory === 'all' ? 'btn-pill-active whitespace-nowrap' : 'btn-pill-inactive whitespace-nowrap'}
                          >
                            Todos
                          </button>
                          {podcastCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => setActivePodcastCategory(category)}
                              className={activePodcastCategory === category ? 'btn-pill-active whitespace-nowrap' : 'btn-pill-inactive whitespace-nowrap'}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                        {visiblePodcastEpisodes.slice(0, 12).map((episode, index) => (
                          <motion.div
                            key={episode.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => dispatchPlaySong(episode)}
                            className="card-spotify group cursor-pointer"
                          >
                            <div className="cover-hover relative aspect-square rounded-xl overflow-hidden mb-3 bg-[#1c1c22]">
                              {episode.cover_url ? (
                                <img src={episode.cover_url} alt={episode.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/30 to-[#101014] flex items-center justify-center">
                                  <Mic className="w-9 h-9 text-[#d8d8e2]/60" />
                                </div>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(event) => { event.stopPropagation(); dispatchPlaySong(episode); }}
                                className="absolute bottom-2 right-2 w-10 h-10 btn-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                              >
                                {currentPlayingSong?.id === episode.id ? <Pause className="w-5 h-5 text-black fill-black" /> : <Play className="w-5 h-5 text-black fill-black ml-0.5" />}
                              </motion.button>
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{episode.title}</h3>
                            <p className="text-xs text-[#9a9aa6] truncate mt-0.5">{episode.artist}</p>
                            {episode.categories?.length > 0 && <p className="text-[11px] text-[#d8d8e2] truncate mt-1">{episode.categories.join(' · ')}</p>}
                          </motion.div>
                        ))}
                      </div>
                    </Reveal>
                  )}
                </Reveal>
              )}

              {/* ARTISTS view: show artist list */}
              {activePill === 'artists' && (
                <Reveal as="section" className="mb-8">
                  <SectionHeader
                    title="Artistas"
                    subtitle="Quem faz o som da Velvet"
                    icon={User}
                    count={songArtists.length}
                    action={{ to: createPageUrl('Artists'), label: 'Ver todos' }}
                  />
                  {songArtists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {songArtists.map((artist, i) => (
                        <Link key={artist.id} to={createPageUrl('ArtistProfile') + '?id=' + artist.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="card-spotify group text-center"
                          >
                            <div className="relative w-24 h-24 mx-auto mb-3">
                              <div className="w-full h-full rounded-full overflow-hidden bg-[#1c1c22]">
                                {artist.profile_picture ? (
                                  <img src={artist.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/30 to-velvet-raised flex items-center justify-center">
                                    <User className="w-10 h-10 text-[#62626e]" />
                                  </div>
                                )}
                              </div>
                              {artist.verified && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#0a0a0c]">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{artist.display_name || artist.full_name || 'Artista'}</h3>
                            <p className="text-xs text-[#9a9aa6]">Artista</p>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Music2} title="Nenhum artista encontrado" compact />
                  )}
                </Reveal>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              {/* Now Playing Widget */}
              {currentPlayingSong && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-spotify-elevated"
                >
                  <h3 className="text-xs font-bold text-[#9a9aa6] uppercase tracking-wider mb-3">Tocando Agora</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#101014] shrink-0">
                      {currentPlayingSong.cover_url ? (
                        <img src={currentPlayingSong.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/20 to-velvet-surface flex items-center justify-center">
                          <Music2 className="w-6 h-6 text-[#62626e]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{currentPlayingSong.title}</p>
                      <p className="text-xs text-[#9a9aa6] truncate">{currentPlayingSong.artist}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Recent People Widget — newest artists / newest listeners */}
              {(recentArtists.length > 0 || recentListeners.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card-spotify-elevated"
                >
                  <div className="flex items-center gap-1 mb-3">
                    <button
                      onClick={() => setPeopleTab('artists')}
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                        peopleTab === 'artists' ? 'text-white bg-white/10' : 'text-[#9a9aa6] hover:text-white'
                      }`}
                    >
                      Artistas
                    </button>
                    <button
                      onClick={() => setPeopleTab('listeners')}
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                        peopleTab === 'listeners' ? 'text-white bg-white/10' : 'text-[#9a9aa6] hover:text-white'
                      }`}
                    >
                      Ouvintes
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(peopleTab === 'artists' ? recentArtists : recentListeners).map((person) => {
                      const row = (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#26262e] transition-colors cursor-pointer">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1c1c22]">
                              {person.profile_picture ? (
                                <img src={person.profile_picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#d8d8e2]/30 to-velvet-raised flex items-center justify-center">
                                  <User className="w-5 h-5 text-[#62626e]" />
                                </div>
                              )}
                            </div>
                            {person.verified && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#101014]">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{person.display_name || person.full_name || 'Usuário'}</p>
                            <p className="text-[11px] text-[#9a9aa6]">{peopleTab === 'artists' ? 'Artista' : 'Ouvinte'}</p>
                          </div>
                        </div>
                      );
                      return peopleTab === 'artists' ? (
                        <Link key={person.id} to={createPageUrl('ArtistProfile') + '?id=' + person.id}>{row}</Link>
                      ) : (
                        <div key={person.id}>{row}</div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Recent Albums Widget */}
              {recentAlbums.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card-spotify-elevated"
                >
                  <h3 className="text-xs font-bold text-[#9a9aa6] uppercase tracking-wider mb-3">Álbuns Recentes</h3>
                  <div className="space-y-2">
                    {recentAlbums.slice(0, 4).map((album) => (
                      <Link key={album.id} to={createPageUrl('Release') + '?id=' + album.id}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#26262e] transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-[#1c1c22] shrink-0">
                            {album.cover_url ? (
                              <img src={album.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-velvet-raised/60 to-velvet-surface flex items-center justify-center">
                                <Music2 className="w-5 h-5 text-[#62626e]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{album.title}</p>
                            <p className="text-[11px] text-[#9a9aa6] truncate">{album.artist}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Empty state */}
          {!songsLoading && allSongs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[#1c1c22] flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-[#62626e]" />
              </div>
              <h2 className="text-2xl font-bold mb-2 v-chrome-text">Bem-vindo ao VELVET MUSIC</h2>
              <p className="text-[#9a9aa6] max-w-md">Sua plataforma de streaming musical. Explore músicas, crie playlists e descubra novos artistas.</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
