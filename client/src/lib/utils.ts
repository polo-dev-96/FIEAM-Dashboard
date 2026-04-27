/*
 * ============================================================
 * utils.ts — Funções utilitárias gerais do projeto
 * ============================================================
 *
 * Este arquivo contém pequenas funções de apoio usadas em
 * vários lugares do projeto. Por enquanto tem apenas uma
 * função principal: `cn`, que cuida de classes CSS.
 * ============================================================
 */

// clsx: biblioteca que permite combinar múltiplas classes CSS de forma condicional.
// Exemplo: clsx("text-red", isActive && "font-bold") → "text-red font-bold" (se isActive=true)
import { clsx, type ClassValue } from "clsx"

// twMerge: garante que classes conflitantes do Tailwind CSS sejam resolvidas corretamente.
// Exemplo: twMerge("p-2 p-4") → "p-4"  (fica só a última, evitando conflito)
import { twMerge } from "tailwind-merge"

/*
 * cn (...inputs) — "Class Names"
 * -------------------------------------------------------
 * Função utilitária que une classes CSS de forma inteligente.
 * Usada em praticamente todos os componentes do projeto.
 *
 * Funcionamento:
 *   1. clsx() junta todas as classes recebidas (podendo ser strings, objetos ou arrays)
 *   2. twMerge() resolve conflitos de classes Tailwind (ex: p-2 + p-4 → fica p-4)
 *
 * Exemplo de uso:
 *   cn("text-sm", isAtivo && "font-bold", "text-blue-500")
 *   → Se isAtivo=true:  "text-sm font-bold text-blue-500"
 *   → Se isAtivo=false: "text-sm text-blue-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
