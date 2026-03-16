import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
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

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption?.label || placeholder;

    const handleSelect = useCallback((optionValue: string) => {
        onValueChange(optionValue);
        setOpen(false);
    }, [onValueChange]);

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
                className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 bg-[#0b1a2e] border border-[#1a3a5c]/80 shadow-2xl shadow-black/40 rounded-2xl overflow-hidden backdrop-blur-xl"
                align="start"
                sideOffset={8}
            >
                {panelTitle && (
                    <div className="px-4 pt-3 pb-2 border-b border-[#1a3a5c]/40 bg-[#0d1f33]/50">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold">
                            {panelTitle}
                        </p>
                    </div>
                )}
                <div className="p-2 space-y-1">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                                value === option.value
                                    ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border-[#009FE3]/30"
                                    : "text-gray-300 hover:text-white hover:bg-white/10 border-transparent"
                            }`}
                            type="button"
                        >
                            <span className="truncate">{option.label}</span>
                            {value === option.value && (
                                <div className="w-2 h-2 rounded-full bg-[#009FE3] ml-auto shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
