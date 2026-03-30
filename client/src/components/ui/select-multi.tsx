import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SelectMultiProps {
    values: string[];
    onValuesChange: (values: string[]) => void;
    placeholder: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    panelTitle?: string;
    className?: string;
    maxDisplay?: number;
}

export function SelectMulti({
    values,
    onValuesChange,
    placeholder,
    options,
    disabled = false,
    panelTitle,
    className = "",
    maxDisplay = 2,
}: SelectMultiProps) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState<string[]>(values);
    const [search, setSearch] = useState("");
    const showSearch = options.length > 6;

    useEffect(() => {
        if (open) {
            setPending(values);
            setSearch("");
        }
    }, [open, values]);

    const getDisplayText = () => {
        if (values.length === 0) return placeholder;
        if (values.length === 1) {
            const opt = options.find(o => o.value === values[0]);
            return opt?.label || values[0];
        }
        const selectedLabels = values
            .slice(0, maxDisplay)
            .map(v => options.find(o => o.value === v)?.label || v);
        const remaining = values.length - maxDisplay;
        if (remaining > 0) {
            return `${selectedLabels.join(", ")} +${remaining}`;
        }
        return selectedLabels.join(", ");
    };

    const displayText = getDisplayText();

    const filteredOptions = search.trim()
        ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const handleConfirm = useCallback(() => {
        onValuesChange(pending);
        setOpen(false);
    }, [onValuesChange, pending]);

    const handleCancel = useCallback(() => {
        setPending(values);
        setOpen(false);
    }, [values]);

    const toggleOption = useCallback((value: string) => {
        setPending(prev => {
            if (prev.includes(value)) {
                return prev.filter(v => v !== value);
            }
            return [...prev, value];
        });
    }, []);

    const clearAll = useCallback(() => {
        setPending([]);
    }, []);

    const selectAll = useCallback(() => {
        setPending(options.map(o => o.value));
    }, [options]);

    const pendingChanged = pending.length !== values.length || 
        pending.some(v => !values.includes(v)) ||
        values.some(v => !pending.includes(v));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`group flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold bg-white border border-gray-300 rounded-xl text-gray-900 hover:border-[#009FE3] hover:shadow-md transition-all duration-200 min-w-[180px] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3]/30 focus:border-[#009FE3] ${className}`}
                    disabled={disabled}
                    type="button"
                >
                    <span className={`font-bold truncate flex-1 text-left ${values.length > 0 ? "text-gray-900" : "text-gray-500"}`}>{displayText}</span>
                    {values.length > 0 && (
                        <span 
                            className="flex items-center justify-center w-5 h-5 rounded-full bg-[#009FE3] text-white text-[10px] font-bold shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onValuesChange([]);
                            }}
                        >
                            <X className="w-3 h-3" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""} group-hover:text-[#009FE3]`} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden"
                align="start"
                sideOffset={8}
            >
                {/* Header */}
                {panelTitle && (
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-gray-50/80">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-[#009FE3] font-extrabold">
                                {panelTitle}
                            </p>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {pending.length} selecionado{pending.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Search */}
                {showSearch && (
                    <div className="px-3 pt-3 pb-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus-within:border-[#009FE3] focus-within:ring-2 focus-within:ring-[#009FE3]/20 transition-all">
                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="bg-transparent text-xs text-gray-800 font-medium placeholder-gray-400 outline-none w-full"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Select All / Clear All */}
                <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100">
                    <button
                        onClick={selectAll}
                        className="text-[10px] text-[#009FE3] hover:text-[#0077B5] transition-colors font-bold"
                        type="button"
                    >
                        Selecionar todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                        onClick={clearAll}
                        className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors font-medium"
                        type="button"
                    >
                        Limpar
                    </button>
                </div>

                {/* Options */}
                <div className="p-2 space-y-0.5 max-h-[280px] overflow-y-auto">
                    {filteredOptions.map((option) => {
                        const isSelected = pending.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-150 flex items-center justify-between gap-2 ${
                                    isSelected
                                        ? "bg-[#009FE3]/8 text-[#009FE3] font-bold"
                                        : "text-gray-700 font-medium hover:text-gray-900 hover:bg-gray-50"
                                }`}
                                type="button"
                            >
                                <span className="truncate">{option.label}</span>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                    isSelected
                                        ? "bg-[#009FE3] border-[#009FE3]"
                                        : "border-gray-300 hover:border-gray-400"
                                }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                            </button>
                        );
                    })}
                    {filteredOptions.length === 0 && (
                        <p className="text-center text-gray-400 text-xs py-4 font-medium">Nenhum resultado</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 border border-gray-200 transition-all duration-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                            pendingChanged
                                ? "bg-[#009FE3] text-white hover:bg-[#0088CC] shadow-md shadow-[#009FE3]/20"
                                : "bg-[#009FE3] text-white hover:bg-[#0088CC]"
                        }`}
                    >
                        Confirmar ({pending.length})
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
