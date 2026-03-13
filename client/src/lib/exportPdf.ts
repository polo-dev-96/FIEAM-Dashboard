import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ─── A4 Landscape Constants (mm) ────────────────────────────────────
const PW = 297;
const PH = 210;
const MX = 15;
const MY = 12;

// ─── Professional Color Palette ─────────────────────────────────────
const NAVY      = [12, 33, 53]     as const; // #0C2135
const NAVY_L    = [20, 45, 70]     as const; // lighter navy
const ACCENT    = [0, 159, 227]    as const; // #009FE3
const ACCENT_D  = [0, 120, 180]    as const; // darker cyan
const TEXT_DARK  = [30, 41, 59]     as const; // #1e293b
const TEXT_MID   = [100, 116, 139]  as const; // #64748b
const TEXT_LIGHT = [148, 163, 184]  as const; // #94a3b8
const BORDER     = [226, 232, 240]  as const; // #e2e8f0
const BG_PAGE    = [245, 247, 250]  as const; // #f5f7fa
const WHITE      = [255, 255, 255]  as const;

const USABLE_W   = PW - MX * 2;
const HEADER_H   = 13;
const FOOTER_H   = 10;
const CONTENT_TOP = MY + HEADER_H + 7;
const CONTENT_BOT = PH - MY - FOOTER_H - 3;
const GAP = 5;

// ─── Helper: formatted timestamp ────────────────────────────────────
function timestamp() {
  const now = new Date();
  const d = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const t = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Gerado em ${d} às ${t}`;
}

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
  const [poloLogo, logoFIEAM, logoSESI, logoSENAI, logoIEL] = await Promise.all([
    loadImageAsDataUrl("/Icone_Logo.png"),
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

  // Polo logo — centered vertically on the right
  if (poloLogo) {
    const pSize = 38;
    const pX = PW - MX - pSize / 2 - 20;
    const pY = PH / 2 - pSize / 2;
    pdf.addImage(poloLogo, "PNG", pX, pY, pSize, pSize);
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

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════
export interface PdfExportOptions {
  subtitle?: string;
  period?: string;
}

export async function exportElementToPdf(
  container: HTMLElement,
  filename: string,
  title: string,
  options?: PdfExportOptions
) {
  // ── Force light theme during capture
  const prevTheme = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", "light");

  // ── Reveal PDF-only elements
  const pdfOnlyEls = container.querySelectorAll("[data-pdf-only]") as NodeListOf<HTMLElement>;
  pdfOnlyEls.forEach((el) => (el.style.display = ""));

  await new Promise((r) => setTimeout(r, 200));

  // ── Capture DOM sections
  const children = Array.from(container.children) as HTMLElement[];
  const sections = children.filter((el) => !el.hasAttribute("data-pdf-exclude"));

  const captures: HTMLCanvasElement[] = [];
  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    captures.push(canvas);
  }

  // ── Restore UI state
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
