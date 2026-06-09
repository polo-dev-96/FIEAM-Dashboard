// ============================================================
// exportPptx.ts — Exportação do dashboard para PowerPoint (.pptx)
// ============================================================
// Usa html2canvas para capturar seções do DOM como imagens e
// pptxgenjs para montar o arquivo .pptx com slide de capa +
// um slide por seção capturada.
// ============================================================

export interface PptxExportOptions {
  subtitle?: string;
  period?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function timestamp() {
  const now = new Date();
  const d = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const t = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Gerado em ${d} às ${t}`;
}

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

// ── Color utilities (reused from exportPdf logic) ─────────────

function parseColor(input: string): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgb) return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
  return null;
}

function luminance(rgb: [number, number, number]) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

const PDF_TEXT_DARK = "#0f172a";
const cssModernColor = /(color-mix|oklch|oklab|lch|lab|display-p3|color\()/i;

function safeColor(value: string, fallback: string) {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)" || cssModernColor.test(value))
    return fallback;
  return value;
}

function safeTextColor(value: string) {
  const parsed = parseColor(value);
  if (!parsed) return PDF_TEXT_DARK;
  return luminance(parsed) >= 170 ? PDF_TEXT_DARK : value;
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

function rectOf(el: Element) {
  return el.getBoundingClientRect();
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
    (radius >= rect.height / 3 ||
      /progress|bar|rounded-full|h-\d|h-\[|bg-ds-accent|bg-\[|from-|to-/i.test(cls) ||
      role === "progressbar")
  );
}

function inferBrandColor(el: Element, cs: CSSStyleDeclaration) {
  const cls = classText(el).toLowerCase();
  const bgImageRgb = firstRgbFromCss(cs.backgroundImage || "");
  if (bgImageRgb && luminance(bgImageRgb) > 25) return `rgb(${bgImageRgb[0]}, ${bgImageRgb[1]}, ${bgImageRgb[2]})`;
  if (/green|emerald|success|dentro|prazo/.test(cls)) return "#10b981";
  if (/red|rose|danger|destructive|fora|error/.test(cls)) return "#ef4444";
  if (/orange|amber|warning|instagram/.test(cls)) return "#f97316";
  return "#009FE3";
}

function safeBackgroundColor(source: Element, cs: CSSStyleDeclaration) {
  const parsed = parseColor(cs.backgroundColor);
  const hasBgImage = Boolean(cs.backgroundImage && cs.backgroundImage !== "none");

  if (isBarLike(source, cs)) {
    const parent = (source as HTMLElement).parentElement;
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

// ── Main export function ──────────────────────────────────────

export async function exportElementToPptx(
  container: HTMLElement,
  filename: string,
  title: string,
  options?: PptxExportOptions
) {
  const { default: html2canvas } = await import("html2canvas");
  // pptxgenjs has a default export that is a class
  const pptxModule = await import("pptxgenjs");
  const PptxGenJS  = pptxModule.default;
  // pptxgenjs accepts string shape names; "rect" is the rectangle type
  const RECT       = "rect" as any;

  type Capture = { dataUrl: string; width: number; height: number; label: string };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const prevTheme = document.documentElement.getAttribute("data-theme");
  const pdfOnlyEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-only]"));
  const pdfOnlyPrevious = pdfOnlyEls.map((el) => ({ el, display: el.style.display }));
  let stagingRoot: HTMLDivElement | null = null;

  // ── Inline style snapshot ─────────────────────────────────

  function inlineSnapshotStyles(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
    const layoutProps = [
      "display","position","left","top","right","bottom","zIndex","boxSizing",
      "flexDirection","flexWrap","alignItems","alignContent","justifyContent",
      "gap","rowGap","columnGap","gridTemplateColumns","gridTemplateRows",
      "gridAutoColumns","gridAutoRows","gridColumn","gridRow","flex","flexGrow",
      "flexShrink","flexBasis","order","paddingTop","paddingRight","paddingBottom",
      "paddingLeft","marginTop","marginRight","marginBottom","marginLeft",
      "fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing",
      "textAlign","textTransform","whiteSpace","wordBreak","borderTopWidth",
      "borderRightWidth","borderBottomWidth","borderLeftWidth","borderTopStyle",
      "borderRightStyle","borderBottomStyle","borderLeftStyle","borderTopLeftRadius",
      "borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius",
      "objectFit","objectPosition","verticalAlign","opacity","transform","transformOrigin",
    ];

    const sourceEls = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll("*"))] as Element[];
    const cloneEls  = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll("*"))] as Element[];

    for (let i = 0; i < sourceEls.length; i++) {
      const source = sourceEls[i] as HTMLElement;
      const clone  = cloneEls[i] as HTMLElement | undefined;
      if (!clone) continue;

      const cs   = getComputedStyle(source);
      const rect = rectOf(source);
      const style = clone.style;
      const isSvgShape = source instanceof SVGElement && !(source instanceof SVGSVGElement);

      if (!isSvgShape) {
        for (const prop of layoutProps) {
          const value = cs.getPropertyValue(prop);
          if (value) style.setProperty(prop, value, "important");
        }
        style.setProperty("width",     `${Math.max(1, rect.width)}px`,  "important");
        style.setProperty("min-width", `${Math.max(1, rect.width)}px`,  "important");
        style.setProperty("max-width", `${Math.max(1, rect.width)}px`,  "important");
        if (rect.height > 0) style.setProperty("min-height", `${rect.height}px`, "important");
      }

      style.setProperty("color",            safeTextColor(cs.color),                "important");
      style.setProperty("background-color", safeBackgroundColor(source, cs),        "important");
      style.setProperty("background-image", "none",                                 "important");
      style.setProperty("box-shadow",       "none",                                 "important");
      style.setProperty("filter",           "none",                                 "important");
      style.setProperty("-webkit-filter",   "none",                                 "important");
      style.setProperty("backdrop-filter",  "none",                                 "important");
      style.setProperty("border-color",     safeColor(cs.borderTopColor, "#e2e8f0"), "important");

      if (/truncate/i.test(classText(source))) {
        style.setProperty("overflow", "visible", "important");
        style.setProperty("text-overflow", "clip", "important");
      } else if (isBarLike(source, cs)) {
        style.setProperty("overflow", "hidden", "important");
      } else {
        style.setProperty("overflow", cs.overflow === "clip" ? "hidden" : cs.overflow, "important");
      }

      if (clone instanceof SVGElement) {
        const fill   = source.getAttribute("fill")   || cs.fill   || "";
        const stroke = source.getAttribute("stroke") || cs.stroke || "";
        if (fill && fill !== "none" && !fill.startsWith("url(")) {
          const p = parseColor(fill);
          clone.setAttribute("fill", p && luminance(p) >= 170 ? PDF_TEXT_DARK : safeColor(fill, PDF_TEXT_DARK));
        }
        const isTextNode = clone.tagName === "text" || clone.tagName === "tspan";
        if (isTextNode) {
          clone.setAttribute("stroke", "none");
          clone.setAttribute("stroke-width", "0");
          clone.style?.removeProperty?.("paint-order");
        } else if (stroke && stroke !== "none" && !stroke.startsWith("url(")) {
          clone.setAttribute("stroke", safeColor(stroke, "#009FE3"));
        }
      }

      clone.removeAttribute("class");
    }

    resolveSvgGradientRefs(cloneRoot, document);
  }

  function copyCanvasContent(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
    const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
    const cloneCanvases  = Array.from(cloneRoot.querySelectorAll("canvas"));
    sourceCanvases.forEach((sourceCanvas, idx) => {
      const cloneCanvas = cloneCanvases[idx];
      if (!cloneCanvas) return;
      try {
        const img = document.createElement("img");
        img.src    = sourceCanvas.toDataURL("image/png");
        img.width  = sourceCanvas.width;
        img.height = sourceCanvas.height;
        img.style.width  = `${sourceCanvas.getBoundingClientRect().width}px`;
        img.style.height = `${sourceCanvas.getBoundingClientRect().height}px`;
        cloneCanvas.replaceWith(img);
      } catch {
        try {
          cloneCanvas.width  = sourceCanvas.width;
          cloneCanvas.height = sourceCanvas.height;
          cloneCanvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0);
        } catch { /* tainted canvas */ }
      }
    });
  }

  async function waitForImages(root: HTMLElement) {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
    }));
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
    const cs  = win.getComputedStyle(el);
    if (cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none") return true;
    if (el instanceof SVGElement) return false;
    const cls = classText(el);
    if (/blur-(3xl|2xl|xl)|animate-|motion-|pulse|ping|spin|skeleton/i.test(cls)) return true;
    const rect = rectOf(el);
    if (rect.width === 0 || rect.height === 0) return true;
    return false;
  }

  function collectSections() {
    const explicit = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-section]"))
      .filter((el) => !el.hasAttribute("data-pdf-exclude") && hasMeaningfulContent(el));
    if (explicit.length > 0) return explicit;

    const direct = Array.from(container.children) as HTMLElement[];
    const result: HTMLElement[] = [];
    for (const el of direct) {
      if (el.hasAttribute("data-pdf-exclude") || !hasMeaningfulContent(el)) continue;
      const cls = classText(el);
      const shouldSplitGrid = /grid-cols-\[1fr_300px\]|grid-cols-\[minmax|ranking|assuntos/i.test(cls);
      if (shouldSplitGrid) {
        const useful = (Array.from(el.children) as HTMLElement[]).filter(
          (c) => !c.hasAttribute("data-pdf-exclude") && hasMeaningfulContent(c)
        );
        if (useful.length) { result.push(...useful); continue; }
      }
      result.push(el);
    }
    return result;
  }

  async function createSnapshot(section: HTMLElement) {
    if (!stagingRoot) {
      stagingRoot = document.createElement("div");
      stagingRoot.setAttribute("data-pptx-staging", "true");
      stagingRoot.style.cssText = [
        "position:fixed","left:-100000px","top:0","z-index:-1",
        "pointer-events:none","background:#ffffff","overflow:visible",
      ].join(";");
      document.body.appendChild(stagingRoot);
    }

    const rect    = rectOf(section);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = [
      `width:${Math.ceil(Math.max(1, rect.width))}px`,
      `min-height:${Math.ceil(Math.max(1, rect.height))}px`,
      "background:#ffffff","overflow:visible","contain:layout style paint",
    ].join(";");

    const clone = section.cloneNode(true) as HTMLElement;
    clone.style.setProperty("margin",           "0",    "important");
    clone.style.setProperty("background-image", "none", "important");
    clone.style.setProperty("filter",           "none", "important");
    clone.style.setProperty("box-shadow",       "none", "important");
    wrapper.appendChild(clone);
    stagingRoot.appendChild(wrapper);

    copyCanvasContent(section, clone);
    inlineSnapshotStyles(section, clone);
    await waitForImages(wrapper);
    await sleep(80);

    return { wrapper, clone };
  }

  function isCanvasBlank(canvas: HTMLCanvasElement) {
    if (canvas.width < 4 || canvas.height < 4) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const sW = Math.min(canvas.width, 220);
    const sH = Math.min(canvas.height, 140);
    const stepX = Math.max(1, Math.floor(canvas.width / sW));
    const stepY = Math.max(1, Math.floor(canvas.height / sH));
    let total = 0, nonWhite = 0;
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          const idx = (y * canvas.width + x) * 4;
          total++;
          if (data[idx + 3] > 20 && !(data[idx] > 246 && data[idx+1] > 246 && data[idx+2] > 246)) nonWhite++;
        }
      }
    } catch { return false; }
    return total > 0 && nonWhite / total < 0.003;
  }

  async function captureSection(section: HTMLElement, label: string): Promise<Capture | null> {
    for (const scale of [2.2, 1.4, 1]) {
      let snapshot: { wrapper: HTMLElement; clone: HTMLElement } | null = null;
      try {
        snapshot = await createSnapshot(section);
        const rect   = rectOf(snapshot.clone);
        const width  = Math.max(1, Math.ceil(rect.width));
        const height = Math.max(1, Math.ceil(rect.height));

        const canvas = await html2canvas(snapshot.clone, {
          scale,
          width,
          height,
          windowWidth:  width,
          windowHeight: height,
          useCORS:         true,
          allowTaint:      true,
          backgroundColor: "#ffffff",
          logging:         false,
          removeContainer: true,
          ignoreElements: (el) => {
            // Fix: skip Radix UI portals and popper layers that cause null-parent errors
            if (el.hasAttribute("data-radix-portal")) return true;
            if (el.hasAttribute("data-radix-popper-content-wrapper")) return true;
            if (el.closest?.("[data-radix-portal]")) return true;
            if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false;
            return isDecorative(el) || el.hasAttribute("data-pdf-exclude");
          },
          onclone: (doc) => {
            doc.querySelectorAll("style, link[rel='stylesheet']").forEach((n) => n.remove());
            const s = doc.createElement("style");
            s.textContent =
              "*,*::before,*::after{background-image:none!important;filter:none!important;" +
              "-webkit-filter:none!important;backdrop-filter:none!important;" +
              "-webkit-backdrop-filter:none!important;box-shadow:none!important;}";
            // Fix: use documentElement as fallback if head is null
            (doc.head ?? doc.documentElement).appendChild(s);
          },
        });

        if (!isCanvasBlank(canvas)) {
          return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width / scale, height: canvas.height / scale, label };
        }
        console.warn(`[exportPptx] captura vazia em "${label}" com scale ${scale}`);
      } catch (e) {
        console.warn(`[exportPptx] html2canvas falhou em "${label}" com scale ${scale}:`, e);
      } finally {
        snapshot?.wrapper.remove();
      }
    }
    return null;
  }

  async function captureWithFallback(section: HTMLElement): Promise<Capture[]> {
    const label = section.getAttribute("data-pdf-title") || section.getAttribute("data-section") || classText(section).slice(0, 80) || "seção";
    const main  = await captureSection(section, label);
    if (main) return [main];

    const recovered: Capture[] = [];
    for (const child of Array.from(section.children) as HTMLElement[]) {
      if (child.hasAttribute("data-pdf-exclude") || !hasMeaningfulContent(child)) continue;
      const childLabel = child.getAttribute("data-pdf-title") || classText(child).slice(0, 80) || "filho";
      const c = await captureSection(child, childLabel);
      if (c) recovered.push(c);
    }
    return recovered;
  }

  // ── Capture phase ─────────────────────────────────────────

  let captures: Capture[] = [];

  try {
    document.documentElement.setAttribute("data-theme", "light");
    pdfOnlyEls.forEach((el) => (el.style.display = ""));

    await sleep(900);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const sections = collectSections();
    if (sections.length === 0) throw new Error("Nenhuma seção encontrada para exportar.");

    for (const section of sections) {
      const recovered = await captureWithFallback(section);
      captures.push(...recovered);
    }

    captures = captures.filter((c) => c.width > 0 && c.height > 0);
    if (captures.length === 0) throw new Error("Nenhuma seção pôde ser capturada para o PowerPoint.");
  } finally {
    if (stagingRoot) (stagingRoot as HTMLDivElement).remove();
    for (const { el, display } of pdfOnlyPrevious) el.style.display = display;
    if (prevTheme) document.documentElement.setAttribute("data-theme", prevTheme);
    else document.documentElement.removeAttribute("data-theme");
  }

  // ── Assemble PPTX ────────────────────────────────────────
  // LAYOUT_WIDE = 13.33" × 7.5"
  const SW = 13.33;
  const SH = 7.5;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // ── Load logos ────────────────────────────────────────────
  const logoSrcs = [
    "/anexo/FIEAM-removebg-preview.png",
    "/anexo/SESI-removebg-preview.png",
    "/anexo/SENAI-removebg-preview.png",
    "/anexo/IEL-removebg-preview.png",
  ];
  const logoDataUrls = await Promise.all(logoSrcs.map(loadImageAsDataUrl));
  const validLogos   = logoDataUrls.filter(Boolean) as string[];

  // ╔══════════════════════════════════════════════════════════╗
  // ║  COVER SLIDE — logos + text only, zero shapes           ║
  // ╚══════════════════════════════════════════════════════════╝
  const cover = pptx.addSlide();
  cover.background = { color: "0C2135" };

  // Single thin cyan bar at top (one shape, acceptable)
  cover.addShape(RECT, {
    x: 0, y: 0, w: SW, h: 0.12,
    fill: { color: "009FE3" }, line: { color: "009FE3", width: 0 },
  });

  // Institution logos — evenly centered across the full width
  if (validLogos.length > 0) {
    const logoH  = 0.72;
    const logoW  = 1.8;
    const gap    = 0.55;
    const totalW = validLogos.length * logoW + (validLogos.length - 1) * gap;
    let lx = (SW - totalW) / 2;
    for (const src of validLogos) {
      cover.addImage({ data: src, x: lx, y: 0.2, w: logoW, h: logoH });
      lx += logoW + gap;
    }
  }

  // Title
  const titleFontSize = title.length > 55 ? 26 : title.length > 40 ? 32 : title.length > 28 ? 38 : 44;
  cover.addText(title, {
    x: 1.0, y: 1.5, w: SW - 2.0, h: 2.4,
    fontSize: titleFontSize, bold: true, color: "FFFFFF",
    fontFace: "Calibri", align: "center", valign: "middle", wrap: true,
  });

  // Period
  if (options?.period) {
    cover.addText(options.period, {
      x: 1.0, y: 4.05, w: SW - 2.0, h: 0.55,
      fontSize: 14, bold: true, color: "009FE3",
      fontFace: "Calibri", align: "center", valign: "middle",
    });
  }

  // Subtitle
  if (options?.subtitle) {
    cover.addText(options.subtitle, {
      x: 1.0, y: 4.65, w: SW - 2.0, h: 0.6,
      fontSize: 11, color: "7DA8C8",
      fontFace: "Calibri", align: "center", valign: "middle", wrap: true,
    });
  }

  // Timestamp
  cover.addText(timestamp(), {
    x: 1.0, y: 5.35, w: SW - 2.0, h: 0.38,
    fontSize: 9, color: "4A6070",
    fontFace: "Calibri", align: "center",
  });

  // Footer text (no shape, just text near the bottom)
  cover.addText("FIEAM  ·  SESI  ·  SENAI  ·  IEL  ·  Polo Telecom  —  Documento confidencial  ·  Uso interno", {
    x: 0.5, y: 7.05, w: SW - 1.0, h: 0.38,
    fontSize: 8, color: "304050",
    fontFace: "Calibri", align: "center",
  });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  CONTENT SLIDES — proportionally scaled, centered       ║
  // ╚══════════════════════════════════════════════════════════╝
  for (const cap of captures) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Fit the capture proportionally within the slide (no distortion).
    const imgAspect   = cap.width / cap.height;
    const slideAspect = SW / SH;
    let drawW: number, drawH: number;
    if (imgAspect >= slideAspect) {
      drawW = SW;
      drawH = SW / imgAspect;
    } else {
      drawH = SH;
      drawW = SH * imgAspect;
    }
    const x = (SW - drawW) / 2;
    const y = (SH - drawH) / 2;
    slide.addImage({ data: cap.dataUrl, x, y, w: drawW, h: drawH });
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}
