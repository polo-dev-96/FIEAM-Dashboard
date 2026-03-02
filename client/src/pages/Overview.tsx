import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CasaPicker } from "@/components/ui/casa-picker";
import { ExportReportDialog } from "@/components/ui/export-report-dialog";
import {
  MessageSquare, Clock, CalendarDays, TrendingUp,
  RefreshCw, Users, Building2, ChevronLeft, ChevronRight, Filter, Cloud
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";

interface StatsData {
  totais: {
    total: number;
    hoje: number;
    semana: number;
    mes: number;
  };
  duracaoMedia: number;
  porCanal: Array<{ nome: string; total: number }>;
  porCasa: Array<{ nome: string; total: number }>;
  porResumo: Array<{ nome: string; total: number }>;
  timeline: Array<{ data: string; total: number }>;
}

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

const REFRESH_INTERVAL = 60000; // 60 seconds

const COLORS = ['#009FE3', '#F37021', '#00A650', '#ED1C24', '#00BCD4', '#8b5cf6', '#0077CC', '#14b8a6', '#6366f1', '#a855f7', '#06b6d4', '#84cc16', '#d946ef', '#0ea5e9', '#f43f5e'];

// White tooltip style shared across all charts
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

const PAGE_SIZES = [10, 20, 30, 50, 100];

// Default date range: current month
function getDefaultDates() {
  const now = new Date();
  return {
    startDate: format(startOfMonth(now), "yyyy-MM-dd"),
    endDate: format(now, "yyyy-MM-dd"),
  };
}

export default function OverviewPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);

  // Date range state (default: current month)
  const [dateRange, setDateRange] = useState(getDefaultDates);

  // Casa (entity) filter — empty array means "Todas"
  const [selectedCasas, setSelectedCasas] = useState<string[]>([]);

  // Table state
  const [activeTab, setActiveTab] = useState("Todos");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch list of casas for dropdown
  const { data: casasList } = useQuery<string[]>({
    queryKey: ["casas"],
    queryFn: () => apiRequest("/api/casas"),
  }); const casaParam = selectedCasas.length > 0 ? selectedCasas.map(c => `&casa=${encodeURIComponent(c)}`).join('') : "";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StatsData>({
    queryKey: ["stats", dateRange.startDate, dateRange.endDate, selectedCasas],
    queryFn: () => apiRequest(`/api/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}`),
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: recentes, isLoading: recentesLoading, refetch: refetchRecentes } = useQuery<Atendimento[]>({
    queryKey: ["recentes", dateRange.startDate, dateRange.endDate, selectedCasas],
    queryFn: () => apiRequest(`/api/recentes?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}`),
    refetchInterval: REFRESH_INTERVAL,
  });

  // Update last updated time whenever data refetches
  useEffect(() => {
    if (stats) {
      setLastUpdated(new Date());
      setCountdown(60);
    }
  }, [stats]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset page when tab or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize]);

  const handleManualRefresh = () => {
    refetchStats();
    refetchRecentes();
    setLastUpdated(new Date());
    setCountdown(60);
  };

  // Derive unique channel tabs from data
  const channelTabs = useMemo(() => {
    if (!recentes) return ["Todos"];
    const channels = Array.from(new Set(recentes.map((r) => r.canal))).sort();
    return ["Todos", ...channels];
  }, [recentes]);

  // Filtered + paginated data
  const { paginatedData, totalFiltered, totalPages } = useMemo(() => {
    if (!recentes) return { paginatedData: [], totalFiltered: 0, totalPages: 0 };

    const filtered = activeTab === "Todos"
      ? recentes
      : recentes.filter((r) => r.canal === activeTab);

    const total = filtered.length;
    const pages = Math.ceil(total / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const sliced = filtered.slice(startIdx, startIdx + pageSize);

    return { paginatedData: sliced, totalFiltered: total, totalPages: pages };
  }, [recentes, activeTab, pageSize, currentPage]);


  const isLoading = statsLoading || recentesLoading;

  if (isLoading) {
    return (
      <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-400">Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-400">Nenhum dado disponível. Verifique a conexão com o banco de dados.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
      {/* Refresh Info Bar + Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0C2135] rounded-xl px-4 py-3 border border-[#165A8A] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">
            Última atualização: {format(lastUpdated, "HH:mm:ss", { locale: ptBR })}
          </span>
          <span className="text-xs text-gray-500">
            • Próxima em {countdown}s
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Casa filter */}
          <CasaPicker
            value={selectedCasas}
            casas={casasList || []}
            onChange={setSelectedCasas}
          />
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onApply={(s, e) => setDateRange({ startDate: s, endDate: e })}
          />
          <ExportReportDialog selectedCasas={selectedCasas} />
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards - values adapt to date filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total no Período"
          value={stats.totais.total?.toLocaleString("pt-BR") || "0"}
          icon={<CalendarDays className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Atendimentos Hoje"
          value={stats.totais.hoje?.toLocaleString("pt-BR") || "0"}
          icon={<MessageSquare className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Este Mês"
          value={stats.totais.mes?.toLocaleString("pt-BR") || "0"}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Duração Média"
          value={`${stats.duracaoMedia || 0} min`}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Timeline Chart */}
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Volume de Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.timeline}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#009FE3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#009FE3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#165A8A" />
              <XAxis
                dataKey="data"
                tickFormatter={(val) => {
                  try {
                    return format(new Date(val), "dd/MM");
                  } catch {
                    return val;
                  }
                }}
                stroke="#6b7280"
                fontSize={11}
              />
              <YAxis stroke="#6b7280" fontSize={11} />
              <RechartsTooltip
                {...TOOLTIP_STYLE}
                labelFormatter={(label) => {
                  try {
                    return format(new Date(label), "dd/MM/yyyy");
                  } catch {
                    return label;
                  }
                }}
                formatter={(value: number) => [value, "Atendimentos"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#009FE3"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVolume)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por Canal */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Atendimentos por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.porCanal} layout="vertical" margin={{ left: 10 }}>
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
                  formatter={(value: number) => [value, "Atendimentos"]}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                  {stats.porCanal.map((_, index) => (
                    <Cell key={`canal-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Casa — Dynamic height based on number of items */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-400" />
              Atendimentos por Casa
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.porCasa} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} />
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
                  formatter={(value: number) => [value, "Atendimentos"]}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
                  {stats.porCasa.map((_, index) => (
                    <Cell key={`casa-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Assuntos — Nuvem de Palavras */}
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5 text-purple-400" />
            Top Assuntos (Resumo da Conversa)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssuntosWordCloud data={stats.porResumo} />
        </CardContent>
      </Card>

      {/* Recent Calls Table with Tabs + Pagination */}
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-400" />
              Últimos Atendimentos Finalizados
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-[#061726] text-gray-300 text-xs border border-[#165A8A] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0047B6]"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 scrollbar-thin">
            {channelTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium whitespace-nowrap ${activeTab === tab
                  ? "bg-[#0047B6] text-white shadow-sm"
                  : "bg-[#061726] text-gray-400 hover:text-white hover:bg-white/10 border border-[#165A8A]"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#165A8A]">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Protocolo</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Contato</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Canal</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Início</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Fim</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Resumo</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Casa</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-[#165A8A]/50 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300 font-mono text-xs">{item.protocolo}</td>
                      <td className="py-3 px-4 text-gray-300">{item.contato}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
                          {item.canal}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {formatDateTime(item.dataHoraInicio)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {formatDateTime(item.dataHoraFim)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate">{item.resumoConversa}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                          {item.casa}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Nenhum atendimento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#165A8A]">
              <span className="text-xs text-gray-400">
                Mostrando {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalFiltered)} de {totalFiltered}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#061726] border border-[#165A8A] text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>
                <span className="text-xs text-gray-400 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#061726] border border-[#165A8A] text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

// ─── Word Cloud Component ──────────────────────────────────────────

function AssuntosWordCloud({ data }: { data: Array<{ nome: string; total: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>;
  }

  const maxTotal = Math.max(...data.map((d) => d.total));
  const minTotal = Math.min(...data.map((d) => d.total));
  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 py-8 px-4 min-h-[200px]">
      {data.map((item, index) => {
        const ratio = maxTotal === minTotal ? 0.5 : (item.total - minTotal) / (maxTotal - minTotal);
        const fontSize = 0.85 + ratio * 1.65; // 0.85rem to 2.5rem
        const color = COLORS[index % COLORS.length];
        const percent = ((item.total / grandTotal) * 100).toFixed(1);

        return (
          <Tooltip key={item.nome}>
            <TooltipTrigger asChild>
              <span
                className="inline-block cursor-default transition-all duration-300 hover:scale-110 hover:brightness-125 select-none"
                style={{
                  fontSize: `${fontSize}rem`,
                  color,
                  fontWeight: ratio > 0.6 ? 800 : ratio > 0.3 ? 600 : 500,
                  lineHeight: 1.3,
                }}
              >
                {item.nome}
              </span>
            </TooltipTrigger>
            <TooltipContent
              className="bg-white text-[#1a1a2e] border border-gray-200 shadow-lg rounded-xl px-4 py-3"
              sideOffset={8}
            >
              <p className="font-bold text-sm capitalize">{item.nome}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-600">
                  {item.total.toLocaleString("pt-BR")} atendimentos
                </span>
                <span className="text-xs font-semibold" style={{ color }}>
                  {percent}%
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

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
