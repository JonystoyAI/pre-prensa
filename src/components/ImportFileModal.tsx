import React, { useState, useRef } from 'react';
import { InkColor, VectorElement, DocumentDimensions } from '../types/prepress';
import { parseUploadedFile, ParseResult } from '../utils/vectorFileParsers';
import {
  X,
  Upload,
  FileCode,
  FileImage,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ImportFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentDimensions;
  setDocument: (doc: DocumentDimensions) => void;
  inks: InkColor[];
  setInks: React.Dispatch<React.SetStateAction<InkColor[]>>;
  onImportVectorElements: (elements: VectorElement[], detectedInks: InkColor[], replaceAll: boolean) => void;
  onOpenVectorizerWithImage: (imageSrc: string, fileName: string) => void;
}

export const ImportFileModal: React.FC<ImportFileModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  setDocument,
  inks,
  setInks,
  onImportVectorElements,
  onOpenVectorizerWithImage,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [replaceCanvas, setReplaceCanvas] = useState<boolean>(false);
  const [adjustArtboardSize, setAdjustArtboardSize] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setParseResult(null);

    try {
      const res = await parseUploadedFile(file, doc.widthMm, doc.heightMm, inks);
      setParseResult(res);

      // If it's a bitmap image, forward directly to Vectorizer if user clicks or can route automatically
      if (res.format === 'image' && res.previewImageSrc) {
        // We let user see the preview and click "Vectorizar con Contexto"
      }
    } catch (err: any) {
      setParseResult({
        success: false,
        format: 'unknown',
        elements: [],
        detectedInks: inks,
        fileName: file.name,
        fileSizeBytes: file.size,
        message: `Error al leer archivo: ${err.message}`,
        warnings: [err.message],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  // Sample files for instant testing
  const loadSampleEps = () => {
    const sampleEps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 200 200
%%Pages: 1
0.0 0.85 0.75 0.0 setcmykcolor
newpath 50 50 100 100 rectfill
1.0 0.0 0.0 0.0 setcmykcolor
newpath 100 100 40 0 360 arc fill
%%EOF`;
    const blob = new Blob([sampleEps], { type: 'application/postscript' });
    const file = new File([blob], 'muestra_emblema_imprenta.eps', { type: 'application/postscript' });
    handleProcessFile(file);
  };

  const loadSampleSvg = () => {
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160mm" height="120mm">
  <rect x="10" y="10" width="140" height="100" fill="#1e293b" />
  <circle cx="80" cy="60" r="35" fill="#f59e0b" />
  <path d="M 50 60 L 80 30 L 110 60 L 80 90 Z" fill="#ffffff" />
</svg>`;
    const blob = new Blob([sampleSvg], { type: 'image/svg+xml' });
    const file = new File([blob], 'logotipo_vectorial_muestra.svg', { type: 'image/svg+xml' });
    handleProcessFile(file);
  };

  const handleConfirmImport = () => {
    if (!parseResult) return;

    if (parseResult.format === 'image' && parseResult.previewImageSrc) {
      onOpenVectorizerWithImage(parseResult.previewImageSrc, parseResult.fileName);
      onClose();
      return;
    }

    if (parseResult.elements.length > 0) {
      // Optional: adjust artboard size if dimensions detected
      if (adjustArtboardSize && parseResult.originalDimensions) {
        setDocument({
          ...doc,
          widthMm: parseResult.originalDimensions.widthMm,
          heightMm: parseResult.originalDimensions.heightMm,
        });
      }

      onImportVectorElements(parseResult.elements, parseResult.detectedInks, replaceCanvas);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center">
              <Upload className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Importar Archivo Gráfico (Vectores & Mapas de Bits)
              </h2>
              <p className="text-[11px] text-neutral-400">
                Soporte para .EPS, .AI, .CDR, .PDF, .SVG, .JSON e imágenes para vectorización (.PNG, .JPG, .WEBP)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Format Badges & Samples */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase text-neutral-400 mr-1">Vectores:</span>
              {['.SVG', '.EPS', '.AI', '.CDR', '.PDF', '.JSON'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono text-[10px] text-amber-400 font-bold"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-[10px] font-mono uppercase text-neutral-400 ml-2 mr-1">Imágenes:</span>
              {['.PNG', '.JPG', '.JPEG', '.WEBP', '.BMP'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono text-[10px] text-sky-400"
                >
                  {fmt}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500">Muestras:</span>
              <button
                type="button"
                onClick={loadSampleEps}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                Muestra EPS
              </button>
              <span className="text-neutral-700">·</span>
              <button
                type="button"
                onClick={loadSampleSvg}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                Muestra SVG
              </button>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-neutral-700 hover:border-amber-500/60 bg-neutral-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.eps,.ai,.cdr,.pdf,.json,image/png,image/jpeg,image/jpg,image/webp,image/bmp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <Upload className="w-10 h-10 text-neutral-500 mb-2" />
            <p className="text-sm font-semibold text-neutral-200">
              Arrastra aquí tu archivo o haz clic para explorar
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Archivos vectoriales (.ai, .eps, .cdr, .pdf, .svg) para editar o imágenes (.png, .jpg, .webp) para vectorizar
            </p>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-4 bg-neutral-950 rounded border border-neutral-800 text-center text-xs text-neutral-300 font-mono">
              Procesando y analizando estructura de vectores / mapas de bits...
            </div>
          )}

          {/* Parse Result Summary Card */}
          {parseResult && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-3 ${
                parseResult.success
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                  : 'bg-red-950/20 border-red-800/60 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {parseResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-semibold text-sm text-white">
                    {parseResult.fileName}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-amber-400 rounded uppercase font-bold">
                    Formato: {parseResult.format.toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">
                  {(parseResult.fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>

              <p className="text-xs text-neutral-300">{parseResult.message}</p>

              {/* If Raster Image: Show Vectorizer Prompt */}
              {parseResult.format === 'image' && parseResult.previewImageSrc && (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={parseResult.previewImageSrc}
                      alt="Vista previa"
                      className="w-14 h-14 object-contain rounded bg-neutral-950 border border-neutral-700 p-1"
                    />
                    <div>
                      <span className="font-semibold text-neutral-100 block">
                        Imagen lista para vectorización
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        Se abrirá el asistente de conversión con la lista de contexto de formato para calibrar umbral y separación de tintas.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Vectorizar con Contexto</span>
                  </button>
                </div>
              )}

              {/* If Vector: Show Stats & Options */}
              {parseResult.format !== 'image' && parseResult.elements.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                      <span className="text-neutral-500 block text-[9.5px]">Trazos Vectoriales:</span>
                      <span className="text-amber-400 font-bold text-sm">
                        {parseResult.elements.length}
                      </span>
                    </div>
                    <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                      <span className="text-neutral-500 block text-[9.5px]">Capas de Color:</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {parseResult.detectedInks.length}
                      </span>
                    </div>
                    <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                      <span className="text-neutral-500 block text-[9.5px]">Dimensiones Nativas:</span>
                      <span className="text-neutral-200 font-bold text-sm">
                        {parseResult.originalDimensions
                          ? `${parseResult.originalDimensions.widthMm} × ${parseResult.originalDimensions.heightMm} mm`
                          : 'Ajustadas al Pliego'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[11px] text-neutral-400">
                    <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                      <input
                        type="checkbox"
                        checked={replaceCanvas}
                        onChange={(e) => setReplaceCanvas(e.target.checked)}
                        className="rounded bg-neutral-900 border-neutral-700 text-amber-500"
                      />
                      <span>Reemplazar pliego actual (borrar elementos existentes)</span>
                    </label>

                    {parseResult.originalDimensions && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                        <input
                          type="checkbox"
                          checked={adjustArtboardSize}
                          onChange={(e) => setAdjustArtboardSize(e.target.checked)}
                          className="rounded bg-neutral-900 border-neutral-700 text-amber-500"
                        />
                        <span>Ajustar tamaño del pliego al archivo ({parseResult.originalDimensions.widthMm}x{parseResult.originalDimensions.heightMm}mm)</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Table of Formats */}
          <div className="border border-neutral-800 rounded-lg overflow-hidden text-xs">
            <div className="px-3 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Capacidades de Edición y Guardado por Formato</span>
            </div>
            <div className="divide-y divide-neutral-800/80 bg-neutral-900/50">
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400">.SVG</span>
                  <span className="text-neutral-300 ml-2">Vector Universal</span>
                </div>
                <span className="text-neutral-400 text-[11px]">
                  Importa y exporta curvas Bézier, estilos y capas separadas.
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400">.EPS</span>
                  <span className="text-neutral-300 ml-2">Encapsulated PostScript</span>
                </div>
                <span className="text-neutral-400 text-[11px]">
                  Importa operadores PostScript con CMYK nativo; exporta EPS Nivel 3.
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400">.AI</span>
                  <span className="text-neutral-300 ml-2">Adobe Illustrator</span>
                </div>
                <span className="text-neutral-400 text-[11px]">
                  Importa curvas y mesas de trabajo; exporta compatible Illustrator 8/PDF.
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400">.CDR</span>
                  <span className="text-neutral-300 ml-2">CorelDRAW</span>
                </div>
                <span className="text-neutral-400 text-[11px]">
                  Importa estructuras de curvas y pliegos de intercambio Corel.
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400">.PDF</span>
                  <span className="text-neutral-300 ml-2">PDF Pre-Prensa</span>
                </div>
                <span className="text-neutral-400 text-[11px]">
                  Importa flujos vectoriales; exporta PDF de imprenta con marcas y curvas.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>

          {parseResult?.format !== 'image' && (
            <button
              onClick={handleConfirmImport}
              disabled={!parseResult || !parseResult.success || parseResult.elements.length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cargar en el Lienzo CAD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
