import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterToolbarProps {
  title: string;
  statusText?: string;
  showLiveIndicator?: boolean;
  children: React.ReactNode;
  activeFilters?: React.ReactNode;
  isDark: boolean;
  className?: string;
}

export function FilterToolbar({
  title,
  statusText,
  showLiveIndicator = false,
  children,
  activeFilters,
  className,
}: FilterToolbarProps) {
  return (
    <div
      data-fieam-surface="true"
      className={cn("overflow-hidden rounded-2xl border bg-ds-secondary shadow-ds-card transition-theme animate-fade-up", className)}
    >
      <div className="flex items-center gap-3 border-b border-ds-subtle bg-ds-inset px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        {showLiveIndicator && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <span className="text-[14px] font-extrabold tracking-[-0.02em] text-ds-primary">{title}</span>
        <div className="flex-1" />
        {statusText && (
          <span className="hidden text-[11px] font-bold text-ds-tertiary sm:inline-flex">{statusText}</span>
        )}
      </div>

      <div className="p-5">{children}</div>

      {activeFilters && <div className="px-5 pb-5">{activeFilters}</div>}
    </div>
  );
}
