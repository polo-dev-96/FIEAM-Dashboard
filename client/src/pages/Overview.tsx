import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Cell, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SelectCustom } from "@/components/ui/select-custom";
import { SelectMulti } from "@/components/ui/select-multi";
import { ExportReportDialog } from "@/components/ui/export-report-dialog";
import { KpiCard } from "@/components/ui/kpi-card";
import { ChartCard } from "@/components/ui/chart-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { CHART_COLORS, getTooltipStyle, getGridStroke, getAxisColor, getAxisTickFill, barGradientDefs, getBarGradient, PremiumTooltip } from "@/lib/chart-utils";
import {
  MessageSquare, CalendarDays, TrendingUp,
  RefreshCw, Users, Building2, ChevronLeft, ChevronRight, Filter, Cloud,
  CalendarRange, Settings2
} from "lucide-react";
import { format, differenceInCalendarDays, differenceInCalendarMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { agruparAssuntos, getCasasForFiltro, getCasasForFiltroGerente, getEquipesForEntidade, getCasasForEquipeLabels, mapCasaToEntidadeUnidade, mapCasaToEntidadeGerente, isArianaUser, type AssuntoAggregado, type Entidade, type UnidadeSESI } from "@/lib/entidadeMapping";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

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
  porOpcaoSelecionada: Array<{ nome: string; total: number }>;
  porPatrocinados: Array<{ nome: string; total: number }>;
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
  opcaoSelecionada: string;
}

const OPCOES_SELECIONADAS_LABELS = [
  'DENÚNCIAS/CANAL DE ÉTICA E INTEGRIDADE',
  'ELOGIOS/ RECLAMAÇÕES/ SUGESTÕES',
  'INFORMAÇÕES LAI – LEI 12.527/11',
];

// Classificação PF (Para Você) e PJ (Para Empresa) baseado em opcaoselecionada
const PF_OPCOES = new Set([
  'MATRICULAS SESI ESCOLA 2026',
  'CORRIDA NACIONAL DO SESI',
  'SENAI',
  'SESI SAÚDE',
  'SESI ODONTOLOGIA',
  'SESI CLUBE',
  'EJA / SUPLETIVO',
  'IEL',
  'DENÚNCIAS/CANAL DE ÉTICA E INTEGRIDADE',
  'ELOGIOS/ RECLAMAÇÕES/ SUGESTÕES',
  'INFORMAÇÕES LAI – LEI 12.527/11',
  'GRATUIDADE',
]);

const PJ_OPCOES = new Set([
  'Solicitacão de visita Comercial',
  'Solicitação de visita Comercial',
  'Informações ou Proposta Comercial',
]);

const REFRESH_INTERVAL = 60000; // 60 seconds

const COLORS = CHART_COLORS;

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isGerente = user?.nivel_acesso === "gerente" || user?.nivel_acesso === "master";

  // Date range state (default: current month)
  const [dateRange, setDateRange] = useState(getDefaultDates);

  // Filtros de Entidade/Unidade (admin) ou Entidade/Equipe (gerente) - agora com multiseleção
  const [selectedEntidades, setSelectedEntidades] = useState<Entidade[]>([]);
  const [unidade, setUnidade] = useState<UnidadeSESI | "">("");
  const [selectedEquipes, setSelectedEquipes] = useState<string[]>([]);

  // Lista de todas as casas (vinda da API)
  const { data: casasList } = useQuery<string[]>({
    queryKey: ["casas"],
    queryFn: () => apiRequest("/api/casas"),
  });

  // Equipes dinâmicas para o gerente (baseadas nas entidades selecionadas)
  const equipesOptions = useMemo(() => {
    if (!isGerente) return [];
    // Combina equipes de todas as entidades selecionadas
    const allEquipes = new Map<string, string>();
    if (selectedEntidades.length === 0) {
      // Nenhuma entidade selecionada = todas as equipes disponíveis
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

  // Casas efetivamente usadas nos filtros de API, derivadas de Entidades/Unidade ou Equipes
  const selectedCasas = useMemo(() => {
    if (!casasList) return [];
    
    if (isGerente) {
      // Se equipes específicas selecionadas, expande labels para raw casas
      if (selectedEquipes.length > 0) {
        return getCasasForEquipeLabels(casasList, selectedEntidades, selectedEquipes);
      }
      // Se entidades selecionadas mas nenhuma equipe, busca casas de todas as entidades
      if (selectedEntidades.length > 0) {
        const allCasas = new Set<string>();
        selectedEntidades.forEach(ent => {
          const casas = getCasasForFiltroGerente(casasList, ent, null);
          casas.forEach(c => allCasas.add(c));
        });
        return Array.from(allCasas);
      }
      // Para Ariana, "Todas as Entidades" deve filtrar apenas casas mapeadas (exclui as excluídas)
      if (isArianaUser() || user?.nivel_acesso === "master") {
        const allCasas = new Set<string>();
        (["SENAI", "SESI", "IEL", "Outros"] as Entidade[]).forEach(ent => {
          const casas = getCasasForFiltroGerente(casasList, ent, null);
          casas.forEach(c => allCasas.add(c));
        });
        return Array.from(allCasas);
      }
      return []; // empty = no filter = all data
    }
    
    // Admin: usa a primeira entidade selecionada ou nenhuma
    const entidade = selectedEntidades[0] || null;
    return getCasasForFiltro(casasList, entidade, unidade || null);
  }, [isGerente, casasList, selectedEntidades, unidade, selectedEquipes]);

  // Drilldown state for opcaoselecionada
  const [drilldownOpcao, setDrilldownOpcao] = useState<{ open: boolean; title: string; opcao: string }>({ open: false, title: '', opcao: '' });
  const [drilldownPage, setDrilldownPage] = useState(1);
  const DRILLDOWN_PER_PAGE = 10;

  const openDrilldownOpcao = useCallback((opcao: string) => {
    setDrilldownPage(1);
    setDrilldownOpcao({ open: true, title: opcao, opcao });
  }, []);

  const closeDrilldownOpcao = useCallback(() => {
    setDrilldownOpcao(d => ({ ...d, open: false }));
  }, []);

  // PF/PJ drilldown state
  const [drilldownPfPj, setDrilldownPfPj] = useState<{ open: boolean; tipo: 'PF' | 'PJ'; title: string }>({ open: false, tipo: 'PF', title: '' });
  const [drilldownPfPjPage, setDrilldownPfPjPage] = useState(1);

  const openDrilldownPfPj = useCallback((tipo: 'PF' | 'PJ') => {
    setDrilldownPfPjPage(1);
    setDrilldownPfPj({ open: true, tipo, title: tipo === 'PF' ? 'Para Você (PF)' : 'Para Empresa (PJ)' });
  }, []);

  const closeDrilldownPfPj = useCallback(() => {
    setDrilldownPfPj(d => ({ ...d, open: false }));
  }, []);

  // Table state
  const [activeTab, setActiveTab] = useState("Todos");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const casaParam = selectedCasas.length > 0 ? selectedCasas.map(c => `&casa=${encodeURIComponent(c)}`).join('') : "";
  const gerenteParams = isGerente ? "&allOpcoes=true&allCasas=true" : "";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StatsData>({
    queryKey: ["stats", dateRange.startDate, dateRange.endDate, selectedCasas, isGerente],
    queryFn: () => apiRequest(`/api/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}${gerenteParams}`),
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: recentes, isLoading: recentesLoading, refetch: refetchRecentes } = useQuery<Atendimento[]>({
    queryKey: ["recentes", dateRange.startDate, dateRange.endDate, selectedCasas],
    queryFn: () => apiRequest(`/api/recentes?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}`),
    refetchInterval: REFRESH_INTERVAL,
  });

  // Drilldown query for opcaoselecionada
  const { data: drilldownData, isLoading: drilldownLoading } = useQuery<DrilldownRecord[]>({
    queryKey: ["opcao-drilldown", dateRange.startDate, dateRange.endDate, selectedCasas, drilldownOpcao.opcao],
    queryFn: () => apiRequest(`/api/opcao-drilldown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}&opcao=${encodeURIComponent(drilldownOpcao.opcao)}`),
    enabled: drilldownOpcao.open && !!drilldownOpcao.opcao,
  });

  // Drilldown query for PF/PJ chart
  const pfPjOpcaoParam = useMemo(() => {
    const opcoes = drilldownPfPj.tipo === 'PF' ? Array.from(PF_OPCOES) : Array.from(PJ_OPCOES);
    return opcoes.map(o => `&opcao=${encodeURIComponent(o)}`).join('');
  }, [drilldownPfPj.tipo]);

  const { data: drilldownPfPjData, isLoading: drilldownPfPjLoading } = useQuery<DrilldownRecord[]>({
    queryKey: ["pfpj-drilldown", dateRange.startDate, dateRange.endDate, selectedCasas, drilldownPfPj.tipo],
    queryFn: () => apiRequest(`/api/opcao-drilldown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${casaParam}${pfPjOpcaoParam}`),
    enabled: drilldownPfPj.open,
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

  // ─── Métricas derivadas para cards ─────────────────────────────────
  const {
    totalPeriodo,
    mediaPorMes,
    mediaPorDia,
  } = useMemo(() => {
    const total = stats?.totais?.total || 0;

    let mediaMes = 0;
    let mediaDia = 0;

    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      const dias = Math.max(differenceInCalendarDays(end, start) + 1, 1);
      mediaDia = dias > 0 ? total / dias : 0;

      const mesesBrutos = Math.max(differenceInCalendarMonths(end, start), 0);
      const meses = Math.max(mesesBrutos + 1, 1);
      mediaMes = meses > 0 ? total / meses : 0;
    } catch {
      mediaDia = 0;
      mediaMes = 0;
    }

    return {
      totalPeriodo: total,
      mediaPorMes: mediaMes,
      mediaPorDia: mediaDia,
    };
  }, [stats?.totais?.total, dateRange.startDate, dateRange.endDate]);

  // ─── Dados agregados por Unidade/Equipe ──────────────────────────
  const atendimentosPorUnidade = useMemo(() => {
    const origem = stats?.porCasa || [];

    // Gerente: mostra casas brutas (equipes) diretamente — TOP 10, sem "Falta de Interação"
    if (isGerente) {
      return origem
        .filter((item) => item.nome !== "Falta de Interação")
        .map((item) => ({ nome: item.nome, total: item.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }

    // Admin: agrupa por Unidade (SESI SAÚDE, SESI ESCOLA, SESI CLUBE, SENAI, IEL)
    const mapa = new Map<string, number>();
    for (const item of origem) {
      const { entidade, unidade } = mapCasaToEntidadeUnidade(item.nome);
      if (!entidade) continue;
      const label = entidade === "SESI" && unidade ? unidade : entidade;
      const atual = mapa.get(label) || 0;
      mapa.set(label, atual + (item.total || 0));
    }

    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [stats?.porCasa, isGerente]);

  // ─── Dados agregados por Entidade ──────────────────────────
  const atendimentosPorEntidade = useMemo(() => {
    const origem = stats?.porCasa || [];
    const mapa = new Map<string, number>();

    for (const item of origem) {
      // Gerente: inclui "Outros" para casas não mapeadas
      const ent = isGerente
        ? mapCasaToEntidadeGerente(item.nome)
        : mapCasaToEntidadeUnidade(item.nome).entidade;
      if (!ent) continue;
      const atual = mapa.get(ent) || 0;
      mapa.set(ent, atual + (item.total || 0));
    }

    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [stats?.porCasa, isGerente]);

  // ─── Opções Selecionadas ──────────────────────────
  const opcoesSelecionadasCompletas = useMemo(() => {
    const dados = stats?.porOpcaoSelecionada || [];

    // Filtrar entradas "false" e vazias
    const dadosFiltrados = dados.filter(d => d.nome && d.nome !== "false" && d.nome.trim() !== "");

    // Gerente: usa todas as opções retornadas pela API (Top 10)
    if (isGerente) {
      return dadosFiltrados.sort((a, b) => b.total - a.total).slice(0, 10);
    }

    // Admin: fixa nas 3 labels conhecidas
    const mapaExistente = new Map(dadosFiltrados.map(d => [d.nome, d.total]));
    return OPCOES_SELECIONADAS_LABELS.map(nome => ({
      nome,
      total: mapaExistente.get(nome) || 0,
    }));
  }, [stats?.porOpcaoSelecionada, isGerente]);

  // ─── PF e PJ ──────────────────────────
  const pfPjData = useMemo(() => {
    const dados = stats?.porOpcaoSelecionada || [];
    let pfTotal = 0;
    let pjTotal = 0;
    for (const d of dados) {
      if (!d.nome || d.nome === "false" || d.nome.trim() === "") continue;
      const trimmed = d.nome.trim();
      if (PF_OPCOES.has(trimmed)) {
        pfTotal += d.total;
      } else if (PJ_OPCOES.has(trimmed)) {
        pjTotal += d.total;
      }
    }
    return [
      { nome: "PF", total: pfTotal },
      { nome: "PJ", total: pjTotal },
    ];
  }, [stats?.porOpcaoSelecionada]);

  const topAssuntosAggregados: AssuntoAggregado[] = useMemo(() => {
    return agruparAssuntos((stats?.porResumo || []) as AssuntoAggregado[]).slice(0, 20);
  }, [stats?.porResumo]);

  if (isLoading) {
    return (
      <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-[var(--ds-accent)]/20 border-t-[var(--ds-accent)] rounded-full animate-spin" />
            <p className="text-sm text-ds-tertiary">Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm text-ds-tertiary">Nenhum dado disponível. Verifique a conexão com o banco de dados.</p>
        </div>
      </Layout>
    );
  }

  return (
      <Layout title="Visão Geral" subtitle="Dashboard de atendimentos em tempo real">
      {/* Filter Toolbar */}
      <FilterToolbar
        title="Visão Geral em Tempo Real"
        showLiveIndicator
        statusText={`Atualização: ${format(lastUpdated, "HH:mm:ss", { locale: ptBR })} · Próxima em ${countdown}s`}
        isDark={isDark}
        activeFilters={
          (selectedEntidades.length > 0 || selectedEquipes.length > 0) ? (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-ds-subtle">
              <span className="text-[10px] uppercase tracking-wider text-ds-tertiary">Filtros ativos:</span>
              {selectedEntidades.map(ent => (
                <span key={ent} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--ds-accent-muted)] text-[var(--ds-accent)] border border-ds-subtle">
                  {ent}
                </span>
              ))}
              {selectedEquipes.map(eq => (
                <span key={eq} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--ds-accent-muted)] text-[var(--ds-accent)] border border-ds-subtle">
                  {eq}
                </span>
              ))}
              <button
                onClick={() => { setSelectedEntidades([]); setSelectedEquipes([]); setUnidade(""); }}
                className="ml-auto text-[10px] text-ds-tertiary hover:text-[var(--ds-kpi-negative)] transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Group 1: Entity & Team */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-ds-tertiary flex items-center gap-1.5">
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
                  ...(isGerente ? [{ value: "Outros", label: "Outros" }] : []),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-ds-tertiary flex items-center gap-1.5">
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

          <div className="hidden lg:block w-px bg-ds-subtle" />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-ds-tertiary flex items-center gap-1.5">
              <CalendarRange className="w-3 h-3" />
              Período
            </label>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onApply={(s, e) => setDateRange({ startDate: s, endDate: e })}
            />
          </div>

          <div className="hidden lg:block w-px bg-ds-subtle" />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-ds-tertiary flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" />
              Ações
            </label>
            <div className="flex items-center gap-2">
              <ExportReportDialog
                selectedCasas={selectedCasas}
                contentRef={contentRef}
                pdfTitle="Visão Geral - Dashboard FIEAM"
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                pdfSubtitle={
                  selectedEntidades.length > 0
                    ? `Dashboard de atendimentos em tempo real · Entidades: ${selectedEntidades.join(", ")}${isGerente && selectedEquipes.length > 0 ? ` · Equipes: ${selectedEquipes.join(", ")}` : selectedEntidades[0] === "SESI" && unidade ? ` · Unidade: ${unidade}` : ""}`
                    : "Dashboard de atendimentos em tempo real · Todas as Entidades"
                }
              />
              <button
                onClick={handleManualRefresh}
                className="flex items-center justify-center w-9 h-9 text-ds-tertiary border border-ds-default rounded-lg transition-all hover:border-ds-strong hover:text-ds-primary hover:shadow-ds-elevated"
                title="Atualizar dados"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </FilterToolbar>

      <div ref={contentRef} className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total no Período"
          value={totalPeriodo.toLocaleString("pt-BR")}
          icon={<CalendarDays className="w-4 h-4" />}
          accent="blue"
          isDark={isDark}
        />
        <KpiCard
          title="Média por Mês"
          value={Math.round(mediaPorMes).toLocaleString("pt-BR")}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="green"
          isDark={isDark}
        />
        <KpiCard
          title="Média por Dia"
          value={mediaPorDia.toFixed(1).replace(".", ",")}
          icon={<MessageSquare className="w-4 h-4" />}
          accent="amber"
          isDark={isDark}
        />
      </div>

      {/* Timeline Chart */}
      <ChartCard
        title="Volume de Atendimentos"
        icon={<TrendingUp className="w-4 h-4" />}
        iconAccent="blue"
        isDark={isDark}
        height={320}
        className="animate-fade-up-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.timeline} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#009FE3" stopOpacity={isDark ? 0.42 : 0.28} />
                <stop offset="60%" stopColor="#009FE3" stopOpacity={isDark ? 0.12 : 0.08} />
                <stop offset="100%" stopColor="#009FE3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeVolume" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00B4FF" />
                <stop offset="100%" stopColor="#0077CC" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={getGridStroke(isDark)} />
            <XAxis
              dataKey="data"
              tickFormatter={(val) => {
                try { return format(new Date(val), "dd/MM"); } catch { return val; }
              }}
              stroke={getAxisColor(isDark)}
              fontSize={11}
              tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              stroke={getAxisColor(isDark)}
              fontSize={11}
              tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <RechartsTooltip
              cursor={{ stroke: isDark ? 'rgba(0,159,227,0.35)' : 'rgba(0,119,204,0.35)', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={(props: any) => (
                <PremiumTooltip
                  {...props}
                  isDark={isDark}
                  valueLabel="Atendimentos"
                  dotColor="#009FE3"
                  labelFormatter={(l: string) => { try { return format(new Date(l), "dd/MM/yyyy"); } catch { return l; } }}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="url(#strokeVolume)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorVolume)"
              activeDot={{ r: 5, fill: '#009FE3', stroke: isDark ? '#0C2135' : '#ffffff', strokeWidth: 2 }}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* PDF-only: Daily Volume Table */}
      <div data-pdf-only style={{ display: "none" }}>
        <Card className={cn("shadow-lg", isDark ? "bg-[#0C2135] border-[#165A8A]" : "bg-white border-slate-200")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              Volume Diário de Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#165A8A]">
                    <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Data</th>
                    <th className="text-right text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Atendimentos</th>
                    <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Data</th>
                    <th className="text-right text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Atendimentos</th>
                    <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Data</th>
                    <th className="text-right text-gray-400 text-xs uppercase tracking-wider py-2 px-3 font-semibold">Atendimentos</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const timeline = stats.timeline || [];
                    const cols = 3;
                    const rows = Math.ceil(timeline.length / cols);
                    return Array.from({ length: rows }).map((_, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-[#165A8A]/30">
                        {Array.from({ length: cols }).map((_, colIdx) => {
                          const item = timeline[colIdx * rows + rowIdx];
                          if (!item) return <td key={colIdx} className="py-1.5 px-3" colSpan={2} />;
                          let dateLabel: string;
                          try { dateLabel = format(new Date(item.data), "dd/MM/yyyy"); } catch { dateLabel = item.data; }
                          return (
                            <React.Fragment key={colIdx}>
                              <td className="py-1.5 px-3 text-gray-300 text-xs">{dateLabel}</td>
                              <td className="py-1.5 px-3 text-white text-xs font-bold text-right">{item.total.toLocaleString("pt-BR")}</td>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Atendimentos por Meio de Comunicação" icon={<Users className="w-4 h-4" />} iconAccent="blue" isDark={isDark} height={300} className="animate-fade-up-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.porCanal} layout="vertical" margin={{ left: 10, right: 60, top: 6, bottom: 6 }} barCategoryGap={6}>
              <defs>{barGradientDefs("canal")}</defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
              <XAxis type="number" stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark) }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={150} stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }} content={<PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />} />
              <Bar dataKey="total" radius={[0, 7, 7, 0]} barSize={24} animationDuration={800}>
                {stats.porCanal.map((_, index) => (
                  <Cell key={`canal-${index}`} fill={getBarGradient("canal", index)} />
                ))}
                <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={11} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={isGerente ? "Atendimentos por Equipe" : "Atendimentos por Unidade"} icon={<Building2 className="w-4 h-4" />} iconAccent="green" isDark={isDark} height={300} className="animate-fade-up-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={atendimentosPorUnidade} layout="vertical" margin={{ left: 10, right: 60, top: 6, bottom: 6 }} barCategoryGap={6}>
              <defs>{barGradientDefs("unidade")}</defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
              <XAxis type="number" stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark) }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={170} stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }} content={<PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />} />
              <Bar dataKey="total" radius={[0, 7, 7, 0]} barSize={24} animationDuration={800}>
                {atendimentosPorUnidade.map((_, index) => (
                  <Cell key={`casa-${index}`} fill={getBarGradient("unidade", index + 4)} />
                ))}
                <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={11} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row: Atendimentos por Entidade + PF/PJ */}
      <div className={`grid grid-cols-1 ${(isArianaUser() || user?.nivel_acesso === "master") ? 'lg:grid-cols-2' : ''} gap-4 items-start`}>
        <ChartCard title="Atendimentos por Entidade" icon={<Building2 className="w-4 h-4" />} iconAccent="orange" isDark={isDark} height={Math.max(180, atendimentosPorEntidade.length * 56 + 50)} className="animate-fade-up-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={atendimentosPorEntidade} layout="vertical" margin={{ left: 10, right: 70, top: 6, bottom: 6 }} barCategoryGap={8}>
              <defs>{barGradientDefs("entidade")}</defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
              <XAxis type="number" stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark) }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={110} stroke={getAxisColor(isDark)} fontSize={12} tick={{ fill: getAxisTickFill(isDark), fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }} content={<PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />} />
              <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={32} animationDuration={900}>
                {atendimentosPorEntidade.map((_, index) => (
                  <Cell key={`entidade-${index}`} fill={getBarGradient("entidade", index + 1)} />
                ))}
                <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={12} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {(isArianaUser() || user?.nivel_acesso === "master") && (
        <ChartCard title="Atendimentos por PF e PJ" icon={<Users className="w-4 h-4" />} iconAccent="green" isDark={isDark} height={220} badge="Clique para detalhes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pfPjData}
              layout="vertical"
              margin={{ left: 10, right: 80, top: 8, bottom: 8 }}
              barCategoryGap={14}
              onClick={(data: any) => {
                if (data?.activePayload?.[0]) {
                  const tipo = data.activePayload[0].payload.nome as 'PF' | 'PJ';
                  openDrilldownPfPj(tipo);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="pfpj-pf" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00B4FF"/><stop offset="100%" stopColor="#0077CC"/></linearGradient>
                <linearGradient id="pfpj-pj" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#FF8A3D"/><stop offset="100%" stopColor="#D95E15"/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
              <XAxis type="number" stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark) }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={44} stroke={getAxisColor(isDark)} fontSize={13} tick={{ fill: getAxisTickFill(isDark), fontWeight: 700 }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }}
                content={(props: any) => (
                  <PremiumTooltip
                    {...props}
                    isDark={isDark}
                    valueLabel={props?.payload?.[0]?.payload?.nome === "PF" ? "Para Você (PF)" : "Para Empresa (PJ)"}
                  />
                )}
              />
              <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={40} animationDuration={900}>
                <Cell key="pf" fill="url(#pfpj-pf)" className="cursor-pointer" />
                <Cell key="pj" fill="url(#pfpj-pj)" className="cursor-pointer" />
                <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={13} fontWeight={800} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        )}
      </div>

      {/* Qtd de Opções Selecionadas — Top 10 */}
      <ChartCard title="Qtd de Opções Selecionadas" icon={<MessageSquare className="w-4 h-4" />} iconAccent="cyan" isDark={isDark} badge="Top 10" height={Math.max(240, opcoesSelecionadasCompletas.length * 48 + 50)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={opcoesSelecionadasCompletas}
            layout="vertical"
            margin={{ left: 10, right: 70, top: 6, bottom: 6 }}
            barCategoryGap={8}
            onClick={(data: any) => {
              if (data?.activePayload?.[0]) {
                const nome = data.activePayload[0].payload.nome;
                openDrilldownOpcao(nome);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>{barGradientDefs("opcao")}</defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke={getGridStroke(isDark)} />
            <XAxis type="number" stroke={getAxisColor(isDark)} fontSize={11} tick={{ fill: getAxisTickFill(isDark) }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nome" width={270} stroke={getAxisColor(isDark)} fontSize={12} tick={{ fill: getAxisTickFill(isDark), fontWeight: 500 }} axisLine={false} tickLine={false} />
            <RechartsTooltip cursor={{ fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' }} content={<PremiumTooltip isDark={isDark} valueLabel="Atendimentos" />} />
            <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={28} animationDuration={900}>
              {opcoesSelecionadasCompletas.map((_, index) => (
                <Cell key={`opcao-${index}`} fill={getBarGradient("opcao", index + 7)} className="cursor-pointer" />
              ))}
              <LabelList dataKey="total" position="right" fill={isDark ? "#E2E8F0" : "#334155"} fontSize={12} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Assuntos + Destaques */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-20">
        <ChartCard
          title="Top 20 Assuntos"
          icon={<Cloud className="w-6 h-6" />}
          iconAccent="purple"
          isDark={isDark}
          noPadding
        >
          <div className="flex flex-wrap gap-x-20 gap-y-1.5 px-5 pb-2 pt-2">
            {(() => {
              const max = Math.max(...topAssuntosAggregados.map(d => d.total), 1);
              const min = Math.min(...topAssuntosAggregados.map(d => d.total), max);
              const step = (max - min) || 1;
              return topAssuntosAggregados.map((item, index) => {
                const color = COLORS[index % COLORS.length];
                const tier = item.total >= min + step * 2 ? 1 : item.total >= min + step ? 2 : 3;
                const cls = tier === 1 ? "text-sm px-3.5 py-1.5" : tier === 2 ? "text-[13px] px-3 py-1" : "text-xs px-2.5 py-0.5";
                return (
                  <Tooltip key={item.nome}>
                    <TooltipTrigger asChild>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium cursor-default transition-all hover:scale-[1.04]", cls)} style={{ borderColor: `${color}35`, backgroundColor: `${color}08`, color }}>
                        {item.nome}
                        <span className="opacity-70 font-bold">{item.total.toLocaleString("pt-BR")}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className={cn("border shadow-lg rounded-lg px-3 py-2", isDark ? "bg-[#0F2A42] border-ds-default text-ds-primary" : "bg-white border-slate-200 text-gray-900")} sideOffset={8}>
                      <p className="font-semibold text-sm">{item.nome}</p>
                      <p className="text-xs text-ds-secondary mt-0.5">
                        <span className="font-bold text-ds-primary">{item.total.toLocaleString("pt-BR")}</span> atendimentos
                        {stats.totais.total > 0 && <span className="ml-1">· {((item.total / stats.totais.total) * 100).toFixed(1)}%</span>}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              });
            })()}
          </div>
        </ChartCard>

        {/* Destaques */}
        <div className={cn(
          "rounded-xl border transition-theme card-hover",
          isDark ? "bg-ds-secondary border-ds-default shadow-ds-card" : "bg-ds-elevated border-ds-default shadow-ds-card"
        )}>
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-ds-primary flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[var(--ds-accent)]" />
              Destaques
            </h3>
          </div>
          <div className="px-5 pb-5 space-y-2.5">
            {(() => {
              const canalLider = stats.porCanal?.[0];
              const casaLider = atendimentosPorUnidade?.[0];
              return (
                <>
                  {canalLider && (
                    <div className="rounded-lg p-3 border border-ds-subtle bg-ds-inset">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ds-accent)]">Canal Líder</span>
                      <p className="font-semibold text-sm mt-0.5 text-ds-primary">{canalLider.nome}</p>
                      <p className="text-[10px] text-ds-tertiary">{canalLider.total.toLocaleString("pt-BR")} atendimentos</p>
                    </div>
                  )}
                  {casaLider && (
                    <div className="rounded-lg p-3 border border-ds-subtle bg-ds-inset">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ds-accent)]">{isGerente ? "Equipe Líder" : "Unidade Líder"}</span>
                      <p className="font-semibold text-sm mt-0.5 text-ds-primary">{casaLider.nome}</p>
                      <p className="text-[10px] text-ds-tertiary">{casaLider.total.toLocaleString("pt-BR")} atendimentos</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className={cn(
        "rounded-xl border transition-theme overflow-hidden",
        isDark ? "bg-ds-secondary border-ds-default shadow-ds-card" : "bg-ds-elevated border-ds-default shadow-ds-card"
      )} data-pdf-exclude>
        <div className="px-5 pt-5 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ds-primary flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--ds-accent)]" />
              Últimos Atendimentos Finalizados
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ds-tertiary">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs border border-ds-default rounded-md px-2 py-1 bg-ds-inset text-ds-primary focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent)]"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            {channelTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-all duration-150 font-medium whitespace-nowrap",
                  activeTab === tab
                    ? "bg-[var(--ds-accent)] text-white shadow-sm"
                    : "text-ds-tertiary border border-ds-subtle hover:text-ds-primary hover:bg-[var(--ds-accent-muted)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ds-default">
                  {["Protocolo","Contato","Canal","Início","Fim","Resumo","Equipe"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ds-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-ds-subtle transition-colors hover:bg-[var(--ds-accent-muted)]">
                      <td className="py-2.5 px-3 font-mono text-xs text-ds-secondary">{item.protocolo}</td>
                      <td className="py-2.5 px-3 text-ds-primary text-[13px]">{item.contato}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">
                          {item.canal}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-ds-tertiary">{formatDateTime(item.dataHoraInicio)}</td>
                      <td className="py-2.5 px-3 text-xs text-ds-tertiary">{formatDateTime(item.dataHoraFim)}</td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-ds-secondary text-[13px]">{item.resumoConversa}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-medium", isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                          {item.casa}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ds-tertiary">Nenhum atendimento encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-ds-subtle">
              <span className="text-[11px] text-ds-tertiary">
                Mostrando {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalFiltered)} de {totalFiltered}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border border-ds-subtle text-ds-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-accent-muted)]"
                >
                  <ChevronLeft className="w-3 h-3" /> Anterior
                </button>
                <span className="text-[11px] px-2 text-ds-tertiary">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border border-ds-subtle text-ds-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-accent-muted)]"
                >
                  Próximo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Drilldown Modal for Opções Selecionadas */}
      <Dialog open={drilldownOpcao.open} onOpenChange={(open) => !open && closeDrilldownOpcao()}>
        <DialogContent className={cn("max-w-[95vw] w-[1200px] max-h-[85vh] overflow-hidden flex flex-col", isDark ? "bg-[#0C2135] border-ds-default" : "bg-white border-slate-200")}>
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-ds-primary">
              <Filter className="w-4 h-4 text-[var(--ds-accent)]" />
              {drilldownOpcao.title}
            </DialogTitle>
            <DialogDescription className="text-ds-tertiary text-xs">
              Atendimentos filtrados • {dateRange.startDate} a {dateRange.endDate}
              {drilldownData && ` • ${drilldownData.length.toLocaleString('pt-BR')} registros`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {drilldownLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-5 h-5 text-[var(--ds-accent)] animate-spin" />
                <span className="text-ds-tertiary ml-3 text-sm">Carregando...</span>
              </div>
            ) : drilldownData && drilldownData.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ds-default">
                      {["Protocolo","Contato","Canal","Início","Fim","Resumo","Equipe"].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider py-2.5 px-3 text-ds-tertiary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.slice((drilldownPage - 1) * DRILLDOWN_PER_PAGE, drilldownPage * DRILLDOWN_PER_PAGE).map((row, idx) => {
                      const fmtD = (d: string) => { if (!d) return '—'; try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; } };
                      return (
                        <tr key={`${row.protocolo}-${idx}`} className="border-b border-ds-subtle transition-colors hover:bg-[var(--ds-accent-muted)]">
                          <td className="py-2 px-3 font-mono text-xs text-[var(--ds-accent)]">{row.protocolo}</td>
                          <td className="py-2 px-3 text-ds-primary text-[13px]">{row.contato || row.identificador || '—'}</td>
                          <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">{row.canal}</span></td>
                          <td className="py-2 px-3 text-xs text-ds-tertiary">{fmtD(row.dataHoraInicio)}</td>
                          <td className="py-2 px-3 text-xs text-ds-tertiary">{fmtD(row.dataHoraFim)}</td>
                          <td className="py-2 px-3 text-ds-secondary max-w-[200px] truncate text-[13px]">{row.resumoConversa || '—'}</td>
                          <td className="py-2 px-3"><span className={cn("text-xs font-medium", row.casa === 'Falta de Interação' ? 'text-[var(--ds-kpi-negative)]' : 'text-emerald-400')}>{row.casa}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {drilldownData.length > DRILLDOWN_PER_PAGE && (
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-ds-subtle px-1">
                    <span className="text-[11px] text-ds-tertiary">Mostrando {((drilldownPage - 1) * DRILLDOWN_PER_PAGE) + 1}-{Math.min(drilldownPage * DRILLDOWN_PER_PAGE, drilldownData.length)} de {drilldownData.length.toLocaleString('pt-BR')}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDrilldownPage(p => Math.max(1, p - 1))} disabled={drilldownPage === 1} className="px-2.5 py-1 text-[11px] text-ds-secondary rounded-md border border-ds-subtle hover:bg-[var(--ds-accent-muted)] disabled:opacity-30 transition-colors">‹ Anterior</button>
                      <span className="text-[11px] text-ds-tertiary px-1">{drilldownPage} / {Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE)}</span>
                      <button onClick={() => setDrilldownPage(p => Math.min(Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE), p + 1))} disabled={drilldownPage >= Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE)} className="px-2.5 py-1 text-[11px] text-ds-secondary rounded-md border border-ds-subtle hover:bg-[var(--ds-accent-muted)] disabled:opacity-30 transition-colors">Próximo ›</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-ds-tertiary text-sm">Nenhum atendimento encontrado para esta opção.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PF/PJ Drilldown Dialog */}
      <Dialog open={drilldownPfPj.open} onOpenChange={(open) => { if (!open) closeDrilldownPfPj(); }}>
        <DialogContent className={cn("max-w-5xl max-h-[85vh] flex flex-col", isDark ? "bg-[#0C2135] border-ds-default" : "bg-white border-slate-200")}>
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-ds-primary">
              <Users className="w-4 h-4 text-emerald-400" />
              {drilldownPfPj.title}
            </DialogTitle>
            <DialogDescription className="text-ds-tertiary text-xs">
              Atendimentos filtrados • {dateRange.startDate} a {dateRange.endDate}
              {drilldownPfPjData && ` • ${drilldownPfPjData.length.toLocaleString('pt-BR')} registros`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {drilldownPfPjLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-5 h-5 text-[var(--ds-accent)] animate-spin" />
                <span className="text-ds-tertiary ml-3 text-sm">Carregando...</span>
              </div>
            ) : drilldownPfPjData && drilldownPfPjData.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ds-default">
                      {["Protocolo","Contato","Canal","Início","Fim","Opção","Equipe"].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider py-2.5 px-3 text-ds-tertiary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownPfPjData.slice((drilldownPfPjPage - 1) * DRILLDOWN_PER_PAGE, drilldownPfPjPage * DRILLDOWN_PER_PAGE).map((row, idx) => {
                      const fmtD = (d: string) => { if (!d) return '—'; try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; } };
                      return (
                        <tr key={`${row.protocolo}-${idx}`} className="border-b border-ds-subtle transition-colors hover:bg-[var(--ds-accent-muted)]">
                          <td className="py-2 px-3 font-mono text-xs text-[var(--ds-accent)]">{row.protocolo}</td>
                          <td className="py-2 px-3 text-ds-primary text-[13px]">{row.contato || row.identificador || '—'}</td>
                          <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">{row.canal}</span></td>
                          <td className="py-2 px-3 text-xs text-ds-tertiary">{fmtD(row.dataHoraInicio)}</td>
                          <td className="py-2 px-3 text-xs text-ds-tertiary">{fmtD(row.dataHoraFim)}</td>
                          <td className="py-2 px-3 text-xs text-[var(--ds-accent)]">{row.opcaoSelecionada || '—'}</td>
                          <td className="py-2 px-3"><span className={cn("text-xs font-medium", row.casa === 'Falta de Interação' ? 'text-[var(--ds-kpi-negative)]' : 'text-emerald-400')}>{row.casa}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {drilldownPfPjData.length > DRILLDOWN_PER_PAGE && (
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-ds-subtle px-1">
                    <span className="text-[11px] text-ds-tertiary">Mostrando {((drilldownPfPjPage - 1) * DRILLDOWN_PER_PAGE) + 1}-{Math.min(drilldownPfPjPage * DRILLDOWN_PER_PAGE, drilldownPfPjData.length)} de {drilldownPfPjData.length.toLocaleString('pt-BR')}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDrilldownPfPjPage(p => Math.max(1, p - 1))} disabled={drilldownPfPjPage === 1} className="px-2.5 py-1 text-[11px] text-ds-secondary rounded-md border border-ds-subtle hover:bg-[var(--ds-accent-muted)] disabled:opacity-30 transition-colors">‹ Anterior</button>
                      <span className="text-[11px] text-ds-tertiary px-1">{drilldownPfPjPage} / {Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE)}</span>
                      <button onClick={() => setDrilldownPfPjPage(p => Math.min(Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE), p + 1))} disabled={drilldownPfPjPage >= Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE)} className="px-2.5 py-1 text-[11px] text-ds-secondary rounded-md border border-ds-subtle hover:bg-[var(--ds-accent-muted)] disabled:opacity-30 transition-colors">Próximo ›</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-ds-tertiary text-sm">Nenhum atendimento encontrado.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
                className="inline-flex flex-col items-center cursor-default transition-all duration-300 hover:scale-110 hover:brightness-125 select-none"
                style={{
                  fontSize: `${fontSize}rem`,
                  color,
                  fontWeight: ratio > 0.6 ? 800 : ratio > 0.3 ? 600 : 500,
                  lineHeight: 1.3,
                }}
              >
                {item.nome}
                <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 600 }}>
                  ({item.total.toLocaleString("pt-BR")})
                </span>
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

