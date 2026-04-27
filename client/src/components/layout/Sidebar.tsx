import { Link, useLocation } from "wouter";
import {
  Brain,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Phone,
  Search,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

type NavSection = "dashboards" | "consultas" | "inteligencia";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  section: NavSection;
};

const navItems: NavItem[] = [
  { href: "/", label: "Visão Geral", description: "Resumo executivo em tempo real", icon: LayoutDashboard, section: "dashboards" },
  { href: "/anual", label: "Dashboard SAC", description: "Indicadores consolidados do SAC", icon: CalendarRange, section: "dashboards" },
  { href: "/patrocinados", label: "Patrocinados", description: "Canais e origens patrocinadas", icon: Users, section: "dashboards" },
  { href: "/protocolo", label: "Pesquisar Protocolo", description: "Consulta rápida por protocolo", icon: Search, section: "consultas" },
  { href: "/telefone", label: "Pesquisar Telefone", description: "Histórico de relacionamento", icon: Phone, section: "consultas" },
  { href: "/openai", label: "Dashboard OpenAI", description: "Custos, projetos e consumo de IA", icon: Brain, section: "inteligencia" },
];

const sectionLabels: Record<NavSection, string> = {
  dashboards: "Dashboards",
  consultas: "Consultas",
  inteligencia: "Inteligência",
};

function initialsFromEmail(email?: string) {
  if (!email) return "FI";
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return "FI";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FI";
}

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<NavSection, boolean>>({
    dashboards: true,
    consultas: true,
    inteligencia: true,
  });
  const { collapsed, toggle } = useSidebar();
  const { logout, canAccess, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const allowedItems = navItems.filter((item) => canAccess(item.href));
  const sections = (Object.keys(sectionLabels) as NavSection[])
    .map((section) => ({
      section,
      label: sectionLabels[section],
      items: allowedItems.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed left-4 top-4 z-50 rounded-2xl border shadow-lg backdrop-blur-xl md:hidden",
          isDark
            ? "border-white/10 bg-[#071A2E]/90 text-white"
            : "border-white/80 bg-white/90 text-slate-900"
        )}
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 border-r transition-all duration-300 ease-out md:translate-x-0",
          isDark
            ? "border-white/10 bg-[#061421]/[0.96] text-ds-primary shadow-[18px_0_60px_rgba(0,0,0,.28)]"
            : "border-slate-200/80 bg-white/[0.96] text-ds-primary shadow-[18px_0_60px_rgba(15,23,42,.08)]",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-[-120px] h-72 w-72 rounded-full bg-[var(--ds-accent)]/[0.15] blur-3xl" />
          <div className="absolute bottom-10 right-[-120px] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col">
          <div className={cn("border-b border-ds-subtle", collapsed ? "px-3 py-4" : "px-4 py-4")}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border p-2 shadow-sm",
                  isDark ? "border-white/10 bg-white/[0.06]" : "border-sky-100 bg-sky-50"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--ds-accent)]/[0.18] to-transparent" />
                <img src="/Icone_Logo.png" alt="FIEAM" className="relative h-full w-full object-contain" />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="truncate text-base font-extrabold tracking-[-0.03em] text-ds-primary">FIEAM</h1>
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-ds-tertiary">
                    Sistema Indústria
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <div
                className={cn(
                  "mt-4 rounded-2xl border px-3 py-2.5",
                  isDark ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <p className="text-[11px] font-bold text-ds-primary">Operação online</p>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-ds-tertiary">
                  Monitoramento institucional em tempo real.
                </p>
              </div>
            )}
          </div>

          <nav className={cn("flex-1 overflow-y-auto", collapsed ? "px-2 py-4" : "px-3 py-4")}>
            {sections.map((group) => {
              const isGroupOpen = collapsed || expandedSections[group.section];
              const hasActiveItem = group.items.some((item) => item.href === location);

              return (
                <div key={group.section} className={cn("last:mb-0", collapsed ? "mb-3" : "mb-4")}>
                  {!collapsed ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSections((current) => ({
                          ...current,
                          [group.section]: !current[group.section],
                        }))
                      }
                      className={cn(
                        "mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-all duration-200",
                        hasActiveItem
                          ? "border-[var(--ds-accent)]/24 bg-[var(--ds-accent-muted)] text-ds-primary"
                          : "border-transparent text-ds-tertiary hover:border-ds-subtle hover:bg-white/[0.035] hover:text-ds-secondary"
                      )}
                      aria-expanded={isGroupOpen}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                            hasActiveItem ? "bg-[var(--ds-accent)] shadow-[0_0_0_4px_rgba(0,159,227,.12)]" : "bg-ds-tertiary/45"
                          )}
                        />
                        <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.18em]">
                          {group.label}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-ds-inset px-2 py-0.5 text-[9px] font-extrabold tabular-nums text-ds-tertiary">
                          {group.items.length}
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isGroupOpen ? "rotate-0" : "-rotate-90")} />
                      </span>
                    </button>
                  ) : (
                    <div className="mx-auto mb-2 h-px w-8 bg-gradient-to-r from-transparent via-ds-default to-transparent" />
                  )}

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                      isGroupOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isActive = location === item.href;
                          const ItemIcon = item.icon;

                          return (
                            <Link key={item.href} href={item.href} className="block" onClick={() => setIsOpen(false)}>
                              <div
                                className={cn(
                                  "group relative flex items-center rounded-2xl transition-all duration-200",
                                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                                  isActive
                                    ? "bg-[var(--ds-accent)] text-white shadow-[0_12px_30px_rgba(0,159,227,.22)]"
                                    : "text-ds-secondary hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary"
                                )}
                                title={collapsed ? item.label : undefined}
                              >
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                                    isActive
                                      ? "bg-white/[0.16] text-white"
                                      : isDark
                                        ? "bg-white/[0.045] text-ds-tertiary group-hover:text-[var(--ds-accent)]"
                                        : "bg-slate-100 text-slate-500 group-hover:text-[var(--ds-accent)]"
                                  )}
                                >
                                  <ItemIcon className="h-4 w-4" strokeWidth={1.85} />
                                </span>

                                {!collapsed && (
                                  <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate text-[13px]", isActive ? "font-extrabold" : "font-bold")}>
                                      {item.label}
                                    </span>
                                    <span className={cn("block truncate text-[10px]", isActive ? "text-white/70" : "text-ds-tertiary")}>
                                      {item.description}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className={cn("border-t border-ds-subtle", collapsed ? "px-2 py-3" : "px-3 py-3")}>
            {!collapsed && user && (
              <div
                className={cn(
                  "mb-3 flex items-center gap-3 rounded-2xl border p-2.5",
                  isDark ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-accent)] text-xs font-extrabold text-white">
                  {initialsFromEmail(user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-ds-primary">{user.email}</p>
                  <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-ds-tertiary">
                    {user.nivel_acesso}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={toggle}
                className={cn(
                  "hidden w-full items-center rounded-2xl px-3 py-2.5 text-ds-secondary transition-all hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary md:flex",
                  collapsed ? "justify-center" : "gap-3"
                )}
                title={collapsed ? "Expandir menu" : "Recolher menu"}
                type="button"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {!collapsed && <span className="text-[13px] font-bold">Recolher menu</span>}
              </button>

              <button
                onClick={toggleTheme}
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-2.5 text-ds-secondary transition-all hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary",
                  collapsed ? "justify-center" : "gap-3"
                )}
                title={collapsed ? (isDark ? "Modo claro" : "Modo escuro") : undefined}
                type="button"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {!collapsed && <span className="text-[13px] font-bold">{isDark ? "Modo claro" : "Modo escuro"}</span>}
              </button>

              <button
                onClick={logout}
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-2.5 text-ds-secondary transition-all hover:bg-rose-500/10 hover:text-rose-500",
                  collapsed ? "justify-center" : "gap-3"
                )}
                title={collapsed ? "Sair" : undefined}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="text-[13px] font-bold">Sair</span>}
              </button>
            </div>

            {collapsed && (
              <div className="mt-3 flex justify-center">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
