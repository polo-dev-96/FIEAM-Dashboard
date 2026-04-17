import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Cell, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SelectMulti } from "@/components/ui/select-multi";
import { SelectCustom } from "@/components/ui/select-custom";
import {
  RefreshCw, TrendingUp, DollarSign, Building2,
  CalendarRange, Settings2, Brain,
  FileSpreadsheet, Loader2
} from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────

interface OpenAIStatsData {
  totalValue: number;
  timeline: Array<{ data: string; total: number }>;
  porProjeto: Array<{ nome: string; total: number }>;
}

// ─── Constants ─────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60_000;

const COLORS = [
  "#009FE3", "#F37021", "#00A650", "#ED1C24", "#00BCD4",
  "#8b5cf6", "#0077CC", "#14b8a6", "#6366f1", "#a855f7",
  "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#ec4899"
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

function getDefaultDates() {
  const now = new Date();
  return {
    startDate: format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd"),
    endDate: format(now, "yyyy-MM-dd"),
  };
}

// ─── Page Component ────────────────────────────────────────────────

export default function DashboardOpenAIPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);

  // Filters
  const [dateRange, setDateRange] = useState(getDefaultDates);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [moeda, setMoeda] = useState<"USD" | "BRL">("USD");
  const [taxaCambio, setTaxaCambio] = useState<number | null>(null);
  const [loadingCambio, setLoadingCambio] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch exchange rate when BRL is selected
  useEffect(() => {
    if (moeda === "BRL" && taxaCambio === null) {
      setLoadingCambio(true);
      fetch("https://economia.awesomeapi.com.br/last/USD-BRL")
        .then(r => r.json())
        .then(data => {
          const rate = parseFloat(data.USDBRL?.bid);
          setTaxaCambio(rate || 5.0);
        })
        .catch(() => setTaxaCambio(5.0))
        .finally(() => setLoadingCambio(false));
    }
  }, [moeda, taxaCambio]);

  // Refresh exchange rate every 5 minutes if BRL
  useEffect(() => {
    if (moeda !== "BRL") return;
    const interval = setInterval(() => {
      fetch("https://economia.awesomeapi.com.br/last/USD-BRL")
        .then(r => r.json())
        .then(data => {
          const rate = parseFloat(data.USDBRL?.bid);
          if (rate) setTaxaCambio(rate);
        })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [moeda]);

  // List of projects
  const { data: projectsList } = useQuery<string[]>({
    queryKey: ["openai-projects"],
    queryFn: () => apiRequest("/api/openai-projects"),
  });

  const projectOptions = useMemo(() => {
    if (!projectsList) return [];
    return projectsList.map(p => ({ value: p, label: p }));
  }, [projectsList]);

  // Build query params
  const projectParam = selectedProjects.length > 0
    ? selectedProjects.map(p => `&project=${encodeURIComponent(p)}`).join('')
    : "";

  const { data: stats, isLoading, refetch } = useQuery<OpenAIStatsData>({
    queryKey: ["openai-stats", dateRange.startDate, dateRange.endDate, selectedProjects],
    queryFn: () => apiRequest(`/api/openai-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${projectParam}`),
    refetchInterval: REFRESH_INTERVAL,
  });

  useEffect(() => {
    if (stats) {
      setLastUpdated(new Date());
      setCountdown(60);
    }
  }, [stats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    refetch();
    setLastUpdated(new Date());
    setCountdown(60);
  };

  // Currency multiplier
  const multiplier = moeda === "BRL" && taxaCambio ? taxaCambio : 1;
  const simbolo = moeda === "BRL" ? "R$" : "$";

  // Converted data
  const totalValueConverted = useMemo(() => {
    return ((stats?.totalValue || 0) * multiplier);
  }, [stats?.totalValue, multiplier]);

  const timelineConverted = useMemo(() => {
    if (!stats?.timeline) return [];
    return stats.timeline.map(item => ({
      ...item,
      total: item.total * multiplier,
    }));
  }, [stats?.timeline, multiplier]);

  const porProjetoConverted = useMemo(() => {
    if (!stats?.porProjeto) return [];
    return stats.porProjeto.map(item => ({
      ...item,
      total: item.total * multiplier,
    }));
  }, [stats?.porProjeto, multiplier]);

  // Export XLSX handler
  const handleExportXLSX = useCallback(async () => {
    setExporting(true);
    try {
      const url = `/api/openai-export-xlsx?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${projectParam}&moeda=${moeda}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao exportar XLSX");
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `relatorio_openai_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Erro ao exportar XLSX:", err);
      alert("Erro ao exportar XLSX. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }, [dateRange.startDate, dateRange.endDate, projectParam, moeda]);

  // Format currency
  const fmtValue = (val: number) => {
    if (moeda === "BRL") {
      return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtValueShort = (val: number) => {
    if (moeda === "BRL") {
      return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  if (isLoading || loadingCambio) {
    return (
      <Layout title="Dashboard - OpenAI" subtitle="Monitoramento de custos OpenAI">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[#009FE3]/30 border-t-[#009FE3] rounded-full animate-spin" />
            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard - OpenAI" subtitle="Monitoramento de custos OpenAI">
      {/* Filters — Premium Glass */}
      <div className={cn(
        "rounded-2xl border overflow-hidden animate-fade-up",
        isDark
          ? "border-[#1E3A5F]/60 bg-[#0C2135]/90 backdrop-blur-xl shadow-lg shadow-black/20"
          : "border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5"
      )}>
        {/* Filter Header */}
        <div className={cn(
          "flex items-center gap-2 px-5 py-3 border-b",
          isDark ? "border-[#1E3A5F]/40 bg-[#081E30]/60" : "border-slate-100 bg-slate-50/80"
        )}>
          <div className={cn("p-1.5 rounded-lg", isDark ? "bg-purple-500/10" : "bg-purple-50")}>
            <Brain className={cn("w-3.5 h-3.5", isDark ? "text-purple-400" : "text-purple-600")} />
          </div>
          <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-gray-200" : "text-gray-700")}>Filtros</span>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
            <span className={cn("font-medium", isDark ? "text-gray-500" : "text-gray-400")}>Atualizado {format(lastUpdated, "HH:mm:ss")}</span>
            <span className={cn(isDark ? "text-gray-600" : "text-gray-300")}>•</span>
            <span className={cn("font-medium", isDark ? "text-gray-500" : "text-gray-400")}>{countdown}s</span>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Group 1: Unidade (Project) */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Unidade
              </label>
              <SelectMulti
                values={selectedProjects}
                onValuesChange={setSelectedProjects}
                placeholder="Todos os Projetos"
                panelTitle="Selecionar Projetos"
                options={projectOptions}
              />
            </div>

            {/* Divider */}
            <div className={cn("hidden lg:block w-px", isDark ? "bg-[#165A8A]/30" : "bg-slate-200")} />

            {/* Group 2: Period */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                <CalendarRange className="w-3 h-3" />
                Período
              </label>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onApply={(s, e) => setDateRange({ startDate: s, endDate: e })}
              />
            </div>

            {/* Divider */}
            <div className={cn("hidden lg:block w-px", isDark ? "bg-[#165A8A]/30" : "bg-slate-200")} />

            {/* Group 3: Moeda */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" />
                Moeda
              </label>
              <SelectCustom
                value={moeda}
                onValueChange={(v) => {
                  setMoeda(v as "USD" | "BRL");
                  if (v === "BRL") setTaxaCambio(null); // force refresh
                }}
                placeholder="Moeda"
                panelTitle="Selecionar Moeda"
                options={[
                  { value: "USD", label: "Dólar (USD)" },
                  { value: "BRL", label: "Real (BRL)" },
                ]}
              />
              {moeda === "BRL" && taxaCambio && (
                <span className={cn("text-[9px]", isDark ? "text-gray-500" : "text-gray-400")}>
                  Câmbio: 1 USD = {taxaCambio.toFixed(2)} BRL
                </span>
              )}
            </div>

            {/* Divider */}
            <div className={cn("hidden lg:block w-px", isDark ? "bg-[#165A8A]/30" : "bg-slate-200")} />

            {/* Group 4: Actions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                Ações
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportXLSX}
                  disabled={exporting}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border rounded-xl transition-all duration-300 disabled:opacity-50",
                    isDark
                      ? "bg-[#060e1a]/80 border-[#1a3a5c]/80 text-gray-300 hover:border-[#009FE3]/40 hover:text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-[#009FE3]/40 hover:text-[#009FE3]"
                  )}
                  title="Exportar Excel"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Exportar</span>
                </button>
                <button
                  onClick={handleManualRefresh}
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
          {selectedProjects.length > 0 && (
            <div className={cn("mt-4 pt-4 border-t flex items-center gap-2 flex-wrap", isDark ? "border-[#165A8A]/20" : "border-slate-200")}>
              <span className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-600")}>Filtros ativos:</span>
              {selectedProjects.map(proj => (
                <span key={proj} className="px-2 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-medium rounded-md border border-[#009FE3]/20">
                  {proj}
                </span>
              ))}
              <button
                onClick={() => setSelectedProjects([])}
                className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={contentRef} className="space-y-6">
        {/* Stats Card — Premium */}
        <div className="grid grid-cols-1 gap-5 max-w-md mx-auto">
          <StatCard
            title="Valor Total no Período"
            value={`${simbolo} ${fmtValue(totalValueConverted)}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
        </div>

        {/* Timeline Chart - Volume de Gastos por dia */}
        <Card className={cn(
          "shadow-lg rounded-2xl overflow-hidden animate-fade-up-2 card-premium",
          isDark ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl" : "bg-white/90 border-slate-200/80 backdrop-blur-xl"
        )}>
          <CardHeader>
            <CardTitle className={cn("text-lg flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
              <div className={cn("p-1.5 rounded-lg", isDark ? "bg-blue-500/10" : "bg-blue-50")}>
                <TrendingUp className={cn("w-4 h-4", isDark ? "text-blue-400" : "text-blue-600")} />
              </div>
              Volume de Gastos por Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineConverted}>
                <defs>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009FE3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#009FE3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#165A8A" : "#e5e7eb"} />
                <XAxis
                  dataKey="data"
                  tickFormatter={(val) => {
                    try { return format(new Date(val + "T12:00:00"), "dd/MM"); } catch { return val; }
                  }}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(val) => `${simbolo}${val.toFixed(2)}`}
                />
                <RechartsTooltip
                  {...TOOLTIP_STYLE}
                  labelFormatter={(label) => {
                    try { return format(new Date(label + "T12:00:00"), "dd/MM/yyyy"); } catch { return label; }
                  }}
                  formatter={(value: number) => [`${simbolo} ${fmtValueShort(value)}`, "Gasto"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#009FE3"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PDF-only: Daily Volume Table */}
        <div data-pdf-only style={{ display: "none" }}>
          <Card className={cn("shadow-lg", isDark ? "bg-[#0C2135] border-[#165A8A]" : "bg-white border-slate-200")}>
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                <DollarSign className="w-4 h-4 text-blue-400" />
                Volume Diário de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#165A8A]">
                      <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Data</th>
                      <th className="text-right text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Valor</th>
                      <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Data</th>
                      <th className="text-right text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const tl = timelineConverted || [];
                      const cols = 2;
                      const rows = Math.ceil(tl.length / cols);
                      return Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-[#165A8A]/30">
                          {Array.from({ length: cols }).map((_, colIdx) => {
                            const item = tl[colIdx * rows + rowIdx];
                            if (!item) return <td key={colIdx} className="py-1.5 px-3" colSpan={2} />;
                            let dateLabel: string;
                            try { dateLabel = format(new Date(item.data + "T12:00:00"), "dd/MM/yyyy"); } catch { dateLabel = item.data; }
                            return (
                              <React.Fragment key={colIdx}>
                                <td className="py-1.5 px-3 text-gray-300 text-xs">{dateLabel}</td>
                                <td className="py-1.5 px-3 text-white text-xs font-bold text-right">{simbolo} {fmtValueShort(item.total)}</td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Valores por Unidade (project_name) */}
        <Card className={cn(
          "shadow-lg rounded-2xl overflow-hidden animate-fade-up-3 card-premium",
          isDark ? "bg-[#0C2135]/90 border-[#1E3A5F]/60 backdrop-blur-xl" : "bg-white/90 border-slate-200/80 backdrop-blur-xl"
        )}>
          <CardHeader>
            <CardTitle className={cn("text-lg flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
              <div className={cn("p-1.5 rounded-lg", isDark ? "bg-emerald-500/10" : "bg-emerald-50")}>
                <Building2 className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
              </div>
              Valores por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {porProjetoConverted.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={porProjetoConverted}
                  layout="vertical"
                  margin={{ left: 10, right: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={isDark ? "#165A8A" : "#e5e7eb"} />
                  <XAxis
                    type="number"
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(val) => `${simbolo}${val.toFixed(2)}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    stroke="#9ca3af"
                    fontSize={11}
                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
                  />
                  <RechartsTooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => [`${simbolo} ${fmtValueShort(value)}`, "Gasto"]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                    {porProjetoConverted.map((_, index) => (
                      <Cell key={`proj-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="total"
                      position="right"
                      fill="#94a3b8"
                      fontSize={11}
                      formatter={(v: number) => `${simbolo} ${fmtValueShort(v)}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────

function StatCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "red" | "blue" | "green" | "amber";
  subtitle?: string;
}) {
  const { isDark } = useTheme();
  const colorMap = {
    red: {
      gradient: "from-[#009FE3] to-[#0077CC]",
      bg: "bg-[#009FE3]/10", text: "text-sky-400", border: "border-[#009FE3]/20",
      bgLight: "bg-blue-50", textLight: "text-blue-600", borderLight: "border-blue-200/80",
      shadow: "hover:shadow-[0_8px_32px_rgba(0,159,227,0.12)]",
    },
    blue: {
      gradient: "from-[#009FE3] to-[#0077CC]",
      bg: "bg-[#009FE3]/10", text: "text-sky-400", border: "border-[#009FE3]/20",
      bgLight: "bg-blue-50", textLight: "text-blue-600", borderLight: "border-blue-200/80",
      shadow: "hover:shadow-[0_8px_32px_rgba(0,159,227,0.12)]",
    },
    green: {
      gradient: "from-[#00A650] to-[#008040]",
      bg: "bg-[#00A650]/10", text: "text-emerald-400", border: "border-[#00A650]/20",
      bgLight: "bg-emerald-50", textLight: "text-emerald-600", borderLight: "border-emerald-200/80",
      shadow: "hover:shadow-[0_8px_32px_rgba(0,166,80,0.12)]",
    },
    amber: {
      gradient: "from-[#F37021] to-[#E05A10]",
      bg: "bg-[#F37021]/10", text: "text-orange-400", border: "border-[#F37021]/20",
      bgLight: "bg-orange-50", textLight: "text-orange-600", borderLight: "border-orange-200/80",
      shadow: "hover:shadow-[0_8px_32px_rgba(243,112,33,0.12)]",
    },
  };
  const c = colorMap[color];

  return (
    <div className={cn(
      "relative rounded-2xl p-5 border shadow-lg card-premium overflow-hidden animate-fade-up",
      isDark
        ? `bg-[#0C2135]/90 ${c.border} backdrop-blur-xl ${c.shadow}`
        : `bg-white/90 ${c.borderLight} backdrop-blur-xl ${c.shadow}`
    )}>
      {/* Gradient left accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b", c.gradient)} />
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>{title}</span>
          {subtitle && <p className={cn("text-[10px] mt-0.5", isDark ? "text-gray-500" : "text-gray-400")}>{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl", isDark ? c.bg : c.bgLight)}>
          <span className={isDark ? c.text : c.textLight}>{icon}</span>
        </div>
      </div>
      <p className={cn("text-3xl font-bold font-display number-display", isDark ? "text-white" : "text-gray-900")}>{value}</p>
    </div>
  );
}
