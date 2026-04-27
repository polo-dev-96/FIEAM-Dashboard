/*
 * ============================================================
 * pages/SearchPhone.tsx — Página de Busca por Telefone
 * ============================================================
 *
 * Permite buscar todos os atendimentos de um número de telefone/identificador.
 * Usa busca parcial (LIKE %numero%) para encontrar mesmo com formatos diferentes.
 *
 * Diferenciais em relação ao SearchProtocol:
 *   - Retorna MÚLTIPLOS atendimentos (histórico completo do contato)
 *   - Inclui filtro de período (DateRangePicker)
 *   - Implementa paginação (10/25/50/100 por página)
 *   - Possui dropdown de itens por página
 *
 * Fluxo:
 *   1. Usuário digita o número de telefone
 *   2. Seleciona o período (opcional)
 *   3. Clica buscar → GET /api/telefone/:telefone?startDate=...&endDate=...
 *   4. Resultados exibidos em tabela paginada
 *
 * Estados:
 *   query       → texto do campo de busca
 *   results     → array de atendimentos (ou null antes da busca)
 *   isLoading   → spinner durante requisição
 *   error       → mensagem de erro
 *   perPage     → número de itens por página (10/25/50/100)
 *   currentPage → página atual da paginação
 *   startDate   → data inicial do filtro de período
 *   endDate     → data final do filtro de período
 * ============================================================
 */

import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// DateRangePicker: seletor de período de datas para filtrar os atendimentos
import { DateRangePicker } from "@/components/ui/date-range-picker";

import {
    Search, FileText, User, Phone, Hash,
    MessageSquare, Clock, Building2, Radio,
    AlertCircle, ChevronDown, ChevronLeft, ChevronRight
} from "lucide-react";

// startOfMonth: calcula o primeiro dia do mês atual (data inicial padrão)
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

/*
 * Atendimento — Tipo de dado de um atendimento retornado pela API
 */
interface Atendimento {
    id: number;
    contato: string;
    identificador: string;  // número de telefone/identificador
    protocolo: string;
    canal: string;
    dataHoraInicio: string;
    dataHoraFim: string;
    tipoCanal: string;
    resumoConversa: string;
    casa: string;
}

// PER_PAGE_OPTIONS: opções do dropdown "Exibir por página"
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export default function SearchPhonePage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Atendimento[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [perPage, setPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState(1);
    const { isDark } = useTheme();

    // Date range filter
    const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

    const handleSearch = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        setIsLoading(true);
        setError(null);
        setResults(null);
        setCurrentPage(1);

        try {
            const url = `/api/telefone/${encodeURIComponent(trimmed)}?startDate=${startDate}&endDate=${endDate}`;
            const response = await fetch(url);

            if (response.status === 404) {
                setError("Telefone não encontrado no período selecionado. Verifique o número ou altere as datas.");
                return;
            }

            if (!response.ok) {
                throw new Error("Erro ao buscar telefone");
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError("Erro ao buscar telefone. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleDateApply = (newStart: string, newEnd: string) => {
        setStartDate(newStart);
        setEndDate(newEnd);
    };

    const totalResults = results?.length || 0;
    const totalPages = Math.ceil(totalResults / perPage);
    const startIdx = (currentPage - 1) * perPage;
    const visibleResults = results ? results.slice(startIdx, startIdx + perPage) : [];

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePerPageChange = (value: number) => {
        setPerPage(value);
        setCurrentPage(1);
    };

    return (
        <Layout title="Pesquisar Telefone" subtitle="Busque todos os atendimentos de um número de telefone">
            {/* Search Bar + Date Filter — Premium */}
            <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
                {/* Date Range Picker */}
                <div className="flex items-center justify-center">
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onApply={handleDateApply}
                    />
                </div>

                {/* Phone Search Input */}
                <div className={cn(
                    "flex gap-2 p-1.5 rounded-xl border transition-all duration-200 shadow-ds-card",
                    isDark
                        ? "bg-ds-secondary border-ds-default focus-within:border-ds-strong"
                        : "bg-ds-elevated border-ds-default focus-within:border-ds-strong"
                )}>
                    <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-tertiary" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite o telefone (ex: 93270378 ou 92993270378)..."
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
                <div className="max-w-3xl mx-auto animate-fade-up">
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
                    <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-up">
                        <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">
                                {totalResults}
                            </span>
                            <span className="text-sm font-medium text-ds-secondary">
                                atendimento(s) para <span className="font-mono font-bold text-ds-primary">{query}</span>
                                {results[0]?.contato && (
                                    <span className="ml-2 text-ds-tertiary">
                                        · <span className="font-medium text-ds-secondary">{results[0].contato}</span>
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-ds-tertiary">Exibir:</span>
                            <select
                                value={perPage}
                                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                className="text-xs border border-ds-default rounded-md px-2 py-1 bg-ds-inset text-ds-primary focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent)]"
                            >
                                {PER_PAGE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {visibleResults.map((item, idx) => (
                        <div key={item.id || idx} className={cn(
                            "rounded-xl border transition-theme card-hover animate-fade-up overflow-hidden",
                            isDark ? "bg-ds-secondary border-ds-default shadow-ds-card" : "bg-ds-elevated border-ds-default shadow-ds-card"
                        )} style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-1.5 rounded-lg", isDark ? "bg-[var(--ds-accent-muted)]" : "bg-blue-50")}>
                                        <FileText className="w-4 h-4 text-[var(--ds-accent)]" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase tracking-widest font-semibold block text-ds-tertiary">Protocolo</span>
                                        <span className="font-mono font-bold text-[var(--ds-accent)]">{item.protocolo}</span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-ds-inset text-ds-tertiary">
                                    #{startIdx + idx + 1}/{totalResults}
                                </span>
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 pt-3 pb-6">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-md border border-ds-subtle text-ds-secondary hover:bg-[var(--ds-accent-muted)]"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Anterior
                            </button>

                            <div className="flex items-center gap-0.5">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let page: number;
                                    if (totalPages <= 5) { page = i + 1; }
                                    else if (currentPage <= 3) { page = i + 1; }
                                    else if (currentPage >= totalPages - 2) { page = totalPages - 4 + i; }
                                    else { page = currentPage - 2 + i; }
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => goToPage(page)}
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center text-[13px] font-semibold rounded-md transition-all duration-150",
                                                page === currentPage
                                                    ? "bg-[var(--ds-accent)] text-white"
                                                    : "text-ds-tertiary hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary"
                                            )}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-md border border-ds-subtle text-ds-secondary hover:bg-[var(--ds-accent-muted)]"
                            >
                                Próximo
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!results && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
                    <div className={cn(
                        "p-6 rounded-2xl border mb-5",
                        isDark ? "bg-ds-secondary border-ds-default" : "bg-ds-elevated border-ds-default"
                    )}>
                        <Phone className="w-10 h-10 text-ds-tertiary" />
                    </div>
                    <h3 className="text-lg font-bold mb-1.5 text-ds-primary">Pesquisar Telefone</h3>
                    <p className="max-w-md text-sm text-ds-tertiary">
                        Digite o número de telefone (completo ou parcial) no campo acima para buscar todos os atendimentos associados.
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
