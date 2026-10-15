import { InkColor, VectorElement } from '../types/prepress';

export const STANDARD_CMYK_INKS: InkColor[] = [
  {
    id: 'ink-cyan',
    name: 'Cyan (C)',
    hex: '#00A3E0',
    cmyk: { c: 100, m: 0, y: 0, k: 0 },
    screenAngleDeg: 15,
    isSpot: false,
    visible: true,
    locked: false,
  },
  {
    id: 'ink-magenta',
    name: 'Magenta (M)',
    hex: '#E4007C',
    cmyk: { c: 0, m: 100, y: 0, k: 0 },
    screenAngleDeg: 75,
    isSpot: false,
    visible: true,
    locked: false,
  },
  {
    id: 'ink-yellow',
    name: 'Amarillo / Yellow (Y)',
    hex: '#FFD700',
    cmyk: { c: 0, m: 0, y: 100, k: 0 },
    screenAngleDeg: 0,
    isSpot: false,
    visible: true,
    locked: false,
  },
  {
    id: 'ink-black',
    name: 'Negro / Key (K)',
    hex: '#111827',
    cmyk: { c: 0, m: 0, y: 0, k: 100 },
    screenAngleDeg: 45,
    isSpot: false,
    visible: true,
    locked: false,
  },
];

export type SpotCategory =
  | 'formula_guide'
  | 'metallics'
  | 'neons_pastels'
  | 'technical_specialties';

export interface PantoneSpotDefinition extends InkColor {
  category: SpotCategory;
  categoryLabel: string;
  description: string;
}

export const PANTONE_COLOR_LIBRARY: PantoneSpotDefinition[] = [
  // --- GUÍA DE FÓRMULAS CLÁSICA (SOLID COATED) ---
  {
    id: 'spot-pantone-warm-red',
    name: 'Pantone Warm Red C',
    hex: '#F9423A',
    pantoneCode: 'Warm Red C',
    cmyk: { c: 0, m: 85, y: 75, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Rojo cálido vibrante estándar para folios y llamadas de atención en notas.',
  },
  {
    id: 'spot-pantone-reflex-blue',
    name: 'Pantone Reflex Blue C',
    hex: '#0A1172',
    pantoneCode: 'Reflex Blue C',
    cmyk: { c: 100, m: 89, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Azul réflex de alta cobertura, estándar histórico para membretes y notas comerciales.',
  },
  {
    id: 'spot-pantone-process-blue',
    name: 'Pantone Process Blue C',
    hex: '#0085CA',
    pantoneCode: 'Process Blue C',
    cmyk: { c: 100, m: 13, y: 0, k: 3 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Azul proceso puro de tono luminoso y excelente transferencia.',
  },
  {
    id: 'spot-pantone-orange-021',
    name: 'Pantone Orange 021 C',
    hex: '#FE5000',
    pantoneCode: 'Orange 021 C',
    cmyk: { c: 0, m: 68, y: 100, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Naranja intenso directo no reproducible fielmente por cuatricromía CMYK.',
  },
  {
    id: 'spot-pantone-red-032',
    name: 'Pantone Red 032 C',
    hex: '#EF3340',
    pantoneCode: 'Red 032 C',
    cmyk: { c: 0, m: 90, y: 72, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Rojo vivo de señalización y empaque estándar.',
  },
  {
    id: 'spot-pantone-rubine-red',
    name: 'Pantone Rubine Red C',
    hex: '#CE0058',
    pantoneCode: 'Rubine Red C',
    cmyk: { c: 0, m: 100, y: 22, k: 4 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Rubí carmín de alta pureza cromática para tintas de formulación.',
  },
  {
    id: 'spot-pantone-rhodamine-red',
    name: 'Pantone Rhodamine Red C',
    hex: '#E10098',
    pantoneCode: 'Rhodamine Red C',
    cmyk: { c: 3, m: 95, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Magenta fluorescente base para tonos rosados intensos.',
  },
  {
    id: 'spot-pantone-purple',
    name: 'Pantone Purple C',
    hex: '#BB29BB',
    pantoneCode: 'Purple C',
    cmyk: { c: 43, m: 91, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Púrpura limpio para identidad gráfica y sellos.',
  },
  {
    id: 'spot-pantone-violet',
    name: 'Pantone Violet C',
    hex: '#440099',
    pantoneCode: 'Violet C',
    cmyk: { c: 90, m: 100, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Violeta oscuro profundo de formulación base.',
  },
  {
    id: 'spot-pantone-green-348',
    name: 'Pantone 348 C (Verde)',
    hex: '#00843D',
    pantoneCode: '348 C',
    cmyk: { c: 96, m: 0, y: 100, k: 22 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Verde esmeralda/bosque corporativo ampliamente usado en farmacias e imprentas.',
  },
  {
    id: 'spot-pantone-185',
    name: 'Pantone 185 C',
    hex: '#E4002B',
    pantoneCode: '185 C',
    cmyk: { c: 0, m: 100, y: 81, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Rojo corporativo brillante de máxima pureza.',
  },
  {
    id: 'spot-pantone-286',
    name: 'Pantone 286 C',
    hex: '#0032A0',
    pantoneCode: '286 C',
    cmyk: { c: 100, m: 75, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Azul cobalto institucional de alto impacto.',
  },
  {
    id: 'spot-pantone-300',
    name: 'Pantone 300 C',
    hex: '#005EB8',
    pantoneCode: '300 C',
    cmyk: { c: 100, m: 50, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Azul cielo técnico muy requerido en marcas industriales y tecnología.',
  },
  {
    id: 'spot-pantone-109',
    name: 'Pantone 109 C',
    hex: '#FFD100',
    pantoneCode: '109 C',
    cmyk: { c: 0, m: 10, y: 100, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Amarillo cálido y saturado de gran solidez a la luz.',
  },
  {
    id: 'spot-pantone-cool-gray-9',
    name: 'Pantone Cool Gray 9 C',
    hex: '#75787B',
    pantoneCode: 'Cool Gray 9 C',
    cmyk: { c: 30, m: 22, y: 17, k: 57 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Gris neutro frío de alta fidelidad para textos legales y fondos elegantes.',
  },
  {
    id: 'spot-pantone-cool-gray-5',
    name: 'Pantone Cool Gray 5 C',
    hex: '#B1B3B3',
    pantoneCode: 'Cool Gray 5 C',
    cmyk: { c: 13, m: 9, y: 10, k: 27 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'formula_guide',
    categoryLabel: 'Guía Clásica',
    description: 'Gris medio para marcas de agua seguras o tramas técnicas en 1 tinta.',
  },

  // --- TINTAS METÁLICAS (METALLICS) ---
  {
    id: 'spot-pantone-silver-877',
    name: 'Pantone 877 C (Plata Metálica)',
    hex: '#8A9EA7',
    pantoneCode: '877 C Plata',
    cmyk: { c: 20, m: 10, y: 10, k: 30 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'metallics',
    categoryLabel: 'Metálicos',
    description: 'Tinta a base de escamas de aluminio con brillo reflectante en offset y serigrafía.',
  },
  {
    id: 'spot-pantone-gold-871',
    name: 'Pantone 871 C (Oro Rico)',
    hex: '#84754E',
    pantoneCode: '871 C Oro',
    cmyk: { c: 30, m: 35, y: 70, k: 10 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'metallics',
    categoryLabel: 'Metálicos',
    description: 'Oro rico cálido con pigmento de bronce metálico para certificados y etiquetas premium.',
  },
  {
    id: 'spot-pantone-gold-872',
    name: 'Pantone 872 C (Oro Pálido)',
    hex: '#8A795D',
    pantoneCode: '872 C Oro Pálido',
    cmyk: { c: 25, m: 30, y: 65, k: 15 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'metallics',
    categoryLabel: 'Metálicos',
    description: 'Oro pálido europeo de tonalidad sutil y elegante.',
  },
  {
    id: 'spot-pantone-copper-876',
    name: 'Pantone 876 C (Cobre Metálico)',
    hex: '#875237',
    pantoneCode: '876 C Cobre',
    cmyk: { c: 30, m: 55, y: 75, k: 20 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'metallics',
    categoryLabel: 'Metálicos',
    description: 'Cobre rojizo reflectante de alta densidad de pigmento.',
  },

  // --- NEÓN Y FLUORESCENTES (NEONS & PASTELS) ---
  {
    id: 'spot-pantone-neon-yellow-803',
    name: 'Pantone 803 C (Amarillo Neón)',
    hex: '#FFE800',
    pantoneCode: '803 C Fluo',
    cmyk: { c: 0, m: 0, y: 100, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'neons_pastels',
    categoryLabel: 'Neón & Fluo',
    description: 'Pigmento fluorescente de luz negra para stickers, cartelería y seguridad.',
  },
  {
    id: 'spot-pantone-neon-green-802',
    name: 'Pantone 802 C (Verde Neón)',
    hex: '#44D62C',
    pantoneCode: '802 C Fluo',
    cmyk: { c: 60, m: 0, y: 100, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'neons_pastels',
    categoryLabel: 'Neón & Fluo',
    description: 'Verde radiactivo fluorescente para vinil y serigrafía.',
  },
  {
    id: 'spot-pantone-neon-pink-806',
    name: 'Pantone 806 C (Rosa Neón)',
    hex: '#FF2A85',
    pantoneCode: '806 C Fluo',
    cmyk: { c: 0, m: 85, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'neons_pastels',
    categoryLabel: 'Neón & Fluo',
    description: 'Rosa neón de alto impacto óptico en luz de día.',
  },
  {
    id: 'spot-pantone-neon-orange-804',
    name: 'Pantone 804 C (Naranja Neón)',
    hex: '#FF6900',
    pantoneCode: '804 C Fluo',
    cmyk: { c: 0, m: 60, y: 100, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'neons_pastels',
    categoryLabel: 'Neón & Fluo',
    description: 'Naranja de seguridad vial de máxima luminiscencia.',
  },

  // --- TINTAS TÉCNICAS Y SERIGRAFÍA ESPECIAL (SPECIALTIES & FINISHING) ---
  {
    id: 'spot-technical-white-underbase',
    name: 'Base Blanca Opaca (Underbase)',
    hex: '#F8FAFC',
    pantoneCode: 'WHITE BASE',
    cmyk: { c: 0, m: 0, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Capa base blanca de bloqueo indispensable en serigrafía textil oscura o vinil transparente.',
  },
  {
    id: 'spot-technical-uv-varnish',
    name: 'Barniz UV a Registro (Spot Gloss)',
    hex: '#38BDF8',
    pantoneCode: 'VARNISH UV',
    cmyk: { c: 50, m: 0, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Película transparente brillante de curado ultravioleta para realzar logotipos o texturas.',
  },
  {
    id: 'spot-technical-matte-varnish',
    name: 'Barniz Mate / Soft-Touch',
    hex: '#94A3B8',
    pantoneCode: 'MATTE UV',
    cmyk: { c: 20, m: 15, y: 15, k: 10 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Acabado aterciopelado antireflejante para contrastar con zonas brillantes.',
  },
  {
    id: 'spot-technical-scratch-off',
    name: 'Tinta Scratch-Off (Rasca y Gana)',
    hex: '#64748B',
    pantoneCode: 'SCRATCH OFF',
    cmyk: { c: 30, m: 20, y: 20, k: 40 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Tinta opaca desprendible para cupones, tarjetas de regalo y promociones.',
  },
  {
    id: 'spot-technical-puff-ink',
    name: 'Tinta Inflable (Puff Screen Ink)',
    hex: '#C084FC',
    pantoneCode: 'PUFF 3D',
    cmyk: { c: 25, m: 45, y: 0, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Tinta serigráfica con agente espumante que se expande con calor formando relieve 3D.',
  },
  {
    id: 'spot-technical-glow-dark',
    name: 'Tinta Fosforescente (Glow-in-Dark)',
    hex: '#BEF264',
    pantoneCode: 'LUMINESCENT',
    cmyk: { c: 15, m: 0, y: 65, k: 0 },
    screenAngleDeg: 45,
    isSpot: true,
    visible: true,
    locked: false,
    category: 'technical_specialties',
    categoryLabel: 'Serigrafía & UV',
    description: 'Pigmento de aluminato de estroncio que retiene luz y brilla en la oscuridad.',
  },
];

// Alias for backwards compatibility
export const POPULAR_SPOT_INKS: InkColor[] = PANTONE_COLOR_LIBRARY.slice(0, 5);

// Helper to filter Pantone library by keyword and category
export function searchPantoneLibrary(
  query: string,
  category: SpotCategory | 'all' = 'all'
): PantoneSpotDefinition[] {
  const q = query.trim().toLowerCase();
  return PANTONE_COLOR_LIBRARY.filter((spot) => {
    const matchesCategory = category === 'all' || spot.category === category;
    if (!matchesCategory) return false;
    if (!q) return true;
    return (
      spot.name.toLowerCase().includes(q) ||
      (spot.pantoneCode && spot.pantoneCode.toLowerCase().includes(q)) ||
      spot.description.toLowerCase().includes(q) ||
      spot.hex.toLowerCase().includes(q)
    );
  });
}

// Helper to create a custom spot ink on the fly
export function createCustomSpotInk(
  name: string,
  hex: string,
  pantoneCode?: string,
  screenAngleDeg: number = 45
): InkColor {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  const cmyk = hexToCmyk(cleanHex);
  const cleanId = `spot-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: cleanId,
    name: name.trim() || `Tinta Spot ${pantoneCode || 'Especial'}`,
    hex: cleanHex,
    pantoneCode: pantoneCode?.trim() || 'Custom Spot',
    cmyk,
    screenAngleDeg,
    isSpot: true,
    visible: true,
    locked: false,
  };
}

// Helper to convert hex to CMYK
export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number } {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return { c: 0, m: 0, y: 0, k: 100 };
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };

  const c = Math.round(((1 - r - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b - k) / (1 - k)) * 100);
  return { c, m, y, k: Math.round(k * 100) };
}

// Generate print-ready SVG with separated ink groups
export function exportSeparatedSvg(
  elements: VectorElement[],
  inks: InkColor[],
  widthMm: number,
  heightMm: number,
  mode: 'color' | 'positive_black' = 'color'
): string {
  const inkGroups: Record<string, string[]> = {};

  for (const ink of inks) {
    inkGroups[ink.id] = [];
  }

  for (const el of elements) {
    const targetInk = inks.find((i) => i.id === el.inkId) || inks[0];
    if (!targetInk || !targetInk.visible) continue;

    const fillVal =
      el.fill === 'none'
        ? 'none'
        : mode === 'positive_black'
        ? '#000000'
        : el.fill;

    const strokeVal =
      el.stroke === 'none'
        ? 'none'
        : mode === 'positive_black'
        ? '#000000'
        : el.stroke;

    let svgTag = '';

    if (el.type === 'rect') {
      svgTag = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fillVal}" fill-opacity="${el.fillOpacity}" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" />`;
    } else if (el.type === 'circle') {
      const rx = el.width / 2;
      const ry = el.height / 2;
      const cx = el.x + rx;
      const cy = el.y + ry;
      svgTag = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillVal}" fill-opacity="${el.fillOpacity}" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" />`;
    } else if (el.type === 'line') {
      svgTag = `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" />`;
    } else if (el.type === 'text') {
      const fontSizeMm = (el.fontSizePt || 12) * 0.3527;
      svgTag = `<text x="${el.x}" y="${el.y + fontSizeMm}" font-family="${el.fontFamily || 'sans-serif'}" font-size="${fontSizeMm}mm" font-weight="${el.fontWeight || 'normal'}" fill="${fillVal}" fill-opacity="${el.fillOpacity}">${escapeXml(el.text || '')}</text>`;
    } else if (el.type === 'rulings') {
      const lines: string[] = [];
      const rows = el.rowCount || 6;
      const spacing = el.rowSpacingMm || 8;
      for (let r = 0; r < rows; r++) {
        const lineY = el.y + r * spacing;
        lines.push(
          `<line x1="${el.x}" y1="${lineY}" x2="${el.x + el.width}" y2="${lineY}" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" stroke-dasharray="${el.strokeDashArray || ''}" />`
        );
      }
      svgTag = `<g class="renglones-nota">${lines.join('\n')}</g>`;
    } else if (el.type === 'folio') {
      svgTag = `<g class="caja-folio">
        <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" />
        <text x="${el.x + 3}" y="${el.y + el.height - 4}" font-family="monospace" font-size="4mm" font-weight="bold" fill="${mode === 'positive_black' ? '#000' : '#dc2626'}">N° ${(el.folioPrefix || 'A-') + (el.folioStartNumber || 1).toString().padStart(el.folioDigits || 6, '0')}</text>
      </g>`;
    } else if (el.type === 'watermark') {
      svgTag = `<g class="marca-de-agua" opacity="${el.fillOpacity}">
        <text x="${el.x}" y="${el.y}" font-family="${el.fontFamily || 'sans-serif'}" font-size="12mm" font-weight="bold" fill="${fillVal}">${escapeXml(el.text || 'ORIGINAL')}</text>
      </g>`;
    } else if (el.type === 'path' && el.nodes && el.nodes.length > 0) {
      let d = `M ${el.nodes[0].x} ${el.nodes[0].y}`;
      for (let i = 1; i < el.nodes.length; i++) {
        const curr = el.nodes[i];
        const prev = el.nodes[i - 1];
        if (prev.handleOut && curr.handleIn) {
          d += ` C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.x} ${curr.y}`;
        } else {
          d += ` L ${curr.x} ${curr.y}`;
        }
      }
      if (el.closed) d += ' Z';
      svgTag = `<path d="${d}" fill="${fillVal}" fill-opacity="${el.fillOpacity}" stroke="${strokeVal}" stroke-width="${el.strokeWidthMm}" />`;
    }

    if (svgTag) {
      inkGroups[targetInk.id].push(svgTag);
    }
  }

  const groupBlocks = inks
    .filter((ink) => ink.visible && (inkGroups[ink.id] || []).length > 0)
    .map((ink) => {
      const items = inkGroups[ink.id].join('\n    ');
      return `  <g id="tinta_${ink.id}" data-tinta-nombre="${ink.name}" data-angulo="${ink.screenAngleDeg}" data-es-spot="${ink.isSpot}">
    <!-- TINTA: ${ink.name} (${ink.isSpot ? 'Spot/Pantone: ' + (ink.pantoneCode || '') : 'Proceso CMYK'}) - Angulo: ${ink.screenAngleDeg}° -->
    ${items}
  </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm">
  <desc>Generado por PressForge Studio - Pre-Prensa y Separacion de Color</desc>
${groupBlocks}
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
