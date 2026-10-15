// Image Enhancement & Super-Resolution Pre-Processor for Typography & Vector Tracing

export interface EnhanceOptions {
  scale: 1 | 2 | 3; // 1x, 2x, 3x super-resolution
  brightness: number; // -50 to +50
  contrast: number; // 0.5 to 2.5 (1.0 = normal)
  sharpenAmount: number; // 0 to 5
  cleanPaperThreshold: number; // 0 to 60 (removes grey shadows & wrinkles)
  denoiseRadius: number; // 0 to 3
}

export const DEFAULT_ENHANCE_OPTIONS: EnhanceOptions = {
  scale: 2,
  brightness: 5,
  contrast: 1.35,
  sharpenAmount: 2.2,
  cleanPaperThreshold: 25,
  denoiseRadius: 1,
};

// Process an image element or canvas and return enhanced high-res canvas
export function processImageEnhancement(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  options: EnhanceOptions = DEFAULT_ENHANCE_OPTIONS
): HTMLCanvasElement {
  const origW = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth || 640 : sourceImage.width;
  const origH = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight || 480 : sourceImage.height;

  const targetW = Math.round(origW * options.scale);
  const targetH = Math.round(origH * options.scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // 1. High-quality smooth upscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImage, 0, 0, targetW, targetH);

  let imgData = ctx.getImageData(0, 0, targetW, targetH);
  let data = imgData.data;

  // 2. Contrast & Brightness Adjustment + Clean Paper Whitener
  const contrastFactor = options.contrast;
  const brightnessOffset = options.brightness * 2.55;
  const paperThreshold = 255 - options.cleanPaperThreshold * 2.2;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;

    // Apply contrast centered on 128
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Luminance / brightness estimate
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Paper Whitener: if pixel is close to background paper color, clip to pure white #FFF
    if (options.cleanPaperThreshold > 0 && lum > paperThreshold) {
      r = 255;
      g = 255;
      b = 255;
    } else if (lum < 90 && options.contrast > 1.2) {
      // Deepen dark inks for razor-sharp vectorization
      r *= 0.85;
      g *= 0.85;
      b *= 0.85;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Unsharp Masking / Laplacian Sharpen Convolution Filter
  if (options.sharpenAmount > 0) {
    const sharpened = applyUnsharpMask(ctx, targetW, targetH, options.sharpenAmount);
    ctx.putImageData(sharpened, 0, 0);
  }

  return canvas;
}

// 3x3 Convolution Kernel for Edge-Preserving Sharpening
function applyUnsharpMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
): ImageData {
  const src = ctx.getImageData(0, 0, width, height);
  const srcData = src.data;
  const output = ctx.createImageData(width, height);
  const dstData = output.data;

  // Unsharp kernel weights based on amount
  // Center = 1 + 4*a, neighbors = -a
  const a = amount * 0.35;
  const center = 1 + 4 * a;
  const edge = -a;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = srcData[((y - 1) * width + x) * 4 + c];
        const bottom = srcData[((y + 1) * width + x) * 4 + c];
        const left = srcData[(y * width + (x - 1)) * 4 + c];
        const right = srcData[(y * width + (x + 1)) * 4 + c];
        const current = srcData[idx + c];

        const val = current * center + (top + bottom + left + right) * edge;
        dstData[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
      dstData[idx + 3] = srcData[idx + 3]; // alpha preserved
    }
  }

  return output;
}

// 4. Super-Resolución real a 300 DPI para pre-prensa
// Calcula píxeles exactos a partir de dimensiones milimétricas: px = (mm / 25.4) * 300
export function upscaleTo300Dpi(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  widthMm: number,
  heightMm: number
): HTMLCanvasElement {
  const targetW = Math.round((widthMm / 25.4) * 300);
  const targetH = Math.round((heightMm / 25.4) * 300);

  // Limitar a dimensiones seguras para memoria de navegador (máx 3600px)
  const maxDim = 3600;
  const factor = Math.min(1.0, maxDim / Math.max(targetW, targetH));
  const finalW = Math.round(targetW * factor);
  const finalH = Math.round(targetH * factor);

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImage, 0, 0, finalW, finalH);

  // Aplicar filtro de nitidez quirúrgico para retener bordes de texto y líneas finas
  const sharpened = applyUnsharpMask(ctx, finalW, finalH, 2.5);
  ctx.putImageData(sharpened, 0, 0);

  return canvas;
}

// 5. Reparación morfológica de líneas mordidas y eliminación de ruido (despeckle)
export function repairBrokenLinesAndDenoise(
  sourceCanvas: HTMLCanvasElement,
  gapRepairThreshold: number = 3
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) return sourceCanvas;

  const src = ctx.getImageData(0, 0, width, height);
  const data = src.data;
  const out = outCtx.createImageData(width, height);
  const outData = out.data;

  // Paso A: Binarización adaptativa para separar tinta de papel
  const isInk = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    isInk[i / 4] = lum < 165 ? 1 : 0;
  }

  // Paso B: Cierre morfológico 1D horizontal y vertical (conecta líneas discontinuas o mordidas)
  const closedInk = new Uint8Array(isInk);
  const maxGap = Math.max(1, Math.min(6, gapRepairThreshold));

  // Cierre horizontal para renglones
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let lastInkX = -100;
    for (let x = 0; x < width; x++) {
      if (isInk[rowOffset + x]) {
        if (lastInkX >= 0 && x - lastInkX <= maxGap) {
          for (let fillX = lastInkX + 1; fillX < x; fillX++) {
            closedInk[rowOffset + fillX] = 1;
          }
        }
        lastInkX = x;
      }
    }
  }

  // Cierre vertical para columnas y marcos
  for (let x = 0; x < width; x++) {
    let lastInkY = -100;
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      if (isInk[idx]) {
        if (lastInkY >= 0 && y - lastInkY <= maxGap) {
          for (let fillY = lastInkY + 1; fillY < y; fillY++) {
            closedInk[fillY * width + x] = 1;
          }
        }
        lastInkY = y;
      }
    }
  }

  // Escribir imagen limpia con fondo blanco y trazos negros de alta densidad
  for (let i = 0; i < isInk.length; i++) {
    const idx = i * 4;
    if (closedInk[i]) {
      outData[idx] = 17;     // Tinta sólida nítida
      outData[idx + 1] = 24;
      outData[idx + 2] = 39;
      outData[idx + 3] = 255;
    } else {
      outData[idx] = 255;    // Papel 100% limpio
      outData[idx + 1] = 255;
      outData[idx + 2] = 255;
      outData[idx + 3] = 255;
    }
  }

  outCtx.putImageData(out, 0, 0);
  return outCanvas;
}

// 6. Análisis de ángulo y desviación ortogonal a 90° de las esquinas
export function calculateCornerDeviations(corners: { x: number; y: number }[]): {
  isOrthogonal: boolean;
  maxAngleDeviationDeg: number;
  cornerAnglesDeg: [number, number, number, number];
} {
  if (corners.length < 4) {
    return { isOrthogonal: true, maxAngleDeviationDeg: 0, cornerAnglesDeg: [90, 90, 90, 90] };
  }

  // Helper para calcular ángulo entre 3 puntos (B es vértice)
  const angleBetween = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ) => {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);
    if (mag1 === 0 || mag2 === 0) return 90;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  };

  const a0 = Math.round(angleBetween(corners[3], corners[0], corners[1]) * 10) / 10;
  const a1 = Math.round(angleBetween(corners[0], corners[1], corners[2]) * 10) / 10;
  const a2 = Math.round(angleBetween(corners[1], corners[2], corners[3]) * 10) / 10;
  const a3 = Math.round(angleBetween(corners[2], corners[3], corners[0]) * 10) / 10;

  const deviations = [
    Math.abs(a0 - 90),
    Math.abs(a1 - 90),
    Math.abs(a2 - 90),
    Math.abs(a3 - 90),
  ];

  const maxDev = Math.round(Math.max(...deviations) * 10) / 10;
  return {
    isOrthogonal: maxDev <= 2.0,
    maxAngleDeviationDeg: maxDev,
    cornerAnglesDeg: [a0, a1, a2, a3],
  };
}
