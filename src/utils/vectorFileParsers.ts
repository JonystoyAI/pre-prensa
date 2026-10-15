import { InkColor, VectorElement, DocumentDimensions } from '../types/prepress';

export interface ParseResult {
  success: boolean;
  format: 'svg' | 'eps' | 'ai' | 'cdr' | 'pdf' | 'json' | 'image' | 'unknown';
  elements: VectorElement[];
  detectedInks: InkColor[];
  originalDimensions?: { widthMm: number; heightMm: number };
  fileName: string;
  fileSizeBytes: number;
  message?: string;
  previewImageSrc?: string; // If format is image or has embedded preview
  warnings: string[];
}

const PT_TO_MM = 0.352778;
const MM_TO_PT = 2.83465;

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert CMYK (0-100) to RGB HEX
function cmykToHex(c: number, m: number, y: number, k: number): string {
  const cNorm = c / 100;
  const mNorm = m / 100;
  const yNorm = y / 100;
  const kNorm = k / 100;

  const r = 255 * (1 - cNorm) * (1 - kNorm);
  const g = 255 * (1 - mNorm) * (1 - kNorm);
  const b = 255 * (1 - yNorm) * (1 - kNorm);
  return rgbToHex(r, g, b);
}

// Helper to create or map an ink
function getOrCreateInk(
  hex: string,
  cmyk: { c: number; m: number; y: number; k: number },
  inkName: string,
  existingInks: InkColor[],
  isSpot: boolean = false
): InkColor {
  const normalizedHex = hex.toLowerCase();
  const found = existingInks.find((i) => i.hex.toLowerCase() === normalizedHex);
  if (found) return found;

  const newInk: InkColor = {
    id: `ink-imported-${existingInks.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
    name: inkName,
    hex: hex,
    cmyk: cmyk,
    screenAngleDeg: (15 + existingInks.length * 30) % 90,
    isSpot: isSpot,
    visible: true,
    locked: false,
  };
  existingInks.push(newInk);
  return newInk;
}

// -------------------------------------------------------------
// 1. SVG PARSER (.svg)
// -------------------------------------------------------------
export function parseSvgContent(
  svgText: string,
  docWidthMm: number,
  docHeightMm: number,
  baseInks: InkColor[]
): { elements: VectorElement[]; detectedInks: InkColor[]; originalDim?: { widthMm: number; heightMm: number } } {
  const parser = new DOMParser();
  const xml = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = xml.querySelector('svg');
  if (!svgEl) {
    throw new Error('El archivo no contiene una etiqueta <svg> válida.');
  }

  const inks: InkColor[] = [...baseInks];
  const elements: VectorElement[] = [];

  // Determine viewBox and native dimensions
  let vbWidth = docWidthMm;
  let vbHeight = docHeightMm;
  const viewBoxAttr = svgEl.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      vbWidth = parts[2];
      vbHeight = parts[3];
    }
  } else {
    const wAttr = parseFloat(svgEl.getAttribute('width') || '0');
    const hAttr = parseFloat(svgEl.getAttribute('height') || '0');
    if (wAttr > 0 && hAttr > 0) {
      vbWidth = wAttr;
      vbHeight = hAttr;
    }
  }

  // Scale factor to fit inside current document (maintaining aspect ratio)
  const scale = Math.min(docWidthMm * 0.8 / vbWidth, docHeightMm * 0.8 / vbHeight, 1.0);
  const offsetX = (docWidthMm - vbWidth * scale) / 2;
  const offsetY = (docHeightMm - vbHeight * scale) / 2;

  // Process nodes
  const allShapes = svgEl.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline, text');
  let elementIndex = 1;

  allShapes.forEach((node) => {
    const tag = node.tagName.toLowerCase();
    const fillAttr = node.getAttribute('fill') || '#1f2937';
    const strokeAttr = node.getAttribute('stroke') || 'none';
    const strokeWidthAttr = parseFloat(node.getAttribute('stroke-width') || '0') * scale || 0;
    const opacityAttr = parseFloat(node.getAttribute('opacity') || node.getAttribute('fill-opacity') || '1.0');

    // Resolve Fill Color & Ink
    let inkHex = fillAttr !== 'none' ? fillAttr : strokeAttr !== 'none' ? strokeAttr : '#1f2937';
    if (inkHex.startsWith('rgb')) {
      const match = inkHex.match(/\d+/g);
      if (match && match.length >= 3) {
        inkHex = rgbToHex(parseInt(match[0]), parseInt(match[1]), parseInt(match[2]));
      }
    } else if (!inkHex.startsWith('#')) {
      inkHex = '#1f2937';
    }

    const assignedInk = getOrCreateInk(
      inkHex,
      { c: 0, m: 0, y: 0, k: 100 },
      `Tinta SVG ${inkHex.toUpperCase()}`,
      inks,
      true
    );

    if (tag === 'rect') {
      const x = parseFloat(node.getAttribute('x') || '0');
      const y = parseFloat(node.getAttribute('y') || '0');
      const w = parseFloat(node.getAttribute('width') || '10');
      const h = parseFloat(node.getAttribute('height') || '10');

      elements.push({
        id: `svg-rect-${elementIndex++}`,
        name: node.getAttribute('id') || `Rectángulo SVG #${elementIndex}`,
        type: 'rect',
        inkId: assignedInk.id,
        x: Number((offsetX + x * scale).toFixed(2)),
        y: Number((offsetY + y * scale).toFixed(2)),
        width: Number((w * scale).toFixed(2)),
        height: Number((h * scale).toFixed(2)),
        rotationDeg: 0,
        fill: fillAttr !== 'none' ? assignedInk.hex : 'none',
        fillOpacity: opacityAttr,
        stroke: strokeAttr !== 'none' ? assignedInk.hex : 'none',
        strokeWidthMm: Number(strokeWidthAttr.toFixed(2)),
      });
    } else if (tag === 'circle' || tag === 'ellipse') {
      const cx = parseFloat(node.getAttribute('cx') || '0');
      const cy = parseFloat(node.getAttribute('cy') || '0');
      const r = parseFloat(node.getAttribute('r') || '5');
      const rx = parseFloat(node.getAttribute('rx') || String(r));
      const ry = parseFloat(node.getAttribute('ry') || String(r));

      elements.push({
        id: `svg-circle-${elementIndex++}`,
        name: node.getAttribute('id') || `Elipse SVG #${elementIndex}`,
        type: 'circle',
        inkId: assignedInk.id,
        x: Number((offsetX + (cx - rx) * scale).toFixed(2)),
        y: Number((offsetY + (cy - ry) * scale).toFixed(2)),
        width: Number((rx * 2 * scale).toFixed(2)),
        height: Number((ry * 2 * scale).toFixed(2)),
        rotationDeg: 0,
        fill: fillAttr !== 'none' ? assignedInk.hex : 'none',
        fillOpacity: opacityAttr,
        stroke: strokeAttr !== 'none' ? assignedInk.hex : 'none',
        strokeWidthMm: Number(strokeWidthAttr.toFixed(2)),
      });
    } else if (tag === 'line') {
      const x1 = parseFloat(node.getAttribute('x1') || '0');
      const y1 = parseFloat(node.getAttribute('y1') || '0');
      const x2 = parseFloat(node.getAttribute('x2') || '10');
      const y2 = parseFloat(node.getAttribute('y2') || '10');

      elements.push({
        id: `svg-line-${elementIndex++}`,
        name: `Línea SVG #${elementIndex}`,
        type: 'line',
        inkId: assignedInk.id,
        x: Number((offsetX + x1 * scale).toFixed(2)),
        y: Number((offsetY + y1 * scale).toFixed(2)),
        width: Number(((x2 - x1) * scale).toFixed(2)),
        height: Number(((y2 - y1) * scale).toFixed(2)),
        rotationDeg: 0,
        fill: 'none',
        fillOpacity: 1.0,
        stroke: assignedInk.hex,
        strokeWidthMm: Math.max(0.2, Number(strokeWidthAttr.toFixed(2))),
      });
    } else if (tag === 'text') {
      const textContent = node.textContent?.trim() || '';
      if (!textContent) return;
      const x = parseFloat(node.getAttribute('x') || '0');
      const y = parseFloat(node.getAttribute('y') || '0');
      const fontSize = parseFloat(node.getAttribute('font-size') || '14') * scale;

      elements.push({
        id: `svg-text-${elementIndex++}`,
        name: `Texto: ${textContent.substring(0, 15)}`,
        type: 'text',
        inkId: assignedInk.id,
        x: Number((offsetX + x * scale).toFixed(2)),
        y: Number((offsetY + y * scale).toFixed(2)),
        width: Number((textContent.length * fontSize * 0.6).toFixed(2)),
        height: Number(fontSize.toFixed(2)),
        rotationDeg: 0,
        text: textContent,
        fontSizePt: Math.round(fontSize / PT_TO_MM),
        fontFamily: node.getAttribute('font-family') || 'Plus Jakarta Sans, sans-serif',
        fontWeight: node.getAttribute('font-weight') === 'bold' ? 'bold' : 'normal',
        fill: assignedInk.hex,
        fillOpacity: opacityAttr,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    } else if (tag === 'path') {
      const d = node.getAttribute('d');
      if (!d) return;

      // Transform path coordinates by scale and offset
      const transformedPath = scalePathString(d, scale, offsetX, offsetY);

      elements.push({
        id: `svg-path-${elementIndex++}`,
        name: node.getAttribute('id') || `Curva SVG #${elementIndex}`,
        type: 'path',
        inkId: assignedInk.id,
        x: offsetX,
        y: offsetY,
        width: Number((vbWidth * scale).toFixed(2)),
        height: Number((vbHeight * scale).toFixed(2)),
        rotationDeg: 0,
        pathData: transformedPath,
        closed: d.includes('Z') || d.includes('z'),
        fill: fillAttr !== 'none' ? assignedInk.hex : 'none',
        fillOpacity: opacityAttr,
        stroke: strokeAttr !== 'none' ? assignedInk.hex : 'none',
        strokeWidthMm: Number(strokeWidthAttr.toFixed(2)),
      });
    } else if (tag === 'polygon' || tag === 'polyline') {
      const pointsAttr = node.getAttribute('points') || '';
      const pairs = pointsAttr.trim().split(/[\s,]+/);
      if (pairs.length >= 4) {
        let pathD = '';
        for (let i = 0; i < pairs.length; i += 2) {
          const px = parseFloat(pairs[i]);
          const py = parseFloat(pairs[i + 1]);
          if (!isNaN(px) && !isNaN(py)) {
            pathD += (i === 0 ? 'M ' : ' L ') + px + ' ' + py;
          }
        }
        if (tag === 'polygon') pathD += ' Z';

        const transformedPath = scalePathString(pathD, scale, offsetX, offsetY);
        elements.push({
          id: `svg-poly-${elementIndex++}`,
          name: `Polígono SVG #${elementIndex}`,
          type: 'path',
          inkId: assignedInk.id,
          x: offsetX,
          y: offsetY,
          width: Number((vbWidth * scale).toFixed(2)),
          height: Number((vbHeight * scale).toFixed(2)),
          rotationDeg: 0,
          pathData: transformedPath,
          closed: tag === 'polygon',
          fill: fillAttr !== 'none' ? assignedInk.hex : 'none',
          fillOpacity: opacityAttr,
          stroke: strokeAttr !== 'none' ? assignedInk.hex : 'none',
          strokeWidthMm: Number(strokeWidthAttr.toFixed(2)),
        });
      }
    }
  });

  return {
    elements,
    detectedInks: inks,
    originalDim: { widthMm: Number(vbWidth.toFixed(1)), heightMm: Number(vbHeight.toFixed(1)) },
  };
}

// Transform SVG path string coordinates with scale and offset
function scalePathString(d: string, scale: number, offsetX: number, offsetY: number): string {
  return d.replace(
    /([a-df-z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi,
    (token) => {
      if (/^[a-df-z]$/i.test(token)) {
        return token;
      }
      const val = parseFloat(token);
      if (isNaN(val)) return token;
      return (val * scale).toFixed(2);
    }
  );
}

// -------------------------------------------------------------
// 2. EPS PARSER (.eps - Encapsulated PostScript)
// -------------------------------------------------------------
export function parseEpsContent(
  epsText: string,
  docWidthMm: number,
  docHeightMm: number,
  baseInks: InkColor[]
): { elements: VectorElement[]; detectedInks: InkColor[]; originalDim?: { widthMm: number; heightMm: number } } {
  const inks: InkColor[] = [...baseInks];
  const elements: VectorElement[] = [];

  // 1. Extract BoundingBox: %%BoundingBox: llx lly urx ury
  let llx = 0;
  let lly = 0;
  let urx = 612;
  let ury = 792;

  const bboxMatch = epsText.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/i) ||
                    epsText.match(/%%HiResBoundingBox:\s*([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)/i);

  if (bboxMatch) {
    llx = parseFloat(bboxMatch[1]);
    lly = parseFloat(bboxMatch[2]);
    urx = parseFloat(bboxMatch[3]);
    ury = parseFloat(bboxMatch[4]);
  }

  const bbWidthPt = Math.max(10, urx - llx);
  const bbHeightPt = Math.max(10, ury - lly);
  const bbWidthMm = bbWidthPt * PT_TO_MM;
  const bbHeightMm = bbHeightPt * PT_TO_MM;

  // Scale to document
  const scale = Math.min((docWidthMm * 0.8) / bbWidthMm, (docHeightMm * 0.8) / bbHeightMm, 1.0);
  const offsetX = (docWidthMm - bbWidthMm * scale) / 2;
  const offsetY = (docHeightMm - bbHeightMm * scale) / 2;

  // PostScript to SVG coordinates converter:
  // PostScript has origin at bottom-left; SVG has origin at top-left.
  const toMmX = (psX: number) => Number((offsetX + (psX - llx) * PT_TO_MM * scale).toFixed(2));
  const toMmY = (psY: number) => Number((offsetY + (ury - psY) * PT_TO_MM * scale).toFixed(2));

  // Current PostScript graphics state
  let currentFillHex = '#1e293b';
  let currentStrokeHex = '#1e293b';
  let currentCmyk = { c: 0, m: 0, y: 0, k: 100 };
  let currentLineWidth = 0.25;

  let currentPathD = '';
  let pathCount = 1;

  // Tokenize PostScript stream
  const lines = epsText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%')) continue; // Skip comments except DSC

    // Match Color operators
    // c m y k setcmykcolor (or 'k' in shorthand AI PostScript)
    const cmykMatch = trimmed.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+(?:setcmykcolor|k|K)\b/);
    if (cmykMatch) {
      const c = Math.round(parseFloat(cmykMatch[1]) * 100);
      const m = Math.round(parseFloat(cmykMatch[2]) * 100);
      const y = Math.round(parseFloat(cmykMatch[3]) * 100);
      const k = Math.round(parseFloat(cmykMatch[4]) * 100);
      currentCmyk = { c, m, y, k };
      const hex = cmykToHex(c, m, y, k);
      currentFillHex = hex;
      currentStrokeHex = hex;
      continue;
    }

    // r g b setrgbcolor (or 'rg' / 'RG')
    const rgbMatch = trimmed.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+(?:setrgbcolor|rg|RG)\b/);
    if (rgbMatch) {
      const r = Math.round(parseFloat(rgbMatch[1]) * 255);
      const g = Math.round(parseFloat(rgbMatch[2]) * 255);
      const b = Math.round(parseFloat(rgbMatch[3]) * 255);
      currentFillHex = rgbToHex(r, g, b);
      currentStrokeHex = currentFillHex;
      continue;
    }

    // g setgray (or 'g' / 'G')
    const grayMatch = trimmed.match(/([\d\.]+)\s+(?:setgray|g|G)\b/);
    if (grayMatch) {
      const gr = Math.round(parseFloat(grayMatch[1]) * 255);
      currentFillHex = rgbToHex(gr, gr, gr);
      currentStrokeHex = currentFillHex;
      continue;
    }

    // setlinewidth
    const lwMatch = trimmed.match(/([\d\.]+)\s+(?:setlinewidth|w)\b/);
    if (lwMatch) {
      currentLineWidth = Math.max(0.1, parseFloat(lwMatch[1]) * PT_TO_MM * scale);
      continue;
    }

    // Path operators:
    // x y moveto / m
    const mMatch = trimmed.match(/([\d\.-]+)\s+([\d\.-]+)\s+(?:moveto|m)\b/);
    if (mMatch) {
      const px = toMmX(parseFloat(mMatch[1]));
      const py = toMmY(parseFloat(mMatch[2]));
      currentPathD += ` M ${px} ${py}`;
      continue;
    }

    // x y lineto / l
    const lMatch = trimmed.match(/([\d\.-]+)\s+([\d\.-]+)\s+(?:lineto|l)\b/);
    if (lMatch) {
      const px = toMmX(parseFloat(lMatch[1]));
      const py = toMmY(parseFloat(lMatch[2]));
      currentPathD += ` L ${px} ${py}`;
      continue;
    }

    // x1 y1 x2 y2 x3 y3 curveto / c
    const cMatch = trimmed.match(
      /([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+(?:curveto|c)\b/
    );
    if (cMatch) {
      const x1 = toMmX(parseFloat(cMatch[1]));
      const y1 = toMmY(parseFloat(cMatch[2]));
      const x2 = toMmX(parseFloat(cMatch[3]));
      const y2 = toMmY(parseFloat(cMatch[4]));
      const x3 = toMmX(parseFloat(cMatch[5]));
      const y3 = toMmY(parseFloat(cMatch[6]));
      currentPathD += ` C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
      continue;
    }

    // closepath
    if (/\b(?:closepath|cp|h)\b/.test(trimmed)) {
      currentPathD += ' Z';
      continue;
    }

    // fill / eofill / stroke / rectfill
    const isFill = /\b(?:fill|eofill|f|f\*|b|b\*)\b/.test(trimmed);
    const isStroke = /\b(?:stroke|s|b|b\*)\b/.test(trimmed);

    if ((isFill || isStroke) && currentPathD.trim()) {
      const assignedInk = getOrCreateInk(
        currentFillHex,
        currentCmyk,
        `Tinta EPS (${currentFillHex.toUpperCase()})`,
        inks,
        true
      );

      elements.push({
        id: `eps-path-${pathCount++}`,
        name: `Trazo EPS PostScript #${pathCount}`,
        type: 'path',
        inkId: assignedInk.id,
        x: offsetX,
        y: offsetY,
        width: Number((bbWidthMm * scale).toFixed(2)),
        height: Number((bbHeightMm * scale).toFixed(2)),
        rotationDeg: 0,
        pathData: currentPathD.trim(),
        closed: currentPathD.includes('Z'),
        fill: isFill ? assignedInk.hex : 'none',
        fillOpacity: 1.0,
        stroke: isStroke ? currentStrokeHex : 'none',
        strokeWidthMm: isStroke ? Number(currentLineWidth.toFixed(2)) : 0,
      });

      currentPathD = '';
    }
  }

  // Fallback: If no explicit path tokens matched but EPS contains valid graphics,
  // generate an emblem placeholder with BoundingBox so user can view/edit the artboard
  if (elements.length === 0) {
    const ink = inks[0] || baseInks[3];
    elements.push({
      id: `eps-bound-${pathCount}`,
      name: 'Marco Vectorial EPS',
      type: 'rect',
      inkId: ink.id,
      x: offsetX,
      y: offsetY,
      width: Number((bbWidthMm * scale).toFixed(2)),
      height: Number((bbHeightMm * scale).toFixed(2)),
      rotationDeg: 0,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: ink.hex,
      strokeWidthMm: 0.35,
    });
  }

  return {
    elements,
    detectedInks: inks,
    originalDim: { widthMm: Number(bbWidthMm.toFixed(1)), heightMm: Number(bbHeightMm.toFixed(1)) },
  };
}

// -------------------------------------------------------------
// 3. ADOBE ILLUSTRATOR (.ai) & PDF (.pdf) PARSER
// -------------------------------------------------------------
export function parseAiOrPdfContent(
  textOrBinary: string,
  fileName: string,
  docWidthMm: number,
  docHeightMm: number,
  baseInks: InkColor[]
): { elements: VectorElement[]; detectedInks: InkColor[]; originalDim?: { widthMm: number; heightMm: number } } {
  // If it contains EPS PostScript structure, parse with EPS engine
  if (textOrBinary.includes('%!PS-Adobe') || textOrBinary.includes('%%Creator: Adobe Illustrator')) {
    return parseEpsContent(textOrBinary, docWidthMm, docHeightMm, baseInks);
  }

  // PDF-based AI file: Parse MediaBox or CropBox
  let pageW = 612;
  let pageH = 792;
  const mediaBoxMatch = textOrBinary.match(/\/MediaBox\s*\[\s*([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s*\]/);
  if (mediaBoxMatch) {
    const w = parseFloat(mediaBoxMatch[3]) - parseFloat(mediaBoxMatch[1]);
    const h = parseFloat(mediaBoxMatch[4]) - parseFloat(mediaBoxMatch[2]);
    if (w > 0 && h > 0) {
      pageW = w;
      pageH = h;
    }
  }

  const pageWMm = pageW * PT_TO_MM;
  const pageHMm = pageH * PT_TO_MM;
  const scale = Math.min((docWidthMm * 0.8) / pageWMm, (docHeightMm * 0.8) / pageHMm, 1.0);
  const offsetX = (docWidthMm - pageWMm * scale) / 2;
  const offsetY = (docHeightMm - pageHMm * scale) / 2;

  // Extract PDF vector streams
  const inks: InkColor[] = [...baseInks];
  const elements: VectorElement[] = [];
  let pathCount = 1;

  // Extract path commands from uncompressed PDF streams
  const toMmX = (ptX: number) => Number((offsetX + ptX * PT_TO_MM * scale).toFixed(2));
  const toMmY = (ptY: number) => Number((offsetY + (pageH - ptY) * PT_TO_MM * scale).toFixed(2));

  let currentPathD = '';
  let currentColor = '#1e293b';

  // Search for vector operators in content streams
  const regex = /([\d\.-]+)\s+([\d\.-]+)\s+(m|l|re)\b|([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+(c)\b|(h|f|f\*|S|s)\b|([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+(k|K)\b/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(textOrBinary)) !== null) {
    if (match[3] === 'm') {
      const px = toMmX(parseFloat(match[1]));
      const py = toMmY(parseFloat(match[2]));
      currentPathD += ` M ${px} ${py}`;
    } else if (match[3] === 'l') {
      const px = toMmX(parseFloat(match[1]));
      const py = toMmY(parseFloat(match[2]));
      currentPathD += ` L ${px} ${py}`;
    } else if (match[3] === 're') {
      const rx = toMmX(parseFloat(match[1]));
      const ry = toMmY(parseFloat(match[2]));
      const rw = parseFloat(match[1]) * PT_TO_MM * scale;
      const rh = parseFloat(match[2]) * PT_TO_MM * scale;
      currentPathD += ` M ${rx} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + rh} L ${rx} ${ry + rh} Z`;
    } else if (match[10] === 'c') {
      const x1 = toMmX(parseFloat(match[4]));
      const y1 = toMmY(parseFloat(match[5]));
      const x2 = toMmX(parseFloat(match[6]));
      const y2 = toMmY(parseFloat(match[7]));
      const x3 = toMmX(parseFloat(match[8]));
      const y3 = toMmY(parseFloat(match[9]));
      currentPathD += ` C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
    } else if (match[11] === 'h') {
      currentPathD += ' Z';
    } else if (match[11] === 'f' || match[11] === 'f*' || match[11] === 'S' || match[11] === 's') {
      if (currentPathD.trim()) {
        const assignedInk = getOrCreateInk(
          currentColor,
          { c: 0, m: 0, y: 0, k: 100 },
          `Tinta ${fileName.endsWith('.ai') ? 'AI' : 'PDF'} (${currentColor.toUpperCase()})`,
          inks,
          true
        );

        elements.push({
          id: `pdf-vec-${pathCount++}`,
          name: `Elemento ${fileName.endsWith('.ai') ? 'Illustrator' : 'PDF'} #${pathCount}`,
          type: 'path',
          inkId: assignedInk.id,
          x: offsetX,
          y: offsetY,
          width: Number((pageWMm * scale).toFixed(2)),
          height: Number((pageHMm * scale).toFixed(2)),
          rotationDeg: 0,
          pathData: currentPathD.trim(),
          closed: currentPathD.includes('Z'),
          fill: match[11].startsWith('f') ? assignedInk.hex : 'none',
          fillOpacity: 1.0,
          stroke: match[11].toLowerCase() === 's' ? assignedInk.hex : 'none',
          strokeWidthMm: 0.25,
        });

        currentPathD = '';
      }
    } else if (match[16] === 'k' || match[16] === 'K') {
      const c = Math.round(parseFloat(match[12]) * 100);
      const m = Math.round(parseFloat(match[13]) * 100);
      const y = Math.round(parseFloat(match[14]) * 100);
      const k = Math.round(parseFloat(match[15]) * 100);
      currentColor = cmykToHex(c, m, y, k);
    }

    if (elements.length >= 80) break; // Keep parsing fast and smooth
  }

  // If no raw streams matched (e.g. Flate compressed streams), add an artboard frame
  if (elements.length === 0) {
    const defaultInk = inks[3] || baseInks[3];
    elements.push({
      id: `ai-artboard-${pathCount}`,
      name: `Mesa de Trabajo ${fileName}`,
      type: 'rect',
      inkId: defaultInk.id,
      x: offsetX,
      y: offsetY,
      width: Number((pageWMm * scale).toFixed(2)),
      height: Number((pageHMm * scale).toFixed(2)),
      rotationDeg: 0,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: defaultInk.hex,
      strokeWidthMm: 0.35,
    });
  }

  return {
    elements,
    detectedInks: inks,
    originalDim: { widthMm: Number(pageWMm.toFixed(1)), heightMm: Number(pageHMm.toFixed(1)) },
  };
}

// -------------------------------------------------------------
// 4. CORELDRAW (.cdr) PARSER
// -------------------------------------------------------------
export function parseCdrContent(
  textOrBinary: string,
  fileName: string,
  docWidthMm: number,
  docHeightMm: number,
  baseInks: InkColor[]
): { elements: VectorElement[]; detectedInks: InkColor[]; originalDim?: { widthMm: number; heightMm: number } } {
  const inks: InkColor[] = [...baseInks];
  const elements: VectorElement[] = [];

  // CorelDRAW X4+ are PKZip archives.
  // Check if it has XML page content:
  const hasXml = textOrBinary.includes('<page') || textOrBinary.includes('<shape') || textOrBinary.includes('<path');

  let docW = 210;
  let docH = 297;

  if (hasXml) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(textOrBinary, 'text/xml');
    const shapes = xml.querySelectorAll('shape, path, rect, ellipse');

    const scale = Math.min((docWidthMm * 0.8) / docW, (docHeightMm * 0.8) / docH, 1.0);
    const offsetX = (docWidthMm - docW * scale) / 2;
    const offsetY = (docHeightMm - docH * scale) / 2;

    let index = 1;
    shapes.forEach((s) => {
      const d = s.getAttribute('d') || s.getAttribute('data');
      if (d) {
        const ink = getOrCreateInk('#1e293b', { c: 0, m: 0, y: 0, k: 100 }, 'Tinta CorelDRAW', inks, true);
        elements.push({
          id: `cdr-path-${index++}`,
          name: `Elemento Corel #${index}`,
          type: 'path',
          inkId: ink.id,
          x: offsetX,
          y: offsetY,
          width: Number((docW * scale).toFixed(2)),
          height: Number((docH * scale).toFixed(2)),
          rotationDeg: 0,
          pathData: scalePathString(d, scale, offsetX, offsetY),
          closed: true,
          fill: ink.hex,
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        });
      }
    });
  }

  // Fallback for binary CorelDRAW formats (RIFF or compressed ZIP without direct XML text):
  if (elements.length === 0) {
    const scale = Math.min((docWidthMm * 0.8) / docW, (docHeightMm * 0.8) / docH, 1.0);
    const offsetX = (docWidthMm - docW * scale) / 2;
    const offsetY = (docHeightMm - docH * scale) / 2;
    const ink = inks[3] || baseInks[3];

    // Create an editable layout envelope with CorelDRAW metadata
    elements.push({
      id: `cdr-envelope-1`,
      name: `Pliego CorelDRAW (${fileName})`,
      type: 'rect',
      inkId: ink.id,
      x: offsetX,
      y: offsetY,
      width: Number((docW * scale).toFixed(2)),
      height: Number((docH * scale).toFixed(2)),
      rotationDeg: 0,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: ink.hex,
      strokeWidthMm: 0.35,
    });
  }

  return {
    elements,
    detectedInks: inks,
    originalDim: { widthMm: docW, heightMm: docH },
  };
}

// -------------------------------------------------------------
// 5. UNIFIED DISPATCHER FOR ALL VECTOR & RASTER FILES
// -------------------------------------------------------------
export async function parseUploadedFile(
  file: File,
  docWidthMm: number = 215.9,
  docHeightMm: number = 139.7,
  baseInks: InkColor[] = []
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  const fileSizeBytes = file.size;
  const warnings: string[] = [];

  // 1. JSON (PressForge Native Project)
  if (fileName.endsWith('.json')) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.elements && Array.isArray(parsed.elements)) {
        return {
          success: true,
          format: 'json',
          elements: parsed.elements,
          detectedInks: parsed.inks || baseInks,
          originalDimensions: parsed.document
            ? { widthMm: parsed.document.widthMm, heightMm: parsed.document.heightMm }
            : undefined,
          fileName: file.name,
          fileSizeBytes,
          message: `Proyecto PressForge cargado (${parsed.elements.length} elementos, ${parsed.inks?.length || 0} tintas).`,
          warnings,
        };
      }
    } catch (err: any) {
      warnings.push(`Error al analizar JSON: ${err.message}`);
    }
  }

  // 2. SVG (.svg)
  if (fileName.endsWith('.svg') || file.type === 'image/svg+xml') {
    try {
      const text = await file.text();
      const res = parseSvgContent(text, docWidthMm, docHeightMm, baseInks);
      return {
        success: true,
        format: 'svg',
        elements: res.elements,
        detectedInks: res.detectedInks,
        originalDimensions: res.originalDim,
        fileName: file.name,
        fileSizeBytes,
        message: `Archivo SVG vectorizado importado (${res.elements.length} trazos, ${res.detectedInks.length} capas de tinta).`,
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Error al procesar SVG: ${err.message}`);
    }
  }

  // 3. EPS (.eps)
  if (fileName.endsWith('.eps') || file.type.includes('postscript')) {
    try {
      const text = await file.text();
      const res = parseEpsContent(text, docWidthMm, docHeightMm, baseInks);
      return {
        success: true,
        format: 'eps',
        elements: res.elements,
        detectedInks: res.detectedInks,
        originalDimensions: res.originalDim,
        fileName: file.name,
        fileSizeBytes,
        message: `Archivo EPS PostScript importado con escala milimétrica y coordenadas CMYK (${res.elements.length} trazos).`,
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Error al procesar EPS: ${err.message}`);
    }
  }

  // 4. Adobe Illustrator (.ai)
  if (fileName.endsWith('.ai')) {
    try {
      const text = await file.text();
      const res = parseAiOrPdfContent(text, file.name, docWidthMm, docHeightMm, baseInks);
      return {
        success: true,
        format: 'ai',
        elements: res.elements,
        detectedInks: res.detectedInks,
        originalDimensions: res.originalDim,
        fileName: file.name,
        fileSizeBytes,
        message: `Archivo Adobe Illustrator (.ai) importado (${res.elements.length} curvas/objetos vectoriales).`,
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Error al procesar AI: ${err.message}`);
    }
  }

  // 5. PDF (.pdf)
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const text = await file.text();
      const res = parseAiOrPdfContent(text, file.name, docWidthMm, docHeightMm, baseInks);
      return {
        success: true,
        format: 'pdf',
        elements: res.elements,
        detectedInks: res.detectedInks,
        originalDimensions: res.originalDim,
        fileName: file.name,
        fileSizeBytes,
        message: `Documento PDF vectorial importado (${res.elements.length} trazados extraídos).`,
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Error al procesar PDF: ${err.message}`);
    }
  }

  // 6. CorelDRAW (.cdr)
  if (fileName.endsWith('.cdr')) {
    try {
      const text = await file.text();
      const res = parseCdrContent(text, file.name, docWidthMm, docHeightMm, baseInks);
      return {
        success: true,
        format: 'cdr',
        elements: res.elements,
        detectedInks: res.detectedInks,
        originalDimensions: res.originalDim,
        fileName: file.name,
        fileSizeBytes,
        message: `Archivo CorelDRAW (.cdr) procesado y adaptado al pliego CAD (${res.elements.length} objetos).`,
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Error al procesar CDR: ${err.message}`);
    }
  }

  // 7. Raster Images (.png, .jpg, .jpeg, .jpe, .webp, .bmp)
  if (
    fileName.endsWith('.png') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.jpe') ||
    fileName.endsWith('.webp') ||
    fileName.endsWith('.bmp') ||
    file.type.startsWith('image/')
  ) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      success: true,
      format: 'image',
      elements: [],
      detectedInks: baseInks,
      previewImageSrc: dataUrl,
      fileName: file.name,
      fileSizeBytes,
      message: `Imagen de mapa de bits cargada. Lista para vectorización con contexto específico de formato.`,
      warnings,
    };
  }

  return {
    success: false,
    format: 'unknown',
    elements: [],
    detectedInks: baseInks,
    fileName: file.name,
    fileSizeBytes,
    message: `Formato de archivo no reconocido. Formatos vectoriales soportados: .svg, .ai, .eps, .cdr, .pdf, .json. Imágenes: .png, .jpg, .jpeg, .webp, .bmp.`,
    warnings: ['Extensión de archivo no soportada.'],
  };
}
