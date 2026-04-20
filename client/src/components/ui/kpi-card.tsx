import * as React from "react";
import { cn } from "@/lib/utils";

const ACCENT_MAP = {
  blue: {
    border: "border-l-[#009FE3]",
    iconBg: "bg-[#009FE3]/10",
    iconBgLight: "bg-blue-50",
    iconText: "text-[#009FE3]",
    iconTextLight: "text-[#0077CC]",
  },
  green: {
    border: "border-l-[#00C48C]",
    iconBg: "bg-emerald-500/10",
    iconBgLight: "bg-emerald-50",
    iconText: "text-emerald-400",
    iconTextLight: "text-emerald-600",
  },
  amber: {
    border: "border-l-[#F5B700]",
    iconBg: "bg-amber-500/10",
    iconBgLight: "bg-amber-50",
    iconText: "text-amber-400",
    iconTextLight: "text-amber-600",
  },
  red: {
    border: "border-l-[#E85D75]",
    iconBg: "bg-rose-500/10",
    iconBgLight: "bg-rose-50",
    iconText: "text-rose-400",
    iconTextLight: "text-rose-600",
  },
} as const;

type Accent = keyof typeof ACCENT_MAP;

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: Accent;
  subtitle?: string;
  className?: string;
  isDark: boolean;
}

export function KpiCard({
  title,
  value,
  icon,
  accent = "blue",
  subtitle,
  className,
  isDark,
}: KpiCardProps) {
  const a = ACCENT_MAP[accent];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-l-[3px] p-5 transition-theme card-hover animate-fade-up",
        a.border,
        isDark
          ? "bg-ds-secondary border-ds-default shadow-ds-card"
          : "bg-ds-elevated border-ds-default shadow-ds-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ds-tertiary leading-tight">
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] text-ds-tertiary mt-0.5">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            isDark ? a.iconBg : a.iconBgLight
          )}
        >
          <span className={isDark ? a.iconText : a.iconTextLight}>{icon}</span>
        </div>
      </div>
      <p className="text-[28px] font-bold number-display text-ds-primary leading-none">
        {value}
      </p>
    </div>
  );
}
