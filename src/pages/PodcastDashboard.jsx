import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, Heart, Eye, Calendar, Edit2, Trash2, Play, Plus, Clock, Radio, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReleaseCreatorPanel from '@/components/releases/ReleaseCreatorPanel';
import { hasUserType } from '@/lib/utils';
import { toast } from 'sonner';

export default function PodcastDashboard() {
  const [user, setUser] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin' && !hasUserType(u, 'podcast')) {
        window.location.href = '/';
      }
      setUser(u);
    }).catch(() => window.location.href = '/');
  }, []);

  const { data: myPodcasts = [] } = useQuery({
    queryKey: ['my-podcasts', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Post.list('-created_date');
      return all.filter(r => r.created_by === user?.email && r.is_podcast);
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: myEpisodes = [] } = useQuery({
    queryKey: ['my-episodes', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Song.list('-created_date');
      return all.filter(s => s.created_by === user?.email && s.is_podcast);
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const totalPlays = myEpisodes.reduce((a, s) => a + (s.plays || 0), 0);
  const totalLikes = myEpisodes.reduce((a, s) => a + (s.likes || 0), 0);

  const deletePodcast = useMutation({
    mutationFn: async (podcastId) => {
      const allSongs = await base44.entities.Song.list();
      const posts = await base44.entities.Post.list();
      const show = posts.find(r => r.id === podcastId);
      if (show) {
        const eps = allSongs.filter(s => s.album === show.title && s.is_podcast);
        await Promise.all(eps.map(ep => base44.entities.Song.delete(ep.id)));
      }
      await base44.entities.Post.delete(podcastId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      queryClient.invalidateQueries({ queryKey: ['my-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Podcast excluído');
    },
  });

  const formatDuration = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c0c0c8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { icon: Headphones, value: myEpisodes.length, label: 'Episódios', bg: 'bg-fuchsia-400/10', text: 'text-fuchsia-300', grad: 'from-fuchsia-400 to-fuchsia-600' },
    { icon: Eye, value: totalPlays, label: 'Reproduções', bg: 'bg-neutral-400/10', text: 'text-neutral-300', grad: 'from-neutral-400 to-neutral-600' },
    { icon: Heart, value: totalLikes, label: 'Curtidas', bg: 'bg-slate-400/10', text: 'text-slate-300', grad: 'from-slate-300 to-slate-500' },
    { icon: Radio, value: myPodcasts.length, label: 'Podcasts', bg: 'bg-zinc-300/10', text: 'text-zinc-200', grad: 'from-zinc-200 to-zinc-400' },
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-[#121212] to-[#c0c0c8]/10" />
        <div className="relative px-6 lg:px-8 pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-2 ring-fuchsia-400/30 shadow-2xl shadow-fuchsia-500/20">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-[#c0c0c8] flex items-center justify-center">
                    <Mic className="w-12 h-12 text-white/70" />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/10 px-3 py-1 rounded-full">Podcast</span>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-1 mt-2">{user.display_name || user.full_name}</h1>
              <p className="text-zinc-400 text-sm md:text-base">Dashboard de Podcast — Publique episódios e acompanhe suas métricas</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Button onClick={() => { setEditing(null); setShowCreator(true); }} className="btn-metal rounded-full px-6 py-6 h-auto text-base font-bold shadow-lg shadow-fuchsia-500/20">
                <Plus className="w-5 h-5 mr-2" /> Novo Podcast
              </Button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }} className={`${stat.bg} rounded-xl border border-white/5 p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.grad} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white">{stat.value.toLocaleString()}</p>
                  <p className={`text-xs ${stat.text}`}>{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 lg:px-8 pt-6">
        <Tabs defaultValue="podcasts" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="podcasts" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-fuchsia-300 data-[state=active]:to-fuchsia-500 data-[state=active]:text-fuchsia-950">
              <Radio className="w-4 h-4 mr-2" /> Podcasts
            </TabsTrigger>
            <TabsTrigger value="episodes" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-fuchsia-300 data-[state=active]:to-fuchsia-500 data-[state=active]:text-fuchsia-950">
              <Headphones className="w-4 h-4 mr-2" /> Episódios
            </TabsTrigger>
          </TabsList>

          {/* Podcasts */}
          <TabsContent value="podcasts" className="mt-6">
            {myPodcasts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {myPodcasts.map((show, index) => (
                  <motion.div
                    key={show.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                    className="group bg-[#181818] rounded-xl overflow-hidden hover:bg-[#282828] transition-all duration-300 cursor-pointer shadow-lg"
                    onClick={() => window.location.href = `/Release?id=${show.id}`}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      {show.cover_url ? (
                        <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-fuchsia-500/40 to-[#c0c0c8]/40 flex items-center justify-center">
                          <Mic className="w-16 h-16 text-white/20" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-fuchsia-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-md">Podcast</span>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditing(show); setShowCreator(true); }} className="p-1.5 bg-black/60 backdrop-blur-sm hover:bg-fuchsia-500 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este podcast?')) deletePodcast.mutate(show.id); }} className="p-1.5 bg-black/60 backdrop-blur-sm hover:bg-red-500 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm truncate">{show.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        {show.release_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(show.release_date).getFullYear()}</span>}
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{show.likes || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{show.plays || 0}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5">
                <div className="w-20 h-20 rounded-full bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-10 h-10 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum podcast ainda</h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">Publique seu primeiro podcast — só áudio, sem vídeo. Adicione episódios e o mundo escuta.</p>
                <Button onClick={() => { setEditing(null); setShowCreator(true); }} className="btn-metal rounded-full">
                  <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Podcast
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Episodes */}
          <TabsContent value="episodes" className="mt-6">
            {myEpisodes.length > 0 ? (
              <div className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
                {myEpisodes.map((ep, index) => (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-[40px_1fr_120px] gap-4 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer group items-center"
                    onClick={() => window.dispatchEvent(new CustomEvent('playSong', { detail: ep }))}
                  >
                    <span className="text-sm text-zinc-500 text-center group-hover:hidden">{index + 1}</span>
                    <Play className="w-4 h-4 text-white hidden group-hover:block mx-auto" />
                    <div className="flex items-center gap-3 min-w-0">
                      {ep.cover_url ? (
                        <img src={ep.cover_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-fuchsia-500/30 to-[#c0c0c8]/30 flex items-center justify-center flex-shrink-0">
                          <Headphones className="w-4 h-4 text-fuchsia-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ep.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{ep.album || ep.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm text-zinc-500">{formatDuration(ep.duration)}</span>
                      <span className="text-xs text-zinc-600">{ep.plays || 0} plays</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5">
                <div className="w-20 h-20 rounded-full bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-10 h-10 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum episódio ainda</h3>
                <p className="text-zinc-400">Seus episódios aparecerão aqui depois de publicar um podcast.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReleaseCreatorPanel
        isOpen={showCreator}
        podcastMode
        onClose={() => { setShowCreator(false); setEditing(null); }}
        releaseToEdit={editing}
        managedArtist={editing ? null : user}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
          queryClient.invalidateQueries({ queryKey: ['my-episodes'] });
        }}
      />
    </div>
  );
}
