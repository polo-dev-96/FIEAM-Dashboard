/*
 * ============================================================
 * components/ui/kpi-card.tsx — Card de KPI (Indicador de Desempenho)
 * ============================================================
 *
 * KPI = Key Performance Indicator (Indicador-Chave de Desempenho)
 * É o componente dos cards no topo da Visão Geral, como:
 *   "Total de Atendimentos: 12.543"
 *   "Atendimentos Hoje: 87"
 *
 * Props:
 *   title    → título do indicador (ex: "Total de Atendimentos")
 *   value    → valor numérico ou string a exibir em destaque
 *   icon     → ícone Lucide renderizado no canto direito do card
 *   accent   → cor de destaque: "blue" | "green" | "amber" | "red"
 *   subtitle → texto secundário opcional abaixo do título
 *   className → classes CSS adicionais opcionais
 *   isDark   → recebe o tema (não utilizado diretamente, CSS variables cuidam disso)
 *
 * O card usa CSS custom properties (--ds-accent, --ds-bg-secondary) para
 * se adaptar automaticamente ao tema claro/escuro sem precisar de lógica JS.
 * ============================================================
 */

// React: necessário para usar JSX e o tipo ReactNode
import * as React from "react";

// cn: função utilitária para combinar classes CSS condicionalmente
import { cn } from "@/lib/utils";

/*
 * ACCENT_MAP — Mapeamento de cor de destaque para classes CSS
 * -------------------------------------------------------
 * Cada cor de acento define 4 classes para partes diferentes do card:
 *   border  → cor da borda do card
 *   glow    → brilho suave no canto superior direito
 *   iconBg  → fundo do quadrado do ícone
 *   iconText → cor do ícone em si
 *
 * "as const" torna o objeto imutável (read-only) em TypeScript.
 */
const ACCENT_MAP = {
  blue: {
    border: "border-[var(--ds-accent)]/25",      // borda azul ciano FIEAM
    glow: "bg-[var(--ds-accent)]/20",             // brilho azul sutil
    iconBg: "bg-[var(--ds-accent-muted)]",        // fundo do ícone azul claro
    iconText: "text-[var(--ds-accent)]",          // ícone azul ciano
  },
  green: {
    border: "border-emerald-500/20",
    glow: "bg-emerald-400/[0.18]",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
  },
  amber: {
    border: "border-amber-500/20",
    glow: "bg-amber-400/[0.16]",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
  },
  red: {
    border: "border-rose-500/20",
    glow: "bg-rose-400/[0.16]",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-400",
  },
} as const;

// Accent: tipo derivado das chaves do ACCENT_MAP ("blue" | "green" | "amber" | "red")
type Accent = keyof typeof ACCENT_MAP;

/*
 * KpiCardProps — Props (parâmetros) do componente KpiCard
 */
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;     // qualquer elemento React (ícone Lucide)
  accent?: Accent;           // "?" significa opcional (padrão: "blue")
  subtitle?: string;
  className?: string;
  isDark: boolean;           // recebido mas tratado via CSS variables
}

export function KpiCard({ title, value, icon, accent = "blue", subtitle, className }: KpiCardProps) {
  const a = ACCENT_MAP[accent];

  return (
    <div
      data-fieam-surface="true"
      className={cn(
        "group relative min-h-[132px] overflow-hidden rounded-2xl border bg-ds-secondary p-5 shadow-ds-card transition-theme card-hover animate-fade-up",
        a.border,
        className
      )}
    >
      <div className={cn("pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl transition-opacity group-hover:opacity-80", a.glow)} />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ds-tertiary">
              {title}
            </p>
            {subtitle && <p className="mt-1 text-[11px] font-medium text-ds-tertiary">{subtitle}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", a.iconBg)}>
            <span className={a.iconText}>{icon}</span>
          </div>
        </div>

        <div>
          <p className="number-display text-4xl font-extrabold leading-none tracking-[-0.05em] text-ds-primary">
            {value}
          </p>
          <div className="mt-3 h-1 w-16 rounded-full bg-[var(--ds-accent-muted)]">
            <div className={cn("h-full w-2/3 rounded-full", accent === "blue" ? "bg-[var(--ds-accent)]" : accent === "green" ? "bg-emerald-400" : accent === "amber" ? "bg-amber-400" : "bg-rose-400")} />
          </div>
        </div>
      </div>
    </div>
  );
}
