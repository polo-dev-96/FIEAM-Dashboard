/*
 * ============================================================
 * pages/DashboardPatrocinados.tsx — Dashboard de Patrocinados/Campanhas
 * ============================================================
 *
 * Painel para monitorar atendimentos originados de canais patrocinados
 * e campanhas de marketing. Dados só disponíveis a partir de 13/04/2026.
 *
 * Funcionalidades:
 *   - KPIs: Total Patrocinados, Total Campanhas, Total Outros
 *   - Filtros: Período (DateRangePicker), Filtro de Casa
 *   - Gráfico de Ranking de Patrocinadores (BarChart)
 *   - Gráfico de Ranking de Campanhas (BarChart)
 *   - Gráfico de Ranking de Outros (BarChart)
 *   - Auto-refresh a cada 60 segundos (REFRESH_INTERVAL)
 *
 * Dados buscados via React Query:
 *   - GET /api/patrocinados-stats → totais, rankings, timeline
 *
 * Classificação dos atendimentos:
 *   - Campo `variaveis` começa com 'PATROCINADO' → Patrocinado
 *   - Campo `variaveis` começa com 'CAMPANHA'    → Campanha
 *   - Qualquer outro valor                       → Outros
 *
 * Restrição de data mínima (MIN_DATE = "2026-04-13"):
 *   O rastreamento de patrocinados só começou nessa data,
 *   então o DateRangePicker não permite selecionar datas anteriores.
 * ============================================================
 */

import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  CalendarRange, RefreshCw, Settings2,
  Megaphone, Tag, MoreHorizontal
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { ChartCard } from "@/components/ui/chart-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { CHART_COLORS, getGridStroke, getAxisTickFill, barGradientDefs, getBarGradient, PremiumTooltip } from "@/lib/chart-utils";
import { PatrocinadosDrawer, type SelectedPatrocinado } from "@/components/ui/PatrocinadosDrawer";

interface PatrocinadosStats {
  totalPatrocinados: number;
  totalCampanhas: number;
  totalOutros: number;
  rankingPatrocinados: Array<{ nome: string; total: number }>;
  rankingCampanhas: Array<{ nome: string; total: number; totalDisparadas?: number }>;
  rankingOutros: Array<{ nome: string; total: number }>;
}

const REFRESH_INTERVAL = 60000;

const COLORS = CHART_COLORS;

const MIN_DATE = "2026-04-13";

// Remove prefixos PATROCINADO_ e CAMPANHA_ dos nomes para exibição
function cleanNome(nome: string): string {
  return nome.replace(/^(PATROCINADO|CAMPANHA)_/, "");
}

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
  const [dateRange, setDateRange] = useState(getDefaultDates);
  const [selectedItem, setSelectedItem] = useState<SelectedPatrocinado | null>(null);

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

  const handleManualRefresh = () => {
    refetch();
    setLastUpdated(new Date());
    setCountdown(60);
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
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          <span className={cn("text-sm font-semibold tracking-wide", isDark ? "text-gray-200" : "text-gray-800")}>
            Patrocinados e Campanhas
          </span>
          <div className="flex-1" />
          <span className={cn("text-[11px] font-medium", isDark ? "text-gray-500" : "text-gray-400")}>
            Última atualização: {format(lastUpdated, "HH:mm:ss", { locale: ptBR })} • Próxima em {countdown}s
          </span>
        </div>

        {/* Filters */}
        <div className={cn("p-5", isDark ? "bg-[#0C2135]" : "bg-white")}>
          <div className="flex flex-col lg:flex-row gap-5 items-end">
            {/* Period */}
            <div className="flex flex-col gap-1.5">
              <label className={cn("text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5", isDark ? "text-gray-500" : "text-gray-600")}>
                <CalendarRange className="w-3 h-3" />
                Período
              </label>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onApply={(s, e) => setDateRange({ startDate: s < MIN_DATE ? MIN_DATE : s, endDate: e })}
              />
            </div>

            <div className={cn("hidden lg:block w-px h-9", isDark ? "bg-[#165A8A]/30" : "bg-gray-200")} />

            {/* Actions */}
            <div className="flex flex-col gap-1.5">
              <label className={cn("text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5", isDark ? "text-gray-500" : "text-gray-600")}>
                <Settings2 className="w-3 h-3" />
                Ações
              </label>
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
      </div>

      {/* Stat Cards — Premium */}
      <div className={cn(
        "grid gap-5 max-w-4xl mx-auto",
        (stats?.totalOutros || 0) > 0
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2"
      )}>
        <StatCard
          title="Total de Patrocinados"
          value={(stats?.totalPatrocinados || 0).toLocaleString("pt-BR")}
          icon={<Tag className="w-5 h-5" />}
          color="blue"
          isDark={isDark}
        />
        <StatCard
          title="Total de Campanhas"
          value={(stats?.totalCampanhas || 0).toLocaleString("pt-BR")}
          icon={<Megaphone className="w-5 h-5" />}
          color="green"
          isDark={isDark}
        />
        {(stats?.totalOutros || 0) > 0 && (
          <StatCard
            title="Total de Outros"
            value={(stats?.totalOutros || 0).toLocaleString("pt-BR")}
            icon={<MoreHorizontal className="w-5 h-5" />}
            color="amber"
            isDark={isDark}
          />
        )}
      </div>

      {/* Charts — stacked vertically, full width, expanded */}
      <div className="flex flex-col gap-5">
        <RankingChart
          title="Ranking de Patrocinados"
          subtitle="Por quantidade de atendimentos"
          icon={<Tag className="w-5 h-5" />}
          data={stats?.rankingPatrocinados || []}
          colorOffset={0}
          isDark={isDark}
          color="blue"
          gradientId="patro"
          tipo="patrocinado"
          onBarClick={(nome, total) => setSelectedItem({ nome, tipo: "patrocinado", total })}
        />

        <RankingChart
          title="Ranking de Campanhas/Disparados em Lote"
          subtitle="Por quantidade de atendimentos"
          icon={<Megaphone className="w-5 h-5" />}
          data={stats?.rankingCampanhas || []}
          colorOffset={5}
          isDark={isDark}
          color="green"
          gradientId="camp"
          tipo="campanha"
          onBarClick={(nome, total) => setSelectedItem({ nome, tipo: "campanha", total })}
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
            gradientId="outros"
            tipo="outros"
            onBarClick={(nome, total) => setSelectedItem({ nome, tipo: "outros", total })}
          />
        )}
      </div>

      <PatrocinadosDrawer
        selected={selectedItem}
        dateRange={dateRange}
        onClose={() => setSelectedItem(null)}
      />
    </Layout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ title, value, icon, color, isDark }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber";
  isDark: boolean;
}) {
  const colorMap = {
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
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>{title}</span>
        <div className={cn("p-2.5 rounded-xl", isDark ? c.bg : c.bgLight)}>
          <span className={isDark ? c.text : c.textLight}>{icon}</span>
        </div>
      </div>
      <p className={cn("text-3xl font-bold font-display number-display", isDark ? "text-white" : "text-gray-900")}>{value}</p>
    </div>
  );
}

function CampaignProgressTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2.5 text-xs shadow-xl",
      isDark ? "border-white/10 bg-[#0d1f35] text-white" : "border-slate-200 bg-white text-slate-800"
    )}>
      <p className="font-bold mb-1.5 max-w-[220px] truncate">{cleanNome(d.nome)}</p>
      <div className="space-y-0.5">
        <p className={isDark ? "text-white/60" : "text-slate-500"}>
          Respondidas: <span className="font-bold text-emerald-400">{d.total.toLocaleString("pt-BR")}</span>
        </p>
        {d.totalDisparadas > 0 && (
          <>
            <p className={isDark ? "text-white/60" : "text-slate-500"}>
              Disparadas: <span className={cn("font-bold", isDark ? "text-white" : "text-slate-700")}>{d.totalDisparadas.toLocaleString("pt-BR")}</span>
            </p>
            <p className={isDark ? "text-white/60" : "text-slate-500"}>
              Taxa de resposta: <span className="font-bold text-[var(--ds-accent)]">{d.pct}%</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RankingChart({ title, subtitle, icon, data, colorOffset, isDark, color, gradientId, tipo, onBarClick }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: Array<{ nome: string; total: number; totalDisparadas?: number }>;
  colorOffset: number;
  isDark: boolean;
  color: "blue" | "green" | "amber";
  gradientId: string;
  tipo: "patrocinado" | "campanha" | "outros";
  onBarClick: (nome: string, total: number) => void;
}) {
  const accentMap = { blue: "blue", green: "green", amber: "orange" } as const;
  const totalSum = data.reduce((acc, d) => acc + d.total, 0);

  // Progress-bar mode: active when tipo=campanha and at least one item has disparadas data
  const hasDisparadas = tipo === "campanha" && data.some(d => (d.totalDisparadas ?? 0) > 0);

  const chartData = hasDisparadas
    ? data.map(d => {
        const disp = d.totalDisparadas ?? 0;
        const gap = Math.max(0, disp - d.total);
        const pct = disp > 0 ? Math.round(d.total / disp * 1000) / 10 : null;
        return { nome: d.nome, total: d.total, totalDisparadas: disp, gap, pct };
      })
    : data.map(d => ({ nome: d.nome, total: d.total, totalDisparadas: 0, gap: 0, pct: null }));

  if (data.length === 0) {
    return (
      <ChartCard
        title={title}
        icon={icon}
        iconAccent={accentMap[color]}
        badge={subtitle}
        isDark={isDark}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-ds-tertiary">Nenhum dado encontrado para o período selecionado.</p>
        </div>
      </ChartCard>
    );
  }

  const chartHeight = Math.max(260, data.length * 46 + 60);
  // Extra right margin when we show the combined "count (pct%)" label
  const rightMargin = hasDisparadas ? 110 : 70;

  return (
    <ChartCard
      title={title}
      icon={icon}
      iconAccent={accentMap[color]}
      badge={subtitle}
      isDark={isDark}
      actions={
        <div className="flex items-center gap-3">
          {hasDisparadas && (
            <div className="flex items-center gap-2 text-[10px] font-medium">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                <span className={isDark ? "text-white/50" : "text-slate-500"}>Respondidas</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("inline-block h-2 w-2 rounded-sm", isDark ? "bg-emerald-500/25" : "bg-emerald-200")} />
                <span className={isDark ? "text-white/50" : "text-slate-500"}>Não respondidas</span>
              </span>
            </div>
          )}
        </div>
      }
      height={chartHeight}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 10, right: rightMargin, top: 8, bottom: 8 }}
          barCategoryGap={8}
          style={{ cursor: "pointer" }}
          onClick={(chartState: any) => {
            const payload = chartState?.activePayload?.[0]?.payload;
            if (payload?.nome) onBarClick(payload.nome, payload.total);
          }}
        >
          <defs>{barGradientDefs(gradientId)}</defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={getGridStroke(isDark)}
            horizontal={false}
          />
          <XAxis type="number" hide domain={hasDisparadas ? [0, 'dataMax'] : undefined} />
          <YAxis
            type="category"
            dataKey="nome"
            width={220}
            tick={{ fill: getAxisTickFill(isDark), fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const cleaned = cleanNome(v);
              return cleaned.length > 38 ? cleaned.slice(0, 38) + '…' : cleaned;
            }}
          />
          <RechartsTooltip
            cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }}
            content={hasDisparadas
              ? <CampaignProgressTooltip isDark={isDark} />
              : <PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />}
          />

          {hasDisparadas ? (
            <>
              {/* Bar 1: respondidas (bright accent color) */}
              <Bar
                dataKey="total"
                stackId="camp"
                radius={[0, 0, 0, 0]}
                barSize={30}
                animationDuration={700}
                style={{ cursor: "pointer" }}
                onClick={(barData: any) => { if (barData?.nome) onBarClick(barData.nome, barData.total); }}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBarGradient(gradientId, index + colorOffset)} />
                ))}
              </Bar>
              {/* Bar 2: gap / not responded (muted background) — right edge of this bar is full bar end */}
              <Bar
                dataKey="gap"
                stackId="camp"
                radius={[0, 8, 8, 0]}
                barSize={30}
                fill={isDark ? "rgba(0,166,80,0.2)" : "rgba(0,166,80,0.15)"}
                animationDuration={900}
                style={{ cursor: "pointer" }}
                onClick={(barData: any) => { if (barData?.nome) onBarClick(barData.nome, barData.total); }}
              >
                <LabelList
                  position="right"
                  content={(props: any) => {
                    const { x, y, width, height, index } = props;
                    const entry = chartData[index];
                    if (!entry) return null;
                    const countText = (entry.totalDisparadas > 0 ? entry.totalDisparadas : entry.total).toLocaleString("pt-BR");
                    const pctText = entry.pct != null ? ` · ${entry.pct}%` : "";
                    return (
                      <text
                        x={x + width + 10}
                        y={y + height / 2}
                        dominantBaseline="middle"
                        fill={isDark ? "#E2E8F0" : "#334155"}
                        fontSize={12}
                        fontWeight={700}
                      >
                        {countText}{pctText}
                      </text>
                    );
                  }}
                />
              </Bar>
            </>
          ) : (
            <Bar
              dataKey="total"
              radius={[0, 8, 8, 0]}
              barSize={30}
              animationDuration={900}
              style={{ cursor: "pointer" }}
              onClick={(barData: any) => { if (barData?.nome) onBarClick(barData.nome, barData.total); }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={getBarGradient(gradientId, index + colorOffset)} />
              ))}
              <LabelList
                dataKey="total"
                position="right"
                fill={isDark ? "#E2E8F0" : "#334155"}
                fontSize={12}
                fontWeight={700}
                formatter={(v: number) => v.toLocaleString("pt-BR")}
                offset={10}
              />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
