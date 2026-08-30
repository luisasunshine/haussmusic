import React from 'react';

/**
 * Título em cromo polido. O gradiente "quebra" no meio (claro → escuro →
 * claro), que é o que o olho lê como reflexo de metal em vez de degradê.
 */
export default function ChromeText({
  children,
  as: Tag = 'span',
  live = false,
  display = true,
  className = '',
  ...rest
}) {
  return (
    <Tag
      className={[
        'v-chrome-text',
        live ? 'v-chrome-text-live' : '',
        display ? 'v-display' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
