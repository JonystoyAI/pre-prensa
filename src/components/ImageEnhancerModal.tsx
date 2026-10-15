import React, { useState, useRef, useEffect } from 'react';
import {
  DEFAULT_ENHANCE_OPTIONS,
  EnhanceOptions,
  processImageEnhancement,
} from '../utils/imageEnhancer';
import {
  X,
  Sparkles,
  Sun,
  Contrast,
  Sliders,
  Download,
  CheckCircle2,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';

interface ImageEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToVectorizer: (enhancedDataUrl: string) => void;
  onSendToAI: (enhancedDataUrl: string) => void;
}

export const ImageEnhancerModal: React.FC<ImageEnhancerModalProps> = ({
  isOpen,
  onClose,
  onSendToVectorizer,
  onSendToAI,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<EnhanceOptions>(DEFAULT_ENHANCE_OPTIONS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [splitPosition, setSplitPosition] = useState<number>(50); // % curtain
  const [viewMode, setViewMode] = useState<'split' | 'enhanced' | 'original'>('split');

  const origImgRef = useRef<HTMLImageElement | null>(null);

  // Load sample image of old receipt
  const loadSampleReceipt = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Grayish noisy paper
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 480, 360);

      // Slight paper vignette / shadow
      const grad = ctx.createRadialGradient(240, 180, 50, 240, 180, 260);
      grad.addColorStop(0, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(100,116,139,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 480, 360);

      // Faded text
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('NOTA DE VENTA #4501', 50, 60);

      ctx.font = '13px monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText('CANT  DESCRIPCIÓN             IMPORTE', 50, 110);
      ctx.fillText('10    Placas CTP Heidelberg    $1,850.00', 50, 140);
      ctx.fillText('02    Kilos Tinta Reflex Blue  $  640.00', 50, 170);
      ctx.fillText('01    Marco Serigrafía 120T    $  380.00', 50, 200);

      // Faded signature
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 280);
      ctx.bezierCurveTo(120, 250, 150, 310, 210, 270);
      ctx.stroke();

      ctx.font = '10px sans-serif';
      ctx.fillText('FIRMA DE CONFORMIDAD', 80, 305);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImageSrc(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process image whenever options change
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      origImgRef.current = img;
      setIsProcessing(true);
      setTimeout(() => {
        const outCanvas = processImageEnhancement(img, options);
        setEnhancedUrl(outCanvas.toDataURL('image/png'));
        setIsProcessing(false);
      }, 30);
    };
    img.src = imageSrc;
  }, [imageSrc, options]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Realce de Resolución, Nitidez & Contraste (Pre-Procesador de Imagen)
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">
                Imagen de Entrada:
              </span>
              <button
                onClick={loadSampleReceipt}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Cargar Muestra Borrosa
              </button>
            </div>

            <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg p-3.5 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/40 transition-colors">
              <ImageIcon className="w-6 h-6 text-neutral-500 mb-1" />
              <span className="text-xs font-medium text-neutral-200">
                Selecciona fotografía de nota o ticket
              </span>
              <span className="text-[10px] text-neutral-500">
                JPG, PNG, WEBP tomados con celular
              </span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Filter Adjusters */}
            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-3.5 text-xs">
              {/* Super Resolution Scale */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Aumento de Resolución:</span>
                  <span className="font-mono text-amber-400">{options.scale}× (HD)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([1, 2, 3] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setOptions((prev) => ({ ...prev, scale: sc }))}
                      className={`py-1 text-xs font-medium rounded border transition-colors ${
                        options.scale === sc
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      {sc === 1 ? '1× Normal' : `${sc}× Super-Res`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3.5 h-3.5 text-sky-400" /> Contraste Dinámico:
                  </span>
                  <span className="font-mono text-sky-400">{options.contrast.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.4"
                  step="0.05"
                  value={options.contrast}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, contrast: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-sky-500"
                />
              </div>

              {/* Sharpen / Nitidez */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Máscara de Enfoque (Nitidez):
                  </span>
                  <span className="font-mono text-amber-400">{options.sharpenAmount.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4.5"
                  step="0.1"
                  value={options.sharpenAmount}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, sharpenAmount: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Clean Paper White */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Blanqueador de Fondo (Eliminar Sombras):</span>
                  <span className="font-mono text-emerald-400">+{options.cleanPaperThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={options.cleanPaperThreshold}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      cleanPaperThreshold: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Brightness */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-neutral-400" /> Brillo:
                  </span>
                  <span className="font-mono text-neutral-300">{options.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="40"
                  step="2"
                  value={options.brightness}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                  }
                  className="w-full accent-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Interactive Split-Screen Preview Column */}
          <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex flex-col justify-between min-h-[380px]">
            {/* View Mode Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs">
              <span className="font-mono text-neutral-400 text-[11px]">
                {isProcessing ? 'Procesando convolución...' : 'Comparativa en Tiempo Real:'}
              </span>

              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 text-[11px] rounded ${
                    viewMode === 'split' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                  }`}
                >
                  Antes / Después (Split)
                </button>
                <button
                  onClick={() => setViewMode('enhanced')}
                  className={`px-2.5 py-1 text-[11px] rounded ${
                    viewMode === 'enhanced' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                  }`}
                >
                  Solo Mejorada
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 text-[11px] rounded ${
                    viewMode === 'original' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                  }`}
                >
                  Solo Original
                </button>
              </div>
            </div>

            {/* Split Screen Viewport */}
            <div className="relative flex-1 bg-neutral-900 rounded overflow-hidden flex items-center justify-center min-h-[280px]">
              {imageSrc && enhancedUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  {viewMode === 'original' && (
                    <img src={imageSrc} alt="Original" className="max-h-80 object-contain rounded" />
                  )}

                  {viewMode === 'enhanced' && (
                    <img src={enhancedUrl} alt="Mejorada" className="max-h-80 object-contain rounded shadow-lg" />
                  )}

                  {viewMode === 'split' && (
                    <div className="relative max-h-80 w-full h-full flex items-center justify-center overflow-hidden">
                      {/* Enhanced layer on background */}
                      <img
                        src={enhancedUrl}
                        alt="Mejorada"
                        className="max-h-80 w-auto object-contain absolute"
                      />

                      {/* Original layer clipped by slider */}
                      <div
                        className="absolute inset-0 overflow-hidden flex items-center justify-center"
                        style={{ width: `${splitPosition}%` }}
                      >
                        <img
                          src={imageSrc}
                          alt="Original"
                          className="max-h-80 w-auto object-contain"
                          style={{ minWidth: '100%', maxWidth: 'none' }}
                        />
                      </div>

                      {/* Split divider bar */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-md cursor-ew-resize flex items-center justify-center"
                        style={{ left: `${splitPosition}%` }}
                      >
                        <div className="w-5 h-5 bg-amber-500 text-neutral-950 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md">
                          ↔
                        </div>
                      </div>

                      {/* Label indicators */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[9px] font-mono text-neutral-300">
                        ORIGINAL ({origImgRef.current?.naturalWidth || 480}px)
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-amber-500/90 rounded text-[9px] font-mono font-bold text-neutral-950">
                        SUPER-RES ({Math.round((origImgRef.current?.naturalWidth || 480) * options.scale)}px)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 text-center p-6">
                  Sube una foto o haz clic en "Cargar Muestra Borrosa" para activar el realce.
                </div>
              )}
            </div>

            {/* Split position slider if in split mode */}
            {viewMode === 'split' && imageSrc && (
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <span className="text-[10px] font-mono">Original</span>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-[10px] font-mono text-amber-400">Mejorada</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/70 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            {enhancedUrl ? 'Imagen lista con bordes definidos y fondo blanco puro.' : 'Selecciona una imagen para procesar.'}
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">
              Cerrar
            </button>

            {enhancedUrl && (
              <>
                <button
                  onClick={() => {
                    onSendToVectorizer(enhancedUrl);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  Enviar a Vectorizador
                </button>

                <button
                  onClick={() => {
                    onSendToAI(enhancedUrl);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Enviar a Asistente IA (Visión)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
