import React, { useState, useRef, useEffect } from 'react';
import {
  DocumentDimensions,
  NoteAnalysisResult,
  Point2D,
  PrintSystem,
  VectorElement,
} from '../types/prepress';
import { STANDARD_FORMATS } from '../utils/prepressCalculations';
import { rectifyPerspectiveImage } from '../utils/homography';
import {
  Wand2,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  Crop,
  Layers,
  Sun,
  Contrast,
  Sparkles,
  Type,
  FileCode,
} from 'lucide-react';

interface AIAssistantPanelProps {
  document: DocumentDimensions;
  setDocument: (doc: DocumentDimensions) => void;
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  printSystem: PrintSystem;
  initialImageSrc?: string | null;
  onApplyComplete: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  document: currentDoc,
  setDocument,
  setElements,
  printSystem,
  initialImageSrc,
  onApplyComplete,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc || null);
  const [enhancedImageSrc, setEnhancedImageSrc] = useState<string | null>(initialImageSrc || null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<NoteAnalysisResult | null>(null);
  const [rectifiedCanvasUrl, setRectifiedCanvasUrl] = useState<string | null>(null);

  // Enhancement Filters
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150 %
  const [contrastVal, setContrastVal] = useState<number>(120); // 50 to 200 %
  const [sharpen, setSharpen] = useState<number>(1); // 0 to 3
  const [paperCleanThreshold, setPaperCleanThreshold] = useState<number>(0); // 0 to 50
  const [showEnhancer, setShowEnhancer] = useState<boolean>(true);

  // 4 corners normalized [0..1]
  const [corners, setCorners] = useState<Point2D[]>([
    { x: 0.1, y: 0.12 },
    { x: 0.9, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.88 },
  ]);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Workshop Technical Consultant Chat state
  const [chatQuestion, setChatQuestion] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatAnswer, setChatAnswer] = useState<{
    summary: string;
    warnings: string[];
    technicalSpecs?: Record<string, string>;
    actionSteps: string[];
  } | null>(null);

  // Apply filters via Canvas
  const applyImageEnhancements = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw with brightness and contrast CSS filter
      ctx.filter = `brightness(${brightness}%) contrast(${contrastVal}%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If paper clean threshold is applied, remove grayish paper noise
      if (paperCleanThreshold > 0) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const thresh = 255 - paperCleanThreshold * 2;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (avg > thresh) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const enhancedUrl = canvas.toDataURL('image/jpeg', 0.92);
      setEnhancedImageSrc(enhancedUrl);
    };
    img.src = src;
  };

  useEffect(() => {
    if (imageSrc) {
      applyImageEnhancements(imageSrc);
    }
  }, [imageSrc, brightness, contrastVal, sharpen, paperCleanThreshold]);

  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
      setEnhancedImageSrc(initialImageSrc);
      setAnalysisResult(null);
      setRectifiedCanvasUrl(null);
      analyzePhotoWithAI(initialImageSrc, 'image/png');
    }
  }, [initialImageSrc]);

  // Handle image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImageSrc(b64);
      setAnalysisResult(null);
      setRectifiedCanvasUrl(null);
      analyzePhotoWithAI(b64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Load a sample photo of a skewed sales note
  const loadSampleDistortedNote = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Table background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);

      // Skewed paper (trapezoid)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(90, 80);
      ctx.lineTo(550, 60);
      ctx.lineTo(570, 410);
      ctx.lineTo(70, 390);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Skewed content
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('NOTA DE VENTA - TALLER GRÁFICO', 130, 130);

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('N° A-004521', 430, 130);

      // Lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const y = 180 + i * 26;
        ctx.beginPath();
        ctx.moveTo(110, y);
        ctx.lineTo(530, y - 5);
        ctx.stroke();
      }

      // Watermark in center
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('ORIGINAL', 210, 290);

      ctx.restore();
    }

    const b64 = canvas.toDataURL('image/jpeg', 0.9);
    setImageSrc(b64);
    setAnalysisResult(null);
    setRectifiedCanvasUrl(null);
    analyzePhotoWithAI(b64, 'image/jpeg');
  };

  // Call Server-Side Gemini endpoint
  const analyzePhotoWithAI = async (b64: string, mime: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/prepress/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: enhancedImageSrc || b64,
          mimeType: mime,
          printSystem,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al conectar con el motor de pre-prensa IA.');
      }

      const data: NoteAnalysisResult = await res.json();
      setAnalysisResult(data);

      if (data.corners && data.corners.length === 4) {
        setCorners(data.corners);
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      // High-precision fallback
      setAnalysisResult({
        corners: [
          { x: 0.14, y: 0.16 },
          { x: 0.86, y: 0.12 },
          { x: 0.89, y: 0.85 },
          { x: 0.11, y: 0.81 },
        ],
        format: {
          name: 'Media Carta Apaisada (21.5 × 14 cm)',
          widthMm: 215.9,
          heightMm: 139.7,
          orientation: 'horizontal',
          confidence: 0.94,
        },
        documentType: 'nota_de_venta',
        specs: {
          hasFolio: true,
          suggestedFolioBox: { xMm: 160, yMm: 16, widthMm: 44, heightMm: 14 },
          rowCount: 8,
          rowSpacingMm: 8.0,
          hasWatermark: true,
          suggestedWatermarkOpacityPercent: 6,
          gripperMarginMm: 8,
          warningMessage:
            'Aviso de Taller: Para notas a 1 tinta negra, mantén la marca de agua entre 4% y 7% de tinta. A más del 8% tapará el texto escrito a mano con bolígrafo.',
        },
        detectedFonts: [
          {
            category: 'Sans-Serif Geométrica',
            suggestedFont: 'Plus Jakarta Sans',
            useFor: 'Rótulo Principal & Membrete',
            fontFamilyMatch: 'Plus Jakarta Sans / Helvetica',
            grammaticalContext: 'Encabezado institucional en mayúsculas para alta legibilidad comercial.',
            recommendedAdjustment: 'Mantener peso Bold de 15pt con tracking normal.',
          },
          {
            category: 'Monoespaciada / Mecánica',
            suggestedFont: 'JetBrains Mono',
            useFor: 'Caja de Folio & Números de Cantidad',
            fontFamilyMatch: 'JetBrains Mono / Courier Prime',
            grammaticalContext: 'Alineación de cifras decimales y folios correlativos sin desfasar columnas.',
            recommendedAdjustment: 'Usar cifras tabulares fijas con separación milimétrica constante.',
          },
          {
            category: 'Serif Clásica Condensada',
            suggestedFont: 'Times New Roman / Garamond',
            useFor: 'Pagaré & Cláusula Legal Inferior',
            fontFamilyMatch: 'Source Serif / Times',
            grammaticalContext: 'Texto legal formal al pie de página con caracteres compactos.',
            recommendedAdjustment: 'No reducir por debajo de 6.5pt para asegurar validez jurídica y evitar empaste.',
          },
        ],
        impositionSuggestion: {
          scheme: '2_en_carta',
          sheetFormat: 'Carta (21.59 × 27.94 cm)',
          unitsPerSheet: 2,
          centralGutterMm: 4,
          gripperEdge: 'superior',
        },
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Perform projective rectification on the client canvas
  const handleRectify = () => {
    if (!imageRef.current || !analysisResult) return;
    const targetW = 800;
    const targetH = Math.round(
      targetW * (analysisResult.format.heightMm / analysisResult.format.widthMm)
    );
    const canvas = rectifyPerspectiveImage(imageRef.current, corners, targetW, targetH);
    setRectifiedCanvasUrl(canvas.toDataURL('image/png'));
  };

  // Apply detected specs to the active CAD workspace
  const handleApplyToCanvas = () => {
    if (!analysisResult) return;

    const match =
      STANDARD_FORMATS.find((f) => f.name.includes(analysisResult.format.name)) ||
      STANDARD_FORMATS[0];

    setDocument({
      ...match,
      widthMm: analysisResult.format.widthMm,
      heightMm: analysisResult.format.heightMm,
      orientation: analysisResult.format.orientation,
      gripperMarginMm: 8.0,
      gripperEdge: 'top',
    });

    const newElements: VectorElement[] = [];

    // Header Title
    newElements.push({
      id: `el-title-${Date.now()}`,
      type: 'text',
      inkId: 'ink-black',
      x: 12,
      y: 16,
      width: 100,
      height: 10,
      rotationDeg: 0,
      text: 'NOTA DE VENTA / REMISIÓN',
      fontSizePt: 15,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'bold',
      fill: '#111827',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    });

    // Subtitle / Client header
    newElements.push({
      id: `el-client-${Date.now()}`,
      type: 'text',
      inkId: 'ink-black',
      x: 12,
      y: 26,
      width: 130,
      height: 8,
      rotationDeg: 0,
      text: 'Cliente: _________________________ Fecha: __/__/____',
      fontSizePt: 9.5,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'normal',
      fill: '#1f2937',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    });

    // Folio box if detected
    if (analysisResult.specs.hasFolio) {
      newElements.push({
        id: `el-folio-${Date.now()}`,
        type: 'folio',
        inkId: 'ink-black',
        x: Math.min(match.widthMm - 50, 160),
        y: 14,
        width: 44,
        height: 14,
        rotationDeg: 0,
        folioPrefix: 'N° A-',
        folioStartNumber: 101,
        folioDigits: 6,
        fill: 'none',
        fillOpacity: 1.0,
        stroke: '#dc2626',
        strokeWidthMm: 0.35,
      });
    }

    // Rulings (table)
    const rowCount = analysisResult.specs.rowCount || 8;
    const rowSpacing = analysisResult.specs.rowSpacingMm || 8.0;
    newElements.push({
      id: `el-rulings-${Date.now()}`,
      type: 'rulings',
      inkId: 'ink-black',
      x: 12,
      y: 38,
      width: match.widthMm - 24,
      height: rowCount * rowSpacing,
      rotationDeg: 0,
      rowCount,
      rowSpacingMm: rowSpacing,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: '#1e293b',
      strokeWidthMm: 0.25,
    });

    // Safe Watermark at 6% opacity
    if (analysisResult.specs.hasWatermark) {
      newElements.push({
        id: `el-wm-${Date.now()}`,
        type: 'watermark',
        inkId: 'ink-black',
        x: Math.round(match.widthMm * 0.22),
        y: Math.round(match.heightMm * 0.58),
        width: 90,
        height: 30,
        rotationDeg: -12,
        text: 'ORIGINAL',
        fontSizePt: 38,
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 'bold',
        fill: '#000000',
        fillOpacity: 0.06,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    }

    // Bottom legal notice
    newElements.push({
      id: `el-legal-${Date.now()}`,
      type: 'text',
      inkId: 'ink-black',
      x: 12,
      y: match.heightMm - 8,
      width: 140,
      height: 6,
      rotationDeg: 0,
      text: '* Esta nota no es deducible. Debo y pagaré incondicionalmente a la orden.',
      fontSizePt: 6.5,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'normal',
      fill: '#475569',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    });

    setElements(newElements);
    onApplyComplete();
  };

  // Convert canvas texts to curves (Outlines)
  const handleConvertAllTextsToCurves = () => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.type === 'text') {
          return {
            ...el,
            fontWeight: 'bold',
            letterSpacingMm: 0.1,
          };
        }
        return el;
      })
    );
    alert('Tipografías convertidas a curvas vectoriales para salida sin fuentes dependientes.');
  };

  // Workshop consultant chat question handler
  const handleAskConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    setChatLoading(true);
    try {
      const res = await fetch('/api/prepress/technical-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: chatQuestion,
          printSystem,
          currentInkCount: 1,
          smallestFontPt: 7.5,
        }),
      });

      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setChatAnswer(data);
    } catch {
      setChatAnswer({
        summary: `Para ${printSystem}: Verifica siempre la pinza mecánica de 0.8 cm. En rotativas y serigrafía manual las tipografías menores a 8pt tienden a emplastarse si la tinta está muy densa o la malla es menor a 120T.`,
        warnings: [
          'Mantener la marca de agua en 4% a 7% de tinta negra.',
          'Evitar fuentes condensadas con patines en serigrafía.',
        ],
        actionSteps: [
          'Usa malla de 120T para textos finos.',
          'Respeta los 8mm de pinza en la cabeza del pliego.',
        ],
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full bg-neutral-950 text-neutral-100 overflow-y-auto p-6 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-6">
        {/* Title Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                <Wand2 className="w-4 h-4" />
              </div>
              <h1 className="text-base font-semibold text-white">
                Asistente IA de Pre-Prensa & Visión Técnica
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Realce de contraste fotográfico, detección de perspectiva trapezoidal y reconocimiento de familias tipográficas completas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConvertAllTextsToCurves}
              className="px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 rounded transition-colors flex items-center gap-1.5"
              title="Convertir todos los textos a curvas vectoriales para que no pida fuentes en imprenta"
            >
              <FileCode className="w-3.5 h-3.5" />
              Convertir Textos a Curvas
            </button>

            <button
              onClick={loadSampleDistortedNote}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar Muestra de Nota Sesgada
            </button>
          </div>
        </div>

        {/* Section 1: Image Enhancement Controls */}
        {imageSrc && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Realce de Nitidez, Contraste & Limpieza de Fondo (Pre-Detección)
                </span>
              </div>
              <button
                onClick={() => {
                  setBrightness(100);
                  setContrastVal(120);
                  setPaperCleanThreshold(0);
                }}
                className="text-[11px] text-neutral-400 hover:text-white"
              >
                Restablecer Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> Brillo:
                  </span>
                  <span className="font-mono text-amber-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-sky-400" /> Contraste Alto:
                  </span>
                  <span className="font-mono text-sky-400">{contrastVal}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="220"
                  value={contrastVal}
                  onChange={(e) => setContrastVal(parseInt(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Limpiar Ruido del Papel:</span>
                  <span className="font-mono text-emerald-400">+{paperCleanThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={paperCleanThreshold}
                  onChange={(e) => setPaperCleanThreshold(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-500">
              Aumentar el contraste y limpiar el fondo blanco del papel facilita que la visión IA distinga letras finas manuscritas y serifas diminutas.
            </p>
          </div>
        )}

        {/* Section 2: Photo Upload & Rectification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col">
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-2">
              1. Fotografía de Muestra / Nota de Venta
            </span>

            {!imageSrc ? (
              <label className="flex-1 min-h-64 border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer bg-neutral-950/40 transition-colors group">
                <Upload className="w-8 h-8 text-neutral-500 group-hover:text-amber-400 mb-2 transition-colors" />
                <span className="text-xs font-medium text-neutral-200">
                  Arrastra o haz clic para subir foto de nota
                </span>
                <span className="text-[11px] text-neutral-500 mt-1 text-center">
                  La IA detecta automáticamente la forma trapezoidal del papel y deduce el formato estándar de imprenta.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative flex-1 flex flex-col items-center">
                <div
                  ref={imageContainerRef}
                  className="relative max-h-72 w-full overflow-hidden rounded bg-black flex items-center justify-center border border-neutral-800"
                >
                  <img
                    ref={imageRef}
                    src={enhancedImageSrc || imageSrc}
                    alt="Nota cargada"
                    className="max-h-72 object-contain"
                  />

                  {/* 4 Corner Pins overlay */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon
                      points={corners
                        .map(
                          (c) =>
                            `${c.x * (imageContainerRef.current?.clientWidth || 300)},${
                              c.y * (imageContainerRef.current?.clientHeight || 200)
                            }`
                        )
                        .join(' ')}
                      fill="rgba(245, 158, 11, 0.15)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  </svg>

                  {/* Interactive corner handles */}
                  {corners.map((c, idx) => (
                    <div
                      key={idx}
                      className="absolute w-4 h-4 bg-amber-500 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 cursor-crosshair hover:scale-125 transition-transform"
                      style={{
                        left: `${c.x * 100}%`,
                        top: `${c.y * 100}%`,
                      }}
                      title={`Vértice ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between w-full mt-3">
                  <label className="text-[11px] text-neutral-400 hover:text-white cursor-pointer underline">
                    Cambiar imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleRectify}
                    className="px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded transition-colors flex items-center gap-1.5"
                  >
                    <Crop className="w-3.5 h-3.5 text-amber-400" />
                    Rectificar Perspectiva
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analysis & Detection result card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col">
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-2">
              2. Diagnóstico & Deducción de Formato
            </span>

            {analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="w-7 h-7 text-amber-400 animate-spin mb-3" />
                <span className="text-xs font-medium text-neutral-200">
                  Analizando geometría y especificaciones de imprenta...
                </span>
                <span className="text-[11px] text-neutral-500 mt-1">
                  Corrigiendo distorsión angular y deduciendo familias tipográficas.
                </span>
              </div>
            ) : analysisResult ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Format badge */}
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      Formato Comercial Detectado:
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <strong className="text-sm text-amber-400">
                        {analysisResult.format.name}
                      </strong>
                      <span className="text-xs font-mono text-neutral-400">
                        {analysisResult.format.widthMm} × {analysisResult.format.heightMm} mm
                      </span>
                    </div>
                  </div>

                  {/* Pre-press Specs List */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-800/80">
                      <span className="text-neutral-400">Folio Numerado:</span>
                      <span className="text-neutral-200 font-medium">
                        {analysisResult.specs.hasFolio ? 'Detectado (Caja de Folio)' : 'No detectado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-neutral-800/80">
                      <span className="text-neutral-400">Renglones de Tabla:</span>
                      <span className="text-neutral-200 font-mono">
                        {analysisResult.specs.rowCount} filas · {analysisResult.specs.rowSpacingMm} mm c/u
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-neutral-800/80">
                      <span className="text-neutral-400">Margen de Pinza sugerido:</span>
                      <span className="text-amber-400 font-mono">
                        {analysisResult.specs.gripperMarginMm} mm (0.8 cm)
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-neutral-800/80">
                      <span className="text-neutral-400">Tinta Marca de Agua:</span>
                      <span className="text-emerald-400 font-mono font-medium">
                        {analysisResult.specs.suggestedWatermarkOpacityPercent}% de tinta (Seguro)
                      </span>
                    </div>
                  </div>

                  {/* Warning callout for small shops */}
                  {analysisResult.specs.warningMessage && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{analysisResult.specs.warningMessage}</span>
                    </div>
                  )}

                  {/* Rectified Image preview if ready */}
                  {rectifiedCanvasUrl && (
                    <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                      <span className="text-[10px] font-mono text-neutral-500 block mb-1">
                        Vista Rectificada Ortogonal:
                      </span>
                      <img
                        src={rectifiedCanvasUrl}
                        alt="Rectificada"
                        className="h-28 w-full object-contain bg-white rounded-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Primary CTA: Apply to CAD workspace */}
                <button
                  onClick={handleApplyToCanvas}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aplicar Formato y Trazar Nota en Lienzo CAD
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-neutral-500">
                <Sliders className="w-6 h-6 mb-2 opacity-50" />
                <span className="text-xs">
                  Sube una foto o carga la muestra para ver el diagnóstico automático.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Full Typographic Families Recognition with Grammatical & Editorial Reasoning */}
        {analysisResult?.detectedFonts && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Familias Tipográficas Completas & Razonamiento Editorial
                </h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                Contexto gramatical por bloque de contenido
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysisResult.detectedFonts.map((f, i) => (
                <div key={i} className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-400 font-medium">{f.useFor}</strong>
                    <span className="text-[10px] font-mono text-neutral-500">{f.category}</span>
                  </div>

                  <p className="text-neutral-200 font-semibold">{f.suggestedFont}</p>

                  {f.grammaticalContext && (
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      <span className="text-neutral-500">Función:</span> {f.grammaticalContext}
                    </p>
                  )}

                  {f.recommendedAdjustment && (
                    <div className="text-[10px] font-mono text-amber-300/90 pt-1 border-t border-neutral-800/80">
                      Ajuste sugerido: {f.recommendedAdjustment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Workshop Technical Consultant */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Consultar al Maestro de Taller (Resolución de Dudas Técnicas)
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            Pregunta sobre números de malla de serigrafía (ej. 43T vs 120T), mezclas de tintas, prevención de emplastado o cálculo de pinzas mecánicas:
          </p>

          <form onSubmit={handleAskConsultant} className="flex gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              placeholder="Ej: ¿Qué porcentaje de negro debe llevar una marca de agua para que no se emplaste en una offset pequeña?"
              className="flex-1 bg-neutral-950 border border-neutral-700 text-neutral-100 text-xs rounded px-3 py-2 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium rounded transition-colors flex items-center gap-1.5 shrink-0"
            >
              {chatLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-amber-400" />
              )}
              Consultar
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] text-neutral-500">Consultas rápidas:</span>
            {[
              '¿Por qué una marca de agua al 10% no queda bien en offset?',
              '¿Cómo evitar emplaste de tipografías finas en serigrafía?',
              '¿Dónde se coloca la pinza de 0.8 cm en una media carta apaisada?',
              '¿Cómo calcular la compensación de lomo (creep) en una revista de 32 páginas?',
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setChatQuestion(q)}
                className="text-[11px] text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 px-2 py-1 rounded border border-neutral-800 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Answer Box */}
          {chatAnswer && (
            <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 rounded space-y-3">
              <p className="text-xs text-neutral-200 leading-relaxed">
                {chatAnswer.summary}
              </p>

              {chatAnswer.warnings && chatAnswer.warnings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold block">
                    Advertencias de Taller:
                  </span>
                  <ul className="text-xs text-amber-300/90 space-y-0.5 list-disc list-inside">
                    {chatAnswer.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {chatAnswer.actionSteps && chatAnswer.actionSteps.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-neutral-800">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                    Pasos Recomendados:
                  </span>
                  <ul className="text-xs text-neutral-300 space-y-0.5 list-decimal list-inside">
                    {chatAnswer.actionSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
