import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MonthPicker } from "@/components/ui/month-picker";
import { SelectCustom } from "@/components/ui/select-custom";
import { ExportReportDialog } from "@/components/ui/export-report-dialog";
import {
    RefreshCw, TrendingUp, Headphones, FileText, Clock, Filter,
    Building2, Users, CalendarDays, Settings2
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { agruparAssuntos, Entidade, UnidadeSESI, getCasasForFiltro, getCasasForFiltroGerente, getEquipesForEntidade } from "@/lib/entidadeMapping";
import { useAuth } from "@/lib/AuthContext";

// ─── Types ─────────────────────────────────────────────────────────

interface AnualStatsData {
    evolucao: Array<{ mes: number; canal: string; total: number }>;
    porOrigem: Array<{ nome: string; total: number }>;
    porAssunto: Array<{ nome: string; total: number }>;
    prazo: { dentro: number; fora: number };
}

interface DrilldownRecord {
    protocolo: string;
    contato: string;
    identificador: string;
    canal: string;
    tipoCanal: string;
    dataHoraInicio: string;
    dataHoraFim: string;
    resumoConversa: string;
    casa: string;
}

interface DrilldownState {
    open: boolean;
    title: string;
    tipo: string;
    valor: string;
}

// ─── Constants ─────────────────────────────────────────────────────

const MONTH_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const LINE_COLORS = [
    "#009FE3", "#F37021", "#00A650", "#ED1C24", "#00BCD4",
    "#8b5cf6", "#0077CC", "#14b8a6", "#6366f1", "#a855f7"
];

const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        color: '#0C2135',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    labelStyle: { color: '#374151', fontWeight: 600 as const },
    itemStyle: { color: '#0C2135' },
};

const ASSUNTO_COLORS = [
    '#009FE3', '#0088CC', '#0077B5', '#00669E', '#005587',
    '#004470', '#003359', '#6bb8e0', '#4da8d4', '#3498c8',
    '#2488bc', '#1478b0', '#0468a4', '#005898', '#004888'
];

// ─── Custom Tooltip for Evolução Chart ─────────────────────────────

function EvolucaoTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;

    // Sort entries from largest to smallest
    const sorted = [...payload].sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
    const total = sorted.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 min-w-[220px]">
            <p className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">{label}</p>
            <div className="space-y-2">
                {sorted.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: entry.stroke || entry.color }}
                            />
                            <span className="text-xs text-gray-600 truncate">{entry.dataKey}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">
                            {(entry.value || 0).toLocaleString("pt-BR")}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                <span className="text-sm font-bold text-[#009FE3] tabular-nums">
                    {total.toLocaleString("pt-BR")}
                </span>
            </div>
        </div>
    );
}

// ─── Page Component ────────────────────────────────────────────────

export default function DashboardAnualPage() {
    const contentRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const isGerente = user?.nivel_acesso === "gerente";
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [entidade, setEntidade] = useState<Entidade | "">("");
    const [unidade, setUnidade] = useState<UnidadeSESI | "">("");
    const [equipe, setEquipe] = useState<string>("");
    const [drilldown, setDrilldown] = useState<DrilldownState>({ open: false, title: '', tipo: '', valor: '' });
    const [drilldownPage, setDrilldownPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const openDrilldown = useCallback((title: string, tipo: string, valor: string) => {
        setDrilldownPage(1);
        setDrilldown({ open: true, title, tipo, valor });
    }, []);

    const closeDrilldown = useCallback(() => {
        setDrilldown(d => ({ ...d, open: false }));
    }, []);

    // Fetch casas
    const { data: casasList } = useQuery<string[]>({
        queryKey: ["casas"],
        queryFn: () => apiRequest("/api/casas"),
    });

    const equipesOptions = useMemo(() => {
        if (!isGerente) return [];
        return getEquipesForEntidade(casasList, entidade || null);
    }, [isGerente, casasList, entidade]);

    const selectedCasas = useMemo(() => {
        if (isGerente) {
            return getCasasForFiltroGerente(casasList, entidade || null, equipe || null);
        }
        return getCasasForFiltro(casasList, entidade || null, unidade || null);
    }, [isGerente, casasList, entidade, unidade, equipe]);

    // Converter período do filtro anual para datas de exportação
    const exportDateRange = useMemo(() => {
        if (selectedMonths.length > 0) {
            const sortedMonths = [...selectedMonths].sort();
            const firstMonth = sortedMonths[0];
            const lastMonth = sortedMonths[sortedMonths.length - 1];
            
            const startDate = new Date(selectedYear, firstMonth - 1, 1);
            const endDate = new Date(selectedYear, lastMonth - 1, new Date(selectedYear, lastMonth, 0).getDate());
            
            return {
                startDate: format(startDate, "yyyy-MM-dd"),
                endDate: format(endDate, "yyyy-MM-dd")
            };
        } else {
            // Se nenhum mês selecionado, usa o ano inteiro
            return {
                startDate: `${selectedYear}-01-01`,
                endDate: `${selectedYear}-12-31`
            };
        }
    }, [selectedYear, selectedMonths]);

    const casaParam = selectedCasas.length > 0
        ? selectedCasas.map(c => `&casa=${encodeURIComponent(c)}`).join('')
        : "";

    const monthParam = selectedMonths.length > 0
        ? selectedMonths.map(m => `&month=${m}`).join('')
        : "";

    const { data: stats, isLoading, refetch } = useQuery<AnualStatsData>({
        queryKey: ["anual-stats", selectedYear, selectedMonths, selectedCasas],
        queryFn: () => apiRequest(`/api/anual-stats?year=${selectedYear}${monthParam}${casaParam}`),
    });

    // Fetch drilldown data
    const { data: drilldownData, isLoading: drilldownLoading } = useQuery<DrilldownRecord[]>({
        queryKey: ['anual-drilldown', selectedYear, selectedMonths, selectedCasas, drilldown.tipo, drilldown.valor],
        queryFn: () => apiRequest(`/api/anual-drilldown?year=${selectedYear}${monthParam}${casaParam}&tipo=${encodeURIComponent(drilldown.tipo)}&valor=${encodeURIComponent(drilldown.valor)}`),
        enabled: drilldown.open && !!drilldown.tipo,
    });

    // ─── Transform evolucao data for line chart ────────────────────
    const { chartData, canais } = useMemo(() => {
        if (!stats?.evolucao?.length) return { chartData: [], canais: [] };

        // Get unique canais
        const uniqueCanais = Array.from(new Set(stats.evolucao.map(e => e.canal))).sort();

        // Build one row per month
        const monthData = MONTH_NAMES.map((name, idx) => {
            const row: Record<string, any> = { mes: name };
            uniqueCanais.forEach(canal => {
                const entry = stats.evolucao.find(e => e.mes === idx + 1 && e.canal === canal);
                row[canal] = entry?.total || 0;
            });
            return row;
        });

        return { chartData: monthData, canais: uniqueCanais };
    }, [stats?.evolucao]);

    // ─── Prazo percentages ─────────────────────────────────────────
    const prazoData = useMemo(() => {
        if (!stats?.prazo) return { dentroPct: 0, foraPct: 0, total: 0, dentro: 0, fora: 0 };
        const dentro = Number(stats.prazo.dentro) || 0;
        const fora = Number(stats.prazo.fora) || 0;
        const total = dentro + fora;
        if (total === 0) return { dentroPct: 0, foraPct: 0, total: 0, dentro: 0, fora: 0 };
        return {
            dentroPct: (dentro / total) * 100,
            foraPct: (fora / total) * 100,
            total,
            dentro,
            fora,
        };
    }, [stats?.prazo]);

    // ─── Origem percentages ────────────────────────────────────────
    const origemData = useMemo(() => {
        if (!stats?.porOrigem?.length) return [];
        const total = stats.porOrigem.reduce((sum, item) => sum + item.total, 0);
        return stats.porOrigem.map(item => ({
            ...item,
            percent: total > 0 ? (item.total / total) * 100 : 0,
        }));
    }, [stats?.porOrigem]);

    // ─── Year navigation ──────────────────────────────────────────
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const rankingAssuntos = useMemo(() => {
        if (!stats?.porAssunto?.length) return [];
        return agruparAssuntos(stats.porAssunto as any);
    }, [stats?.porAssunto]);

    if (isLoading) {
        return (
            <Layout title="Dashboard - SAC" subtitle="Visão anual de atendimentos">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-gray-400">Carregando dados anuais...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard - SAC" subtitle="Visão anual de atendimentos">
            {/* Filter Bar - Professional Layout - Theme Aware */}
            <div className="rounded-xl border border-gray-200 dark:border-[#165A8A] overflow-hidden bg-white dark:bg-[#0C2135] shadow-sm">
                {/* Header */}
                <div className="px-5 py-3 border-b border-gray-200 dark:border-[#165A8A]/40 bg-gray-50 dark:bg-[#081E30]/50 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#009FE3] animate-pulse" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-wide">Filtros de Análise</span>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Dashboard SAC • {selectedYear}</span>
                </div>
                
                {/* Filters Grid */}
                <div className="p-5 bg-white dark:bg-[#0C2135]">
                    <div className="flex flex-col lg:flex-row gap-5">
                        {/* Group 1: Entity & Team */}
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            {/* Entidade */}
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3" />
                                    Entidade
                                </label>
                                <SelectCustom
                                    value={entidade || ""}
                                    onValueChange={(value) => {
                                        setEntidade(value as Entidade | "");
                                        setUnidade("");
                                        setEquipe("");
                                    }}
                                    placeholder="Todas as Entidades"
                                    panelTitle="Selecionar Entidade"
                                    options={[
                                        { value: "", label: "Todas as Entidades" },
                                        { value: "SENAI", label: "SENAI" },
                                        { value: "SESI", label: "SESI" },
                                        { value: "IEL", label: "IEL" },
                                        ...(isGerente ? [{ value: "Outros", label: "Outros" }] : []),
                                    ]}
                                />
                            </div>

                            {/* Equipe/Unidade */}
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
                                    <Users className="w-3 h-3" />
                                    {isGerente ? "Equipe" : "Unidade"}
                                </label>
                                {isGerente ? (
                                    <SelectCustom
                                        value={equipe || ""}
                                        onValueChange={(value) => setEquipe(value)}
                                        placeholder="Todas as Equipes"
                                        disabled={!entidade}
                                        panelTitle="Selecionar Equipe"
                                        options={[
                                            { value: "", label: "Todas as Equipes" },
                                            ...equipesOptions,
                                        ]}
                                    />
                                ) : (
                                    <SelectCustom
                                        value={unidade || ""}
                                        onValueChange={(value) => setUnidade(value as UnidadeSESI | "")}
                                        placeholder="Todas as Unidades"
                                        disabled={entidade !== "SESI"}
                                        panelTitle="Selecionar Unidade"
                                        options={[
                                            { value: "", label: "Todas as Unidades" },
                                            { value: "SESI ESCOLA", label: "SESI ESCOLA" },
                                            { value: "SESI CLUBE", label: "SESI CLUBE" },
                                            { value: "SESI SAÚDE", label: "SESI SAÚDE" }
                                        ]}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px bg-gray-200 dark:bg-[#165A8A]/30" />

                        {/* Group 2: Period */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                Período
                            </label>
                            <MonthPicker
                                selectedMonths={selectedMonths}
                                selectedYear={selectedYear}
                                onChangeMonths={setSelectedMonths}
                                onChangeYear={setSelectedYear}
                            />
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px bg-gray-200 dark:bg-[#165A8A]/30" />

                        {/* Group 3: Actions */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
                                <Settings2 className="w-3 h-3" />
                                Ações
                            </label>
                            <div className="flex items-center gap-2">
                                <ExportReportDialog
                                    selectedCasas={selectedCasas}
                                    contentRef={contentRef}
                                    pdfTitle="Dashboard - SAC"
                                    startDate={exportDateRange.startDate}
                                    endDate={exportDateRange.endDate}
                                    pdfSubtitle={
                                        entidade
                                            ? `Visão de Atendimentos - Entidade: ${entidade}${entidade === "SESI" && unidade ? ` · Unidade: ${unidade}` : ""}`
                                            : "Visão de Atendimentos - Todas as Entidades"
                                    }
                                />
                                <button
                                    onClick={() => refetch()}
                                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#060e1a]/80 border border-gray-200 dark:border-[#1a3a5c]/80 rounded-xl hover:border-[#009FE3]/40 hover:bg-white dark:hover:bg-[#0a1929] hover:text-[#009FE3] dark:hover:text-white transition-all duration-300"
                                    title="Atualizar dados"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(entidade || selectedMonths.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#165A8A]/20 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-600 dark:text-gray-500 uppercase tracking-wider">Filtros ativos:</span>
                            {entidade && (
                                <span className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {entidade}
                                </span>
                            )}
                            {(isGerente ? equipe : unidade) && (
                                <span className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {isGerente ? equipe : unidade}
                                </span>
                            )}
                            {selectedMonths.length > 0 && (
                                <span className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {selectedMonths.length} {selectedMonths.length === 1 ? 'mês' : 'meses'}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setEntidade("");
                                    setUnidade("");
                                    setEquipe("");
                                    setSelectedMonths([]);
                                }}
                                className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div ref={contentRef} className="space-y-4">
            {/* 1. Evolução dos Atendimentos — Line Chart */}
            <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        Evolução dos Atendimentos
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[450px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 10, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#165A8A" />
                                <XAxis
                                    dataKey="mes"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tick={{ fill: '#9ca3af' }}
                                />
                                <YAxis stroke="#6b7280" fontSize={11} />
                                <RechartsTooltip content={<EvolucaoTooltip />} />
                                <Legend
                                    wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '10px' }}
                                />
                                {canais.map((canal, idx) => (
                                    <Line
                                        key={canal}
                                        type="monotone"
                                        dataKey={canal}
                                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                        connectNulls
                                    >
                                        <LabelList
                                            dataKey={canal}
                                            position="top"
                                            fill={LINE_COLORS[idx % LINE_COLORS.length]}
                                            fontSize={9}
                                            offset={8}
                                            formatter={(v: number) => v > 0 ? v.toLocaleString("pt-BR") : ""}
                                        />
                                    </Line>
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Nenhum dado disponível para {selectedYear}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* PDF-only: Evolução — Tabela Resumo Mensal por Canal */}
            <div data-pdf-only style={{ display: "none" }}>
                <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            Resumo Mensal por Canal — {selectedYear}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-[#165A8A]">
                                        <th className="text-left text-gray-400 uppercase tracking-wider py-2 px-2 font-semibold">Canal</th>
                                        {MONTH_NAMES.map((m) => (
                                            <th key={m} className="text-right text-gray-400 uppercase tracking-wider py-2 px-1.5 font-semibold">{m}</th>
                                        ))}
                                        <th className="text-right text-gray-300 uppercase tracking-wider py-2 px-2 font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {canais.map((canal, idx) => {
                                        const rowTotal = chartData.reduce((sum, row) => sum + (Number(row[canal]) || 0), 0);
                                        return (
                                            <tr key={canal} className={idx % 2 === 0 ? "bg-white/[0.02]" : ""}>
                                                <td className="py-1.5 px-2 text-gray-300 font-medium whitespace-nowrap">{canal}</td>
                                                {chartData.map((row, mi) => (
                                                    <td key={mi} className="py-1.5 px-1.5 text-gray-400 text-right tabular-nums">
                                                        {(Number(row[canal]) || 0).toLocaleString("pt-BR")}
                                                    </td>
                                                ))}
                                                <td className="py-1.5 px-2 text-white font-bold text-right tabular-nums">{rowTotal.toLocaleString("pt-BR")}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Totals row */}
                                    <tr className="border-t border-[#165A8A] font-bold">
                                        <td className="py-2 px-2 text-gray-200">TOTAL</td>
                                        {chartData.map((row, mi) => {
                                            const monthTotal = canais.reduce((sum, c) => sum + (Number(row[c]) || 0), 0);
                                            return <td key={mi} className="py-2 px-1.5 text-white text-right tabular-nums">{monthTotal.toLocaleString("pt-BR")}</td>;
                                        })}
                                        <td className="py-2 px-2 text-cyan-400 text-right tabular-nums">
                                            {canais.reduce((total, c) => total + chartData.reduce((sum, row) => sum + (Number(row[c]) || 0), 0), 0).toLocaleString("pt-BR")}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2 + 4: Origem + Prazo side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* 2. Atendimentos por Origem */}
                <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <Headphones className="w-5 h-5 text-orange-400" />
                            Atendimentos por Origem
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {origemData.length > 0 ? (
                            <div className="space-y-5">
                                {origemData.map((item, idx) => {
                                    const barColor = LINE_COLORS[idx % LINE_COLORS.length];
                                    return (
                                        <Tooltip key={item.nome}>
                                            <TooltipTrigger asChild>
                                                <div className="group cursor-pointer hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors" onDoubleClick={() => openDrilldown(`Origem: ${item.nome}`, 'origem', item.nome)}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                                                            <span className="text-sm font-medium text-gray-300">{item.nome}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-gray-300">
                                                                {item.total.toLocaleString("pt-BR")}
                                                            </span>
                                                            <span className="text-xl font-bold text-white min-w-[60px] text-right">
                                                                {item.percent.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="relative h-7 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                                            style={{
                                                                width: `${Math.max(item.percent, 2)}%`,
                                                                background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="bg-white text-[#0C2135] border border-gray-200 shadow-xl rounded-xl px-5 py-4"
                                                sideOffset={8}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: barColor }} />
                                                    <p className="font-bold text-sm">{item.nome}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                                                        <p className="text-lg font-bold">{item.total.toLocaleString("pt-BR")}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-gray-200" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Participação</p>
                                                        <p className="text-lg font-bold" style={{ color: barColor }}>{item.percent.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 4. Atendimentos Dentro e Fora do Prazo */}
                <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-400" />
                            Atendimentos Dentro e Fora do Prazo
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">Prazo: até 24 horas entre início e fim</p>
                    </CardHeader>
                    <CardContent>
                        {prazoData.total > 0 ? (
                            <div className="space-y-6 pt-4">
                                {/* Dentro do Prazo */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-pointer hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors" onDoubleClick={() => openDrilldown('Dentro do Prazo', 'prazo', 'dentro')}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium text-gray-300">Dentro do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-gray-300">
                                                        {prazoData.dentro.toLocaleString("pt-BR")}
                                                    </span>
                                                    <span className="text-2xl font-bold text-emerald-400">
                                                        {prazoData.dentroPct.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative h-9 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${prazoData.dentroPct}%`,
                                                        background: 'linear-gradient(90deg, #00A65099, #00A650)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="bg-white text-[#0C2135] border border-gray-200 shadow-xl rounded-xl px-5 py-4"
                                        sideOffset={8}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <p className="font-bold text-sm">Dentro do Prazo</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Atendimentos</p>
                                                <p className="text-lg font-bold">{prazoData.dentro.toLocaleString("pt-BR")}</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Percentual</p>
                                                <p className="text-lg font-bold text-emerald-600">{prazoData.dentroPct.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                {/* Fora do Prazo */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-pointer hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors" onDoubleClick={() => openDrilldown('Fora do Prazo', 'prazo', 'fora')}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium text-gray-300">Fora do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-gray-300">
                                                        {prazoData.fora.toLocaleString("pt-BR")}
                                                    </span>
                                                    <span className="text-2xl font-bold text-red-400">
                                                        {prazoData.foraPct.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative h-9 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${Math.max(prazoData.foraPct, 2)}%`,
                                                        background: 'linear-gradient(90deg, #ED1C2499, #ED1C24)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="bg-white text-[#0C2135] border border-gray-200 shadow-xl rounded-xl px-5 py-4"
                                        sideOffset={8}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500" />
                                            <p className="font-bold text-sm">Fora do Prazo</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Atendimentos</p>
                                                <p className="text-lg font-bold">{prazoData.fora.toLocaleString("pt-BR")}</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Percentual</p>
                                                <p className="text-lg font-bold text-red-600">{prazoData.foraPct.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                {/* Summary circle */}
                                <div className="flex justify-center pt-4">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                            <circle
                                                cx="18" cy="18" r="15.9" fill="none"
                                                stroke="#00A650"
                                                strokeWidth="3"
                                                strokeDasharray={`${prazoData.dentroPct} ${100 - prazoData.dentroPct}`}
                                                strokeDashoffset="25"
                                                strokeLinecap="round"
                                                className="transition-all duration-1000"
                                            />
                                            <circle
                                                cx="18" cy="18" r="15.9" fill="none"
                                                stroke="#ED1C24"
                                                strokeWidth="3"
                                                strokeDasharray={`${prazoData.foraPct} ${100 - prazoData.foraPct}`}
                                                strokeDashoffset={`${25 - prazoData.dentroPct}`}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-white">
                                                {prazoData.total.toLocaleString("pt-BR")}
                                            </span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total</span>
                                        </div>
                                    </div>
                                </div >
                            </div >
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )
                        }
                    </CardContent >
                </Card >
            </div >

            {/* 3. Atendimentos por Assunto — Bar Chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-sky-400" />
                            Ranking de Assuntos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[600px]">
                        {rankingAssuntos.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={rankingAssuntos}
                                    layout="vertical"
                                    margin={{ left: 10, right: 60 }}
                                    onClick={(data: any) => {
                                        if (data?.activePayload?.[0]) {
                                            const item = data.activePayload[0].payload;
                                            const originals = item.originalNames || [item.nome];
                                            openDrilldown(`Assunto: ${item.nome}`, 'assunto', originals.join('|||'));
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
                                    <XAxis type="number" stroke="#6b7280" fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="nome"
                                        width={140}
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tick={{ fill: '#9ca3af' }}
                                    />
                                    <RechartsTooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [value.toLocaleString("pt-BR"), "Atendimentos"]}
                                    />
                                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={22}>
                                        {rankingAssuntos.map((_, index) => (
                                            <Cell key={`assunto-${index}`} fill={ASSUNTO_COLORS[index % ASSUNTO_COLORS.length]} className="cursor-pointer" />
                                        ))}
                                        <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Insights Panel */}
                {rankingAssuntos.length ? (() => {
                    const sorted = [...rankingAssuntos].sort((a, b) => b.total - a.total);
                    const grandTotal = sorted.reduce((s, i) => s + i.total, 0);
                    const top3Total = sorted.slice(0, 3).reduce((s, i) => s + i.total, 0);
                    const top5Total = sorted.slice(0, 5).reduce((s, i) => s + i.total, 0);
                    const top3Pct = grandTotal > 0 ? ((top3Total / grandTotal) * 100).toFixed(1) : "0";
                    const top5Pct = grandTotal > 0 ? ((top5Total / grandTotal) * 100).toFixed(1) : "0";
                    const threshold = Math.round(grandTotal * 0.05);
                    const longTail = sorted.filter(i => i.total < threshold).length;

                    return (
                        <div className="space-y-3">
                            <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-white text-sm font-bold">Insights</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4 pb-4">
                                    {sorted.slice(0, 3).map((item, i) => (
                                        <div key={i} className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                                            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top {i + 1}</span>
                                            <p className="text-white font-bold text-sm mt-0.5">{item.nome}</p>
                                            <p className="text-gray-400 text-xs">{item.total.toLocaleString("pt-BR")}</p>
                                        </div>
                                    ))}
                                    <div className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top 3 no Total</span>
                                        <p className="text-white font-bold text-lg mt-0.5">{top3Pct}%</p>
                                    </div>
                                    <div className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top 5 no Total</span>
                                        <p className="text-white font-bold text-lg mt-0.5">{top5Pct}%</p>
                                    </div>
                                    <div className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Cauda Longa</span>
                                        <p className="text-white font-bold text-sm mt-0.5">{longTail} assuntos abaixo de {threshold.toLocaleString("pt-BR")}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })() : null}
            </div>
            </div>

            {/* ─── Drill-down Modal ─────────────────────────────────── */}
            < Dialog open={drilldown.open} onOpenChange={(open) => !open && closeDrilldown()}>
                <DialogContent className="bg-[#0C2135] border-[#165A8A] text-white max-w-[95vw] w-[1200px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg flex items-center gap-2">
                            <Filter className="w-5 h-5 text-blue-400" />
                            {drilldown.title}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Atendimentos filtrados • {selectedYear}
                            {drilldownData && ` • ${drilldownData.length.toLocaleString('pt-BR')} registros`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto min-h-0">
                        {drilldownLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                                <span className="text-gray-400 ml-3">Carregando...</span>
                            </div>
                        ) : drilldownData && drilldownData.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#165A8A]">
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Protocolo</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Contato</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Canal</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Início</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Fim</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Resumo</th>
                                                <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Casa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drilldownData
                                                .slice((drilldownPage - 1) * ITEMS_PER_PAGE, drilldownPage * ITEMS_PER_PAGE)
                                                .map((row, idx) => {
                                                    const formatDate = (d: string) => {
                                                        if (!d) return '—';
                                                        try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); }
                                                        catch { return d; }
                                                    };
                                                    return (
                                                        <tr key={`${row.protocolo}-${idx}`} className="border-b border-[#165A8A]/50 hover:bg-white/5 transition-colors">
                                                            <td className="py-2.5 px-3 text-blue-300 font-mono text-xs">{row.protocolo}</td>
                                                            <td className="py-2.5 px-3 text-gray-200">{row.contato || row.identificador || '—'}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                                                    {row.canal}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-gray-300 text-xs">{formatDate(row.dataHoraInicio)}</td>
                                                            <td className="py-2.5 px-3 text-gray-300 text-xs">{formatDate(row.dataHoraFim)}</td>
                                                            <td className="py-2.5 px-3 text-gray-200 max-w-[200px] truncate">{row.resumoConversa || '—'}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`text-xs font-medium ${row.casa === 'Falta de Interação' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    {row.casa}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {drilldownData.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#165A8A]">
                                        <span className="text-xs text-gray-400">
                                            Mostrando {((drilldownPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(drilldownPage * ITEMS_PER_PAGE, drilldownData.length)} de {drilldownData.length.toLocaleString('pt-BR')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setDrilldownPage(p => Math.max(1, p - 1))}
                                                disabled={drilldownPage === 1}
                                                className="px-3 py-1 text-xs text-gray-300 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                                            >
                                                ‹ Anterior
                                            </button>
                                            <span className="text-xs text-gray-400">
                                                {drilldownPage} / {Math.ceil(drilldownData.length / ITEMS_PER_PAGE)}
                                            </span>
                                            <button
                                                onClick={() => setDrilldownPage(p => Math.min(Math.ceil(drilldownData.length / ITEMS_PER_PAGE), p + 1))}
                                                disabled={drilldownPage >= Math.ceil(drilldownData.length / ITEMS_PER_PAGE)}
                                                className="px-3 py-1 text-xs text-gray-300 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                                            >
                                                Próximo ›
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center py-16 text-gray-500">
                                Nenhum registro encontrado
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog >
        </Layout >
    );
}
