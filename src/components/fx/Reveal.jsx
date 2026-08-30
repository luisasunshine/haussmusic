import React, { useEffect, useRef, useState } from 'react';

/**
 * Revela o conteúdo quando ele entra na tela — uma vez só.
 *
 * Usa IntersectionObserver em vez de whileInView do framer-motion porque
 * as páginas mostram dezenas de cards ao mesmo tempo: um observer por nó é
 * barato, um MotionValue por nó não é.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 22,
  className = '',
  as: Tag = 'div',
  once = true,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Sem suporte (ou movimento reduzido): aparece direto.
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translate3d(0, ${y}px, 0)`,
        transition: `opacity 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
