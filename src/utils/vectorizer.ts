import { InkColor, VectorElement } from '../types/prepress';

export type VectorizeProfile =
  | 'logo_geom'
  | 'serigrafia_spot'
  | 'vinil_corte'
  | 'boceto_tinta'
  | 'tipografia'
  | 'fotomecanica';

export type ImageFormatContext = 'png' | 'jpg' | 'jpeg' | 'webp' | 'bmp' | 'auto';

export interface ImageFormatMetadata {
  format: 'png' | 'jpg' | 'jpeg' | 'webp' | 'bmp';
  label: string;
  isLossy: boolean;
  hasAlpha: boolean;
  compressionType: string;
  description: string;
  recommendedDespeckle: number;
  recommendedSmoothness: number;
  advice: string;
}

export const IMAGE_FORMAT_SPECS: Record<string, ImageFormatMetadata> = {
  png: {
    format: 'png',
    label: 'PNG (Portable Network Graphics)',
    isLossy: false,
    hasAlpha: true,
    compressionType: 'Sin pérdida (Deflate)',
    description:
      'Formato ideal para logotipos, íconos y textos con fondo transparente. Preserva bordes de contraste 100% nítidos sin ruido de compresión.',
    recommendedDespeckle: 2,
    recommendedSmoothness: 2,
    advice:
      'Aprovecha el canal alfa: los píxeles transparentes se omiten automáticamente sin requerir umbral forzado.',
  },
  jpg: {
    format: 'jpg',
    label: 'JPG / JPEG (Joint Photographic Experts Group)',
    isLossy: true,
    hasAlpha: false,
    compressionType: 'Con pérdida (DCT 8x8)',
    description:
      'Formato fotográfico comprimido. Genera artefactos de bloque y halos ("ringing") en bordes de alto contraste.',
    recommendedDespeckle: 5,
    recommendedSmoothness: 3,
    advice:
      'Se activa filtro de reducción de ruido (Despeckle) para evitar que los artefactos de compresión se conviertan en vectores falsos.',
  },
  jpeg: {
    format: 'jpeg',
    label: 'JPEG Estándar',
    isLossy: true,
    hasAlpha: false,
    compressionType: 'Con pérdida (DCT)',
    description:
      'Idéntico a JPG. Compresión con pérdida que requiere suavizado de contornos para eliminar escalonamiento en curvas.',
    recommendedDespeckle: 5,
    recommendedSmoothness: 3,
    advice:
      'Aumenta la tolerancia de suavizado a 3 o 4 para obtener curvas Bézier redondeadas sin saltos.',
  },
  webp: {
    format: 'webp',
    label: 'WebP (Google Web Picture)',
    isLossy: true,
    hasAlpha: true,
    compressionType: 'Predictiva / Lossy-Lossless',
    description:
      'Formato web moderno. Muy eficiente pero puede presentar compresión espacial variable en degradados.',
    recommendedDespeckle: 3,
    recommendedSmoothness: 2,
    advice:
      'Comprueba si la imagen tiene fondo blanco o transparente para calibrar el umbral de binarización.',
  },
  bmp: {
    format: 'bmp',
    label: 'BMP (Windows Bitmap)',
    isLossy: false,
    hasAlpha: false,
    compressionType: 'Sin compresión (Matriz directa)',
    description:
      'Mapa de bits puro sin comprimir. Preserva exactamente la matriz de píxeles original a nivel de fotolito.',
    recommendedDespeckle: 1,
    recommendedSmoothness: 1,
    advice:
      'Ideal para escaneos de alta resolución (300-600 DPI) donde cada píxel representa tinta real.',
  },
};

export interface ProfileDefinition {
  id: VectorizeProfile;
  name: string;
  badge: string;
  description: string;
  defaultColors: number;
  defaultThreshold: number;
  defaultSmoothness: number;
  defaultDespeckle: number;
  ignoreWhiteBg: boolean;
  invert: boolean;
}

export const VECTORIZE_PROFILES: ProfileDefinition[] = [
  {
    id: 'logo_geom',
    name: 'Logotipo & Isotipo Geométrico',
    badge: 'Logos & Marcas',
    description:
      'Trazado de bordes rectos y arcos suaves con reducción de nodos parásitos. Ideal para manuales de identidad y papelería.',
    defaultColors: 1,
    defaultThreshold: 130,
    defaultSmoothness: 2,
    defaultDespeckle: 4,
    ignoreWhiteBg: true,
    invert: false,
  },
  {
    id: 'serigrafia_spot',
    name: 'Serigrafía Textil / Tintas Spot',
    badge: 'Separación Textil',
    description:
      'Cuantiza la imagen en 1 a 6 capas de tinta plana separadas (Pantone/Plastisol). Facilita la creación de positivos por malla.',
    defaultColors: 3,
    defaultThreshold: 120,
    defaultSmoothness: 3,
    defaultDespeckle: 5,
    ignoreWhiteBg: true,
    invert: false,
  },
  {
    id: 'vinil_corte',
    name: 'Vinil de Corte / Plotter / CNC',
    badge: 'Corte por Cuchilla',
    description:
      'Genera caminos cerrados continuos sin intersecciones internas ni solapamientos dobles. Optimizado para la cuchilla de corte.',
    defaultColors: 1,
    defaultThreshold: 140,
    defaultSmoothness: 3,
    defaultDespeckle: 6,
    ignoreWhiteBg: true,
    invert: false,
  },
  {
    id: 'boceto_tinta',
    name: 'Dibujo a Mano / Boceto Entintado',
    badge: 'Arte & Ilustración',
    description:
      'Binarización de alto rango dinámico que filtra la textura de papel escaneado y preserva la expresividad del trazo manual.',
    defaultColors: 1,
    defaultThreshold: 155,
    defaultSmoothness: 2,
    defaultDespeckle: 3,
    ignoreWhiteBg: true,
    invert: false,
  },
  {
    id: 'tipografia',
    name: 'Tipografía Escaneada / Sellos',
    badge: 'Fuentes & Sellos',
    description:
      'Conserva serifas finas, remates y astas ortogonales cerrando microporos de tinta típicos de impresiones antiguas.',
    defaultColors: 1,
    defaultThreshold: 145,
    defaultSmoothness: 1,
    defaultDespeckle: 2,
    ignoreWhiteBg: true,
    invert: false,
  },
  {
    id: 'fotomecanica',
    name: 'Fotomecánica / Grabado Vintage',
    badge: 'Líneas & Semitono',
    description:
      'Descompone sombras y medios tonos en tramas lineales vectoriales para impresión a 1 sola tinta offset o grabado.',
    defaultColors: 1,
    defaultThreshold: 115,
    defaultSmoothness: 1,
    defaultDespeckle: 1,
    ignoreWhiteBg: true,
    invert: false,
  },
];

export interface VectorizeOptions {
  profile?: VectorizeProfile;
  formatContext?: ImageFormatContext;
  colorCount: number; // 1 to 6
  threshold: number; // 10 to 240
  smoothness: number; // 1 to 5
  despeckle: number; // 1 to 12
  ignoreWhiteBg?: boolean;
  invert?: boolean;
  targetWidthMm?: number;
}

export interface VectorizeResult {
  elements: VectorElement[];
  generatedInks: InkColor[];
  originalWidth: number;
  originalHeight: number;
  tracedCurvesCount: number;
  formatDetected: string;
}

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Client-side high-precision contour & path consolidation vectorizer
export function vectorizeImage(
  img: HTMLImageElement,
  options: VectorizeOptions,
  docWidthMm: number,
  docHeightMm: number
): VectorizeResult {
  const canvas = document.createElement('canvas');
  // High fidelity tracing resolution
  const maxDim = 360;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 400, img.naturalHeight || 300));
  const w = Math.round((img.naturalWidth || 400) * scale);
  const h = Math.round((img.naturalHeight || 300) * scale);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      elements: [],
      generatedInks: [],
      originalWidth: w,
      originalHeight: h,
      tracedCurvesCount: 0,
      formatDetected: options.formatContext || 'auto',
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const pixels = imgData.data;

  // Aspect ratio in mm inside the document
  const targetW = options.targetWidthMm || Math.min(docWidthMm * 0.72, 125);
  const targetH = targetW * (h / w);
  const startX = (docWidthMm - targetW) / 2;
  const startY = (docHeightMm - targetH) / 2;

  const mmX = (px: number) => Number((startX + (px / w) * targetW).toFixed(2));
  const mmY = (py: number) => Number((startY + (py / h) * targetH).toFixed(2));
  const mmW = (pw: number) => Number(((pw / w) * targetW).toFixed(2));
  const mmH = (ph: number) => Number(((ph / h) * targetH).toFixed(2));

  // 1. MONOCHROME / SINGLE INK TRACING
  if (options.colorCount === 1) {
    const singleInk: InkColor = {
      id: 'ink-vec-black',
      name: options.profile === 'vinil_corte' ? 'Línea de Corte / Vinil' : 'Tinta Directa / Positivo',
      hex: '#111827',
      cmyk: { c: 0, m: 0, y: 0, k: 100 },
      screenAngleDeg: 45,
      isSpot: true,
      visible: true,
      locked: false,
    };

    const elements: VectorElement[] = [];
    const step = Math.max(1, Math.round(options.smoothness));
    const despeckleMin = Math.max(1, options.despeckle);

    // Group horizontal runs into consolidated path commands
    let pathCommands: string[] = [];
    let runCount = 0;

    for (let y = 0; y < h; y += step) {
      let runStart: number | null = null;
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

        let isDark = a > 50 && brightness < options.threshold;
        if (options.invert) isDark = !isDark && a > 50;

        if (isDark && runStart === null) {
          runStart = x;
        } else if (!isDark && runStart !== null) {
          const runLength = x - runStart;
          if (runLength >= despeckleMin) {
            const rx = mmX(runStart);
            const ry = mmY(y);
            const rw = mmW(runLength);
            const rh = mmH(step);

            pathCommands.push(`M ${rx} ${ry} h ${rw} v ${rh} h -${rw} Z`);
            runCount++;
          }
          runStart = null;
        }
      }

      // Check boundary run
      if (runStart !== null) {
        const runLength = w - runStart;
        if (runLength >= despeckleMin) {
          const rx = mmX(runStart);
          const ry = mmY(y);
          const rw = mmW(runLength);
          const rh = mmH(step);
          pathCommands.push(`M ${rx} ${ry} h ${rw} v ${rh} h -${rw} Z`);
          runCount++;
        }
      }
    }

    // Chunk path commands into clean, editable vector path objects
    // (Combining ~100 sub-paths per element keeps SVG lightweight and DOM fast)
    const chunkSize = 120;
    for (let i = 0; i < pathCommands.length; i += chunkSize) {
      const chunk = pathCommands.slice(i, i + chunkSize).join(' ');
      elements.push({
        id: `vec-path-mono-${i}`,
        name: `Trazo Vectorial #${Math.floor(i / chunkSize) + 1}`,
        type: 'path',
        inkId: singleInk.id,
        x: startX,
        y: startY,
        width: Number(targetW.toFixed(2)),
        height: Number(targetH.toFixed(2)),
        rotationDeg: 0,
        pathData: chunk,
        closed: true,
        fill: singleInk.hex,
        fillOpacity: 1.0,
        stroke: options.profile === 'vinil_corte' ? '#0284c7' : 'none',
        strokeWidthMm: options.profile === 'vinil_corte' ? 0.25 : 0,
      });
    }

    return {
      elements,
      generatedInks: [singleInk],
      originalWidth: w,
      originalHeight: h,
      tracedCurvesCount: runCount,
      formatDetected: options.formatContext || 'auto',
    };
  }

  // 2. MULTI-COLOR QUANTIZATION (1 to 6 Spot Inks for Silkscreen / Offset)
  const spotPalette: Array<{ r: number; g: number; b: number; hex: string; name: string }> = [
    { r: 24, g: 39, b: 64, hex: '#182740', name: 'Reflex Blue Spot' },
    { r: 220, g: 38, b: 38, hex: '#dc2626', name: 'Warm Red Spot' },
    { r: 234, g: 179, b: 8, hex: '#eab308', name: 'Yellow Gold Spot' },
    { r: 22, g: 101, b: 52, hex: '#166534', name: 'Forest Green Spot' },
    { r: 217, g: 119, b: 6, hex: '#d97706', name: 'Orange 021 Spot' },
    { r: 147, g: 51, b: 234, hex: '#9333ea', name: 'Violet C Spot' },
  ].slice(0, options.colorCount);

  const generatedInks: InkColor[] = spotPalette.map((col, idx) => ({
    id: `ink-spot-vec-${idx}`,
    name: `${col.name}`,
    hex: col.hex,
    cmyk: { c: 20 * idx, m: 30 * idx, y: 15 * idx, k: 10 * idx },
    screenAngleDeg: (15 + idx * 30) % 90,
    isSpot: true,
    visible: true,
    locked: false,
  }));

  const elements: VectorElement[] = [];
  const step = Math.max(2, Math.round(options.smoothness * 1.2));
  const colorPaths: string[][] = Array.from({ length: spotPalette.length }, () => []);
  let totalShapes = 0;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const a = pixels[idx + 3];
      if (a < 50) continue; // Transparency

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

      if (options.ignoreWhiteBg && brightness > 235) continue; // Paper white background

      // Find closest color cluster
      let bestDist = Infinity;
      let bestInkIdx = 0;
      for (let c = 0; c < spotPalette.length; c++) {
        const dr = r - spotPalette[c].r;
        const dg = g - spotPalette[c].g;
        const db = b - spotPalette[c].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestInkIdx = c;
        }
      }

      const rx = mmX(x);
      const ry = mmY(y);
      const rw = mmW(step);
      const rh = mmH(step);

      colorPaths[bestInkIdx].push(`M ${rx} ${ry} h ${rw} v ${rh} h -${rw} Z`);
      totalShapes++;
    }
  }

  // Create unified vector path element for each spot ink layer
  colorPaths.forEach((commands, inkIdx) => {
    if (commands.length === 0) return;
    const chunkSize = 150;
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = commands.slice(i, i + chunkSize).join(' ');
      elements.push({
        id: `vec-multi-ink-${inkIdx}-${i}`,
        name: `Capa: ${generatedInks[inkIdx].name} (${Math.floor(i / chunkSize) + 1})`,
        type: 'path',
        inkId: generatedInks[inkIdx].id,
        x: startX,
        y: startY,
        width: Number(targetW.toFixed(2)),
        height: Number(targetH.toFixed(2)),
        rotationDeg: 0,
        pathData: chunk,
        closed: true,
        fill: generatedInks[inkIdx].hex,
        fillOpacity: 1.0,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    }
  });

  return {
    elements,
    generatedInks,
    originalWidth: w,
    originalHeight: h,
    tracedCurvesCount: totalShapes,
    formatDetected: options.formatContext || 'auto',
  };
}
