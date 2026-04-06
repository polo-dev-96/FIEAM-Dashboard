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

// Mapeamento de nomes longos de Patrocinados para nomes curtos
const RENOMEACAO_PATROCINADOS: Record<string, string> = {
  "Olá! Quero mais informações sobre os JOGOS SESI 2025, por favor.": "Jogos SESI 2025",
  "Olá! Tenho interesse no pacote Férias Escolares SESI Saúde, quero informações!": "Pacote Férias Escolares",
  "Olá! Tenho interesse no pacote de Saúde Ocular do SESI Saúde, quero informações!": "Pacote Saúde Ocular",
  "Quero falar mais sobre o Curso de Tecnologia da Construção a Seco": "Curso Tecnologia da Construção",
  "Quero falar sobre o curso de Eletricidade Aplicada": "Curso Eletricidade Aplicada",
  "Olá, gostaria de saber mais informações sobre Matrícula do SESI 2026": "Matrícula SESI 2026",
  "Jornada Dev": "Jornada Dev",
  "Quero saber mais informações sobre o curso de Excel Avançado": "Curso Excel Avançado",
  "Gostaria de mais informações sobre o curso de Comandos Elétricos": "Curso Comandos Elétricos",
  "Quero falar sobre o curso de Instalação e Higienização de Ar-condicionado": "Curso Higienização de Ar-condicionado",
  "Quero falar sobre o curso de Mecânico de Refrigeração": "Curso Mecânico de Refrigeração",
  "Quero informações sobre o curso de Operador de Empilhadeira": "Curso Operador de Empilhadeira",
  "Quero falar sobre o curso de Eletricista Industrial": "Curso Eletricista Industrial",
  "Quero Saber mais sobre o curso de Montagem de Quadro de Distribuição": "Curso Quadro de Distribuição",
  "Quero saber mais informações sobre o curso Informática Básica": "Curso Informática Básica",
  "Quero saber mais informações sobre o curso Informática Básica e Avançada": "Curso Informática Básica e Avançada",
  "Quero saber mais informações sobre o curso de Mestre de Obras": "Curso Mestre de Obras",
  "Quero falar sobre o curso de Orçamento de Obras": "Curso Orçamento de Obras",
  "Quero informações sobre o curso de Assistente Administrativo": "Curso Assistente Administrativo",
  "Gostaria de mais informações sobre o curso de Eletricista Instalador": "Curso Eletricista Instalador",
  "Olá, gostaria de saber mais informações sobre a Colônia de Férias do SESI": "Colônia de Férias SESI",
  "Gostaria de mais informações sobre o curso técnico em Automação": "Curso Técnico em Automação",
  "Gostaria de mais informações sobre o curso técnico em Mecânica": "Curso Técnico em Mecânica",
  "Gostaria de informações sobre o curso de instalação e higienização de split": "Curso Higienização de Split",
  "Gostaria de informações sobre o curso técnico em Refrigeração e Climatização": "Curso Refrigeração e Climatização",
  "Gostaria de informações sobre o curso de Mecânico de Refrigeração": "Curso Mecânico de Refrigeração",
  "Gostaria de mais informações sobre o curso de Cronometrista": "Curso Cronometrista",
  "Olá! Tenho interesse no curso de Vantagens Tributárias da ZF de Manaus": "Curso Vantagens Tributárias ZFM",
  "Quero saber mais informações sobre o curso de Montagem de Quadros Elétricos": "Curso Montagem de Quadros Elétricos",
  "Quero saber mais informações sobre o Curso NR35": "Curso NR35",
  "Quero saber mais informações sobre o curso de Informática Avançada": "Curso Informática Avançada",
  "Quero saber sobre o curso de Leitura e Interpretação de Projetos": "Curso Leitura de Projetos",
  "Quero falar sobre o curso de Eletricista Instalador": "Curso Eletricista Instalador",
  "Quero falar sobre o curso de Modelagem para Construção Civil": "Curso Modelagem Construção Civil",
  "Quero falar sobre o curso de Eletricista de Automóveis": "Curso Eletricista de Automóveis",
  "Quero falar sobre o curso de Mecânico de Manutenção em Automóveis": "Curso Mecânico de Automóveis",
  "Quero falar sobre o curso de Mecânico de Manutenção em Motocicletas": "Curso Mecânico de Motocicletas",
  "Quero falar sobre o curso de Mecânico de Manutenção em Motores à Diesel": "Curso Mecânico de Motores Diesel",
  "Quero falar sobre o curso de Soldador de Eletrodo Revestido": "Curso Soldador Eletrodo Revestido",
  "PSICÓLOGO": "Psicólogo",
  "CLÍNICA MEDICA": "Clínica Médica",
  "NUTRICIONISTA": "Nutricionista",
  "FISIOTERAPIA": "Fisioterapia",
  "Marceneiro de Moveis": "Curso Marceneiro de Móveis",
  "PACOTE ALUNOS SESI": "Pacote Alunos SESI",
  "CURSOS ELETRICIDADE": "Cursos de Eletricidade",
};

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);
  const { user } = useAuth();
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
      if (isArianaUser()) {
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

  // ─── Patrocinados (Top 10) — com renomeação e agregação ──────────────────────────
  const patrocinadosData = useMemo(() => {
    const dados = stats?.porPatrocinados || [];
    const mapa = new Map<string, number>();
    for (const d of dados) {
      if (!d.nome || d.nome === "false" || d.nome.trim() === "" || d.nome === "null" || d.nome === "undefined") continue;
      const nomeExibicao = RENOMEACAO_PATROCINADOS[d.nome.trim()] || d.nome.trim();
      mapa.set(nomeExibicao, (mapa.get(nomeExibicao) || 0) + d.total);
    }
    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [stats?.porPatrocinados]);

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
    return agruparAssuntos((stats?.porResumo || []) as AssuntoAggregado[]);
  }, [stats?.porResumo]);

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
      {/* Refresh Info Bar + Professional Filter Layout - Theme Aware */}
      <div className="rounded-xl border border-gray-200 dark:border-[#165A8A] overflow-hidden bg-white dark:bg-[#0C2135] shadow-sm">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-[#165A8A]/40 bg-gray-50 dark:bg-[#081E30]/50 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-wide">
            Visão Geral em Tempo Real
          </span>
          <div className="flex-1" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Última atualização: {format(lastUpdated, "HH:mm:ss", { locale: ptBR })} • Próxima em {countdown}s
          </span>
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
                <SelectMulti
                  values={selectedEntidades}
                  onValuesChange={(values) => {
                    setSelectedEntidades(values as Entidade[]);
                    setSelectedEquipes([]); // Limpa equipes quando entidade muda
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

              {/* Equipe/Unidade */}
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-500 font-bold flex items-center gap-1.5">
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
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#060e1a]/80 border border-gray-200 dark:border-[#1a3a5c]/80 rounded-xl hover:border-[#009FE3]/40 hover:bg-white dark:hover:bg-[#0a1929] hover:text-[#009FE3] dark:hover:text-white transition-all duration-300"
                  title="Atualizar dados"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedEntidades.length > 0 || selectedEquipes.length > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#165A8A]/20 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-600 dark:text-gray-500 uppercase tracking-wider">Filtros ativos:</span>
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
              <button
                onClick={() => {
                  setSelectedEntidades([]);
                  setSelectedEquipes([]);
                  setUnidade("");
                }}
                className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={contentRef} className="space-y-6">
      {/* Stats Cards - values adapt to date filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <StatCard
          title="Total no Período de Atendimento"
          value={totalPeriodo.toLocaleString("pt-BR")}
          icon={<CalendarDays className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Média de Atendimentos por Mês"
          value={Math.round(mediaPorMes).toLocaleString("pt-BR")}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Média de Atendimentos por Dia"
          value={mediaPorDia.toFixed(1).replace(".", ",")}
          icon={<MessageSquare className="w-5 h-5" />}
          color="red"
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

      {/* PDF-only: Daily Volume Table */}
      <div data-pdf-only style={{ display: "none" }}>
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
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
        {/* Por Canal */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Atendimentos por Meio de Comunicação
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.porCanal} layout="vertical" margin={{ left: 10, right: 50 }}>
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
                  <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Unidade/Equipe — Dynamic height based on number of items */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-400" />
              {isGerente ? "Atendimentos por Equipe" : "Atendimentos por Unidade"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atendimentosPorUnidade} layout="vertical" margin={{ left: 10, right: 50 }}>
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
                  {atendimentosPorUnidade.map((_, index) => (
                    <Cell key={`casa-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                  ))}
                  <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row: Atendimentos por Entidade + Atendimentos por PF e PJ (PF/PJ only for Ariana) */}
      <div className={`grid grid-cols-1 ${isArianaUser() ? 'lg:grid-cols-2' : ''} gap-4 items-start`}>
        {/* Atendimentos por Entidade */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-400" />
              Atendimentos por Entidade
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: `${Math.max(150, atendimentosPorEntidade.length * 50 + 40)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atendimentosPorEntidade} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={100}
                  stroke="#9ca3af"
                  fontSize={11}
                  tick={{ fill: '#9ca3af' }}
                />
                <RechartsTooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [value, "Atendimentos"]}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={32}>
                  {atendimentosPorEntidade.map((_, index) => (
                    <Cell key={`entidade-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                  <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Atendimentos por PF e PJ — somente para Ariana */}
        {isArianaUser() && (
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Atendimentos por PF e PJ
              <span className="text-xs text-gray-400 font-normal ml-2">Clique para detalhes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pfPjData}
                layout="vertical"
                margin={{ left: 10, right: 60 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]) {
                    const tipo = data.activePayload[0].payload.nome as 'PF' | 'PJ';
                    openDrilldownPfPj(tipo);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={40}
                  stroke="#9ca3af"
                  fontSize={13}
                  tick={{ fill: '#9ca3af', fontWeight: 700 }}
                />
                <RechartsTooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number, _: any, entry: any) => {
                    const label = entry?.payload?.nome === "PF" ? "Para Você (PF)" : "Para Empresa (PJ)";
                    return [value.toLocaleString("pt-BR"), label];
                  }}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={36}>
                  <Cell key="pf" fill="#009FE3" className="cursor-pointer" />
                  <Cell key="pj" fill="#F37021" className="cursor-pointer" />
                  <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={12} fontWeight={700} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Qtd de Opções Selecionadas — Top 10 — Full width */}
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Qtd de Opções Selecionadas
            <span className="text-xs text-gray-400 font-normal ml-2">Top 10</span>
          </CardTitle>
        </CardHeader>
        <CardContent style={{ height: `${Math.max(200, opcoesSelecionadasCompletas.length * 42 + 40)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={opcoesSelecionadasCompletas}
              layout="vertical"
              margin={{ left: 10, right: 60 }}
              onClick={(data: any) => {
                if (data?.activePayload?.[0]) {
                  const nome = data.activePayload[0].payload.nome;
                  openDrilldownOpcao(nome);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
              <XAxis type="number" stroke="#6b7280" fontSize={11} />
              <YAxis
                type="category"
                dataKey="nome"
                width={260}
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <RechartsTooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [value, "Atendimentos"]}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
                {opcoesSelecionadasCompletas.map((_, index) => (
                  <Cell key={`opcao-${index}`} fill={COLORS[(index + 7) % COLORS.length]} className="cursor-pointer" />
                ))}
                <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Qtd de Atendimentos por Patrocinados — Top 10 — Somente para Ariana */}
      {isArianaUser() && (
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Qtd de Atendimentos por Patrocinados
            <span className="text-xs text-gray-400 font-normal ml-2">Top 10</span>
          </CardTitle>
        </CardHeader>
        <CardContent style={{ height: `${Math.max(200, patrocinadosData.length * 42 + 40)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={patrocinadosData}
              layout="vertical"
              margin={{ left: 10, right: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#165A8A" />
              <XAxis type="number" stroke="#6b7280" fontSize={11} />
              <YAxis
                type="category"
                dataKey="nome"
                width={260}
                stroke="#9ca3af"
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <RechartsTooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [value, "Atendimentos"]}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
                {patrocinadosData.map((_, index) => (
                  <Cell key={`patrocinado-${index}`} fill={COLORS[(index + 10) % COLORS.length]} />
                ))}
                <LabelList dataKey="total" position="right" fill="#94a3b8" fontSize={11} formatter={(v: number) => v.toLocaleString("pt-BR")} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      )}

      {/* Top Assuntos — Tag Chips + Destaques */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader className="pb-1">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-400" />
              Top Assuntos
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">Resumo visual dos principais temas recorrentes no período.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5 py-4">
              {topAssuntosAggregados.map((item, index) => {
                const color = COLORS[index % COLORS.length];
                return (
                  <Tooltip key={item.nome}>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium cursor-default transition-all hover:scale-105"
                        style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}
                      >
                        {item.nome}
                        <span className="text-xs opacity-75 font-bold">{item.total.toLocaleString("pt-BR")}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-[#0C2135] border border-gray-200 shadow-lg rounded-xl px-4 py-3" sideOffset={8}>
                      <p className="font-bold text-sm">{item.nome}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.total.toLocaleString("pt-BR")} atendimentos
                        {stats.totais.total > 0 && ` · ${((item.total / stats.totais.total) * 100).toFixed(1)}%`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Destaques sidebar */}
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-white text-sm font-bold">Destaques</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            {(() => {
              const canalLider = stats.porCanal?.[0];
              const casaLider = atendimentosPorUnidade?.[0];
              return (
                <>
                  {canalLider && (
                    <div className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Canal Líder</span>
                      <p className="text-white font-bold text-sm mt-0.5">{canalLider.nome}</p>
                      <p className="text-gray-400 text-[10px]">{canalLider.total.toLocaleString("pt-BR")} atendimentos</p>
                    </div>
                  )}
                  {casaLider && (
                    <div className="bg-[#081E30] rounded-lg p-3 border border-[#165A8A]/40">
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">{isGerente ? "Equipe Líder" : "Unidade Líder"}</span>
                      <p className="text-white font-bold text-sm mt-0.5">{casaLider.nome}</p>
                      <p className="text-gray-400 text-[10px]">{casaLider.total.toLocaleString("pt-BR")} atendimentos</p>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls Table with Tabs + Pagination */}
      <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg" data-pdf-exclude>
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
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Equipe</th>
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
      </div>

      {/* Drilldown Modal for Opções Selecionadas */}
      <Dialog open={drilldownOpcao.open} onOpenChange={(open) => !open && closeDrilldownOpcao()}>
        <DialogContent className="bg-[#0C2135] border-[#165A8A] text-white max-w-[95vw] w-[1200px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-400" />
              {drilldownOpcao.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Atendimentos filtrados • {dateRange.startDate} a {dateRange.endDate}
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
                        <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Equipe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownData
                        .slice((drilldownPage - 1) * DRILLDOWN_PER_PAGE, drilldownPage * DRILLDOWN_PER_PAGE)
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
                {drilldownData.length > DRILLDOWN_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#165A8A]">
                    <span className="text-xs text-gray-400">
                      Mostrando {((drilldownPage - 1) * DRILLDOWN_PER_PAGE) + 1}-{Math.min(drilldownPage * DRILLDOWN_PER_PAGE, drilldownData.length)} de {drilldownData.length.toLocaleString('pt-BR')}
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
                        {drilldownPage} / {Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setDrilldownPage(p => Math.min(Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE), p + 1))}
                        disabled={drilldownPage >= Math.ceil(drilldownData.length / DRILLDOWN_PER_PAGE)}
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
                Nenhum atendimento encontrado para esta opção.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PF/PJ Drilldown Dialog */}
      <Dialog open={drilldownPfPj.open} onOpenChange={(open) => { if (!open) closeDrilldownPfPj(); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] bg-[#0C2135] border-[#165A8A] text-white flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {drilldownPfPj.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Atendimentos filtrados • {dateRange.startDate} a {dateRange.endDate}
              {drilldownPfPjData && ` • ${drilldownPfPjData.length.toLocaleString('pt-BR')} registros`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {drilldownPfPjLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-gray-400 ml-3">Carregando...</span>
              </div>
            ) : drilldownPfPjData && drilldownPfPjData.length > 0 ? (
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
                        <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Opção</th>
                        <th className="text-left text-gray-400 text-xs uppercase tracking-wider py-3 px-3">Equipe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownPfPjData
                        .slice((drilldownPfPjPage - 1) * DRILLDOWN_PER_PAGE, drilldownPfPjPage * DRILLDOWN_PER_PAGE)
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
                              <td className="py-2.5 px-3 text-cyan-300 text-xs">{row.opcaoSelecionada || '—'}</td>
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

                {drilldownPfPjData.length > DRILLDOWN_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#165A8A]">
                    <span className="text-xs text-gray-400">
                      Mostrando {((drilldownPfPjPage - 1) * DRILLDOWN_PER_PAGE) + 1}-{Math.min(drilldownPfPjPage * DRILLDOWN_PER_PAGE, drilldownPfPjData.length)} de {drilldownPfPjData.length.toLocaleString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDrilldownPfPjPage(p => Math.max(1, p - 1))}
                        disabled={drilldownPfPjPage === 1}
                        className="px-3 py-1 text-xs text-gray-300 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                      >
                        ‹ Anterior
                      </button>
                      <span className="text-xs text-gray-400">
                        {drilldownPfPjPage} / {Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setDrilldownPfPjPage(p => Math.min(Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE), p + 1))}
                        disabled={drilldownPfPjPage >= Math.ceil(drilldownPfPjData.length / DRILLDOWN_PER_PAGE)}
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
                Nenhum atendimento encontrado.
              </div>
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
