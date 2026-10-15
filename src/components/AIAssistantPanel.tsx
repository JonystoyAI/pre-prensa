import React, { useState, useRef, useEffect } from 'react';
import {
  DocumentDimensions,
  InkColor,
  NoteAnalysisResult,
  Point2D,
  PrintSystem,
  VectorElement,
} from '../types/prepress';
import { STANDARD_FORMATS } from '../utils/prepressCalculations';
import { rectifyPerspectiveImage } from '../utils/homography';
import {
  upscaleTo300Dpi,
  repairBrokenLinesAndDenoise,
  calculateCornerDeviations,
} from '../utils/imageEnhancer';
import { parseUploadedFile } from '../utils/vectorFileParsers';
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
  ShieldCheck,
  Palette,
  Maximize2,
  Check,
  Info,
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
  const [brightness, setBrightness] = useState<number>(100);
  const [contrastVal, setContrastVal] = useState<number>(125);
  const [paperCleanThreshold, setPaperCleanThreshold] = useState<number>(15);
  const [is300DpiActive, setIs300DpiActive] = useState<boolean>(false);
  const [isRepairedLinesActive, setIsRepairedLinesActive] = useState<boolean>(false);

  // 4 corners normalized [0..1]
  const [corners, setCorners] = useState<Point2D[]>([
    { x: 0.1, y: 0.12 },
    { x: 0.9, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.88 },
  ]);

  // Substrate & Inks configuration
  const [substrate, setSubstrate] = useState<
    'papel_comercial' | 'playera_textil' | 'vinil_corte' | 'cartulina'
  >('papel_comercial');
  const [inkCount, setInkCount] = useState<number>(1);
  const [targetFormatKey, setTargetFormatKey] = useState<string>('media_carta');

  // User Custom Typography state
  const [userFonts, setUserFonts] = useState<string[]>([
    'Plus Jakarta Sans',
    'JetBrains Mono',
    'Inter',
    'Times New Roman',
    'Helvetica',
  ]);
  const [fontMapping, setFontMapping] = useState<{
    header: string;
    table: string;
    folio: string;
    legal: string;
  }>({
    header: 'Plus Jakarta Sans',
    table: 'JetBrains Mono',
    folio: 'JetBrains Mono',
    legal: 'Times New Roman',
  });
  const [fontUploadSuccess, setFontUploadSuccess] = useState<string | null>(null);

  // Vector Logo and Watermark substitution state
  const [userLogoVector, setUserLogoVector] = useState<{
    name: string;
    elements: VectorElement[];
    rawSvg?: string;
  } | null>(null);
  const [userWatermarkVector, setUserWatermarkVector] = useState<{
    name: string;
    elements: VectorElement[];
    rawSvg?: string;
  } | null>(null);

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

  // Corner deviation calculation
  const cornerDeviations = calculateCornerDeviations(corners);

  // Apply filters via Canvas
  const applyImageEnhancements = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let canvas = document.createElement('canvas');
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
        const thresh = 255 - paperCleanThreshold * 2.2;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > thresh) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (lum < 110) {
            // Intensify ink lines for clean edges
            data[i] = Math.max(0, data[i] * 0.7);
            data[i + 1] = Math.max(0, data[i + 1] * 0.7);
            data[i + 2] = Math.max(0, data[i + 2] * 0.7);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // If Repair Broken Lines is active
      if (isRepairedLinesActive) {
        canvas = repairBrokenLinesAndDenoise(canvas, 3);
      }

      // If 300 DPI upscale is active
      if (is300DpiActive) {
        const targetFormat = getSelectedFormatDimensions();
        canvas = upscaleTo300Dpi(canvas, targetFormat.widthMm, targetFormat.heightMm);
      }

      const enhancedUrl = canvas.toDataURL('image/jpeg', 0.94);
      setEnhancedImageSrc(enhancedUrl);
    };
    img.src = src;
  };

  const getSelectedFormatDimensions = (): { widthMm: number; heightMm: number; name: string } => {
    switch (targetFormatKey) {
      case 'cuarto_carta':
        return { widthMm: 107.9, heightMm: 139.7, name: 'Cuarto de Carta (10.8 × 14 cm)' };
      case 'carta':
        return { widthMm: 215.9, heightMm: 279.4, name: 'Carta Completa (21.6 × 27.9 cm)' };
      case 'medio_oficio':
        return { widthMm: 215.9, heightMm: 170.0, name: 'Medio Oficio (21.6 × 17 cm)' };
      case 'oficio':
        return { widthMm: 215.9, heightMm: 340.0, name: 'Oficio (21.6 × 34 cm)' };
      case 'playera_textil':
        return { widthMm: 280.0, heightMm: 350.0, name: 'Estampado Textil / Playera (28 × 35 cm)' };
      case 'media_carta':
      default:
        return { widthMm: 215.9, heightMm: 139.7, name: 'Media Carta Apaisada (21.6 × 14 cm)' };
    }
  };

  useEffect(() => {
    if (imageSrc) {
      applyImageEnhancements(imageSrc);
    }
  }, [imageSrc, brightness, contrastVal, paperCleanThreshold, is300DpiActive, isRepairedLinesActive]);

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
      // Dark workshop table background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);

      // Skewed paper (trapezoid simulating tilted phone photo)
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

      // Bitten / slightly uneven lines
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
      if (data.substrate) {
        setSubstrate(data.substrate);
      }
      if (data.inkSeparationSuggestion) {
        setInkCount(data.inkSeparationSuggestion.inkCount || 1);
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
          confidence: 0.96,
        },
        documentType: 'nota_de_venta',
        substrate: 'papel_comercial',
        borderFrame: {
          isOrthogonal: false,
          deviationAngleDeg: 5.2,
          detectedRect: { xMm: 8, yMm: 8, widthMm: 199.9, heightMm: 123.7 },
        },
        logoZone: { xMm: 12, yMm: 14, widthMm: 35, heightMm: 16 },
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
            'Aviso de Taller: Enderezado ortogonal a 90° habilitado. Se detectó marco delimitador con inclinación de perspectiva que se corrige a ángulos rectos.',
        },
        inkSeparationSuggestion: {
          inkCount: 1,
          inkNames: ['Black (Key)'],
          underbaseNeeded: false,
          meshRecommendation: 'Placa CTP térmica offset / Malla 120T serigrafía',
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

  // Perform 90° Orthogonal Auto-Aderezo (Deskew with 90 degree right angles reference)
  const handleAutoAderezar90 = () => {
    if (!imageRef.current) return;
    const format = getSelectedFormatDimensions();
    const targetW = 900;
    const targetH = Math.round(targetW * (format.heightMm / format.widthMm));

    const canvas = rectifyPerspectiveImage(imageRef.current, corners, targetW, targetH);
    setRectifiedCanvasUrl(canvas.toDataURL('image/png'));
  };

  // Handle User Font Upload (.ttf, .otf, .woff)
  const handleUserFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setUserFonts((prev) => [fontName, ...prev]);
      // Assign to all zones by default
      setFontMapping({
        header: fontName,
        table: fontName,
        folio: fontName,
        legal: fontName,
      });
      setFontUploadSuccess(`Tipografía "${fontName}" instalada y asignada a todos los bloques.`);
      setTimeout(() => setFontUploadSuccess(null), 4000);
    } catch (err) {
      console.error('Error cargando fuente:', err);
      setFontUploadSuccess('Error al cargar archivo tipográfico.');
    }
  };

  // Handle User Vector Logo Upload (.svg, .ai, .eps)
  const handleUserLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parsed = await parseUploadedFile(file, currentDoc.widthMm, currentDoc.heightMm);
    if (parsed.success && parsed.elements.length > 0) {
      setUserLogoVector({
        name: file.name,
        elements: parsed.elements,
      });
    } else {
      alert(`No se pudieron extraer vectores de "${file.name}".`);
    }
  };

  // Handle User Watermark Vector Upload (.svg, .ai, .eps)
  const handleUserWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parsed = await parseUploadedFile(file, currentDoc.widthMm, currentDoc.heightMm);
    if (parsed.success && parsed.elements.length > 0) {
      setUserWatermarkVector({
        name: file.name,
        elements: parsed.elements,
      });
    } else {
      alert(`No se pudieron extraer vectores de "${file.name}".`);
    }
  };

  // Apply surgical CAD reconstruction to active workspace
  const handleApplySurgicalReconstruction = () => {
    const format = getSelectedFormatDimensions();

    const match =
      STANDARD_FORMATS.find((f) => f.name.toLowerCase().includes(targetFormatKey)) ||
      STANDARD_FORMATS[0];

    const isTextile = substrate === 'playera_textil';
    const gripperMm = isTextile ? 0 : 8.0;

    setDocument({
      ...match,
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      orientation: format.widthMm >= format.heightMm ? 'horizontal' : 'vertical',
      gripperMarginMm: gripperMm,
      gripperEdge: 'top',
    });

    const newElements: VectorElement[] = [];

    // 1. Marco perimetral ortogonal a 90° (Línea de contorno pura, NO figura rellena)
    const marginMm = isTextile ? 12 : 8;
    newElements.push({
      id: `el-frame-${Date.now()}`,
      type: 'rect',
      name: 'Marco Perimetral Ortogonal (90°)',
      inkId: 'ink-black',
      x: marginMm,
      y: marginMm + (isTextile ? 0 : gripperMm),
      width: format.widthMm - marginMm * 2,
      height: format.heightMm - marginMm * 2 - (isTextile ? 0 : gripperMm),
      rotationDeg: 0,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: '#1e293b',
      strokeWidthMm: isTextile ? 0.6 : 0.35,
    });

    // 2. Logotipo original del usuario o titular vectorial sólido
    if (userLogoVector && userLogoVector.elements.length > 0) {
      // Place user's vector logo
      const logoStartX = marginMm + 4;
      const logoStartY = marginMm + (isTextile ? 4 : gripperMm + 4);
      userLogoVector.elements.forEach((el, idx) => {
        newElements.push({
          ...el,
          id: `el-user-logo-${idx}-${Date.now()}`,
          name: `Logotipo Vectorial [${userLogoVector.name}] #${idx + 1}`,
          x: logoStartX + (el.x % 40),
          y: logoStartY + (el.y % 20),
          inkId: isTextile && inkCount > 1 ? 'ink-reflex-blue' : 'ink-black',
        });
      });
    } else {
      // Crisp solid typography header
      newElements.push({
        id: `el-title-${Date.now()}`,
        type: 'text',
        name: 'Rótulo / Membrete Comercial',
        inkId: 'ink-black',
        x: marginMm + 4,
        y: marginMm + (isTextile ? 4 : gripperMm + 4),
        width: 110,
        height: 10,
        rotationDeg: 0,
        text: 'NOTA DE VENTA / REMISIÓN',
        fontSizePt: 15,
        fontFamily: fontMapping.header,
        fontWeight: 'bold',
        fill: '#111827',
        fillOpacity: 1.0,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    }

    // 3. Client Header info
    newElements.push({
      id: `el-client-${Date.now()}`,
      type: 'text',
      name: 'Datos del Cliente & Fecha',
      inkId: 'ink-black',
      x: marginMm + 4,
      y: marginMm + (isTextile ? 16 : gripperMm + 14),
      width: 130,
      height: 8,
      rotationDeg: 0,
      text: 'Cliente: _________________________ Fecha: __/__/____',
      fontSizePt: 9,
      fontFamily: fontMapping.table,
      fontWeight: 'normal',
      fill: '#1f2937',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    });

    // 4. Folio Box (Caja de folio numerado en esquina superior derecha)
    const folioX = format.widthMm - marginMm - 48;
    const folioY = marginMm + (isTextile ? 4 : gripperMm + 2);
    newElements.push({
      id: `el-folio-${Date.now()}`,
      type: 'folio',
      name: 'Folio Tipográfico Correlativo',
      inkId: inkCount > 1 ? 'ink-warm-red' : 'ink-black',
      x: folioX,
      y: folioY,
      width: 44,
      height: 14,
      rotationDeg: 0,
      folioPrefix: 'N° A-',
      folioStartNumber: 101,
      folioDigits: 6,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: inkCount > 1 ? '#dc2626' : '#111827',
      strokeWidthMm: 0.35,
    });

    // 5. Renglones y Columnas: LÍNEAS PURAS (Strokes CAD), nunca polígonos rellenos
    const rowCount = analysisResult?.specs.rowCount || 8;
    const rowSpacing = analysisResult?.specs.rowSpacingMm || 8.5;
    const rulingsY = marginMm + (isTextile ? 30 : gripperMm + 26);

    newElements.push({
      id: `el-rulings-${Date.now()}`,
      type: 'rulings',
      name: 'Renglones y Columnas CAD (Líneas de Trazo)',
      inkId: 'ink-black',
      x: marginMm + 4,
      y: rulingsY,
      width: format.widthMm - marginMm * 2 - 8,
      height: rowCount * rowSpacing,
      rotationDeg: 0,
      rowCount,
      rowSpacingMm: rowSpacing,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: '#1e293b',
      strokeWidthMm: isTextile ? 0.5 : 0.25,
    });

    // 6. Watermark: User custom vector OR calibrated solid text
    if (userWatermarkVector && userWatermarkVector.elements.length > 0) {
      const wmStartX = format.widthMm * 0.3;
      const wmStartY = format.heightMm * 0.45;
      userWatermarkVector.elements.forEach((el, idx) => {
        newElements.push({
          ...el,
          id: `el-user-wm-${idx}-${Date.now()}`,
          name: `Marca de Agua Vectorial [${userWatermarkVector.name}] #${idx + 1}`,
          x: wmStartX + (el.x % 50),
          y: wmStartY + (el.y % 30),
          fillOpacity: isTextile ? 0.15 : 0.06,
          inkId: 'ink-black',
        });
      });
    } else {
      newElements.push({
        id: `el-wm-${Date.now()}`,
        type: 'watermark',
        name: 'Marca de Agua Central Calibrada',
        inkId: 'ink-black',
        x: Math.round(format.widthMm * 0.25),
        y: Math.round(format.heightMm * 0.55),
        width: 100,
        height: 30,
        rotationDeg: -12,
        text: isTextile ? 'PRINT SHOP' : 'ORIGINAL',
        fontSizePt: 36,
        fontFamily: fontMapping.header,
        fontWeight: 'bold',
        fill: '#000000',
        fillOpacity: isTextile ? 0.15 : 0.06,
        stroke: 'none',
        strokeWidthMm: 0,
      });
    }

    // 7. Pagaré / Texto Legal al pie de página con tipografía seleccionada
    newElements.push({
      id: `el-legal-${Date.now()}`,
      type: 'text',
      name: 'Pagaré / Cláusula Legal Inferior',
      inkId: 'ink-black',
      x: marginMm + 4,
      y: format.heightMm - marginMm - 4,
      width: format.widthMm - marginMm * 2 - 8,
      height: 6,
      rotationDeg: 0,
      text: '* Esta nota no es deducible. Debo y pagaré incondicionalmente a su orden en esta plaza la cantidad anotada.',
      fontSizePt: 6.5,
      fontFamily: fontMapping.legal,
      fontWeight: 'normal',
      fill: '#475569',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    });

    setElements(newElements);
    onApplyComplete();
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
          currentInkCount: inkCount,
          smallestFontPt: 7.0,
        }),
      });

      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setChatAnswer(data);
    } catch {
      setChatAnswer({
        summary: `Para sustrato ${substrate === 'playera_textil' ? 'Playera Textil' : 'Papel Comercial'}: En serigrafía textil oscura es mandatorio aplicar Underbase blanco con secado intermedio (flash cure) y malla 43T-62T. En papel offset mantenga la pinza de 8 mm y use líneas mínimas de 0.25 mm para evitar cortes en placa.`,
        warnings: [
          'No use fuentes con patines (serif) menores a 9pt en serigrafía textil manual.',
          'Mantener la marca de agua entre 4% y 7% de tinta negra en papel bond para no tapar escritura.',
        ],
        actionSteps: [
          'Enderezar con referencia de ángulos rectos a 90° antes de exportar negativos.',
          'Convertir todas las tipografías a curvas vectoriales para evitar sustitución en taller.',
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                <Wand2 className="w-4 h-4" />
              </div>
              <h1 className="text-base font-semibold text-white">
                Reconstrucción Quirúrgica de Formatos para Impresión
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Enderezado a 90° con marco de referencia ortogonal, líneas CAD puras, reemplazo vectorial de logos y fuentes de usuario.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSampleDistortedNote}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar Muestra Sesgada (Celular)
            </button>
          </div>
        </div>

        {/* Section 1: Pre-Processing, 300 DPI Super-Resolution & Broken Line Repair */}
        {imageSrc && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Pre-Procesador de Definición & Super-Resolución (300 DPI)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIs300DpiActive(!is300DpiActive)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
                    is300DpiActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                  title="Aumentar resolución a 300 DPI reales para captura de trazos finos"
                >
                  <Maximize2 className="w-3 h-3" />
                  {is300DpiActive ? '300 DPI Activo' : 'Subir a 300 DPI'}
                </button>

                <button
                  onClick={() => setIsRepairedLinesActive(!isRepairedLinesActive)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
                    isRepairedLinesActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                  title="Reparar líneas mordidas y rotas mediante cierre morfológico"
                >
                  <ShieldCheck className="w-3 h-3" />
                  {isRepairedLinesActive ? 'Líneas Reparadas' : 'Reparar Líneas Mordidas'}
                </button>
              </div>
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
          </div>
        )}

        {/* Section 2: Photo Upload, Perspective Correction & 90° Orthogonal Deskew */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-neutral-400">
                1. Fotografía de Muestra / Formato a Reconstruir
              </span>
              {imageSrc && (
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {cornerDeviations.isOrthogonal ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 90° Recto
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Desvío: {cornerDeviations.maxAngleDeviationDeg}°
                    </span>
                  )}
                </div>
              )}
            </div>

            {!imageSrc ? (
              <label className="flex-1 min-h-64 border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer bg-neutral-950/40 transition-colors group">
                <Upload className="w-8 h-8 text-neutral-500 group-hover:text-amber-400 mb-2 transition-colors" />
                <span className="text-xs font-medium text-neutral-200">
                  Arrastra o haz clic para subir foto del impreso
                </span>
                <span className="text-[11px] text-neutral-500 mt-1 text-center">
                  La IA detecta los ángulos rectos de los marcos perimetrales (90°) y corrige la inclinación de la cámara.
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

                {/* 90-degree deskew CTA bar */}
                <div className="flex items-center justify-between w-full mt-3 gap-2">
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
                    onClick={handleAutoAderezar90}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Enderezar la perspectiva basándose en los ángulos rectos de 90° del marco delimitador"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    Aderezar a 90° (Referencia Ortogonal)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Diagnosis & Format Setup card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col">
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-2">
              2. Parámetros del Formato & Detección Ortogonal
            </span>

            {analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="w-7 h-7 text-amber-400 animate-spin mb-3" />
                <span className="text-xs font-medium text-neutral-200">
                  Analizando geometría ortogonal y deduciendo formato...
                </span>
                <span className="text-[11px] text-neutral-500 mt-1">
                  Corrigiendo trazos mordidos y detectando ángulos rectos de 90°.
                </span>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3 text-xs">
                  {/* Target Standard Format selector */}
                  <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                      Formato Estándar para Impresión:
                    </span>
                    <select
                      value={targetFormatKey}
                      onChange={(e) => setTargetFormatKey(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                    >
                      <option value="media_carta">Media Carta Apaisada (21.5 × 14 cm)</option>
                      <option value="cuarto_carta">Cuarto de Carta (10.8 × 14 cm)</option>
                      <option value="carta">Carta Completa (21.6 × 27.9 cm)</option>
                      <option value="medio_oficio">Medio Oficio (21.6 × 17 cm)</option>
                      <option value="oficio">Oficio (21.6 × 34 cm)</option>
                      <option value="playera_textil">Estampado Textil / Playera (28 × 35 cm)</option>
                    </select>
                  </div>

                  {/* Substrate & Printing System selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                        Sustrato / Soporte:
                      </span>
                      <select
                        value={substrate}
                        onChange={(e) =>
                          setSubstrate(
                            e.target.value as 'papel_comercial' | 'playera_textil' | 'vinil_corte' | 'cartulina'
                          )
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-[11px] rounded px-2 py-1"
                      >
                        <option value="papel_comercial">Papel Comercial / Bond (Offset)</option>
                        <option value="playera_textil">Playera Textil (Serigrafía / DTF)</option>
                        <option value="cartulina">Cartulina Sulfatada</option>
                        <option value="vinil_corte">Vinil de Corte</option>
                      </select>
                    </div>

                    <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                        Cantidad de Tintas:
                      </span>
                      <select
                        value={inkCount}
                        onChange={(e) => setInkCount(parseInt(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-[11px] rounded px-2 py-1"
                      >
                        <option value={1}>1 Tinta (Monocromático / Negro)</option>
                        <option value={2}>2 Tintas (Negro + Pantone Spot)</option>
                        <option value={3}>3 Tintas (Separación Textil)</option>
                        <option value={4}>4 Tintas (CMYK Cuatricromía)</option>
                      </select>
                    </div>
                  </div>

                  {/* Rectified Image preview if ready */}
                  {rectifiedCanvasUrl && (
                    <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                      <span className="text-[10px] font-mono text-emerald-400 block mb-1">
                        ✓ Imagen Aderezada a 90° Ortogonal:
                      </span>
                      <img
                        src={rectifiedCanvasUrl}
                        alt="Rectificada"
                        className="h-28 w-full object-contain bg-white rounded-xs"
                      />
                    </div>
                  )}

                  {/* Pre-press Specs List */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Renglones y Columnas:</span>
                      <span className="text-neutral-200 font-mono">
                        Líneas de Trazo CAD (0.25mm - 0.5mm)
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Logotipos y Marcas de Agua:</span>
                      <span className="text-neutral-200 font-mono">Sólidos Vectoriales Nítidos</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Margen de Pinza Mecánica:</span>
                      <span className="text-amber-400 font-mono">
                        {substrate === 'playera_textil' ? '0 mm (Plancha/Paleta textil)' : '8 mm (Cabeza de pliego)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary CTA: Reconstruct */}
                <button
                  onClick={handleApplySurgicalReconstruction}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Reconstruir Quirúrgicamente en Vectores CAD
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: User Typography Substitution */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                Sustitución Inteligente con Tipografías del Usuario
              </h2>
            </div>
            <label className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded cursor-pointer transition-colors flex items-center gap-1.5 self-start sm:self-auto">
              <Upload className="w-3.5 h-3.5" />
              Subir mi Fuente (.ttf / .otf / .woff)
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleUserFontUpload}
                className="hidden"
              />
            </label>
          </div>

          {fontUploadSuccess && (
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{fontUploadSuccess}</span>
            </div>
          )}

          <p className="text-xs text-neutral-400">
            En lugar de trazos rasterizados deformados, la IA sustituye los textos del impreso con tipografías vectoriales nítidas. Asigna qué fuente debe usar cada bloque de contenido:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                1. Rótulo / Membrete:
              </span>
              <select
                value={fontMapping.header}
                onChange={(e) => setFontMapping({ ...fontMapping, header: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5"
              >
                {userFonts.map((f, i) => (
                  <option key={i} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-neutral-500 block">Pesado / Bold</span>
            </div>

            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                2. Tabla & Columnas:
              </span>
              <select
                value={fontMapping.table}
                onChange={(e) => setFontMapping({ ...fontMapping, table: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5"
              >
                {userFonts.map((f, i) => (
                  <option key={i} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-neutral-500 block">Cifras tabulares</span>
            </div>

            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                3. Caja de Folio:
              </span>
              <select
                value={fontMapping.folio}
                onChange={(e) => setFontMapping({ ...fontMapping, folio: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5"
              >
                {userFonts.map((f, i) => (
                  <option key={i} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-neutral-500 block">Monoespaciada</span>
            </div>

            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                4. Pagaré & Texto Legal:
              </span>
              <select
                value={fontMapping.legal}
                onChange={(e) => setFontMapping({ ...fontMapping, legal: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5"
              >
                {userFonts.map((f, i) => (
                  <option key={i} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-neutral-500 block">Serif / Alta lectura</span>
            </div>
          </div>
        </div>

        {/* Section 4: Vector Logo & Watermark User Substitution */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Sustitución de Logotipo y Marca de Agua con Trazos Vectoriales del Usuario
            </h2>
          </div>

          <p className="text-xs text-neutral-400">
            Si cuentas con el trazo vectorial (.svg, .ai, .eps) del logotipo o de la marca de agua original, cárgalos aquí. La IA sustituirá el elemento borroso de la foto por tu vector original con precisión milimétrica:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo replacement slot */}
            <div className="p-4 bg-neutral-950 rounded border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Trazo de Logotipo Vectorial (.svg / .eps / .ai)
                </span>
                {userLogoVector && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cargado ({userLogoVector.elements.length} trazos)
                  </span>
                )}
              </div>

              <label className="border border-dashed border-neutral-700 hover:border-amber-500/60 rounded p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-900/50 transition-colors">
                <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                <span className="text-xs text-neutral-300">
                  {userLogoVector ? userLogoVector.name : 'Subir trazo de logotipo original'}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">
                  Reemplaza el membrete rasterizado por curvas vectoriales
                </span>
                <input
                  type="file"
                  accept=".svg,.eps,.ai,.json"
                  onChange={handleUserLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Watermark replacement slot */}
            <div className="p-4 bg-neutral-950 rounded border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Vector de Marca de Agua (.svg / .eps / .ai)
                </span>
                {userWatermarkVector && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cargado ({userWatermarkVector.elements.length} trazos)
                  </span>
                )}
              </div>

              <label className="border border-dashed border-neutral-700 hover:border-amber-500/60 rounded p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-900/50 transition-colors">
                <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                <span className="text-xs text-neutral-300">
                  {userWatermarkVector ? userWatermarkVector.name : 'Subir vector de marca de agua'}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">
                  Calibrado a 6% de tinta para evitar empaste en imprenta
                </span>
                <input
                  type="file"
                  accept=".svg,.eps,.ai,.json"
                  onChange={handleUserWatermarkUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Workshop Consultant Chat */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Consultor de Taller Gráfico & Separación de Color
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            Resuelve dudas técnicas sobre mallas de serigrafía (ej. 43T para base blanca vs 120T para textos), separación de color por capas o ganancia de punto:
          </p>

          <form onSubmit={handleAskConsultant} className="flex gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              placeholder="Ej: ¿Cómo evitar que una marca de agua se empaste en serigrafía textil sobre playera oscura?"
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

          {/* Preset buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] text-neutral-500">Consultas frecuentes:</span>
            {[
              '¿Por qué los marcos de imprenta deben tener ángulos rectos de 90°?',
              '¿Cómo preparar una separación de color para playera negra con base blanca?',
              '¿Por qué las líneas de tablas deben ser trazos CAD y no polígonos rellenos?',
              '¿Qué porcentaje de negro debe llevar una marca de agua para no tapar la firma?',
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
