import { useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import {
  UserCog, Plus, Trash2, Pencil, Eye, EyeOff,
  Check, X, Shield, ShieldOff, Loader2, Users, Megaphone, Send, ChevronDown, Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Constantes ─────────────────────────────────────────────────────────────

// Todas as rotas que podem ser atribuídas a um usuário
const ALL_ROUTES: { href: string; label: string; description: string }[] = [
  { href: "/",             label: "Visão Geral",         description: "Dashboard principal em tempo real" },
  { href: "/anual",        label: "Dashboard SAC",        description: "Indicadores consolidados do SAC" },
  { href: "/patrocinados", label: "Patrocinados",          description: "Canais e origens patrocinadas" },
  { href: "/protocolo",    label: "Pesquisar Protocolo",   description: "Consulta rápida por protocolo" },
  { href: "/telefone",     label: "Pesquisar Telefone",    description: "Histórico de relacionamento" },
  { href: "/openai",       label: "Dashboard OpenAI",      description: "Custos, projetos e consumo de IA" },
];

// ─── Tipos ────────────────────────────────────────────────────────────────

interface UsuarioDB {
  id: number;
  email: string;
  nivel_acesso: string;
  rotas_permitidas: string[] | null;
  ativo: number;
  data_criacao: string;
}

interface CampanhaDisparada {
  id: number;
  nome_campanha: string;
  data_disparo: string;
  total_disparadas: number;
  created_at: string;
}

// ─── Hook para chamar a API com o token do admin ─────────────────────────

function useAdminFetch() {
  const { token } = useAuth();
  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro na requisição");
      }
      return res.json();
    },
    [token]
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();
  const adminFetch = useAdminFetch();

  // ── Dialogs ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UsuarioDB | null>(null);
  const [deleteUser, setDeleteUser] = useState<UsuarioDB | null>(null);

  // ── Formulário de criação ─────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRoutes, setNewRoutes] = useState<string[]>([]);

  // ── Formulário de edição de permissões ────────────────────────────────
  const [editRoutes, setEditRoutes] = useState<string[]>([]);

  // ── Aba ativa ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"usuarios" | "campanhas">("usuarios");

  // ── Formulário de Campanha Disparada ──────────────────────────────────
  const [campFormOpen, setCampFormOpen] = useState(false);
  const [campEditItem, setCampEditItem] = useState<CampanhaDisparada | null>(null);
  const [campDeleteId, setCampDeleteId] = useState<number | null>(null);
  const [campNome, setCampNome] = useState("");
  const [campData, setCampData] = useState("");
  const [campTotal, setCampTotal] = useState("");
  const [campDropdownOpen, setCampDropdownOpen] = useState(false);
  const [campSearch, setCampSearch] = useState("");

  // ── Query: busca lista de usuários ────────────────────────────────────
  const { data: users = [], isLoading } = useQuery<UsuarioDB[]>({
    queryKey: ["admin-users"],
    queryFn: () => adminFetch("/api/admin/users"),
    refetchOnWindowFocus: false,
  });

  // ── Mutation: criar usuário ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () =>
      adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          rotas_permitidas: newRoutes.length > 0 ? newRoutes : null,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Usuário criado com sucesso!" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRoutes([]);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    },
  });

  // ── Mutation: atualizar permissões ────────────────────────────────────
  const permMutation = useMutation({
    mutationFn: (userId: number) =>
      adminFetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({
          rotas_permitidas: editRoutes.length > 0 ? editRoutes : null,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Permissões atualizadas!" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUser(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar permissões", description: err.message, variant: "destructive" });
    },
  });

  // ── Mutation: remover usuário ─────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (userId: number) =>
      adminFetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Usuário removido com sucesso!" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteUser(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover usuário", description: err.message, variant: "destructive" });
    },
  });

  // ── Query: nomes de campanhas do banco principal (para o dropdown) ────────
  const { data: campanhasNomes = [], isFetching: campanhasNomesFetching } = useQuery<string[]>({
    queryKey: ["admin-campanhas-nomes"],
    queryFn: () => adminFetch("/api/admin/campanhas-nomes"),
    refetchOnWindowFocus: false,
    enabled: campFormOpen,
    staleTime: 5 * 60 * 1000,
  });

  // ── Query: campanhas disparadas ───────────────────────────────────────
  const { data: campanhas = [], isLoading: campanhasLoading } = useQuery<CampanhaDisparada[]>({
    queryKey: ["admin-campanhas-disparadas"],
    queryFn: () => adminFetch("/api/admin/campanhas-disparadas"),
    refetchOnWindowFocus: false,
    enabled: activeTab === "campanhas",
  });

  // ── Mutation: salvar campanha disparada (create ou edit) ──────────────
  const campSaveMutation = useMutation({
    mutationFn: () => {
      if (campEditItem) {
        return adminFetch(`/api/admin/campanhas-disparadas/${campEditItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ nome_campanha: campNome.trim(), data_disparo: campData, total_disparadas: Number(campTotal) }),
        });
      }
      return adminFetch("/api/admin/campanhas-disparadas", {
        method: "POST",
        body: JSON.stringify({ nome_campanha: campNome.trim(), data_disparo: campData, total_disparadas: Number(campTotal) }),
      });
    },
    onSuccess: () => {
      toast({ title: campEditItem ? "Registro atualizado!" : "Registro criado!" });
      qc.invalidateQueries({ queryKey: ["admin-campanhas-disparadas"] });
      setCampFormOpen(false);
      setCampEditItem(null);
      setCampNome("");
      setCampData("");
      setCampTotal("");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  // ── Mutation: remover campanha disparada ──────────────────────────────
  const campDeleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminFetch(`/api/admin/campanhas-disparadas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Registro removido com sucesso!" });
      qc.invalidateQueries({ queryKey: ["admin-campanhas-disparadas"] });
      setCampDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function toggleRoute(routes: string[], setRoutes: (r: string[]) => void, href: string) {
    setRoutes(routes.includes(href) ? routes.filter((r) => r !== href) : [...routes, href]);
  }

  function openEdit(u: UsuarioDB) {
    setEditRoutes(u.rotas_permitidas ?? []);
    setEditUser(u);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  // ── Estilos base ──────────────────────────────────────────────────────

  const cardCls = cn(
    "rounded-2xl border p-5",
    isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"
  );

  const inputCls = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all",
    isDark
      ? "border-white/10 bg-white/[0.06] text-white placeholder:text-white/30 focus:border-[var(--ds-accent)]/60"
      : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ds-accent)]"
  );

  const labelCls = cn("mb-1.5 block text-xs font-bold uppercase tracking-wider", isDark ? "text-white/50" : "text-slate-500");

  const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-[var(--ds-accent)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50";
  const btnGhost = cn(
    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
    isDark ? "border-white/10 text-white/70 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
  );

  // ─────────────────────────────────────────────────────────────────────

  function openCampForm(item: CampanhaDisparada | null) {
    setCampEditItem(item);
    setCampNome(item ? item.nome_campanha : "");
    setCampData(item ? String(item.data_disparo).slice(0, 10) : "");
    setCampTotal(item ? String(item.total_disparadas) : "");
    setCampFormOpen(true);
    setCampDropdownOpen(false);
    setCampSearch("");
  }

  function formatDisparoDate(dateStr: string) {
    if (!dateStr) return "—";
    try {
      const dateOnly = String(dateStr).slice(0, 10);
      const d = new Date(dateOnly + "T12:00:00");
      if (isNaN(d.getTime())) return dateOnly;
      return d.toLocaleDateString("pt-BR");
    } catch { return String(dateStr).slice(0, 10); }
  }

  return (
    <Layout title="Administração">
      <div className="mx-auto max-w-5xl space-y-6 p-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ds-accent)]/10">
              {activeTab === "usuarios"
                ? <UserCog className="h-5 w-5 text-[var(--ds-accent)]" />
                : <Megaphone className="h-5 w-5 text-[var(--ds-accent)]" />}
            </div>
            <div>
              <h1 className={cn("text-xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
                {activeTab === "usuarios" ? "Gerenciar Usuários" : "Campanhas Disparadas"}
              </h1>
              <p className={cn("text-xs", isDark ? "text-white/40" : "text-slate-500")}>
                {activeTab === "usuarios"
                  ? "Crie, edite permissões e remova usuários do sistema"
                  : "Registre manualmente quantas campanhas foram disparadas por período"}
              </p>
            </div>
          </div>

          {activeTab === "usuarios" ? (
            <button
              onClick={() => { setNewEmail(""); setNewPassword(""); setNewRoutes([]); setCreateOpen(true); }}
              className={btnPrimary}
            >
              <Plus className="h-4 w-4" />
              Novo Usuário
            </button>
          ) : (
            <button onClick={() => openCampForm(null)} className={btnPrimary}>
              <Plus className="h-4 w-4" />
              Adicionar Registro
            </button>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className={cn(
          "flex gap-1 rounded-xl border p-1 w-fit",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
        )}>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
              activeTab === "usuarios"
                ? isDark ? "bg-[var(--ds-accent)] text-white" : "bg-white text-[var(--ds-accent)] shadow border border-slate-200"
                : isDark ? "text-white/50 hover:text-white/80" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="h-4 w-4" /> Usuários
          </button>
          <button
            onClick={() => setActiveTab("campanhas")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
              activeTab === "campanhas"
                ? isDark ? "bg-[var(--ds-accent)] text-white" : "bg-white text-[var(--ds-accent)] shadow border border-slate-200"
                : isDark ? "text-white/50 hover:text-white/80" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Megaphone className="h-4 w-4" /> Campanhas Disparadas
          </button>
        </div>

        {/* ══ Aba Usuários ═══════════════════════════════════════════ */}
        {activeTab === "usuarios" && (<>

        {/* ── Tabela de Usuários ──────────────────────────────────────── */}
        <div className={cardCls}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--ds-accent)]" />
              <span className={cn("text-sm", isDark ? "text-white/50" : "text-slate-500")}>Carregando usuários...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className={cn("h-8 w-8", isDark ? "text-white/20" : "text-slate-300")} />
              <p className={cn("text-sm font-bold", isDark ? "text-white/40" : "text-slate-400")}>Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn("border-b text-left text-[10px] font-extrabold uppercase tracking-wider",
                    isDark ? "border-white/10 text-white/40" : "border-slate-100 text-slate-400")}>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Abas Liberadas</th>
                    <th className="pb-3 pr-4">Desde</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-subtle">
                  {users.map((u) => (
                    <tr key={u.id} className={cn("transition-colors", isDark ? "divide-white/[0.04]" : "divide-slate-100")}>
                      {/* Email */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white",
                            "bg-[var(--ds-accent)]"
                          )}>
                            {u.email[0]?.toUpperCase()}
                          </div>
                          <span className={cn("font-bold", isDark ? "text-white" : "text-slate-800")}>{u.email}</span>
                        </div>
                      </td>

                      {/* Abas */}
                      <td className="py-3.5 pr-4">
                        {u.rotas_permitidas == null ? (
                          <span className={cn("text-xs italic", isDark ? "text-white/30" : "text-slate-400")}>Padrão ({u.nivel_acesso})</span>
                        ) : u.rotas_permitidas.length === 0 ? (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-500")}>
                            <ShieldOff className="h-3 w-3" /> Sem acesso
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.rotas_permitidas.map((r) => {
                              const found = ALL_ROUTES.find((x) => x.href === r);
                              return (
                                <span key={r} className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  isDark ? "bg-[var(--ds-accent)]/10 text-[var(--ds-accent)]" : "bg-sky-50 text-sky-700"
                                )}>
                                  {found?.label ?? r}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Data criação */}
                      <td className={cn("py-3.5 pr-4 text-xs", isDark ? "text-white/40" : "text-slate-400")}>
                        {formatDate(u.data_criacao)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 pr-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          u.ativo === 1
                            ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                            : isDark ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-500"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", u.ativo === 1 ? "bg-emerald-500" : "bg-slate-400")} />
                          {u.ativo === 1 ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(u)}
                            title="Editar permissões"
                            className={cn(
                              "rounded-xl p-2 transition-all",
                              isDark ? "text-white/40 hover:bg-white/[0.06] hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteUser(u)}
                            title="Remover usuário"
                            className={cn(
                              "rounded-xl p-2 transition-all",
                              "text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Legenda de abas disponíveis ─────────────────────────────── */}
        <div className={cn("rounded-2xl border p-4", isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-100 bg-slate-50")}>
          <p className={cn("mb-3 text-[10px] font-extrabold uppercase tracking-wider", isDark ? "text-white/30" : "text-slate-400")}>
            Abas disponíveis para atribuição
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_ROUTES.map((r) => (
              <div key={r.href} className="flex items-start gap-2">
                <Shield className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ds-accent)]" />
                <div>
                  <p className={cn("text-xs font-bold", isDark ? "text-white/70" : "text-slate-700")}>{r.label}</p>
                  <p className={cn("text-[10px]", isDark ? "text-white/30" : "text-slate-400")}>{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        </>)}

        {/* ══ Aba Campanhas Disparadas ═══════════════════════════════════ */}
        {activeTab === "campanhas" && (
          <div className={cardCls}>
            {campanhasLoading ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--ds-accent)]" />
                <span className={cn("text-sm", isDark ? "text-white/50" : "text-slate-500")}>Carregando registros...</span>
              </div>
            ) : campanhas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Send className={cn("h-8 w-8", isDark ? "text-white/20" : "text-slate-300")} />
                <p className={cn("text-sm font-bold", isDark ? "text-white/40" : "text-slate-400")}>Nenhum registro cadastrado</p>
                <p className={cn("text-xs", isDark ? "text-white/30" : "text-slate-400")}>Clique em "Adicionar Registro" para inserir dados de disparos de campanhas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("border-b text-left text-[10px] font-extrabold uppercase tracking-wider",
                      isDark ? "border-white/10 text-white/40" : "border-slate-100 text-slate-400")}>
                      <th className="pb-3 pr-4">Nome da Campanha</th>
                      <th className="pb-3 pr-4">Data do Disparo</th>
                      <th className="pb-3 pr-4">Qtd. Disparadas</th>
                      <th className="pb-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ds-subtle">
                    {campanhas.map((c) => (
                      <tr key={c.id} className={cn("transition-colors", isDark ? "divide-white/[0.04]" : "divide-slate-100")}>
                        <td className="py-3.5 pr-4">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                              isDark ? "bg-emerald-500/10" : "bg-emerald-50")}>
                              <Megaphone className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span className={cn("min-w-0 truncate text-xs font-medium", isDark ? "text-white/80" : "text-slate-700")}>
                              {c.nome_campanha}
                            </span>
                          </div>
                        </td>
                        <td className={cn("py-3.5 pr-4 text-xs font-medium", isDark ? "text-white/60" : "text-slate-600")}>
                          {formatDisparoDate(c.data_disparo)}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                            isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                          )}>
                            <Send className="h-3 w-3" />
                            {Number(c.total_disparadas).toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openCampForm(c)}
                              title="Editar"
                              className={cn(
                                "rounded-xl p-2 transition-all",
                                isDark ? "text-white/40 hover:bg-white/[0.06] hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              )}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setCampDeleteId(c.id)}
                              title="Remover"
                              className="rounded-xl p-2 transition-all text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══ Dialog: Campanha Disparada (criar / editar) ════════════════ */}
      <Dialog open={campFormOpen} onOpenChange={(v) => { if (!v) { setCampFormOpen(false); setCampEditItem(null); } }}>
        <DialogContent className={cn("max-w-md rounded-3xl border p-0 shadow-2xl",
          isDark ? "border-white/10 bg-[#0d1f35]" : "border-slate-200 bg-white")}>
          <DialogHeader className={cn("border-b px-6 py-5", isDark ? "border-white/10" : "border-slate-100")}>
            <DialogTitle className={cn("text-base font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {campEditItem ? "Editar Registro" : "Novo Registro"}
            </DialogTitle>
            <DialogDescription className={cn("text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              Selecione a campanha, informe a data do disparo e a quantidade. A mesma campanha pode ter múltiplos registros em datas diferentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div>
              <label className={labelCls}>Nome da Campanha</label>
              {campanhasNomesFetching ? (
                <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5", isDark ? "border-white/10 bg-white/[0.06]" : "border-slate-200 bg-slate-50")}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ds-accent)]" />
                  <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>Carregando campanhas...</span>
                </div>
              ) : (
                <div className="relative">
                  {/* Trigger button */}
                  <button
                    type="button"
                    onClick={() => { setCampDropdownOpen((v) => !v); setCampSearch(""); }}
                    className={cn(
                      "w-full grid grid-cols-[1fr_auto] items-center rounded-xl border px-3 py-2.5 text-sm outline-none transition-all text-left",
                      isDark
                        ? "border-white/10 bg-white/[0.06] text-white focus:border-[var(--ds-accent)]/60"
                        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-[var(--ds-accent)]",
                      !campNome && (isDark ? "text-white/30" : "text-slate-400")
                    )}
                  >
                    <span className="truncate min-w-0" title={campNome || undefined}>{campNome || "Selecionar campanha..."}</span>
                    <ChevronDown className={cn(
                      "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
                      isDark ? "text-white/40" : "text-slate-400",
                      campDropdownOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown panel */}
                  {campDropdownOpen && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div className="fixed inset-0 z-40" onClick={() => setCampDropdownOpen(false)} />
                      <div className={cn(
                        "absolute z-50 mt-1.5 w-full rounded-2xl border shadow-2xl overflow-hidden",
                        isDark ? "border-white/10 bg-[#0a1929]" : "border-slate-200 bg-white"
                      )}>
                        {/* Search */}
                        <div className={cn(
                          "flex items-center gap-2 border-b px-3 py-2",
                          isDark ? "border-white/10" : "border-slate-100"
                        )}>
                          <Search className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/30" : "text-slate-400")} />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Buscar campanha..."
                            value={campSearch}
                            onChange={(e) => setCampSearch(e.target.value)}
                            className={cn(
                              "w-full bg-transparent text-xs outline-none",
                              isDark ? "text-white placeholder:text-white/30" : "text-slate-700 placeholder:text-slate-400"
                            )}
                          />
                        </div>

                        {/* Options list */}
                        <div className="max-h-52 overflow-y-auto">
                          {(() => {
                            const allNomes = campEditItem && campNome && !campanhasNomes.includes(campNome)
                              ? [...campanhasNomes, campNome]
                              : campanhasNomes;
                            const filtered = allNomes.filter(n =>
                              n.toLowerCase().includes(campSearch.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className={cn("px-3 py-4 text-center text-xs", isDark ? "text-white/30" : "text-slate-400")}>
                                  Nenhuma campanha encontrada
                                </div>
                              );
                            }
                            return filtered.map((nome) => (
                              <button
                                key={nome}
                                type="button"
                                onClick={() => { setCampNome(nome); setCampDropdownOpen(false); setCampSearch(""); }}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 text-xs transition-colors grid grid-cols-[12px_1fr] items-center gap-2",
                                  nome === campNome
                                    ? isDark
                                      ? "bg-[var(--ds-accent)]/15 text-[var(--ds-accent)] font-bold"
                                      : "bg-sky-50 text-sky-700 font-bold"
                                    : isDark
                                      ? "text-white/80 hover:bg-white/[0.05]"
                                      : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                <Check className={cn("h-3 w-3 shrink-0", nome !== campNome && "invisible")} />
                                <span className="truncate min-w-0">{nome}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <p className={cn("mt-1.5 text-[10px]", isDark ? "text-white/30" : "text-slate-400")}>
                Campanhas listadas a partir do banco de atendimentos
              </p>
            </div>
            <div>
              <label className={labelCls}>Data do Disparo</label>
              <input
                type="date"
                value={campData}
                onChange={(e) => setCampData(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Quantidade Disparada</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 5000"
                value={campTotal}
                onChange={(e) => setCampTotal(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className={cn("flex justify-end gap-2 border-t px-6 py-4", isDark ? "border-white/10" : "border-slate-100")}>
            <button onClick={() => { setCampFormOpen(false); setCampEditItem(null); }} className={btnGhost} disabled={campSaveMutation.isPending}>
              Cancelar
            </button>
            <button
              onClick={() => campSaveMutation.mutate()}
              className={btnPrimary}
              disabled={campSaveMutation.isPending || !campNome.trim() || !campData || !campTotal || Number(campTotal) < 0}
            >
              {campSaveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Confirmar Remoção de Campanha ═══════════════════════ */}
      <Dialog open={campDeleteId !== null} onOpenChange={(v) => { if (!v) setCampDeleteId(null); }}>
        <DialogContent className={cn("max-w-sm rounded-3xl border p-0 shadow-2xl",
          isDark ? "border-white/10 bg-[#0d1f35]" : "border-slate-200 bg-white")}>
          <DialogHeader className={cn("border-b px-6 py-5", isDark ? "border-white/10" : "border-slate-100")}>
            <DialogTitle className="text-base font-extrabold text-rose-500">Remover Registro</DialogTitle>
            <DialogDescription className={cn("text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className={cn("flex justify-end gap-2 border-t px-6 py-4", isDark ? "border-white/10" : "border-slate-100")}>
            <button onClick={() => setCampDeleteId(null)} className={btnGhost} disabled={campDeleteMutation.isPending}>
              Cancelar
            </button>
            <button
              onClick={() => campDeleteId !== null && campDeleteMutation.mutate(campDeleteId)}
              disabled={campDeleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {campDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Criar Usuário ══════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={cn("max-w-md rounded-3xl border p-0 shadow-2xl",
          isDark ? "border-white/10 bg-[#0d1f35]" : "border-slate-200 bg-white")}>
          <DialogHeader className={cn("border-b px-6 py-5", isDark ? "border-white/10" : "border-slate-100")}>
            <DialogTitle className={cn("text-base font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              Novo Usuário
            </DialogTitle>
            <DialogDescription className={cn("text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              Preencha os dados e selecione as abas que o usuário poderá acessar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            {/* Email */}
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                placeholder="usuario@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Senha */}
            <div>
              <label className={labelCls}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(inputCls, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-tertiary hover:text-ds-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Abas */}
            <div>
              <label className={labelCls}>Abas permitidas</label>
              <div className={cn("rounded-xl border divide-y", isDark ? "border-white/10 divide-white/[0.04]" : "border-slate-200 divide-slate-100")}>
                {ALL_ROUTES.map((r) => {
                  const checked = newRoutes.includes(r.href);
                  return (
                    <label key={r.href} className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                      isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"
                    )}>
                      <div className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        checked
                          ? "border-[var(--ds-accent)] bg-[var(--ds-accent)] text-white"
                          : isDark ? "border-white/20 bg-transparent" : "border-slate-300 bg-transparent"
                      )}>
                        {checked && <Check className="h-3 w-3" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoute(newRoutes, setNewRoutes, r.href)}
                        className="sr-only"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-800")}>{r.label}</p>
                        <p className={cn("text-[10px]", isDark ? "text-white/40" : "text-slate-400")}>{r.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className={cn("mt-1.5 text-[10px]", isDark ? "text-white/30" : "text-slate-400")}>
                {newRoutes.length === 0 ? "Nenhuma aba selecionada — usuário não terá acesso às páginas." : `${newRoutes.length} aba(s) selecionada(s)`}
              </p>
            </div>
          </div>

          <div className={cn("flex justify-end gap-2 border-t px-6 py-4", isDark ? "border-white/10" : "border-slate-100")}>
            <button onClick={() => setCreateOpen(false)} className={btnGhost} disabled={createMutation.isPending}>
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              className={btnPrimary}
              disabled={createMutation.isPending || !newEmail.trim() || newPassword.length < 6}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Usuário
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Editar Permissões ══════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent className={cn("max-w-md rounded-3xl border p-0 shadow-2xl",
          isDark ? "border-white/10 bg-[#0d1f35]" : "border-slate-200 bg-white")}>
          <DialogHeader className={cn("border-b px-6 py-5", isDark ? "border-white/10" : "border-slate-100")}>
            <DialogTitle className={cn("text-base font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              Editar Permissões
            </DialogTitle>
            <DialogDescription className={cn("truncate text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <label className={labelCls}>Abas permitidas</label>
            <div className={cn("rounded-xl border divide-y", isDark ? "border-white/10 divide-white/[0.04]" : "border-slate-200 divide-slate-100")}>
              {ALL_ROUTES.map((r) => {
                const checked = editRoutes.includes(r.href);
                return (
                  <label key={r.href} className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                    isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"
                  )}>
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                      checked
                        ? "border-[var(--ds-accent)] bg-[var(--ds-accent)] text-white"
                        : isDark ? "border-white/20 bg-transparent" : "border-slate-300 bg-transparent"
                    )}>
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRoute(editRoutes, setEditRoutes, r.href)}
                      className="sr-only"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-800")}>{r.label}</p>
                      <p className={cn("text-[10px]", isDark ? "text-white/40" : "text-slate-400")}>{r.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className={cn("mt-1.5 text-[10px]", isDark ? "text-white/30" : "text-slate-400")}>
              {editRoutes.length === 0 ? "Sem acesso a nenhuma página." : `${editRoutes.length} aba(s) selecionada(s)`}
            </p>
          </div>

          <div className={cn("flex justify-end gap-2 border-t px-6 py-4", isDark ? "border-white/10" : "border-slate-100")}>
            <button onClick={() => setEditUser(null)} className={btnGhost} disabled={permMutation.isPending}>
              Cancelar
            </button>
            <button
              onClick={() => editUser && permMutation.mutate(editUser.id)}
              className={btnPrimary}
              disabled={permMutation.isPending}
            >
              {permMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Confirmar Remoção ══════════════════════════════════ */}
      <Dialog open={!!deleteUser} onOpenChange={(v) => { if (!v) setDeleteUser(null); }}>
        <DialogContent className={cn("max-w-sm rounded-3xl border p-0 shadow-2xl",
          isDark ? "border-white/10 bg-[#0d1f35]" : "border-slate-200 bg-white")}>
          <DialogHeader className={cn("border-b px-6 py-5", isDark ? "border-white/10" : "border-slate-100")}>
            <DialogTitle className={cn("text-base font-extrabold text-rose-500")}>
              Remover Usuário
            </DialogTitle>
            <DialogDescription className={cn("text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              Esta ação irá desativar o acesso do usuário ao sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <div className={cn("rounded-xl border p-3", isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50")}>
              <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-800")}>{deleteUser?.email}</p>
            </div>
            <p className={cn("mt-3 text-xs", isDark ? "text-white/40" : "text-slate-500")}>
              O usuário será desativado e não poderá mais fazer login. O registro é mantido no banco de dados.
            </p>
          </div>

          <div className={cn("flex justify-end gap-2 border-t px-6 py-4", isDark ? "border-white/10" : "border-slate-100")}>
            <button onClick={() => setDeleteUser(null)} className={btnGhost} disabled={deleteMutation.isPending}>
              Cancelar
            </button>
            <button
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
