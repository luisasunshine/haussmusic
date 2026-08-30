import React, { useRef, useCallback } from 'react';

/**
 * Card com inclinação 3D real.
 *
 * O ponteiro roda o elemento nos eixos X/Y dentro de uma cena com
 * perspectiva, e a mesma posição alimenta as variáveis --v-mx/--v-my que a
 * classe .v-specular usa para o brilho. Como o reflexo nasce de onde o
 * cursor está, o metal parece metal em vez de um gradiente parado.
 *
 * Tudo é escrito direto no style do nó — nenhum estado React, nenhum
 * re-render enquanto o mouse anda.
 */
export default function TiltCard({
  children,
  className = '',
  max = 9,              // graus máximos de inclinação
  scale = 1.02,
  glare = true,
  disabled = false,
  as: Tag = 'div',
  ...rest
}) {
  const outer = useRef(null);
  const inner = useRef(null);
  const frame = useRef(null);

  const apply = useCallback((e) => {
    if (disabled || !outer.current || !inner.current) return;
    const el = outer.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rx = (0.5 - py) * max * 2;
      const ry = (px - 0.5) * max * 2;
      inner.current.style.transform =
        `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`;
      if (glare) {
        el.style.setProperty('--v-mx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--v-my', `${(py * 100).toFixed(1)}%`);
      }
    });
  }, [disabled, max, scale, glare]);

  const reset = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (inner.current) {
      inner.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    }
    if (outer.current) {
      outer.current.style.setProperty('--v-mx', '50%');
      outer.current.style.setProperty('--v-my', '50%');
    }
  }, []);

  return (
    <Tag
      ref={outer}
      onMouseMove={apply}
      onMouseLeave={reset}
      className={`v-scene ${className}`}
      {...rest}
    >
      <div
        ref={inner}
        className="v-3d h-full w-full"
        style={{ transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {children}
      </div>
    </Tag>
  );
}
