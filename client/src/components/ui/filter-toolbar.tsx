import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { RefreshCw, Download, Filter } from "lucide-react";

interface FilterToolbarProps {
  children: ReactNode;
  className?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
  title?: string;
  headerAction?: ReactNode;
}

export function FilterToolbar({
  children,
  className,
  onRefresh,
  onExport,
  isRefreshing,
  title = "Filtros",
  headerAction,
}: FilterToolbarProps) {
  const { isDark } = useTheme();

  return (
    <div
      className={cn("rounded-2xl overflow-hidden", className)}
      style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(15, 40, 68, 0.9) 0%, rgba(12, 33, 53, 0.95) 100%)"
          : "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
        border: `1px solid ${isDark ? "rgba(0, 159, 227, 0.12)" : "rgba(226, 232, 240, 0.8)"}`,
        boxShadow: isDark
          ? "0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 4px 20px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          borderBottom: children
            ? `1px solid ${isDark ? "rgba(0, 159, 227, 0.10)" : "rgba(226, 232, 240, 0.6)"}`
            : "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: isDark
                ? "rgba(0, 159, 227, 0.10)"
                : "rgba(0, 159, 227, 0.08)",
              border: `1px solid ${isDark ? "rgba(0, 159, 227, 0.15)" : "rgba(0, 159, 227, 0.12)"}`,
            }}
          >
            <Filter
              className="w-4 h-4"
              style={{ color: isDark ? "#009FE3" : "#0077CC" }}
            />
          </div>
          <h3
            className="text-sm font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: isDark ? "rgba(255,255,255,0.90)" : "#0F172A",
            }}
          >
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {headerAction && <div>{headerAction}</div>}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(241, 245, 249, 0.8)",
                color: isDark ? "rgba(255,255,255,0.70)" : "#64748B",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(226, 232, 240, 0.8)"}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(226, 232, 240, 0.8)";
                e.currentTarget.style.color = isDark
                  ? "rgba(255,255,255,0.90)"
                  : "#334155";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(241, 245, 249, 0.8)";
                e.currentTarget.style.color = isDark
                  ? "rgba(255,255,255,0.70)"
                  : "#64748B";
              }}
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: isDark
                  ? "rgba(0, 159, 227, 0.10)"
                  : "rgba(0, 159, 227, 0.08)",
                color: isDark ? "#009FE3" : "#0077CC",
                border: `1px solid ${isDark ? "rgba(0, 159, 227, 0.20)" : "rgba(0, 159, 227, 0.15)"}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(0, 159, 227, 0.15)"
                  : "rgba(0, 159, 227, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(0, 159, 227, 0.10)"
                  : "rgba(0, 159, 227, 0.08)";
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Content */}
      {children && (
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// Filter Group for grouping related filters
interface FilterGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FilterGroup({ label, children, className }: FilterGroupProps) {
  const { isDark } = useTheme();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{
          color: isDark ? "rgba(255,255,255,0.45)" : "#64748B",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
