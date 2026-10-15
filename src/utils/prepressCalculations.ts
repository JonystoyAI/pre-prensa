import { DocumentDimensions, PreflightAlert, PrintSystem, VectorElement } from '../types/prepress';

// Screen coordinate conversion constants (96 DPI standard: 1 inch = 25.4 mm = 96 px)
export const MM_TO_PX = 96 / 25.4; // ~3.7795 px per mm
export const PX_TO_MM = 25.4 / 96;

export const PT_TO_MM = 25.4 / 72; // ~0.3527 mm per pt
export const MM_TO_PT = 72 / 25.4;

export const STANDARD_FORMATS: DocumentDimensions[] = [
  {
    name: 'Media Carta Apaisada (21.5 × 14 cm)',
    widthMm: 215.9,
    heightMm: 139.7,
    orientation: 'horizontal',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
  {
    name: 'Media Carta Vertical (14 × 21.5 cm)',
    widthMm: 139.7,
    heightMm: 215.9,
    orientation: 'vertical',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
  {
    name: 'Medio Oficio Apaisado (21.5 × 17 cm)',
    widthMm: 215.9,
    heightMm: 170.0,
    orientation: 'horizontal',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
  {
    name: 'Carta Estándar (21.59 × 27.94 cm)',
    widthMm: 215.9,
    heightMm: 279.4,
    orientation: 'vertical',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
  {
    name: 'Oficio Tradicional (21.59 × 34 cm)',
    widthMm: 215.9,
    heightMm: 340.0,
    orientation: 'vertical',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
  {
    name: 'Doble Carta / Tabloide (27.94 × 43.18 cm)',
    widthMm: 279.4,
    heightMm: 431.8,
    orientation: 'vertical',
    gripperMarginMm: 8.0,
    gripperEdge: 'top',
    safeMarginMm: 4.0,
    bleedMm: 3.0,
  },
];

// Checks pre-flight technical compliance based on printing physics
export function runPreflightCheck(
  elements: VectorElement[],
  doc: DocumentDimensions,
  printSystem: PrintSystem
): PreflightAlert[] {
  const alerts: PreflightAlert[] = [];

  // 1. Check Gripper margin (Pinza de la máquina) - usually top 8mm
  const gripperBoundaryY = doc.gripperEdge === 'top' ? doc.gripperMarginMm : 0;
  let elementsInGripper = 0;

  for (const el of elements) {
    if (doc.gripperEdge === 'top' && el.y < gripperBoundaryY) {
      elementsInGripper++;
    }
  }

  if (elementsInGripper > 0) {
    alerts.push({
      id: 'gripper-violation',
      severity: 'error',
      title: 'Invasión en Pinza de Máquina (0.8 cm)',
      message: `Hay ${elementsInGripper} elemento(s) dentro de los primeros ${doc.gripperMarginMm} mm del borde de entrada. La pinza mecánica de la prensa dañará o no imprimirá esa zona.`,
      recommendation: `Mueve los elementos al menos a ${doc.gripperMarginMm} mm del margen superior.`,
    });
  }

  // 2. Check Watermarks (Crucial for small offset shops)
  const watermarks = elements.filter((el) => el.type === 'watermark' || el.fillOpacity < 0.25);
  for (const wm of watermarks) {
    const opacityPct = Math.round(wm.fillOpacity * 100);
    if (opacityPct > 8) {
      alerts.push({
        id: `wm-too-dark-${wm.id}`,
        severity: 'warning',
        title: `Marca de Agua al ${opacityPct}% (Muy oscura)`,
        message: `En prensas pequeñas de taller y offset de 1 tinta, una marca de agua superior a 8% tapará el texto que el cliente escriba a mano.`,
        elementId: wm.id,
        recommendation: 'Ajusta la opacidad de la marca de agua entre 4% y 7% de tinta negra.',
      });
    } else if (opacityPct < 3 && opacityPct > 0) {
      alerts.push({
        id: `wm-too-faint-${wm.id}`,
        severity: 'info',
        title: `Marca de Agua al ${opacityPct}% (Muy tenue)`,
        message: `A menos del 3%, el punto de trama en offset o serigrafía puede perderse en el quemado de placas o fotolitos.`,
        elementId: wm.id,
        recommendation: 'Usa idealmente 5% a 6% para visibilidad perfecta sin empaste.',
      });
    }
  }

  // 3. System-specific print checks (Serigrafía, Flexo, Vinil)
  if (printSystem === 'serigrafia') {
    // Check small texts and hairline serifs
    const smallTexts = elements.filter(
      (el) => el.type === 'text' && (el.fontSizePt || 12) < 8
    );
    if (smallTexts.length > 0) {
      alerts.push({
        id: 'serigrafia-small-text',
        severity: 'error',
        title: 'Riesgo de Emplaste en Serigrafía Manual',
        message: `Se detectaron ${smallTexts.length} texto(s) con tamaño menor a 8 pt. Las tintas textiles o vinílicas con rasero manual tienden a cerrar los ojales y empastar las letras.`,
        recommendation: 'Aumenta el tamaño a mínimo 8.5 pt o usa fuentes sans-serif de trazo grueso sin patines.',
      });
    }

    const thinLines = elements.filter(
      (el) => el.strokeWidthMm > 0 && el.strokeWidthMm < 0.25
    );
    if (thinLines.length > 0) {
      alerts.push({
        id: 'serigrafia-thin-lines',
        severity: 'warning',
        title: 'Líneas menores a 0.25 mm en Serigrafía',
        message: `Hay ${thinLines.length} trazo(s) excesivamente finos. Podrían desvanecerse en el revelado de la emulsión en mallas inferiores a 120T.`,
        recommendation: 'Engrosa los filetes a un mínimo de 0.30 mm (aprox. 0.85 pt).',
      });
    }
  } else if (printSystem === 'vinil') {
    const tinyDetails = elements.filter(
      (el) => (el.type === 'rect' || el.type === 'circle') && (el.width < 3 || el.height < 3)
    );
    if (tinyDetails.length > 0) {
      alerts.push({
        id: 'vinil-tiny-cuts',
        severity: 'warning',
        title: 'Elementos diminutos para corte en vinil',
        message: `Objetos menores a 3 mm dificultan el depilado (pelado) manual del vinil adhesivo.`,
        recommendation: 'Simplifica o amplía los detalles para corte con navaja de 45°.',
      });
    }
  }

  // 4. Safe margin violations (borders)
  const outOfBounds = elements.filter(
    (el) =>
      el.x < doc.safeMarginMm ||
      el.y < doc.safeMarginMm ||
      el.x + el.width > doc.widthMm - doc.safeMarginMm ||
      el.y + el.height > doc.heightMm - doc.safeMarginMm
  );

  if (outOfBounds.length > 0) {
    alerts.push({
      id: 'safe-margin-border',
      severity: 'info',
      title: 'Elementos cerca del corte de guillotina',
      message: `${outOfBounds.length} elemento(s) están a menos de ${doc.safeMarginMm} mm del borde de corte. Si la guillotina tiene una variación de 1 mm, podrían quedar mordidos.`,
      recommendation: `Mantén un margen de seguridad interno de al menos ${doc.safeMarginMm} mm.`,
    });
  }

  return alerts;
}
