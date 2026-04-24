import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_SHORT = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

interface MonthPickerProps {
    selectedMonths: number[];       // array of selected months (1-12), empty = anual
    selectedYear: number;
    onChangeMonths: (months: number[]) => void;
    onChangeYear: (year: number) => void;
}

export function MonthPicker({ selectedMonths, selectedYear, onChangeMonths, onChangeYear }: MonthPickerProps) {
    const [open, setOpen] = useState(false);
    const [stagedMonths, setStagedMonths] = useState<number[]>(selectedMonths);
    const [stagedYear, setStagedYear] = useState(selectedYear);
    const currentYear = new Date().getFullYear();

    // Sync staged with external value when popover opens
    useEffect(() => {
        if (open) {
            setStagedMonths(selectedMonths);
            setStagedYear(selectedYear);
        }
    }, [open]);

    const isAnual = stagedMonths.length === 0;

    // Display text
    const displayText = useMemo(() => {
        if (selectedMonths.length === 0) return `Anual ${selectedYear}`;
        if (selectedMonths.length === 1) return `${MONTH_SHORT[selectedMonths[0] - 1]} ${selectedYear}`;
        if (selectedMonths.length <= 3) return `${selectedMonths.map(m => MONTH_SHORT[m - 1]).join(", ")} ${selectedYear}`;
        return `${selectedMonths.length} meses • ${selectedYear}`;
    }, [selectedMonths, selectedYear]);

    const toggleMonth = useCallback((month: number) => {
        setStagedMonths(prev =>
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month].sort((a, b) => a - b)
        );
    }, []);

    const handleSelectAnual = useCallback(() => {
        setStagedMonths([]);
    }, []);

    const handleConfirm = useCallback(() => {
        onChangeMonths(stagedMonths);
        onChangeYear(stagedYear);
        setOpen(false);
    }, [stagedMonths, stagedYear, onChangeMonths, onChangeYear]);

    const handleCancel = useCallback(() => {
        setStagedMonths(selectedMonths);
        setStagedYear(selectedYear);
        setOpen(false);
    }, [selectedMonths, selectedYear]);

    const hasChanges = useMemo(() => {
        if (stagedYear !== selectedYear) return true;
        if (stagedMonths.length !== selectedMonths.length) return true;
        return stagedMonths.some((m, i) => m !== selectedMonths[i]);
    }, [stagedMonths, stagedYear, selectedMonths, selectedYear]);

    return (
        <Popover open={open} onOpenChange={(v) => { if (!v) { handleCancel(); } else { setOpen(true); } }}>
            <PopoverTrigger asChild>
                <button className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-ds-elevated border border-ds-default rounded-2xl text-ds-primary hover:border-ds-strong hover:bg-[var(--ds-accent-muted)] transition-all duration-300 min-w-[160px] backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-[#009FE3]/5">
                    <Calendar className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-left flex-1 truncate font-medium">{displayText}</span>
                    {selectedMonths.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#009FE3]/15 text-[#009FE3] text-[9px] font-bold rounded-full border border-[#009FE3]/20 min-w-[18px] text-center">
                            {selectedMonths.length}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[280px] p-0 bg-ds-elevated border border-ds-default shadow-2xl shadow-black/40 rounded-2xl overflow-hidden backdrop-blur-xl"
                align="start"
                sideOffset={8}
            >
                <div className="flex flex-col">
                    {/* Header — Year selector */}
                    <div className="px-4 pt-4 pb-3 border-b border-ds-subtle bg-ds-inset">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold flex items-center gap-1.5 mb-3">
                            <Calendar className="w-3 h-3" />
                            Filtro Mensal
                        </p>
                        <div className="flex items-center justify-between bg-ds-inset border border-ds-subtle rounded-lg px-2 py-1.5">
                            <button
                                onClick={() => setStagedYear(y => y - 1)}
                                className="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-white/5"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-gray-200">{stagedYear}</span>
                            <button
                                onClick={() => setStagedYear(y => Math.min(currentYear, y + 1))}
                                disabled={stagedYear >= currentYear}
                                className="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-white/5 disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="px-2 py-2 space-y-0.5">
                        {/* "Anual" option */}
                        <button
                            onClick={handleSelectAnual}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-2.5 ${isAnual
                                ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border border-[#009FE3]/20"
                                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isAnual
                                ? "border-[#009FE3] bg-[#009FE3]"
                                : "border-gray-600"
                                }`}>
                                {isAnual && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span>Anual (todos os meses)</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-ds-subtle my-1.5" />

                        {/* Month grid — 3 columns */}
                        <div className="grid grid-cols-3 gap-1">
                            {MONTH_NAMES.map((name, idx) => {
                                const month = idx + 1;
                                const checked = stagedMonths.includes(month);
                                return (
                                    <button
                                        key={month}
                                        onClick={() => toggleMonth(month)}
                                        className={`px-2 py-2.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 ${checked
                                            ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border border-[#009FE3]/20"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked
                                            ? "border-[#009FE3] bg-[#009FE3]"
                                            : "border-gray-600 hover:border-gray-400"
                                            }`}>
                                            {checked && <Check className="w-2 h-2 text-white" />}
                                        </div>
                                        <span className="truncate text-[11px]">{MONTH_SHORT[idx]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer — Confirm / Clear */}
                    <div className="px-3 py-2.5 border-t border-ds-subtle bg-ds-inset flex items-center gap-2">
                        {!isAnual && (
                            <button
                                onClick={handleSelectAnual}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-400 transition-all duration-200 rounded-lg hover:bg-red-500/5 border border-transparent hover:border-red-500/15"
                            >
                                <X className="w-3.5 h-3.5" />
                                Limpar
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${hasChanges
                                ? "bg-[#009FE3] text-white hover:bg-[#0088c7] shadow-md shadow-[#009FE3]/20"
                                : "bg-[#009FE3]/20 text-[#009FE3] cursor-default"
                                }`}
                        >
                            <Check className="w-3.5 h-3.5" />
                            Confirmar
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
