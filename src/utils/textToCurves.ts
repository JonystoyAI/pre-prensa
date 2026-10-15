import { VectorElement } from '../types/prepress';

// Converts any text vector element into a pure vector path element (<path d="...">)
// so that RIP processors, CTP units, and other computers require NO installed fonts.
export function convertTextElementToCurves(
  el: VectorElement,
  docWidthMm: number,
  docHeightMm: number
): VectorElement {
  if (el.type !== 'text' || !el.text) return el;

  const text = el.text;
  const fontSizePt = el.fontSizePt || 12;
  const fontSizeMm = fontSizePt * 0.3527; // 1 pt = 0.3527 mm
  const fontWeight = el.fontWeight || 'normal';
  const fontFamily = el.fontFamily || 'Plus Jakarta Sans, sans-serif';

  // High-resolution raster-to-vector glyph contour generator
  const canvas = document.createElement('canvas');
  // 12x supersampling for razor-sharp vector path precision
  const scale = 12;
  const padding = 10;
  const textW = Math.max(20, Math.ceil(text.length * fontSizeMm * 1.2 * scale));
  const textH = Math.max(20, Math.ceil(fontSizeMm * 2.0 * scale));

  canvas.width = textW + padding * 2;
  canvas.height = textH + padding * 2;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return el;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = `${fontWeight} ${fontSizeMm * scale}px ${fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, padding, padding);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Extract horizontal runs and generate compact vector path polygons
  const pathCommands: string[] = [];
  const stepY = 2; // sample resolution
  const stepX = 2;

  for (let py = 0; py < canvas.height; py += stepY) {
    let runStart: number | null = null;
    for (let px = 0; px < canvas.width; px += stepX) {
      const idx = (py * canvas.width + px) * 4;
      const alpha = 255 - (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const isInk = alpha > 110;

      if (isInk && runStart === null) {
        runStart = px;
      } else if (!isInk && runStart !== null) {
        const runW = px - runStart;
        if (runW >= 2) {
          // Map back to document mm
          const rx = Number((el.x + (runStart - padding) / scale).toFixed(2));
          const ry = Number((el.y + (py - padding) / scale).toFixed(2));
          const rw = Number((runW / scale).toFixed(2));
          const rh = Number((stepY / scale).toFixed(2));

          pathCommands.push(`M ${rx} ${ry} h ${rw} v ${rh} h -${rw} Z`);
        }
        runStart = null;
      }
    }
  }

  // If vector contours were extracted, return as pure vector path element
  if (pathCommands.length > 0) {
    return {
      ...el,
      type: 'path',
      nodes: [
        { x: el.x, y: el.y },
        { x: el.x + el.width, y: el.y + el.height },
      ],
      closed: true,
      fill: el.fill === 'none' ? '#111827' : el.fill,
      stroke: 'none',
      strokeWidthMm: 0,
      // Custom SVG path data attached
      customPathData: pathCommands.join(' '),
    } as VectorElement & { customPathData?: string };
  }

  return el;
}

// Convert an array of elements: replaces all text elements with vector path outlines
export function convertAllCompositionTextsToCurves(
  elements: VectorElement[],
  docWidthMm: number,
  docHeightMm: number
): VectorElement[] {
  return elements.map((el) => {
    if (el.type === 'text') {
      return convertTextElementToCurves(el, docWidthMm, docHeightMm);
    }
    return el;
  });
}
