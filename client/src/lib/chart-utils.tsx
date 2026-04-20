/**
 * FIEAM Enterprise Design System — Chart Utilities
 * Centralized chart styling and premium helpers for Recharts
 */
import * as React from "react";

// ── Shared chart color palette ──────────────────────────────────────
export const CHART_COLORS = [
  '#009FE3', '#F37021', '#00A650', '#ED1C24', '#00BCD4',
  '#8b5cf6', '#0077CC', '#14b8a6', '#6366f1', '#a855f7',
  '#06b6d4', '#84cc16', '#d946ef', '#0ea5e9', '#f43f5e',
];

// Lighter top / darker bottom for gradient shading
function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const adjust = (c: number) =>
    Math.round(Math.min(255, Math.max(0, c + (percent / 100) * 255)));
  const rr = adjust(r).toString(16).padStart(2, '0');
  const gg = adjust(g).toString(16).padStart(2, '0');
  const bb = adjust(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

// ── Gradient defs for bar charts (horizontal bars: x1=0 x2=1) ────────
// IMPORTANT: Recharts filters custom React components from its children.
// Use this helper INSIDE an inline <defs> element, e.g.:
//   <BarChart>
//     <defs>{barGradientDefs("canal")}</defs>
//     ...
//   </BarChart>
export function barGradientDefs(
  id: string,
  colors: string[] = CHART_COLORS,
  horizontal: boolean = true
) {
  return colors.map((color, i) => (
    <linearGradient
      key={`${id}-${i}`}
      id={`${id}-${i}`}
      x1="0"
      y1="0"
      x2={horizontal ? "1" : "0"}
      y2={horizontal ? "0" : "1"}
    >
      <stop offset="0%" stopColor={shade(color, 8)} stopOpacity={1} />
      <stop offset="100%" stopColor={shade(color, -10)} stopOpacity={1} />
    </linearGradient>
  ));
}

// Back-compat shim — renders nothing (component children are filtered by Recharts).
// Kept only to avoid breaking imports during migration. Prefer `barGradientDefs`.
export function BarGradients(_props: { colors?: string[]; id?: string; horizontal?: boolean }) {
  return null;
}

export function getBarGradient(id: string, index: number, length: number = CHART_COLORS.length): string {
  return `url(#${id}-${index % length})`;
}

// ── Premium Tooltip (custom render) ─────────────────────────────────
export function PremiumTooltip({
  active,
  payload,
  label,
  isDark,
  labelFormatter,
  valueFormatter,
  valueLabel,
  dotColor,
}: any) {
  if (!active || !payload || !payload.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      style={{
        background: isDark ? 'rgba(15, 42, 66, 0.96)' : 'rgba(255,255,255,0.98)',
        border: `1px solid ${isDark ? 'rgba(0,159,227,0.22)' : 'rgba(15,23,41,0.08)'}`,
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: isDark
          ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,159,227,0.06)'
          : '0 12px 32px rgba(15,23,41,0.08), 0 0 0 1px rgba(15,23,41,0.04)',
        backdropFilter: 'blur(12px)',
        minWidth: 160,
      }}
    >
      {formattedLabel !== undefined && formattedLabel !== '' && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
            textTransform: 'uppercase',
            marginBottom: 6,
            paddingBottom: 6,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,41,0.05)'}`,
          }}
        >
          {formattedLabel}
        </div>
      )}
      {payload.map((entry: any, i: number) => {
        const value = valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString('pt-BR');
        const name = valueLabel || entry.name || '';
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '2px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 3,
                  background: dotColor || entry.color || entry.payload?.fill || '#009FE3',
                  boxShadow: `0 0 0 2px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)'}`,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: isDark ? 'rgba(255,255,255,0.7)' : '#475569',
                  fontWeight: 500,
                }}
              >
                {name}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isDark ? '#F0F4F8' : '#0F1729',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Classic tooltip style (kept for back-compat) ────────────────────
export function getTooltipStyle(isDark: boolean) {
  return {
    contentStyle: {
      backgroundColor: isDark ? 'rgba(15, 42, 66, 0.96)' : 'rgba(255,255,255,0.98)',
      borderRadius: '12px',
      border: `1px solid ${isDark ? 'rgba(0,159,227,0.22)' : 'rgba(15,23,41,0.08)'}`,
      color: isDark ? '#F0F4F8' : '#0F1729',
      boxShadow: isDark
        ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,159,227,0.06)'
        : '0 12px 32px rgba(15,23,41,0.08), 0 0 0 1px rgba(15,23,41,0.04)',
      padding: '10px 14px',
      fontSize: '12px',
      backdropFilter: 'blur(12px)',
    },
    labelStyle: {
      color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
      fontWeight: 600 as const,
      marginBottom: '6px',
      fontSize: '11px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.02em',
    },
    itemStyle: {
      color: isDark ? '#F0F4F8' : '#0F1729',
      fontSize: '13px',
      fontWeight: 600 as const,
    },
    cursor: { fill: isDark ? 'rgba(0,159,227,0.06)' : 'rgba(0,159,227,0.04)' },
  };
}

// ── Theme-aware grid / axis ─────────────────────────────────────────
export function getGridStroke(isDark: boolean): string {
  return isDark ? 'rgba(148,163,184,0.10)' : '#EEF1F5';
}

export function getAxisColor(isDark: boolean): string {
  return isDark ? '#64748B' : '#94A3B8';
}

export function getAxisTickFill(isDark: boolean): string {
  return isDark ? '#8899A8' : '#64748B';
}

export function getAxisTickStyle(isDark: boolean) {
  return {
    fill: getAxisTickFill(isDark),
    fontSize: 11,
    fontWeight: 500,
  };
}
