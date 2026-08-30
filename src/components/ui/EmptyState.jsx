import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Estado vazio.
 *
 * Antes cada lista vazia mostrava uma linha de texto cinza centralizada,
 * que lê como falha ("Nenhuma música encontrada") em vez de convite. Aqui a
 * ausência ganha forma: um ícone em moldura metálica, uma frase que diz o
 * que fazer a seguir e, quando existe, o botão que faz.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,        // { label, to } ou { label, onClick }
  compact = false,
  className = '',
}) {
  const Button = () => {
    if (!action?.label) return null;
    const cls = 'btn-green h-11 px-6 inline-flex items-center gap-2 mt-6';
    if (action.to) return <Link to={action.to} className={cls}>{action.label}</Link>;
    return <button type="button" onClick={action.onClick} className={cls}>{action.label}</button>;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-3xl ${
        compact ? 'py-10 px-6' : 'py-16 px-8'
      } ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008))',
        border: '1px dashed rgba(255,255,255,0.10)',
      }}
    >
      {Icon && (
        <span
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
          }}
        >
          <Icon className="w-6 h-6 text-velvet-steel" />
        </span>
      )}

      <p className="text-velvet-text font-semibold text-base">{title}</p>
      {description && (
        <p className="text-velvet-dim text-sm mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      <Button />
    </div>
  );
}
