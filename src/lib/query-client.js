import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente de dados.
 *
 * O app tinha 22 consultas com refetchInterval: 3000 — na Home, quatro
 * delas ao mesmo tempo, uma buscando 200 usuários. Isso é ~80 requisições
 * por minuto por aba aberta, para sempre. A 15s a interface continua
 * "ao vivo" (ninguém percebe a diferença numa lista de músicas) com um
 * quinto do tráfego, e voltar para a aba já força uma atualização
 * imediata, então o dado nunca aparece velho para quem está olhando.
 */
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Voltar para a aba revalida — é o que substitui a pesquisa
			// agressiva de 3 em 3 segundos.
			refetchOnWindowFocus: true,
			// react-query já pausa o intervalo com a aba em segundo plano;
			// deixamos explícito para não depender do padrão.
			refetchIntervalInBackground: false,
			staleTime: 10_000,
			gcTime: 5 * 60_000,
			retry: 1,
		},
	},
});
