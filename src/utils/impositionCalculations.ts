import { EditorialPageSlot, InkColor } from '../types/prepress';

export interface FoldGuideLine {
  id: string;
  type: 'horizontal' | 'vertical';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sequenceStep: number; // 1, 2, 3 (Secuencia para plegadora Stahl/MBO)
  label: string; // Ej: "Pliegue 1: Cabeza con Cabeza"
  isSpine?: boolean; // Lomo de encuadernación
}

export interface PaperWasteMetrics {
  totalSheetAreaCm2: number;
  usefulPrintAreaCm2: number;
  wasteAreaCm2: number;
  efficiencyPercent: number; // % área útil impresa
  wastePercent: number; // % merma de papel
  gripperLossCm2: number; // Área absorbida por pinza mecánica
  gutterLossCm2: number; // Área de sangrías y calles de corte
  efficiencyRating: 'optimo' | 'aceptable' | 'deficiente';
  costAdvice: string;
  sheetsNeededPer1000Units: number; // Pliegos requeridos por millar (+5% merma)
}

export interface MultiCardImpositionLayout {
  name: string;
  cardCount: 4 | 6 | 8;
  columns: number;
  rows: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  gripperMarginMm: number;
  gutterMm: number;
  orientationMode: 'cabeza_con_cabeza' | 'pie_con_pie' | 'normal';
  slots: EditorialPageSlot[];
  foldMarks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  foldGuides: FoldGuideLine[];
  cropMarks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  registrationMarks: Array<{ x: number; y: number }>;
  colorBarY: number;
  wasteMetrics: PaperWasteMetrics;
}

export interface SignatureLayout {
  name: string;
  totalPages: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  gripperMarginMm: number;
  gutterMm: number;
  tiroSlots: EditorialPageSlot[];
  retiroSlots: EditorialPageSlot[];
  creepRecommendationMm: number;
  foldGuides: FoldGuideLine[];
  wasteMetrics: PaperWasteMetrics;
}

// Función para calcular métricas de desperdicio de papel y optimización de costos
export function calculatePaperWasteMetrics(
  sheetWidthMm: number,
  sheetHeightMm: number,
  cardWidthMm: number,
  cardHeightMm: number,
  cardCount: number,
  gripperMarginMm: number,
  gutterMm: number
): PaperWasteMetrics {
  const totalAreaMm2 = sheetWidthMm * sheetHeightMm;
  const usefulAreaMm2 = cardWidthMm * cardHeightMm * cardCount;
  const wasteAreaMm2 = Math.max(0, totalAreaMm2 - usefulAreaMm2);

  const totalSheetAreaCm2 = Number((totalAreaMm2 / 100).toFixed(1));
  const usefulPrintAreaCm2 = Number((usefulAreaMm2 / 100).toFixed(1));
  const wasteAreaCm2 = Number((wasteAreaMm2 / 100).toFixed(1));

  const efficiencyPercent = Number(((usefulAreaMm2 / totalAreaMm2) * 100).toFixed(1));
  const wastePercent = Number((100 - efficiencyPercent).toFixed(1));

  const gripperLossCm2 = Number(((sheetWidthMm * gripperMarginMm) / 100).toFixed(1));
  const gutterLossCm2 = Number(Math.max(0, wasteAreaCm2 - gripperLossCm2).toFixed(1));

  let efficiencyRating: 'optimo' | 'aceptable' | 'deficiente' = 'aceptable';
  let costAdvice = '';

  if (wastePercent <= 18) {
    efficiencyRating = 'optimo';
    costAdvice = 'Excelente aprovechamiento del pliego. Merma óptima para producción industrial.';
  } else if (wastePercent <= 28) {
    efficiencyRating = 'aceptable';
    costAdvice = 'Merma normal de taller: incluye pinza mecánica (8 mm), calles de corte y marcas de registro.';
  } else {
    efficiencyRating = 'deficiente';
    costAdvice = 'Merma elevada (>28%). Evalúa ajustar tamaño de pliego padre o incrementar cartas por pliego.';
  }

  // Pliegos requeridos por cada 1,000 cartas o pliegos terminados (+5% margen de puesta a punto)
  const netSheets = Math.ceil(1000 / Math.max(1, cardCount));
  const sheetsNeededPer1000Units = Math.ceil(netSheets * 1.05);

  return {
    totalSheetAreaCm2,
    usefulPrintAreaCm2,
    wasteAreaCm2,
    efficiencyPercent,
    wastePercent,
    gripperLossCm2,
    gutterLossCm2,
    efficiencyRating,
    costAdvice,
    sheetsNeededPer1000Units,
  };
}

// Generates industry standard 4, 6, and 8 cards/pages imposition
export function calculateMultiCardImposition(
  cardCount: 4 | 6 | 8,
  cardWidthMm: number,
  cardHeightMm: number,
  orientationMode: 'cabeza_con_cabeza' | 'pie_con_pie' | 'normal' = 'cabeza_con_cabeza',
  gutterMm: number = 4.0,
  gripperMarginMm: number = 8.0
): MultiCardImpositionLayout {
  let cols = 2;
  let rows = 2;

  if (cardCount === 4) {
    cols = 2;
    rows = 2;
  } else if (cardCount === 6) {
    // 6 cards: 3 columns x 2 rows (standard half-sheet 52x74 cm or tríptico doble)
    cols = 3;
    rows = 2;
  } else if (cardCount === 8) {
    // 8 cards: 4 columns x 2 rows (standard full sheet 70x100 or octavo 4x2)
    cols = 4;
    rows = 2;
  }

  const sheetW = Number((cols * cardWidthMm + (cols - 1) * gutterMm + 24).toFixed(1)); // extra 12mm margins for marks
  const sheetH = Number((rows * cardHeightMm + (rows - 1) * gutterMm + gripperMarginMm + 20).toFixed(1));

  const startX = 12; // left margin for marks
  const startY = gripperMarginMm + 6; // top margin below gripper

  const slots: EditorialPageSlot[] = [];
  const foldMarks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const cropMarks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const registrationMarks: Array<{ x: number; y: number }> = [];

  // Generate slots with head-to-head or foot-to-foot rotation
  let slotIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const posX = Number((startX + c * (cardWidthMm + gutterMm)).toFixed(1));
      const posY = Number((startY + r * (cardHeightMm + gutterMm)).toFixed(1));

      let rot = 0;
      let isFlipped = false;

      if (orientationMode === 'cabeza_con_cabeza') {
        // Top row (r === 0) has heads pointing to the center fold -> 180° rotation
        if (r === 0) {
          rot = 180;
          isFlipped = true;
        } else {
          rot = 0;
          isFlipped = false;
        }
      } else if (orientationMode === 'pie_con_pie') {
        // Bottom row (r === 1) is flipped
        if (r === 1) {
          rot = 180;
          isFlipped = true;
        } else {
          rot = 0;
          isFlipped = false;
        }
      } else {
        // Normal (0° all)
        rot = 0;
        isFlipped = false;
      }

      slots.push({
        pageNumber: slotIndex + 1,
        x: posX,
        y: posY,
        width: cardWidthMm,
        height: cardHeightMm,
        rotationDeg: rot,
        isHeadFlipped: isFlipped,
        slotIndex,
      });

      // Crop marks for each card corner
      const markLen = 4;
      const markOffset = 2;

      // Top-Left corner
      cropMarks.push({ x1: posX - markOffset - markLen, y1: posY, x2: posX - markOffset, y2: posY });
      cropMarks.push({ x1: posX, y1: posY - markOffset - markLen, x2: posX, y2: posY - markOffset });

      // Top-Right corner
      cropMarks.push({ x1: posX + cardWidthMm + markOffset, y1: posY, x2: posX + cardWidthMm + markOffset + markLen, y2: posY });
      cropMarks.push({ x1: posX + cardWidthMm, y1: posY - markOffset - markLen, x2: posX + cardWidthMm, y2: posY - markOffset });

      // Bottom-Left corner
      cropMarks.push({ x1: posX - markOffset - markLen, y1: posY + cardHeightMm, x2: posX - markOffset, y2: posY + cardHeightMm });
      cropMarks.push({ x1: posX, y1: posY + cardHeightMm + markOffset, x2: posX, y2: posY + cardHeightMm + markOffset + markLen });

      // Bottom-Right corner
      cropMarks.push({ x1: posX + cardWidthMm + markOffset, y1: posY + cardHeightMm, x2: posX + cardWidthMm + markOffset + markLen, y2: posY + cardHeightMm });
      cropMarks.push({ x1: posX + cardWidthMm, y1: posY + cardHeightMm + markOffset, x2: posX + cardWidthMm, y2: posY + cardHeightMm + markOffset + markLen });

      slotIndex++;
    }
  }

  const foldGuides: FoldGuideLine[] = [];

  // Horizontal fold line between row 0 and row 1
  if (rows > 1) {
    const foldY = Number((startY + cardHeightMm + gutterMm / 2).toFixed(1));
    foldMarks.push({ x1: 2, y1: foldY, x2: 8, y2: foldY });
    foldMarks.push({ x1: sheetW - 8, y1: foldY, x2: sheetW - 2, y2: foldY });

    foldGuides.push({
      id: 'fold-h-1',
      type: 'horizontal',
      x1: 2,
      y1: foldY,
      x2: sheetW - 2,
      y2: foldY,
      sequenceStep: 1,
      label:
        orientationMode === 'cabeza_con_cabeza'
          ? 'Pliegue 1: Doblez Horizontal (Cabeza con Cabeza)'
          : 'Pliegue 1: Doblez Longitudinal',
      isSpine: true,
    });
  }

  // Vertical fold lines between columns
  for (let c = 1; c < cols; c++) {
    const foldX = Number((startX + c * cardWidthMm + (c - 0.5) * gutterMm).toFixed(1));
    foldMarks.push({ x1: foldX, y1: 2, x2: foldX, y2: 6 });
    foldMarks.push({ x1: foldX, y1: sheetH - 6, x2: foldX, y2: sheetH - 2 });

    foldGuides.push({
      id: `fold-v-${c}`,
      type: 'vertical',
      x1: foldX,
      y1: gripperMarginMm + 1,
      x2: foldX,
      y2: sheetH - 2,
      sequenceStep: c + (rows > 1 ? 1 : 0),
      label: `Pliegue ${c + (rows > 1 ? 1 : 0)}: Doblez Vertical Col ${c}`,
      isSpine: c === Math.floor(cols / 2),
    });
  }

  // Registration marks on sheet perimeter
  registrationMarks.push({ x: sheetW / 2, y: 4 }); // Top center
  registrationMarks.push({ x: sheetW / 2, y: sheetH - 4 }); // Bottom center
  registrationMarks.push({ x: 5, y: sheetH / 2 }); // Left center
  registrationMarks.push({ x: sheetW - 5, y: sheetH / 2 }); // Right center

  // Paper waste metrics for sheet
  const wasteMetrics = calculatePaperWasteMetrics(
    sheetW,
    sheetH,
    cardWidthMm,
    cardHeightMm,
    cardCount,
    gripperMarginMm,
    gutterMm
  );

  return {
    name: `Pliego de ${cardCount} Cartas (${cols} × ${rows}) - ${orientationMode.replace(/_/g, ' ').toUpperCase()}`,
    cardCount,
    columns: cols,
    rows,
    sheetWidthMm: sheetW,
    sheetHeightMm: sheetH,
    gripperMarginMm,
    gutterMm,
    orientationMode,
    slots,
    foldMarks,
    foldGuides,
    cropMarks,
    registrationMarks,
    colorBarY: Number((sheetH - 7).toFixed(1)),
    wasteMetrics,
  };
}

// Editorial Book Signature Layouts
export function calculateEditorialImposition(
  scheme: '4_paginas_folleto' | '8_paginas_cuadernillo' | '16_paginas_libro',
  pageWidthMm: number,
  pageHeightMm: number,
  headOrientation: 'cabeza_con_cabeza' | 'pie_con_pie' = 'cabeza_con_cabeza',
  totalBookPages: number = 16,
  paperCaliperMm: number = 0.09
): SignatureLayout {
  const gutter = 4.0;
  const gripper = 8.0;

  if (scheme === '4_paginas_folleto') {
    const sheetW = Number((pageWidthMm * 2 + gutter + 16).toFixed(1));
    const sheetH = Number((pageHeightMm + gripper + 14).toFixed(1));

    const tiroSlots: EditorialPageSlot[] = [
      { pageNumber: 4, x: 8, y: gripper + 4, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 0 },
      { pageNumber: 1, x: 8 + pageWidthMm + gutter, y: gripper + 4, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 1 },
    ];

    const retiroSlots: EditorialPageSlot[] = [
      { pageNumber: 2, x: 8, y: gripper + 4, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 0 },
      { pageNumber: 3, x: 8 + pageWidthMm + gutter, y: gripper + 4, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 1 },
    ];

    const spineX = Number((8 + pageWidthMm + gutter / 2).toFixed(1));
    const foldGuides: FoldGuideLine[] = [
      {
        id: 'editorial-diptico-spine',
        type: 'vertical',
        x1: spineX,
        y1: gripper + 1,
        x2: spineX,
        y2: sheetH - 2,
        sequenceStep: 1,
        label: 'Pliegue 1: Lomo Central (Díptico)',
        isSpine: true,
      },
    ];

    const wasteMetrics = calculatePaperWasteMetrics(
      sheetW,
      sheetH,
      pageWidthMm,
      pageHeightMm,
      2,
      gripper,
      gutter
    );

    return {
      name: 'Folleto de 4 Páginas (Díptico)',
      totalPages: 4,
      sheetWidthMm: sheetW,
      sheetHeightMm: sheetH,
      gripperMarginMm: gripper,
      gutterMm: gutter,
      tiroSlots,
      retiroSlots,
      creepRecommendationMm: 0,
      foldGuides,
      wasteMetrics,
    };
  }

  // Cuadernillo de 8 Páginas (8 cartas)
  const sheetW = Number((pageWidthMm * 2 + gutter + 24).toFixed(1));
  const sheetH = Number((pageHeightMm * 2 + gutter + gripper + 18).toFixed(1));
  const startX = 12;
  const startY = gripper + 5;
  const topRot = headOrientation === 'cabeza_con_cabeza' ? 180 : 0;

  const tiro8: EditorialPageSlot[] = [
    { pageNumber: 5, x: startX, y: startY, width: pageWidthMm, height: pageHeightMm, rotationDeg: topRot, isHeadFlipped: topRot === 180, slotIndex: 0 },
    { pageNumber: 4, x: startX + pageWidthMm + gutter, y: startY, width: pageWidthMm, height: pageHeightMm, rotationDeg: topRot, isHeadFlipped: topRot === 180, slotIndex: 1 },
    { pageNumber: 8, x: startX, y: startY + pageHeightMm + gutter, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 2 },
    { pageNumber: 1, x: startX + pageWidthMm + gutter, y: startY + pageHeightMm + gutter, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 3 },
  ];

  const retiro8: EditorialPageSlot[] = [
    { pageNumber: 3, x: startX, y: startY, width: pageWidthMm, height: pageHeightMm, rotationDeg: topRot, isHeadFlipped: topRot === 180, slotIndex: 0 },
    { pageNumber: 6, x: startX + pageWidthMm + gutter, y: startY, width: pageWidthMm, height: pageHeightMm, rotationDeg: topRot, isHeadFlipped: topRot === 180, slotIndex: 1 },
    { pageNumber: 2, x: startX, y: startY + pageHeightMm + gutter, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 2 },
    { pageNumber: 7, x: startX + pageWidthMm + gutter, y: startY + pageHeightMm + gutter, width: pageWidthMm, height: pageHeightMm, rotationDeg: 0, isHeadFlipped: false, slotIndex: 3 },
  ];

  const foldY = Number((startY + pageHeightMm + gutter / 2).toFixed(1));
  const foldX = Number((startX + pageWidthMm + gutter / 2).toFixed(1));

  const foldGuides: FoldGuideLine[] = [
    {
      id: 'cuadernillo-fold-1-h',
      type: 'horizontal',
      x1: 2,
      y1: foldY,
      x2: sheetW - 2,
      y2: foldY,
      sequenceStep: 1,
      label: 'Pliegue 1: Doblez Cabeza con Cabeza (180°)',
      isSpine: true,
    },
    {
      id: 'cuadernillo-fold-2-v',
      type: 'vertical',
      x1: foldX,
      y1: gripper + 1,
      x2: foldX,
      y2: sheetH - 2,
      sequenceStep: 2,
      label: 'Pliegue 2: Lomo de Encuadernación (Grapado al centro)',
      isSpine: true,
    },
  ];

  const sheetsInSignature = Math.max(1, Math.round(totalBookPages / 4));
  const creepMm = Number(((sheetsInSignature - 1) * paperCaliperMm * 1.4).toFixed(2));

  const wasteMetrics = calculatePaperWasteMetrics(
    sheetW,
    sheetH,
    pageWidthMm,
    pageHeightMm,
    4,
    gripper,
    gutter
  );

  return {
    name: 'Cuadernillo de 8 Páginas (Pliego Plegado Cabeza con Cabeza)',
    totalPages: 8,
    sheetWidthMm: sheetW,
    sheetHeightMm: sheetH,
    gripperMarginMm: gripper,
    gutterMm: gutter,
    tiroSlots: tiro8,
    retiroSlots: retiro8,
    creepRecommendationMm: creepMm,
    foldGuides,
    wasteMetrics,
  };
}

// Flexo Cylinder Distortion factor
export function calculateFlexoDistortion(
  cylinderRepeatMm: number,
  plateThicknessMm: number = 1.14,
  cushionThicknessMm: number = 0.5
): {
  distortionPercent: number;
  reducedLengthMm: number;
  kFactorMm: number;
} {
  const kFactorMm = plateThicknessMm * 0.84 + cushionThicknessMm * 0.5;
  const elongationMm = 2 * Math.PI * kFactorMm;
  const reducedLength = cylinderRepeatMm - elongationMm;
  const distortionPercent = Number(((reducedLength / cylinderRepeatMm) * 100).toFixed(2));

  return {
    distortionPercent,
    reducedLengthMm: Number(reducedLength.toFixed(2)),
    kFactorMm: Number(kFactorMm.toFixed(3)),
  };
}

// Standard FOGRA/GATF Color Control Bar Patches
export const STANDARD_FOGRA_COLOR_BAR_PATCHES = [
  { name: '100% Cyan', hex: '#00A3E0', label: 'C' },
  { name: '100% Magenta', hex: '#E4007C', label: 'M' },
  { name: '100% Yellow', hex: '#FFD700', label: 'Y' },
  { name: '100% Black', hex: '#111827', label: 'K' },
  { name: '75% Black', hex: '#4B5563', label: '75K' },
  { name: '50% Black', hex: '#9CA3AF', label: '50K' },
  { name: '25% Black', hex: '#E5E7EB', label: '25K' },
  { name: 'C+M Blue', hex: '#1D4ED8', label: 'CM' },
  { name: 'C+Y Green', hex: '#16A34A', label: 'CY' },
  { name: 'M+Y Red', hex: '#DC2626', label: 'MY' },
  { name: 'Gray Balance (50C 40M 40Y)', hex: '#78716C', label: 'GB' },
];

export interface DynamicColorBarPatch {
  name: string;
  hex: string;
  label: string;
  densityPercent: number;
  isSpot?: boolean;
}

// Generates dynamic control patches based on CMYK + active spot/Pantone inks in the job
export function generateDynamicColorBarPatches(
  inks: InkColor[]
): DynamicColorBarPatch[] {
  const patches: DynamicColorBarPatch[] = [
    { name: '100% Cyan', hex: '#00A3E0', label: 'C', densityPercent: 100 },
    { name: '100% Magenta', hex: '#E4007C', label: 'M', densityPercent: 100 },
    { name: '100% Yellow', hex: '#FFD700', label: 'Y', densityPercent: 100 },
    { name: '100% Black', hex: '#111827', label: 'K', densityPercent: 100 },
    { name: '75% Black', hex: '#4B5563', label: '75K', densityPercent: 75 },
    { name: '50% Black', hex: '#9CA3AF', label: '50K', densityPercent: 50 },
    { name: '25% Black', hex: '#E5E7EB', label: '25K', densityPercent: 25 },
    { name: 'C+M Trap', hex: '#1D4ED8', label: 'CM', densityPercent: 100 },
    { name: 'C+Y Trap', hex: '#16A34A', label: 'CY', densityPercent: 100 },
    { name: 'M+Y Trap', hex: '#DC2626', label: 'MY', densityPercent: 100 },
    { name: 'Balance Gris', hex: '#78716C', label: 'GB', densityPercent: 100 },
  ];

  // Dynamically append any active Spot/Pantone inks in the job
  const spotInks = inks.filter((i) => i.isSpot && i.visible);
  for (const s of spotInks) {
    const shortCode = s.pantoneCode
      ? s.pantoneCode.replace('Pantone ', '').replace(' C', '').substring(0, 8)
      : s.name.substring(0, 6);

    patches.push({
      name: `100% ${s.name}`,
      hex: s.hex,
      label: `${shortCode}`,
      densityPercent: 100,
      isSpot: true,
    });
    patches.push({
      name: `50% ${s.name}`,
      hex: s.hex,
      label: `${shortCode} 50%`,
      densityPercent: 50,
      isSpot: true,
    });
  }

  return patches;
}
