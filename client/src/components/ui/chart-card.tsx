import * as React from "react";
import { cn } from "@/lib/utils";

const ICON_ACCENT_MAP = {
  blue:    { dark: "bg-[#009FE3]/10 text-[#009FE3]", light: "bg-blue-50 text-[#0077CC]" },
  green:   { dark: "bg-emerald-500/10 text-emerald-400", light: "bg-emerald-50 text-emerald-600" },
  amber:   { dark: "bg-amber-500/10 text-amber-400", light: "bg-amber-50 text-amber-600" },
  red:     { dark: "bg-rose-500/10 text-rose-400", light: "bg-rose-50 text-rose-600" },
  purple:  { dark: "bg-purple-500/10 text-purple-400", light: "bg-purple-50 text-purple-600" },
  cyan:    { dark: "bg-cyan-500/10 text-cyan-400", light: "bg-cyan-50 text-cyan-600" },
  orange:  { dark: "bg-orange-500/10 text-orange-400", light: "bg-orange-50 text-orange-600" },
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
  isDark,
  noPadding,
}: ChartCardProps) {
  const ia = ICON_ACCENT_MAP[iconAccent];

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-theme card-hover animate-fade-up overflow-hidden",
        isDark
          ? "bg-ds-secondary border-ds-default shadow-ds-card"
          : "bg-ds-elevated border-ds-default shadow-ds-card",
        className
      )}
    >
      {/* Top accent line (subtle, visible on hover) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--ds-accent)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2.5 px-5 pt-5 pb-3.5 border-b",
        isDark ? "border-white/[0.04]" : "border-slate-100"
      )}>
        {icon && (
          <div className={cn("p-1.5 rounded-lg transition-transform group-hover:scale-105", isDark ? ia.dark : ia.light)}>
            {icon}
          </div>
        )}
        <h3 className="text-[13px] font-semibold text-ds-primary flex-1 tracking-tight">{title}</h3>
        {badge && (
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
            isDark ? "bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]" : "bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]"
          )}>
            {badge}
          </span>
        )}
        {actions}
      </div>

      {/* Content */}
      <div
        className={cn(!noPadding && "px-4 pt-3 pb-4")}
        style={height ? { height: typeof height === "number" ? `${height}px` : height } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
