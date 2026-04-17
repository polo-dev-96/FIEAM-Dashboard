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

                {/* Phone Search Input — Glass */}
                <div className={cn(
                    "flex gap-3 p-2 rounded-2xl border transition-all duration-300",
                    isDark
                        ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl shadow-lg shadow-black/20 focus-within:border-[#009FE3]/40 focus-within:shadow-[0_0_24px_rgba(0,159,227,0.1)]"
                        : "bg-white/90 border-slate-200/80 backdrop-blur-xl shadow-lg shadow-black/5 focus-within:border-[#009FE3]/40 focus-within:shadow-[0_0_24px_rgba(0,159,227,0.08)]"
                )}>
                    <div className="relative flex-1">
                        <Phone className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", isDark ? "text-gray-500" : "text-gray-400")} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite o telefone (ex: 93270378 ou 92993270378)..."
                            className={cn(
                                "w-full pl-12 pr-4 py-3.5 rounded-xl border-0 bg-transparent focus:outline-none transition-all text-lg font-medium",
                                isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
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
                <div className="max-w-3xl mx-auto animate-fade-up">
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
                    <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-up">
                        <div className="flex items-center gap-3">
                            <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", isDark ? "bg-[#009FE3]/10 text-[#009FE3]" : "bg-blue-50 text-blue-600")}>
                                {totalResults}
                            </div>
                            <span className={cn("text-sm font-medium", isDark ? "text-gray-400" : "text-gray-500")}>
                                atendimento(s) para <span className={cn("font-mono font-bold", isDark ? "text-white" : "text-gray-900")}>{query}</span>
                                {results[0]?.contato && (
                                    <span className={cn("ml-2", isDark ? "text-gray-500" : "text-gray-400")}>
                                        · <span className={cn("font-medium", isDark ? "text-gray-300" : "text-gray-700")}>{results[0].contato}</span>
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Display Count Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] uppercase tracking-wider font-bold", isDark ? "text-gray-500" : "text-gray-400")}>Exibir:</span>
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className={cn(
                                        "appearance-none border text-sm font-medium rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#009FE3]/30 focus:border-[#009FE3] cursor-pointer transition-all",
                                        isDark ? "bg-[#0C2135] border-[#1E3A5F]/60 text-gray-200" : "bg-white border-slate-200 text-gray-700"
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
                        <Card key={item.id || idx} className={cn(
                            "shadow-lg rounded-2xl overflow-hidden card-premium animate-fade-up",
                            isDark ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl" : "bg-white/90 border-slate-200/80 backdrop-blur-xl"
                        )} style={{ animationDelay: `${idx * 0.05}s` }}>
                            <CardHeader className="pb-3">
                                <CardTitle className={cn("flex items-center justify-between", isDark ? "text-white" : "text-gray-900")}>
                                    <div className="flex items-center gap-3 text-lg">
                                        <div className={cn("p-2 rounded-xl", isDark ? "bg-blue-500/10" : "bg-blue-50")}>
                                            <FileText className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-blue-600")} />
                                        </div>
                                        <div>
                                            <span className={cn("text-[10px] uppercase tracking-widest font-bold block", isDark ? "text-gray-500" : "text-gray-400")}>Protocolo</span>
                                            <span className={cn("font-mono font-bold", isDark ? "text-[#009FE3]" : "text-blue-600")}>{item.protocolo}</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-bold px-2.5 py-1 rounded-lg",
                                        isDark ? "bg-white/5 text-gray-400" : "bg-slate-100 text-gray-500"
                                    )}>
                                        #{startIdx + idx + 1}/{totalResults}
                                    </span>
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

                                {/* Resumo da Conversa — Premium glass */}
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

                    {/* Pagination — Premium pill buttons */}
                    {totalPages > 1 && (
                        <div className={cn(
                            "flex items-center justify-center gap-2 pt-4 pb-6"
                        )}>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl border",
                                    isDark
                                        ? "text-gray-400 hover:text-white hover:bg-white/5 border-[#1E3A5F]/60 hover:border-[#009FE3]/30"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1">
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
                                                "w-9 h-9 flex items-center justify-center text-sm font-bold rounded-xl transition-all duration-200",
                                                page === currentPage
                                                    ? "bg-gradient-to-r from-[#009FE3] to-[#0077CC] text-white shadow-md shadow-[#009FE3]/20"
                                                    : isDark
                                                        ? "text-gray-400 hover:bg-white/5 hover:text-white"
                                                        : "text-gray-500 hover:bg-slate-100 hover:text-gray-900"
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
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl border",
                                    isDark
                                        ? "text-gray-400 hover:text-white hover:bg-white/5 border-[#1E3A5F]/60 hover:border-[#009FE3]/30"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                Próximo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State — Premium */}
            {!results && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
                    <div className={cn(
                        "relative p-8 rounded-3xl border mb-6",
                        isDark ? "bg-[#0C2135]/60 border-[#1E3A5F]/40" : "bg-white/60 border-slate-200/60"
                    )}>
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#009FE3]/5 to-transparent" />
                        <Phone className={cn("w-14 h-14 relative z-10", isDark ? "text-gray-600" : "text-gray-300")} />
                    </div>
                    <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Pesquisar Telefone</h3>
                    <p className={cn("max-w-md text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
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
