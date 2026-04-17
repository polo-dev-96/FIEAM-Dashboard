import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LabelList
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { KPICard } from "@/components/ui/kpi-card";
import { ChartCard } from "@/components/ui/chart-card";
import { FilterToolbar, FilterGroup } from "@/components/ui/filter-toolbar";
import {
  Tag, Megaphone, MoreHorizontal
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

interface PatrocinadosStats {
  totalPatrocinados: number;
  totalCampanhas: number;
  totalOutros: number;
  rankingPatrocinados: Array<{ nome: string; total: number }>;
  rankingCampanhas: Array<{ nome: string; total: number }>;
  rankingOutros: Array<{ nome: string; total: number }>;
}

const REFRESH_INTERVAL = 60000;

const COLORS = ['#009FE3', '#F37021', '#00A650', '#ED1C24', '#00BCD4', '#8b5cf6', '#0077CC', '#14b8a6', '#6366f1', '#a855f7', '#06b6d4', '#84cc16', '#d946ef', '#0ea5e9', '#f43f5e'];

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

const MIN_DATE = "2026-04-13";

function getDefaultDates() {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  return {
    startDate: monthStart < MIN_DATE ? MIN_DATE : monthStart,
    endDate: format(now, "yyyy-MM-dd"),
  };
}

export default function DashboardPatrocinadosPage() {
  const { isDark } = useTheme();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultDates);

  const { data: stats, isLoading, refetch } = useQuery<PatrocinadosStats>({
    queryKey: ["patrocinados-stats", dateRange.startDate, dateRange.endDate],
    queryFn: () => apiRequest(`/api/patrocinados-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
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
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setCountdown(60);
    setIsRefreshing(false);
  };

  // Loading state
  if (isLoading && !stats) {
    return (
      <Layout title="Dashboard - Patrocinados/Campanhas" subtitle="Monitoramento de patrocinados e campanhas">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[#009FE3]/30 border-t-[#009FE3] rounded-full animate-spin" />
            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard - Patrocinados/Campanhas" subtitle="Monitoramento de patrocinados e campanhas">
      {/* ═══════════════════════════════════════════════════════════════
         FILTER TOOLBAR - PREMIUM
         ═══════════════════════════════════════════════════════════════ */}
      <FilterToolbar
        title="Patrocinados e Campanhas"
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        headerAction={
          <span className={cn("text-[11px] font-medium tabular-nums", isDark ? "text-white/50" : "text-slate-500")}>
            Atualizado às {format(lastUpdated, "HH:mm:ss")} • Próxima em {countdown}s
          </span>
        }
      >
        <FilterGroup label="Período">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onApply={(s, e) => setDateRange({ startDate: s < MIN_DATE ? MIN_DATE : s, endDate: e })}
          />
        </FilterGroup>
      </FilterToolbar>

      {/* ═══════════════════════════════════════════════════════════════
         KPI CARDS - PREMIUM
         ═══════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "grid gap-5",
        (stats?.totalOutros || 0) > 0
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2"
      )}>
        <KPICard
          title="Total de Patrocinados"
          value={(stats?.totalPatrocinados || 0).toLocaleString("pt-BR")}
          icon={<Tag className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title="Total de Campanhas"
          value={(stats?.totalCampanhas || 0).toLocaleString("pt-BR")}
          icon={<Megaphone className="w-5 h-5" />}
          color="green"
        />
        {(stats?.totalOutros || 0) > 0 && (
          <KPICard
            title="Total de Outros"
            value={(stats?.totalOutros || 0).toLocaleString("pt-BR")}
            icon={<MoreHorizontal className="w-5 h-5" />}
            color="amber"
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         RANKING CHARTS - PREMIUM
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-5">
        <RankingChart
          title="Ranking de Patrocinados"
          subtitle="Por quantidade de atendimentos"
          icon={<Tag className="w-5 h-5" />}
          data={stats?.rankingPatrocinados || []}
          colorOffset={0}
          isDark={isDark}
          color="blue"
        />

        <RankingChart
          title="Ranking de Campanhas"
          subtitle="Por quantidade de atendimentos"
          icon={<Megaphone className="w-5 h-5" />}
          data={stats?.rankingCampanhas || []}
          colorOffset={5}
          isDark={isDark}
          color="green"
        />

        {(stats?.rankingOutros?.length || 0) > 0 && (
          <RankingChart
            title="Ranking de Outros"
            subtitle="Atendimentos que não são Patrocinado nem Campanha"
            icon={<MoreHorizontal className="w-5 h-5" />}
            data={stats?.rankingOutros || []}
            colorOffset={10}
            isDark={isDark}
            color="amber"
          />
        )}
      </div>
    </Layout>
  );
}

// ─── Sub-component: Ranking Chart Premium ─────────────────────────

function RankingChart({ title, subtitle, icon, data, colorOffset, isDark, color }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: Array<{ nome: string; total: number }>;
  colorOffset: number;
  isDark: boolean;
  color: "blue" | "green" | "amber" | "red" | "purple";
}) {
  if (data.length === 0) {
    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        icon={icon}
        color={color}
        height={200}
      >
        <div className="flex items-center justify-center h-full">
          <p className={cn("text-sm", isDark ? "text-white/50" : "text-slate-500")}>
            Nenhum dado encontrado para o período selecionado.
          </p>
        </div>
      </ChartCard>
    );
  }

  const chartHeight = Math.max(280, data.length * 42 + 60);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      color={color}
      height={chartHeight}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 80, top: 15, bottom: 15 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? "rgba(0, 159, 227, 0.1)" : "rgba(226, 232, 240, 0.8)"} 
            horizontal={false} 
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nome"
            width={320}
            tick={{ 
              fill: isDark ? "rgba(255,255,255,0.7)" : "#475569", 
              fontSize: 12 
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.length > 55 ? v.slice(0, 55) + "…" : v}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: isDark ? "#0C2135" : "#FFFFFF",
              borderRadius: "12px",
              border: isDark ? "1px solid rgba(0, 159, 227, 0.2)" : "1px solid rgba(226, 232, 240, 0.8)",
              color: isDark ? "#FFFFFF" : "#0F172A",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            labelStyle={{ 
              color: isDark ? "rgba(255,255,255,0.8)" : "#374151", 
              fontWeight: 600 
            }}
            formatter={(value: number) => [value.toLocaleString("pt-BR"), "Atendimentos"]}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[(index + colorOffset) % COLORS.length]} />
            ))}
            <LabelList 
              dataKey="total" 
              position="right" 
              fill={isDark ? "rgba(255,255,255,0.6)" : "#64748B"} 
              fontSize={11} 
              formatter={(v: number) => v.toLocaleString("pt-BR")} 
              offset={10} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
