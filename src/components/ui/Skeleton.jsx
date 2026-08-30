import { cn } from "@/lib/utils"

/**
 * Espaço reservado durante o carregamento.
 *
 * Trocamos o `animate-pulse` (que só pisca a opacidade) por um brilho que
 * varre a superfície da esquerda para a direita — lê como "carregando"
 * em vez de "quebrado", e combina com o metal do resto da interface.
 */
function Skeleton({ className, ...props }) {
  return <div className={cn("skeleton", className)} {...props} />;
}

export { Skeleton }
