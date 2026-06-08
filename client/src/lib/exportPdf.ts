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


// Cor de trilho para barras/progressos no PDF claro.
const PDF_BAR_TRACK = "#e2e8f0";
const PDF_BAR_FILL_DEFAULT = "#009FE3";

function cssClassText(el: Element): string {
  const cls = (el as HTMLElement).className;
  return typeof cls === "string" ? cls : "";
}

function hasVisibleGradient(cs: CSSStyleDeclaration): boolean {
  return Boolean(cs.backgroundImage && cs.backgroundImage !== "none");
}

function isModernUnsupportedCssColor(value: string): boolean {
  return /(color-mix|oklch|oklab|lch|lab|display-p3)\s*\(/i.test(value || "");
}

function isBarLikeElement(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
  if (el.closest("[data-pdf-no-bar-fix]")) return false;

  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;

  // Barras horizontais de dashboard costumam ser largas e baixas.
  const isHorizontalPill = rect.width >= 40 && rect.height >= 4 && rect.height <= 38;
  if (!isHorizontalPill) return false;

  const cls = cssClassText(el).toLowerCase();
  const radius = Number.parseFloat(cs.borderRadius || "0") || 0;
  const hasPillShape =
    radius >= Math.min(rect.height / 3, 12) ||
    cls.includes("rounded-full") ||
    cls.includes("rounded") ||
    cls.includes("progress") ||
    el.getAttribute("role") === "progressbar" ||
    el.hasAttribute("aria-valuenow") ||
    el.hasAttribute("data-pdf-progress") ||
    el.hasAttribute("data-pdf-progress-track") ||
    el.hasAttribute("data-pdf-progress-fill");

  return hasPillShape;
}

type PdfBarKind = "track" | "fill" | null;

function classifyPdfBarElement(el: HTMLElement, cs: CSSStyleDeclaration): PdfBarKind {
  if (el.hasAttribute("data-pdf-progress-fill")) return "fill";
  if (el.hasAttribute("data-pdf-progress-track") || el.hasAttribute("data-pdf-progress")) return "track";
  if (el.getAttribute("role") === "progressbar" || el.hasAttribute("aria-valuenow")) return "track";

  if (!isBarLikeElement(el, cs)) return null;

  const rect = el.getBoundingClientRect();
  const parent = el.parentElement;
  const parentCs = parent ? parent.ownerDocument.defaultView?.getComputedStyle(parent) ?? getComputedStyle(parent) : null;
  const parentRect = parent ? parent.getBoundingClientRect() : null;
  const parentLooksLikeTrack = Boolean(
    parent && parentCs && parentRect && isBarLikeElement(parent, parentCs as CSSStyleDeclaration)
  );

  const parsedBg = parseColor(cs.backgroundColor);
  const hasColorfulBg = Boolean(
    parsedBg &&
      luminance(parsedBg) > 35 &&
      Math.max(...parsedBg) - Math.min(...parsedBg) > 35
  );

  const cls = cssClassText(el).toLowerCase();
  const hasExplicitWidth =
    Boolean(el.style.width && el.style.width !== "auto") ||
    /\bw-\[|\bw-\d|width|basis-/.test(cls);

  // O preenchimento costuma ser filho de um trilho, ter width percentual/dinâmico
  // e usar cor forte ou gradiente. O trilho costuma ter fundo escuro/cinza.
  if (parentLooksLikeTrack && (hasVisibleGradient(cs) || hasColorfulBg || hasExplicitWidth || rect.width < parentRect!.width - 2)) {
    return "fill";
  }

  return "track";
}

function fallbackColorForProgressFill(el: HTMLElement, cs: CSSStyleDeclaration): string {
  const cls = cssClassText(el).toLowerCase();

  if (cls.includes("green") || cls.includes("emerald")) return "#10b981";
  if (cls.includes("red") || cls.includes("rose")) return "#ef4444";
  if (cls.includes("orange") || cls.includes("amber")) return "#f59e0b";
  if (cls.includes("blue") || cls.includes("cyan") || cls.includes("sky")) return "#009FE3";
  if (cls.includes("teal")) return "#14b8a6";

  const parsed = parseColor(cs.backgroundColor);
  if (parsed && luminance(parsed) > 35) {
    return `rgb(${parsed[0]}, ${parsed[1]}, ${parsed[2]})`;
  }

  return PDF_BAR_FILL_DEFAULT;
}

function forceLightInlineStyles(root: HTMLElement): () => void {
  const saved: Array<{ el: HTMLElement; bg: string; bgImage: string; color: string; borderColor: string }> = [];

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
    const orig = { bg: el.style.backgroundColor, bgImage: el.style.backgroundImage, color: el.style.color, borderColor: el.style.borderColor };

    const barKind = classifyPdfBarElement(el, cs);

    // Detecta fundo escuro por luminância (cobre rgb(), rgba() com qualquer alpha e hex).
    // Importante: trilhos de barras/progressos NÃO devem virar branco, senão somem no PDF.
    const parsedBg = parseColor(cs.backgroundColor);
    if (barKind === "track" && parsedBg && luminance(parsedBg) < 130) {
      el.style.backgroundColor = PDF_BAR_TRACK;
      touched = true;
    } else if (barKind === "fill") {
      // Mantém gradientes simples dos preenchimentos. Se o gradiente usa color-mix/oklch,
      // troca por uma cor sólida segura para o html2canvas.
      if (hasVisibleGradient(cs) && isModernUnsupportedCssColor(cs.backgroundImage)) {
        el.style.backgroundImage = "none";
        el.style.backgroundColor = fallbackColorForProgressFill(el, cs);
        touched = true;
      } else if (!hasVisibleGradient(cs) && (!parsedBg || luminance(parsedBg) < 25)) {
        el.style.backgroundColor = fallbackColorForProgressFill(el, cs);
        touched = true;
      }
    } else if (parsedBg && luminance(parsedBg) < 100) {
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
    for (const { el, bg, bgImage, color, borderColor } of saved) {
      el.style.backgroundColor = bg;
      el.style.backgroundImage = bgImage;
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

  /**
   * Seletor usado para escolher as seções do PDF.
   * Padrão: [data-pdf-section]
   *
   * Recomendado no JSX/HTML:
   *   <div data-pdf-section>...</div>
   */
  sectionSelector?: string;

  /**
   * Escala principal do html2canvas.
   * Quanto maior, mais qualidade e mais memória.
   * Padrão: 2.5
   */
  captureScale?: number;
}

interface RestoreInlineStyle {
  el: HTMLElement;
  prop: string;
  prev: string;
}

function restoreInlineStyles(items: RestoreInlineStyle[]) {
  for (const { el, prop, prev } of items) {
    try {
      (el.style as unknown as Record<string, string>)[prop] = prev;
    } catch {
      // Ignora erro de restauração isolado para não impedir os demais restores.
    }
  }
}

function isRenderablePdfSection(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getPdfSections(container: HTMLElement, selector = "[data-pdf-section]"): HTMLElement[] {
  let marked: HTMLElement[] = [];

  try {
    marked = [
      ...(container.matches(selector) ? [container] : []),
      ...Array.from(container.querySelectorAll<HTMLElement>(selector)),
    ];
  } catch (e) {
    console.warn(`[exportPdf] Seletor inválido em options.sectionSelector: ${selector}`, e);
  }

  const cleanMarked = marked.filter((el) => {
    if (el.hasAttribute("data-pdf-exclude")) return false;
    if (el.closest("[data-pdf-exclude]")) return false;
    return isRenderablePdfSection(el);
  });

  // Evita duplicar capturas quando um [data-pdf-section] está dentro de outro.
  const topLevelMarked = cleanMarked.filter(
    (el) => !cleanMarked.some((other) => other !== el && other.contains(el))
  );

  if (topLevelMarked.length > 0) return topLevelMarked;

  // Fallback: mantém o comportamento antigo, capturando filhos diretos.
  return (Array.from(container.children) as HTMLElement[]).filter((el) => {
    if (el.hasAttribute("data-pdf-exclude")) return false;
    if (el.closest("[data-pdf-exclude]")) return false;
    return isRenderablePdfSection(el);
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/*
 * exportElementToPdf(container, filename, title, options?)
 * -------------------------------------------------------
 * Modificações principais:
 *   1. Agora prioriza elementos marcados com [data-pdf-section].
 *      Isso evita capturar grids inteiras com colunas vazias.
 *   2. Se não houver [data-pdf-section], mantém o comportamento antigo.
 *   3. Usa try/finally para restaurar tema, estilos, overflow, filtros,
 *      background-image, SVG e elementos [data-pdf-only], mesmo se der erro.
 *   4. Restaura o display original dos elementos [data-pdf-only], em vez de
 *      forçar sempre display:none.
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

  const prevTheme = document.documentElement.getAttribute("data-theme");
  const pdfOnlyEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-only]"));
  const pdfOnlyDisplays = pdfOnlyEls.map((el) => ({ el, display: el.style.display }));

  let restoreLight: (() => void) | null = null;

  const overflowFixes: RestoreInlineStyle[] = [];
  const filterFixes: RestoreInlineStyle[] = [];
  const bgImageFixes: RestoreInlineStyle[] = [];
  const svgFillFixes: Array<{ el: SVGElement; hadAttr: boolean; prev: string | null }> = [];

  interface Capture {
    canvas: HTMLCanvasElement;
    scale: number;
    section: HTMLElement;
  }

  const captures: Capture[] = [];

  function saveStyle(el: HTMLElement, prop: keyof CSSStyleDeclaration, list: RestoreInlineStyle[]) {
    const style = el.style as unknown as Record<string, string>;
    list.push({ el, prop: String(prop), prev: String(style[String(prop)] ?? "") });
  }

  function sanitizeClonedColors(doc: Document, root: HTMLElement) {
    // Remove efeitos que costumam quebrar o html2canvas em produção.
    const safeStyle = doc.createElement("style");
    safeStyle.textContent =
      "*, *::before, *::after, *::backdrop { " +
      "overflow: visible !important; " +
      "filter: none !important; " +
      "-webkit-filter: none !important; " +
      "backdrop-filter: none !important; " +
      "-webkit-backdrop-filter: none !important; " +
      "box-shadow: none !important; } " +
      "[data-fieam-surface='true'] { overflow: hidden !important; } " +
      "[class*='blur-3xl'],[class*='blur-2xl'],[class*='blur-xl'] { display: none !important; }";
    (doc.head ?? doc.documentElement).appendChild(safeStyle);

    // Corrige CSS minificado que usa funções modernas de cor não suportadas pelo html2canvas.
    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      const modernFns = /\b(color-mix|oklch|oklab|lch|lab)\s*\(/i;
      if (!modernFns.test(styleEl.textContent)) return;

      let css = styleEl.textContent;
      css = css.replace(/\b(oklch|oklab|lch|lab)\([^)]*\)/gi, "#e2e8f0");
      css = css.replace(/color-mix\([^;{}]*\)/gi, "transparent");
      styleEl.textContent = css;
    });

    const unsafePattern = /^(color-mix|oklch|oklab|lch|lab|display-p3|color)\s*\(/i;
    const modernAnywhereInBg = /(color-mix|oklch|oklab|lch|lab|display-p3)\s*\(/i;
    const all = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];

    for (const el of all) {
      const cs = doc.defaultView?.getComputedStyle(el);
      if (!cs) continue;

      if (unsafePattern.test(cs.backgroundColor)) el.style.backgroundColor = "transparent";
      if (unsafePattern.test(cs.color)) el.style.color = "#0f172a";
      if (unsafePattern.test(cs.borderTopColor)) el.style.borderColor = "#e2e8f0";
      if (unsafePattern.test(cs.borderBottomColor)) el.style.borderColor = "#e2e8f0";
      if (unsafePattern.test(cs.borderLeftColor)) el.style.borderColor = "#e2e8f0";
      if (unsafePattern.test(cs.borderRightColor)) el.style.borderColor = "#e2e8f0";
      if (unsafePattern.test(cs.outlineColor)) el.style.outline = "none";
      if (cs.boxShadow && unsafePattern.test(cs.boxShadow)) el.style.boxShadow = "none";

      const barKind = classifyPdfBarElement(el, cs);
      const parsedBg = parseColor(cs.backgroundColor);
      if (barKind === "track" && parsedBg && luminance(parsedBg) < 130) {
        el.style.backgroundColor = PDF_BAR_TRACK;
      }
      if (barKind === "fill" && hasVisibleGradient(cs) && isModernUnsupportedCssColor(cs.backgroundImage)) {
        el.style.backgroundImage = "none";
        el.style.backgroundColor = fallbackColorForProgressFill(el, cs);
      }

      if (cs.filter && cs.filter !== "none") el.style.filter = "none";
      if (cs.backdropFilter && cs.backdropFilter !== "none") {
        (el.style as CSSStyleDeclaration & { backdropFilter?: string }).backdropFilter = "none";
      }

      if (
        cs.backgroundImage &&
        cs.backgroundImage !== "none" &&
        (unsafePattern.test(cs.backgroundImage) || modernAnywhereInBg.test(cs.backgroundImage))
      ) {
        const barKindForBg = classifyPdfBarElement(el, cs);
        el.style.backgroundImage = "none";
        if (barKindForBg === "fill") {
          el.style.backgroundColor = fallbackColorForProgressFill(el, cs);
        }
      }

      if (cs.overflow === "hidden" && (el.classList.contains("truncate") || el.closest("[data-fieam-surface]"))) {
        el.style.overflow = "visible";
      }
    }

    // Resolve fills SVG com url(#gradient), comum em gráficos Recharts.
    try {
      root.querySelectorAll("[fill]").forEach((svgEl) => {
        const fill = svgEl.getAttribute("fill") ?? "";
        const match = fill.match(/^url\(#([^)]+)\)$/);
        if (!match) return;

        const grad = doc.getElementById(match[1]);
        if (!grad) return;

        const stops = Array.from(grad.querySelectorAll("stop"));
        if (!stops.length) return;

        const mid = stops[Math.floor(stops.length / 2)] || stops[0];
        const color =
          mid.getAttribute("stop-color") ||
          (mid as unknown as HTMLElement).style.getPropertyValue("stop-color") ||
          "#009FE3";

        svgEl.setAttribute("fill", color);
      });
    } catch (e) {
      console.warn("[exportPdf] sanitizeClonedColors SVG falhou:", e);
    }
  }

  try {
    document.documentElement.setAttribute("data-theme", "light");

    // Mostra temporariamente elementos que só aparecem no PDF.
    pdfOnlyEls.forEach((el) => {
      el.style.display = "";
    });

    // Tempo maior porque gráficos, tema claro e fontes podem precisar re-renderizar.
    await wait(1500);

    restoreLight = forceLightInlineStyles(container);

    // Evita cortes de texto causados por truncate/overflow-hidden.
    const allTextEls = container.querySelectorAll<HTMLElement>("[class*='truncate'], [class*='overflow-hidden']");
    for (const el of Array.from(allTextEls)) {
      const cs = getComputedStyle(el);
      // Progress bars usam overflow-hidden para manter a borda arredondada.
      // Não mexer nelas evita perder o layout visual das barras.
      if (isBarLikeElement(el, cs)) continue;
      saveStyle(el, "overflow", overflowFixes);
      el.style.overflow = "visible";
    }

    saveStyle(container, "overflow", overflowFixes);
    container.style.overflow = "visible";

    // Remove filtros/blur que podem quebrar o html2canvas.
    container.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.filter && cs.filter !== "none") {
        saveStyle(el, "filter", filterFixes);
        el.style.filter = "none";
      }
    });

    // Remove apenas background-image com color-mix/oklch/oklab/lch/lab.
    // Não remove gradientes simples, porque eles desenham as barras do layout.
    const modernInAnyBg = /(color-mix|oklch|oklab|lch|lab|display-p3)\s*\(/i;
    container.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && modernInAnyBg.test(cs.backgroundImage)) {
        saveStyle(el, "backgroundImage", bgImageFixes);
        el.style.backgroundImage = "none";

        if (classifyPdfBarElement(el, cs) === "fill") {
          saveStyle(el, "backgroundColor", bgImageFixes);
          el.style.backgroundColor = fallbackColorForProgressFill(el, cs);
        }
      }
    });

    // Resolve SVG fill="url(#id)" no DOM original antes da captura.
    container.querySelectorAll<SVGElement>("[fill]").forEach((el) => {
      const fill = el.getAttribute("fill") ?? "";
      const match = fill.match(/^url\(#([^)]+)\)$/);
      if (!match) return;

      const grad = document.getElementById(match[1]);
      if (!grad) return;

      const stops = Array.from(grad.querySelectorAll("stop"));
      if (!stops.length) return;

      const mid = stops[Math.floor(stops.length / 2)] || stops[0];
      const color = mid.getAttribute("stop-color") ?? "#009FE3";

      svgFillFixes.push({ el, hadAttr: el.hasAttribute("fill"), prev: fill });
      el.setAttribute("fill", color);
    });

    await wait(250);

    const sections = getPdfSections(container, options?.sectionSelector ?? "[data-pdf-section]");

    if (sections.length === 0) {
      throw new Error(
        "Nenhuma seção encontrada para exportar. Marque os blocos desejados com data-pdf-section ou verifique data-pdf-exclude."
      );
    }

    for (const section of sections) {
      const sectionLabel =
        section.getAttribute("data-pdf-title") ||
        section.getAttribute("data-section") ||
        section.getAttribute("data-pdf-section") ||
        section.className?.toString().slice(0, 60) ||
        "unnamed";

      let captured = false;
      const mainScale = Number(section.getAttribute("data-pdf-scale")) || options?.captureScale || 2.5;

      try {
        const canvas = await html2canvas(section, {
          scale: mainScale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (doc, el) => sanitizeClonedColors(doc, el),
        });

        if (!canvas.width || !canvas.height) {
          throw new Error("Canvas vazio gerado pelo html2canvas");
        }

        captures.push({ canvas, scale: mainScale, section });
        captured = true;
      } catch (e) {
        console.warn(`[exportPdf] html2canvas falhou em "${sectionLabel}" com scale ${mainScale}:`, e);
      }

      // Fallback com escala menor: consome menos memória e costuma recuperar gráficos grandes.
      if (!captured) {
        try {
          const canvas = await html2canvas(section, {
            scale: 1,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (doc, el) => sanitizeClonedColors(doc, el),
          });

          if (!canvas.width || !canvas.height) {
            throw new Error("Canvas vazio gerado pelo html2canvas no fallback");
          }

          captures.push({ canvas, scale: 1, section });
          captured = true;
          console.warn(`[exportPdf] Recuperado "${sectionLabel}" com scale 1 fallback`);
        } catch (e) {
          console.error(`[exportPdf] html2canvas também falhou em "${sectionLabel}" com scale 1:`, e);
        }
      }
    }

    if (captures.length === 0) {
      throw new Error("Nenhuma seção pôde ser capturada para o PDF");
    }
  } finally {
    // Esta restauração roda mesmo quando der erro no html2canvas.
    try {
      restoreLight?.();
    } catch (e) {
      console.warn("[exportPdf] Falha ao restaurar estilos light:", e);
    }

    restoreInlineStyles(overflowFixes);
    restoreInlineStyles(filterFixes);
    restoreInlineStyles(bgImageFixes);

    for (const { el, hadAttr, prev } of svgFillFixes) {
      try {
        if (hadAttr && prev !== null) el.setAttribute("fill", prev);
        else el.removeAttribute("fill");
      } catch {
        // Ignora falha isolada.
      }
    }

    for (const { el, display } of pdfOnlyDisplays) {
      el.style.display = display;
    }

    if (prevTheme) {
      document.documentElement.setAttribute("data-theme", prevTheme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  // ── Layout planning ──────────────────────────────────────────────
  interface Placement {
    page: number;
    y: number;
    drawW: number;
    drawH: number;
  }

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
  const totalPages = contentPages + 1; // +1 cover

  // ── Build PDF ────────────────────────────────────────────────────
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
