import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Users, ChevronLeft, ChevronRight, Megaphone, Tag, MoreHorizontal, Hash, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";
import { apiRequest } from "@/lib/queryClient";

export interface SelectedPatrocinado {
  nome: string;
  tipo: "patrocinado" | "campanha" | "outros";
  total: number;
}

interface ClienteItem {
  protocolo: string;
  contato: string | null;
  identificador: string | null;
  canal: string | null;
  dataHoraFim: string | null;
  resumoConversa: string | null;
}

interface ClientesResponse {
  total: number;
  page: number;
  totalPages: number;
  items: ClienteItem[];
}

interface PatrocinadosDrawerProps {
  selected: SelectedPatrocinado | null;
  dateRange: { startDate: string; endDate: string };
  onClose: () => void;
}

function cleanNome(nome: string): string {
  return nome.replace(/^(PATROCINADO|CAMPANHA)_/, "");
}

function formatDateTime(raw: string | null): string {
  if (!raw) return "—";
  try {
    return format(new Date(raw), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return raw;
  }
}

export function PatrocinadosDrawer({ selected, dateRange, onClose }: PatrocinadosDrawerProps) {
  const { isDark } = useTheme();
  const [page, setPage] = React.useState(1);
  const [inputPage, setInputPage] = React.useState("1");

  // Reset page when item changes
  React.useEffect(() => {
    setPage(1);
    setInputPage("1");
  }, [selected?.nome]);

  // Keep input in sync when page changes via arrows
  React.useEffect(() => {
    setInputPage(String(page));
  }, [page]);

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(inputPage, 10);
      if (!isNaN(num) && data) {
        setPage(Math.min(Math.max(1, num), data.totalPages));
      }
    }
  };

  const handlePageBlur = () => {
    if (data) {
      const num = parseInt(inputPage, 10);
      const clamped = isNaN(num) ? page : Math.min(Math.max(1, num), data.totalPages);
      setPage(clamped);
      setInputPage(String(clamped));
    }
  };

  const { data, isLoading, isFetching } = useQuery<ClientesResponse>({
    queryKey: ["patrocinados-clientes", selected?.nome, selected?.tipo, dateRange.startDate, dateRange.endDate, page],
    queryFn: () =>
      apiRequest(
        `/api/patrocinados-clientes?variaveis=${encodeURIComponent(selected!.nome)}&tipo=${selected!.tipo}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&page=${page}`
      ),
    enabled: !!selected,
    placeholderData: (prev) => prev,
  });

  const iconMap = {
    patrocinado: <Tag className="w-4 h-4" />,
    campanha: <Megaphone className="w-4 h-4" />,
    outros: <MoreHorizontal className="w-4 h-4" />,
  };

  const colorMap = {
    patrocinado: { bg: "bg-sky-500/10", text: "text-sky-400", accent: "#009FE3" },
    campanha: { bg: "bg-emerald-500/10", text: "text-emerald-400", accent: "#00A650" },
    outros: { bg: "bg-orange-500/10", text: "text-orange-400", accent: "#F37021" },
  };

  const colors = selected ? colorMap[selected.tipo] : colorMap.patrocinado;

  return (
    <DialogPrimitive.Root open={!!selected} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 backdrop-blur-sm transition-opacity",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            isDark ? "bg-black/50" : "bg-slate-900/40"
          )}
        />

        {/* Drawer panel */}
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-full max-w-[640px] flex flex-col",
            "border-l shadow-2xl outline-none",
            "transition-transform duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            isDark
              ? "bg-[#061524] border-[#1E3A5F]/70"
              : "bg-white border-slate-200"
          )}
        >
          {/* Top accent line */}
          <div
            className="h-[3px] w-full shrink-0"
            style={{ background: `linear-gradient(90deg, ${colors.accent}cc, ${colors.accent}44)` }}
          />

          {/* Header */}
          <div className={cn(
            "flex items-start gap-3 px-5 py-4 border-b shrink-0",
            isDark ? "border-[#1E3A5F]/50 bg-[#081E30]/70" : "border-slate-100 bg-slate-50/80"
          )}>
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
              <span className={colors.text}>{selected && iconMap[selected.tipo]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title className={cn("text-[13px] font-extrabold leading-tight truncate", isDark ? "text-white" : "text-gray-900")}>
                {selected ? cleanNome(selected.nome) : ""}
              </DialogPrimitive.Title>
              <p className={cn("text-[11px] mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                {data ? (
                  <span>
                    <span className="font-bold" style={{ color: colors.accent }}>{data.total.toLocaleString("pt-BR")}</span>
                    {" "}atendimento{data.total !== 1 ? "s" : ""}
                  </span>
                ) : (
                  selected ? `${selected.total.toLocaleString("pt-BR")} atendimentos` : ""
                )}
              </p>
            </div>
            {/* Export XLSX */}
            {selected && (
              <a
                href={`/api/patrocinados-export-xlsx?variaveis=${encodeURIComponent(selected.nome)}&tipo=${selected.tipo}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`}
                download
                title="Baixar em Excel (.xlsx)"
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0",
                  isDark
                    ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <DialogPrimitive.Close
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0",
                isDark
                  ? "text-gray-400 hover:bg-[#1E3A5F]/60 hover:text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              )}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>

          {/* Period badge */}
          <div className={cn("px-5 py-2.5 border-b shrink-0", isDark ? "border-[#1E3A5F]/40" : "border-slate-100")}>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-400")}>
              Período: {dateRange.startDate} → {dateRange.endDate}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.accent }} />
                <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Carregando atendimentos...</p>
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Users className={cn("w-8 h-8", isDark ? "text-gray-600" : "text-gray-300")} />
                <p className={cn("text-sm font-medium", isDark ? "text-gray-400" : "text-gray-500")}>Nenhum atendimento encontrado</p>
              </div>
            ) : (
              <div className="relative">
                {isFetching && !isLoading && (
                  <div className="absolute top-2 right-4 z-10">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.accent }} />
                  </div>
                )}

                {/* Table header */}
                <div className={cn(
                  "grid grid-cols-[minmax(0,1fr)_120px_130px_120px_140px_88px] gap-x-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b sticky top-0 z-10 items-center",
                  isDark
                    ? "text-gray-500 border-[#1E3A5F]/40 bg-[#061524]"
                    : "text-gray-400 border-slate-100 bg-white"
                )}>
                  <span>Contato</span>
                  <span>Número</span>
                  <span>Protocolo</span>
                  <span>Canal</span>
                  <span>Resumo</span>
                  <span className="text-right">Data/Hora</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#1E3A5F]/20">
                  {data.items.map((item, idx) => (
                    <div
                      key={`${item.protocolo}-${idx}`}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_120px_130px_120px_140px_88px] gap-x-2 px-5 py-3 text-[12px] transition-colors items-center",
                        isDark
                          ? "hover:bg-[#0C2135]/80 border-[#1E3A5F]/20"
                          : "hover:bg-slate-50 border-slate-100"
                      )}
                    >
                      {/* Contato */}
                      <div className="min-w-0">
                        <p className={cn("font-semibold truncate", isDark ? "text-gray-200" : "text-gray-800")}>
                          {(item.contato && item.contato !== "false") ? item.contato : "—"}
                        </p>
                      </div>

                      {/* Número */}
                      <div className="min-w-0">
                        <p className={cn("font-mono text-[11px] truncate", isDark ? "text-gray-400" : "text-gray-500")}>
                          {item.identificador || "—"}
                        </p>
                      </div>

                      {/* Protocolo */}
                      <div className="min-w-0">
                        <p className={cn("font-mono text-[11px] truncate", isDark ? "text-gray-400" : "text-gray-500")}>
                          {item.protocolo || "—"}
                        </p>
                      </div>

                      {/* Canal */}
                      <div>
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                          isDark ? "bg-[#1E3A5F]/60 text-gray-300" : "bg-slate-100 text-gray-600"
                        )}>
                          {item.canal || "—"}
                        </span>
                      </div>

                      {/* Resumo */}
                      <div className="min-w-0">
                        <p className={cn("text-[11px] truncate", isDark ? "text-gray-400" : "text-gray-500")} title={item.resumoConversa || undefined}>
                          {item.resumoConversa || "—"}
                        </p>
                      </div>

                      {/* Data */}
                      <div className="text-right">
                        <p className={cn("text-[11px] whitespace-nowrap", isDark ? "text-gray-500" : "text-gray-400")}>
                          {formatDateTime(item.dataHoraFim)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pagination footer */}
          {data && data.totalPages > 0 && (
            <div className={cn(
              "flex items-center justify-between px-5 py-3 border-t shrink-0",
              isDark ? "border-[#1E3A5F]/50 bg-[#081E30]/70" : "border-slate-100 bg-slate-50/80"
            )}>
              {/* Total count */}
              <span className={cn("text-[11px] font-medium flex items-center gap-1", isDark ? "text-gray-500" : "text-gray-400")}>
                <Hash className="w-3 h-3" />
                {data.total.toLocaleString("pt-BR")} registro{data.total !== 1 ? "s" : ""}
              </span>

              {/* Navigation */}
              {data.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || isFetching}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                      isDark
                        ? "text-gray-400 hover:bg-[#1E3A5F]/60 hover:text-white"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page input */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={data.totalPages}
                      value={inputPage}
                      onChange={(e) => setInputPage(e.target.value)}
                      onKeyDown={handlePageInput}
                      onBlur={handlePageBlur}
                      className={cn(
                        "w-10 h-7 text-center text-[12px] font-bold rounded-lg border outline-none transition-colors appearance-none",
                        isDark
                          ? "bg-[#0C2135] border-[#1E3A5F]/60 text-gray-200 focus:border-[#009FE3]/60"
                          : "bg-white border-slate-200 text-gray-700 focus:border-[#009FE3]/60"
                      )}
                    />
                    <span className={cn("text-[11px] font-medium", isDark ? "text-gray-500" : "text-gray-400")}>
                      / {data.totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages || isFetching}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                      isDark
                        ? "text-gray-400 hover:bg-[#1E3A5F]/60 hover:text-white"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
