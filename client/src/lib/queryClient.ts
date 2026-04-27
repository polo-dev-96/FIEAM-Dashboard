/*
 * ============================================================
 * queryClient.ts — Configuração do cliente de requisições HTTP
 * ============================================================
 *
 * Este arquivo configura o "TanStack Query" (também chamado React Query),
 * que é a biblioteca responsável por buscar dados do servidor,
 * fazer cache (guardar em memória) e atualizar automaticamente.
 *
 * Pense nele como o "gerente de pedidos" da aplicação:
 * sempre que uma tela precisa de dados do banco, ela pede
 * ao queryClient, que decide se busca dados novos ou usa o cache.
 * ============================================================
 */

// QueryClient: classe principal do React Query que gerencia o cache e as requisições
import { QueryClient } from "@tanstack/react-query";

/*
 * queryClient — instância global do gerenciador de requisições
 * -------------------------------------------------------
 * Configurações padrão aplicadas a TODAS as buscas de dados:
 *
 *   staleTime: 30 * 1000
 *     → Os dados ficam "frescos" por 30 segundos.
 *       Dentro desse tempo, o React Query usa o cache sem ir ao servidor.
 *       Após 30s, na próxima vez que a tela precisar dos dados, ele rebusca.
 *
 *   retry: 2
 *     → Se uma requisição falhar (ex: servidor fora do ar), tenta mais 2 vezes
 *       antes de exibir erro ao usuário.
 *
 *   refetchOnWindowFocus: true
 *     → Quando o usuário muda de aba e volta para o dashboard,
 *       os dados são automaticamente atualizados.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos de cache "fresco"
      retry: 2,             // tenta 2 vezes em caso de erro
      refetchOnWindowFocus: true, // atualiza ao voltar para a aba
    },
  },
});

/*
 * apiRequest (url, options?) — Função para fazer chamadas à API do servidor
 * -------------------------------------------------------
 * Usada internamente para buscar dados do backend (Express/Node.js).
 *
 * Parâmetros:
 *   url     → endereço da rota da API. Ex: "/api/stats", "/api/casas"
 *   options → configurações opcionais da requisição HTTP (método, body, etc.)
 *             Exemplo: { method: "POST", body: JSON.stringify({ email, senha }) }
 *
 * Funcionamento:
 *   1. Faz a chamada HTTP com fetch() (função nativa do navegador)
 *   2. Inclui o header "Content-Type: application/json" para indicar
 *      que estamos enviando/esperando dados no formato JSON
 *   3. Se o servidor responder com erro (status 4xx ou 5xx),
 *      lança um erro com a descrição para o React Query tratar
 *   4. Se der tudo certo, retorna o JSON da resposta já convertido para objeto JS
 *
 * Exemplo de uso:
 *   const dados = await apiRequest("/api/stats?entidade=SENAI")
 *   → retorna o objeto de estatísticas do servidor
 */
export async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json", // indica formato JSON
    },
    ...options, // mescla qualquer opção extra que for passada
  });

  // Se o status HTTP não for 2xx (sucesso), lança erro com detalhes
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  // Converte o corpo da resposta de texto JSON para objeto JavaScript
  return response.json();
}
