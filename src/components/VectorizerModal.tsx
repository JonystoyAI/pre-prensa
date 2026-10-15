import React, { useState, useRef, useEffect } from 'react';
import { InkColor, VectorElement } from '../types/prepress';
import {
  vectorizeImage,
  VectorizeOptions,
  VectorizeProfile,
  VECTORIZE_PROFILES,
  IMAGE_FORMAT_SPECS,
  ImageFormatContext,
} from '../utils/vectorizer';
import {
  X,
  Upload,
  Sliders,
  CheckCircle2,
  Layers,
  HelpCircle,
  Sparkles,
  Info,
  Split,
  Eye,
  RefreshCw,
  FileImage,
  ShieldCheck,
  Palette,
} from 'lucide-react';

interface VectorizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  docWidthMm: number;
  docHeightMm: number;
  activeInkId: string;
  initialImageSrc?: string | null;
  onVectorized: (newElements: VectorElement[], newInks: InkColor[]) => void;
}

export const VectorizerModal: React.FC<VectorizerModalProps> = ({
  isOpen,
  onClose,
  docWidthMm,
  docHeightMm,
  initialImageSrc,
  onVectorized,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc || null);
  const [fileName, setFileName] = useState<string>('imagen_subida.png');
  const [detectedFormat, setDetectedFormat] = useState<ImageFormatContext>('png');

  // Active Context Profile
  const [activeProfile, setActiveProfile] = useState<VectorizeProfile>('logo_geom');

  // Vectorizer parameters
  const [colorCount, setColorCount] = useState<number>(1);
  const [threshold, setThreshold] = useState<number>(130);
  const [smoothness, setSmoothness] = useState<number>(2);
  const [despeckle, setDespeckle] = useState<number>(4);
  const [ignoreWhiteBg, setIgnoreWhiteBg] = useState<boolean>(true);
  const [invert, setInvert] = useState<boolean>(false);

  // Preview & Results
  const [previewElements, setPreviewElements] = useState<VectorElement[]>([]);
  const [generatedInks, setGeneratedInks] = useState<InkColor[]>([]);
  const [tracedCount, setTracedCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'vector' | 'original' | 'split'>('vector');
  const [showFormatGuide, setShowFormatGuide] = useState<boolean>(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync initial image
  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
  }, [initialImageSrc]);

  // When profile changes, update defaults
  const handleSelectProfile = (profId: VectorizeProfile) => {
    setActiveProfile(profId);
    const p = VECTORIZE_PROFILES.find((prof) => prof.id === profId);
    if (p) {
      setColorCount(p.defaultColors);
      setThreshold(p.defaultThreshold);
      setSmoothness(p.defaultSmoothness);
      setDespeckle(p.defaultDespeckle);
      setIgnoreWhiteBg(p.ignoreWhiteBg);
      setInvert(p.invert);
    }
  };

  // Detect image format from filename or MIME type
  const detectFormatFromName = (name: string): ImageFormatContext => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.jpe')) return 'jpg';
    if (lower.endsWith('.webp')) return 'webp';
    if (lower.endsWith('.bmp')) return 'bmp';
    return 'auto';
  };

  // Sample graphic for quick testing
  const loadSampleGraphic = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);

      // Emblem ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(200, 200, 140, 0, Math.PI * 2);
      ctx.fill();

      // Inner ring cutout
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(200, 200, 105, 0, Math.PI * 2);
      ctx.fill();

      // Brand letters
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PRESS', 200, 185);

      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.fillText('FORGE', 200, 235);
    }
    const dataUrl = canvas.toDataURL('image/png');
    setImageSrc(dataUrl);
    setFileName('emblema_muestra_pressforge.png');
    setDetectedFormat('png');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const fmt = detectFormatFromName(file.name);
    setDetectedFormat(fmt);

    // Apply format-based intelligent recommendations
    const spec = IMAGE_FORMAT_SPECS[fmt];
    if (spec) {
      setDespeckle(spec.recommendedDespeckle);
      setSmoothness(spec.recommendedSmoothness);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run vectorization whenever parameters or image change
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setIsProcessing(true);
      setTimeout(() => {
        const opts: VectorizeOptions = {
          profile: activeProfile,
          formatContext: detectedFormat,
          colorCount,
          threshold,
          smoothness,
          despeckle,
          ignoreWhiteBg,
          invert,
        };
        const res = vectorizeImage(img, opts, docWidthMm, docHeightMm);
        setPreviewElements(res.elements);
        setGeneratedInks(res.generatedInks);
        setTracedCount(res.tracedCurvesCount);
        setIsProcessing(false);
      }, 40);
    };
    img.src = imageSrc;
  }, [
    imageSrc,
    activeProfile,
    detectedFormat,
    colorCount,
    threshold,
    smoothness,
    despeckle,
    ignoreWhiteBg,
    invert,
    docWidthMm,
    docHeightMm,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    onVectorized(previewElements, generatedInks);
    onClose();
  };

  const currentSpec = IMAGE_FORMAT_SPECS[detectedFormat] || IMAGE_FORMAT_SPECS['png'];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Vectorizador de Imágenes & Separador de Color</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded">
                  Formatos: PNG · JPG · JPEG · WEBP · BMP
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Convierte mapas de bits en curvas Bézier editables y capas de tinta directa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormatGuide(!showFormatGuide)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1.5 ${
                showFormatGuide
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
              title="Ver guía de formatos y optimización de precisión"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Guía de Formatos</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Technical Guidance Banner / Drawer */}
        {showFormatGuide && (
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-xs">
                <FileImage className="w-4 h-4 text-amber-400" />
                <span>Contexto Técnico de Formatos de Imagen (Para Máxima Precisión)</span>
              </span>
              <button
                onClick={() => setShowFormatGuide(false)}
                className="text-[11px] text-neutral-500 hover:text-neutral-300"
              >
                Ocultar guía
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {Object.values(IMAGE_FORMAT_SPECS).map((spec) => (
                <div
                  key={spec.format}
                  className={`p-2.5 rounded border ${
                    detectedFormat === spec.format
                      ? 'bg-amber-950/20 border-amber-500/50 text-neutral-200'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[11px] uppercase text-white">
                      .{spec.format}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        spec.isLossy
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {spec.compressionType}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-neutral-300 mb-1.5">
                    {spec.description}
                  </p>
                  <div className="text-[9px] font-mono text-amber-300/90 pt-1 border-t border-neutral-800/80">
                    💡 {spec.advice}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Main Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN: Controls & Profiles (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Upload Area & File Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Imagen de Entrada:</span>
                </span>
                <button
                  type="button"
                  onClick={loadSampleGraphic}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-medium"
                >
                  Cargar Emblema de Muestra
                </button>
              </div>

              <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500/70 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/60 transition-colors">
                <Upload className="w-5 h-5 text-neutral-400 mb-1" />
                <span className="text-xs font-medium text-neutral-200">
                  {fileName ? fileName : 'Selecciona o arrastra una imagen'}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">
                  Formatos admitidos: .PNG, .JPG, .JPEG, .JPE, .WEBP, .BMP
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Detected Format Context Pill */}
              {imageSrc && (
                <div className="mt-2 p-2 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-amber-400 font-bold rounded">
                      {detectedFormat.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-neutral-300">
                      {currentSpec.isLossy ? 'Con pérdida (DCT)' : 'Sin pérdida (Alfa activo)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Filtro recomendado: {currentSpec.recommendedDespeckle}px
                  </span>
                </div>
              )}
            </div>

            {/* Context Profiles (Tipo de Trabajo Gráfico) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Perfil de Conversión según el Contexto:</span>
                <span className="text-[10px] font-mono text-amber-400">
                  {VECTORIZE_PROFILES.find((p) => p.id === activeProfile)?.badge}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                {VECTORIZE_PROFILES.map((p) => {
                  const isSelected = activeProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProfile(p.id)}
                      className={`p-2 rounded text-left border transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-[11px] font-semibold flex items-center justify-between">
                        <span>{p.badge}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </div>
                      <p className="text-[9.5px] leading-tight text-neutral-400 mt-0.5 line-clamp-2">
                        {p.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inks & Color Separation Controls */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="font-medium">Cantidad de Tintas Spot / Capas:</span>
                  <span className="font-mono text-amber-400 font-bold">{colorCount} tinta(s)</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setColorCount(count)}
                      className={`py-1 text-xs font-mono rounded border transition-colors ${
                        colorCount === count
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {count === 1 ? '1 Tinta' : `${count} Tintas`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  {colorCount === 1
                    ? 'Monocromático para serigrafía directa, corte en vinil o clichés de 1 tinta.'
                    : `Separará la imagen en ${colorCount} capas vectoriales con paleta de tintas spot.`}
                </p>
              </div>

              {/* Threshold Slider (for 1 ink or high contrast) */}
              {colorCount === 1 && (
                <div>
                  <div className="flex justify-between text-neutral-300 mb-1">
                    <span>Umbral de Binarización (Negro/Blanco):</span>
                    <span className="font-mono text-amber-400">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="240"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                    <span>Más fino (10)</span>
                    <span>Medio (128)</span>
                    <span>Más denso (240)</span>
                  </div>
                </div>
              )}

              {/* Smoothness Slider */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Tolerancia Bézier (Suavizado de Aristas):</span>
                  <span className="font-mono text-amber-400">{smoothness}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={smoothness}
                  onChange={(e) => setSmoothness(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Despeckle / Noise filter */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Filtro de Ruido (Supresión de Islas):</span>
                  <span className="font-mono text-amber-400">{despeckle} px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={despeckle}
                  onChange={(e) => setDespeckle(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <span className="text-[9.5px] text-neutral-500">
                  {detectedFormat === 'jpg'
                    ? 'Filtro recomendado para JPG: 4-6 px (elimina artefactos DCT).'
                    : 'Filtro para PNG/BMP: 1-2 px (preserva detalles finos).'}
                </span>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={ignoreWhiteBg}
                    onChange={(e) => setIgnoreWhiteBg(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0"
                  />
                  <span>Omitir Fondo Blanco</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0"
                  />
                  <span>Invertir (Negativo)</span>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Preview & Vector Stats (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Previsualización de Vectorización:</span>
              </span>

              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('vector')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    previewMode === 'vector'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Vector ({previewElements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('original')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    previewMode === 'original'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('split')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    previewMode === 'split'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Comparativa
                </button>
              </div>
            </div>

            {/* Artboard Canvas Preview */}
            <div className="flex-1 min-h-[340px] bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex flex-col items-center justify-center relative overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-10 gap-2">
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                  <span className="text-xs font-mono text-neutral-300">
                    Calculando curvas Bézier y separaciones...
                  </span>
                </div>
              )}

              {imageSrc ? (
                <div className="w-full h-full max-h-[380px] flex items-center justify-center">
                  {previewMode === 'vector' && (
                    <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-white border border-neutral-300 rounded shadow-md flex items-center justify-center overflow-hidden">
                      <svg
                        viewBox={`0 0 ${docWidthMm} ${docHeightMm}`}
                        className="w-full h-full"
                      >
                        {previewElements.map((el) => {
                          if (el.pathData) {
                            return (
                              <path
                                key={el.id}
                                d={el.pathData}
                                fill={el.fill}
                                stroke={el.stroke}
                                strokeWidth={el.strokeWidthMm}
                              />
                            );
                          }
                          return (
                            <rect
                              key={el.id}
                              x={el.x}
                              y={el.y}
                              width={el.width}
                              height={el.height}
                              fill={el.fill}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  {previewMode === 'original' && (
                    <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-neutral-900 border border-neutral-700 rounded shadow-md flex items-center justify-center overflow-hidden p-2">
                      <img
                        src={imageSrc}
                        alt="Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}

                  {previewMode === 'split' && (
                    <div className="grid grid-cols-2 gap-3 w-full max-w-md h-64">
                      <div className="border border-neutral-700 bg-neutral-900 rounded p-1 flex flex-col items-center justify-center overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-400 mb-1 uppercase">
                          Mapa de Bits
                        </span>
                        <img
                          src={imageSrc}
                          alt="Original"
                          className="max-w-full max-h-48 object-contain"
                        />
                      </div>
                      <div className="border border-neutral-700 bg-white rounded p-1 flex flex-col items-center justify-center overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-800 mb-1 uppercase">
                          Vectores
                        </span>
                        <svg
                          viewBox={`0 0 ${docWidthMm} ${docHeightMm}`}
                          className="w-full h-48"
                        >
                          {previewElements.map((el) => (
                            <path
                              key={el.id}
                              d={el.pathData || `M ${el.x} ${el.y} h ${el.width} v ${el.height} h -${el.width} Z`}
                              fill={el.fill}
                              stroke={el.stroke}
                              strokeWidth={el.strokeWidthMm}
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileImage className="w-10 h-10 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    Sube una imagen o pulsa "Cargar Emblema de Muestra" para comenzar.
                  </p>
                </div>
              )}
            </div>

            {/* Generated Inks & Quality Metrics */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Capas de Color:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {generatedInks.map((ink) => (
                    <div
                      key={ink.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] font-mono"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/30"
                        style={{ backgroundColor: ink.hex }}
                      />
                      <span className="text-neutral-300">{ink.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] font-mono text-neutral-400">
                <span className="text-amber-400 font-semibold">{previewElements.length}</span> objetos ·{' '}
                <span className="text-emerald-400 font-semibold">{tracedCount}</span> trazos consolidados
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Curvas optimizadas para pliegos de pre-prensa, mallas de serigrafía o corte por plotter.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={previewElements.length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Insertar Vectores en el Pliego CAD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
