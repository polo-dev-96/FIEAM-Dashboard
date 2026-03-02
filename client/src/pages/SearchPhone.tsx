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
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#0a1628] border border-[#1a3a5c] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0047B6]/50 focus:border-[#0047B6]/50 transition-all text-lg"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !query.trim()}
                        className="px-8 py-4 bg-[#0047B6] hover:bg-[#003892] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
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
                        <p className="text-gray-400 text-sm">
                            <span className="text-white font-semibold">{totalResults}</span> atendimento(s) encontrado(s) para <span className="text-white font-mono">{query}</span>
                            {results[0]?.contato && (
                                <span className="text-gray-500 ml-2">
                                    · Contato: <span className="text-gray-300">{results[0].contato}</span>
                                </span>
                            )}
                        </p>

                        {/* Display Count Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Exibir:</span>
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className="appearance-none bg-[#0a1628] border border-[#1a3a5c] text-gray-200 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#009FE3] focus:border-[#009FE3] cursor-pointer transition-all"
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
                        <Card key={item.id || idx} className="bg-[#0a1628] border-[#1a3a5c] shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-lg">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                        Protocolo: <span className="font-mono text-blue-400">{item.protocolo}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 font-normal">
                                        #{startIdx + idx + 1} de {totalResults}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <InfoField
                                        icon={<User className="w-4 h-4 text-blue-400" />}
                                        label="Contato"
                                        value={item.contato}
                                    />
                                    <InfoField
                                        icon={<Phone className="w-4 h-4 text-green-400" />}
                                        label="Identificador"
                                        value={item.identificador}
                                    />
                                    <InfoField
                                        icon={<Radio className="w-4 h-4 text-purple-400" />}
                                        label="Canal"
                                        value={item.canal}
                                    />
                                    <InfoField
                                        icon={<Hash className="w-4 h-4 text-amber-400" />}
                                        label="Tipo de Canal"
                                        value={item.tipoCanal}
                                    />
                                    <InfoField
                                        icon={<Clock className="w-4 h-4 text-cyan-400" />}
                                        label="Início"
                                        value={formatDateTime(item.dataHoraInicio)}
                                    />
                                    <InfoField
                                        icon={<Clock className="w-4 h-4 text-orange-400" />}
                                        label="Fim"
                                        value={formatDateTime(item.dataHoraFim)}
                                    />
                                    <InfoField
                                        icon={<Building2 className="w-4 h-4 text-pink-400" />}
                                        label="Casa"
                                        value={item.casa}
                                    />
                                </div>

                                {/* Resumo da Conversa */}
                                <div className="mt-4 p-4 rounded-lg bg-[#060e1a] border border-[#1a3a5c]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Resumo da Conversa</span>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed">
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
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white/5"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>
                            <span className="text-sm text-gray-400">
                                <span className="text-white font-semibold">{currentPage}</span> / {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white/5 border border-[#1a3a5c]"
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
                    <div className="p-6 rounded-full bg-[#0a1628] border border-[#1a3a5c] mb-6">
                        <Phone className="w-12 h-12 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">Pesquisar Telefone</h3>
                    <p className="text-gray-500 max-w-md text-sm">
                        Digite o número de telefone (completo ou parcial) no campo acima para buscar todos os atendimentos associados.
                    </p>
                </div>
            )}
        </Layout>
    );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#060e1a]/50">
            <div className="mt-0.5">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-gray-200 text-sm mt-0.5 break-all">{value || "-"}</p>
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
