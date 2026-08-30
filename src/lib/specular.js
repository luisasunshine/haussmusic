/**
 * Rastreador de brilho e inclinação — um só para o app inteiro.
 *
 * Em vez de dar um onMouseMove a cada card (dezenas de handlers React e um
 * getBoundingClientRect por movimento), há UM listener delegado no
 * documento. Ele descobre qual superfície está sob o ponteiro, mede-a uma
 * vez por entrada e depois só escreve variáveis CSS:
 *
 *   --v-mx / --v-my    posição do cursor dentro do elemento (para o reflexo)
 *   --v-rx / --v-ry    graus de rotação (para a inclinação 3D)
 *
 * Nada disso passa pelo React, então mover o mouse não renderiza nada.
 * Em telas de toque e com "movimento reduzido" ligado, o rastreador nem
 * chega a se registrar.
 */

const SELECTOR = '.card-spotify, .v-specular, [data-specular]';
const MAX_TILT = 7;

export function initSpecularTracker() {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  // Sem ponteiro fino (celular/tablet) não há hover para acompanhar.
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return () => {};

  let current = null;
  let rect = null;
  let frame = null;
  let pending = null;

  const clear = (el) => {
    if (!el) return;
    el.style.removeProperty('--v-mx');
    el.style.removeProperty('--v-my');
    el.style.removeProperty('--v-rx');
    el.style.removeProperty('--v-ry');
  };

  const write = () => {
    frame = null;
    if (!current || !rect || !pending) return;
    const px = (pending.x - rect.left) / rect.width;
    const py = (pending.y - rect.top) / rect.height;
    current.style.setProperty('--v-mx', `${(px * 100).toFixed(1)}%`);
    current.style.setProperty('--v-my', `${(py * 100).toFixed(1)}%`);
    current.style.setProperty('--v-rx', `${((0.5 - py) * MAX_TILT * 2).toFixed(2)}deg`);
    current.style.setProperty('--v-ry', `${((px - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
  };

  const onMove = (e) => {
    const hit = e.target instanceof Element ? e.target.closest(SELECTOR) : null;

    if (hit !== current) {
      clear(current);
      current = hit;
      // Uma medição por elemento, não uma por movimento do mouse.
      rect = hit ? hit.getBoundingClientRect() : null;
    }
    if (!current) return;

    pending = { x: e.clientX, y: e.clientY };
    if (frame == null) frame = requestAnimationFrame(write);
  };

  const onLeave = () => { clear(current); current = null; rect = null; };

  // O retângulo medido fica velho quando a página rola ou muda de tamanho.
  const invalidate = () => { if (current) rect = current.getBoundingClientRect(); };

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave, { passive: true });
  window.addEventListener('scroll', invalidate, { passive: true, capture: true });
  window.addEventListener('resize', invalidate, { passive: true });

  return () => {
    if (frame) cancelAnimationFrame(frame);
    clear(current);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', invalidate, { capture: true });
    window.removeEventListener('resize', invalidate);
  };
}

export default initSpecularTracker;
