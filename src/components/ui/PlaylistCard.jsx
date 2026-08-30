import React from 'react';
import { Play, Music2, ListMusic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TiltCard from '@/components/fx/TiltCard';
import Reveal from '@/components/fx/Reveal';

/**
 * Card de playlist com profundidade real.
 *
 * O card inclina seguindo o ponteiro (TiltCard) e o mosaico de capas fica
 * numa camada Z acima da base, então ele se destaca do card enquanto gira —
 * é o que dá a leitura de objeto físico em vez de imagem plana. O botão de
 * tocar sai da superfície ainda mais para a frente.
 */
export default function PlaylistCard({ playlist, onPlay, index, songs = [] }) {
  const ids = playlist.song_ids || [];
  const playlistSongs = songs.filter((s) => ids.includes(s.id)).slice(0, 4);
  const covers = playlistSongs.map((s) => s.cover_url).filter(Boolean);

  const renderCovers = () => {
    if (covers.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
          <ListMusic className="w-10 h-10 text-velvet-faint" />
        </div>
      );
    }
    if (covers.length === 1) {
      return <img src={covers[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />;
    }
    if (covers.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-[2px] w-full h-full">
          <img src={covers[0]} alt="" loading="lazy" className="col-span-2 w-full h-full object-cover" />
          <img src={covers[1]} alt="" loading="lazy" className="w-full h-full object-cover" />
          <img src={covers[2]} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
      );
    }
    return (
      <div className={`grid ${covers.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'} gap-[2px] w-full h-full`}>
        {covers.slice(0, 4).map((cover, i) => (
          <img key={i} src={cover} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ))}
      </div>
    );
  };

  return (
    <Reveal delay={Math.min(index, 12) * 35}>
      <TiltCard max={8} scale={1.03} className="h-full">
        <Link
          to={`${createPageUrl('Playlist')}?id=${playlist.id}`}
          className="group block h-full rounded-2xl v-specular focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60"
          aria-label={`Playlist ${playlist.name}`}
        >
          <div
            className="v-3d h-full rounded-2xl p-3.5 transition-all duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Mosaico, empurrado para a frente na cena */}
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 v-layer-1 shadow-[0_18px_36px_-20px_rgba(0,0,0,1)]">
              <div className="w-full h-full transition-transform duration-500 group-hover:scale-[1.06]">
                {renderCovers()}
              </div>

              {/* Verniz metálico no hover */}
              <span
                aria-hidden="true"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'linear-gradient(148deg, rgba(255,255,255,0.28), transparent 46%)' }}
              />

              {/* Tocar — a camada mais à frente */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(playlist); }}
                aria-label={`Tocar playlist ${playlist.name}`}
                className="btn-green absolute bottom-2.5 right-2.5 w-11 h-11 flex items-center justify-center v-layer-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 transition-all duration-300"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>

            <h3 className="font-semibold text-sm text-velvet-text truncate mb-0.5 v-layer-1">
              {playlist.name}
            </h3>
            <p className="text-xs text-velvet-faint truncate v-layer-1 flex items-center gap-1.5">
              <Music2 className="w-3 h-3 shrink-0" />
              {playlist.description || `${ids.length} ${ids.length === 1 ? 'música' : 'músicas'}`}
            </p>
          </div>
        </Link>
      </TiltCard>
    </Reveal>
  );
}
