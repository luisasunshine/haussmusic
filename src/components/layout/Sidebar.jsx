import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

const RAIL = 80;
const OPEN = 280;

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
            ? 'flex items-center gap-3.5 px-4 py-3'
            : 'flex items-center justify-center h-12'
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
          className={`relative z-10 shrink-0 transition-transform duration-200 group-hover/nav:scale-110 ${
            expanded ? 'w-[22px] h-[22px]' : 'w-6 h-6'
          }`}
          strokeWidth={active ? 2.3 : 1.7}
          style={active ? { filter: 'drop-shadow(0 0 8px rgba(216,216,226,0.75))' } : undefined}
        />

        {/* Fechado é só ícone — o nome aparece quando o trilho abre (e no
            title do link, para quem parar o cursor em cima). */}
        {expanded && (
          <span className="relative z-10 text-[15px] font-medium whitespace-nowrap">
            {item.label}
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
  ];

  const studio = [
    ...(hasUserType(user, 'artista') || hasUserType(user, 'staff') || user?.role === 'admin'
      ? [{ icon: Award, label: 'Artistas', page: 'ArtistDashboard' }] : []),
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
      <div className={`flex items-center h-[76px] shrink-0 border-b border-white/[0.06] ${expanded ? "px-5" : "justify-center px-0"}`}>
        <Link
          to={createPageUrl('Home')}
          className="flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/60"
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
        </Link>
      </div>

      <nav className={`flex-1 flex flex-col overflow-y-auto scrollbar-hide pt-4 ${expanded ? "gap-1 px-3" : "gap-1.5 px-3"}`}>
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
            {expanded && (
              <p className="px-4 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-velvet-faint">
                Estúdio
              </p>
            )}
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
