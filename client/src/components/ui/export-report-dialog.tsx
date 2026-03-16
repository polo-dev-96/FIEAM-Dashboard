import { useState, useCallback, type RefObject } from "react";
import { format } from "date-fns";
import {
    Download, FileSpreadsheet, FileText, Loader2, CalendarDays
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { exportElementToPdf } from "@/lib/exportPdf";

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

    const handleExportXLSX = useCallback(async () => {
        setExporting(true);
        try {
            const casaParam = selectedCasas.length > 0
                ? selectedCasas.map((c) => `&casa=${encodeURIComponent(c)}`).join("")
                : "";
            const url = `/api/export-xlsx?startDate=${startDate}&endDate=${endDate}${casaParam}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Erro ao exportar XLSX");

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `relatorio_${startDate}_${endDate}.xlsx`;
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
    }, [startDate, endDate, selectedCasas]);

    const handleExportPDF = useCallback(async () => {
        if (!contentRef?.current) return;
        setExportingPdf(true);
        try {
            const filename = `relatorio_${startDate}_${endDate}`;
            const fmtDate = (d: string) => {
                try { return format(new Date(d + "T12:00:00"), "dd/MM/yyyy"); } catch { return d; }
            };
            const periodStr = `Período: ${fmtDate(startDate)} a ${fmtDate(endDate)}`;
            const casasLabel = selectedCasas.length > 0
                ? `Casas: ${selectedCasas.join(", ")}`
                : "Todas as casas";
            await exportElementToPdf(contentRef.current, filename, pdfTitle, {
                period: periodStr,
                subtitle: pdfSubtitle ? `${pdfSubtitle}  ·  ${casasLabel}` : casasLabel,
            });
        } catch (err) {
            console.error("Erro ao exportar PDF:", err);
            alert("Erro ao exportar PDF. Tente novamente.");
        } finally {
            setExportingPdf(false);
        }
    }, [contentRef, startDate, endDate, pdfTitle, pdfSubtitle, selectedCasas]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="group flex items-center gap-2.5 px-4 py-2.5 text-xs bg-[#060e1a]/80 border border-[#1a3a5c]/80 rounded-xl text-gray-300 hover:border-[#009FE3]/40 hover:bg-[#0a1929] hover:text-white transition-all duration-300 min-w-[100px] backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-[#009FE3]/5"
                >
                    <Download className="w-4 h-4 text-[#009FE3] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Exportar</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-[#0b1a2e] border-[#1a3a5c]/80 text-white p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl">
                <DialogHeader className="px-6 pt-6 pb-5 border-b border-[#1a3a5c]/60 bg-[#081422]">
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-[#009FE3]" />
                        Exportar Relatório
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-400 mt-1">
                        Escolha o período e formato para exportar os dados
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-5 space-y-6">
                    {/* Date Range Filter - Enhanced styling */}
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold flex items-center gap-1.5 mb-3">
                            <CalendarDays className="w-3 h-3" />
                            PERÍODO DO RELATÓRIO
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium">Data Início</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    readOnly
                                    className="w-full bg-[#061726] border border-[#1a3a5c]/60 rounded-xl px-4 py-3 text-sm text-gray-200 transition-all duration-200 [color-scheme:dark]"
                                />
                            </div>
                            <div className="flex items-center justify-center mt-6">
                                <span className="text-gray-600 text-lg font-light">→</span>
                            </div>
                            <div className="flex-1">
                                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium">Data Fim</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    readOnly
                                    className="w-full bg-[#061726] border border-[#1a3a5c]/60 rounded-xl px-4 py-3 text-sm text-gray-200 transition-all duration-200 [color-scheme:dark]"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            O período é sincronizado automaticamente com os filtros da tela.
                        </p>
                    </div>

                    {/* Export Options - Enhanced cards */}
                    <div className="space-y-3">
                        {/* Excel option */}
                        <div className="bg-[#061726]/50 rounded-2xl p-5 border border-[#1a3a5c]/40 hover:border-[#1a3a5c]/60 transition-all duration-200 hover:bg-[#061726]/70">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-green-500/10 text-green-400 shrink-0">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-gray-100 mb-2">Excel (.xlsx)</p>
                                    <p className="text-sm text-gray-400 leading-relaxed">
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
                        <div className="bg-[#061726]/50 rounded-2xl p-5 border border-[#1a3a5c]/40 hover:border-[#1a3a5c]/60 transition-all duration-200 hover:bg-[#061726]/70">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-400 shrink-0">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-gray-100 mb-2">PDF (.pdf)</p>
                                    <p className="text-sm text-gray-400 leading-relaxed">
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
                <div className="px-6 py-4 border-t border-[#1a3a5c]/60 bg-[#081422]/50">
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
