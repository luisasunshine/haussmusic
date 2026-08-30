import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Cabeçalho de seção.
 *
 * Antes cada seção montava o seu à mão, e por isso elas iam divergindo:
 * uma com ícone prata, outra com ícone apagado, títulos ora em cromo ora em
 * branco, contagens em lugares diferentes. Um componente só resolve isso e
 * dá à Home a leitura de lista organizada em vez de blocos soltos.
 *
 * O fio de prata que corre até a borda direita é o que amarra o cabeçalho à
 * grade que vem abaixo — e cobre o vazio quando a seção tem poucos itens.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  count,
  action,        // { label, to } — vira um link "ver tudo"
  className = '',
}) {
  return (
    <div className={`flex items-end gap-4 mb-5 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <Icon className="w-4 h-4 text-velvet-silver" />
            </span>
          )}
          <h2 className="text-xl lg:text-2xl font-bold v-chrome-text truncate">{title}</h2>
          {count > 0 && (
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-velvet-faint px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.07]">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-velvet-dim mt-1 truncate">{subtitle}</p>}
      </div>

      {/* Fio de prata preenchendo até a direita */}
      <div className="flex-1 h-px mb-2 min-w-4 v-rule" />

      {action?.to && (
        <Link
          to={action.to}
          className="shrink-0 mb-1 inline-flex items-center gap-1 text-xs font-semibold text-velvet-dim hover:text-velvet-text transition-colors group/all"
        >
          {action.label || 'Ver tudo'}
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/all:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
