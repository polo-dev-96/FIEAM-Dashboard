import type { ReactNode } from "react";
import {
  Activity,
  Building2,
  Clock3,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const LOGOS = [
  { src: "/anexo/FIEAM-removebg-preview.png", alt: "FIEAM", className: "h-8 object-contain opacity-90" },
  { src: "/anexo/SESI-removebg-preview.png", alt: "SESI", className: "h-8 object-contain opacity-90" },
  { src: "/anexo/SENAI-removebg-preview.png", alt: "SENAI", className: "h-8 object-contain opacity-90" },
  { src: "/anexo/IEL-removebg-preview.png", alt: "IEL", className: "h-8 object-contain opacity-90" },
];

function getPageContext(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("protocolo")) {
    return {
      eyebrow: "Consulta operacional",
      description: "Pesquisa detalhada por protocolo de atendimento",
      icon: ShieldCheck,
    };
  }

  if (normalized.includes("telefone")) {
    return {
      eyebrow: "Consulta de relacionamento",
      description: "Rastreamento de histórico por contato telefônico",
      icon: Activity,
    };
  }

  if (normalized.includes("openai")) {
    return {
      eyebrow: "Inteligência artificial",
      description: "Monitoramento de uso, custos e desempenho do assistente",
      icon: Sparkles,
    };
  }

  if (normalized.includes("patrocinados")) {
    return {
      eyebrow: "Canais patrocinados",
      description: "Acompanhamento dos atendimentos por origem patrocinada",
      icon: Building2,
    };
  }

  if (normalized.includes("anual") || normalized.includes("sac")) {
    return {
      eyebrow: "Performance anual",
      description: "Visão consolidada dos indicadores estratégicos do SAC",
      icon: Gauge,
    };
  }

  return {
    eyebrow: "Painel executivo",
    description: "Monitoramento institucional de atendimentos em tempo real",
    icon: Gauge,
  };
}

function LayoutPolish() {
  return (
    <style>{`
      .fieam-shell {
        --shell-radius: 18px;
        --shell-radius-lg: 24px;
      }

      [data-theme="dark"] .fieam-shell {
        background:
          radial-gradient(circle at 18% 8%, rgba(0, 159, 227, 0.13), transparent 28rem),
          radial-gradient(circle at 92% 2%, rgba(0, 196, 140, 0.07), transparent 24rem),
          linear-gradient(180deg, rgba(10, 25, 41, 0.96), var(--ds-bg-primary) 34rem);
      }

      [data-theme="light"] .fieam-shell {
        background:
          radial-gradient(circle at 18% 8%, rgba(0, 119, 204, 0.10), transparent 28rem),
          radial-gradient(circle at 92% 2%, rgba(0, 196, 140, 0.08), transparent 24rem),
          linear-gradient(180deg, #eef5fb 0%, var(--ds-bg-primary) 31rem);
      }

      .fieam-shell .card-hover,
      .fieam-shell [data-radix-popper-content-wrapper] > * {
        border-radius: var(--shell-radius);
      }

      .fieam-shell .card-hover {
        backdrop-filter: saturate(130%) blur(4px);
        will-change: transform, box-shadow, border-color;
      }

      .fieam-shell .card-hover:hover {
        transform: translateY(-1px);
      }

      .fieam-shell table {
        border-collapse: separate;
        border-spacing: 0;
      }

      .fieam-shell table thead tr {
        background: color-mix(in srgb, var(--ds-bg-inset) 74%, transparent);
      }

      .fieam-shell table th:first-child {
        border-top-left-radius: 12px;
      }

      .fieam-shell table th:last-child {
        border-top-right-radius: 12px;
      }

      .fieam-shell table th {
        color: var(--ds-text-tertiary);
        letter-spacing: 0.075em;
      }

      .fieam-shell table td,
      .fieam-shell table th {
        vertical-align: middle;
      }

      .fieam-shell tbody tr {
        transition: background-color 160ms ease, transform 160ms ease;
      }

      .fieam-shell tbody tr:hover {
        background: color-mix(in srgb, var(--ds-accent-muted) 70%, transparent) !important;
      }

      .fieam-shell button,
      .fieam-shell input,
      .fieam-shell select {
        transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms ease;
      }

      .fieam-shell button:focus-visible,
      .fieam-shell input:focus-visible,
      .fieam-shell select:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-accent) 24%, transparent);
      }

      .fieam-shell .recharts-wrapper text {
        font-family: var(--font-sans);
        letter-spacing: -0.01em;
      }

      .fieam-shell .recharts-cartesian-grid line {
        stroke-opacity: 0.58;
        stroke-dasharray: 2 8;
      }

      .fieam-shell .recharts-layer.recharts-bar-rectangles path,
      .fieam-shell .recharts-bar-rectangle path {
        filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.10));
        transition: opacity 160ms ease, filter 160ms ease, transform 160ms ease;
      }

      .fieam-shell .recharts-bar-rectangle path:hover {
        opacity: 0.92;
        filter: drop-shadow(0 10px 18px rgba(0, 159, 227, 0.18));
      }

      .fieam-shell .recharts-area-area {
        filter: saturate(0.96);
      }

      .fieam-shell .recharts-area-curve,
      .fieam-shell .recharts-line-curve {
        filter: drop-shadow(0 6px 14px rgba(0, 159, 227, 0.12));
      }

      .fieam-shell .recharts-label-list text {
        paint-order: stroke;
        stroke: color-mix(in srgb, var(--ds-bg-secondary) 82%, transparent);
        stroke-width: 4px;
        stroke-linejoin: round;
      }

      .fieam-shell .number-display {
        font-feature-settings: "tnum" 1, "ss01" 1;
      }

      .fieam-shell [role="dialog"] {
        border-radius: 22px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
      }

      [data-theme="light"] .fieam-shell [data-fieam-surface="true"] {
        border-color: var(--ds-border-default);
      }

      [data-theme="light"] .fieam-shell .card-hover:hover {
        border-color: var(--ds-border-strong);
      }

      [data-theme="light"] .fieam-shell .recharts-label-list text {
        stroke: rgba(255,255,255,0.86);
      }

      @media (max-width: 768px) {
        .fieam-shell table {
          min-width: 880px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .fieam-shell *,
        .fieam-sidebar * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}

function LayoutInner({ children, title, subtitle }: LayoutProps) {
  const { collapsed } = useSidebar();
  const { isDark } = useTheme();
  const pageContext = getPageContext(title);
  const PageIcon = pageContext.icon;
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <div
      className={cn(
        "fieam-shell min-h-screen flex overflow-x-hidden transition-theme text-ds-primary",
        isDark ? "bg-ds-primary" : "bg-ds-primary"
      )}
    >
      <LayoutPolish />
      <Sidebar />

      <main
        className={cn(
          "relative flex-1 min-w-0 transition-[margin] duration-300 ease-out",
          collapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[var(--ds-accent-muted)]/30 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-4 sm:px-5 md:px-7 lg:px-9 lg:py-7">
          <header
            className={cn(
              "relative overflow-hidden rounded-[28px] border shadow-ds-elevated",
              isDark
                ? "border-white/10 bg-[#071A2E]/[0.86]"
                : "border-white/80 bg-white/[0.82]"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(0,180,255,0.24),transparent_34%),linear-gradient(135deg,rgba(0,119,204,0.22),transparent_42%)]" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.72) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.72) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
              }}
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            <div className="relative z-10 grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={cn(
                    "hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:flex",
                    isDark
                      ? "border-white/10 bg-white/[0.06] text-[#5ED6FF] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                      : "border-sky-100 bg-sky-50 text-[#0077CC] shadow-sm"
                  )}
                >
                  <PageIcon className="h-6 w-6" strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                        isDark
                          ? "border-cyan-300/15 bg-cyan-300/10 text-cyan-200"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.14)]" />
                      {pageContext.eyebrow}
                    </span>
                    <span className="hidden text-[11px] font-medium capitalize text-ds-tertiary sm:inline-flex">
                      {todayLabel}
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold tracking-[-0.04em] text-ds-primary sm:text-3xl lg:text-[34px]">
                    {title}
                  </h1>
                  <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ds-secondary sm:text-[15px]">
                    {subtitle || pageContext.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:items-end">
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-2xl border p-2 shadow-sm",
                    isDark
                      ? "border-white/10 bg-white/[0.045]"
                      : "border-slate-200/70 bg-slate-950/[0.88] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_12px_30px_rgba(15,23,42,.08)]"
                  )}
                >
                  {LOGOS.map((logo) => (
                    <div
                      key={logo.alt}
                      className={cn(
                        "flex h-10 w-[76px] items-center justify-center rounded-xl border px-2 transition-transform duration-200 hover:-translate-y-0.5",
                        isDark
                          ? "border-white/10 bg-white/[0.04]"
                          : "border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.10)]"
                      )}
                    >
                      <img src={logo.src} alt={logo.alt} className="max-h-7 max-w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,.32)]" />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ds-tertiary">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-subtle bg-ds-inset px-3 py-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--ds-accent)]" />
                    Ambiente institucional
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-subtle bg-ds-inset px-3 py-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-emerald-500" />
                    Dados operacionais
                  </span>
                </div>
              </div>
            </div>
          </header>

          <section className="animate-in pb-8">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutInner title={title} subtitle={subtitle}>
        {children}
      </LayoutInner>
    </SidebarProvider>
  );
}
