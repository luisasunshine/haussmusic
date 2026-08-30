import { useEffect, useRef, useState } from 'react';
import { subscribeLevels } from '@/lib/audioBus';

/**
 * Nível de áudio como estado React, propositalmente limitado a ~20 quadros
 * por segundo. Renderizar a 60fps travaria a árvore inteira; para brilho e
 * escala, 20 é indistinguível. Quem precisa dos 60 completos (canvas,
 * three.js) usa subscribeLevels direto e escreve fora do React.
 */
export function useAudioLevel(fps = 20) {
  const [level, setLevel] = useState(0);
  const last = useRef(0);
  const interval = 1000 / fps;

  useEffect(() => {
    return subscribeLevels((s) => {
      const now = performance.now();
      if (now - last.current < interval) return;
      last.current = now;
      // Só re-renderiza quando o valor muda de forma perceptível.
      setLevel((prev) => (Math.abs(prev - s.level) > 0.012 ? s.level : prev));
    });
  }, [interval]);

  return level;
}

/**
 * Assinatura imperativa: recebe cada quadro sem causar render.
 * `onFrame` precisa ser estável (useCallback) ou vir de um ref.
 */
export function useAudioFrame(onFrame, enabled = true) {
  const cb = useRef(onFrame);
  useEffect(() => { cb.current = onFrame; }, [onFrame]);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeLevels((s) => cb.current?.(s));
  }, [enabled]);
}

export default useAudioLevel;
