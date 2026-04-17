import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search, FileText, User, Phone, Hash,
  MessageSquare, Clock, Building2, Radio,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

interface Atendimento {
  id: number;
  contato: string;
  identificador: string;
  protocolo: string;
  canal: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipoCanal: string;
  resumoConversa: string;
  casa: string;
}

export default function SearchProtocolPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Atendimento[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useTheme();

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`/api/protocolo/${encodeURIComponent(trimmed)}`);

      if (response.status === 404) {
        setError("Protocolo não encontrado. Verifique o número e tente novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error("Erro ao buscar protocolo");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError("Erro ao buscar protocolo. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Layout title="Pesquisar Protocolo" subtitle="Busque atendimentos pelo número de protocolo">
      {/* Search Bar — Premium Glass */}
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className={cn(
          "flex gap-3 p-2 rounded-2xl border transition-all duration-300",
          isDark
            ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl shadow-lg shadow-black/20 focus-within:border-[#009FE3]/40 focus-within:shadow-[0_0_24px_rgba(0,159,227,0.1)]"
            : "bg-white/90 border-slate-200/80 backdrop-blur-xl shadow-lg shadow-black/5 focus-within:border-[#009FE3]/40 focus-within:shadow-[0_0_24px_rgba(0,159,227,0.08)]"
        )}>
          <div className="relative flex-1">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", isDark ? "text-gray-500" : "text-gray-400")} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o número do protocolo..."
              className={cn(
                "w-full pl-12 pr-4 py-3.5 rounded-xl border-0 bg-transparent focus:outline-none transition-all text-lg font-medium",
                isDark
                  ? "text-white placeholder-gray-500"
                  : "text-gray-900 placeholder-gray-400"
              )}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-7 py-3.5 bg-gradient-to-r from-[#009FE3] to-[#0077CC] hover:from-[#0088CC] hover:to-[#006BB5] text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md shadow-[#009FE3]/20 hover:shadow-lg hover:shadow-[#009FE3]/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto animate-fade-up">
          <div className={cn(
            "flex items-center gap-3 rounded-2xl p-4 border",
            isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200"
          )}>
            <div className={cn("p-2 rounded-lg", isDark ? "bg-red-500/10" : "bg-red-100")}>
              <AlertCircle className={cn("w-4 h-4", isDark ? "text-red-400" : "text-red-600")} />
            </div>
            <p className={cn("text-sm font-medium", isDark ? "text-red-400" : "text-red-600")}>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-5">
          <div className={cn("flex items-center gap-3 animate-fade-up", isDark ? "text-gray-400" : "text-gray-500")}>
            <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", isDark ? "bg-[#009FE3]/10 text-[#009FE3]" : "bg-blue-50 text-blue-600")}>
              {results.length}
            </div>
            <span className="text-sm font-medium">
              resultado(s) para <span className={cn("font-mono font-bold", isDark ? "text-white" : "text-gray-900")}>{query}</span>
            </span>
          </div>

          {results.map((item, idx) => (
            <Card key={item.id || idx} className={cn(
              "shadow-lg rounded-2xl overflow-hidden card-premium animate-fade-up",
              isDark ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl" : "bg-white/90 border-slate-200/80 backdrop-blur-xl"
            )} style={{ animationDelay: `${idx * 0.1}s` }}>
              <CardHeader className="pb-3">
                <CardTitle className={cn("flex items-center gap-3 text-lg", isDark ? "text-white" : "text-gray-900")}>
                  <div className={cn("p-2 rounded-xl", isDark ? "bg-blue-500/10" : "bg-blue-50")}>
                    <FileText className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-blue-600")} />
                  </div>
                  <div>
                    <span className={cn("text-[10px] uppercase tracking-widest font-bold block", isDark ? "text-gray-500" : "text-gray-400")}>Protocolo</span>
                    <span className={cn("font-mono font-bold", isDark ? "text-[#009FE3]" : "text-blue-600")}>{item.protocolo}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoField isDark={isDark} icon={<User className="w-3.5 h-3.5" />} label="Contato" value={item.contato} color="blue" />
                  <InfoField isDark={isDark} icon={<Phone className="w-3.5 h-3.5" />} label="Identificador" value={item.identificador} color="green" />
                  <InfoField isDark={isDark} icon={<Radio className="w-3.5 h-3.5" />} label="Canal" value={item.canal} color="purple" />
                  <InfoField isDark={isDark} icon={<Hash className="w-3.5 h-3.5" />} label="Tipo de Canal" value={item.tipoCanal} color="amber" />
                  <InfoField isDark={isDark} icon={<Clock className="w-3.5 h-3.5" />} label="Início" value={formatDateTime(item.dataHoraInicio)} color="cyan" />
                  <InfoField isDark={isDark} icon={<Clock className="w-3.5 h-3.5" />} label="Fim" value={formatDateTime(item.dataHoraFim)} color="orange" />
                  <InfoField isDark={isDark} icon={<Building2 className="w-3.5 h-3.5" />} label="Casa" value={item.casa} color="pink" />
                </div>

                {/* Resumo da Conversa — Premium glass with colored left border */}
                <div className={cn(
                  "relative mt-4 p-4 rounded-xl border overflow-hidden",
                  isDark ? "bg-[#081E30]/80 border-[#1E3A5F]/40" : "bg-slate-50/80 border-slate-200/80"
                )}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#009FE3] to-[#0077CC] rounded-l-xl" />
                  <div className="flex items-center gap-2 mb-2 ml-2">
                    <MessageSquare className={cn("w-3.5 h-3.5", isDark ? "text-[#009FE3]" : "text-blue-500")} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-gray-500" : "text-gray-400")}>Resumo da Conversa</span>
                  </div>
                  <p className={cn("text-sm leading-relaxed ml-2", isDark ? "text-gray-300" : "text-gray-700")}>
                    {item.resumoConversa || "Sem resumo disponível"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State (initial) — Premium */}
      {!results && !error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
          <div className={cn(
            "relative p-8 rounded-3xl border mb-6",
            isDark ? "bg-[#0C2135]/60 border-[#1E3A5F]/40" : "bg-white/60 border-slate-200/60"
          )}>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#009FE3]/5 to-transparent" />
            <Search className={cn("w-14 h-14 relative z-10", isDark ? "text-gray-600" : "text-gray-300")} />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Pesquisar Protocolo</h3>
          <p className={cn("max-w-md text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
            Digite o número do protocolo no campo acima para buscar os detalhes do atendimento.
          </p>
        </div>
      )}
    </Layout>
  );
}

function InfoField({ icon, label, value, isDark, color }: {
  icon: React.ReactNode; label: string; value: string; isDark: boolean;
  color: "blue" | "green" | "purple" | "amber" | "cyan" | "orange" | "pink";
}) {
  const iconBgMap: Record<string, { dark: string; light: string; iconDark: string; iconLight: string }> = {
    blue:   { dark: "bg-blue-500/10",   light: "bg-blue-50",   iconDark: "text-blue-400",   iconLight: "text-blue-600" },
    green:  { dark: "bg-emerald-500/10", light: "bg-emerald-50", iconDark: "text-emerald-400", iconLight: "text-emerald-600" },
    purple: { dark: "bg-purple-500/10",  light: "bg-purple-50",  iconDark: "text-purple-400",  iconLight: "text-purple-600" },
    amber:  { dark: "bg-amber-500/10",   light: "bg-amber-50",   iconDark: "text-amber-400",   iconLight: "text-amber-600" },
    cyan:   { dark: "bg-cyan-500/10",    light: "bg-cyan-50",    iconDark: "text-cyan-400",    iconLight: "text-cyan-600" },
    orange: { dark: "bg-orange-500/10",  light: "bg-orange-50",  iconDark: "text-orange-400",  iconLight: "text-orange-600" },
    pink:   { dark: "bg-pink-500/10",    light: "bg-pink-50",    iconDark: "text-pink-400",    iconLight: "text-pink-600" },
  };
  const c = iconBgMap[color];

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl border transition-colors",
      isDark ? "bg-[#081E30]/50 border-[#1E3A5F]/30 hover:border-[#1E3A5F]/60" : "bg-slate-50/80 border-slate-100 hover:border-slate-200"
    )}>
      <div className={cn("p-1.5 rounded-lg mt-0.5", isDark ? c.dark : c.light)}>
        <span className={isDark ? c.iconDark : c.iconLight}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-gray-500" : "text-gray-400")}>{label}</p>
        <p className={cn("text-sm mt-0.5 break-all font-medium", isDark ? "text-gray-200" : "text-gray-800")}>{value || "-"}</p>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch {
    return dateStr;
  }
}


