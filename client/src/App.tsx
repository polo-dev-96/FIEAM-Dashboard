/*
 * ============================================================
 * App.tsx — Componente raiz da aplicação
 * ============================================================
 *
 * Este arquivo é o "esqueleto" da aplicação.
 * É o segundo arquivo executado (logo após main.tsx) e define:
 *
 *   1. Os Providers globais (contextos que envolvem tudo)
 *   2. O sistema de rotas (qual URL mostra qual página)
 *   3. A proteção de rotas (redireciona para login se não autenticado)
 *
 * Estrutura em camadas (de fora para dentro):
 *   QueryClientProvider   → gerencia requisições e cache de dados
 *     TooltipProvider     → permite usar tooltips em qualquer componente
 *       ThemeProvider     → controla tema claro/escuro (ThemeContext.tsx)
 *         AuthProvider    → controla autenticação e permissões (AuthContext.tsx)
 *           AppContent    → decide mostrar login ou o app em si
 *             Router      → define qual página renderizar pela URL
 * ============================================================
 */

// Switch e Route: componentes de roteamento da biblioteca "wouter"
// Switch → renderiza apenas a primeira <Route> que bater com a URL atual
// Route  → associa um caminho (ex: "/anual") a um componente de página
import { Switch, Route } from "wouter";

// queryClient: instância configurada em queryClient.ts para gerenciar requisições
import { queryClient } from "./lib/queryClient";

// QueryClientProvider: "envolve" a aplicação e disponibiliza o queryClient para todos
import { QueryClientProvider } from "@tanstack/react-query";

// Toaster: componente de notificações toast (avisos flutuantes na tela)
import { Toaster } from "@/components/ui/toaster";

// TooltipProvider: necessário para que tooltips funcionem globalmente
import { TooltipProvider } from "@/components/ui/tooltip";

// AuthProvider: provedor de autenticação; useAuth: hook para consumir o contexto
import { AuthProvider, useAuth, isAdminMaster } from "@/lib/AuthContext";

// ThemeProvider: provedor de tema claro/escuro
import { ThemeProvider } from "@/lib/ThemeContext";

// Importa todas as páginas do projeto
import LoginPage from "@/pages/Login";                           // Tela de login
import OverviewPage from "@/pages/Overview";                     // Visão Geral (/)
import SearchProtocolPage from "@/pages/SearchProtocol";         // Busca por Protocolo
import SearchPhonePage from "@/pages/SearchPhone";               // Busca por Telefone
import DashboardAnualPage from "@/pages/DashboardAnual";         // Dashboard Anual
import DashboardOpenAIPage from "@/pages/DashboardOpenAI";       // Dashboard IA (exclusivo)
import DashboardPatrocinadosPage from "@/pages/DashboardPatrocinados"; // Patrocinados
import AdminUsuariosPage from "@/pages/AdminUsuarios";               // Gerenciamento de usuários
import NotFound from "@/pages/not-found";                        // Página 404

/*
 * Router — Define as rotas e aplica controle de acesso
 * -------------------------------------------------------
 * Usa a função canAccess() do AuthContext para decidir se
 * uma rota deve ser registrada ou não.
 *
 * Se o usuário tentar acessar uma URL não registrada,
 * o <Route component={NotFound} /> no final captura e exibe 404.
 *
 * Exemplo para um gerente:
 *   / → Overview ✓
 *   /protocolo → SearchProtocol ✓
 *   /openai → NÃO registrado → cai no NotFound
 */
function Router() {
  const { canAccess } = useAuth(); // obtém a função de verificação de permissão
  return (
    <Switch>
      {/* Rota principal - todos têm acesso */}
      <Route path="/" component={OverviewPage} />

      {/* Rotas condicionais - só registradas se o usuário tem permissão */}
      {canAccess("/protocolo") && <Route path="/protocolo" component={SearchProtocolPage} />}
      {canAccess("/telefone")  && <Route path="/telefone"  component={SearchPhonePage} />}

      {/* Dashboard Anual - acessível por todos os níveis */}
      <Route path="/anual" component={DashboardAnualPage} />

      {/* Rotas exclusivas - apenas master e casos especiais */}
      {canAccess("/openai")       && <Route path="/openai"       component={DashboardOpenAIPage} />}
      {canAccess("/patrocinados") && <Route path="/patrocinados" component={DashboardPatrocinadosPage} />}

      {/* Rota de administração - exclusiva do admin master */}
      {isAdminMaster() && <Route path="/admin/usuarios" component={AdminUsuariosPage} />}

      {/* Fallback: qualquer rota não encontrada exibe página 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

/*
 * AppContent — Decide o que renderizar com base na autenticação
 * -------------------------------------------------------
 * Se o usuário NÃO está autenticado (sem token válido):
 *   → Exibe a tela de Login
 *   → onLogin={login} conecta o formulário à função de login do AuthContext
 *
 * Se o usuário ESTÁ autenticado:
 *   → Exibe as notificações toast (Toaster) e o sistema de rotas (Router)
 *   → O <> </> é um "React Fragment" — agrupa sem criar elemento HTML extra
 */
function AppContent() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />; // passa a função de login para a tela
  }

  return (
    <>
      <Toaster /> {/* Sistema de notificações flutuantes */}
      <Router />  {/* Renderiza a página correta baseada na URL */}
    </>
  );
}

/*
 * App — Componente raiz exportado
 * -------------------------------------------------------
 * Monta todos os Providers em camadas.
 * A ordem importa: Providers internos podem consumir os externos.
 * Exemplo: AuthProvider está dentro de ThemeProvider,
 * então AuthContext poderia usar useTheme() se precisasse.
 *
 * AppContent está dentro de AuthProvider, então pode usar useAuth().
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}> {/* cache de requisições */}
      <TooltipProvider>                         {/* suporte a tooltips */}
        <ThemeProvider>                         {/* tema claro/escuro */}
          <AuthProvider>                        {/* autenticação */}
            <AppContent />                      {/* conteúdo real */}
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Exporta App como default para ser usado em main.tsx
export default App;
