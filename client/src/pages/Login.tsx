import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Erro ao fazer login");
        return;
      }

      onLogin(data.token);
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#009FE3]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0077B3]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#009FE3]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/Icone_Logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Polo BI</h1>
          <p className="text-gray-400 mt-1 text-sm">Sistema de Dashboard FIEAM</p>
        </div>

        {/* Card */}
        <div className="bg-[#0C2135] border border-[#165A8A] rounded-2xl p-8 shadow-2xl shadow-black/20">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Entrar</h2>
            <p className="text-gray-400 text-sm mt-1">Faça login para acessar o dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#061726] border border-[#165A8A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3]/50 focus:border-[#009FE3] transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-[#061726] border border-[#165A8A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3]/50 focus:border-[#009FE3] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#009FE3] to-[#0077B3] hover:from-[#008CCE] hover:to-[#006A9F] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#009FE3]/20 hover:shadow-[#009FE3]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        {/* Footer logos */}
        <div className="flex items-center justify-center gap-4 mt-8 opacity-60">
          <img src="/anexo/FIEAM-removebg-preview.png" alt="FIEAM" className="h-7 object-contain" />
          <img src="/anexo/SESI-removebg-preview.png" alt="SESI" className="h-7 object-contain" />
          <img src="/anexo/SENAI-removebg-preview.png" alt="SENAI" className="h-7 object-contain" />
          <img src="/anexo/IEL-removebg-preview.png" alt="IEL" className="h-7 object-contain" />
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          &copy; {new Date().getFullYear()} Polo Telecom &middot; FIEAM
        </p>
      </div>
    </div>
  );
}
