import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListPlus, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PANEL_WIDTH = 224;

// Shared "add song to playlist" dropdown used by SongCard, MiniPlayer,
// ExpandedMobilePlayer and RightSidebar. Rendered through a portal into
// document.body and positioned from the trigger's on-screen rect, so it
// never gets clipped by a scrollable ancestor (every inline copy of this
// menu used to have that problem to some degree).
export default function AddToPlaylistMenu({ songId, buttonClassName, iconClassName = 'w-3.5 h-3.5', align = 'end' }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [coords, setCoords] = useState(null);
  const [user, setUser] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const all = await base44.entities.Playlist.list('-created_date');
      return all.filter((p) => p.created_by === user?.email);
    },
    enabled: !!user && open,
  });

  const toggleSongMutation = useMutation({
    mutationFn: ({ playlist, add }) => {
      const ids = playlist.song_ids || [];
      const nextIds = add ? [...ids, songId] : ids.filter((id) => id !== songId);
      return base44.entities.Playlist.update(playlist.id, { song_ids: nextIds });
    },
    onSuccess: (_result, { playlist, add }) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(add ? `Adicionada a "${playlist.name}"` : `Removida de "${playlist.name}"`);
    },
    onError: () => toast.error('Não foi possível atualizar a playlist'),
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (name) => base44.entities.Playlist.create({ name, description: '', song_ids: [songId], cover_url: '' }),
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(`"${playlist.name}" criada e música adicionada`);
      setNewName('');
      setCreating(false);
      setOpen(false);
    },
    onError: () => toast.error('Não foi possível criar a playlist'),
  });

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = align === 'end'
      ? Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8)
      : rect.left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 280 && rect.top > 280;

    setCoords({
      left: Math.max(8, left),
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
      setCreating(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setOpen(false); setCreating(false); }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || createPlaylistMutation.isPending) return;
    createPlaylistMutation.mutate(name);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={buttonClassName || 'p-1.5 rounded-lg text-[#62626e] hover:text-white hover:bg-[#26262e] transition-colors'}
        title="Adicionar à playlist"
      >
        <ListPlus className={iconClassName} />
      </button>

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left: coords.left, top: coords.top, bottom: coords.bottom, width: PANEL_WIDTH }}
            className="z-[999] bg-[#1c1c22] border border-[#26262e] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-[#26262e]">
              <span className="text-[11px] text-[#9a9aa6] font-medium uppercase tracking-wider">Adicionar à playlist</span>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-[#62626e]" />
                </div>
              ) : playlists.length > 0 ? playlists.map((pl) => {
                const inPlaylist = (pl.song_ids || []).includes(songId);
                return (
                  <button
                    key={pl.id}
                    onClick={() => toggleSongMutation.mutate({ playlist: pl, add: !inPlaylist })}
                    disabled={toggleSongMutation.isPending}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-xs text-white hover:bg-[#26262e] transition-colors disabled:opacity-50"
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${inPlaylist ? 'bg-[#d8d8e2] border-[#d8d8e2]' : 'border-[#62626e]'}`}>
                      {inPlaylist && <Check className="w-3 h-3 text-black" />}
                    </span>
                    <span className="truncate">{pl.name}</span>
                  </button>
                );
              }) : (
                <p className="px-3 py-3 text-xs text-[#62626e] text-center">Nenhuma playlist ainda</p>
              )}
            </div>

            <div className="border-t border-[#26262e] p-2">
              {creating ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') setCreating(false);
                    }}
                    placeholder="Nome da playlist"
                    className="flex-1 min-w-0 bg-[#101014] border border-[#26262e] rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-[#62626e] outline-none focus:border-[#d8d8e2]/50"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createPlaylistMutation.isPending}
                    className="p-1.5 rounded-lg bg-[#d8d8e2] text-black disabled:opacity-40 flex-shrink-0"
                  >
                    {createPlaylistMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-1.5 py-1.5 text-xs text-[#d8d8e2] hover:bg-[#26262e] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova playlist
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
