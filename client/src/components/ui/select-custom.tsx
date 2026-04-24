import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (open) {
      setPending(value);
      setSearch("");
    }
  }, [open, value]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const filteredOptions = search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
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
          className={cn(
            "group flex min-w-[180px] items-center gap-2.5 rounded-2xl border border-ds-default bg-ds-elevated px-4 py-2.5 text-xs font-extrabold text-ds-primary shadow-sm transition-all duration-200 hover:border-ds-strong hover:bg-[var(--ds-accent-muted)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ds-default focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent)]/25",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <span className={cn("flex-1 truncate text-left", value ? "text-ds-primary" : "text-ds-tertiary")}>{displayText}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ds-tertiary transition-transform duration-200 group-hover:text-[var(--ds-accent)]", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] overflow-hidden rounded-2xl border border-ds-default bg-ds-elevated p-0 text-ds-primary shadow-2xl"
        align="start"
        sideOffset={8}
      >
        {panelTitle && (
          <div className="border-b border-ds-subtle bg-ds-inset px-4 pb-2.5 pt-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--ds-accent)]">{panelTitle}</p>
          </div>
        )}

        {showSearch && (
          <div className="px-3 pb-1 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-ds-subtle bg-ds-inset px-3 py-2 transition-all focus-within:border-ds-strong focus-within:ring-2 focus-within:ring-[var(--ds-accent)]/15">
              <Search className="h-3.5 w-3.5 shrink-0 text-ds-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-transparent text-xs font-semibold text-ds-primary placeholder:text-ds-tertiary outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-2">
          {filteredOptions.map((option) => {
            const isSelected = pending === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setPending(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150",
                  isSelected
                    ? "bg-[var(--ds-accent-muted)] font-extrabold text-[var(--ds-accent)]"
                    : "font-semibold text-ds-secondary hover:bg-ds-inset hover:text-ds-primary"
                )}
                type="button"
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--ds-accent)]" />}
              </button>
            );
          })}
          {filteredOptions.length === 0 && <p className="py-5 text-center text-xs font-semibold text-ds-tertiary">Nenhum resultado</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-ds-subtle px-3 pb-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-ds-subtle px-3 py-2 text-xs font-extrabold text-ds-secondary transition-all hover:bg-ds-inset hover:text-ds-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-xs font-extrabold text-white transition-all",
              pendingChanged ? "bg-[var(--ds-accent)] shadow-lg shadow-sky-500/10 hover:bg-[var(--ds-accent-hover)]" : "bg-[var(--ds-accent)] hover:bg-[var(--ds-accent-hover)]"
            )}
          >
            Confirmar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
