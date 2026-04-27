/*
 * ============================================================
 * components/layout/SidebarContext.tsx — Contexto do estado da Sidebar
 * ============================================================
 *
 * Gerencia se a barra lateral está expandida ou colapsada.
 * Persiste essa preferência no localStorage para que seja lembrada
 * entre sessões (ao fechar e reabrir o navegador).
 *
 * Padrão idêntico ao ThemeContext, mas mais simples:
 *   - collapsed: boolean (true = recolhida, false = expandida)
 *   - toggle(): alterna entre os dois estados
 *
 * Usado por:
 *   - Layout.tsx → usa collapsed para ajustar a margem-esquerda do conteúdo
 *   - Sidebar.tsx → usa collapsed para mostrar versão compacta ou expandida
 * ============================================================
 */

// createContext: cria um contexto React (objeto compartilhável entre componentes)
// useContext: hook para consumir um contexto dentro de um componente
// useState: hook para estado local (collapsed = true/false)
// useEffect: hook para executar efeitos colaterais (salvar no localStorage)
import { createContext, useContext, useState, useEffect } from "react";

/*
 * SidebarContextType — Shape (formato) do objeto compartilhado pelo contexto
 *   collapsed → se a sidebar está recolhida (true) ou expandida (false)
 *   toggle    → função para alternar o estado
 */
interface SidebarContextType {
    collapsed: boolean;
    toggle: () => void;
}

/*
 * SidebarContext — O objeto de contexto criado
 * O segundo argumento é o valor padrão (quando não há Provider acima na árvore)
 * collapsed: false → expandida por padrão
 */
const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    toggle: () => { }, // função vazia como fallback
});

/*
 * SidebarProvider — Provedor do contexto
 * -------------------------------------------------------
 * Inicializa o estado collapsed lendo o localStorage.
 * Isso garante que a preferência do usuário é restaurada ao recarregar.
 *
 * A função passada para useState(() => ...) é chamada "initializer function"
 * — executa apenas uma vez na montagem para calcular o valor inicial.
 *
 * useEffect salva no localStorage toda vez que collapsed muda.
 * O array [collapsed] é a "dependency list" — o efeito re-executa
 * somente quando collapsed muda de valor.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            // Lê a preferência salva: "true" → colapsada, "false"/null → expandida
            return localStorage.getItem("sidebar-collapsed") === "true";
        } catch {
            return false; // fallback se localStorage não estiver disponível
        }
    });

    // Persiste a preferência no localStorage sempre que o estado mudar
    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    // toggle: inverte o valor atual (prev é o valor antes da mudança)
    const toggle = () => setCollapsed((prev) => !prev);

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

/*
 * useSidebar — Hook customizado para consumir o SidebarContext
 * -------------------------------------------------------
 * Atalho para useContext(SidebarContext).
 * Uso: const { collapsed, toggle } = useSidebar();
 */
export const useSidebar = () => useContext(SidebarContext);
