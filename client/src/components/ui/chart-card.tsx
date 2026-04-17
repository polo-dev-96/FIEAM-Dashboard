import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  height?: number | string;
  className?: string;
  headerAction?: ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "purple" | "default";
}

const colorMap = {
  blue: { iconBg: "rgba(0, 159, 227, 0.10)", iconColor: "#009FE3" },
  green: { iconBg: "rgba(0, 196, 140, 0.10)", iconColor: "#00C48C" },
  amber: { iconBg: "rgba(245, 183, 0, 0.10)", iconColor: "#F5B700" },
  red: { iconBg: "rgba(232, 93, 117, 0.10)", iconColor: "#E85D75" },
  purple: { iconBg: "rgba(139, 92, 246, 0.10)", iconColor: "#8B5CF6" },
  default: { iconBg: "rgba(255,255,255,0.05)", iconColor: "rgba(255,255,255,0.60)" },
};

export function ChartCard({
  title,
  subtitle,
  icon,
  children,
  height = 300,
  className,
  headerAction,
  color = "blue",
}: ChartCardProps) {
  const { isDark } = useTheme();
  const c = colorMap[color];

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden transition-all duration-300",
        className
      )}
      style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(15, 40, 68, 0.95) 0%, rgba(12, 33, 53, 0.98) 100%)"
          : "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
        border: `1px solid ${isDark ? "rgba(0, 159, 227, 0.15)" : "rgba(226, 232, 240, 0.8)"}`,
        boxShadow: isDark
          ? "0 4px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{
          borderBottom: `1px solid ${isDark ? "rgba(0, 159, 227, 0.10)" : "rgba(226, 232, 240, 0.6)"}`,
        }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: c.iconBg,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}`,
              }}
            >
              <div style={{ color: c.iconColor }}>{icon}</div>
            </div>
          )}
          <div>
            <h3
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: isDark ? "rgba(255,255,255,0.95)" : "#0F172A",
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className="text-xs mt-0.5"
                style={{
                  color: isDark ? "rgba(255,255,255,0.45)" : "#64748B",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Content */}
      <div className="p-6" style={{ height: typeof height === "number" ? `${height}px` : height }}>
        {children}
      </div>
    </div>
  );
}

// Compact version for smaller charts
interface MiniChartCardProps {
  title: string;
  value?: string | number;
  children: ReactNode;
  height?: number;
  trend?: {
    value: number;
    positive?: boolean;
  };
}

export function MiniChartCard({
  title,
  value,
  children,
  height = 120,
  trend,
}: MiniChartCardProps) {
  const { isDark } = useTheme();

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isDark
          ? "rgba(15, 40, 68, 0.6)"
          : "rgba(255, 255, 255, 0.8)",
        border: `1px solid ${isDark ? "rgba(0, 159, 227, 0.12)" : "rgba(226, 232, 240, 0.6)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-medium"
          style={{
            color: isDark ? "rgba(255,255,255,0.60)" : "#64748B",
          }}
        >
          {title}
        </p>
        {trend && (
          <span
            className="text-xs font-medium"
            style={{
              color: trend.positive !== false ? "#00C48C" : "#E85D75",
            }}
          >
            {trend.positive !== false ? "+" : "-"}
            {trend.value}%
          </span>
        )}
      </div>
      {value && (
        <p
          className="text-2xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-display)",
            color: isDark ? "rgba(255,255,255,0.95)" : "#0F172A",
          }}
        >
          {value}
        </p>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  );
}
