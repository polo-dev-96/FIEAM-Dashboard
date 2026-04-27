/*
 * ============================================================
 * components/ui/chart-card.tsx — Card de Gráfico
 * ============================================================
 *
 * Componente "casca" que envolve todos os gráficos do dashboard.
 * Fornece um layout padronizado com:
 *   - Header: ícone colorido + título + badge opcional + área de ações
 *   - Body:   área onde o gráfico (children) é renderizado
 *
 * Analogia: é como uma moldura de quadro. O quadro em si (o gráfico)
 * é passado como children — o ChartCard só fornece a moldura visual.
 *
 * Props:
 *   title      → título exibido no header do card
 *   icon       → ícone Lucide opcional no header
 *   iconAccent → cor do ícone ("blue" | "green" | "amber" | "red" | "purple" | "cyan" | "orange")
 *   badge      → texto de badge opcional (ex: "TOP 20", "AO VIVO")
 *   actions    → elementos React opcionais na direita do header (botões, toggles)
 *   children   → o gráfico ou conteúdo real do card
 *   height     → altura fixa opcional do corpo do card
 *   className  → classes CSS adicionais
 *   isDark     → tema (tratado via CSS variables)
 *   noPadding  → se true, remove padding do corpo (útil para tabelas)
 *   subtitle   → texto pequeno abaixo do título
 * ============================================================
 */

// React: necessário para JSX e tipos como ReactNode
import * as React from "react";

// cn: função para combinar classes CSS condicionalmente
import { cn } from "@/lib/utils";

/*
 * ICON_ACCENT_MAP — Mapeamento de cores para o ícone do header
 * Define o fundo (bg) e a cor do texto/ícone (text) para cada acento.
 */
const ICON_ACCENT_MAP = {
  blue:   { bg: "bg-[var(--ds-accent-muted)]", text: "text-[var(--ds-accent)]" },
  green:  { bg: "bg-emerald-500/10",            text: "text-emerald-400" },
  amber:  { bg: "bg-amber-500/10",              text: "text-amber-400" },
  red:    { bg: "bg-rose-500/10",               text: "text-rose-400" },
  purple: { bg: "bg-purple-500/10",             text: "text-purple-400" },
  cyan:   { bg: "bg-cyan-500/10",               text: "text-cyan-400" },
  orange: { bg: "bg-orange-500/10",             text: "text-orange-400" },
} as const;

// IconAccent: tipo derivado das chaves do mapa de acentos
type IconAccent = keyof typeof ICON_ACCENT_MAP;

/*
 * ChartCardProps — Props do componente ChartCard
 */
interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;         // ícone no header (opcional)
  iconAccent?: IconAccent;        // cor do ícone (padrão: "blue")
  badge?: string;                 // badge de texto no header (opcional)
  actions?: React.ReactNode;      // botões/controles adicionais no header
  children: React.ReactNode;      // o gráfico ou conteúdo do card
  height?: string | number;       // altura fixa do body (em px ou string CSS)
  className?: string;
  isDark: boolean;
  noPadding?: boolean;            // remove padding do body (para tabelas/listas)
  subtitle?: string;              // subtítulo abaixo do título
}

export function ChartCard({
  title,
  icon,
  iconAccent = "blue",
  badge,
  actions,
  children,
  height,
  className,
  noPadding,
  subtitle,
}: ChartCardProps) {
  const ia = ICON_ACCENT_MAP[iconAccent];

  return (
    <div
      data-fieam-surface="true"
      className={cn(
        "group relative overflow-hidden rounded-[22px] border bg-ds-secondary shadow-ds-card transition-theme card-hover animate-fade-up",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[var(--ds-accent)]/[0.045] blur-3xl transition-opacity group-hover:opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.045),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_46%)]" />

      <div className="relative flex items-center gap-3 border-b border-ds-subtle px-5 py-4">
        {icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/5 transition-transform group-hover:scale-105", ia.bg, ia.text)}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-ds-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-[11px] font-medium text-ds-tertiary">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-[var(--ds-accent)]/20 bg-[var(--ds-accent-muted)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ds-accent)]">
            {badge}
          </span>
        )}
        {actions}
      </div>

      <div
        className={cn("relative", !noPadding && "px-4 pb-4 pt-3")}
        style={height ? { height: typeof height === "number" ? `${height}px` : height } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
