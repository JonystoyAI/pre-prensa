import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Trace ID generator for secure logging
function generateTraceId(): string {
  return 'trace-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

// POST /api/prepress/analyze-image
// Analyzes photo of sales note / graphic with keystone perspective, paper size, and prepress technical specs
app.post('/api/prepress/analyze-image', async (req: Request, res: Response): Promise<void> => {
  const traceId = generateTraceId();
  try {
    const { imageBase64, mimeType = 'image/jpeg', printSystem = 'offset' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'La imagen en base64 es requerida.', traceId });
      return;
    }

    if (!ai) {
      // Provide intelligent fallback for development or offline testing
      res.json({
        corners: [
          { x: 0.08, y: 0.12 },
          { x: 0.92, y: 0.09 },
          { x: 0.94, y: 0.91 },
          { x: 0.06, y: 0.88 },
        ],
        format: {
          name: 'Media Carta (Apaisada)',
          widthMm: 215.9,
          heightMm: 139.7,
          orientation: 'horizontal',
          confidence: 0.96,
        },
        documentType: 'nota_de_venta',
        substrate: 'papel_comercial',
        borderFrame: {
          isOrthogonal: false,
          deviationAngleDeg: 4.8,
          detectedRect: { xMm: 8, yMm: 8, widthMm: 199.9, heightMm: 123.7 },
        },
        logoZone: { xMm: 14, yMm: 14, widthMm: 35, heightMm: 16 },
        watermarkZone: { xMm: 60, yMm: 45, widthMm: 95, heightMm: 38 },
        specs: {
          hasFolio: true,
          suggestedFolioBox: { xMm: 160, yMm: 16, widthMm: 44, heightMm: 14 },
          rowCount: 8,
          rowSpacingMm: 8.5,
          hasWatermark: true,
          suggestedWatermarkOpacityPercent: 6,
          gripperMarginMm: 8,
          warningMessage:
            'Aviso de Taller: Enderezado ortogonal a 90° listo. Tinta al 6% recomendada para marca de agua en offset.',
        },
        inkSeparationSuggestion: {
          inkCount: 1,
          inkNames: ['Black (Key)'],
          underbaseNeeded: false,
          meshRecommendation: 'Placa CTP térmica offset / Malla 120T serigrafía',
        },
        detectedFonts: [
          { category: 'Sans-Serif Geométrica', suggestedFont: 'Plus Jakarta Sans', useFor: 'Títulos y Membrete', fontFamilyMatch: 'Plus Jakarta Sans', grammaticalContext: 'Encabezado comercial', recommendedAdjustment: 'Bold 15pt' },
          { category: 'Monoespaciada / Mecánica', suggestedFont: 'JetBrains Mono', useFor: 'Folio y Tabla', fontFamilyMatch: 'JetBrains Mono', grammaticalContext: 'Datos numéricos', recommendedAdjustment: 'Cifras tabulares fijas' },
          { category: 'Serif Clásica', suggestedFont: 'Times New Roman', useFor: 'Pagaré Inferior', fontFamilyMatch: 'Times New Roman', grammaticalContext: 'Cláusula legal', recommendedAdjustment: 'Regular 7pt' },
        ],
        impositionSuggestion: {
          scheme: '2_en_carta',
          sheetFormat: 'Carta (21.59 x 27.94 cm)',
          unitsPerSheet: 2,
          centralGutterMm: 4,
          gripperEdge: 'superior',
        },
        traceId,
      });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `
Eres un Arquitecto de Pre-Prensa y Maestro de Taller Gráfico de nivel producción.
Tu misión es interpretar quirúrgicamente esta imagen/foto para convertirla en un formato de impresión vectorial perfecto y libre de defectos.

INSTRUCCIONES CLAVE DE PRE-PRENSA:
1. DETECCIÓN DE ÁNGULOS RECTOS Y ENDEREZADO (90°):
   - Los formatos de imprenta (Media Carta, Carta, Cuarto de Carta, Oficio, etc.) y sus marcos perimetrales e interiores son RIGUROSAMENTE ORTOGONALES con ángulos exactos de 90°.
   - Si la imagen fue tomada con celular o cámara con perspectiva oblicua/trapezoidal, deduce que es una toma distorsionada. Localiza las 4 esquinas reales del papel/marco en coordenadas normalizadas [0.0 a 1.0] [topLeft, topRight, bottomRight, bottomLeft] tomando como referencia absoluta esos ángulos rectos de 90° para enderezarla.
2. FORMATO EXACTO:
   - Deduce si corresponde a: "Media Carta" (215.9 × 139.7 mm), "Cuarto de Carta" (107.9 × 139.7 mm), "Carta" (215.9 × 279.4 mm), "Medio Oficio" (215.9 × 170 mm), "Oficio" (215.9 × 340 mm), o "Formato Textil / Playera" (280 × 350 mm pecho).
3. TRATAMIENTO DE LÍNEAS VS SÓLIDOS:
   - Las líneas de tablas, renglones, marcos y guías NO deben ser polígonos rellenos; deben interpretarse como líneas CAD puras (strokes rectilíneos con grosor en mm/pt).
   - Los logotipos, isotipos, sellos o marcas de agua deben ser interpretados como sólidos vectoriales limpios.
4. DETECCIÓN DE ZONAS PARA SUSTITUCIÓN VECTORIAL:
   - Identifica la zona aproximada en mm del logotipo de la empresa (logoZone: xMm, yMm, widthMm, heightMm).
   - Identifica la zona de la marca de agua central si existe (watermarkZone: xMm, yMm, widthMm, heightMm).
5. SUSTRATO Y SEPARACIÓN DE TINTAS:
   - Evalúa si el diseño es para papel comercial (offset/tipografía) o para serigrafía textil (playera/algodón). Si es para playera oscura, indica que requiere base blanca (underbase flash cure) y malla 43T-90T.
   - Recomienda la separación de color óptima con el número de tintas requerido.
6. ANÁLISIS TIPOGRÁFICO POR CONTEXTO GRAMATICAL:
   - Titular/Membrete, Renglones/Columnas, Folio y Pagaré legal.

Responde EXCLUSIVAMENTE con un JSON válido con esta estructura:
{
  "corners": [
    {"x": number, "y": number},
    {"x": number, "y": number},
    {"x": number, "y": number},
    {"x": number, "y": number}
  ],
  "format": {
    "name": string,
    "widthMm": number,
    "heightMm": number,
    "orientation": "horizontal" | "vertical",
    "confidence": number
  },
  "documentType": "nota_de_venta" | "remision" | "recibo_dinero" | "factura_clasica" | "estampado_textil" | "otro",
  "substrate": "papel_comercial" | "playera_textil" | "vinil_corte" | "cartulina",
  "borderFrame": {
    "isOrthogonal": boolean,
    "deviationAngleDeg": number,
    "detectedRect": {"xMm": number, "yMm": number, "widthMm": number, "heightMm": number}
  },
  "logoZone": {
    "xMm": number,
    "yMm": number,
    "widthMm": number,
    "heightMm": number
  },
  "watermarkZone": {
    "xMm": number,
    "yMm": number,
    "widthMm": number,
    "heightMm": number
  },
  "specs": {
    "hasFolio": boolean,
    "suggestedFolioBox": {"xMm": number, "yMm": number, "widthMm": number, "heightMm": number},
    "rowCount": number,
    "rowSpacingMm": number,
    "hasWatermark": boolean,
    "suggestedWatermarkOpacityPercent": number,
    "gripperMarginMm": number,
    "warningMessage": string
  },
  "inkSeparationSuggestion": {
    "inkCount": number,
    "inkNames": string[],
    "underbaseNeeded": boolean,
    "meshRecommendation": string
  },
  "detectedFonts": [
    {
      "category": string,
      "suggestedFont": string,
      "useFor": string,
      "fontFamilyMatch": string,
      "grammaticalContext": string,
      "recommendedAdjustment": string
    }
  ],
  "impositionSuggestion": {
    "scheme": "1_al_tiro" | "2_en_carta" | "4_en_doble_carta",
    "sheetFormat": string,
    "unitsPerSheet": number,
    "centralGutterMm": number,
    "gripperEdge": "superior" | "lateral"
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);
    res.json({ ...parsedData, traceId });
  } catch (err: unknown) {
    console.error(`[${traceId}] Error al analizar imagen con Gemini:`, err);
    res.status(500).json({
      error: 'Error interno en el motor de pre-prensa IA.',
      traceId,
      fallbackSuggestion: {
        formatName: 'Media Carta (21.5 x 14 cm)',
        widthMm: 215,
        heightMm: 140,
        gripperMm: 8,
      },
    });
  }
});

// POST /api/prepress/technical-consult
// Proactive technical assistant for print shops (silkscreen meshes, ink viscosities, dot gain, minimum line weight)
app.post('/api/prepress/technical-consult', async (req: Request, res: Response): Promise<void> => {
  const traceId = generateTraceId();
  try {
    const { question, printSystem = 'offset', currentInkCount = 1, smallestFontPt = 8 } = req.body;

    if (!ai) {
      res.json({
        answer: `En sistema ${printSystem}: Para textos finos (<8pt) se recomienda verificar ganancia de punto. En serigrafía use malla de 120T a 140T para evitar emplastado; en offset mantenga la pinza de 0.8 cm libre de grafismo y controle la emulsión.`,
        recommendations: [
          'Mantener la marca de agua entre 4% y 7% de tinta negra',
          'Respetar 8 mm de pinza en la cabeza del pliego',
          'Usar líneas de mínimo 0.3 pt (0.1 mm) en tramados finos',
        ],
        traceId,
      });
      return;
    }

    const promptText = `
Eres un Maestro de Taller e Ingeniero de Pre-Prensa con décadas de experiencia en impresión física:
- Offset tradicional y digital (prensas Heidelberg, Ryobi, Multi 1250, Hamada).
- Serigrafía manual textil y sobre papel (marcos de madera/aluminio, mallas 43T a 140T, tintas plastisol y base agua).
- Flexografía y huecograbado.
- Vinil de corte (plotters Roland, Graphtec) y estampado.

El usuario tiene el siguiente escenario en su taller:
- Sistema de impresión: ${printSystem}
- Tintas actuales: ${currentInkCount}
- Tamaño de fuente más pequeño en el diseño: ${smallestFontPt} pt
- Pregunta o consulta técnica: "${question || 'Revisión general de pre-vuelo'}"

Genera una respuesta técnica directa, pragmática y sin rodeos, con advertencias específicas de taller (evitar emplastados, calcular pinza de 8 mm, fórmulas para marcas de agua seguras al 4-8%, separación de positivos, y selección de malla o ángulos de trama).

Devuelve un JSON con:
{
  "summary": string,
  "warnings": string[],
  "technicalSpecs": {
    "recommendedLineatureLpi": string,
    "recommendedMeshOrPlate": string,
    "safeWatermarkPercent": string,
    "minStrokeWeightMm": string,
    "gripperMarginMm": string
  },
  "actionSteps": string[]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json({ ...parsedData, traceId });
  } catch (err: unknown) {
    console.error(`[${traceId}] Error en consulta técnica:`, err);
    res.status(500).json({
      error: 'Error en el asistente técnico de taller.',
      traceId,
    });
  }
});

// Setup dev server middlewares or static production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, port, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PressForge Studio server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
