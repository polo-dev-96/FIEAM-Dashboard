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

// html2canvas: converte um elemento HTML em um canvas (imagem bitmap)
import html2canvas from "html2canvas";

// jsPDF: biblioteca para criar/editar documentos PDF em JavaScript
import { jsPDF } from "jspdf";

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
  pdf: jsPDF,
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

  // ── Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(...WHITE);
  const titleLines = pdf.splitTextToSize(title, PW * 0.5);
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

  // ── Logos — 4 institution logos at top + Polo centered-right
  const [logoFIEAM, logoSESI, logoSENAI, logoIEL] = await Promise.all([
    loadImageAsDataUrl("/anexo/FIEAM-removebg-preview.png"),
    loadImageAsDataUrl("/anexo/SESI-removebg-preview.png"),
    loadImageAsDataUrl("/anexo/SENAI-removebg-preview.png"),
    loadImageAsDataUrl("/anexo/IEL-removebg-preview.png"),
  ]);

  // Institution logos row — very top of page, stretched and spaced
  const logos = [logoFIEAM, logoSESI, logoSENAI, logoIEL].filter(Boolean) as string[];
  if (logos.length > 0) {
    const logoW = 42;
    const logoH = 14;
    const logoGap = 18;
    const totalW = logos.length * logoW + (logos.length - 1) * logoGap;
    const startX = (PW - totalW) / 2;
    logos.forEach((src, i) => {
      pdf.addImage(src, "PNG", startX + i * (logoW + logoGap), 8, logoW, logoH);
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
function drawPageChrome(pdf: jsPDF, title: string, pageNum: number, totalPages: number) {
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
    }

    // Detecta bordas escuras por luminância
    const parsedBorder = parseColor(cs.borderTopColor);
    if (parsedBorder && luminance(parsedBorder) < 100) {
      el.style.borderColor = "#e2e8f0";
      touched = true;
    }

    // Force-darken any HTML text that is too light to be readable on a white background.
    // This covers axis labels, table cells with text-white/text-gray-300, etc.
    const parsed = parseColor(cs.color);
    if (parsed && luminance(parsed) >= 170) {
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
  // ── Salva o tema atual e força tema claro para captura
  const prevTheme = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", "light");

  // ── Reveal PDF-only elements
  const pdfOnlyEls = container.querySelectorAll("[data-pdf-only]") as NodeListOf<HTMLElement>;
  pdfOnlyEls.forEach((el) => (el.style.display = ""));

  await new Promise((r) => setTimeout(r, 1500));

  // ── Force light inline styles (bypasses CSS specificity issues)
  const restoreLight = forceLightInlineStyles(container);

  // ── Fix overflow clipping: html2canvas struggles with overflow:hidden on text
  const overflowFixes: Array<{ el: HTMLElement; prev: string }> = [];
  const allTextEls = container.querySelectorAll("[class*='truncate'], [class*='overflow-hidden']") as NodeListOf<HTMLElement>;
  for (const el of Array.from(allTextEls)) {
    overflowFixes.push({ el, prev: el.style.overflow });
    el.style.overflow = "visible";
  }
  // Also fix the container itself if it clips children
  overflowFixes.push({ el: container, prev: container.style.overflow });
  container.style.overflow = "visible";

  // ── Capture DOM sections
  const children = Array.from(container.children) as HTMLElement[];
  const sections = children.filter((el) => !el.hasAttribute("data-pdf-exclude"));

  // Helper: sanitiza o documento clonado do html2canvas para remover
  // funções de cor modernas (color(), oklch(), lch()) que o html2canvas
  // não consegue parsear, substituindo por valores seguros equivalentes.
  function sanitizeClonedColors(doc: Document, root: HTMLElement) {
    const unsafePattern = /^(color|oklch|lch|lab|display-p3)\s*\(/i;
    const all = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];
    for (const el of all) {
      const cs = doc.defaultView?.getComputedStyle(el);
      if (!cs) continue;
      if (unsafePattern.test(cs.backgroundColor)) el.style.backgroundColor = "transparent";
      if (unsafePattern.test(cs.color))            el.style.color            = "#0f172a";
      if (unsafePattern.test(cs.borderTopColor))   el.style.borderColor      = "#e2e8f0";
      // Prevent text clipping in html2canvas clone
      if (cs.overflow === "hidden" && (el.classList.contains("truncate") || el.closest("[data-fieam-surface]"))) {
        el.style.overflow = "visible";
      }
    }
  }

  const captures: HTMLCanvasElement[] = [];
  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (doc, el) => sanitizeClonedColors(doc, el),
    });
    captures.push(canvas);
  }

  // ── Restore UI state
  restoreLight();
  for (const { el, prev } of overflowFixes) {
    el.style.overflow = prev;
  }
  pdfOnlyEls.forEach((el) => (el.style.display = "none"));
  if (prevTheme) {
    document.documentElement.setAttribute("data-theme", prevTheme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  // ── Layout planning ──────────────────────────────────────────────
  interface Placement { page: number; y: number; drawW: number; drawH: number }
  const placements: Placement[] = [];
  let curPage = 0;
  let curY = CONTENT_TOP;

  for (const canvas of captures) {
    const scale = 2.5;
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
  const totalPages = contentPages + 1; // +1 cover

  // ── Build PDF ────────────────────────────────────────────────────
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Page 1 — Cover
  await drawCoverPage(pdf, title, options);

  // Content pages
  let lastPage = -1;

  for (let i = 0; i < captures.length; i++) {
    const pl = placements[i];

    while (lastPage < pl.page) {
      pdf.addPage();
      lastPage++;
      drawPageChrome(pdf, title, lastPage + 2, totalPages);
    }

    const ox = pl.drawW < USABLE_W ? MX + (USABLE_W - pl.drawW) / 2 : MX;

    // Subtle card shadow
    pdf.setFillColor(218, 222, 228);
    pdf.roundedRect(ox + 0.6, pl.y + 0.6, pl.drawW, pl.drawH, 1.5, 1.5, "F");

    // White card background
    pdf.setFillColor(...WHITE);
    pdf.roundedRect(ox, pl.y, pl.drawW, pl.drawH, 1.5, 1.5, "F");

    // Image content
    const imgData = captures[i].toDataURL("image/png");
    pdf.addImage(imgData, "PNG", ox + 0.5, pl.y + 0.5, pl.drawW - 1, pl.drawH - 1);

    // Card border
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(ox, pl.y, pl.drawW, pl.drawH, 1.5, 1.5, "S");
  }

  pdf.save(`${filename}.pdf`);
}
