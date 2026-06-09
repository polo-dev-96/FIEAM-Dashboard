/*
 * ============================================================
 * pdfReport.ts — Modelo declarativo de relatório PDF
 * ============================================================
 *
 * Define a "forma" dos dados que cada dashboard envia para o
 * renderizador nativo (exportReportToPdf em exportPdf.ts).
 *
 * Em vez de tirar foto da tela (html2canvas), cada página monta
 * um array de seções tipadas a partir dos dados já calculados.
 * O renderizador desenha tudo com primitivas vetoriais do jsPDF:
 * texto nítido, tabelas perfeitamente alinhadas e gráficos limpos.
 * ============================================================
 */

/** Cor em hexadecimal (ex.: "#009FE3"). */
export type PdfHexColor = string;

/** Cartão de indicador (KPI) exibido em linha. */
export interface PdfKpi {
  label: string;
  value: string;
  sub?: string;
  accent?: PdfHexColor;
}

/** Coluna de tabela. */
export interface PdfTableColumn {
  header: string;
  align?: "left" | "right";
  /** Peso relativo de largura (opcional). */
  width?: number;
}

/** Barra horizontal (estilo progresso). */
export interface PdfBar {
  label: string;
  value: number;
  valueText: string;
  /** Percentual 0–100. Se omitido, é calculado a partir do maior valor. */
  percent?: number;
  color: PdfHexColor;
}

/** Série de um gráfico de linhas. */
export interface PdfLineSeries {
  name: string;
  color: PdfHexColor;
  points: number[];
}

/* ─── União discriminada de seções ─────────────────────────── */

export interface PdfSectionKpis {
  kind: "kpis";
  title: string;
  items: PdfKpi[];
}

export interface PdfSectionTable {
  kind: "table";
  title: string;
  subtitle?: string;
  columns: PdfTableColumn[];
  rows: string[][];
  totalsRow?: string[];
}

export interface PdfSectionHBars {
  kind: "hbars";
  title: string;
  subtitle?: string;
  bars: PdfBar[];
  /** Mostra o percentual ao lado do valor. */
  showPercent?: boolean;
}

export interface PdfSectionLine {
  kind: "line";
  title: string;
  subtitle?: string;
  categories: string[];
  series: PdfLineSeries[];
}

export interface PdfSectionArea {
  kind: "area";
  title: string;
  subtitle?: string;
  categories: string[];
  values: number[];
  color?: PdfHexColor;
  /** Formata os rótulos de valor/eixo (ex.: moeda). */
  valueFmt?: (n: number) => string;
}

export interface PdfSectionDonutPair {
  kind: "donutPair";
  title: string;
  subtitle?: string;
  bars: PdfBar[];
  centerValue: string;
  centerLabel: string;
}

export type PdfSection =
  | PdfSectionKpis
  | PdfSectionTable
  | PdfSectionHBars
  | PdfSectionLine
  | PdfSectionArea
  | PdfSectionDonutPair;

export interface PdfReport {
  sections: PdfSection[];
}
