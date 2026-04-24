import * as React from "react";
import { cn } from "@/lib/utils";

const ICON_ACCENT_MAP = {
  blue: { bg: "bg-[var(--ds-accent-muted)]", text: "text-[var(--ds-accent)]" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
  red: { bg: "bg-rose-500/10", text: "text-rose-400" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400" },
} as const;

type IconAccent = keyof typeof ICON_ACCENT_MAP;

interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;
  iconAccent?: IconAccent;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  height?: string | number;
  className?: string;
  isDark: boolean;
  noPadding?: boolean;
  subtitle?: string;
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
        "group relative overflow-hidden rounded-2xl border bg-ds-secondary shadow-ds-card transition-theme card-hover animate-fade-up",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--ds-accent)]/60 to-transparent opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[var(--ds-accent)]/[0.055] blur-3xl transition-opacity group-hover:opacity-80" />

      <div className="relative flex items-center gap-3 border-b border-ds-subtle px-5 py-4">
        {icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", ia.bg, ia.text)}>
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
