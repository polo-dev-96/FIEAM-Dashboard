import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
    Search, FileText, User, Phone, Hash,
    MessageSquare, Clock, Building2, Radio,
    AlertCircle, ChevronDown, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
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
            {/* Search Bar + Date Filter */}
            <div className="max-w-3xl mx-auto space-y-4">
                {/* Date Range Picker */}
                <div className="flex items-center justify-center">
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onApply={handleDateApply}
                    />
                </div>

                {/* Phone Search Input */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite o telefone (ex: 93270378 ou 92993270378)..."
                            className={cn(
                                "w-full pl-12 pr-4 py-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0047B6]/50 focus:border-[#0047B6]/50 transition-all text-lg",
                                isDark
                                    ? "bg-[#0a1628] border-[#1a3a5c] text-white placeholder-gray-500"
                                    : "bg-white border-slate-300 text-gray-900 placeholder-gray-400"
                            )}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !query.trim()}
                        className={cn(
                            "px-8 py-4 bg-[#0047B6] hover:bg-[#003892] text-white rounded-xl font-medium transition-colors flex items-center gap-2",
                            isDark ? "disabled:bg-gray-700 disabled:text-gray-500" : "disabled:bg-gray-300 disabled:text-gray-400"
                        )}
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
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {results && results.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                            <span className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>{totalResults}</span> atendimento(s) encontrado(s) para <span className={cn("font-mono", isDark ? "text-white" : "text-gray-900")}>{query}</span>
                            {results[0]?.contato && (
                                <span className={cn("ml-2", isDark ? "text-gray-500" : "text-gray-400")}>
                                    · Contato: <span className={cn(isDark ? "text-gray-300" : "text-gray-700")}>{results[0].contato}</span>
                                </span>
                            )}
                        </p>

                        {/* Display Count Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>Exibir:</span>
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className={cn(
                                        "appearance-none border text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#009FE3] focus:border-[#009FE3] cursor-pointer transition-all",
                                        isDark ? "bg-[#0a1628] border-[#1a3a5c] text-gray-200" : "bg-white border-slate-300 text-gray-700"
                                    )}
                                >
                                    {PER_PAGE_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {visibleResults.map((item, idx) => (
                        <Card key={item.id || idx} className={cn("shadow-lg", isDark ? "bg-[#0a1628] border-[#1a3a5c]" : "bg-white border-slate-200")}>
                            <CardHeader className="pb-2">
                                <CardTitle className={cn("flex items-center justify-between", isDark ? "text-white" : "text-gray-900")}>
                                    <div className="flex items-center gap-2 text-lg">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                        Protocolo: <span className="font-mono text-blue-400">{item.protocolo}</span>
                                    </div>
                                    <span className={cn("text-xs font-normal", isDark ? "text-gray-500" : "text-gray-400")}>
                                        #{startIdx + idx + 1} de {totalResults}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <InfoField isDark={isDark}
                                        icon={<User className="w-4 h-4 text-blue-400" />}
                                        label="Contato"
                                        value={item.contato}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Phone className="w-4 h-4 text-green-400" />}
                                        label="Identificador"
                                        value={item.identificador}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Radio className="w-4 h-4 text-purple-400" />}
                                        label="Canal"
                                        value={item.canal}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Hash className="w-4 h-4 text-amber-400" />}
                                        label="Tipo de Canal"
                                        value={item.tipoCanal}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Clock className="w-4 h-4 text-cyan-400" />}
                                        label="Início"
                                        value={formatDateTime(item.dataHoraInicio)}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Clock className="w-4 h-4 text-orange-400" />}
                                        label="Fim"
                                        value={formatDateTime(item.dataHoraFim)}
                                    />
                                    <InfoField isDark={isDark}
                                        icon={<Building2 className="w-4 h-4 text-pink-400" />}
                                        label="Casa"
                                        value={item.casa}
                                    />
                                </div>

                                {/* Resumo da Conversa */}
                                <div className={cn("mt-4 p-4 rounded-lg border", isDark ? "bg-[#060e1a] border-[#1a3a5c]" : "bg-slate-50 border-slate-200")}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
                                        <span className={cn("text-xs font-medium uppercase tracking-wide", isDark ? "text-gray-400" : "text-gray-500")}>Resumo da Conversa</span>
                                    </div>
                                    <p className={cn("text-sm leading-relaxed", isDark ? "text-gray-300" : "text-gray-700")}>
                                        {item.resumoConversa || "Sem resumo disponível"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2 pb-4">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg",
                                    isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-slate-100"
                                )}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>
                            <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                <span className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>{currentPage}</span> / {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg border",
                                    isDark ? "text-gray-400 hover:text-white hover:bg-white/5 border-[#1a3a5c]" : "text-gray-500 hover:text-gray-900 hover:bg-slate-100 border-slate-300"
                                )}
                            >
                                Próximo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State (initial) */}
            {!results && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className={cn("p-6 rounded-full border mb-6", isDark ? "bg-[#0a1628] border-[#1a3a5c]" : "bg-slate-100 border-slate-200")}>
                        <Phone className={cn("w-12 h-12", isDark ? "text-gray-600" : "text-gray-400")} />
                    </div>
                    <h3 className={cn("text-xl font-semibold mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Pesquisar Telefone</h3>
                    <p className={cn("max-w-md text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
                        Digite o número de telefone (completo ou parcial) no campo acima para buscar todos os atendimentos associados.
                    </p>
                </div>
            )}
        </Layout>
    );
}

function InfoField({ icon, label, value, isDark }: { icon: React.ReactNode; label: string; value: string; isDark: boolean }) {
    return (
        <div className={cn("flex items-start gap-3 p-3 rounded-lg", isDark ? "bg-[#060e1a]/50" : "bg-slate-50")}>
            <div className="mt-0.5">{icon}</div>
            <div className="min-w-0">
                <p className={cn("text-xs font-medium uppercase tracking-wide", isDark ? "text-gray-500" : "text-gray-400")}>{label}</p>
                <p className={cn("text-sm mt-0.5 break-all", isDark ? "text-gray-200" : "text-gray-800")}>{value || "-"}</p>
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
