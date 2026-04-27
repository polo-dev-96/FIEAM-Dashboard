/**
 * FIEAM Enterprise Design System — Chart Utilities
 * Centralized chart styling and premium helpers for Recharts
 */
import * as React from "react";

// ── Shared chart color palette ──────────────────────────────────────
export const CHART_COLORS = [
  // Paleta executiva: azul institucional, teal e neutros premium.
  // A ordem prioriza barras mais importantes com menos “efeito arco-íris”.
  '#1CB5E9',
  '#1677C8',
  '#2DD4BF',
  '#10B981',
  '#64748B',
  '#F59E0B',
  '#7C5CFF',
  '#38BDF8',
  '#334155',
  '#22C55E',
  '#0EA5E9',
  '#94A3B8',
  '#D97706',
  '#14B8A6',
  '#E85D75',
];

// Blend de cor mais controlado para gradientes institucionais.
function mix(hex: string, target: string, amount: number): string {
  const normalize = (value: string) => value.replace('#', '');
  const source = parseInt(normalize(hex), 16);
  const destination = parseInt(normalize(target), 16);

  const sr = (source >> 16) & 0xff;
  const sg = (source >> 8) & 0xff;
  const sb = source & 0xff;
  const dr = (destination >> 16) & 0xff;
  const dg = (destination >> 8) & 0xff;
  const db = destination & 0xff;

  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${blend(sr, dr).toString(16).padStart(2, '0')}${blend(sg, dg).toString(16).padStart(2, '0')}${blend(sb, db).toString(16).padStart(2, '0')}`;
}

function shade(hex: string, percent: number): string {
  return percent >= 0 ? mix(hex, '#ffffff', percent / 100) : mix(hex, '#020617', Math.abs(percent) / 100);
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
      <stop offset="0%" stopColor={shade(color, 16)} stopOpacity={1} />
      <stop offset="58%" stopColor={color} stopOpacity={0.96} />
      <stop offset="100%" stopColor={shade(color, -18)} stopOpacity={0.92} />
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
        borderRadius: 16,
        padding: '10px 12px',
        boxShadow: isDark
          ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,159,227,0.06)'
          : '0 12px 32px rgba(15,23,41,0.08), 0 0 0 1px rgba(15,23,41,0.04)',
        backdropFilter: 'blur(12px)',
        minWidth: 168,
      }}
    >
      {formattedLabel !== undefined && formattedLabel !== '' && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
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
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: dotColor || entry.color || entry.payload?.fill || '#009FE3',
                  boxShadow: `0 0 0 2px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)'}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: isDark ? 'rgba(255,255,255,0.66)' : '#475569',
                  fontWeight: 700,
                }}
              >
                {name}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
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
      borderRadius: '18px',
      border: `1px solid ${isDark ? 'rgba(0,159,227,0.22)' : 'rgba(15,23,41,0.08)'}`,
      color: isDark ? '#F0F4F8' : '#0F1729',
      boxShadow: isDark
        ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,159,227,0.06)'
        : '0 12px 32px rgba(15,23,41,0.08), 0 0 0 1px rgba(15,23,41,0.04)',
      padding: '10px 12px',
      fontSize: '12px',
      backdropFilter: 'blur(12px)',
    },
    labelStyle: {
      color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
      fontWeight: 600 as const,
      marginBottom: '6px',
      fontSize: '11px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
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
  return isDark ? 'rgba(148,163,184,0.065)' : '#E7EDF4';
}

export function getAxisColor(isDark: boolean): string {
  return isDark ? 'rgba(148,163,184,0.34)' : '#CBD5E1';
}

export function getAxisTickFill(isDark: boolean): string {
  return isDark ? 'rgba(203,213,225,0.70)' : '#64748B';
}

export function getAxisTickStyle(isDark: boolean) {
  return {
    fill: getAxisTickFill(isDark),
    fontSize: 11,
    fontWeight: 700,
  };
}


export function getChartCursor(isDark: boolean, mode: 'bar' | 'line' = 'bar') {
  if (mode === 'line') {
    return {
      stroke: isDark ? 'rgba(56,189,248,0.30)' : 'rgba(14,116,144,0.24)',
      strokeWidth: 1,
      strokeDasharray: '5 6',
    };
  }

  return {
    fill: isDark ? 'rgba(56,189,248,0.055)' : 'rgba(14,116,144,0.045)',
  };
}

export function getLabelFill(isDark: boolean): string {
  return isDark ? '#EAF2F8' : '#1E293B';
}
