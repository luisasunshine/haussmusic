import React from 'react';

/**
 * Halo de LED atrás de um botão ligado (crossfade, repetir, aleatório,
 * curtir). Antes pulsava sozinho num loop do framer-motion; agora respira
 * junto com a música, lendo --v-level direto do CSS — sem estado, sem
 * re-render, e em fase com o visualizador e o vinil.
 *
 * O botão que o contém precisa de `relative`; o ícone, de `relative z-10`.
 */
export default function ActiveGlow({ rounded = 'rounded-full', tone = 'rgba(216,216,226,' }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 ${rounded} pointer-events-none`}
      style={{
        background: `${tone}0.85)`,
        filter: 'blur(9px)',
        opacity: 'calc(0.32 + var(--v-level) * 0.55)',
        transform: 'scale(calc(0.92 + var(--v-level) * 0.18))',
        transition: 'opacity 90ms linear, transform 90ms linear',
      }}
    />
  );
}
