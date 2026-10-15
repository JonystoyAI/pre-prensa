import React from 'react';
import { DocumentDimensions, InkColor, VectorElement } from '../types/prepress';
import { STANDARD_FORMATS } from '../utils/prepressCalculations';
import { STANDARD_CMYK_INKS, POPULAR_SPOT_INKS } from '../utils/colorSeparation';
import { X, BookTemplate, Check, FileSpreadsheet } from 'lucide-react';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (doc: DocumentDimensions, elements: VectorElement[], inks: InkColor[]) => void;
}

export const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
}) => {
  if (!isOpen) return null;

  const handleSelectTemplate = (type: 'nota_media_carta' | 'recibo_medio_oficio' | 'remision_vertical' | 'serigrafia_3_tintas') => {
    if (type === 'nota_media_carta') {
      const doc = STANDARD_FORMATS[0]; // Media Carta Apaisada 215.9 x 139.7 mm
      const inks = [STANDARD_CMYK_INKS[3]]; // Black ink only

      const elements: VectorElement[] = [
        {
          id: 't-title',
          type: 'text',
          inkId: inks[0].id,
          x: 14,
          y: 16,
          width: 80,
          height: 10,
          rotationDeg: 0,
          text: 'NOTA DE VENTA',
          fontSizePt: 16,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'bold',
          fill: '#111827',
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 't-subtitle',
          type: 'text',
          inkId: inks[0].id,
          x: 14,
          y: 25,
          width: 120,
          height: 6,
          rotationDeg: 0,
          text: 'COMERCIAL & PAPELERÍA INDUSTRIAL · TEL: (55) 5555-0199',
          fontSizePt: 8,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'normal',
          fill: '#374151',
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 't-folio',
          type: 'folio',
          inkId: inks[0].id,
          x: 160,
          y: 14,
          width: 42,
          height: 14,
          rotationDeg: 0,
          folioPrefix: 'N° A-',
          folioStartNumber: 250,
          folioDigits: 6,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: '#dc2626',
          strokeWidthMm: 0.35,
        },
        {
          id: 't-client',
          type: 'text',
          inkId: inks[0].id,
          x: 14,
          y: 35,
          width: 180,
          height: 7,
          rotationDeg: 0,
          text: 'Cliente: _____________________________________ Fecha: ____/____/2026',
          fontSizePt: 9.5,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'normal',
          fill: '#1f2937',
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 't-rulings',
          type: 'rulings',
          inkId: inks[0].id,
          x: 14,
          y: 46,
          width: 188,
          height: 64,
          rotationDeg: 0,
          rowCount: 8,
          rowSpacingMm: 8.0,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: '#1e293b',
          strokeWidthMm: 0.25,
        },
        {
          id: 't-wm',
          type: 'watermark',
          inkId: inks[0].id,
          x: 60,
          y: 78,
          width: 90,
          height: 30,
          rotationDeg: -12,
          text: 'ORIGINAL',
          fontSizePt: 40,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'bold',
          fill: '#000000',
          fillOpacity: 0.06, // strictly 6% safe watermark
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 't-legal',
          type: 'text',
          inkId: inks[0].id,
          x: 14,
          y: 128,
          width: 180,
          height: 6,
          rotationDeg: 0,
          text: '* Debo y pagaré a la orden del beneficiario en la fecha señalada.',
          fontSizePt: 7,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'normal',
          fill: '#4b5563',
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
      ];

      onLoadTemplate(doc, elements, inks);
      onClose();
    } else if (type === 'recibo_medio_oficio') {
      const doc = STANDARD_FORMATS[2]; // Medio Oficio Apaisado 215.9 x 170 mm
      const spotBlue = POPULAR_SPOT_INKS[1]; // Pantone Reflex Blue
      const spotRed = POPULAR_SPOT_INKS[0]; // Pantone Warm Red
      const inks = [spotBlue, spotRed];

      const elements: VectorElement[] = [
        {
          id: 'r-title',
          type: 'text',
          inkId: spotBlue.id,
          x: 16,
          y: 18,
          width: 90,
          height: 10,
          rotationDeg: 0,
          text: 'RECIBO DE CAJA / COBRANZA',
          fontSizePt: 16,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'bold',
          fill: spotBlue.hex,
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 'r-folio',
          type: 'folio',
          inkId: spotRed.id,
          x: 156,
          y: 16,
          width: 44,
          height: 14,
          rotationDeg: 0,
          folioPrefix: 'REC-',
          folioStartNumber: 501,
          folioDigits: 6,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: spotRed.hex,
          strokeWidthMm: 0.35,
        },
        {
          id: 'r-box-amount',
          type: 'rect',
          inkId: spotBlue.id,
          x: 16,
          y: 34,
          width: 184,
          height: 24,
          rotationDeg: 0,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: spotBlue.hex,
          strokeWidthMm: 0.35,
        },
        {
          id: 'r-txt-amount',
          type: 'text',
          inkId: spotBlue.id,
          x: 20,
          y: 44,
          width: 170,
          height: 8,
          rotationDeg: 0,
          text: 'Bueno por: $ ________________ MXN',
          fontSizePt: 12,
          fontFamily: 'JetBrains Mono',
          fontWeight: 'bold',
          fill: spotBlue.hex,
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
        {
          id: 'r-rulings',
          type: 'rulings',
          inkId: spotBlue.id,
          x: 16,
          y: 68,
          width: 184,
          height: 56,
          rotationDeg: 0,
          rowCount: 6,
          rowSpacingMm: 9.0,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: spotBlue.hex,
          strokeWidthMm: 0.25,
        },
        {
          id: 'r-wm',
          type: 'watermark',
          inkId: spotBlue.id,
          x: 55,
          y: 96,
          width: 100,
          height: 30,
          rotationDeg: -10,
          text: 'PAGADO',
          fontSizePt: 42,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'bold',
          fill: spotBlue.hex,
          fillOpacity: 0.05,
          stroke: 'none',
          strokeWidthMm: 0,
        },
      ];

      onLoadTemplate(doc, elements, inks);
      onClose();
    } else if (type === 'serigrafia_3_tintas') {
      const doc = STANDARD_FORMATS[0];
      const spotGold = POPULAR_SPOT_INKS[3];
      const spotRed = POPULAR_SPOT_INKS[0];
      const spotBlue = POPULAR_SPOT_INKS[1];
      const inks = [spotGold, spotRed, spotBlue];

      const elements: VectorElement[] = [
        {
          id: 'sg-circle-outer',
          type: 'circle',
          inkId: spotBlue.id,
          x: 75,
          y: 35,
          width: 65,
          height: 65,
          rotationDeg: 0,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: spotBlue.hex,
          strokeWidthMm: 1.2,
        },
        {
          id: 'sg-circle-inner',
          type: 'circle',
          inkId: spotGold.id,
          x: 85,
          y: 45,
          width: 45,
          height: 45,
          rotationDeg: 0,
          fill: 'none',
          fillOpacity: 1.0,
          stroke: spotGold.hex,
          strokeWidthMm: 0.8,
        },
        {
          id: 'sg-text',
          type: 'text',
          inkId: spotRed.id,
          x: 88,
          y: 72,
          width: 40,
          height: 8,
          rotationDeg: 0,
          text: 'PRESS',
          fontSizePt: 16,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 'bold',
          fill: spotRed.hex,
          fillOpacity: 1.0,
          stroke: 'none',
          strokeWidthMm: 0,
        },
      ];

      onLoadTemplate(doc, elements, inks);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-xl w-full p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <BookTemplate className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Plantillas de Imprenta Comercial & Taller
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          Selecciona un formato pre-diseñado con pinzas mecánicas de 0.8 cm, marcas de agua al 6% y folios secuenciales:
        </p>

        {/* Templates list */}
        <div className="space-y-3">
          <button
            onClick={() => handleSelectTemplate('nota_media_carta')}
            className="w-full text-left p-3.5 rounded-lg border border-neutral-800 hover:border-amber-500/60 bg-neutral-950/60 hover:bg-neutral-900 transition-all flex items-start justify-between group"
          >
            <div className="space-y-1">
              <strong className="text-xs text-white group-hover:text-amber-400 transition-colors block">
                Nota de Venta Estándar (Media Carta · 1 Tinta Negra)
              </strong>
              <p className="text-[11px] text-neutral-400">
                Formato apaisado de 21.5 × 14 cm, caja de folio N° rojo, 8 renglones, marca de agua segura al 6% y pagaré legal.
              </p>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase shrink-0 ml-3">
              1 Tinta Offset
            </span>
          </button>

          <button
            onClick={() => handleSelectTemplate('recibo_medio_oficio')}
            className="w-full text-left p-3.5 rounded-lg border border-neutral-800 hover:border-amber-500/60 bg-neutral-950/60 hover:bg-neutral-900 transition-all flex items-start justify-between group"
          >
            <div className="space-y-1">
              <strong className="text-xs text-white group-hover:text-amber-400 transition-colors block">
                Recibo de Cobranza / Caja (Medio Oficio · 2 Tintas Spot)
              </strong>
              <p className="text-[11px] text-neutral-400">
                Formato de 21.5 × 17 cm en Pantone Reflex Blue y Warm Red con campo numérico de importe y marca de agua al 5%.
              </p>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase shrink-0 ml-3">
              2 Tintas Spot
            </span>
          </button>

          <button
            onClick={() => handleSelectTemplate('serigrafia_3_tintas')}
            className="w-full text-left p-3.5 rounded-lg border border-neutral-800 hover:border-amber-500/60 bg-neutral-950/60 hover:bg-neutral-900 transition-all flex items-start justify-between group"
          >
            <div className="space-y-1">
              <strong className="text-xs text-white group-hover:text-amber-400 transition-colors block">
                Emblema de Serigrafía Textil (3 Tintas Spot)
              </strong>
              <p className="text-[11px] text-neutral-400">
                Diseño concéntrico separado en 3 marcos (Oro 871, Rojo Cálido y Azul Marino) con cruces de registro.
              </p>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase shrink-0 ml-3">
              3 Tintas Malla
            </span>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-neutral-400 hover:text-white">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
