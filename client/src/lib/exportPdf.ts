/*
 * ============================================================
 * exportPdf.ts — Exportação de telas do dashboard para PDF
 * ============================================================
 *
 * Este arquivo é responsável por gerar arquivos PDF profissionais
 * a partir das telas do dashboard.
 *
 * Como funciona o processo de exportação:
 *   1. Força o tema CLARO na tela (para o PDF ter fundo branco)
 *   2. Captura cada seção da tela como imagem usando html2canvas
 *   3. Restaura o tema original do usuário
 *   4. Cria um documento PDF A4 Paisagem usando jsPDF
 *   5. Adiciona uma página de capa com logos e informações
 *   6. Distribui as imagens capturadas nas páginas do PDF
 *   7. Faz o download automático do arquivo .pdf
 *
 * Bibliotecas usadas:
 *   html2canvas → "tira uma foto" de elementos HTML como imagem canvas
 *   jsPDF       → cria e manipula documentos PDF programaticamente
 *
 * Desafio do tema escuro:
 *   O dashboard usa cores escuras (dark mode), mas PDFs precisam
 *   de fundo branco. Por isso existe a lógica forceLightInlineStyles()
 *   que detecta e troca temporariamente as cores escuras por claras
 *   antes de capturar a tela.
 * ============================================================
 */

// html2canvas e jsPDF são carregados dinamicamente dentro de exportElementToPdf()
// para evitar inicialização antecipada — o jsPDF emite document.write() ao
// carregar fontes na inicialização estática, gerando avisos no console do browser.

import type {
  PdfReport,
  PdfSection,
  PdfKpi,
  PdfTableColumn,
  PdfBar,
  PdfLineSeries,
} from "./pdfReport";

/*
 * ─── Constantes do tamanho da página A4 Paisagem (em milímetros) ───
 *
 * PW = 297mm → largura total do A4 paisagem
 * PH = 210mm → altura total do A4 paisagem
 * MX = 15mm  → margem horizontal (esquerda e direita)
 * MY = 12mm  → margem vertical (topo e fundo)
 */
// ─── A4 Landscape Constants (mm) ────────────────────────────────────
const PW = 297; // Page Width  (largura)
const PH = 210; // Page Height (altura)
const MX = 15;  // Margin X    (margem horizontal)
const MY = 12;  // Margin Y    (margem vertical)

/*
 * ─── Paleta de Cores Profissional do PDF ───────────────────────────
 * Cores definidas como arrays [R, G, B] (0-255), formato que o jsPDF usa.
 * "as const" é TypeScript dizendo que esses arrays são imutáveis (tuplas).
 */
// ─── Professional Color Palette ─────────────────────────────────────
const NAVY       = [12, 33, 53]     as const; // azul-escuro principal   (#0C2135)
const NAVY_L     = [20, 45, 70]     as const; // azul-escuro mais claro
const ACCENT     = [0, 159, 227]    as const; // ciano FIEAM             (#009FE3)
const ACCENT_D   = [0, 120, 180]    as const; // ciano mais escuro
const TEXT_DARK  = [30, 41, 59]     as const; // texto escuro legível    (#1e293b)
const TEXT_MID   = [100, 116, 139]  as const; // texto médio (subtítulos) (#64748b)
const TEXT_LIGHT = [148, 163, 184]  as const; // texto claro (rodapés)   (#94a3b8)
const BORDER     = [226, 232, 240]  as const; // cor de borda suave      (#e2e8f0)
const BG_PAGE    = [245, 247, 250]  as const; // fundo cinza claro       (#f5f7fa)
const WHITE      = [255, 255, 255]  as const; // branco puro

// Tipo usado apenas nas assinaturas. A biblioteca continua sendo carregada dinamicamente.
type JsPDFInstance = import("jspdf").jsPDF;

/*
 * Dimensões calculadas da área de conteúdo (em mm)
 * -------------------------------------------------------
 * USABLE_W   → largura disponível (total - 2 margens): 297 - 30 = 267mm
 * HEADER_H   → altura do cabeçalho azul no topo de cada página: 13mm
 * FOOTER_H   → altura do rodapé no fundo de cada página: 10mm
 * CONTENT_TOP → Y onde o conteúdo começa (abaixo do header): MY + HEADER_H + 7
 * CONTENT_BOT → Y onde o conteúdo termina (acima do footer)
 * GAP         → espaço entre elementos na página: 5mm
 */
const USABLE_W    = PW - MX * 2;              // 267mm de largura útil
const HEADER_H    = 13;                        // altura do header
const FOOTER_H    = 10;                        // altura do footer
const CONTENT_TOP = MY + HEADER_H + 7;         // onde começa o conteúdo
const CONTENT_BOT = PH - MY - FOOTER_H - 3;   // onde termina o conteúdo
const GAP = 5;                                 // espaço entre blocos (mm)

/*
 * timestamp() — Gera uma string com a data e hora atual formatadas
 * -------------------------------------------------------
 * Exemplo de saída: "Gerado em 27 de abril de 2026 às 14:32"
 * Usado no rodapé e na capa do PDF.
 */
// ─── Helper: formatted timestamp ────────────────────────────────────
function timestamp() {
  const now = new Date();
  const d = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const t = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Gerado em ${d} às ${t}`;
}

/*
 * loadImageAsDataUrl(src) — Carrega uma imagem e converte para base64
 * -------------------------------------------------------
 * O jsPDF precisa de imagens no formato base64 (data URL) para inserir no PDF.
 * Esta função:
 *   1. Cria um elemento <img> e carrega a imagem da URL dada
 *   2. Desenha a imagem em um <canvas> temporário
 *   3. Converte o canvas para string base64 (data:image/png;base64,...)
 *
 * Retorna null se a imagem não puder ser carregada (ex: arquivo não encontrado).
 * Usado para carregar os logos FIEAM, SESI, SENAI e IEL da capa.
 */
// ─── Helper: load image as base64 data URL ──────────────────────────
async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/*
 * loadImage(src) — Igual a loadImageAsDataUrl, mas também retorna as
 * dimensões naturais (w, h). Necessário para alinhar os logos da capa
 * preservando a proporção real de cada arquivo.
 */
async function loadImage(src: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
  } catch {
    return null;
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * drawCoverPage(pdf, title, opts?) — Desenha a página de capa do PDF
 * ═══════════════════════════════════════════════════════════════════════
 * Cria a primeira página do PDF com design corporativo escuro:
 *   - Fundo azul-escuro (NAVY) com linhas sutis de textura
 *   - Barra ciano no topo
 *   - Logos das 4 instituições (FIEAM, SESI, SENAI, IEL)
 *   - Título, período e subtítulo em destaque
 *   - Timestamp de geração
 *   - Rodapé com branding e marcação confidencial
 *
 * Parâmetros:
 *   pdf    → instância do documento jsPDF onde desenhar
 *   title  → título principal (ex: "Visão Geral - Atendimentos")
 *   opts   → opções opcionais: subtitle (subtítulo) e period (período de datas)
 */
// ═══════════════════════════════════════════════════════════════════════
//  COVER PAGE — elegant, dark, corporate with logos
// ═══════════════════════════════════════════════════════════════════════
async function drawCoverPage(
  pdf: JsPDFInstance,
  title: string,
  opts?: { subtitle?: string; period?: string }
) {
  // ── Full dark background
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PW, PH, "F");

  // ── Top accent stripe (thin cyan)
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 0, PW, 2.5, "F");

  // ── Subtle horizontal lines for texture (very discrete)
  pdf.setDrawColor(18, 42, 65);
  pdf.setLineWidth(0.1);
  for (let y = 20; y < PH - 40; y += 12) {
    pdf.line(MX, y, PW - MX, y);
  }

  // ── Left accent bar alongside title block
  pdf.setFillColor(...ACCENT);
  pdf.roundedRect(MX + 8, 55, 3, 60, 1.5, 1.5, "F");

  // ── Title — dynamic font size to prevent overflow with long titles
  pdf.setFont("helvetica", "bold");
  const titleFontSize = title.length > 50 ? 18 : title.length > 35 ? 22 : 28;
  pdf.setFontSize(titleFontSize);
  pdf.setTextColor(...WHITE);
  const titleLines = pdf.splitTextToSize(title, PW * 0.52);
  pdf.text(titleLines, MX + 18, 75);

  // ── Period
  if (opts?.period) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(...ACCENT);
    pdf.text(opts.period, MX + 18, 93);
  }

  // ── Subtitle
  if (opts?.subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(140, 160, 185);
    pdf.text(opts.subtitle, MX + 18, 105);
  }

  // ── Timestamp
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 120, 145);
  pdf.text(timestamp(), MX + 18, 115);

  // ── Logos — 4 institution logos aligned on a common baseline
  const loaded = await Promise.all([
    loadImage("/anexo/FIEAM-removebg-preview.png"),
    loadImage("/anexo/SESI-removebg-preview.png"),
    loadImage("/anexo/SENAI-removebg-preview.png"),
    loadImage("/anexo/IEL-removebg-preview.png"),
  ]);

  // Normalise every logo to the SAME height and center them on a shared
  // midline. Equal height + same midline guarantees the tops line up,
  // regardless of each PNG's intrinsic aspect ratio.
  const logos = loaded.filter(Boolean) as { dataUrl: string; w: number; h: number }[];
  if (logos.length > 0) {
    const targetH = 13;          // common visual height (mm)
    const bandTop = 9;           // top of the logo band (mm)
    const logoGap = 16;          // gap between logos (mm)
    const maxRowW = PW - 44;     // keep margins on both sides

    // Width derived from each logo's real aspect ratio at the common height.
    const widths = logos.map((l) => targetH * (l.w / l.h));
    let rowW = widths.reduce((a, w) => a + w, 0) + logoGap * (logos.length - 1);
    const scale = rowW > maxRowW ? maxRowW / rowW : 1;
    rowW *= scale;

    const midline = bandTop + (targetH * scale) / 2;
    let x = (PW - rowW) / 2;
    logos.forEach((l, i) => {
      const w = widths[i] * scale;
      const h = targetH * scale;
      pdf.addImage(l.dataUrl, "PNG", x, midline - h / 2, w, h);
      x += w + logoGap * scale;
    });
  }

  // ── Bottom accent line
  pdf.setFillColor(...ACCENT_D);
  pdf.rect(0, PH - 32, PW, 0.6, "F");

  // ── Footer branding
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(160, 175, 195);
  pdf.text("FIEAM · SESI · SENAI · IEL", MX + 8, PH - 19);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(110, 125, 145);
  pdf.text("Polo Telecom  —  Dashboard de Atendimentos", MX + 8, PH - 13);

  // ── Confidential tag
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.setTextColor(90, 105, 125);
  pdf.text("Documento confidencial · Uso interno", PW - MX - 8, PH - 13, { align: "right" });
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * drawPageChrome(pdf, title, pageNum, totalPages) — Desenha o layout base de cada página
 * ═══════════════════════════════════════════════════════════════════════
 * Aplicado em todas as páginas de conteúdo (não na capa).
 * Desenha:
 *   - Fundo cinza claro (BG_PAGE)
 *   - Barra ciano no topo (accent)
 *   - Header azul-escuro com título e número de página
 *   - Linha separadora e rodapé com branding + timestamp + numeração
 *
 * Parâmetros:
 *   pdf        → instância do jsPDF
 *   title      → título exibido no header (ex: "Visão Geral")
 *   pageNum    → número da página atual (para exibir "Página 2 de 5")
 *   totalPages → total de páginas do documento
 */
// ═══════════════════════════════════════════════════════════════════════
//  CONTENT PAGE CHROME — header, footer, background
// ═══════════════════════════════════════════════════════════════════════
function drawPageChrome(pdf: JsPDFInstance, title: string, pageNum: number, totalPages: number) {
  // ── Page background
  pdf.setFillColor(...BG_PAGE);
  pdf.rect(0, 0, PW, PH, "F");

  // ── Top accent bar
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 0, PW, 1.8, "F");

  // ── Header bar
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(MX, MY, USABLE_W, HEADER_H, 2, 2, "F");

  // Accent tag in header
  pdf.setFillColor(...ACCENT);
  pdf.rect(MX, MY, 3, HEADER_H, "F");

  // Header title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...WHITE);
  pdf.text(title, MX + 9, MY + 8.5);

  // Header right info
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(160, 178, 200);
  pdf.text(`Página ${pageNum} de ${totalPages}`, MX + USABLE_W - 5, MY + 8.5, { align: "right" });

  // ── Footer
  const fy = PH - MY;

  // Thin separator
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(MX, fy - FOOTER_H, MX + USABLE_W, fy - FOOTER_H);

  // Left branding
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...TEXT_MID);
  pdf.text("FIEAM · SESI · SENAI · IEL  ·  Polo Telecom", MX, fy - 3.5);

  // Center timestamp
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(...TEXT_LIGHT);
  pdf.text(timestamp(), PW / 2, fy - 3.5, { align: "center" });

  // Right page number
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MID);
  pdf.text(`${pageNum}`, MX + USABLE_W, fy - 3.5, { align: "right" });
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  NATIVE REPORT RENDERING — desenho vetorial (sem html2canvas)
 * ═══════════════════════════════════════════════════════════════════════
 * Cada seção do PdfReport é desenhada com primitivas do jsPDF, produzindo
 * texto nítido/selecionável, tabelas alinhadas e gráficos limpos.
 */

type RGB = [number, number, number];

// Layout interno das "cartas" de seção (mm)
const CARD_HEADER_H = 15;   // faixa do título dentro da carta
const CARD_PAD_X = 7;       // recuo horizontal do conteúdo
const CARD_PAD_BOTTOM = 7;  // recuo inferior do conteúdo
const PAGE_CONTENT_H = CONTENT_BOT - CONTENT_TOP; // altura útil por página
const HB_ROW = 12.5;        // altura de cada barra horizontal
const T_HEADER = 8.5;       // altura do cabeçalho da tabela
const T_ROW = 7.4;          // altura de cada linha da tabela

/** Converte hex → [r,g,b], com fallback ciano FIEAM. */
function pdfColor(hex?: string): RGB {
  const p = hex ? parseColor(hex) : null;
  return (p ?? [0, 159, 227]) as RGB;
}

/** Arredonda um valor para um "teto bonito" (1, 2, 2.5, 5, 10 × 10ⁿ). */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  let nice: number;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 2.5) nice = 2.5;
  else if (f <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

/** Formata números de eixo de forma compacta (1.2k, 3M). */
function fmtCompact(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1) + "k";
  return String(v);
}

/** Trunca o texto com reticências para caber em maxW (mm), na fonte atual. */
function truncateToWidth(pdf: JsPDFInstance, text: string, maxW: number): string {
  if (pdf.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && pdf.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Carta branca arredondada com sombra suave, faixa accent e título. */
function drawSectionCard(pdf: JsPDFInstance, x: number, y: number, w: number, h: number, title: string) {
  pdf.setFillColor(219, 223, 229);
  pdf.roundedRect(x + 0.7, y + 0.9, w, h, 2.6, 2.6, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, w, h, 2.6, 2.6, "F");
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, w, h, 2.6, 2.6, "S");
  pdf.setFillColor(...ACCENT);
  pdf.roundedRect(x + 6, y + 5.4, 1.8, 7.2, 0.9, 0.9, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11.5);
  pdf.setTextColor(...NAVY);
  pdf.text(truncateToWidth(pdf, title, w - 18), x + 11, y + 10.6);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(x + 6, y + CARD_HEADER_H - 1.5, x + w - 6, y + CARD_HEADER_H - 1.5);
}

function drawKpisContent(pdf: JsPDFInstance, cx: number, cy: number, cw: number, items: PdfKpi[]) {
  const perRow = Math.min(items.length, 4) || 1;
  const gap = 5;
  const cardW = (cw - (perRow - 1) * gap) / perRow;
  const cardH = 24;
  items.forEach((k, i) => {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const x = cx + c * (cardW + gap);
    const y = cy + r * (cardH + gap);
    pdf.setFillColor(247, 249, 251);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "S");
    const acc = pdfColor(k.accent);
    pdf.setFillColor(acc[0], acc[1], acc[2]);
    pdf.rect(x, y + 1.5, 1.6, cardH - 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(truncateToWidth(pdf, k.label.toUpperCase(), cardW - 8), x + 5, y + 6.6);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...NAVY);
    pdf.text(truncateToWidth(pdf, k.value, cardW - 8), x + 5, y + 15);
    if (k.sub) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_LIGHT);
      pdf.text(truncateToWidth(pdf, k.sub, cardW - 8), x + 5, y + 20.5);
    }
  });
}

function drawTableContent(
  pdf: JsPDFInstance,
  cx: number,
  cy: number,
  cw: number,
  columns: PdfTableColumn[],
  rows: string[][],
  totalsRow?: string[]
) {
  const weights = columns.map((c) => c.width ?? (c.align === "right" ? 1 : 2));
  const tw = weights.reduce((a, b) => a + b, 0) || 1;
  const colW = weights.map((w) => (cw * w) / tw);
  const colX: number[] = [];
  let ax = cx;
  for (const w of colW) { colX.push(ax); ax += w; }
  const pad = 2.5;

  pdf.setFillColor(...NAVY);
  pdf.roundedRect(cx, cy, cw, T_HEADER, 1.2, 1.2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.8);
  pdf.setTextColor(255, 255, 255);
  columns.forEach((c, i) => {
    if (c.align === "right") pdf.text(c.header, colX[i] + colW[i] - pad, cy + 5.7, { align: "right" });
    else pdf.text(truncateToWidth(pdf, c.header, colW[i] - pad * 2), colX[i] + pad, cy + 5.7);
  });

  let yy = cy + T_HEADER;
  rows.forEach((row, ri) => {
    if (ri % 2 === 1) {
      pdf.setFillColor(244, 247, 250);
      pdf.rect(cx, yy, cw, T_ROW, "F");
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_DARK);
    columns.forEach((c, ci) => {
      const txt = row[ci] ?? "";
      if (c.align === "right") pdf.text(txt, colX[ci] + colW[ci] - pad, yy + 5, { align: "right" });
      else pdf.text(truncateToWidth(pdf, txt, colW[ci] - pad * 2), colX[ci] + pad, yy + 5);
    });
    yy += T_ROW;
  });

  if (totalsRow) {
    pdf.setDrawColor(...ACCENT);
    pdf.setLineWidth(0.4);
    pdf.line(cx, yy + 0.2, cx + cw, yy + 0.2);
    pdf.setFillColor(235, 243, 249);
    pdf.rect(cx, yy + 0.4, cw, T_ROW + 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...NAVY);
    columns.forEach((c, ci) => {
      const txt = totalsRow[ci] ?? "";
      if (c.align === "right") pdf.text(txt, colX[ci] + colW[ci] - pad, yy + 5.6, { align: "right" });
      else pdf.text(txt, colX[ci] + pad, yy + 5.6);
    });
  }
}

function drawHBarsContent(
  pdf: JsPDFInstance,
  cx: number,
  cy: number,
  cw: number,
  bars: PdfBar[],
  showPercent?: boolean,
  subtitle?: string
) {
  let y = cy;
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(subtitle, cx, y + 3.2);
    y += 6;
  }
  const max = Math.max(...bars.map((b) => b.value), 1);
  const trackH = 6.8;
  bars.forEach((b) => {
    const rightEdge = cx + cw;
    const labelMaxW = cw * 0.6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...NAVY);
    if (showPercent && b.percent != null) {
      const pct = `${b.percent.toFixed(1)}%`;
      pdf.text(pct, rightEdge, y + 3.2, { align: "right" });
      const pctW = pdf.getTextWidth(pct);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...TEXT_MID);
      pdf.text(b.valueText, rightEdge - pctW - 3, y + 3.2, { align: "right" });
    } else {
      pdf.text(b.valueText, rightEdge, y + 3.2, { align: "right" });
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(truncateToWidth(pdf, b.label, labelMaxW), cx, y + 3.2);

    const trackY = y + 5;
    pdf.setFillColor(237, 240, 244);
    pdf.roundedRect(cx, trackY, cw, trackH, trackH / 2, trackH / 2, "F");
    const ratio = b.percent != null ? b.percent / 100 : b.value / max;
    const fw = Math.max(cw * Math.min(Math.max(ratio, 0), 1), trackH);
    const c = pdfColor(b.color);
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.roundedRect(cx, trackY, fw, trackH, trackH / 2, trackH / 2, "F");
    y += HB_ROW;
  });
}

function drawLineContent(
  pdf: JsPDFInstance,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  categories: string[],
  series: PdfLineSeries[]
) {
  const legendH = 9;
  const axisLeftW = 16;
  const xLabelH = 6;
  const plotX = cx + axisLeftW;
  const plotY = cy + 3;
  const plotW = cw - axisLeftW - 3;
  const plotH = ch - legendH - xLabelH - 3;

  let maxV = 0;
  series.forEach((s) => s.points.forEach((v) => { if (v > maxV) maxV = v; }));
  const niceMax = niceCeil(maxV);
  const yOf = (v: number) => plotY + plotH - plotH * (niceMax > 0 ? v / niceMax : 0);

  const gl = 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  for (let i = 0; i <= gl; i++) {
    const gy = plotY + plotH - (plotH * i) / gl;
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.12);
    pdf.line(plotX, gy, plotX + plotW, gy);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(fmtCompact((niceMax * i) / gl), plotX - 2.2, gy + 1.1, { align: "right" });
  }

  const n = categories.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  pdf.setTextColor(...TEXT_MID);
  pdf.setFontSize(7.4);
  categories.forEach((cat, i) => {
    pdf.text(cat, plotX + stepX * i, plotY + plotH + 4, { align: "center" });
  });

  let domIdx = 0;
  let domSum = -1;
  series.forEach((s, i) => {
    const sum = s.points.reduce((a, b) => a + b, 0);
    if (sum > domSum) { domSum = sum; domIdx = i; }
  });

  series.forEach((s) => {
    const c = pdfColor(s.color);
    pdf.setDrawColor(c[0], c[1], c[2]);
    pdf.setLineWidth(0.9);
    for (let i = 0; i < s.points.length - 1; i++) {
      pdf.line(plotX + stepX * i, yOf(s.points[i]), plotX + stepX * (i + 1), yOf(s.points[i + 1]));
    }
    pdf.setFillColor(c[0], c[1], c[2]);
    s.points.forEach((v, i) => { pdf.circle(plotX + stepX * i, yOf(v), 1.0, "F"); });
  });

  const dom = series[domIdx];
  if (dom) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...NAVY);
    dom.points.forEach((v, i) => {
      if (v <= 0) return;
      pdf.text(fmtCompact(v), plotX + stepX * i, yOf(v) - 2.4, { align: "center" });
    });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.6);
  const widths = series.map((s) => pdf.getTextWidth(s.name) + 6);
  const totalLeg = widths.reduce((a, b) => a + b, 0) + 4 * Math.max(0, series.length - 1);
  let lx = cx + (cw - totalLeg) / 2;
  const ly = cy + ch - 2;
  series.forEach((s, i) => {
    const c = pdfColor(s.color);
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.circle(lx + 1.6, ly - 1, 1.3, "F");
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(s.name, lx + 4.2, ly);
    lx += widths[i] + 4;
  });
}

function drawAreaContent(
  pdf: JsPDFInstance,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  categories: string[],
  values: number[],
  color?: string,
  valueFmt?: (n: number) => string
) {
  const axisLeftW = 18;
  const xLabelH = 6;
  const plotX = cx + axisLeftW;
  const plotY = cy + 3;
  const plotW = cw - axisLeftW - 3;
  const plotH = ch - xLabelH - 3;
  const maxV = niceCeil(Math.max(...values, 0));
  const base = pdfColor(color ?? "#009FE3");
  const light: RGB = [
    Math.round(base[0] + (255 - base[0]) * 0.82),
    Math.round(base[1] + (255 - base[1]) * 0.82),
    Math.round(base[2] + (255 - base[2]) * 0.82),
  ];
  const yOf = (v: number) => plotY + plotH - plotH * (maxV > 0 ? v / maxV : 0);
  const baseline = plotY + plotH;

  const gl = 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  for (let i = 0; i <= gl; i++) {
    const gy = plotY + plotH - (plotH * i) / gl;
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.12);
    pdf.line(plotX, gy, plotX + plotW, gy);
    pdf.setTextColor(...TEXT_MID);
    const v = (maxV * i) / gl;
    pdf.text(valueFmt ? valueFmt(v) : fmtCompact(v), plotX - 2.2, gy + 1.1, { align: "right" });
  }

  const n = values.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;

  pdf.setFillColor(light[0], light[1], light[2]);
  for (let i = 0; i < n - 1; i++) {
    const x1 = plotX + stepX * i;
    const y1 = yOf(values[i]);
    const x2 = plotX + stepX * (i + 1);
    const y2 = yOf(values[i + 1]);
    pdf.triangle(x1, y1, x2, y2, x1, baseline, "F");
    pdf.triangle(x2, y2, x2, baseline, x1, baseline, "F");
  }

  pdf.setDrawColor(base[0], base[1], base[2]);
  pdf.setLineWidth(1);
  for (let i = 0; i < n - 1; i++) {
    pdf.line(plotX + stepX * i, yOf(values[i]), plotX + stepX * (i + 1), yOf(values[i + 1]));
  }
  if (n === 1) {
    pdf.setFillColor(base[0], base[1], base[2]);
    pdf.circle(plotX, yOf(values[0]), 1.2, "F");
  }

  pdf.setTextColor(...TEXT_MID);
  pdf.setFontSize(7);
  const skip = Math.max(1, Math.ceil(n / 10));
  categories.forEach((cat, i) => {
    if (i % skip !== 0 && i !== n - 1) return;
    pdf.text(cat, plotX + stepX * i, baseline + 4, { align: "center" });
  });
}

function fillPie(pdf: JsPDFInstance, cx: number, cy: number, r: number, a0: number, a1: number, c: RGB) {
  const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
  pdf.setFillColor(c[0], c[1], c[2]);
  for (let i = 0; i < steps; i++) {
    const t0 = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    const t1 = ((a0 + ((a1 - a0) * (i + 1)) / steps) * Math.PI) / 180;
    pdf.triangle(
      cx, cy,
      cx + r * Math.cos(t0), cy + r * Math.sin(t0),
      cx + r * Math.cos(t1), cy + r * Math.sin(t1),
      "F"
    );
  }
}

function drawDonutPairContent(
  pdf: JsPDFInstance,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  bars: PdfBar[],
  centerValue: string,
  centerLabel: string,
  subtitle?: string
) {
  let top = cy;
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(subtitle, cx, top + 3.2);
    top += 7;
  }
  const leftW = cw * 0.56;
  const rowH = 18;
  const barsH = bars.length * rowH;
  let by = top + Math.max(0, (cy + ch - top - barsH) / 2);
  const trackH = 8;
  bars.forEach((b) => {
    const c = pdfColor(b.color);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(truncateToWidth(pdf, b.label, leftW * 0.6), cx, by + 3.2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(c[0], c[1], c[2]);
    const pct = b.percent != null ? `${b.percent.toFixed(1)}%` : b.valueText;
    pdf.text(pct, cx + leftW - 4, by + 3.6, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.6);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(b.valueText, cx, by + 7.6);
    const trackY = by + 9.6;
    pdf.setFillColor(237, 240, 244);
    pdf.roundedRect(cx, trackY, leftW - 4, trackH, trackH / 2, trackH / 2, "F");
    const ratio = b.percent != null ? b.percent / 100 : 0;
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.roundedRect(cx, trackY, Math.max((leftW - 4) * ratio, trackH), trackH, trackH / 2, trackH / 2, "F");
    by += rowH;
  });

  const donutAreaW = cw - leftW;
  const cxd = cx + leftW + donutAreaW / 2;
  const cyd = cy + ch / 2;
  const rOuter = Math.max(8, Math.min(donutAreaW / 2 - 4, ch / 2 - 2));
  const rInner = rOuter * 0.62;
  const total = bars.reduce((a, b) => a + b.value, 0) || 1;
  let ang = -90;
  bars.forEach((b) => {
    const sweep = (360 * b.value) / total;
    fillPie(pdf, cxd, cyd, rOuter, ang, ang + sweep, pdfColor(b.color));
    ang += sweep;
  });
  pdf.setFillColor(255, 255, 255);
  pdf.circle(cxd, cyd, rInner, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...NAVY);
  pdf.text(centerValue, cxd, cyd + 0.5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MID);
  pdf.text(centerLabel.toUpperCase(), cxd, cyd + 5, { align: "center" });
}

interface ReportRenderable {
  height: number;
  draw: (pdf: JsPDFInstance, x: number, y: number, w: number) => void;
}

/** Converte uma seção em um ou mais "renderáveis" (quebra hbars/table altos). */
function sectionRenderables(section: PdfSection): ReportRenderable[] {
  switch (section.kind) {
    case "kpis": {
      const items = section.items;
      const perRow = Math.min(items.length, 4) || 1;
      const rows = Math.ceil(items.length / perRow);
      const height = CARD_HEADER_H + rows * 24 + (rows - 1) * 5 + CARD_PAD_BOTTOM;
      return [{
        height,
        draw: (pdf, x, y, w) => {
          drawSectionCard(pdf, x, y, w, height, section.title);
          drawKpisContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, items);
        },
      }];
    }
    case "hbars": {
      const sub = section.subtitle;
      const subH = sub ? 6 : 0;
      const maxBars = Math.max(1, Math.floor((PAGE_CONTENT_H - CARD_HEADER_H - subH - CARD_PAD_BOTTOM) / HB_ROW));
      const chunks = chunkArray(section.bars, maxBars);
      return chunks.map((bars, ci) => {
        const thisSub = ci === 0 ? sub : undefined;
        const thisSubH = thisSub ? 6 : 0;
        const height = CARD_HEADER_H + thisSubH + bars.length * HB_ROW + CARD_PAD_BOTTOM;
        const title = chunks.length > 1 ? `${section.title} (${ci + 1}/${chunks.length})` : section.title;
        return {
          height,
          draw: (pdf, x, y, w) => {
            drawSectionCard(pdf, x, y, w, height, title);
            drawHBarsContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, bars, section.showPercent, thisSub);
          },
        };
      });
    }
    case "table": {
      const hasTotals = !!section.totalsRow;
      const totalsH = hasTotals ? T_ROW + 1.5 : 0;
      const maxRows = Math.max(1, Math.floor((PAGE_CONTENT_H - CARD_HEADER_H - CARD_PAD_BOTTOM - T_HEADER - totalsH) / T_ROW));
      const chunks = chunkArray(section.rows, maxRows);
      return chunks.map((rows, ci) => {
        const isLast = ci === chunks.length - 1;
        const totals = isLast ? section.totalsRow : undefined;
        const tH = isLast ? totalsH : 0;
        const height = CARD_HEADER_H + T_HEADER + rows.length * T_ROW + tH + CARD_PAD_BOTTOM;
        const title = chunks.length > 1 ? `${section.title} (${ci + 1}/${chunks.length})` : section.title;
        return {
          height,
          draw: (pdf, x, y, w) => {
            drawSectionCard(pdf, x, y, w, height, title);
            drawTableContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, section.columns, rows, totals);
          },
        };
      });
    }
    case "line": {
      const contentH = 118;
      const height = CARD_HEADER_H + contentH + CARD_PAD_BOTTOM;
      return [{
        height,
        draw: (pdf, x, y, w) => {
          drawSectionCard(pdf, x, y, w, height, section.title);
          drawLineContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, contentH, section.categories, section.series);
        },
      }];
    }
    case "area": {
      const contentH = 96;
      const height = CARD_HEADER_H + contentH + CARD_PAD_BOTTOM;
      return [{
        height,
        draw: (pdf, x, y, w) => {
          drawSectionCard(pdf, x, y, w, height, section.title);
          drawAreaContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, contentH, section.categories, section.values, section.color, section.valueFmt);
        },
      }];
    }
    case "donutPair": {
      const contentH = 92;
      const height = CARD_HEADER_H + contentH + CARD_PAD_BOTTOM;
      return [{
        height,
        draw: (pdf, x, y, w) => {
          drawSectionCard(pdf, x, y, w, height, section.title);
          drawDonutPairContent(pdf, x + CARD_PAD_X, y + CARD_HEADER_H, w - 2 * CARD_PAD_X, contentH, section.bars, section.centerValue, section.centerLabel, section.subtitle);
        },
      }];
    }
    default:
      return [];
  }
}

/*
 * exportReportToPdf(report, filename, title, options?)
 * -------------------------------------------------------
 * Renderiza um relatório declarativo (PdfReport) em PDF A4 paisagem,
 * 100% vetorial. Não usa html2canvas — robusto e nítido.
 */
export async function exportReportToPdf(
  report: PdfReport,
  filename: string,
  title: string,
  options?: PdfExportOptions
) {
  const { jsPDF } = await import("jspdf");

  const renderables: ReportRenderable[] = [];
  for (const s of report.sections) renderables.push(...sectionRenderables(s));

  interface Placed { page: number; y: number; r: ReportRenderable }
  const placed: Placed[] = [];
  let page = 0;
  let y = CONTENT_TOP;
  for (const r of renderables) {
    if (y + r.height > CONTENT_BOT && y > CONTENT_TOP) {
      page++;
      y = CONTENT_TOP;
    }
    placed.push({ page, y, r });
    y += r.height + GAP;
  }
  const totalPages = page + 1 + 1; // capa + páginas de conteúdo

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await drawCoverPage(pdf, title, options);

  let lastPage = -1;
  for (const pl of placed) {
    while (lastPage < pl.page) {
      pdf.addPage();
      lastPage++;
      drawPageChrome(pdf, title, lastPage + 2, totalPages);
    }
    pl.r.draw(pdf, MX, pl.y, USABLE_W);
  }

  pdf.save(`${filename}.pdf`);
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * forceLightInlineStyles — Sistema de conversão Dark → Light para captura
 * ═══════════════════════════════════════════════════════════════════════
 * O dashboard tem tema escuro (dark mode), mas o PDF precisa de fundo branco.
 * Esta seção define:
 *
 *   DARK_BG_MAP   → pares [cor-escura, cor-clara] para substituir fundos
 *   DARK_BORDER_MAP → pares para substituir bordas escuras
 *   LIGHT_TEXT_MAP  → pares para escurecer textos claros (brancos/cinzas)
 *
 * A função forceLightInlineStyles() percorre TODOS os elementos HTML dentro
 * do container sendo exportado e aplica as substituições inline antes da captura.
 * Retorna uma função de "restore" para desfazer tudo após a captura.
 *
 * Também lida com elementos SVG do Recharts (gráficos), que têm seus
 * fill (cor de preenchimento de texto) baked diretamente nos atributos,
 * não sendo afetados pelo CSS normal.
 */
// ═══════════════════════════════════════════════════════════════════════
//  FORCE LIGHT MODE — inline style overrides for html2canvas
// ═══════════════════════════════════════════════════════════════════════
const DARK_BG_MAP: [string, string][] = [
  ["rgb(12, 33, 53)",  "#ffffff"],   // #0C2135
  ["rgb(7, 26, 46)",   "#f1f5f9"],   // #071A2E
  ["rgb(6, 23, 38)",   "#f8fafc"],   // #061726
  ["rgb(11, 26, 46)",  "#ffffff"],   // #0b1a2e
  ["rgb(8, 20, 34)",   "#f8fafc"],   // #081422
  ["rgb(6, 14, 26)",   "#ffffff"],   // #060e1a
  ["rgb(10, 25, 41)",  "#f1f5f9"],   // #0a1929
  ["rgb(13, 31, 51)",  "#f8fafc"],   // #0d1f33
  ["rgb(10, 22, 40)",  "#f8fafc"],   // #0a1628
  ["rgb(8, 30, 48)",   "#f1f5f9"],   // #081E30
];

const DARK_BORDER_MAP: [string, string][] = [
  ["rgb(22, 90, 138)", "#cbd5e1"],   // #165A8A
  ["rgb(26, 58, 92)",  "#e2e8f0"],   // #1a3a5c
];

const LIGHT_TEXT_MAP: [string, string][] = [
  ["rgb(255, 255, 255)", "#0f172a"],  // white
  ["rgb(243, 244, 246)", "#1e293b"],  // gray-100
  ["rgb(229, 231, 235)", "#334155"],  // gray-200
  ["rgb(209, 213, 219)", "#475569"],  // gray-300
  ["rgb(156, 163, 175)", "#64748b"],  // gray-400
];

/*
 * parseColor(input) — Converte uma string de cor CSS para array [R, G, B]
 * -------------------------------------------------------
 * Aceita formatos: "#fff", "#0C2135", "rgb(12, 33, 53)", "rgba(12, 33, 53, 1)"
 * Retorna null se não conseguir interpretar o formato.
 * Necessária para comparar cores programaticamente e calcular luminosidade.
 */
// Parse an "rgb(r, g, b)" / "rgba(r, g, b, a)" / "#rrggbb" string into [r,g,b] (0-255) or null
function parseColor(input: string): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim();
  // hex
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgb) {
    return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
  }
  return null;
}

/*
 * luminance(rgb) — Calcula a luminosidade percebida de uma cor
 * -------------------------------------------------------
 * Usa a fórmula padrão de luminância perceptual (ITU-R BT.709):
 *   L = 0.2126 × R + 0.7152 × G + 0.0722 × B
 *
 * Retorna um valor de 0 (preto) a 255 (branco).
 * Cores com L >= 170 são consideradas "claras demais" para fundo branco
 * e precisam ser escurecidas para serem legíveis no PDF.
 */
// Perceived luminance (0-255). >= 170 is "too light for white bg".
function luminance(rgb: [number, number, number]): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// Replacement dark color for any light text on white background during PDF capture.
const PDF_TEXT_DARK = "#0f172a";

function forceLightInlineStyles(root: HTMLElement): () => void {
  const saved: Array<{ el: HTMLElement; bg: string; color: string; borderColor: string }> = [];

  // Also temporarily strip bg-[#071A2E] class from ALL elements in the page
  // so the body:has(div.bg-[#071A2E]) "login always-dark" CSS rule no longer matches
  const stripped: Array<{ el: Element; cls: string }> = [];
  document.querySelectorAll('[class*="071A2E"]').forEach((el) => {
    const match = el.className.match(/bg-\[#071A2E\](\/\d+)?/);
    if (match) {
      stripped.push({ el, cls: match[0] });
      el.classList.remove(match[0]);
    }
  });

  // Force reflow so computed styles update
  void root.offsetHeight;

  const allEls = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];
  for (const el of allEls) {
    const cs = getComputedStyle(el);
    let touched = false;
    const orig = { bg: el.style.backgroundColor, color: el.style.color, borderColor: el.style.borderColor };

    // Detecta fundo escuro por luminância (cobre rgb(), rgba() com qualquer alpha e hex)
    const parsedBg = parseColor(cs.backgroundColor);
    if (parsedBg && luminance(parsedBg) < 100) {
      el.style.backgroundColor = "#ffffff";
      touched = true;
    } else if (!parsedBg && /^(color-mix|oklch|oklab|lch|lab)\s*\(/i.test(cs.backgroundColor)) {
      // TailwindCSS v4 compila opacity variants como color-mix(in oklab, ...) — parseColor retorna null
      el.style.backgroundColor = "#ffffff";
      touched = true;
    }

    // Detecta bordas escuras por luminância
    const parsedBorder = parseColor(cs.borderTopColor);
    if (parsedBorder && luminance(parsedBorder) < 100) {
      el.style.borderColor = "#e2e8f0";
      touched = true;
    } else if (!parsedBorder && /^(color-mix|oklch|oklab|lch|lab)\s*\(/i.test(cs.borderTopColor)) {
      el.style.borderColor = "#e2e8f0";
      touched = true;
    }

    // Force-darken any HTML text that is too light to be readable on a white background.
    // This covers axis labels, table cells with text-white/text-gray-300, etc.
    const parsed = parseColor(cs.color);
    if (parsed && luminance(parsed) >= 170) {
      el.style.color = PDF_TEXT_DARK;
      touched = true;
    } else if (!parsed && /^(color-mix|oklch|oklab|lch|lab)\s*\(/i.test(cs.color)) {
      el.style.color = PDF_TEXT_DARK;
      touched = true;
    }

    if (touched) saved.push({ el, ...orig });
  }

  // ── SVG <text> / <tspan> — Recharts bakes fill into these at render-time
  // based on the isDark prop, so axis ticks and LabelList values have a light
  // fill even after we force theme=light. Override their `fill` attribute if
  // the current fill is too light for a white card background.
  const svgSaved: Array<{ el: SVGElement; hadAttr: boolean; prev: string | null }> = [];
  const svgTextEls = root.querySelectorAll("text, tspan") as NodeListOf<SVGElement>;
  svgTextEls.forEach((el) => {
    const attr = el.getAttribute("fill");
    const cs = getComputedStyle(el as unknown as Element);
    const effective = attr && attr !== "none" ? attr : cs.fill || (cs as any).color;
    const parsed = parseColor(effective);
    if (!parsed) return;
    // Leave bright brand colors alone (e.g. accents with enough saturation) — only
    // target near-greys / near-whites (where max-min channel spread is small).
    const [r, g, b] = parsed;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    const isLightGreyish = luminance(parsed) >= 170 && chroma <= 40;
    if (!isLightGreyish) return;
    svgSaved.push({ el, hadAttr: el.hasAttribute("fill"), prev: attr });
    el.setAttribute("fill", PDF_TEXT_DARK);
  });

  return () => {
    for (const { el, bg, color, borderColor } of saved) {
      el.style.backgroundColor = bg;
      el.style.color = color;
      el.style.borderColor = borderColor;
    }
    for (const { el, hadAttr, prev } of svgSaved) {
      if (hadAttr && prev !== null) el.setAttribute("fill", prev);
      else el.removeAttribute("fill");
    }
    for (const { el, cls } of stripped) {
      el.classList.add(cls);
    }
  };
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * exportElementToPdf — Função principal exportada para uso nas páginas
 * ═══════════════════════════════════════════════════════════════════════
 *
 * PdfExportOptions — Opções extras para a exportação
 *   subtitle → texto adicional na capa (ex: "Relatório mensal")
 *   period   → período de datas (ex: "01 jan 2026 — 30 jan 2026")
 */
// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════
export interface PdfExportOptions {
  subtitle?: string;
  period?: string;
}

/*
 * exportElementToPdf(container, filename, title, options?)
 * -------------------------------------------------------
 * Função principal chamada pelos botões de exportação nas páginas.
 *
 * Parâmetros:
 *   container → elemento HTML a ser exportado (geralmente uma div com ref)
 *   filename  → nome do arquivo sem extensão (ex: "visao-geral-jan-2026")
 *   title     → título exibido na capa e headers do PDF
 *   options   → subtitle e period opcionais para a capa
 *
 * Passos executados:
 *   1. Salva o tema atual e força tema claro temporariamente
 *   2. Mostra elementos marcados com [data-pdf-only] (visíveis só no PDF)
 *   3. Aguarda 300ms para o browser re-renderizar com tema claro
 *   4. Aplica as substituições de cor inline (forceLightInlineStyles)
 *   5. Captura cada filho do container como imagem (html2canvas)
 *   6. Restaura todas as alterações (tema, estilos, visibilidade)
 *   7. Calcula o layout: quantas imagens cabem por página
 *   8. Cria o documento jsPDF e adiciona capa + páginas de conteúdo
 *   9. Salva o arquivo .pdf no computador do usuário
 */
export async function exportElementToPdf(
  container: HTMLElement,
  filename: string,
  title: string,
  options?: PdfExportOptions
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  type Capture = { canvas: HTMLCanvasElement; scale: number; label: string };

  const prevTheme = document.documentElement.getAttribute("data-theme");
  const pdfOnlyEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-only]"));
  const pdfOnlyPrevious = pdfOnlyEls.map((el) => ({ el, display: el.style.display }));
  let stagingRoot: HTMLDivElement | null = null;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const cssModernColor = /(color-mix|oklch|oklab|lch|lab|display-p3|color\()/i;

  function rectOf(el: Element) {
    return el.getBoundingClientRect();
  }

  function rgbToCss(rgb: [number, number, number]) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function firstRgbFromCss(value: string): [number, number, number] | null {
    if (!value) return null;
    const matches = value.match(/rgba?\([^)]*\)/gi);
    if (!matches?.length) return null;
    for (const m of matches) {
      const parsed = parseColor(m);
      if (parsed) return parsed;
    }
    return null;
  }

  function classText(el: Element) {
    return typeof (el as HTMLElement).className === "string" ? (el as HTMLElement).className : "";
  }

  function hasMeaningfulContent(el: HTMLElement) {
    const rect = rectOf(el);
    if (rect.width < 20 || rect.height < 12) return false;
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, "").trim();
    if (text.length >= 2) return true;
    return Boolean(el.querySelector("svg, canvas, img, table, [role='img'], .recharts-wrapper"));
  }

  function isDecorative(el: Element) {
    const win = el.ownerDocument.defaultView ?? window;
    const cs = win.getComputedStyle(el);
    if (cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none") return true;

    // Não descarte elementos internos de SVG só porque o boundingClientRect é 0.
    // Paths, defs, stops, clipPaths e textos de gráficos podem aparecer assim e
    // ainda serem essenciais para o Recharts.
    if (el instanceof SVGElement) return false;

    const cls = classText(el);
    if (/blur-(3xl|2xl|xl)|animate-|motion-|pulse|ping|spin|skeleton/i.test(cls)) return true;
    const rect = rectOf(el);
    if (rect.width === 0 || rect.height === 0) return true;
    return false;
  }

  function isBarLike(el: Element, cs: CSSStyleDeclaration) {
    const rect = rectOf(el);
    const cls = classText(el);
    const radius = parseFloat(cs.borderTopLeftRadius || "0");
    const role = el.getAttribute("role") || "";
    return (
      rect.width >= 35 &&
      rect.height >= 4 &&
      rect.height <= 42 &&
      (radius >= rect.height / 3 || /progress|bar|rounded-full|h-\d|h-\[|bg-ds-accent|bg-\[|from-|to-/i.test(cls) || role === "progressbar")
    );
  }

  function inferBrandColor(el: Element, cs: CSSStyleDeclaration) {
    const cls = classText(el).toLowerCase();
    const bgImageRgb = firstRgbFromCss(cs.backgroundImage || "");
    if (bgImageRgb && luminance(bgImageRgb) > 25) return rgbToCss(bgImageRgb);
    if (/green|emerald|success|dentro|prazo|from-success|to-success/.test(cls)) return "#10b981";
    if (/red|rose|danger|destructive|fora|error|from-red|to-red/.test(cls)) return "#ef4444";
    if (/orange|amber|warning|instagram/.test(cls)) return "#f97316";
    if (/messenger|blue|accent|cyan|sky|009fe3|from-ds-accent|to-ds-accent/.test(cls)) return "#009FE3";
    return "#009FE3";
  }

  function safeColor(value: string, fallback: string) {
    if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)" || cssModernColor.test(value)) return fallback;
    return value;
  }

  function safeTextColor(value: string) {
    const parsed = parseColor(value);
    if (!parsed) return PDF_TEXT_DARK;
    return luminance(parsed) >= 170 ? PDF_TEXT_DARK : value;
  }

  function safeBackgroundColor(source: Element, cs: CSSStyleDeclaration) {
    const parsed = parseColor(cs.backgroundColor);
    const hasBgImage = Boolean(cs.backgroundImage && cs.backgroundImage !== "none");

    if (isBarLike(source, cs)) {
      const parent = source.parentElement;
      const parentRect = parent ? rectOf(parent) : null;
      const ownRect = rectOf(source);
      const looksLikeFill = Boolean(parentRect && parentRect.width > 0 && ownRect.width < parentRect.width * 0.96);
      if (looksLikeFill || hasBgImage) return inferBrandColor(source, cs);
      if (parsed && luminance(parsed) < 120) return "#e2e8f0";
      return safeColor(cs.backgroundColor, "#e2e8f0");
    }

    if (parsed && luminance(parsed) < 100) return "#ffffff";
    if (!parsed && cssModernColor.test(cs.backgroundColor)) return "#ffffff";
    return safeColor(cs.backgroundColor, "transparent");
  }

  function collectSections() {
    const explicit = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-section]"))
      .filter((el) => !el.hasAttribute("data-pdf-exclude") && hasMeaningfulContent(el));

    if (explicit.length > 0) return explicit;

    return (Array.from(container.children) as HTMLElement[])
      .filter((el) => !el.hasAttribute("data-pdf-exclude") && hasMeaningfulContent(el));
  }

  function copyCanvasContent(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
    const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
    const cloneCanvases = Array.from(cloneRoot.querySelectorAll("canvas"));

    sourceCanvases.forEach((sourceCanvas, index) => {
      const cloneCanvas = cloneCanvases[index];
      if (!cloneCanvas) return;
      try {
        const img = document.createElement("img");
        img.src = sourceCanvas.toDataURL("image/png");
        img.width = sourceCanvas.width;
        img.height = sourceCanvas.height;
        img.style.width = `${sourceCanvas.getBoundingClientRect().width}px`;
        img.style.height = `${sourceCanvas.getBoundingClientRect().height}px`;
        cloneCanvas.replaceWith(img);
      } catch {
        try {
          cloneCanvas.width = sourceCanvas.width;
          cloneCanvas.height = sourceCanvas.height;
          cloneCanvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0);
        } catch {
          // Canvas com CORS/tainted: apenas ignora.
        }
      }
    });
  }

  function resolveSvgGradientRefs(root: Element, doc: Document) {
    root.querySelectorAll<SVGElement>("[fill], [stroke]").forEach((svgEl) => {
      (["fill", "stroke"] as const).forEach((attr) => {
        const value = svgEl.getAttribute(attr) ?? "";
        const match = value.match(/^url\(#([^)]+)\)$/);
        if (!match) return;
        const grad = doc.getElementById(match[1]);
        const stops = grad ? Array.from(grad.querySelectorAll("stop")) : [];
        const mid = stops[Math.floor(stops.length / 2)] || stops[0];
        const color =
          mid?.getAttribute("stop-color") ||
          (mid as unknown as HTMLElement | undefined)?.style?.getPropertyValue("stop-color") ||
          "#009FE3";
        svgEl.setAttribute(attr, color);
      });
    });
  }

  function inlineSnapshotStyles(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
    const sourceEls = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll("*"))] as Element[];
    const cloneEls = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll("*"))] as Element[];

    const layoutProps = [
      "display",
      "position",
      "left",
      "top",
      "right",
      "bottom",
      "zIndex",
      "boxSizing",
      "flexDirection",
      "flexWrap",
      "alignItems",
      "alignContent",
      "justifyContent",
      "gap",
      "rowGap",
      "columnGap",
      "gridTemplateColumns",
      "gridTemplateRows",
      "gridAutoColumns",
      "gridAutoRows",
      "gridColumn",
      "gridRow",
      "flex",
      "flexGrow",
      "flexShrink",
      "flexBasis",
      "order",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "lineHeight",
      "letterSpacing",
      "textAlign",
      "textTransform",
      "whiteSpace",
      "wordBreak",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderTopStyle",
      "borderRightStyle",
      "borderBottomStyle",
      "borderLeftStyle",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomRightRadius",
      "borderBottomLeftRadius",
      "objectFit",
      "objectPosition",
      "verticalAlign",
      "opacity",
      "transform",
      "transformOrigin",
    ];

    for (let i = 0; i < sourceEls.length; i++) {
      const source = sourceEls[i] as HTMLElement | SVGElement;
      const clone = cloneEls[i] as HTMLElement | SVGElement | undefined;
      if (!clone) continue;

      const sourceHtml = source as HTMLElement;
      const cloneHtml = clone as HTMLElement;
      const cs = getComputedStyle(sourceHtml);
      const rect = rectOf(sourceHtml);
      const style = cloneHtml.style;
      const isSvgShape = source instanceof SVGElement && !(source instanceof SVGSVGElement);

      if (!isSvgShape) {
        for (const prop of layoutProps) {
          const value = cs.getPropertyValue(prop);
          if (value) style.setProperty(prop, value, "important");
        }

        style.setProperty("width", `${Math.max(1, rect.width)}px`, "important");
        style.setProperty("min-width", `${Math.max(1, rect.width)}px`, "important");
        style.setProperty("max-width", `${Math.max(1, rect.width)}px`, "important");

        if (rect.height > 0) {
          style.setProperty("min-height", `${rect.height}px`, "important");
        }
      }

      style.setProperty("color", safeTextColor(cs.color), "important");
      style.setProperty("background-color", safeBackgroundColor(sourceHtml, cs), "important");
      style.setProperty("background-image", "none", "important");
      style.setProperty("box-shadow", "none", "important");
      style.setProperty("filter", "none", "important");
      style.setProperty("-webkit-filter", "none", "important");
      style.setProperty("backdrop-filter", "none", "important");
      style.setProperty("-webkit-backdrop-filter", "none", "important");
      style.setProperty("border-color", safeColor(cs.borderTopColor, "#e2e8f0"), "important");

      if (/truncate/i.test(classText(sourceHtml))) {
        style.setProperty("overflow", "visible", "important");
        style.setProperty("text-overflow", "clip", "important");
      } else if (isBarLike(sourceHtml, cs)) {
        style.setProperty("overflow", "hidden", "important");
      } else {
        style.setProperty("overflow", cs.overflow === "clip" ? "hidden" : cs.overflow, "important");
      }

      if (clone instanceof SVGElement) {
        const fill = source.getAttribute("fill") || cs.fill || "";
        const stroke = source.getAttribute("stroke") || cs.stroke || "";
        if (fill && fill !== "none" && !fill.startsWith("url(")) {
          const parsed = parseColor(fill);
          clone.setAttribute("fill", parsed && luminance(parsed) >= 170 ? PDF_TEXT_DARK : safeColor(fill, PDF_TEXT_DARK));
        }
        const isTextNode = clone.tagName === "text" || clone.tagName === "tspan";
        if (isTextNode) {
          // Remove dark-mode text halos: stroke on text elements causes doubled/bold
          // glyphs on white PDF background (paintOrder="stroke" bakes in dark outlines).
          clone.setAttribute("stroke", "none");
          clone.setAttribute("stroke-width", "0");
          clone.style?.removeProperty?.("paint-order");
        } else if (stroke && stroke !== "none" && !stroke.startsWith("url(")) {
          clone.setAttribute("stroke", safeColor(stroke, "#009FE3"));
        }
      }

      // Remove classes after inlining. This prevents Tailwind/shadcn pseudo-elements,
      // color-mix gradients and blur glows from being re-applied inside html2canvas.
      clone.removeAttribute("class");
    }

    resolveSvgGradientRefs(cloneRoot, document);
  }

  async function waitForImages(root: HTMLElement) {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );
  }

  async function createSnapshot(section: HTMLElement) {
    if (!stagingRoot) {
      stagingRoot = document.createElement("div");
      stagingRoot.setAttribute("data-pdf-staging", "true");
      stagingRoot.style.cssText = [
        "position: fixed",
        "left: -100000px",
        "top: 0",
        "z-index: -1",
        "pointer-events: none",
        "background: #ffffff",
        "overflow: visible",
      ].join(";");
      document.body.appendChild(stagingRoot);
    }

    const rect = rectOf(section);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = [
      `width: ${Math.ceil(Math.max(1, rect.width))}px`,
      `min-height: ${Math.ceil(Math.max(1, rect.height))}px`,
      "background: #ffffff",
      "overflow: visible",
      "contain: layout style paint",
    ].join(";");

    const clone = section.cloneNode(true) as HTMLElement;
    clone.style.setProperty("margin", "0", "important");
    clone.style.setProperty("background-image", "none", "important");
    clone.style.setProperty("filter", "none", "important");
    clone.style.setProperty("box-shadow", "none", "important");
    wrapper.appendChild(clone);
    stagingRoot.appendChild(wrapper);

    copyCanvasContent(section, clone);
    inlineSnapshotStyles(section, clone);
    await waitForImages(wrapper);
    await sleep(80);

    return { wrapper, clone };
  }

  function isCanvasBlank(canvas: HTMLCanvasElement) {
    const width = canvas.width;
    const height = canvas.height;
    if (width < 4 || height < 4) return true;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const sampleW = Math.min(width, 220);
    const sampleH = Math.min(height, 140);
    const stepX = Math.max(1, Math.floor(width / sampleW));
    const stepY = Math.max(1, Math.floor(height / sampleH));
    let total = 0;
    let nonWhite = 0;

    try {
      const data = ctx.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          total++;
          if (a > 20 && !(r > 246 && g > 246 && b > 246)) nonWhite++;
        }
      }
    } catch {
      return false;
    }

    return total > 0 && nonWhite / total < 0.003;
  }

  async function captureElement(section: HTMLElement, label: string): Promise<Capture | null> {
    const scales = [2.2, 1.4, 1];

    for (const scale of scales) {
      let snapshot: { wrapper: HTMLElement; clone: HTMLElement } | null = null;
      try {
        snapshot = await createSnapshot(section);
        const rect = rectOf(snapshot.clone);
        const width = Math.max(1, Math.ceil(rect.width));
        const height = Math.max(1, Math.ceil(rect.height));

        const canvas = await html2canvas(snapshot.clone, {
          scale,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          removeContainer: true,
          ignoreElements: (el) => {
            if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false;
            return isDecorative(el) || el.hasAttribute("data-pdf-exclude");
          },
          onclone: (doc) => {
            try {
              // O snapshot já tem estilos inline. Remover CSS global evita que o html2canvas
              // leia color-mix()/oklch()/gradientes do bundle minificado do Vite/Tailwind.
              // Em alguns clones do html2canvas, doc.head pode vir null; por isso tudo aqui
              // precisa ser defensivo para não quebrar a exportação inteira.
              try {
                doc.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => node.remove());
              } catch {
                // Se o clone não permitir query/removal, segue com os estilos inline do snapshot.
              }

              const safeStyle = doc.createElement("style");
              safeStyle.textContent =
                "*,*::before,*::after{background-image:none!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}";

              const styleTarget = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
              styleTarget?.appendChild?.(safeStyle);
            } catch {
              // Falhas no onclone não devem quebrar o html2canvas.
            }
          },
        });

        if (!isCanvasBlank(canvas)) {
          return { canvas, scale, label };
        }

        console.warn(`[exportPdf] captura vazia em "${label}" com scale ${scale}; tentando fallback...`);
      } catch (e) {
        console.warn(`[exportPdf] html2canvas falhou em "${label}" com scale ${scale}:`, e);
      } finally {
        snapshot?.wrapper.remove();
      }
    }

    return null;
  }

  async function captureSection(section: HTMLElement) {
    const label = section.getAttribute("data-pdf-title") || section.getAttribute("data-section") || classText(section).slice(0, 80) || "seção";
    const captured = await captureElement(section, label);
    if (!captured) {
      console.warn(`[exportPdf] seção ignorada porque não pôde ser capturada: "${label}"`);
      return [];
    }
    return [captured];
  }

  let captures: Capture[] = [];

  try {
    document.documentElement.setAttribute("data-theme", "light");
    pdfOnlyEls.forEach((el) => (el.style.display = ""));

    // Aguarda Recharts/Tailwind recalcularem no tema claro.
    await sleep(900);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const sections = collectSections();
    if (sections.length === 0) {
      throw new Error("Nenhuma seção encontrada para exportar. Marque os cards com data-pdf-section ou verifique o container enviado.");
    }

    for (const section of sections) {
      const recovered = await captureSection(section);
      captures.push(...recovered);
    }

    // Remove capturas duplicadas/vazias acidentais.
    captures = captures.filter((item) => item.canvas.width > 0 && item.canvas.height > 0 && !isCanvasBlank(item.canvas));

    if (captures.length === 0) {
      throw new Error("Nenhuma seção pôde ser capturada para o PDF");
    }
  } finally {
    const rootToRemove = stagingRoot as HTMLDivElement | null;
    rootToRemove?.remove();
    for (const { el, display } of pdfOnlyPrevious) {
      el.style.display = display;
    }
    if (prevTheme) {
      document.documentElement.setAttribute("data-theme", prevTheme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  interface Placement { page: number; y: number; drawW: number; drawH: number }
  const placements: Placement[] = [];
  let curPage = 0;
  let curY = CONTENT_TOP;

  for (const { canvas, scale } of captures) {
    const natW = canvas.width / scale;
    const natH = canvas.height / scale;
    const ratio = USABLE_W / natW;
    let dW = USABLE_W;
    let dH = natH * ratio;

    if (curY + dH > CONTENT_BOT && curY > CONTENT_TOP) {
      curPage++;
      curY = CONTENT_TOP;
    }

    const maxH = CONTENT_BOT - curY;
    if (dH > maxH) {
      const s = maxH / dH;
      dH = maxH;
      dW = USABLE_W * s;
    }

    placements.push({ page: curPage, y: curY, drawW: dW, drawH: dH });
    curY += dH + GAP;
  }

  const contentPages = curPage + 1;
  const totalPages = contentPages + 1;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  await drawCoverPage(pdf, title, options);

  let lastPage = -1;
  for (let i = 0; i < captures.length; i++) {
    const pl = placements[i];

    while (lastPage < pl.page) {
      pdf.addPage();
      lastPage++;
      drawPageChrome(pdf, title, lastPage + 2, totalPages);
    }

    const ox = pl.drawW < USABLE_W ? MX + (USABLE_W - pl.drawW) / 2 : MX;

    pdf.setFillColor(218, 222, 228);
    pdf.roundedRect(ox + 0.6, pl.y + 0.6, pl.drawW, pl.drawH, 1.5, 1.5, "F");

    pdf.setFillColor(...WHITE);
    pdf.roundedRect(ox, pl.y, pl.drawW, pl.drawH, 1.5, 1.5, "F");

    const imgData = captures[i].canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", ox + 0.5, pl.y + 0.5, pl.drawW - 1, pl.drawH - 1);

    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(ox, pl.y, pl.drawW, pl.drawH, 1.5, 1.5, "S");
  }

  pdf.save(`${filename}.pdf`);
}
