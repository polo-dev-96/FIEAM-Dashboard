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
        <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard - OpenAI" subtitle="Monitoramento de custos OpenAI">
      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#165A8A]/30 overflow-hidden shadow-sm bg-white dark:bg-[#0C2135]">
        {/* Filter Header */}
        <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-[#0a1929] dark:to-[#0C2135] border-b border-gray-200 dark:border-[#165A8A]/30">
          <Brain className="w-4 h-4 text-[#009FE3]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Filtros</span>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
            <span>Atualizado {format(lastUpdated, "HH:mm:ss")}</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>{countdown}s</span>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Group 1: Unidade (Project) */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
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
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-[#165A8A]/30" />

            {/* Group 2: Period */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
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
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-[#165A8A]/30" />

            {/* Group 3: Moeda */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
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
                <span className="text-[9px] text-gray-400 dark:text-gray-500">
                  Câmbio: 1 USD = {taxaCambio.toFixed(2)} BRL
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-[#165A8A]/30" />

            {/* Group 4: Actions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                Ações
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportXLSX}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white dark:bg-[#060e1a]/80 border border-gray-200 dark:border-[#1a3a5c]/80 rounded-xl text-gray-700 dark:text-gray-300 hover:border-[#009FE3]/40 hover:text-[#009FE3] dark:hover:text-white transition-all duration-300 disabled:opacity-50"
                  title="Exportar Excel"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Exportar</span>
                </button>
                <button
                  onClick={handleManualRefresh}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#060e1a]/80 border border-gray-200 dark:border-[#1a3a5c]/80 rounded-xl hover:border-[#009FE3]/40 hover:bg-white dark:hover:bg-[#0a1929] hover:text-[#009FE3] dark:hover:text-white transition-all duration-300"
                  title="Atualizar dados"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {selectedProjects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#165A8A]/20 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-600 dark:text-gray-500 uppercase tracking-wider">Filtros ativos:</span>
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
        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
          <StatCard
            title="Valor Total no Período"
            value={`${simbolo} ${fmtValue(totalValueConverted)}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
        </div>

        {/* Timeline Chart - Volume de Gastos por dia */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#165A8A" />
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
          <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
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
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
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
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
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
                    tick={{ fill: '#9ca3af' }}
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
  const colorMap = {
    red: { bg: "bg-[#009FE3]/10", text: "text-sky-400", border: "border-[#009FE3]/20" },
    blue: { bg: "bg-[#009FE3]/10", text: "text-sky-400", border: "border-[#009FE3]/20" },
    green: { bg: "bg-[#00A650]/10", text: "text-emerald-400", border: "border-[#00A650]/20" },
    amber: { bg: "bg-[#F37021]/10", text: "text-orange-400", border: "border-[#F37021]/20" },
  };
  const c = colorMap[color];

  return (
    <div className={`bg-[#0C2135] rounded-xl p-5 border ${c.border} shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{title}</span>
          {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
