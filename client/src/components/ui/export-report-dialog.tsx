import { useState, useCallback, useEffect, type RefObject } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileSpreadsheet, FileText, Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { exportElementToPdf } from "@/lib/exportPdf";

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

interface ExportReportDialogProps {
    selectedCasas: string[];
    contentRef?: RefObject<HTMLDivElement | null>;
    pdfTitle?: string;
    pdfSubtitle?: string;
    startDate: string;
    endDate: string;
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



    const handleExportXLSX = useCallback(async () => {
        setExporting(true);
        try {
            const casaParam = selectedCasas.length > 0
                ? selectedCasas.map((c) => `&casa=${encodeURIComponent(c)}`).join("")
                : "";
            const url = `/api/export-xlsx?startDate=${periodo.startDate}&endDate=${periodo.endDate}${casaParam}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Erro ao exportar XLSX");

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `relatorio_${periodo.startDate}_${periodo.endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error("Erro ao exportar XLSX:", err);
            alert("Erro ao exportar XLSX. Tente novamente.");
        } finally {
            setExporting(false);
        }
    }, [periodo.startDate, periodo.endDate, selectedCasas]);



    const handleExportPDF = useCallback(async () => {
        if (!contentRef?.current) return;
        setExportingPdf(true);
        try {
            const filename = `relatorio_${periodo.startDate}_${periodo.endDate}`;
            const fmtDate = (d: string) => {
                try { return format(new Date(d + "T12:00:00"), "dd/MM/yyyy"); } catch { return d; }
            };
            const periodStr = `Período: ${fmtDate(periodo.startDate)} a ${fmtDate(periodo.endDate)}`;
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

                    className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-white border border-gray-300 rounded-xl text-gray-700 hover:border-[#009FE3]/40 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300 min-w-[100px] shadow-sm hover:shadow-md"

                >

                    <Download className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />

                    <span className="font-medium">Exportar</span>

                </button>

            </DialogTrigger>

            <DialogContent className="sm:max-w-[520px] bg-white border-gray-200 text-gray-900 p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/10 z-[1000]">

                <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-200 bg-white">

                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">

                        <Download className="w-5 h-5 text-[#009FE3]" />

                        Exportar Relatório

                    </DialogTitle>

                    <DialogDescription className="text-sm text-gray-600 mt-1">

                        Escolha o período e formato para exportar os dados

                    </DialogDescription>

                </DialogHeader>



                <div className="px-6 py-5 space-y-6 bg-white">

                    {/* Date Range Filter - Enhanced styling */}

                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-gray-600 font-bold flex items-center gap-1.5 mb-3">
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

