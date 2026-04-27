/*
 * ============================================================
 * components/ui/filter-toolbar.tsx — Barra de Filtros
 * ============================================================
 *
 * Card que agrupa os controles de filtro do dashboard (seletor de data,
 * seletor de entidade, seletor de equipe, botões de exportar, etc.).
 *
 * Estrutura visual:
 *   ┌─────────────────────────────────────────────────┐
 *   │ [ícone filtro] Título da Toolbar     statusText │  ← header
 *   ├─────────────────────────────────────────────────┤
 *   │  {children} — os controles de filtro            │  ← body
 *   │  {activeFilters} — badges dos filtros ativos    │  ← footer (opcional)
 *   └─────────────────────────────────────────────────┘
 *
 * Props:
 *   title             → título exibido no header da toolbar
 *   statusText        → texto informativo opcional à direita (ex: "Última atualização: ...")
 *   showLiveIndicator → se true, exibe um ponto verde pulsante (indicador de "ao vivo")
 *   children          → os controles de filtro (DateRangePicker, SelectCustom, etc.)
 *   activeFilters     → badges que mostram os filtros ativos (opcional)
 *   isDark            → tema atual (tratado via CSS variables)
 *   className         → classes CSS adicionais
 * ============================================================
 */

// React: necessário para JSX
import * as React from "react";

// SlidersHorizontal: ícone Lucide de filtro
import { SlidersHorizontal } from "lucide-react";

// cn: combina classes CSS condicionalmente
import { cn } from "@/lib/utils";

/*
 * FilterToolbarProps — Props do componente FilterToolbar
 */
interface FilterToolbarProps {
  title: string;
  statusText?: string;              // texto informativo no header (opcional)
  showLiveIndicator?: boolean;      // ponto pulsante "ao vivo" (padrão: false)
  children: React.ReactNode;        // controles de filtro
  activeFilters?: React.ReactNode;  // badges dos filtros ativos (opcional)
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
      {/* Header da toolbar: ícone + título + indicador ao vivo + statusText */}
      <div className="flex items-center gap-3 border-b border-ds-subtle bg-ds-inset px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        {showLiveIndicator && (
          // Ponto verde pulsante: animação "ping" cria o efeito de radar
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <span className="text-[14px] font-extrabold tracking-[-0.02em] text-ds-primary">{title}</span>
        <div className="flex-1" /> {/* espaçador que empurra statusText para a direita */}
        {statusText && (
          <span className="hidden text-[11px] font-bold text-ds-tertiary sm:inline-flex">{statusText}</span>
        )}
      </div>

      {/* Body: os controles de filtro passados como children */}
      <div className="p-5">{children}</div>

      {/* Footer opcional: badges dos filtros ativos (ex: "Período: Jan-Mar") */}
      {activeFilters && <div className="px-5 pb-5">{activeFilters}</div>}
    </div>
  );
}
