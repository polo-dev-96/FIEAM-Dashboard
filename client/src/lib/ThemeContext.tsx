/*
 * ============================================================
 * ThemeContext.tsx — Controle do tema claro/escuro (Dark/Light Mode)
 * ============================================================
 *
 * Este arquivo cria o sistema de troca de tema do dashboard.
 * Permite que qualquer componente saiba se o tema atual é
 * escuro ou claro, e ofereça um botão para trocar entre eles.
 *
 * O tema escolhido é salvo no localStorage do navegador,
 * então quando o usuário reabrir o sistema, o tema preferido
 * é restaurado automaticamente.
 *
 * Conceito de "Context" no React:
 *   Context é uma forma de compartilhar um valor (aqui, o tema)
 *   com TODOS os componentes da árvore, sem precisar passar
 *   por props manualmente em cada nível.
 * ============================================================
 */

// Importa funções do React:
// - createContext: cria um "canal de comunicação global" entre componentes
// - useContext: permite um componente ler o valor desse canal
// - useState: cria uma variável reativa (quando muda, a tela re-renderiza)
// - useCallback: memoiza funções para evitar recriações desnecessárias
// - useEffect: executa código quando algo muda (aqui: aplica o tema no HTML)
import { createContext, useContext, useState, useCallback, useEffect } from "react";

// Define os dois valores possíveis para o tema
// TypeScript usa "type" para criar tipos personalizados
type Theme = "dark" | "light";

/*
 * ThemeContextType — Define os dados disponíveis pelo contexto de tema
 * -------------------------------------------------------
 *   theme       → string com o tema atual: "dark" ou "light"
 *   isDark      → boolean (true/false) para facilitar checagens: isDark ? cor-escura : cor-clara
 *   toggleTheme → função que troca o tema atual para o oposto
 */
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

/*
 * ThemeContext — O "canal global" de tema
 * -------------------------------------------------------
 * Criado com valores padrão (dark mode).
 * Esses valores são usados APENAS se um componente consumir
 * o contexto fora do ThemeProvider (situação de erro).
 */
const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
});

/*
 * ThemeProvider — Componente que "envolve" a aplicação e fornece o tema
 * -------------------------------------------------------
 * Deve ser colocado ao redor de todos os componentes (feito em App.tsx).
 * Qualquer filho pode então usar useTheme() para acessar os valores.
 *
 * { children } → representa tudo que está dentro desse componente,
 *               ou seja, o resto da aplicação inteira.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /*
   * useState com função inicializadora:
   * A função passada ao useState roda APENAS uma vez, na montagem.
   * Aqui, tentamos ler o tema salvo no localStorage.
   * Se não houver nada salvo (primeira vez), usa "dark" como padrão.
   * O try/catch protege caso o localStorage esteja bloqueado (modo privado, etc.)
   */
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("dashboard-theme") as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  /*
   * useEffect: sempre que o `theme` mudar, aplica o atributo data-theme no
   * elemento raiz do HTML (<html data-theme="dark"> ou <html data-theme="light">).
   * O CSS em index.css usa esse atributo para trocar as cores do design system.
   */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]); // [theme] → só roda quando `theme` mudar

  /*
   * toggleTheme — Alterna entre dark e light
   * -------------------------------------------------------
   * Usa useCallback para memorizar a função e não recriá-la
   * em cada renderização, otimizando performance.
   *
   * Salva o novo tema no localStorage para persistir entre sessões.
   */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"; // inverte o tema
      localStorage.setItem("dashboard-theme", next);  // salva no navegador
      return next;
    });
  }, []); // [] → a função nunca precisa ser recriada

  /*
   * ThemeContext.Provider → "Distribui" os valores do tema para todos os filhos.
   * Qualquer componente dentro dessa árvore pode chamar useTheme() e receber:
   *   - theme: "dark" ou "light"
   *   - isDark: true ou false
   *   - toggleTheme: função para trocar o tema
   */
  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/*
 * useTheme — Hook personalizado para consumir o contexto de tema
 * -------------------------------------------------------
 * Atalho elegante para useContext(ThemeContext).
 *
 * Uso em qualquer componente:
 *   const { isDark, toggleTheme } = useTheme();
 */
export const useTheme = () => useContext(ThemeContext);
