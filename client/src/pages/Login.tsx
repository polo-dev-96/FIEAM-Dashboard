/*
 * ============================================================
 * pages/Login.tsx — Página de Login do Dashboard
 * ============================================================
 *
 * Esta é a primeira tela que o usuário vê ao abrir a aplicação.
 * É renderizada por AppContent (App.tsx) quando isAuthenticated = false.
 *
 * Layout:
 *   - Tela dividida em 2 paineis (lado a lado em desktop):
 *     LEFT PANEL  → Branding (logo, destaque, cards de features)
 *     RIGHT PANEL → Formulário de login
 *   - Em mobile: apenas o painel direito é exibido
 *
 * Fluxo de login:
 *   1. Usuário preenche email e senha
 *   2. handleSubmit() chama POST /api/login
 *   3. Se bem-sucedido: chama onLogin(token, user)
 *      → AuthContext.login() salva o token/user no localStorage
 *      → isAuthenticated vira true → Router redireciona para o dashboard
 *   4. Se falhar: exibe mensagem de erro
 *
 * Estados React (useState):
 *   email         → valor digitado no campo email
 *   password      → valor digitado no campo senha
 *   showPassword  → toggle para mostrar/ocultar a senha
 *   error         → mensagem de erro da API
 *   isLoading     → controla o botão de submit enquanto aguarda resposta
 *   focused       → qual campo está em foco (para animações CSS)
 * ============================================================
 */

// useState: hook do React para criar e gerenciar estado do componente
import { useState } from "react";

// Lucide: biblioteca de ícones SVG para React (cada import é um ícone)
import { Eye, EyeOff, Lock, Mail, Loader2, BarChart3, Shield, Activity } from "lucide-react";

// UserInfo: tipo TypeScript que define o objeto de dados do usuário
import type { UserInfo } from "@/lib/AuthContext";

/*
 * LoginPageProps — Props (parâmetros) aceitos pelo componente
 * -------------------------------------------------------
 * onLogin: função passada pelo App.tsx que executa o login no AuthContext
 */
interface LoginPageProps {
  onLogin: (token: string, user: UserInfo) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  // ─── Estados do formulário ────────────────────────────────────────────────
  const [email, setEmail] = useState("");             // valor do campo email
  const [password, setPassword] = useState("");       // valor do campo senha
  const [showPassword, setShowPassword] = useState(false); // toggle eye icon
  const [error, setError] = useState("");             // mensagem de erro da API
  const [isLoading, setIsLoading] = useState(false);  // estado de carregamento
  const [focused, setFocused] = useState<string | null>(null); // campo em foco

  /*
   * handleSubmit — Função executada ao submeter o formulário
   * -------------------------------------------------------
   * e.preventDefault() evita o comportamento padrão do HTML
   * (que recarregaria a página ao submeter um form).
   *
   * fetch() faz uma requisição HTTP para a API do backend.
   * O bloco try/catch garante que erros de rede sejam tratados.
   * O bloco finally garante que isLoading volta a false mesmo se der erro.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // impede reload da página
    setError("");        // limpa erros anteriores
    setIsLoading(true); // ativa o spinner no botão

    try {
      // Chama a rota POST /api/login do backend (server/routes.ts)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), // envia no corpo da requisição
      });

      const data = await res.json(); // lê a resposta como JSON

      // res.ok é true para status 200-299, false para 400/401/500
      if (!res.ok) {
        setError(data.message || "Erro ao fazer login"); // exibe o erro da API
        return;
      }

      // Login bem-sucedido: chama AuthContext.login() via prop
      onLogin(data.token, data.user);
    } catch {
      // Erro de rede (servidor offline, sem internet, etc.)
      setError("Erro de conexão com o servidor");
    } finally {
      setIsLoading(false); // sempre desativa o spinner
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#0A2A4A] via-[#0D3B66] to-[#094074]">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#009FE3]/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-[#0077B3]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-[#009FE3]/8 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top — Logo + Brand */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <img src="/Icone_Logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold tracking-tight">FIEAM</h2>
              <p className="text-white/40 text-xs font-medium tracking-widest uppercase">Sistema Indústria</p>
            </div>
          </div>

          {/* Center — Hero text */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#009FE3]/10 border border-[#009FE3]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#009FE3] animate-pulse" />
                <span className="text-[#009FE3] text-xs font-semibold tracking-wide uppercase">Dashboard Ativo</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                Painel de<br />
                <span className="bg-gradient-to-r from-[#009FE3] to-[#47BCF7] bg-clip-text text-transparent">
                  Atendimentos
                </span>
              </h1>
              <p className="text-white/50 text-lg leading-relaxed max-w-md">
                Acompanhe métricas, analise dados e tome decisões estratégicas em tempo real.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 gap-3 max-w-sm">
              {[
                { icon: BarChart3, label: "Relatórios em tempo real", desc: "Dados atualizados automaticamente" },
                { icon: Shield, label: "Acesso seguro", desc: "Controle por nível de permissão" },
                { icon: Activity, label: "Métricas inteligentes", desc: "Análises por entidade e período" },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-[#009FE3]/10 flex items-center justify-center flex-shrink-0">
                    <feat.icon className="w-5 h-5 text-[#009FE3]" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-semibold">{feat.label}</p>
                    <p className="text-white/35 text-xs">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — Logos */}
          <div className="flex items-center gap-6">
            <img src="/anexo/FIEAM-removebg-preview.png" alt="FIEAM" className="h-6 object-contain opacity-40 hover:opacity-70 transition-opacity" />
            <img src="/anexo/SESI-removebg-preview.png" alt="SESI" className="h-6 object-contain opacity-40 hover:opacity-70 transition-opacity" />
            <img src="/anexo/SENAI-removebg-preview.png" alt="SENAI" className="h-6 object-contain opacity-40 hover:opacity-70 transition-opacity" />
            <img src="/anexo/IEL-removebg-preview.png" alt="IEL" className="h-6 object-contain opacity-40 hover:opacity-70 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#060F1A] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#009FE3]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0077B3]/5 rounded-full blur-[80px]" />

        <div className="relative z-10 w-full max-w-[420px] px-8">
          {/* Mobile logo — shown only on small screens */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0C2135] border border-[#1A3A5C] mb-4">
              <img src="/Icone_Logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">FIEAM</h1>
            <p className="text-gray-500 text-sm mt-1">Sistema Indústria</p>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Bem-vindo de volta</h2>
            <p className="text-gray-500 text-sm mt-2">Insira suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'email'
                  ? 'ring-2 ring-[#009FE3]/40 shadow-lg shadow-[#009FE3]/5'
                  : ''
              }`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  focused === 'email' ? 'text-[#009FE3]' : 'text-gray-600'
                }`}>
                  <Mail className="w-[18px] h-[18px]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0B1929] border border-[#1A3A5C] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#009FE3]/60 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">
                Senha
              </label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'password'
                  ? 'ring-2 ring-[#009FE3]/40 shadow-lg shadow-[#009FE3]/5'
                  : ''
              }`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  focused === 'password' ? 'text-[#009FE3]' : 'text-gray-600'
                }`}>
                  <Lock className="w-[18px] h-[18px]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-[#0B1929] border border-[#1A3A5C] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#009FE3]/60 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#009FE3] to-[#0077B3] transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-[#009FE3] via-[#00B4FF] to-[#009FE3] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
              <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-b from-white/10 to-transparent opacity-50" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-[#1A3A5C]/50">
            {/* Mobile footer logos */}
            <div className="lg:hidden flex items-center justify-center gap-4 mb-4">
              <img src="/anexo/FIEAM-removebg-preview.png" alt="FIEAM" className="h-5 object-contain opacity-30" />
              <img src="/anexo/SESI-removebg-preview.png" alt="SESI" className="h-5 object-contain opacity-30" />
              <img src="/anexo/SENAI-removebg-preview.png" alt="SENAI" className="h-5 object-contain opacity-30" />
              <img src="/anexo/IEL-removebg-preview.png" alt="IEL" className="h-5 object-contain opacity-30" />
            </div>
            <p className="text-center text-gray-600 text-xs">
              &copy; {new Date().getFullYear()} Polo Telecom &middot; FIEAM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
