/*
 * ============================================================
 * pages/SearchProtocol.tsx — Página de Busca por Protocolo
 * ============================================================
 *
 * Permite buscar um atendimento específico pelo seu número de protocolo.
 * Acesso restrito por AuthContext (não acessível para todos os papéis).
 *
 * Fluxo:
 *   1. Usuário digita o número do protocolo no campo de busca
 *   2. Ao pressionar Enter ou clicar no botão, handleSearch() é chamado
 *   3. Faz GET /api/protocolo/:protocolo
 *   4. Exibe o resultado (dados do atendimento) ou mensagem de erro
 *
 * Estados:
 *   query     → texto digitado no campo de busca
 *   results   → array de atendimentos retornados (ou null antes da busca)
 *   isLoading → controla o spinner durante a requisição
 *   error     → mensagem de erro (404 = não encontrado, 500 = erro do servidor)
 * ============================================================
 */

// Layout: estrutura visual padrão com sidebar e header
import { Layout } from "@/components/layout/Layout";

// useState: hook de estado local
import { useState } from "react";

// Componentes de Card do shadcn (contêiner visual para o resultado)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Ícones Lucide para o resultado do atendimento
import {
  Search, FileText, User, Phone, Hash,
  MessageSquare, Clock, Building2, Radio,
  AlertCircle
} from "lucide-react";

// date-fns: formata datas para exibição
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// useTheme: acessa o tema atual (claro/escuro)
import { useTheme } from "@/lib/ThemeContext";

// cn: combina classes CSS condicionalmente
import { cn } from "@/lib/utils";

/*
 * Atendimento — Tipo que representa os dados de um atendimento retornado pela API
 * Espelha os campos retornados pela rota GET /api/protocolo/:protocolo
 */
interface Atendimento {
  id: number;
  contato: string;        // nome do contato
  identificador: string;  // número de telefone ou identificador
  protocolo: string;      // número do protocolo
  canal: string;          // canal de atendimento (ex: WhatsApp)
  dataHoraInicio: string; // data/hora de início do atendimento
  dataHoraFim: string;    // data/hora de término
  tipoCanal: string;      // tipo do canal (ex: chatbot, humano)
  resumoConversa: string; // resumo/assunto da conversa
  casa: string;           // equipe/unidade que atendeu
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
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className={cn(
          "flex gap-2 p-1.5 rounded-xl border transition-all duration-200 shadow-ds-card",
          isDark
            ? "bg-ds-secondary border-ds-default focus-within:border-ds-strong"
            : "bg-ds-elevated border-ds-default focus-within:border-ds-strong"
        )}>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o número do protocolo..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-transparent focus:outline-none text-base font-medium text-ds-primary placeholder:text-ds-tertiary"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-5 py-3 bg-[var(--ds-accent)] hover:bg-[var(--ds-accent-hover)] text-white rounded-lg font-semibold transition-all duration-150 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
            "flex items-center gap-3 rounded-xl p-4 border",
            isDark ? "bg-rose-500/5 border-rose-500/15" : "bg-rose-50 border-rose-200"
          )}>
            <div className={cn("p-1.5 rounded-lg", isDark ? "bg-rose-500/10" : "bg-rose-100")}>
              <AlertCircle className="w-4 h-4 text-[var(--ds-kpi-negative)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ds-kpi-negative)]">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 animate-fade-up text-ds-secondary">
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">
              {results.length}
            </span>
            <span className="text-sm font-medium">
              resultado(s) para <span className="font-mono font-bold text-ds-primary">{query}</span>
            </span>
          </div>

          {results.map((item, idx) => (
            <div key={item.id || idx} className={cn(
              "rounded-xl border transition-theme card-hover animate-fade-up overflow-hidden",
              isDark ? "bg-ds-secondary border-ds-default shadow-ds-card" : "bg-ds-elevated border-ds-default shadow-ds-card"
            )} style={{ animationDelay: `${idx * 0.08}s` }}>
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg", isDark ? "bg-[var(--ds-accent-muted)]" : "bg-blue-50")}>
                  <FileText className="w-4 h-4 text-[var(--ds-accent)]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold block text-ds-tertiary">Protocolo</span>
                  <span className="font-mono font-bold text-[var(--ds-accent)]">{item.protocolo}</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <InfoField isDark={isDark} icon={<User className="w-3.5 h-3.5" />} label="Contato" value={item.contato} color="blue" />
                  <InfoField isDark={isDark} icon={<Phone className="w-3.5 h-3.5" />} label="Identificador" value={item.identificador} color="green" />
                  <InfoField isDark={isDark} icon={<Radio className="w-3.5 h-3.5" />} label="Canal" value={item.canal} color="purple" />
                  <InfoField isDark={isDark} icon={<Hash className="w-3.5 h-3.5" />} label="Tipo de Canal" value={item.tipoCanal} color="amber" />
                  <InfoField isDark={isDark} icon={<Clock className="w-3.5 h-3.5" />} label="Início" value={formatDateTime(item.dataHoraInicio)} color="cyan" />
                  <InfoField isDark={isDark} icon={<Clock className="w-3.5 h-3.5" />} label="Fim" value={formatDateTime(item.dataHoraFim)} color="orange" />
                  <InfoField isDark={isDark} icon={<Building2 className="w-3.5 h-3.5" />} label="Casa" value={item.casa} color="pink" />
                </div>

                {/* Resumo */}
                <div className="relative mt-3 p-3.5 rounded-lg border border-l-[3px] border-l-[var(--ds-accent)] border-ds-subtle bg-ds-inset overflow-hidden">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--ds-accent)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-ds-tertiary">Resumo da Conversa</span>
                  </div>
                  <p className="text-sm leading-relaxed text-ds-secondary">
                    {item.resumoConversa || "Sem resumo disponível"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!results && !error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
          <div className={cn(
            "p-6 rounded-2xl border mb-5",
            isDark ? "bg-ds-secondary border-ds-default" : "bg-ds-elevated border-ds-default"
          )}>
            <Search className="w-10 h-10 text-ds-tertiary" />
          </div>
          <h3 className="text-lg font-bold mb-1.5 text-ds-primary">Pesquisar Protocolo</h3>
          <p className="max-w-md text-sm text-ds-tertiary">
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
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-ds-subtle bg-ds-inset transition-colors hover:border-ds-default">
      <div className={cn("p-1.5 rounded-md mt-0.5", isDark ? c.dark : c.light)}>
        <span className={isDark ? c.iconDark : c.iconLight}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-tertiary">{label}</p>
        <p className="text-sm mt-0.5 break-all font-medium text-ds-primary">{value || "-"}</p>
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


