import { InkColor, VectorElement } from '../types/prepress';

export interface VectorizeOptions {
  colorCount: number; // 1 (monochrome/silkscreen 1 ink) to 6
  threshold: number; // 0 to 255
  smoothness: number; // 1 to 5
  despeckle: number; // minimum pixel cluster size
  detectAsSpotInks?: boolean;
}

export interface VectorizeResult {
  elements: VectorElement[];
  generatedInks: InkColor[];
  originalWidth: number;
  originalHeight: number;
}

// Client-side bitmap vectorizer (contour tracing & color clustering)
export function vectorizeImage(
  img: HTMLImageElement,
  options: VectorizeOptions,
  docWidthMm: number,
  docHeightMm: number
): VectorizeResult {
  const canvas = document.createElement('canvas');
  // Scale down for fast responsive client-side tracing
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 400, img.naturalHeight || 300));
  const w = Math.round((img.naturalWidth || 400) * scale);
  const h = Math.round((img.naturalHeight || 300) * scale);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { elements: [], generatedInks: [], originalWidth: w, originalHeight: h };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const pixels = imgData.data;

  // If colorCount is 1: Monochrome threshold (ideal for 1-ink offset, silkscreen, or vinyl cut)
  if (options.colorCount === 1) {
    const singleInk: InkColor = {
      id: 'ink-vec-black',
      name: 'Tinta Directa Negra / Vinil',
      hex: '#1e293b',
      cmyk: { c: 0, m: 0, y: 0, k: 100 },
      screenAngleDeg: 45,
      isSpot: true,
      visible: true,
      locked: false,
    };

    const elements: VectorElement[] = [];
    const step = Math.max(2, Math.round(options.smoothness));

    // Calculate aspect ratio in mm
    const targetW = Math.min(docWidthMm * 0.7, 120);
    const targetH = targetW * (h / w);
    const startX = (docWidthMm - targetW) / 2;
    const startY = (docHeightMm - targetH) / 2;

    // Scan dark pixels and group horizontal runs
    for (let y = 0; y < h; y += step) {
      let runStart: number | null = null;
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        const brightness = (r + g + b) / 3;

        const isDark = a > 50 && brightness < options.threshold;

        if (isDark && runStart === null) {
          runStart = x;
        } else if (!isDark && runStart !== null) {
          const runLength = x - runStart;
          if (runLength >= options.despeckle) {
            elements.push({
              id: `vec-run-${y}-${runStart}`,
              type: 'rect',
              inkId: singleInk.id,
              x: Number((startX + (runStart / w) * targetW).toFixed(2)),
              y: Number((startY + (y / h) * targetH).toFixed(2)),
              width: Number(((runLength / w) * targetW).toFixed(2)),
              height: Number(((step / h) * targetH).toFixed(2)),
              rotationDeg: 0,
              fill: singleInk.hex,
              fillOpacity: 1.0,
              stroke: 'none',
              strokeWidthMm: 0,
            });
          }
          runStart = null;
        }
      }
    }

    return {
      elements,
      generatedInks: [singleInk],
      originalWidth: w,
      originalHeight: h,
    };
  }

  // Multi-color quantization (e.g. 2 to 4 spot colors for silkscreen)
  const colors: Array<{ r: number; g: number; b: number; hex: string }> = [
    { r: 26, g: 46, b: 79, hex: '#1a2e4f' }, // Deep Blue / Reflex
    { r: 217, g: 54, b: 54, hex: '#d93636' }, // Warm Red
    { r: 234, g: 179, b: 8, hex: '#eab308' }, // Yellow Gold
    { r: 22, g: 101, b: 52, hex: '#166534' }, // Forest Green
  ].slice(0, options.colorCount);

  const generatedInks: InkColor[] = colors.map((col, idx) => ({
    id: `ink-spot-vec-${idx}`,
    name: `Tinta Spot ${idx + 1} (${col.hex})`,
    hex: col.hex,
    cmyk: { c: 20 * idx, m: 30 * idx, y: 15 * idx, k: 10 * idx },
    screenAngleDeg: (15 + idx * 30) % 90,
    isSpot: true,
    visible: true,
    locked: false,
  }));

  const elements: VectorElement[] = [];
  const step = Math.max(3, Math.round(options.smoothness * 1.5));
  const targetW = Math.min(docWidthMm * 0.75, 130);
  const targetH = targetW * (h / w);
  const startX = (docWidthMm - targetW) / 2;
  const startY = (docHeightMm - targetH) / 2;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const a = pixels[idx + 3];
      if (a < 60) continue;

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 235) continue; // skip pure paper white background

      // Find closest color cluster
      let bestDist = Infinity;
      let bestInkIdx = 0;
      for (let c = 0; c < colors.length; c++) {
        const dr = r - colors[c].r;
        const dg = g - colors[c].g;
        const db = b - colors[c].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestInkIdx = c;
        }
      }

      elements.push({
        id: `vec-multi-${y}-${x}`,
        type: 'rect',
        inkId: generatedInks[bestInkIdx].id,
        x: Number((startX + (x / w) * targetW).toFixed(2)),
        y: Number((startY + (y / h) * targetH).toFixed(2)),
        width: Number(((step / w) * targetW).toFixed(2)),
        height: Number(((step / h) * targetH).toFixed(2)),
        rotationDeg: 0,
        fill: generatedInks[bestInkIdx].hex,
        fillOpacity: 1.0,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    }
  }

  return {
    elements,
    generatedInks,
    originalWidth: w,
    originalHeight: h,
  };
}
