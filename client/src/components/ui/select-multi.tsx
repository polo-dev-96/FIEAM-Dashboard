import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

  const selectedLabels = values
    .map((value) => options.find((opt) => opt.value === value)?.label || value)
    .filter(Boolean);

  const displayText = selectedLabels.length === 0
    ? placeholder
    : selectedLabels.length <= maxDisplay
      ? selectedLabels.join(", ")
      : `${selectedLabels.slice(0, maxDisplay).join(", ")} +${selectedLabels.length - maxDisplay}`;

  const filteredOptions = search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggleValue = useCallback((value: string) => {
    setPending((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  }, []);

  const handleConfirm = useCallback(() => {
    onValuesChange(pending);
    setOpen(false);
  }, [onValuesChange, pending]);

  const handleCancel = useCallback(() => {
    setPending(values);
    setOpen(false);
  }, [values]);

  const handleClear = useCallback(() => setPending([]), []);

  const pendingChanged = pending.length !== values.length || pending.some((value) => !values.includes(value));

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
          <span className={cn("flex-1 truncate text-left", values.length > 0 ? "text-ds-primary" : "text-ds-tertiary")}>{displayText}</span>
          {values.length > 0 && (
            <span className="rounded-full bg-[var(--ds-accent-muted)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--ds-accent)]">
              {values.length}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ds-tertiary transition-transform duration-200 group-hover:text-[var(--ds-accent)]", open && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden rounded-2xl border border-ds-default bg-ds-elevated p-0 text-ds-primary shadow-2xl"
        align="start"
        sideOffset={8}
      >
        {panelTitle && (
          <div className="border-b border-ds-subtle bg-ds-inset px-4 pb-2.5 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--ds-accent)]">{panelTitle}</p>
              {pending.length > 0 && (
                <button type="button" onClick={handleClear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-ds-tertiary hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
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

        <div className="max-h-[300px] space-y-0.5 overflow-y-auto p-2">
          {filteredOptions.map((option) => {
            const isSelected = pending.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleValue(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150",
                  isSelected
                    ? "bg-[var(--ds-accent-muted)] font-extrabold text-[var(--ds-accent)]"
                    : "font-semibold text-ds-secondary hover:bg-ds-inset hover:text-ds-primary"
                )}
                type="button"
              >
                <span className="truncate">{option.label}</span>
                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", isSelected ? "border-[var(--ds-accent)] bg-[var(--ds-accent)] text-white" : "border-ds-default")}> 
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
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
