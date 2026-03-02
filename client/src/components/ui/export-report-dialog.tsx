import { useState, useCallback } from "react";
import { format, startOfMonth } from "date-fns";
import {
    Download, FileSpreadsheet, Loader2, CalendarDays
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";

interface ExportReportDialogProps {
    selectedCasas: string[];
}

export function ExportReportDialog({ selectedCasas }: ExportReportDialogProps) {
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#165A8A]"
                >
                    <Download className="w-3.5 h-3.5" />
                    Exportar
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-[#0b1a2e] border-[#1a3a5c] text-white p-0 gap-0 rounded-2xl overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#1a3a5c]/60 bg-[#081422]">
                    <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-[#009FE3]" />
                        Exportar Relatório
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-400 mt-1">
                        Exporte os dados do dashboard como Excel (.xlsx)
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-5 space-y-5">
                    {/* Date Range Filter */}
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold flex items-center gap-1.5 mb-2">
                            <CalendarDays className="w-3 h-3" />
                            Período do Relatório
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 mb-1 block">Data Início</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-[#061726] border border-[#1a3a5c] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#009FE3] focus:border-[#009FE3] transition-all [color-scheme:dark]"
                                />
                            </div>
                            <span className="text-gray-600 mt-4">→</span>
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 mb-1 block">Data Fim</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-[#061726] border border-[#1a3a5c] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#009FE3] focus:border-[#009FE3] transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-[#061726] rounded-xl p-4 border border-[#1a3a5c]/50">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-green-500/10 text-green-400 shrink-0 mt-0.5">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-200">Exportar dados em Excel (.xlsx)</p>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Exporta todos os atendimentos finalizados no período selecionado com protocolo, contato, canal, datas, resumo e casa.
                                    Arquivo formatado com cabeçalho estilizado e filtros automáticos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#1a3a5c]/60 bg-[#081422]/50 flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Formato: Excel (.xlsx)</span>
                    <button
                        onClick={handleExportXLSX}
                        disabled={exporting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#009FE3] text-white text-sm font-semibold rounded-lg hover:bg-[#0088c7] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[#009FE3]/20 hover:shadow-lg hover:shadow-[#009FE3]/30"
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Exportando...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Exportar Excel
                            </>
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
