/*
 * ============================================================
 * AuthContext.tsx — Sistema de Autenticação e Controle de Acesso
 * ============================================================
 *
 * Este arquivo gerencia QUEM está logado no sistema e o que
 * cada tipo de usuário pode ou não acessar.
 *
 * Responsabilidades:
 *   1. Guardar o token JWT (prova de que o usuário está autenticado)
 *   2. Guardar os dados do usuário logado (email, nível de acesso)
 *   3. Controlar quais páginas/rotas cada nível pode visitar
 *   4. Fornecer funções de login e logout
 *
 * Assim como ThemeContext, usa o padrão React Context para
 * disponibilizar esses dados a qualquer componente da aplicação.
 * ============================================================
 */

import { createContext, useContext, useState, useCallback } from "react";

/*
 * NivelAcesso — Os 5 tipos de usuário do sistema
 * -------------------------------------------------------
 *   master      → Acesso total (administrador principal)
 *   admin       → Acesso completo exceto páginas exclusivas do master
 *   gerente     → Igual ao admin (por enquanto tem as mesmas permissões)
 *   visualizador → Só pode ver a Visão Geral e o Dashboard Anual
 *   entidade    → Igual ao visualizador (usuário de uma entidade específica)
 */
export type NivelAcesso = "master" | "admin" | "gerente" | "visualizador" | "entidade";

/*
 * UserInfo — Estrutura dos dados do usuário logado
 * -------------------------------------------------------
 *   id                → identificador único no banco de dados
 *   email             → e-mail de login
 *   nivel_acesso      → qual dos 5 níveis esse usuário tem
 *   rotas_permitidas  → lista de rotas individuais (sobrescreve ALLOWED_ROUTES)
 *                       null = usa as regras padrão do nivel_acesso
 */
export interface UserInfo {
  id: number;
  email: string;
  nivel_acesso: NivelAcesso;
  rotas_permitidas?: string[] | null;
}

/*
 * ADMIN_MASTER_EMAIL — Email do administrador master do sistema
 * Usuário que pode criar, deletar e editar permissões de outros usuários.
 */
export const ADMIN_MASTER_EMAIL = "admin@polotelecom.com.br";

/*
 * isAdminMaster() — Verifica se o usuário logado é o admin master
 * Lida diretamente com localStorage para poder ser chamada fora de componentes React.
 */
export function isAdminMaster(): boolean {
  try {
    const stored = localStorage.getItem("auth_user");
    if (!stored) return false;
    const user: UserInfo = JSON.parse(stored);
    return user.email === ADMIN_MASTER_EMAIL;
  } catch {
    return false;
  }
}

/*
 * ALLOWED_ROUTES — Mapa de permissões por nível de acesso
 * -------------------------------------------------------
 * Define quais rotas (páginas) cada nível pode acessar.
 * Se uma rota não está nessa lista, o usuário é redirecionado
 * automaticamente (lógica em App.tsx).
 *
 *   "/"            → Visão Geral (Overview)
 *   "/protocolo"   → Busca por Protocolo
 *   "/telefone"    → Busca por Telefone
 *   "/anual"       → Dashboard Anual
 *   "/openai"      → Dashboard OpenAI (exclusivo master)
 *   "/patrocinados"→ Dashboard Patrocinados (master + Ariana)
 */
const ALLOWED_ROUTES: Record<NivelAcesso, string[]> = {
  master:      ["/", "/protocolo", "/telefone", "/anual", "/openai", "/patrocinados"],
  admin:       ["/", "/protocolo", "/telefone", "/anual"],
  gerente:     ["/", "/protocolo", "/telefone", "/anual"],
  visualizador:["/", "/anual"],
  entidade:    ["/", "/anual"],
};

/*
 * AuthContextType — O "contrato" do contexto de autenticação
 * -------------------------------------------------------
 * Define tudo que o contexto disponibiliza:
 *   isAuthenticated → true se há token E usuário válidos
 *   token           → string JWT recebida no login (ou null)
 *   user            → objeto com dados do usuário (ou null)
 *   allowedRoutes   → lista de rotas que esse usuário pode visitar
 *   login()         → função para salvar token+usuário após autenticar
 *   logout()        → função para apagar tudo e deslogar
 *   canAccess()     → função que retorna true/false para uma rota específica
 */
interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
  allowedRoutes: string[];
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  canAccess: (route: string) => boolean;
}

// Valores padrão do contexto (usados apenas se consumido fora do AuthProvider)
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  user: null,
  allowedRoutes: [],
  login: () => {},
  logout: () => {},
  canAccess: () => false,
});

/*
 * AuthProvider — Componente que envolve a aplicação e fornece autenticação
 * -------------------------------------------------------
 * Colocado em App.tsx ao redor de todos os componentes.
 * Mantém o estado de autenticação e persiste no localStorage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  /*
   * token: string JWT salvo no localStorage.
   * É gerado pelo servidor no login e enviado em cada requisição
   * para provar que o usuário está autenticado.
   * useState com função lê o valor salvo ao inicializar.
   */
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("auth_token");
    } catch {
      return null;
    }
  });

  /*
   * user: dados do usuário logado (id, email, nivel_acesso).
   * Salvo em localStorage como JSON para persistir entre recarregamentos.
   * JSON.parse converte o texto salvo de volta para objeto JavaScript.
   */
  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Calcula as rotas permitidas com base no nível do usuário logado
  // Se não há usuário, retorna lista vazia (nenhum acesso)
  const allowedRoutes = user ? (ALLOWED_ROUTES[user.nivel_acesso] || []) : [];

  /*
   * login(newToken, newUser) — Salva a sessão do usuário
   * -------------------------------------------------------
   * Chamada após o servidor confirmar usuário e senha.
   * Salva token e dados do usuário no localStorage E no estado React.
   */
  const login = useCallback((newToken: string, newUser: UserInfo) => {
    localStorage.setItem("auth_token", newToken);              // persiste token
    localStorage.setItem("auth_user", JSON.stringify(newUser)); // persiste usuário como JSON
    setToken(newToken); // atualiza estado → re-renderiza componentes
    setUser(newUser);
  }, []);

  /*
   * logout() — Encerra a sessão completamente
   * -------------------------------------------------------
   * Remove token e dados do localStorage e zera o estado React.
   * O App.tsx detecta isAuthenticated=false e redireciona para /login.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }, []);

  /*
   * canAccess(route) — Verifica se o usuário pode acessar uma rota
   * -------------------------------------------------------
   * Prioridade:
   *   1. Se user.rotas_permitidas existir (não-null), usa ESSE array
   *   2. Caso contrário, usa ALLOWED_ROUTES[nivel_acesso] (regras padrão por papel)
   *
   * Regra especial: /patrocinados também é liberado para usuária "Ariana".
   * Regra especial: /admin/usuarios é exclusivo do admin master (email fixo).
   */
  const canAccess = useCallback(
    (route: string) => {
      if (!user) return false;

      // /admin/usuarios: exclusivo do admin master, nunca atribuível a outros
      if (route === "/admin/usuarios") return user.email === ADMIN_MASTER_EMAIL;

      // Se o usuário tem permissões individuais definidas, usa elas
      if (user.rotas_permitidas != null) {
        return user.rotas_permitidas.includes(route);
      }

      // Sem permissões individuais: usa as regras padrão do papel
      const routes = ALLOWED_ROUTES[user.nivel_acesso] || [];
      if (routes.includes(route)) return true;

      // Acesso especial: /patrocinados também para Ariana
      if (route === "/patrocinados" && user.email?.toLowerCase().includes("ariana")) return true;

      return false;
    },
    [user]
  );

  // Disponibiliza todos os valores para os componentes filhos
  // !!token && !!user → converte para boolean: true só se AMBOS existem
  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token && !!user, token, user, allowedRoutes, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

/*
 * useAuth — Hook para consumir o contexto de autenticação
 * -------------------------------------------------------
 * Uso em qualquer componente:
 *   const { user, isAuthenticated, logout } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);
