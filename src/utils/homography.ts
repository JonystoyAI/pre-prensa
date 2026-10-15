import { Point2D } from '../types/prepress';

// Perspective rectification helper using 4-corner homography/warp
export function rectifyPerspectiveImage(
  sourceImage: HTMLImageElement,
  corners: Point2D[], // normalized [0..1]
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const srcW = sourceImage.naturalWidth || 600;
  const srcH = sourceImage.naturalHeight || 400;

  // Convert normalized corners to pixel coordinates
  const p0 = { x: corners[0].x * srcW, y: corners[0].y * srcH }; // TL
  const p1 = { x: corners[1].x * srcW, y: corners[1].y * srcH }; // TR
  const p2 = { x: corners[2].x * srcW, y: corners[2].y * srcH }; // BR
  const p3 = { x: corners[3].x * srcW, y: corners[3].y * srcH }; // BL

  // Subdivide target into small triangle mesh strips for high-quality bilinear perspective warp
  const stepsX = 24;
  const stepsY = 24;

  const getSourcePt = (u: number, v: number): Point2D => {
    // Bilinear interpolation between the 4 corners
    const topX = p0.x + u * (p1.x - p0.x);
    const topY = p0.y + u * (p1.y - p0.y);
    const botX = p3.x + u * (p2.x - p3.x);
    const botY = p3.y + u * (p2.y - p3.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY),
    };
  };

  const dx = targetWidth / stepsX;
  const dy = targetHeight / stepsY;

  for (let yi = 0; yi < stepsY; yi++) {
    for (let xi = 0; xi < stepsX; xi++) {
      const u0 = xi / stepsX;
      const u1 = (xi + 1) / stepsX;
      const v0 = yi / stepsY;
      const v1 = (yi + 1) / stepsY;

      const sp0 = getSourcePt(u0, v0);
      const sp1 = getSourcePt(u1, v0);
      const sp2 = getSourcePt(u1, v1);
      const sp3 = getSourcePt(u0, v1);

      const destX = xi * dx;
      const destY = yi * dy;

      ctx.save();
      ctx.beginPath();
      ctx.rect(destX, destY, dx + 0.5, dy + 0.5);
      ctx.clip();

      const srcClipX = Math.min(sp0.x, sp1.x, sp2.x, sp3.x);
      const srcClipY = Math.min(sp0.y, sp1.y, sp2.y, sp3.y);
      const srcClipW = Math.max(sp0.x, sp1.x, sp2.x, sp3.x) - srcClipX;
      const srcClipH = Math.max(sp0.y, sp1.y, sp2.y, sp3.y) - srcClipY;

      ctx.drawImage(
        sourceImage,
        Math.max(0, srcClipX),
        Math.max(0, srcClipY),
        Math.max(1, srcClipW),
        Math.max(1, srcClipH),
        destX,
        destY,
        dx + 0.5,
        dy + 0.5
      );
      ctx.restore();
    }
  }

  return canvas;
}
