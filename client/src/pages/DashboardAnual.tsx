import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CasaPicker } from "@/components/ui/casa-picker";
import {
    RefreshCw, TrendingUp, Headphones, FileText, Clock, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface AnualStatsData {
    evolucao: Array<{ mes: number; canal: string; total: number }>;
    porOrigem: Array<{ nome: string; total: number }>;
    porAssunto: Array<{ nome: string; total: number }>;
    prazo: { dentro: number; fora: number };
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
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedCasas, setSelectedCasas] = useState<string[]>([]);

    // Fetch casas
    const { data: casasList } = useQuery<string[]>({
        queryKey: ["casas"],
        queryFn: () => apiRequest("/api/casas"),
    });

    const casaParam = selectedCasas.length > 0
        ? selectedCasas.map(c => `&casa=${encodeURIComponent(c)}`).join('')
        : "";

    const { data: stats, isLoading, refetch } = useQuery<AnualStatsData>({
        queryKey: ["anual-stats", selectedYear, selectedCasas],
        queryFn: () => apiRequest(`/api/anual-stats?year=${selectedYear}${casaParam}`),
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

    if (isLoading) {
        return (
            <Layout title="Dashboard Anual" subtitle="Visão anual de atendimentos">
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
        <Layout title="Dashboard Anual" subtitle="Visão anual de atendimentos">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0C2135] rounded-xl px-4 py-3 border border-[#165A8A] gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-300 font-medium">Dados Anuais</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Casa filter */}
                    <CasaPicker
                        value={selectedCasas}
                        casas={casasList || []}
                        onChange={setSelectedCasas}
                    />
                    {/* Year picker */}
                    <div className="flex items-center gap-1 bg-[#061726] border border-[#165A8A] rounded-lg px-1">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-gray-200 text-sm font-medium px-2 py-1.5 focus:outline-none cursor-pointer appearance-none text-center"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y} className="bg-[#0C2135]">{y}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setSelectedYear(y => Math.min(currentYear, y + 1))}
                            disabled={selectedYear >= currentYear}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* 1. Evolução dos Atendimentos — Line Chart */}
            <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        Evolução dos Atendimentos
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[380px]">
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
                                    />
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
                                                <div className="group cursor-default">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                                                            <span className="text-sm font-medium text-gray-300">{item.nome}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-gray-500">
                                                                {item.total.toLocaleString("pt-BR")}
                                                            </span>
                                                            <span className="text-lg font-bold text-white min-w-[60px] text-right">
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
                                        <div className="cursor-default">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium text-gray-300">Dentro do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500">
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
                                        <div className="cursor-default">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium text-gray-300">Fora do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500">
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
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. Atendimentos por Assunto — Horizontal Bar Chart */}
            <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        Atendimentos por Assunto
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[500px]">
                    {stats?.porAssunto?.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.porAssunto}
                                layout="vertical"
                                margin={{ left: 10, right: 30 }}
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
                                    {stats.porAssunto.map((_, index) => (
                                        <Cell key={`assunto-${index}`} fill={ASSUNTO_COLORS[index % ASSUNTO_COLORS.length]} />
                                    ))}
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
        </Layout>
    );
}
