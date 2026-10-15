import { jsPDF } from 'jspdf';
import { DocumentDimensions, InkColor, VectorElement } from '../types/prepress';
import { convertAllCompositionTextsToCurves } from './textToCurves';
import { STANDARD_FOGRA_COLOR_BAR_PATCHES } from './impositionCalculations';

export interface PdfExportOptions {
  convertToCurves: boolean;
  showCropMarks: boolean;
  showRegistrationMarks: boolean;
  showColorBars: boolean;
  showGripperMargin: boolean;
  bleedMm: number;
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  convertToCurves: true,
  showCropMarks: true,
  showRegistrationMarks: true,
  showColorBars: true,
  showGripperMargin: true,
  bleedMm: 3.0,
};

// Generates a print-ready vector PDF matching exact physical sheet dimensions
export function generatePrepressPdf(
  doc: DocumentDimensions,
  elements: VectorElement[],
  inks: InkColor[],
  options: PdfExportOptions = DEFAULT_PDF_OPTIONS
): jsPDF {
  // Total PDF page dimensions including optional bleed/marks margins
  const extraMargin = options.showCropMarks ? 12 : 0;
  const totalW = doc.widthMm + extraMargin * 2;
  const totalH = doc.heightMm + extraMargin * 2;

  // Initialize jsPDF with exact mm units
  const pdf = new jsPDF({
    orientation: doc.widthMm > doc.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [totalW, totalH],
    compress: true,
  });

  // Background sheet
  const offsetX = extraMargin;
  const offsetY = extraMargin;

  // Draw white paper page rect
  pdf.setFillColor(255, 255, 255);
  pdf.rect(offsetX, offsetY, doc.widthMm, doc.heightMm, 'F');

  // Process elements: if convertToCurves is active, transform texts to pure vector outlines!
  const finalElements = options.convertToCurves
    ? convertAllCompositionTextsToCurves(elements, doc.widthMm, doc.heightMm)
    : elements;

  // Render vector elements
  for (const el of finalElements) {
    if (el.visible === false) continue;
    const ink = inks.find((i) => i.id === el.inkId) || inks[0];
    if (ink && !ink.visible) continue;

    const posX = offsetX + el.x;
    const posY = offsetY + el.y;

    // Helper to apply fill color
    if (el.fill && el.fill !== 'none') {
      const hex = el.fill.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      pdf.setFillColor(r, g, b);
    }

    // Helper to apply stroke color
    if (el.stroke && el.stroke !== 'none') {
      const hex = el.stroke.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(Math.max(0.1, el.strokeWidthMm));
    }

    if (el.type === 'rect') {
      const style = el.fill !== 'none' && el.stroke !== 'none' ? 'FD' : el.fill !== 'none' ? 'F' : 'D';
      pdf.rect(posX, posY, el.width, el.height, style);
    } else if (el.type === 'circle') {
      const rx = el.width / 2;
      const ry = el.height / 2;
      const style = el.fill !== 'none' && el.stroke !== 'none' ? 'FD' : el.fill !== 'none' ? 'F' : 'D';
      pdf.ellipse(posX + rx, posY + ry, rx, ry, style);
    } else if (el.type === 'line') {
      pdf.line(posX, posY, posX + el.width, posY + el.height);
    } else if (el.type === 'rulings') {
      const rows = el.rowCount || 8;
      const spacing = el.rowSpacingMm || 8;
      pdf.setLineWidth(Math.max(0.15, el.strokeWidthMm));
      for (let r = 0; r < rows; r++) {
        const lineY = posY + r * spacing;
        pdf.line(posX, lineY, posX + el.width, lineY);
      }
    } else if (el.type === 'folio') {
      pdf.setDrawColor(220, 38, 38); // red folio stroke
      pdf.setLineWidth(0.35);
      pdf.rect(posX, posY, el.width, el.height, 'D');

      pdf.setTextColor(220, 38, 38);
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(11);
      const folioText =
        (el.folioPrefix || 'N° A-') +
        (el.folioStartNumber || 101).toString().padStart(el.folioDigits || 6, '0');
      pdf.text(folioText, posX + 3, posY + el.height - 3.5);
    } else if (el.type === 'watermark') {
      // Safe watermark rendered with faint tone
      pdf.setTextColor(180, 180, 180);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(32);
      pdf.text(el.text || 'ORIGINAL', posX, posY + 10, {
        angle: el.rotationDeg || -12,
      });
    } else if (el.type === 'text') {
      // If text was not converted to curves (living editable fonts)
      pdf.setTextColor(20, 24, 33);
      pdf.setFont('helvetica', el.fontWeight === 'bold' ? 'bold' : 'normal');
      pdf.setFontSize(el.fontSizePt || 12);
      pdf.text(el.text || '', posX, posY + (el.fontSizePt || 12) * 0.3527);
    } else if (el.type === 'path' && (el as any).customPathData) {
      // Vector outlines representation of converted text glyphs!
      // Rendered as razor-sharp vector rectangles/shapes
      const cmds = (el as any).customPathData.split(' M ');
      for (const cmd of cmds) {
        const parts = cmd.replace(/^M\s*/, '').split(/\s+/);
        if (parts.length >= 6) {
          const rx = parseFloat(parts[0]) + offsetX;
          const ry = parseFloat(parts[1]) + offsetY;
          const rw = parseFloat(parts[3]) || 2;
          const rh = parseFloat(parts[5]) || 0.5;
          pdf.setFillColor(20, 24, 33);
          pdf.rect(rx, ry, rw, rh, 'F');
        }
      }
    }
  }

  // Pre-press Marks (Crop marks, registration crosses, and color bar)
  if (options.showCropMarks) {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);

    const markLen = 5;
    const markOff = 2;

    // Top-Left
    pdf.line(offsetX - markOff - markLen, offsetY, offsetX - markOff, offsetY);
    pdf.line(offsetX, offsetY - markOff - markLen, offsetX, offsetY - markOff);

    // Top-Right
    pdf.line(offsetX + doc.widthMm + markOff, offsetY, offsetX + doc.widthMm + markOff + markLen, offsetY);
    pdf.line(offsetX + doc.widthMm, offsetY - markOff - markLen, offsetX + doc.widthMm, offsetY - markOff);

    // Bottom-Left
    pdf.line(offsetX - markOff - markLen, offsetY + doc.heightMm, offsetX - markOff, offsetY + doc.heightMm);
    pdf.line(offsetX, offsetY + doc.heightMm + markOff, offsetX, offsetY + doc.heightMm + markOff + markLen);

    // Bottom-Right
    pdf.line(offsetX + doc.widthMm + markOff, offsetY + doc.heightMm, offsetX + doc.widthMm + markOff + markLen, offsetY + doc.heightMm);
    pdf.line(offsetX + doc.widthMm, offsetY + doc.heightMm + markOff, offsetX + doc.widthMm, offsetY + doc.heightMm + markOff + markLen);
  }

  // Mechanical Gripper line (0.8 cm indication on lead edge)
  if (options.showGripperMargin) {
    pdf.setDrawColor(217, 119, 6); // amber
    pdf.setLineWidth(0.2);
    pdf.line(offsetX, offsetY + doc.gripperMarginMm, offsetX + doc.widthMm, offsetY + doc.gripperMarginMm);

    pdf.setTextColor(180, 83, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text(`PINZA MECANICA (${doc.gripperMarginMm} mm) - 0.8 CM`, offsetX + 2, offsetY + doc.gripperMarginMm - 1.5);
  }

  // FOGRA Color bar on sheet margin
  if (options.showColorBars && extraMargin > 0) {
    const barY = offsetY + doc.heightMm + 5;
    const patchW = 6;
    const patchH = 3.5;
    const startX = offsetX + (doc.widthMm - STANDARD_FOGRA_COLOR_BAR_PATCHES.length * (patchW + 0.5)) / 2;

    STANDARD_FOGRA_COLOR_BAR_PATCHES.forEach((patch, idx) => {
      const hex = patch.hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;

      const px = startX + idx * (patchW + 0.5);
      pdf.setFillColor(r, g, b);
      pdf.rect(px, barY, patchW, patchH, 'F');
      pdf.setDrawColor(100, 100, 100);
      pdf.rect(px, barY, patchW, patchH, 'D');
    });
  }

  // PDF Document Properties & Metadata
  pdf.setProperties({
    title: `Prepress_${doc.name}_${options.convertToCurves ? 'Curvas' : 'Fuentes'}`,
    subject: 'Archivo PDF de pre-prensa generado por PressForge Studio',
    author: 'PressForge Studio - Pre-Prensa y Taller',
    keywords: 'preprensa, offset, ctp, separacion de color, curvas, fogra',
    creator: 'PressForge Studio',
  });

  return pdf;
}
