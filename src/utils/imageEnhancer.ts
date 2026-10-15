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
