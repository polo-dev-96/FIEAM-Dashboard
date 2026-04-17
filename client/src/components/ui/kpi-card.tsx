import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: "blue" | "green" | "amber" | "red" | "purple";
  className?: string;
  onClick?: () => void;
}

const colorMap = {
  blue: {
    gradient: "from-[#009FE3] to-[#0077CC]",
    bg: "rgba(0, 159, 227, 0.08)",
    bgHover: "rgba(0, 159, 227, 0.12)",
    border: "rgba(0, 159, 227, 0.20)",
    borderHover: "rgba(0, 159, 227, 0.35)",
    text: "#009FE3",
    shadow: "rgba(0, 159, 227, 0.12)",
  },
  green: {
    gradient: "from-[#00C48C] to-[#00A650]",
    bg: "rgba(0, 196, 140, 0.08)",
    bgHover: "rgba(0, 196, 140, 0.12)",
    border: "rgba(0, 196, 140, 0.20)",
    borderHover: "rgba(0, 196, 140, 0.35)",
    text: "#00C48C",
    shadow: "rgba(0, 196, 140, 0.12)",
  },
  amber: {
    gradient: "from-[#F5B700] to-[#F37021]",
    bg: "rgba(245, 183, 0, 0.08)",
    bgHover: "rgba(245, 183, 0, 0.12)",
    border: "rgba(245, 183, 0, 0.20)",
    borderHover: "rgba(245, 183, 0, 0.35)",
    text: "#F5B700",
    shadow: "rgba(245, 183, 0, 0.12)",
  },
  red: {
    gradient: "from-[#E85D75] to-[#ED1C24]",
    bg: "rgba(232, 93, 117, 0.08)",
    bgHover: "rgba(232, 93, 117, 0.12)",
    border: "rgba(232, 93, 117, 0.20)",
    borderHover: "rgba(232, 93, 117, 0.35)",
    text: "#E85D75",
    shadow: "rgba(232, 93, 117, 0.12)",
  },
  purple: {
    gradient: "from-[#8B5CF6] to-[#6366F1]",
    bg: "rgba(139, 92, 246, 0.08)",
    bgHover: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.20)",
    borderHover: "rgba(139, 92, 246, 0.35)",
    text: "#8B5CF6",
    shadow: "rgba(139, 92, 246, 0.12)",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
  className,
  onClick,
}: KPICardProps) {
  const { isDark } = useTheme();
  const c = colorMap[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl transition-all duration-300 cursor-default",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: isDark
          ? `linear-gradient(135deg, rgba(15, 40, 68, 0.9) 0%, rgba(12, 33, 53, 0.95) 100%)`
          : `linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)`,
        border: `1px solid ${isDark ? c.border : c.border}`,
        boxShadow: isDark
          ? `0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
          : `0 4px 20px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)`,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = isDark
            ? `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${c.borderHover}`
            : `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px ${c.borderHover}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isDark
          ? `0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
          : `0 4px 20px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)`;
      }}
      onClick={onClick}
    >
      {/* Gradient accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${c.gradient}`}
      />

      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${c.shadow}, transparent 70%)`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = "0";
        }}
      />

      <div className="relative p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1"
              style={{
                color: isDark ? "rgba(255,255,255,0.50)" : "#64748B",
              }}
            >
              {title}
            </p>
            {subtitle && (
              <p
                className="text-[11px] mb-2"
                style={{
                  color: isDark ? "rgba(255,255,255,0.35)" : "#94A3B8",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Icon */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ml-3"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
            }}
          >
            <div style={{ color: c.text }}>{icon}</div>
          </div>
        </div>

        {/* Value */}
        <div className="mt-2">
          <p
            className="text-3xl font-bold tracking-tight number-animate"
            style={{
              fontFamily: "var(--font-display)",
              color: isDark ? "rgba(255,255,255,0.95)" : "#0F172A",
            }}
          >
            {value}
          </p>
        </div>

        {/* Trend */}
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className="text-xs font-medium"
              style={{
                color: trend.positive !== false ? "#00C48C" : "#E85D75",
              }}
            >
              {trend.positive !== false ? "+" : "-"}
              {trend.value}%
            </span>
            <span
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.40)" : "#94A3B8",
              }}
            >
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Variation (simpler version for smaller metrics)
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "purple";
}

export function StatCard({ label, value, icon, color = "blue" }: StatCardProps) {
  const { isDark } = useTheme();
  const c = colorMap[color];

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        background: isDark
          ? "rgba(15, 40, 68, 0.6)"
          : "rgba(255, 255, 255, 0.8)",
        border: `1px solid ${isDark ? c.border : c.border}`,
      }}
    >
      {icon && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: c.bg,
          }}
        >
          <div style={{ color: c.text }}>{icon}</div>
        </div>
      )}
      <div>
        <p
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{
            color: isDark ? "rgba(255,255,255,0.50)" : "#64748B",
          }}
        >
          {label}
        </p>
        <p
          className="text-xl font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: isDark ? "rgba(255,255,255,0.95)" : "#0F172A",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
