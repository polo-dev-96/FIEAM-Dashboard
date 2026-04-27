/*
 * ============================================================
 * components/ui/export-report-dialog.tsx — Diálogo de Exportação de Relatório
 * ============================================================
 *
 * Componente de dialog (modal) para exportar dados do dashboard.
 * Acionado pelo botão "Exportar" na FilterToolbar.
 *
 * Tipos de exportação disponíveis:
 *   1. Excel (.xlsx) → GET /api/export-xlsx (download direto do arquivo)
 *   2. PDF           → usa exportElementToPdf() (html2canvas + jsPDF)
 *
 * Fluxo do diálogo:
 *   1. Botão "Exportar" abre o <Dialog>
 *   2. Usuário pode ajustar o período de data (DatePickerField)
 *   3. Usuário clica "Excel" ou "PDF" para iniciar a exportação
 *   4. Um spinner (Loader2) é exibido enquanto aguarda
 *
 * Props recebidos:
 *   selectedCasas → lista de casas filtradas (para incluir no parâmetro da URL do Excel)
 *   contentRef    → ref para o elemento DOM a capturar no PDF (passado pelo pai)
 *   pdfTitle      → título da página de capa do PDF
 *   pdfSubtitle   → subtítulo da página de capa do PDF
 *   startDate     → data inicial do período (do estado da página pai — fonte única da verdade)
 *   endDate       → data final do período
 *
 * Nota sobre DatePickerField:
 *   Componente interno deste arquivo (não exportado) que renderiza
 *   um campo de data com Popover + DayPicker.
 * ============================================================
 */

// useState/useCallback/useEffect: hooks React de estado, memoização e efeitos
// RefObject: tipo para refs de elementos DOM
import { useState, useCallback, useEffect, type RefObject } from "react";

// date-fns: biblioteca de manipulação de datas
// format → formata uma data (ex: "dd/MM/yyyy")
// addMonths/subMonths → navegação do calendário
import { format, addMonths, subMonths } from "date-fns";

// ptBR: locale português para formatacão de datas (ex: "janeiro 2026" em vez de "January 2026")
import { ptBR } from "date-fns/locale";

// Ícones Lucide para o diálogo
import { Download, FileSpreadsheet, FileText, Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

// Dialog: componente de modal (Radix UI via shadcn)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

// Popover: painel flutuante para o calendário de datas
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// DayPicker: componente de calendário interativo (react-day-picker)
import { DayPicker } from "react-day-picker";

// exportElementToPdf: função de exportação PDF (lib/exportPdf.ts)
import { exportElementToPdf } from "@/lib/exportPdf";

/*
 * DatePickerField — Campo de data com calendário popover
 * -------------------------------------------------------
 * Componente interno (não exportado) usado dentro do diálogo.
 * Renderiza um botão que abre um calendário (DayPicker) para selecionar uma data.
 *
 * value + "T12:00:00": adiciona horário fixo para evitar problemas de
 * fuso horário (sem isso, "2026-01-01" poderia virar "31/12/2025" em UTC-3)
 */
function DatePickerField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    const [open, setOpen] = useState(false);
    const dateValue = new Date(value + "T12:00:00");
    const [month, setMonth] = useState<Date>(new Date(dateValue.getFullYear(), dateValue.getMonth()));

    useEffect(() => {
        const d = new Date(value + "T12:00:00");
        setMonth(new Date(d.getFullYear(), d.getMonth()));
    }, [value]);

    return (
        <div className="flex-1">
            <label className="text-[11px] text-gray-500 mb-1.5 block font-semibold uppercase tracking-wider">{label}</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 hover:border-[#009FE3]/50 hover:bg-white focus:outline-none transition-all cursor-pointer text-left shadow-sm hover:shadow-md">
                        <CalendarDays className="w-4 h-4 text-[#009FE3] shrink-0" />
                        <span className="font-medium">{format(dateValue, "dd/MM/yyyy")}</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-2xl shadow-black/10 rounded-2xl overflow-hidden z-[1100]" align="start" sideOffset={4}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <button onClick={() => setMonth(m => subMonths(m, 1))} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-gray-700 capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</span>
                        <button onClick={() => setMonth(m => addMonths(m, 1))} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-3">
                        <DayPicker
                            mode="single"
                            selected={dateValue}
                            onSelect={(day) => { if (day) { onChange(format(day, "yyyy-MM-dd")); setOpen(false); } }}
                            month={month}
                            onMonthChange={setMonth}
                            locale={ptBR}
                            showOutsideDays
                            hideNavigation
                            classNames={{
                                months: "flex",
                                month: "space-y-1",
                                month_caption: "hidden",
                                month_grid: "w-full border-collapse",
                                weekdays: "flex",
                                weekday: "text-gray-400 rounded-md w-10 h-8 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center",
                                week: "flex w-full",
                                day: "h-10 w-10 text-center text-sm p-0.5 relative",
                                day_button: "h-9 w-9 p-0 font-normal text-gray-700 hover:bg-[#009FE3]/10 hover:text-[#009FE3] rounded-lg inline-flex items-center justify-center transition-all cursor-pointer",
                                selected: "!bg-[#009FE3] !text-white hover:!bg-[#0088c7] font-semibold rounded-lg shadow-md shadow-[#009FE3]/20",
                                today: "bg-gray-100 text-gray-900 font-bold ring-1 ring-[#009FE3]/20 rounded-lg",
                                outside: "text-gray-300",
                                disabled: "text-gray-200 cursor-not-allowed",
                                hidden: "invisible",
                            }}
                        />
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/30 flex justify-end">
                        <button onClick={() => { onChange(format(new Date(), "yyyy-MM-dd")); setOpen(false); }} className="text-xs text-[#009FE3] hover:text-[#0088c7] font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-[#009FE3]/5">
                            Hoje
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

/*
 * ExportReportDialogProps — Props do componente
 */
interface ExportReportDialogProps {
    selectedCasas: string[];                        // casas selecionadas no filtro (para Excel)
    contentRef?: RefObject<HTMLDivElement | null>;  // ref do elemento DOM para PDF
    pdfTitle?: string;                              // título da capa do PDF
    pdfSubtitle?: string;                           // subtítulo (entidade/unidade selecionada)
    startDate: string;                              // data inicial (YYYY-MM-DD) da página pai
    endDate: string;                                // data final (YYYY-MM-DD) da página pai
}



export function ExportReportDialog({ selectedCasas, contentRef, pdfTitle = "Relatório FIEAM", pdfSubtitle, startDate, endDate }: ExportReportDialogProps) {
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    
    // Estado local para o período do DateRangePicker
    const [periodo, setPeriodo] = useState({ startDate, endDate });
    
    // Sincroniza o período quando as props mudam
    useEffect(() => {
        setPeriodo({ startDate, endDate });
    }, [startDate, endDate]);



    /*
     * handleExportXLSX — Exporta os dados como planilha Excel
     * -------------------------------------------------------
     * 1. Monta a URL de download com os parâmetros de filtro
     * 2. Faz fetch da rota GET /api/export-xlsx
     * 3. Recebe a resposta como Blob (arquivo binário)
     * 4. Cria uma URL temporária com URL.createObjectURL(blob)
     * 5. Cria um <a> invisível com href e download, dispara o clique
     * 6. Remove o elemento e libera a URL temporária da memória
     */
    const handleExportXLSX = useCallback(async () => {
        setExporting(true); // ativa o spinner
        try {
            // Monta os parâmetros de casa: ?casa=X&casa=Y (URL-encoded)
            const casaParam = selectedCasas.length > 0
                ? selectedCasas.map((c) => `&casa=${encodeURIComponent(c)}`).join("")
                : "";
            const url = `/api/export-xlsx?startDate=${periodo.startDate}&endDate=${periodo.endDate}${casaParam}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Erro ao exportar XLSX");

            // Converte resposta para Blob e cria link de download programático
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob); // cria URL temporária
            const a = document.createElement("a");          // cria <a> invisível
            a.href = downloadUrl;
            a.download = `relatorio_${periodo.startDate}_${periodo.endDate}.xlsx`;
            document.body.appendChild(a);
            a.click(); // dispara o download
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl); // libera memória
        } catch (err) {
            console.error("Erro ao exportar XLSX:", err);
            alert("Erro ao exportar XLSX. Tente novamente.");
        } finally {
            setExporting(false);
        }
    }, [periodo.startDate, periodo.endDate, selectedCasas]);



    /*
     * handleExportPDF — Exporta o dashboard como PDF
     * -------------------------------------------------------
     * Usa exportElementToPdf() (lib/exportPdf.ts) que por sua vez usa
     * html2canvas (captura o DOM como imagem) e jsPDF (cria o PDF).
     *
     * contentRef.current é o elemento DOM que será capturado.
     * Passado pelo componente pai (Overview, DashboardAnual) via prop.
     */
    const handleExportPDF = useCallback(async () => {
        if (!contentRef?.current) return; // só exporta se o ref estiver válido
        setExportingPdf(true);
        try {
            const filename = `relatorio_${periodo.startDate}_${periodo.endDate}`;
            // fmtDate: formata "YYYY-MM-DD" como "dd/MM/yyyy" para exibir no PDF
            const fmtDate = (d: string) => {
                try { return format(new Date(d + "T12:00:00"), "dd/MM/yyyy"); } catch { return d; }
            };
            const periodStr = `Período: ${fmtDate(periodo.startDate)} a ${fmtDate(periodo.endDate)}`;
            // Chama a função de exportação em exportPdf.ts com título e período
            await exportElementToPdf(contentRef.current, filename, pdfTitle, {
                period: periodStr,
                subtitle: pdfSubtitle || "Todas as Entidades",
            });
        } catch (err) {
            console.error("Erro ao exportar PDF:", err);
            alert("Erro ao exportar PDF. Tente novamente.");
        } finally {
            setExportingPdf(false);
        }
    }, [contentRef, periodo.startDate, periodo.endDate, pdfTitle, pdfSubtitle, selectedCasas]);



    return (

        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>

                <button

                    className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-ds-elevated border border-ds-default rounded-2xl text-ds-primary hover:border-ds-strong hover:bg-[var(--ds-accent-muted)] transition-all duration-300 min-w-[100px] shadow-sm hover:shadow-md"

                >

                    <Download className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />

                    <span className="font-medium">Exportar</span>

                </button>

            </DialogTrigger>

            <DialogContent className="sm:max-w-[540px] bg-ds-elevated border-ds-default text-ds-primary p-0 gap-0 rounded-3xl overflow-hidden shadow-2xl z-[1000]">

                <DialogHeader className="px-6 pt-6 pb-5 border-b border-ds-subtle bg-ds-elevated">

                    <DialogTitle className="text-xl font-extrabold text-ds-primary flex items-center gap-2">

                        <Download className="w-5 h-5 text-[#009FE3]" />

                        Exportar Relatório

                    </DialogTitle>

                    <DialogDescription className="text-sm text-ds-tertiary mt-1">

                        Escolha o período e formato para exportar os dados

                    </DialogDescription>

                </DialogHeader>



                <div className="px-6 py-5 space-y-6 bg-ds-elevated">

                    {/* Date Range Filter - Enhanced styling */}

                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-ds-tertiary font-extrabold flex items-center gap-1.5 mb-3">
                            <CalendarDays className="w-3 h-3" />
                            PERÍODO DO RELATÓRIO
                        </label>
                        
                        <div className="flex items-center gap-3">
                            <DatePickerField
                                value={periodo.startDate}
                                onChange={(v) => setPeriodo(prev => ({ ...prev, startDate: v }))}
                                label="Data Início"
                            />
                            <div className="flex items-center justify-center mt-6">
                                <span className="text-gray-400 text-lg font-light">→</span>
                            </div>
                            <DatePickerField
                                value={periodo.endDate}
                                onChange={(v) => setPeriodo(prev => ({ ...prev, endDate: v }))}
                                label="Data Fim"
                            />
                        </div>
                    </div>



                    {/* Export Options - Enhanced cards */}

                    <div className="space-y-3">

                        {/* Excel option */}

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:bg-gray-50">

                            <div className="flex items-start gap-4">

                                <div className="p-3 rounded-xl bg-green-500/10 text-green-400 shrink-0">

                                    <FileSpreadsheet className="w-6 h-6" />

                                </div>

                                <div className="flex-1 min-w-0">

                                    <p className="text-base font-semibold text-gray-900 mb-2">Excel (.xlsx)</p>

                                    <p className="text-sm text-gray-600 leading-relaxed">

                                        Exporta todos os atendimentos finalizados com protocolo, contato, canal, datas, resumo e casa.

                                    </p>

                                </div>

                                <button

                                    onClick={handleExportXLSX}

                                    disabled={exporting}

                                    className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-green-600/20 hover:shadow-green-600/30"

                                >

                                    {exporting ? (

                                        <Loader2 className="w-4 h-4 animate-spin" />

                                    ) : (

                                        <Download className="w-4 h-4" />

                                    )}

                                    {exporting ? "Exportando..." : "Download Excel"}

                                </button>

                            </div>

                        </div>



                        {/* PDF option */}

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:bg-gray-50">

                            <div className="flex items-start gap-4">

                                <div className="p-3 rounded-xl bg-red-500/10 text-red-400 shrink-0">

                                    <FileText className="w-6 h-6" />

                                </div>

                                <div className="flex-1 min-w-0">

                                    <p className="text-base font-semibold text-gray-900 mb-2">PDF (.pdf)</p>

                                    <p className="text-sm text-gray-600 leading-relaxed">

                                        Captura visual dos gráficos e relatórios da página atual em formato PDF.

                                    </p>

                                </div>

                                <button

                                    onClick={handleExportPDF}

                                    disabled={exportingPdf || !contentRef?.current}

                                    className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-red-600/20 hover:shadow-red-600/30"

                                >

                                    {exportingPdf ? (

                                        <Loader2 className="w-4 h-4 animate-spin" />

                                    ) : (

                                        <Download className="w-4 h-4" />

                                    )}

                                    {exportingPdf ? "Gerando..." : "Download PDF"}

                                </button>

                            </div>

                        </div>

                    </div>

                </div>



                {/* Footer */}

                <div className="px-6 py-4 border-t border-gray-200 bg-white">

                    <span className="text-[11px] text-gray-500 flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-green-500"></span>

                        <span className="w-2 h-2 rounded-full bg-red-500"></span>

                        Formatos disponíveis: Excel (.xlsx) e PDF (.pdf)

                    </span>

                </div>

            </DialogContent>

        </Dialog>

    );

}

