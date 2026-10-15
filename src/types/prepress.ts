// Data definitions and types for PressForge Studio Pre-Press CAD

export type PrintSystem = 'offset' | 'serigrafia' | 'flexo' | 'huecograbado' | 'vinil';

export type ToolType =
  | 'select'
  | 'node'
  | 'pen'
  | 'rect'
  | 'circle'
  | 'line'
  | 'rulings'
  | 'text'
  | 'folio'
  | 'watermark'
  | 'gripper_measure';

export type PaperOrientation = 'horizontal' | 'vertical';

export interface DocumentDimensions {
  name: string;
  widthMm: number;
  heightMm: number;
  orientation: PaperOrientation;
  gripperMarginMm: number; // typically 8 mm on lead edge
  gripperEdge: 'top' | 'bottom' | 'left' | 'right';
  safeMarginMm: number; // typically 4 mm
  bleedMm: number; // typically 3 mm
}

export interface InkColor {
  id: string;
  name: string;
  hex: string;
  cmyk: { c: number; m: number; y: number; k: number };
  screenAngleDeg: number; // e.g. 15 for Cyan, 75 for Magenta, 0 for Yellow, 45 for Black
  isSpot: boolean; // true for Pantone/Tintas directas
  pantoneCode?: string;
  isCutLine?: boolean; // for vinyl cutters
  visible: boolean;
  locked: boolean;
}

export interface BezierNode {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export interface VectorElement {
  id: string;
  name?: string; // Nombre amigable de la capa/elemento
  visible?: boolean; // Control de visibilidad de capa (por defecto true)
  locked?: boolean; // Control de bloqueo de edición (por defecto false)
  layerName?: string; // Agrupación lógica de capa
  type: 'path' | 'rect' | 'circle' | 'line' | 'text' | 'rulings' | 'folio' | 'watermark';
  inkId: string; // references InkColor.id
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  rotationDeg: number;
  // Path specifics
  nodes?: BezierNode[];
  closed?: boolean;
  // Styling
  fill: string | 'none'; // hex or 'none'
  fillOpacity: number; // 0.0 to 1.0 (watermarks should be 0.04 to 0.08)
  stroke: string | 'none';
  strokeWidthMm: number;
  strokeDashArray?: string;
  // Text specifics
  text?: string;
  fontSizePt?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '500' | '600';
  isSerif?: boolean;
  letterSpacingMm?: number;
  // Rulings specifics (notas de venta)
  rowCount?: number;
  rowSpacingMm?: number;
  // Folio box specifics
  folioPrefix?: string;
  folioStartNumber?: number;
  folioDigits?: number;
  hasRedColor?: boolean;
}

export interface PreflightAlert {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  elementId?: string;
  recommendation: string;
}

export interface ImpositionConfig {
  scheme:
    | '1_al_tiro'
    | '2_en_carta'
    | '4_en_doble_carta'
    | '4_paginas_folleto'
    | '8_paginas_cuadernillo'
    | '16_paginas_libro'
    | 'flexo_cilindro_continuo';
  parentSheetName: string;
  parentSheetWidthMm: number;
  parentSheetHeightMm: number;
  unitsPerSheet: number;
  gutterMm: number;
  showCropMarks: boolean;
  showRegistrationMarks: boolean;
  showColorBars: boolean;
  gripperMarginMm: number;
  // Editorial Book / Booklet Parameters
  editorialMode?: 'suelta' | 'cuadernillo_grapado' | 'libro_cosido';
  headOrientation?: 'cabeza_con_cabeza' | 'pie_con_pie';
  plateSide?: 'tiro' | 'retiro';
  creepMm?: number; // Compensación de sangría por lomo (Shingling)
  signatureCollationMark?: boolean; // Marca de escalera/colación en lomo exterior
  // Rotogravure / Flexo Cylinder Parameters
  cylinderRepeatMm?: number; // Desarrollo de la circunferencia del cilindro
  plateThicknessMm?: number; // Espesor de placa (ej. 1.14mm o 1.70mm)
  cushionThicknessMm?: number; // Cinta foam de montaje (ej. 0.50mm)
  distortionPercent?: number; // Reducción longitudinal en pre-prensa
  eyemarkWidthMm?: number; // Marca de fotocélula de corte continuo
}

export interface EditorialPageSlot {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number; // 0 or 180 (for cabeza con cabeza)
  isHeadFlipped: boolean;
  slotIndex: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface NoteAnalysisResult {
  corners: Point2D[];
  format: {
    name: string;
    widthMm: number;
    heightMm: number;
    orientation: PaperOrientation;
    confidence: number;
  };
  documentType: string;
  specs: {
    hasFolio: boolean;
    suggestedFolioBox?: { xMm: number; yMm: number; widthMm: number; heightMm: number };
    rowCount?: number;
    rowSpacingMm?: number;
    hasWatermark: boolean;
    suggestedWatermarkOpacityPercent: number;
    gripperMarginMm: number;
    warningMessage?: string;
  };
  detectedFonts: Array<{
    category: string;
    suggestedFont: string;
    useFor: string;
    fontFamilyMatch?: string;
    grammaticalContext?: string;
    recommendedAdjustment?: string;
  }>;
  impositionSuggestion: {
    scheme: '1_al_tiro' | '2_en_carta' | '4_en_doble_carta' | '4_paginas_folleto' | '8_paginas_cuadernillo';
    sheetFormat: string;
    unitsPerSheet: number;
    centralGutterMm: number;
    gripperEdge: 'superior' | 'lateral';
    headOrientation?: 'cabeza_con_cabeza' | 'pie_con_pie';
  };
}

