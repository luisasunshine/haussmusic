import React from 'react';
import { motion } from 'framer-motion';

/**
 * Bloco de métrica.
 *
 * Os painéis de artista, gravadora e podcast desenhavam cada um os seus, com
 * gradientes e tamanhos diferentes — o mesmo número aparecia de três jeitos
 * dependendo da página. Este é o único formato: moldura metálica, ícone em
 * caixa de vidro, número em cifra tabular (para colunas de números não
 * dançarem) e rótulo em versalete.
 */
export default function StatTile({
  icon: Icon,
  value,
  label,
  hint,
  delay = 0,
  className = '',
}) {
  const shown = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`v-specular relative rounded-2xl p-4 flex items-center gap-3.5 transition-colors ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {Icon && (
        <span
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <Icon className="w-5 h-5 text-velvet-silver" />
        </span>
      )}

      <div className="min-w-0">
        {/* A key no valor faz o número dar um pulinho quando muda — é como
            a pessoa percebe que a métrica subiu sem precisar comparar. */}
        <motion.p
          key={String(value)}
          initial={{ scale: 1.12, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="text-xl font-bold text-velvet-text tabular-nums leading-none"
        >
          {shown}
        </motion.p>
        <p className="text-[11px] text-velvet-dim mt-1.5 truncate">{label}</p>
        {hint && <p className="text-[10px] text-velvet-faint mt-0.5 truncate">{hint}</p>}
      </div>
    </motion.div>
  );
}
