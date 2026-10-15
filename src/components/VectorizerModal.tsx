import React, { useState, useRef, useEffect } from 'react';
import { InkColor, VectorElement } from '../types/prepress';
import { vectorizeImage, VectorizeOptions } from '../utils/vectorizer';
import { X, Upload, Sliders, CheckCircle2, Layers } from 'lucide-react';

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

  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
  }, [initialImageSrc]);
  const [colorCount, setColorCount] = useState<number>(1);
  const [threshold, setThreshold] = useState<number>(128);
  const [smoothness, setSmoothness] = useState<number>(2);
  const [despeckle, setDespeckle] = useState<number>(4);
  const [previewElements, setPreviewElements] = useState<VectorElement[]>([]);
  const [generatedInks, setGeneratedInks] = useState<InkColor[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load sample logo for instant testing
  const loadSampleGraphic = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);

      // Emblem
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(150, 150, 90, 0, Math.PI * 2);
      ctx.fill();

      // Inner star cutout
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(150, 150, 60, 0, Math.PI * 2);
      ctx.fill();

      // Central symbol
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PF', 150, 150);
    }
    const dataUrl = canvas.toDataURL('image/png');
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

  // Re-run vectorization whenever parameters change
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setIsProcessing(true);
      setTimeout(() => {
        const opts: VectorizeOptions = {
          colorCount,
          threshold,
          smoothness,
          despeckle,
        };
        const res = vectorizeImage(img, opts, docWidthMm, docHeightMm);
        setPreviewElements(res.elements);
        setGeneratedInks(res.generatedInks);
        setIsProcessing(false);
      }, 50);
    };
    img.src = imageSrc;
  }, [imageSrc, colorCount, threshold, smoothness, despeckle, docWidthMm, docHeightMm]);

  if (!isOpen) return null;

  const handleApply = () => {
    onVectorized(previewElements, generatedInks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Vectorizador de Imágenes con Separación de Color
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">
                Origen de Imagen:
              </span>
              <button
                onClick={loadSampleGraphic}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Cargar Emblema de Muestra
              </button>
            </div>

            <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/40 transition-colors">
              <Upload className="w-6 h-6 text-neutral-500 mb-1" />
              <span className="text-xs font-medium text-neutral-200">
                Selecciona logotipo o mapa de bits
              </span>
              <span className="text-[10px] text-neutral-500">
                Formatos PNG, JPG, WEBP
              </span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Inks / Separation mode */}
            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Cantidad de Tintas / Capas:</span>
                  <span className="font-mono text-amber-400">{colorCount} tinta(s)</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setColorCount(count)}
                      className={`py-1.5 text-xs font-medium rounded border transition-colors ${
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
                    ? 'Monocromático para serigrafía a 1 tinta, offset directo o vinil de corte.'
                    : `Separará la imagen en ${colorCount} capas vectoriales independientes.`}
                </p>
              </div>

              {/* Threshold Slider (for 1 ink) */}
              {colorCount === 1 && (
                <div>
                  <div className="flex justify-between text-neutral-300 mb-1">
                    <span>Umbral de Binarización:</span>
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
                </div>
              )}

              {/* Smoothness */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Fidelidad de Curvas / Suavizado:</span>
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
                  <span>Filtro de Ruido (Despeckle):</span>
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
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase self-start mb-2">
              Previsualización Vectorizada ({previewElements.length} trazos):
            </span>

            {isProcessing ? (
              <div className="text-xs text-neutral-400 font-mono">Trazando vectores...</div>
            ) : imageSrc ? (
              <div className="relative w-64 h-64 bg-white border border-neutral-300 rounded shadow-inner flex items-center justify-center overflow-hidden">
                <svg
                  viewBox={`0 0 ${docWidthMm} ${docHeightMm}`}
                  className="w-full h-full"
                >
                  {previewElements.map((el) => (
                    <rect
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      fill={el.fill}
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 text-center">
                Sube una imagen o pulsa "Cargar Emblema de Muestra" para vectorizar.
              </div>
            )}

            {generatedInks.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-mono text-neutral-400">Capas de color:</span>
                {generatedInks.map((ink) => (
                  <div
                    key={ink.id}
                    className="w-4 h-4 rounded-xs border border-white/40 shadow-xs"
                    style={{ backgroundColor: ink.hex }}
                    title={ink.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            {previewElements.length} elementos listos para insertar en capas de tinta.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={previewElements.length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 rounded transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Insertar en el Lienzo CAD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
