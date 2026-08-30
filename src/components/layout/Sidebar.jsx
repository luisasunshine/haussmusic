import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, Search, Library, Music2, Star, Shield, Award, LogIn, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { hasUserType } from '@/lib/utils';

/**
 * Trilho lateral cromado.
 *
 * Fica estreito (só ícones) e se abre ao passar o mouse, revelando os
 * rótulos — antes eles viviam espremidos em 9px sob cada ícone, ilegíveis.
 * O indicador ativo é uma única barra de prata que desliza entre os itens
 * (layoutId do framer-motion), então trocar de página é um movimento
 * contínuo em vez de um pisca-pisca.
 */

const RAIL = 88;
const OPEN = 244;

function NavItem({ item, active, expanded }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className="w-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60 rounded-2xl"
      aria-current={active ? 'page' : undefined}
      title={expanded ? undefined : item.label}
    >
      <motion.div
        whileHover={{ x: expanded ? 3 : 0, scale: expanded ? 1 : 1.06 }}
        whileTap={{ scale: 0.96 }}
        className={`group/nav relative rounded-2xl transition-colors duration-200 ${
          expanded
            ? 'flex items-center gap-3 px-4 py-3'
            : 'flex flex-col items-center justify-center gap-1.5 px-0.5 py-2.5'
        } ${active ? 'text-velvet-text' : 'text-velvet-dim hover:text-velvet-text'}`}
      >
        {/* Barra ativa: uma só no documento inteiro, deslizando. */}
        {active && (
          <motion.span
            layoutId="velvet-nav-active"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(100deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px -14px rgba(216,216,226,0.6)',
            }}
          />
        )}

        {active && (
          <motion.span
            layoutId="velvet-nav-bar"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
            style={{ background: 'linear-gradient(180deg,#ffffff,#9a9aa8)', boxShadow: '0 0 12px rgba(216,216,226,0.9)' }}
          />
        )}

        <item.icon
          className="relative z-10 w-[22px] h-[22px] shrink-0 transition-transform duration-200 group-hover/nav:scale-110"
          strokeWidth={active ? 2.3 : 1.7}
          style={active ? { filter: 'drop-shadow(0 0 8px rgba(216,216,226,0.75))' } : undefined}
        />

        <span
          className="relative z-10 text-sm font-medium whitespace-nowrap transition-[opacity,transform] duration-200"
          style={{
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'none' : 'translateX(-6px)',
            pointerEvents: expanded ? undefined : 'none',
          }}
        >
          {item.label}
        </span>

        {/* Legenda do trilho fechado: curta o bastante para caber em 76px. */}
        {!expanded && (
          <span className="relative z-10 text-[9.5px] font-semibold leading-none tracking-tight text-center w-full px-0.5 truncate">
            {item.short || item.label}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

export default function Sidebar({ currentPage }) {
  const { user, isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const logoUrl = appSettings.find((s) => s.key === 'logo_url')?.value || '/logo.png';

  const isActive = (page) => currentPage === page;

  const primary = [
    { icon: Home, label: 'Início', page: 'Home' },
    { icon: Search, label: 'Buscar', page: 'Search' },
    { icon: Library, label: 'Biblioteca', short: 'Acervo', page: 'Library' },
  ];

  const discover = [
    { icon: Star, label: 'VELVET HITS', short: 'Hits', page: 'Rankings' },
    { icon: Music2, label: 'Artistas', page: 'Artists' },
  ];

  const studio = [
    ...(hasUserType(user, 'artista') || hasUserType(user, 'staff') || user?.role === 'admin'
      ? [{ icon: Award, label: 'Painel do artista', short: 'Painel', page: 'ArtistDashboard' }] : []),
    ...(hasUserType(user, 'gravadora') || user?.role === 'admin'
      ? [{ icon: Music2, label: 'Gravadora', short: 'Selo', page: 'LabelDashboard' }] : []),
    ...(hasUserType(user, 'podcast') || user?.role === 'admin'
      ? [{ icon: Mic, label: 'Podcast', page: 'PodcastDashboard' }] : []),
    ...(user?.role === 'admin'
      ? [{ icon: Shield, label: 'Administração', short: 'Admin', page: 'AdminDashboard' }] : []),
  ];

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false);
      }}
      initial={false}
      animate={{ width: expanded ? OPEN : RAIL }}
      transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      className="hidden lg:flex flex-col h-screen shrink-0 relative z-40 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(14,14,18,0.96) 0%, rgba(6,6,8,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '1px 0 0 rgba(255,255,255,0.03), 12px 0 40px -30px rgba(0,0,0,1)',
      }}
      aria-label="Navegação principal"
    >
      {/* Fio de prata correndo pela borda direita */}
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.28) 22%, rgba(255,255,255,0.10) 55%, transparent)' }}
      />

      {/* Logo */}
      <div className="flex items-center h-[76px] px-5 shrink-0 border-b border-white/[0.06]">
        <Link
          to={createPageUrl('Home')}
          className="flex items-center gap-3 min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60"
          aria-label="VELVET MUSIC — início"
        >
          <motion.img
            src={logoUrl}
            alt=""
            width={44}
            height={44}
            whileHover={{ rotate: -4, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="w-11 h-11 object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 2px 10px rgba(216,216,226,0.35))' }}
          />
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="v-chrome-text v-display text-lg font-bold tracking-wide whitespace-nowrap"
              >
                VELVET
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 pt-4 overflow-y-auto scrollbar-hide">
        {primary.map((item) => (
          <NavItem key={item.page} item={item} active={isActive(item.page)} expanded={expanded} />
        ))}

        <div className="v-rule my-3 mx-2" />

        {discover.map((item) => (
          <NavItem key={item.page} item={item} active={isActive(item.page)} expanded={expanded} />
        ))}

        {studio.length > 0 && (
          <>
            <div className="v-rule my-3 mx-2" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-velvet-faint"
                >
                  Estúdio
                </motion.p>
              )}
            </AnimatePresence>
            {studio.map((item) => (
              <NavItem key={item.page} item={item} active={isActive(item.page)} expanded={expanded} />
            ))}
          </>
        )}

        {!isAuthenticated && (
          <div className="mt-auto pb-2">
            <NavItem
              item={{ icon: LogIn, label: 'Entrar', page: 'AuthPage' }}
              active={isActive('AuthPage')}
              expanded={expanded}
            />
          </div>
        )}
      </nav>

      {/* Espaço para o mini player não cobrir o último item */}
      <div className="h-24 shrink-0" />
    </motion.aside>
  );
}
