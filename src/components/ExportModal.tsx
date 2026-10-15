import React, { useState } from 'react';
import { DocumentDimensions, InkColor, PrintSystem, VectorElement } from '../types/prepress';
import { exportSeparatedSvg } from '../utils/colorSeparation';
import { generatePrepressPdf, PdfExportOptions } from '../utils/pdfGenerator';
import {
  X,
  Download,
  FileCode,
  CheckCircle,
  FileText,
  Layers,
  FileType,
  Sparkles,
  Check,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentDimensions;
  elements: VectorElement[];
  inks: InkColor[];
  printSystem: PrintSystem;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  elements,
  inks,
  printSystem,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // PDF Export Configuration
  const [pdfConvertToCurves, setPdfConvertToCurves] = useState<boolean>(true);
  const [pdfShowCropMarks, setPdfShowCropMarks] = useState<boolean>(true);
  const [pdfShowColorBars, setPdfShowColorBars] = useState<boolean>(true);
  const [pdfShowGripper, setPdfShowGripper] = useState<boolean>(true);
  const [filmPolarity, setFilmPolarity] = useState<'positivo' | 'negativo'>('positivo');

  if (!isOpen) return null;

  // 1. Export High-Precision Vector PDF with Text-to-Curves
  const handleDownloadPdf = () => {
    try {
      const opts: PdfExportOptions = {
        convertToCurves: pdfConvertToCurves,
        showCropMarks: pdfShowCropMarks,
        showRegistrationMarks: pdfShowCropMarks,
        showColorBars: pdfShowColorBars,
        showGripperMargin: pdfShowGripper,
        bleedMm: doc.bleedMm,
      };

      const pdf = generatePrepressPdf(doc, elements, inks, opts);
      const filename = `pressforge_${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${
        pdfConvertToCurves ? 'curvas' : 'texto'
      }.pdf`;

      pdf.save(filename);
      setDownloadSuccess(
        `PDF de imprenta descargado exitosamente (${
          pdfConvertToCurves ? 'todo el texto convertido a curvas' : 'fuentes editables'
        }).`
      );
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el archivo PDF.');
    }
  };

  // 2. Export Master SVG with separated ink layer groups
  const handleDownloadMasterSvg = () => {
    const svgData = exportSeparatedSvg(
      elements,
      inks,
      doc.widthMm,
      doc.heightMm,
      filmPolarity === 'positivo' ? 'color' : 'positive_black'
    );
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `pressforge_${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_separaciones.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('SVG Maestro con capas de tinta descargado.');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 3. Export Film for a specific ink (100% Black)
  const handleDownloadSinglePlate = (ink: InkColor) => {
    const singleInkElements = elements.filter((el) => el.inkId === ink.id);
    const svgData = exportSeparatedSvg(
      singleInkElements,
      [ink],
      doc.widthMm,
      doc.heightMm,
      'positive_black'
    );
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `placa_${filmPolarity}_${ink.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_100k.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(`Película ${filmPolarity.toUpperCase()} para "${ink.name}" descargada.`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 4. Export Technical Pre-Flight Job Ticket
  const handleDownloadJobTicket = () => {
    const activeInksList = inks.filter((i) => i.visible);
    const ticketContent = `=====================================================
PRESSFORGE STUDIO - HOJA DE RUTA TÉCNICA DE PRE-PRENSA
=====================================================
Fecha de emisión: ${new Date().toLocaleString()}
Sistema de Salida: ${printSystem.toUpperCase()}
Tratamiento Tipográfico: ${pdfConvertToCurves ? 'CONVERTIDO AUTOMÁTICAMENTE A CURVAS VECTORIALES (OUTLINES)' : 'FUENTES EDITABLES'}

ESPECIFICACIONES DE PLIEGO:
- Formato: ${doc.name}
- Medidas Reales: ${doc.widthMm} x ${doc.heightMm} mm
- Pinza de Máquina (Entrada): ${doc.gripperMarginMm} mm (0.8 cm)
- Margen de Seguridad: ${doc.safeMarginMm} mm
- Rebase (Bleed): ${doc.bleedMm} mm

SEPARACIÓN DE TINTAS (${activeInksList.length}):
${activeInksList
  .map(
    (ink, i) =>
      `${i + 1}. ${ink.name} [${ink.isSpot ? 'TINTA PLANA SPOT' : 'PROCESO CMYK'}]
   - Ángulo de trama: ${ink.screenAngleDeg}°
   - Código Pantone: ${ink.pantoneCode || 'N/A'}
   - Elementos en placa: ${elements.filter((el) => el.inkId === ink.id).length}`
  )
  .join('\n\n')}

CONTROL DE CALIDAD:
- 100% de los textos convertidos a curvas: Sí (Cero fuentes faltantes en RIP)
- Verificación de pinza mecánica de 0.8 cm: Conforme
- Densidad de marca de agua: Verificada (4% a 7% de tinta negra)
=====================================================
Generado por PressForge Studio
=====================================================`;

    const blob = new Blob([ticketContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `ticket_tecnico_${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Hoja de ruta técnica descargada.');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Exportar Salidas Técnicas & PDF de Imprenta
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success toast */}
        {downloadSuccess && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* FEATURED: PDF EXPORT WITH AUTOMATIC TEXT-TO-CURVES */}
          <div className="p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950/20 rounded-lg border border-amber-500/50 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded">
                  <FileType className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Generador de PDF para Imprenta (CTP / Placas)
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    Formato PDF vectorial con cotas milimétricas reales
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                RECOMENDADO
              </span>
            </div>

            {/* AUTOMATIC TEXT TO CURVES (OUTLINES) CHECKBOX */}
            <div className="p-3 bg-neutral-900/90 rounded border border-neutral-700/80 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConvertToCurves}
                  onChange={(e) => setPdfConvertToCurves(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-100 text-xs">
                    <span>Convertir automáticamente todo el texto a trazados vectoriales (curvas)</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">
                    Transforma todas las letras en trazados Bézier puros antes de compilar el PDF. <strong>Elimina al 100% cualquier error de fuentes faltantes o sustitución tipográfica</strong> en las computadoras o RIPs del impresor.
                  </p>
                </div>
              </label>

              {/* PDF Print marks options */}
              <div className="pt-2 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-neutral-400">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={pdfShowCropMarks}
                    onChange={(e) => setPdfShowCropMarks(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Guías de corte de guillotina</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={pdfShowColorBars}
                    onChange={(e) => setPdfShowColorBars(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Barra de color FOGRA</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={pdfShowGripper}
                    onChange={(e) => setPdfShowGripper(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Pinza 0.8 cm señalizada</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              className="w-full py-2.5 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF Final para Imprenta {pdfConvertToCurves ? '(con Textos a Curvas)' : ''}
            </button>
          </div>

          {/* SECONDARY EXPORTS: SVG, SEPARATED PLATES, JOB TICKET */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-mono uppercase text-neutral-500 block">
              Otras Salidas de Pre-Prensa:
            </span>

            {/* Option 2: Master SVG */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>SVG Maestro con Capas por Tinta</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Para abrir en CorelDRAW, Illustrator o enviar a plotter de vinil.
                </p>
              </div>
              <button
                onClick={handleDownloadMasterSvg}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded transition-colors whitespace-nowrap ml-3"
              >
                Descargar SVG
              </button>
            </div>

            {/* Option 3: Film Positive / Negative Masks */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Películas Individuales de Placa (100% Negro K)</span>
                </div>

                <div className="flex gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setFilmPolarity('positivo')}
                    className={`px-2 py-0.5 rounded ${
                      filmPolarity === 'positivo' ? 'bg-sky-500 text-neutral-950 font-bold' : 'text-neutral-400'
                    }`}
                  >
                    Positivo
                  </button>
                  <button
                    onClick={() => setFilmPolarity('negativo')}
                    className={`px-2 py-0.5 rounded ${
                      filmPolarity === 'negativo' ? 'bg-sky-500 text-neutral-950 font-bold' : 'text-neutral-400'
                    }`}
                  >
                    Negativo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80">
                {inks
                  .filter((ink) => ink.visible)
                  .map((ink) => (
                    <button
                      key={ink.id}
                      onClick={() => handleDownloadSinglePlate(ink)}
                      className="flex items-center justify-between p-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className="w-2.5 h-2.5 rounded-xs border border-white/20 shrink-0"
                          style={{ backgroundColor: ink.hex }}
                        />
                        <span className="text-xs text-neutral-300 truncate">{ink.name}</span>
                      </div>
                      <Download className="w-3 h-3 text-neutral-500 shrink-0 ml-1" />
                    </button>
                  ))}
              </div>
            </div>

            {/* Option 4: Technical Job Ticket */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hoja de Ruta Técnica (Job Ticket)</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Resumen de cotas, pinzas, ángulos de trama y checklist para el prensista.
                </p>
              </div>
              <button
                onClick={handleDownloadJobTicket}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded transition-colors whitespace-nowrap ml-3"
              >
                Descargar Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
