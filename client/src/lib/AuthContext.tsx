import { createContext, useContext, useState, useCallback } from "react";

export type NivelAcesso = "master" | "admin" | "gerente" | "visualizador" | "entidade";

export interface UserInfo {
  id: number;
  email: string;
  nivel_acesso: NivelAcesso;
}

// Rotas permitidas por nível de acesso
const ALLOWED_ROUTES: Record<NivelAcesso, string[]> = {
  master: ["/", "/protocolo", "/telefone", "/anual", "/openai", "/patrocinados"],
  admin: ["/", "/protocolo", "/telefone", "/anual"],
  gerente: ["/", "/protocolo", "/telefone", "/anual"],
  visualizador: ["/", "/anual"],
  entidade: ["/", "/anual"],
};

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
  allowedRoutes: string[];
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  canAccess: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  user: null,
  allowedRoutes: [],
  login: () => {},
  logout: () => {},
  canAccess: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("auth_token");
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const allowedRoutes = user ? (ALLOWED_ROUTES[user.nivel_acesso] || []) : [];

  const login = useCallback((newToken: string, newUser: UserInfo) => {
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }, []);

  const canAccess = useCallback(
    (route: string) => {
      if (!user) return false;
      const routes = ALLOWED_ROUTES[user.nivel_acesso] || [];
      if (routes.includes(route)) return true;
      // Acesso especial: /patrocinados também para Ariana
      if (route === "/patrocinados" && user.email?.toLowerCase().includes("ariana")) return true;
      return false;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token && !!user, token, user, allowedRoutes, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
