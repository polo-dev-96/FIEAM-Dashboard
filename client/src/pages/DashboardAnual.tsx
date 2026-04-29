/*
 * ============================================================
 * pages/DashboardAnual.tsx — Dashboard SAC Anual
 * ============================================================
 *
 * Painel de análise estratégica com visão anual dos atendimentos.
 * Usa os mesmos filtros de entidade/unidade do Overview, mas
 * o período é selecionado por ANO + MÊS em vez de intervalo de datas.
 *
 * Funcionalidades:
 *   - Filtros: Ano, Mês (MonthPicker), Entidade, Unidade SESI, Equipe
 *   - Gráfico de Evolução: atendimentos por mês e canal (LineChart)
 *   - Gráfico de Origem: atendimentos por canal no período (BarChart)
 *   - Gráfico de Assuntos: assuntos mais frequentes (BarChart)
 *   - Prazo SLA: dentro/fora do prazo (BarChart)
 *   - Drill-down: clicar em barras abre modal com lista de atendimentos
 *   - Exportação: PDF e Excel via ExportReportDialog
 *
 * Dados buscados via React Query:
 *   - GET /api/anual-stats → dados de evolução, origem, assuntos e prazo
 *   - GET /api/casas       → lista de casas para os filtros
 *   - GET /api/drilldown   → (sob demanda) lista detalhada ao clicar num gráfico
 *
 * Diferença principal vs Overview:
 *   - MonthPicker em vez de DateRangePicker
 *   - Foca em análise histórica e tendências por mês/canal
 * ============================================================
 */

import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Recharts: componentes de gráfico
// LineChart/Line → gráfico de linhas (evolução mensal)
// BarChart/Bar   → gráfico de barras (origem, assuntos, prazo)
// Legend         → legenda dos gráficos com múltiplas séries
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend, LabelList
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// MonthPicker: seletor de mês/ano (diferente do DateRangePicker do Overview)
import { MonthPicker } from "@/components/ui/month-picker";
import { SelectCustom } from "@/components/ui/select-custom";
import { SelectMulti } from "@/components/ui/select-multi";
import { ExportReportDialog } from "@/components/ui/export-report-dialog";
import { ChartCard } from "@/components/ui/chart-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { CHART_COLORS, getTooltipStyle, getGridStroke, getAxisColor, getAxisTickFill, barGradientDefs, getBarGradient, PremiumTooltip } from "@/lib/chart-utils";

import {
    RefreshCw, TrendingUp, Headphones, FileText, Clock, Filter,
    Building2, Users, CalendarDays, Settings2
} from "lucide-react";

import { useState, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { agruparAssuntos, Entidade, UnidadeSESI, getCasasForFiltro, getCasasForFiltroGerente, getEquipesForEntidade, getCasasForEquipeLabels, isArianaUser } from "@/lib/entidadeMapping";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

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

// ─── Helpers: Normalização de Canais ────────────────────────────────

function normalizarCanal(canal: string): string {
    const lower = (canal || "").toLowerCase().trim();
    if (lower.includes("instagram")) return "Instagram Direct";
    if (lower.includes("messenger")) return "Messenger";
    if (lower.includes("whatsapp"))  return "Whatsapp";
    if (lower.includes("web"))       return "Web";
    if (lower.includes("email"))     return "Email";
    if (lower.includes("sms"))       return "SMS";
    return canal.replace(/\s+(SENAI|SESI|IEL)$/i, "").trim() || canal;
}

// Cores fixas por canal (alta distinção visual)
const CANAL_COLORS: Record<string, string> = {
    "Whatsapp":          "#10B981", // verde
    "Instagram Direct":  "#F97316", // laranja
    "Messenger":         "#3B82F6", // azul royal
    "Web":               "#64748B", // cinza slate
    "Email":             "#7C5CFF", // roxo
    "SMS":               "#F59E0B", // âmbar
    "Telefone":          "#E85075", // vermelho/rosa
};

function getCanalColor(canal: string): string {
    return CANAL_COLORS[normalizarCanal(canal)] ?? CANAL_COLORS[canal] ?? '#1CB5E9';
}

const LINE_COLORS = CHART_COLORS;

const ASSUNTO_COLORS = [
    '#009FE3', '#0088CC', '#0077B5', '#00669E', '#005587',
    '#004470', '#003359', '#6bb8e0', '#4da8d4', '#3498c8',
    '#2488bc', '#1478b0', '#0468a4', '#005898', '#004888'
];

// ─── Custom Tooltip for Evolução Chart ─────────────────────────────

function EvolucaoTooltip({ active, payload, label, isDark }: any) {
    if (!active || !payload || payload.length === 0) return null;
    // Default to dark if not provided (pre-existing call sites used inherited theme)
    const dark = typeof isDark === 'boolean' ? isDark : (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') !== 'light');

    const sorted = [...payload].filter((e: any) => (e.value || 0) > 0).sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
    const total = sorted.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
        <div
            style={{
                background: dark ? 'rgba(15, 42, 66, 0.96)' : 'rgba(255,255,255,0.98)',
                border: `1px solid ${dark ? 'rgba(0,159,227,0.22)' : 'rgba(15,23,41,0.08)'}`,
                borderRadius: 12,
                padding: '12px 14px',
                boxShadow: dark
                    ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,159,227,0.06)'
                    : '0 12px 32px rgba(15,23,41,0.08), 0 0 0 1px rgba(15,23,41,0.04)',
                backdropFilter: 'blur(12px)',
                minWidth: 240,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: dark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,41,0.05)'}`,
                }}
            >
                {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sorted.map((entry: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: 3,
                                    background: getCanalColor(entry.dataKey),
                                    boxShadow: `0 0 0 2px ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)'}`,
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.7)' : '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {normalizarCanal(entry.dataKey)}
                            </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: getCanalColor(entry.dataKey), fontVariantNumeric: 'tabular-nums' }}>
                            {(entry.value || 0).toLocaleString("pt-BR")}
                        </span>
                    </div>
                ))}
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,41,0.05)'}`,
                }}
            >
                <span style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.5)' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Total
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#009FE3', fontVariantNumeric: 'tabular-nums' }}>
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
    const { isDark } = useTheme();
    const isGerente = user?.nivel_acesso === "gerente" || user?.nivel_acesso === "master";
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [selectedEntidades, setSelectedEntidades] = useState<Entidade[]>([]); // <--- Updated state for multi-select
    const [unidade, setUnidade] = useState<UnidadeSESI | "">("")
    const [selectedEquipes, setSelectedEquipes] = useState<string[]>([]); // <--- Updated state for multi-select
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
        const allEquipes = new Map<string, string>();
        if (selectedEntidades.length === 0) {
            (casasList || []).forEach(casa => {
                allEquipes.set(casa, casa);
            });
        } else {
            selectedEntidades.forEach(ent => {
                const equipes = getEquipesForEntidade(casasList, ent);
                equipes.forEach(eq => {
                    allEquipes.set(eq.value, eq.label);
                });
            });
        }
        return Array.from(allEquipes.entries()).map(([value, label]) => ({ value, label }));
    }, [isGerente, casasList, selectedEntidades]);

    const selectedCasas = useMemo(() => {
        if (!casasList) return [];
        
        if (isGerente) {
            if (selectedEquipes.length > 0) {
                return getCasasForEquipeLabels(casasList, selectedEntidades, selectedEquipes);
            }
            if (selectedEntidades.length > 0) {
                const allCasas = new Set<string>();
                selectedEntidades.forEach(ent => {
                    const casas = getCasasForFiltroGerente(casasList, ent, null);
                    casas.forEach(c => allCasas.add(c));
                });
                return Array.from(allCasas);
            }
            // Para Ariana, "Todas as Entidades" deve filtrar apenas casas mapeadas
            if (isArianaUser()) {
                const allCasas = new Set<string>();
                (["SENAI", "SESI", "IEL"] as Entidade[]).forEach(ent => {
                    const casas = getCasasForFiltroGerente(casasList, ent, null);
                    casas.forEach(c => allCasas.add(c));
                });
                return Array.from(allCasas);
            }
            return [];
        }
        
        const entidade = selectedEntidades[0] || null;
        return getCasasForFiltro(casasList, entidade, unidade || null);
    }, [isGerente, casasList, selectedEntidades, unidade, selectedEquipes]);

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

        // Normaliza e soma canais com o mesmo nome base
        const rawMap = new Map<string, Map<number, number>>();
        for (const e of stats.evolucao) {
            const nome = normalizarCanal(e.canal);
            if (!rawMap.has(nome)) rawMap.set(nome, new Map());
            const mesMap = rawMap.get(nome)!;
            mesMap.set(e.mes, (mesMap.get(e.mes) || 0) + e.total);
        }

        const uniqueCanais = Array.from(rawMap.keys()).sort();

        const monthData = MONTH_NAMES.map((name, idx) => {
            const mes = idx + 1;
            const row: Record<string, any> = { mes: name };
            uniqueCanais.forEach(canal => {
                row[canal] = rawMap.get(canal)?.get(mes) || 0;
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
        // Agrupa por canal normalizado
        const map = new Map<string, number>();
        for (const item of stats.porOrigem) {
            const nome = normalizarCanal(item.nome);
            map.set(nome, (map.get(nome) || 0) + item.total);
        }
        const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0);
        return Array.from(map.entries()).map(([nome, value]) => ({
            nome,
            total: value,
            percent: total > 0 ? (value / total) * 100 : 0,
        })).sort((a, b) => b.total - a.total);
    }, [stats?.porOrigem]);

    // ─── Year navigation ──────────────────────────────────────────
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const rankingAssuntos = useMemo(() => {
        if (!stats?.porAssunto?.length) return [];
        return agruparAssuntos(stats.porAssunto as any).slice(0, 20);
    }, [stats?.porAssunto]);

    if (isLoading) {
        return (
            <Layout title="Dashboard - SAC" subtitle="Visão anual de atendimentos">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-[#009FE3]/30 border-t-[#009FE3] rounded-full animate-spin" />
                        <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Carregando dados anuais...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard - SAC" subtitle="Visão anual de atendimentos">
            {/* Filter Bar — Premium Glass */}
            <div className={cn(
                "rounded-2xl border overflow-hidden animate-fade-up",
                isDark
                    ? "border-[#1E3A5F]/60 bg-[#0C2135]/90 backdrop-blur-xl shadow-lg shadow-black/20"
                    : "border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-5 py-3 border-b flex items-center gap-3",
                    isDark ? "border-[#1E3A5F]/40 bg-[#081E30]/60" : "border-slate-100 bg-slate-50/80"
                )}>
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-[#009FE3]" />
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#009FE3] animate-ping opacity-75" />
                    </div>
                    <span className={cn("text-sm font-semibold tracking-wide", isDark ? "text-gray-200" : "text-gray-800")}>Filtros de Análise</span>
                    <div className="flex-1" />
                    <span className={cn("text-[11px] font-medium", isDark ? "text-gray-500" : "text-gray-400")}>Dashboard SAC • {selectedYear}</span>
                </div>
                
                {/* Filters Grid */}
                <div className={cn("p-5", isDark ? "bg-[#0C2135]" : "bg-white")}>
                    <div className="flex flex-col lg:flex-row gap-5">
                        {/* Group 1: Entity & Team */}
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            {/* Entidade */}
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3" />
                                    Entidade
                                </label>
                                <SelectMulti
                                    values={selectedEntidades}
                                    onValuesChange={(values) => {
                                        setSelectedEntidades(values as Entidade[]);
                                        setSelectedEquipes([]);
                                    }}
                                    placeholder="Todas as Entidades"
                                    panelTitle="Selecionar Entidades"
                                    options={[
                                        { value: "SENAI", label: "SENAI" },
                                        { value: "SESI", label: "SESI" },
                                        { value: "IEL", label: "IEL" },
                                    ]}
                                />
                            </div>

                            {/* Equipe/Unidade */}
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Users className="w-3 h-3" />
                                    {isGerente ? "Equipe" : "Unidade"}
                                </label>
                                {isGerente ? (
                                    <SelectMulti
                                        values={selectedEquipes}
                                        onValuesChange={setSelectedEquipes}
                                        placeholder="Todas as Equipes"
                                        disabled={selectedEntidades.length === 0}
                                        panelTitle="Selecionar Equipes"
                                        options={equipesOptions}
                                    />
                                ) : (
                                    <SelectCustom
                                        value={unidade || ""}
                                        onValueChange={(value) => setUnidade(value as UnidadeSESI | "")}
                                        placeholder="Todas as Unidades"
                                        disabled={selectedEntidades[0] !== "SESI"}
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
                        <div className={cn("hidden lg:block w-px", isDark ? "bg-[#165A8A]/30" : "bg-slate-200")} />

                        {/* Group 2: Period */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
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
                        <div className={cn("hidden lg:block w-px", isDark ? "bg-[#165A8A]/30" : "bg-slate-200")} />

                        {/* Group 3: Actions */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
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
                                        selectedEntidades.length > 0
                                            ? `Visão de Atendimentos - Entidades: ${selectedEntidades.join(", ")}${selectedEntidades[0] === "SESI" && unidade ? ` · Unidade: ${unidade}` : ""}`
                                            : "Visão de Atendimentos - Todas as Entidades"
                                    }
                                />
                                <button
                                    onClick={() => refetch()}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all duration-300",
                                        isDark
                                            ? "text-gray-300 bg-[#060e1a]/80 border-[#1a3a5c]/80 hover:border-[#009FE3]/40 hover:bg-[#0a1929] hover:text-white"
                                            : "text-gray-600 bg-gray-100 border-gray-200 hover:border-[#009FE3]/40 hover:bg-white hover:text-[#009FE3]"
                                    )}
                                    title="Atualizar dados"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(selectedEntidades.length > 0 || selectedEquipes.length > 0 || selectedMonths.length > 0) && (
                        <div className={cn("mt-4 pt-4 border-t flex items-center gap-2 flex-wrap", isDark ? "border-[#165A8A]/20" : "border-slate-200")}>
                            <span className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-600")}>Filtros ativos:</span>
                            {selectedEntidades.map(ent => (
                                <span key={ent} className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {ent}
                                </span>
                            ))}
                            {selectedEquipes.map(eq => (
                                <span key={eq} className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {eq}
                                </span>
                            ))}
                            {selectedMonths.length > 0 && (
                                <span className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                                    {selectedMonths.length} {selectedMonths.length === 1 ? 'mês' : 'meses'}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSelectedEntidades([]);
                                    setSelectedEquipes([]);
                                    setUnidade("");
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
            <ChartCard
                title="Evolução dos Atendimentos"
                icon={<TrendingUp className="w-4 h-4" />}
                iconAccent="blue"
                isDark={isDark}
                height={460}
                className="animate-fade-up-1"
            >
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 32, right: 40, bottom: 12, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={getGridStroke(isDark)} />
                            <XAxis
                                dataKey="mes"
                                stroke={getAxisColor(isDark)}
                                fontSize={12}
                                tick={{ fill: getAxisTickFill(isDark), fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dy={8}
                            />
                            <YAxis
                                stroke={getAxisColor(isDark)}
                                fontSize={11}
                                tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={65}
                            />
                            <RechartsTooltip
                                cursor={{ stroke: isDark ? 'rgba(0,159,227,0.3)' : 'rgba(0,119,204,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                content={<EvolucaoTooltip isDark={isDark} />}
                            />
                            <Legend
                                content={(props: any) => {
                                    const { payload } = props;
                                    if (!payload) return null;
                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 20px', paddingTop: '14px' }}>
                                            {payload.map((entry: any, index: number) => {
                                                const label = normalizarCanal(entry.value);
                                                const color = getCanalColor(entry.value);
                                                return (
                                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            background: color,
                                                            flexShrink: 0,
                                                        }} />
                                                        <span style={{
                                                            color: isDark ? 'rgba(255,255,255,0.9)' : '#334155',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }}
                            />
                            {canais.map((canal, idx) => (
                                <Line
                                    key={canal}
                                    type="monotone"
                                    dataKey={canal}
                                    stroke={getCanalColor(canal)}
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: getCanalColor(canal), stroke: isDark ? '#0C2135' : '#ffffff', strokeWidth: 2 }}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: isDark ? '#0C2135' : '#ffffff' }}
                                    connectNulls
                                    animationDuration={1100 + idx * 80}
                                >
                                    <LabelList
                                        dataKey={canal}
                                        position="top"
                                        offset={18}
                                        content={(props: any) => {
                                            const { x, y, value } = props;
                                            if (!value || value <= 500) return null;
                                            const text = (value as number).toLocaleString('pt-BR');
                                            const adjustedX = (x as number) < 90 ? (x as number) + 36 : (x as number);
                                            return (
                                                <text
                                                    x={adjustedX}
                                                    y={(y as number) - 10}
                                                    textAnchor="middle"
                                                    fill={isDark ? '#ffffff' : '#0f172a'}
                                                    fontSize={11}
                                                    fontWeight={700}
                                                    stroke={isDark ? '#081422' : '#ffffff'}
                                                    strokeWidth={isDark ? 4 : 3}
                                                    paintOrder="stroke"
                                                >
                                                    {text}
                                                </text>
                                            );
                                        }}
                                    />
                                </Line>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-ds-tertiary text-sm">
                        Nenhum dado disponível para {selectedYear}
                    </div>
                )}
            </ChartCard>

            {/* PDF-only: Evolução — Tabela Resumo Mensal por Canal */}
            <div data-pdf-only style={{ display: "none" }}>
                <Card className={cn("shadow-lg", isDark ? "bg-[#0C2135] border-[#165A8A]" : "bg-white border-slate-200")}>
                    <CardHeader className="pb-2">
                        <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
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
                                                <td className="py-1.5 px-2 text-gray-300 font-medium whitespace-nowrap">{normalizarCanal(canal)}</td>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* 2. Atendimentos por Origem */}
                <ChartCard
                    title="Atendimentos por Origem"
                    icon={<Headphones className="w-4 h-4" />}
                    iconAccent="orange"
                    isDark={isDark}
                    className="animate-fade-up-2"
                >
                    <div>
                        {origemData.length > 0 ? (
                            <div className="space-y-5">
                                {origemData.map((item, idx) => {
                                    const barColor = LINE_COLORS[idx % LINE_COLORS.length];
                                    return (
                                        <Tooltip key={item.nome}>
                                            <TooltipTrigger asChild>
                                                <div className={cn("group cursor-pointer rounded-lg p-1 -m-1 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")} onDoubleClick={() => openDrilldown(`Origem: ${item.nome}`, 'origem', item.nome)}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                                                            <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>{item.nome}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn("text-sm font-semibold", isDark ? "text-gray-300" : "text-gray-600")}>
                                                                {item.total.toLocaleString("pt-BR")}
                                                            </span>
                                                            <span className={cn("text-xl font-bold min-w-[60px] text-right", isDark ? "text-white" : "text-gray-900")}>
                                                                {item.percent.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={cn("relative h-7 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
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
                            <div className="flex items-center justify-center h-[200px] text-ds-tertiary text-sm">
                                Nenhum dado disponível
                            </div>
                        )}
                    </div>
                </ChartCard>

                {/* 4. Atendimentos Dentro e Fora do Prazo */}
                <ChartCard
                    title="Atendimentos Dentro e Fora do Prazo"
                    icon={<Clock className="w-4 h-4" />}
                    iconAccent="amber"
                    isDark={isDark}
                    badge="Até 24h"
                    className="animate-fade-up-3"
                >
                    <div>
                        <p className="text-xs mb-4 text-ds-tertiary">Prazo: até 24 horas entre início e fim</p>
                        {prazoData.total > 0 ? (
                            <div className="space-y-6 pt-4">
                                {/* Dentro do Prazo */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn("cursor-pointer rounded-lg p-1 -m-1 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")} onDoubleClick={() => openDrilldown('Dentro do Prazo', 'prazo', 'dentro')}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>Dentro do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("text-sm font-semibold", isDark ? "text-gray-300" : "text-gray-600")}>
                                                        {prazoData.dentro.toLocaleString("pt-BR")}
                                                    </span>
                                                    <span className="text-2xl font-bold text-emerald-400">
                                                        {prazoData.dentroPct.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={cn("relative h-9 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
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
                                        <div className={cn("cursor-pointer rounded-lg p-1 -m-1 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")} onDoubleClick={() => openDrilldown('Fora do Prazo', 'prazo', 'fora')}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                                                    <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>Fora do prazo</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("text-sm font-semibold", isDark ? "text-gray-300" : "text-gray-600")}>
                                                        {prazoData.fora.toLocaleString("pt-BR")}
                                                    </span>
                                                    <span className="text-2xl font-bold text-red-400">
                                                        {prazoData.foraPct.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={cn("relative h-9 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
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
                                            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                                                {prazoData.total.toLocaleString("pt-BR")}
                                            </span>
                                            <span className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>Total</span>
                                        </div>
                                    </div>
                                </div >
                            </div >
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-ds-tertiary text-sm">
                                Nenhum dado disponível
                            </div>
                        )
                        }
                    </div>
                </ChartCard>
            </div>

            {/* 3. Atendimentos por Assunto — Bar Chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
                <ChartCard
                    title="Ranking de Assuntos"
                    icon={<FileText className="w-4 h-4" />}
                    iconAccent="cyan"
                    isDark={isDark}
                    height={740}
                    className="animate-fade-up-4"
                >
                    {rankingAssuntos.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rankingAssuntos}
                                layout="vertical"
                                margin={{ left: 10, right: 70, top: 6, bottom: 6 }}
                                barCategoryGap={6}
                                onClick={(data: any) => {
                                    if (data?.activePayload?.[0]) {
                                        const item = data.activePayload[0].payload;
                                        const originals = item.originalNames || [item.nome];
                                        openDrilldown(`Assunto: ${item.nome}`, 'assunto', originals.join('|||'));
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <defs>{barGradientDefs("assunto", ASSUNTO_COLORS)}</defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
                                <XAxis
                                    type="number"
                                    stroke={getAxisColor(isDark)}
                                    fontSize={11}
                                    tick={{ fill: getAxisTickFill(isDark) }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="nome"
                                    width={150}
                                    stroke={getAxisColor(isDark)}
                                    fontSize={12}
                                    tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }}
                                    content={<PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />}
                                />
                                <Bar dataKey="total" radius={[0, 7, 7, 0]} barSize={24} animationDuration={900}>
                                    {rankingAssuntos.map((_, index) => (
                                        <Cell key={`assunto-${index}`} fill={getBarGradient("assunto", index, ASSUNTO_COLORS.length)} className="cursor-pointer" />
                                    ))}
                                    <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={12} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-ds-tertiary text-sm">
                            Nenhum dado disponível
                        </div>
                    )}
                </ChartCard>

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
                            <Card className={cn(
                                "shadow-lg rounded-2xl overflow-hidden",
                                isDark ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl" : "bg-white/90 border-slate-200/80 backdrop-blur-xl"
                            )}>
                                <CardHeader className="pb-2 pt-5 px-5">
                                    <CardTitle className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#009FE3] to-[#0077CC]" />
                                        Insights
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 px-5 pb-5">
                                    {sorted.slice(0, 3).map((item, i) => (
                                        <div key={i} className={cn("rounded-lg p-3 border", isDark ? "bg-[#081E30] border-[#165A8A]/40" : "bg-slate-50 border-slate-200")}>
                                            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top {i + 1}</span>
                                            <p className={cn("font-bold text-sm mt-0.5", isDark ? "text-white" : "text-gray-900")}>{item.nome}</p>
                                            <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{item.total.toLocaleString("pt-BR")}</p>
                                        </div>
                                    ))}
                                    <div className={cn("rounded-lg p-3 border", isDark ? "bg-[#081E30] border-[#165A8A]/40" : "bg-slate-50 border-slate-200")}>
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top 3 no Total</span>
                                        <p className={cn("font-bold text-lg mt-0.5", isDark ? "text-white" : "text-gray-900")}>{top3Pct}%</p>
                                    </div>
                                    <div className={cn("rounded-lg p-3 border", isDark ? "bg-[#081E30] border-[#165A8A]/40" : "bg-slate-50 border-slate-200")}>
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Top 5 no Total</span>
                                        <p className={cn("font-bold text-lg mt-0.5", isDark ? "text-white" : "text-gray-900")}>{top5Pct}%</p>
                                    </div>
                                    <div className={cn("rounded-lg p-3 border", isDark ? "bg-[#081E30] border-[#165A8A]/40" : "bg-slate-50 border-slate-200")}>
                                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Cauda Longa</span>
                                        <p className={cn("font-bold text-sm mt-0.5", isDark ? "text-white" : "text-gray-900")}>{longTail} assuntos abaixo de {threshold.toLocaleString("pt-BR")}</p>
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
                <DialogContent className={cn("max-w-[95vw] w-[1200px] max-h-[85vh] overflow-hidden flex flex-col", isDark ? "bg-[#0C2135] border-[#165A8A] text-white" : "bg-white border-slate-200 text-gray-900")}>
                    <DialogHeader>
                        <DialogTitle className={cn("text-lg flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
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
