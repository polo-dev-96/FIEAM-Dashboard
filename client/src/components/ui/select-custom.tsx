import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SelectCustomProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    panelTitle?: string;
    className?: string;
}

export function SelectCustom({
    value,
    onValueChange,
    placeholder,
    options,
    disabled = false,
    panelTitle,
    className = "",
}: SelectCustomProps) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(value);
    const [search, setSearch] = useState("");
    const showSearch = options.length > 6;

    // Sync pending with external value when popover opens
    useEffect(() => {
        if (open) {
            setPending(value);
            setSearch("");
        }
    }, [open, value]);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption?.label || placeholder;

    const filteredOptions = search.trim()
        ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const handleConfirm = useCallback(() => {
        onValueChange(pending);
        setOpen(false);
    }, [onValueChange, pending]);

    const handleCancel = useCallback(() => {
        setPending(value);
        setOpen(false);
    }, [value]);

    const pendingChanged = pending !== value;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-[#060e1a]/80 border border-[#1a3a5c]/80 rounded-xl text-gray-300 hover:border-[#009FE3]/40 hover:bg-[#0a1929] hover:text-white transition-all duration-300 min-w-[180px] backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-[#009FE3]/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#1a3a5c]/80 disabled:hover:bg-[#060e1a]/80 disabled:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#009FE3]/30 focus:border-[#009FE3] ${className}`}
                    disabled={disabled}
                    type="button"
                >
                    <span className="font-medium truncate flex-1 text-left">{displayText}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""} group-hover:text-white`} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0 bg-[#0b1a2e] border border-[#1a3a5c]/80 shadow-2xl shadow-black/40 rounded-2xl overflow-hidden backdrop-blur-xl"
                align="start"
                sideOffset={8}
            >
                {/* Header */}
                {panelTitle && (
                    <div className="px-4 pt-3 pb-2 border-b border-[#1a3a5c]/40 bg-[#0d1f33]/60">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#009FE3] font-bold">
                            {panelTitle}
                        </p>
                    </div>
                )}

                {/* Search (only for long lists) */}
                {showSearch && (
                    <div className="px-3 pt-3 pb-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#060e1a]/80 border border-[#1a3a5c]/50 focus-within:border-[#009FE3]/50 transition-colors">
                            <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="bg-transparent text-xs text-gray-200 placeholder-gray-500 outline-none w-full"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Options */}
                <div className="p-2 space-y-0.5 max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a3a5c] scrollbar-track-transparent">
                    {filteredOptions.map((option) => {
                        const isSelected = pending === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => setPending(option.value)}
                                className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-150 flex items-center justify-between gap-2 ${
                                    isSelected
                                        ? "bg-[#009FE3]/12 text-[#009FE3] font-semibold"
                                        : "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                                }`}
                                type="button"
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && (
                                    <Check className="w-4 h-4 text-[#009FE3] shrink-0" />
                                )}
                            </button>
                        );
                    })}
                    {filteredOptions.length === 0 && (
                        <p className="text-center text-gray-500 text-xs py-4">Nenhum resultado</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="px-3 pb-3 pt-2 border-t border-[#1a3a5c]/40 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            pendingChanged
                                ? "bg-[#009FE3] text-white hover:bg-[#0088CC] shadow-lg shadow-[#009FE3]/20"
                                : "bg-[#009FE3]/80 text-white hover:bg-[#009FE3]"
                        }`}
                    >
                        Confirmar
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
