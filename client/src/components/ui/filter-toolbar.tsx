import * as React from "react";
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
  isDark,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-theme animate-fade-up overflow-hidden",
        isDark
          ? "bg-ds-secondary border-ds-default shadow-ds-card"
          : "bg-ds-elevated border-ds-default shadow-ds-card",
        className
      )}
    >
      {/* Toolbar Header */}
      <div className={cn(
        "px-5 py-3 border-b flex items-center gap-3",
        isDark ? "border-ds-subtle bg-ds-inset" : "border-ds-subtle bg-ds-inset"
      )}>
        {showLiveIndicator && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        <span className="text-[13px] font-semibold text-ds-primary">{title}</span>
        <div className="flex-1" />
        {statusText && (
          <span className="text-[11px] font-medium text-ds-tertiary">{statusText}</span>
        )}
      </div>

      {/* Filter Controls */}
      <div className="p-5">
        {children}
      </div>

      {/* Active Filters Summary */}
      {activeFilters && (
        <div className={cn(
          "px-5 pb-4 -mt-1"
        )}>
          {activeFilters}
        </div>
      )}
    </div>
  );
}
