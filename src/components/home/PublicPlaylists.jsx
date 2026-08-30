import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, ListMusic } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';

// Mosaic built from the playlist's own songs — same 1/2/3/4-cover layout used
// in the Library grid, so a playlist reads the same wherever it shows up.
function PlaylistCover({ playlist, songs }) {
  const covers = (playlist.song_ids || [])
    .map((sid) => songs.find((s) => s.id === sid))
    .filter(Boolean)
    .map((s) => s.cover_url)
    .filter(Boolean)
    .slice(0, 4);

  if (playlist.cover_url) {
    return <img src={playlist.cover_url} alt={playlist.name} className="absolute inset-0 w-full h-full object-cover" />;
  }
  if (covers.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#d8d8e2]/30 via-velvet-raised/50 to-[#101014] flex items-center justify-center">
        <ListMusic className="w-10 h-10 text-[#62626e]" />
      </div>
    );
  }
  if (covers.length === 1) {
    return <img src={covers[0]} alt={playlist.name} className="absolute inset-0 w-full h-full object-cover" />;
  }
  if (covers.length === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
        <img src={covers[0]} alt="" className="col-span-2 w-full h-full object-cover" />
        <img src={covers[1]} alt="" className="w-full h-full object-cover" />
        <img src={covers[2]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
      {covers.map((c, idx) => <img key={idx} src={c} alt="" className="w-full h-full object-cover" />)}
    </div>
  );
}

export default function PublicPlaylists({ songs = [] }) {
  const scrollRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const { data: allPlaylists = [] } = useQuery({
    queryKey: ['publicPlaylists'],
    queryFn: () => base44.entities.Playlist.list('-created_date', 60),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // Most recently created first — the list is already sorted that way by the
  // query, this just drops anything the creator marked private.
  const playlists = useMemo(
    () => allPlaylists.filter((p) => p.is_public !== false),
    [allPlaylists]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let target = el.scrollLeft;
    let raf = null;

    const step = () => {
      const current = el.scrollLeft;
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target;
        raf = null;
        return;
      }
      el.scrollLeft = current + diff * 0.22;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY < 0 && target <= 0) || (e.deltaY > 0 && target >= max - 1)) return;
      e.preventDefault();
      target = Math.max(0, Math.min(max, target + e.deltaY));
      if (raf == null) raf = requestAnimationFrame(step);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [playlists.length]);

  const nudge = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateOverflow = () => setHasOverflow(el.scrollWidth > el.clientWidth + 1);
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [playlists.length]);

  const playPlaylist = (pl) => {
    const order = (pl.song_ids || []).map((sid) => songs.find((s) => s.id === sid)).filter(Boolean);
    if (order.length === 0) { toast('Essa playlist ainda não tem músicas'); return; }
    window.dispatchEvent(new CustomEvent('playQueue', { detail: { songs: order } }));
    toast(`Tocando ${pl.name}`);
  };

  if (playlists.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold v-chrome-text">Playlists Públicas</h2>
          <p className="text-xs text-[#9a9aa6] mt-0.5">Criadas pela comunidade VELVET</p>
        </div>
        {hasOverflow && <div className="hidden sm:flex items-center gap-1.5">
          <button onClick={() => nudge(-1)} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => nudge(1)} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pt-4 pb-4 -mx-1 px-1 scrollbar-hide"
        style={hasOverflow ? { WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)', maskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)' } : undefined}
      >
        {playlists.map((pl, i) => (
          <Link key={pl.id} to={createPageUrl('Playlist') + '?id=' + pl.id} className="shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.05, type: 'spring', damping: 20, stiffness: 220 }}
              whileHover={{ y: -6, scale: 1.03, transition: { type: 'spring', damping: 18, stiffness: 260 } }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-40 sm:w-44 lg:w-52 aspect-square rounded-[20px] overflow-hidden ring-1 ring-white/[0.08] transition-shadow duration-300 hover:ring-white/20 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] bg-[#101014]"
            >
              <PlaylistCover playlist={pl} songs={songs} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.16), transparent 40%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight drop-shadow-lg truncate">{pl.name}</h3>
                <p className="text-white/70 text-[11px] leading-snug mt-0.5 truncate">{(pl.song_ids || []).length} {(pl.song_ids || []).length === 1 ? 'música' : 'músicas'}</p>
              </div>
              <div
                className="absolute bottom-3.5 right-3.5 w-11 h-11 btn-green flex items-center justify-center opacity-0 translate-y-3 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); playPlaylist(pl); }}
                role="button"
              >
                <Play className="w-5 h-5 text-black fill-black ml-0.5" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}
