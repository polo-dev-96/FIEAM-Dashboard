/*
 * ============================================================
 * components/ui/casa-picker.tsx — Seletor de Múltiplas Casas
 * ============================================================
 *
 * Permite selecionar MÚLTIPLAS casas (canais de atendimento) de uma vez.
 * Diferente do SelectCustom (seleção única), este permite multi-seleção.
 *
 * Comportamento "staged" (seleção em duas etapas):
 *   - O usuário clica em casas → atualiza `staged` (estado local, ainda não confirmado)
 *   - Clica "Aplicar" → chama onChange(staged) e fecha o popover
 *   - Clica "Cancelar" → descarta staged e restaura a seleção anterior
 *
 * Lógica de "Todas as Casas":
 *   - staged vazio (length === 0) significa "Todas" (sem filtro)
 *   - Botão "Todas" limpa staged para []
 *
 * Props:
 *   value   → array de casas atualmente selecionadas ([] = Todas)
 *   casas   → lista completa de casas disponíveis (do banco)
 *   onChange → callback ao confirmar a seleção
 * ============================================================
 */

// useState: estado local (open, search, staged)
// useCallback: memoiza funções que não precisam ser recriadas a cada render
// useMemo: memoiza a lista filtrada de casas para evitar recalcular a cada digitação
// useEffect: sincroniza staged com value quando o popover abre
import { useState, useCallback, useMemo, useEffect } from "react";

// Ícones Lucide
import { Building2, Check, Search, X } from "lucide-react";

// Popover: painel flutuante com a lista de casas
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/*
 * CasaPickerProps — Props do componente
 */
interface CasaPickerProps {
    value: string[];          // casas selecionadas (array vazio = Todas)
    casas: string[];          // lista completa de casas disponíveis
    onChange: (casas: string[]) => void; // callback ao confirmar
}

export function CasaPicker({ value, casas, onChange }: CasaPickerProps) {
    const [open, setOpen] = useState(false);        // controla o popover
    const [search, setSearch] = useState("");        // texto de busca

    // staged: seleção temporária (não aplicada ainda) — padrão "pending"
    const [staged, setStaged] = useState<string[]>(value);

    // Quando o popover abre: sincroniza staged com o valor atual (descarta pendências)
    useEffect(() => {
        if (open) {
            setStaged(value); // reseta para o valor confirmado
        }
    }, [open]);

    const allSelected = staged.length === 0; // empty = "Todas"

    const displayText = value.length === 0
        ? "Todas as Casas"
        : value.length === 1
            ? value[0]
            : `${value.length} casas selecionadas`;

    const filteredCasas = useMemo(() => {
        if (!search.trim()) return casas;
        const q = search.toLowerCase();
        return casas.filter((c) => c.toLowerCase().includes(q));
    }, [casas, search]);

    const isSelected = useCallback(
        (casa: string) => staged.includes(casa),
        [staged]
    );

    const toggleCasa = useCallback(
        (casa: string) => {
            setStaged((prev) =>
                prev.includes(casa) ? prev.filter((c) => c !== casa) : [...prev, casa]
            );
        },
        []
    );

    const handleSelectAll = useCallback(() => {
        setStaged([]);
    }, []);

    const handleClear = useCallback(() => {
        setStaged([]);
    }, []);

    const handleConfirm = useCallback(() => {
        onChange(staged);
        setOpen(false);
        setSearch("");
    }, [staged, onChange]);

    const handleCancel = useCallback(() => {
        setStaged(value);
        setOpen(false);
        setSearch("");
    }, [value]);

    // Check if staged differs from current value
    const hasChanges = useMemo(() => {
        if (staged.length !== value.length) return true;
        const sortedStaged = [...staged].sort();
        const sortedValue = [...value].sort();
        return sortedStaged.some((s, i) => s !== sortedValue[i]);
    }, [staged, value]);

    return (
        <Popover open={open} onOpenChange={(v) => { if (!v) { handleCancel(); } else { setOpen(true); } }}>
            <PopoverTrigger asChild>
                <button className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-ds-elevated border border-ds-default rounded-2xl text-ds-primary hover:border-ds-strong hover:bg-[var(--ds-accent-muted)] transition-all duration-300 min-w-[180px] backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-[#009FE3]/5">
                    <Building2 className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-left flex-1 truncate font-medium">{displayText}</span>
                    {value.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#009FE3]/15 text-[#009FE3] text-[9px] font-bold rounded-full border border-[#009FE3]/20 min-w-[18px] text-center">
                            {value.length}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[280px] p-0 bg-ds-elevated border border-ds-default shadow-2xl shadow-black/40 rounded-2xl overflow-hidden backdrop-blur-xl"
                align="start"
                sideOffset={8}
            >
                <div className="flex flex-col max-h-[420px]">
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3 border-b border-ds-subtle bg-ds-inset">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold flex items-center gap-1.5 mb-2">
                            <Building2 className="w-3 h-3" />
                            Filtrar por Casa
                        </p>
                        {/* Search */}
                        <div className="flex items-center gap-2 bg-ds-inset border border-ds-subtle rounded-lg px-3 py-2">
                            <Search className="w-3.5 h-3.5 text-gray-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar casa..."
                                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none w-full"
                                autoFocus
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin max-h-[280px]">
                        {/* "Todas" option */}
                        <button
                            onClick={handleSelectAll}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-2.5 ${allSelected
                                ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border border-[#009FE3]/20"
                                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${allSelected
                                ? "border-[#009FE3] bg-[#009FE3]"
                                : "border-gray-600"
                                }`}>
                                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span>Todas as Casas</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-ds-subtle my-1.5" />

                        {filteredCasas.length > 0 ? (
                            filteredCasas.map((casa) => {
                                const checked = isSelected(casa);
                                return (
                                    <button
                                        key={casa}
                                        onClick={() => toggleCasa(casa)}
                                        className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-2.5 ${checked
                                            ? "bg-[#009FE3]/15 text-[#009FE3] font-semibold border border-[#009FE3]/20"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked
                                            ? "border-[#009FE3] bg-[#009FE3]"
                                            : "border-gray-600 hover:border-gray-400"
                                            }`}>
                                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className="truncate">{casa}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-xs">
                                Nenhuma casa encontrada
                            </div>
                        )}
                    </div>

                    {/* Footer — Confirm / Clear */}
                    <div className="px-3 py-2.5 border-t border-ds-subtle bg-ds-inset flex items-center gap-2">
                        {!allSelected && (
                            <button
                                onClick={handleClear}
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
