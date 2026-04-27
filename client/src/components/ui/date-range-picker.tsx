/*
 * ============================================================
 * components/ui/date-range-picker.tsx — Seletor de Intervalo de Datas
 * ============================================================
 *
 * Componente de seleção de período de datas para os filtros do dashboard.
 * Usa um Popover com dois calendários lado a lado + atalhos de período (Presets).
 *
 * Comportamento:
 *   - O usuário pode selecionar um intervalo no calendário
 *   - OU clicar em um atalho de período (Hoje, Semana, Mês, etc.)
 *   - A seleção só é aplicada ao clicar "Aplicar" (comportamento pending)
 *   - Botão X permite limpar o período para o dia atual
 *
 * Props:
 *   startDate → data inicial atual (YYYY-MM-DD)
 *   endDate   → data final atual   (YYYY-MM-DD)
 *   onApply   → callback chamado ao confirmar o período selecionado
 *
 * Presets disponíveis: Hoje, Ontem, Esta semana, Semana passada,
 *   Últimos 7/15/30 dias, Este mês, Mês passado, Este ano
 * ============================================================
 */

// useState/useCallback: hooks de estado e memoização
import { useState, useCallback } from "react";

// date-fns: funções de manipulação de datas
// format             → formata data como string ("dd/MM/yyyy")
// startOfWeek/Month  → primeiro dia da semana/mês
// endOfMonth         → último dia do mês
// subDays/Weeks/Months → subtrai dias/semanas/meses de uma data
// startOfYear        → 01 de janeiro do ano atual
// addMonths          → navegação para o próximo mês no calendário
import { format, startOfWeek, startOfMonth, endOfMonth, subDays, subMonths, subWeeks, startOfYear, addMonths } from "date-fns";

// ptBR: formata datas em português ("janeiro 2026" em vez de "January 2026")
import { ptBR } from "date-fns/locale";

// Ícones Lucide para o calendário
import { CalendarDays, ChevronLeft, ChevronRight, X, Check, Clock, ChevronsLeft, ChevronsRight } from "lucide-react";

// Popover: painel flutuante que contém os calendários
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// DayPicker: calendário interativo com suporte a intervalo de datas
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";

/*
 * DateRangePickerProps — Props do componente
 */
interface DateRangePickerProps {
    startDate: string; // data inicial no formato YYYY-MM-DD
    endDate: string;   // data final no formato YYYY-MM-DD
    onApply: (startDate: string, endDate: string) => void; // callback ao confirmar
}

/*
 * Preset — Atalho de período
 *   label    → texto exibido no botão (ex: "Hoje", "Últimos 30 dias")
 *   icon     → emoji de ícone decorativo
 *   getRange → função que calcula as datas from/to em tempo real
 *             (função porque "Hoje" muda a cada dia)
 */
interface Preset {
    label: string;
    icon: string;
    getRange: () => { from: Date; to: Date };
}

/*
 * PRESETS — Lista dos atalhos de período disponíveis
 * Cada preset calcula seu intervalo dinamicamente usando date-fns.
 */
const PRESETS: Preset[] = [
    {
        label: "Hoje",
        icon: "📅",
        getRange: () => {
            const now = new Date();
            return { from: now, to: now };
        },
    },
    {
        label: "Ontem",
        icon: "⏪",
        getRange: () => {
            const yesterday = subDays(new Date(), 1);
            return { from: yesterday, to: yesterday };
        },
    },
    {
        label: "Esta semana",
        icon: "📆",
        getRange: () => {
            const now = new Date();
            return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
        },
    },
    {
        label: "Semana passada",
        icon: "↩️",
        getRange: () => {
            const now = new Date();
            const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            const lastWeekEnd = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
            return { from: lastWeekStart, to: lastWeekEnd };
        },
    },
    {
        label: "Últimos 7 dias",
        icon: "7️⃣",
        getRange: () => {
            const now = new Date();
            return { from: subDays(now, 7), to: now };
        },
    },
    {
        label: "Últimos 30 dias",
        icon: "🔢",
        getRange: () => {
            const now = new Date();
            return { from: subDays(now, 30), to: now };
        },
    },
    {
        label: "Este mês",
        icon: "📋",
        getRange: () => {
            const now = new Date();
            return { from: startOfMonth(now), to: now };
        },
    },
    {
        label: "Mês passado",
        icon: "📁",
        getRange: () => {
            const lastMonth = subMonths(new Date(), 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        },
    },
    {
        label: "Últimos 3 meses",
        icon: "📊",
        getRange: () => {
            const now = new Date();
            return { from: subMonths(now, 3), to: now };
        },
    },
    {
        label: "Este ano",
        icon: "🗓️",
        getRange: () => {
            const now = new Date();
            return { from: startOfYear(now), to: now };
        },
    },
];

export function DateRangePicker({ startDate, endDate, onApply }: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<DateRange | undefined>(() => ({
        from: new Date(startDate + "T00:00:00"),
        to: new Date(endDate + "T00:00:00"),
    }));
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [month, setMonth] = useState<Date>(
        selected?.from ? new Date(selected.from.getFullYear(), selected.from.getMonth()) : new Date()
    );

    const displayText =
        selected?.from && selected?.to
            ? `${format(selected.from, "dd MMM yyyy", { locale: ptBR })} — ${format(selected.to, "dd MMM yyyy", { locale: ptBR })}`
            : "Selecione um período";

    // Custom navigation handlers
    const goToPrevMonth = useCallback(() => setMonth((m) => subMonths(m, 1)), []);
    const goToNextMonth = useCallback(() => setMonth((m) => addMonths(m, 1)), []);
    const goToPrevYear = useCallback(() => setMonth((m) => subMonths(m, 12)), []);
    const goToNextYear = useCallback(() => setMonth((m) => addMonths(m, 12)), []);

    const handlePreset = useCallback((preset: Preset) => {
        const range = preset.getRange();
        setSelected(range);
        setActivePreset(preset.label);
        setMonth(new Date(range.from.getFullYear(), range.from.getMonth()));
    }, []);

    const handleConfirm = useCallback(() => {
        if (selected?.from && selected?.to) {
            onApply(format(selected.from, "yyyy-MM-dd"), format(selected.to, "yyyy-MM-dd"));
            setOpen(false);
        }
    }, [selected, onApply]);

    const handleClear = useCallback(() => {
        const now = new Date();
        const range = { from: startOfMonth(now), to: now };
        setSelected(range);
        setActivePreset("Este mês");
        setMonth(new Date(now.getFullYear(), now.getMonth()));
        onApply(format(range.from, "yyyy-MM-dd"), format(range.to, "yyyy-MM-dd"));
        setOpen(false);
    }, [onApply]);

    const handleSelect = useCallback((range: DateRange | undefined) => {
        setSelected(range);
        setActivePreset(null);
    }, []);

    const daysCount =
        selected?.from && selected?.to
            ? Math.ceil((selected.to.getTime() - selected.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0;

    // Month labels for the two visible months
    const month1Label = format(month, "MMMM yyyy", { locale: ptBR });
    const month2Label = format(addMonths(month, 1), "MMMM yyyy", { locale: ptBR });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-ds-elevated border border-ds-default rounded-2xl text-ds-primary hover:border-ds-strong hover:bg-[var(--ds-accent-muted)] transition-all duration-300 min-w-[280px] backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-[#009FE3]/5">
                    <CalendarDays className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-left flex-1 truncate font-medium">{displayText}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 bg-ds-elevated border border-ds-default shadow-2xl shadow-black/40 rounded-2xl overflow-hidden backdrop-blur-xl z-[9999]"
                align="start"
                sideOffset={8}
            >
                <div className="flex min-h-[440px]">
                    {/* ─── Presets sidebar ──────────────────────── */}
                    <div className="border-r border-ds-subtle w-[180px] flex flex-col bg-ds-inset">
                        <div className="px-4 pt-4 pb-2">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                Atalhos
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-thin">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePreset(preset)}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                        activePreset === preset.label
                                            ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border border-[#009FE3]/20"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                    }`}
                                >
                                    <span className="text-[11px]">{preset.icon}</span>
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Calendar + actions ───────────────────── */}
                    <div className="flex flex-col flex-1">
                        {/* Selected range header */}
                        <div className="px-5 pt-4 pb-3 border-b border-ds-subtle bg-ds-inset">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold mb-1">
                                        Período selecionado
                                    </p>
                                    <p className="text-sm font-bold text-white">
                                        {selected?.from && selected?.to
                                            ? `${format(selected.from, "dd 'de' MMMM yyyy", { locale: ptBR })} — ${format(selected.to, "dd 'de' MMMM yyyy", { locale: ptBR })}`
                                            : "Selecione as datas no calendário"}
                                    </p>
                                </div>
                                {daysCount > 0 && (
                                    <span className="px-2.5 py-1 bg-[#009FE3]/10 text-[#009FE3] text-[10px] font-bold rounded-full border border-[#009FE3]/20 whitespace-nowrap">
                                        {daysCount} {daysCount === 1 ? "dia" : "dias"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ─── Custom Navigation Bar ───────────────── */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={goToPrevYear}
                                    title="Ano anterior"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 border border-transparent hover:border-[#1a3a5c] transition-all duration-200"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={goToPrevMonth}
                                    title="Mês anterior"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-[#1a3a5c] transition-all duration-200"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-6">
                                <span className="text-sm font-semibold text-gray-200 capitalize min-w-[120px] text-center">
                                    {month1Label}
                                </span>
                                <span className="text-gray-600">|</span>
                                <span className="text-sm font-semibold text-gray-200 capitalize min-w-[120px] text-center">
                                    {month2Label}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={goToNextMonth}
                                    title="Próximo mês"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-[#1a3a5c] transition-all duration-200"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={goToNextYear}
                                    title="Próximo ano"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 border border-transparent hover:border-[#1a3a5c] transition-all duration-200"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar (built-in nav hidden — we use custom nav above) */}
                        <div className="px-3 pb-1 flex-1">
                            <DayPicker
                                mode="range"
                                selected={selected}
                                onSelect={handleSelect}
                                locale={ptBR}
                                numberOfMonths={2}
                                month={month}
                                onMonthChange={setMonth}
                                showOutsideDays
                                hideNavigation
                                className="text-gray-200"
                                classNames={{
                                    months: "flex gap-6",
                                    month: "space-y-2",
                                    month_caption: "flex justify-center pt-0 pb-1 items-center",
                                    caption_label: "text-xs font-medium text-gray-400 capitalize",
                                    month_grid: "w-full border-collapse",
                                    weekdays: "flex",
                                    weekday:
                                        "text-gray-500 rounded-md w-10 h-8 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center",
                                    week: "flex w-full",
                                    day: "h-10 w-10 text-center text-sm p-0.5 relative focus-within:relative focus-within:z-20",
                                    day_button:
                                        "h-9 w-9 p-0 font-normal text-gray-300 hover:bg-[#009FE3]/15 hover:text-white rounded-lg inline-flex items-center justify-center transition-all duration-150 cursor-pointer",
                                    selected:
                                        "!bg-[#009FE3] !text-white hover:!bg-[#0088c7] font-semibold rounded-lg shadow-md shadow-[#009FE3]/25",
                                    today: "bg-white/8 text-white font-bold ring-1 ring-[#009FE3]/30 rounded-lg",
                                    outside: "text-gray-600/40 hover:text-gray-500",
                                    disabled: "text-gray-700 opacity-30 cursor-not-allowed",
                                    range_middle:
                                        "!bg-[#009FE3]/15 !text-[#7dd3fc] rounded-none",
                                    range_start: "rounded-l-lg",
                                    range_end: "rounded-r-lg",
                                    hidden: "invisible",
                                }}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-ds-subtle bg-ds-inset">
                            <button
                                onClick={handleClear}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-400 transition-all duration-200 rounded-lg hover:bg-red-500/5 border border-transparent hover:border-red-500/15"
                            >
                                <X className="w-3.5 h-3.5" />
                                Limpar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selected?.from || !selected?.to}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs bg-[#009FE3] text-white rounded-lg hover:bg-[#0088c7] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-semibold shadow-md shadow-[#009FE3]/20 hover:shadow-lg hover:shadow-[#009FE3]/30"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Aplicar filtro
                            </button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
