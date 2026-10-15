import React, { useState, useMemo } from 'react';
import { DocumentDimensions, InkColor, VectorElement } from '../types/prepress';
import { MM_TO_PX } from '../utils/prepressCalculations';
import { exportSeparatedSvg } from '../utils/colorSeparation';
import {
  calculateMultiCardImposition,
  calculateEditorialImposition,
  calculateFlexoDistortion,
  generateDynamicColorBarPatches,
  FoldGuideLine,
  PaperWasteMetrics,
} from '../utils/impositionCalculations';
import {
  Download,
  Sliders,
  Check,
  BookOpen,
  ArrowUp,
  Gauge,
  Grid,
  Scissors,
  Crosshair,
  Palette,
  FoldHorizontal,
  TrendingDown,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Percent,
} from 'lucide-react';

interface ImpositionViewProps {
  document: DocumentDimensions;
  elements: VectorElement[];
  inks: InkColor[];
}

export const ImpositionView: React.FC<ImpositionViewProps> = ({
  document: doc,
  elements,
  inks,
}) => {
  // Main Category Mode: Multi-Card Imposition (4, 6, 8 cartas), Editorial Booklets, or Continuous Cylinder
  const [impositionCategory, setImpositionCategory] = useState<
    'multicard' | 'editorial' | 'cilindro_flexo'
  >('multicard');

  // Multi-Card Scheme (4, 6, 8 cartas)
  const [cardCount, setCardCount] = useState<4 | 6 | 8>(8);
  const [orientationMode, setOrientationMode] = useState<
    'cabeza_con_cabeza' | 'pie_con_pie' | 'normal'
  >('cabeza_con_cabeza');
  const [gutterMm, setGutterMm] = useState<number>(4.0);
  const [gripperMarginMm, setGripperMarginMm] = useState<number>(8.0);

  // Dynamic Industry Marks Toggles
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [showFoldMarks, setShowFoldMarks] = useState<boolean>(true);
  const [showRegMarks, setShowRegMarks] = useState<boolean>(true);
  const [showColorBar, setShowColorBar] = useState<boolean>(true);
  const [colorBarPosition, setColorBarPosition] = useState<
    'bottom' | 'top' | 'left'
  >('bottom');

  // Editorial Booklet Scheme & Controls
  const [editorialScheme, setEditorialScheme] = useState<
    '4_paginas_folleto' | '8_paginas_cuadernillo'
  >('8_paginas_cuadernillo');
  const [plateSide, setPlateSide] = useState<'tiro' | 'retiro'>('tiro');
  const [totalBookPages, setTotalBookPages] = useState<number>(16);

  // Flexo / Rotogravure Cylinder Controls
  const [cylinderRepeatMm, setCylinderRepeatMm] = useState<number>(380);
  const [plateThicknessMm, setPlateThicknessMm] = useState<number>(1.14);
  const [cushionThicknessMm, setCushionThicknessMm] = useState<number>(0.5);

  // Compute Multi-Card Layout (4, 6, 8 cartas)
  const multiCardLayout = calculateMultiCardImposition(
    cardCount,
    doc.widthMm,
    doc.heightMm,
    orientationMode,
    gutterMm,
    gripperMarginMm
  );

  // Compute Editorial Layout
  const editorialLayout = calculateEditorialImposition(
    editorialScheme,
    doc.widthMm,
    doc.heightMm,
    orientationMode === 'normal' ? 'cabeza_con_cabeza' : orientationMode,
    totalBookPages
  );

  // Compute Flexo Distortion
  const flexoDistortion = calculateFlexoDistortion(
    cylinderRepeatMm,
    plateThicknessMm,
    cushionThicknessMm
  );

  // Dynamic Color Bar Patches (CMYK + Active Spot/Pantone Inks)
  const dynamicColorPatches = useMemo(() => {
    return generateDynamicColorBarPatches(inks);
  }, [inks]);

  // Active sheet dimensions
  let parentW = multiCardLayout.sheetWidthMm;
  let parentH = multiCardLayout.sheetHeightMm;
  let activeSheetTitle = `Pliego de ${cardCount} Cartas (${multiCardLayout.columns} × ${multiCardLayout.rows})`;

  if (impositionCategory === 'editorial') {
    parentW = editorialLayout.sheetWidthMm;
    parentH = editorialLayout.sheetHeightMm;
    activeSheetTitle = `Signatura Editorial (${
      editorialScheme === '4_paginas_folleto' ? '4 Págs' : '8 Págs'
    })`;
  } else if (impositionCategory === 'cilindro_flexo') {
    parentW = 320;
    parentH = flexoDistortion.reducedLengthMm;
    activeSheetTitle = `Cilindro Continuo Rotativo (${cylinderRepeatMm} mm repetición)`;
  }

  // Active Waste Metrics & Active Fold Guides
  const activeWasteMetrics: PaperWasteMetrics =
    impositionCategory === 'multicard'
      ? multiCardLayout.wasteMetrics
      : editorialLayout.wasteMetrics;

  const activeFoldGuides: FoldGuideLine[] =
    impositionCategory === 'multicard'
      ? multiCardLayout.foldGuides
      : editorialLayout.foldGuides;

  // Count active marks
  const activeMarksCount = [
    showCropMarks,
    showRegMarks,
    showColorBar,
    showFoldMarks,
  ].filter(Boolean).length;

  const toggleAllMarks = (enable: boolean) => {
    setShowCropMarks(enable);
    setShowRegMarks(enable);
    setShowColorBar(enable);
    setShowFoldMarks(enable);
  };

  // Export Imposition Plate SVG with dynamic marks & fold lines embedded
  const handleExportPlateSvg = () => {
    const impositionElements: VectorElement[] = [];

    const slots =
      impositionCategory === 'multicard'
        ? multiCardLayout.slots
        : plateSide === 'tiro'
        ? editorialLayout.tiroSlots
        : editorialLayout.retiroSlots;

    slots.forEach((slot) => {
      elements.forEach((el) => {
        impositionElements.push({
          ...el,
          id: `imp-${slot.pageNumber}-${el.id}`,
          x: slot.x + el.x,
          y: slot.y + el.y,
          rotationDeg: slot.rotationDeg,
        });
      });
    });

    let svgString = exportSeparatedSvg(
      impositionElements,
      inks,
      parentW,
      parentH,
      'color'
    );

    // Inject toggled technical marks into the SVG before closing tag </svg>
    let injectedMarksSvg = '';

    // 1. Guillotine Crop Marks
    if (showCropMarks && impositionCategory === 'multicard') {
      injectedMarksSvg += '<g id="guias-corte-guillotina" stroke="#000000" stroke-width="0.35">';
      multiCardLayout.cropMarks.forEach((m) => {
        injectedMarksSvg += `<line x1="${(m.x1 * MM_TO_PX).toFixed(1)}" y1="${(m.y1 * MM_TO_PX).toFixed(1)}" x2="${(m.x2 * MM_TO_PX).toFixed(1)}" y2="${(m.y2 * MM_TO_PX).toFixed(1)}" />`;
      });
      injectedMarksSvg += '</g>';
    }

    // 2. Automatic Fold Guides (Dotted lines across folding axes)
    if (showFoldMarks && activeFoldGuides.length > 0) {
      injectedMarksSvg += '<g id="guias-plegado-postprensa" stroke="#d97706" stroke-width="0.5" stroke-dasharray="4,3">';
      activeFoldGuides.forEach((g) => {
        injectedMarksSvg += `<line x1="${(g.x1 * MM_TO_PX).toFixed(1)}" y1="${(g.y1 * MM_TO_PX).toFixed(1)}" x2="${(g.x2 * MM_TO_PX).toFixed(1)}" y2="${(g.y2 * MM_TO_PX).toFixed(1)}" />`;
      });
      injectedMarksSvg += '</g>';
    }

    // 3. Concentric Registration Crosses
    if (showRegMarks && impositionCategory === 'multicard') {
      injectedMarksSvg += '<g id="cruces-registro-concentric">';
      multiCardLayout.registrationMarks.forEach((reg) => {
        const cx = (reg.x * MM_TO_PX).toFixed(1);
        const cy = (reg.y * MM_TO_PX).toFixed(1);
        injectedMarksSvg += `
          <g transform="translate(${cx}, ${cy})">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#000000" stroke-width="0.5" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#000000" stroke-width="0.5" />
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#000000" stroke-width="0.5" />
            <line x1="0" y1="-20" x2="0" y2="20" stroke="#000000" stroke-width="0.5" />
          </g>`;
      });
      injectedMarksSvg += '</g>';
    }

    // 4. Dynamic Color Control Bar
    if (showColorBar && dynamicColorPatches.length > 0) {
      const barY =
        colorBarPosition === 'top'
          ? (gripperMarginMm + 1) * MM_TO_PX
          : (parentH - 7) * MM_TO_PX;
      const barH = 5 * MM_TO_PX;
      const patchW = (parentW * MM_TO_PX - 20) / dynamicColorPatches.length;

      injectedMarksSvg += `<g id="barra-control-color-dinamica" transform="translate(10, ${barY.toFixed(1)})">`;
      dynamicColorPatches.forEach((patch, idx) => {
        injectedMarksSvg += `<rect x="${(idx * patchW).toFixed(1)}" y="0" width="${patchW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${patch.hex}" stroke="#999" stroke-width="0.25" />`;
      });
      injectedMarksSvg += '</g>';
    }

    if (injectedMarksSvg) {
      svgString = svgString.replace('</svg>', `${injectedMarksSvg}</svg>`);
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `placa_${impositionCategory}_${cardCount}_cartas_${orientationMode}_con_marcas.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewScale = Math.min(1.0, 520 / (parentH * MM_TO_PX));

  return (
    <div className="flex-1 h-full bg-neutral-950 text-neutral-100 overflow-y-auto p-6 flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h1 className="text-base font-semibold text-white">
                Compaginación de Placas & Guías de Plegado Post-Prensa
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Armado de pliegos con guías de doblez punteadas, marcas de registro, barras FOGRA y cálculo de desperdicio de papel.
            </p>
          </div>

          <button
            onClick={handleExportPlateSvg}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Placa de Imposición (SVG)
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-lg max-w-xl">
          <button
            onClick={() => setImpositionCategory('multicard')}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              impositionCategory === 'multicard'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            Armado de 4, 6 y 8 Cartas
          </button>

          <button
            onClick={() => setImpositionCategory('editorial')}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              impositionCategory === 'editorial'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            Cuadernillos (Tiro / Retiro)
          </button>

          <button
            onClick={() => setImpositionCategory('cilindro_flexo')}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              impositionCategory === 'cilindro_flexo'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Rotativas / Flexo
          </button>
        </div>

        {/* PAPER WASTE & COST OPTIMIZER STRIP (BARRA INFORMATIVA DE RENDIMIENTO) */}
        {impositionCategory !== 'cilindro_flexo' && (
          <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/10 rounded border border-amber-500/30 text-amber-400">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">
                    Rendimiento de Pliego & Desperdicio de Papel
                  </span>
                  <span className="text-[10px] text-neutral-400 ml-2 font-mono">
                    Pliego: {parentW} × {parentH} mm
                  </span>
                </div>
              </div>

              {/* Rating Badge */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    activeWasteMetrics.efficiencyRating === 'optimo'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : activeWasteMetrics.efficiencyRating === 'aceptable'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {activeWasteMetrics.efficiencyRating === 'optimo'
                    ? '✓ Merma Óptima'
                    : activeWasteMetrics.efficiencyRating === 'aceptable'
                    ? '⚡ Merma Estándar Taller'
                    : '⚠ Merma Elevada'}
                </span>
                <span className="text-neutral-300 font-bold">
                  {activeWasteMetrics.wastePercent}% Desperdicio
                </span>
              </div>
            </div>

            {/* Visual Waste vs Efficiency Progress Bar */}
            <div className="w-full bg-neutral-950 rounded-full h-2.5 overflow-hidden flex border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${activeWasteMetrics.efficiencyPercent}%` }}
                title={`Área útil impresa: ${activeWasteMetrics.efficiencyPercent}%`}
              />
              <div
                className="bg-amber-500/80 h-full transition-all"
                style={{ width: `${activeWasteMetrics.wastePercent}%` }}
                title={`Desperdicio (Pinza + Calles): ${activeWasteMetrics.wastePercent}%`}
              />
            </div>

            {/* 4 Detail Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 block font-mono">
                  Aprovechamiento Útil:
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {activeWasteMetrics.efficiencyPercent}%
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  {activeWasteMetrics.usefulPrintAreaCm2} cm² útiles
                </span>
              </div>

              <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 block font-mono">
                  Desperdicio / Merma:
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {activeWasteMetrics.wastePercent}%
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  {activeWasteMetrics.wasteAreaCm2} cm² merma
                </span>
              </div>

              <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 block font-mono">
                  Pinza (8mm) & Calles:
                </span>
                <span className="text-xs font-medium text-neutral-200 font-mono">
                  {activeWasteMetrics.gripperLossCm2} + {activeWasteMetrics.gutterLossCm2} cm²
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  Tolerancia mecánica
                </span>
              </div>

              <div className="p-2 bg-neutral-950/70 rounded border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 block font-mono">
                  Pliegos / 1,000 unidades:
                </span>
                <span className="text-xs font-bold text-sky-400 font-mono">
                  {activeWasteMetrics.sheetsNeededPer1000Units} pliegos
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  Incluye +5% puesta en punto
                </span>
              </div>
            </div>

            {/* Advice notice */}
            <div className="text-[11px] text-neutral-400 flex items-start gap-1.5 pt-1 border-t border-neutral-800/60">
              <span className="text-amber-400 font-bold shrink-0 font-mono">CONSEJO:</span>
              <span>{activeWasteMetrics.costAdvice}</span>
            </div>
          </div>
        )}

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Controls Column */}
          <div className="space-y-4">
            {/* Mode 1: 4, 6, 8 Cartas Setup */}
            {impositionCategory === 'multicard' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4 text-xs">
                <div>
                  <span className="font-mono uppercase text-neutral-400 block mb-2">
                    Cantidad de Cartas por Pliego:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([4, 6, 8] as const).map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setCardCount(cnt)}
                        className={`py-2 text-xs font-medium rounded border transition-colors ${
                          cardCount === cnt
                            ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        {cnt} Cartas
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    {cardCount === 4 && 'Disposición 2 × 2 (2 columnas y 2 filas)'}
                    {cardCount === 6 && 'Disposición 3 × 2 (3 columnas y 2 filas para medio pliego)'}
                    {cardCount === 8 && 'Disposición 4 × 2 (4 columnas y 2 filas para pliego completo)'}
                  </span>
                </div>

                {/* Rotation Logic: Cabeza con Cabeza vs Pie con Pie */}
                <div>
                  <span className="font-mono uppercase text-neutral-400 block mb-1.5">
                    Lógica de Orientación:
                  </span>
                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'cabeza_con_cabeza',
                        title: 'Cabeza con Cabeza (Head-to-Head)',
                        desc: 'Fila superior girada 180°. Al plegar el pliego, todas las cabezas coinciden derechas.',
                      },
                      {
                        id: 'pie_con_pie',
                        title: 'Pie con Pie (Foot-to-Foot)',
                        desc: 'Fila inferior girada 180°. Utilizado para empaque o plegado acordeón.',
                      },
                      {
                        id: 'normal',
                        title: 'Orientación Normal (0° uniforme)',
                        desc: 'Todas las cartas en el mismo sentido para corte directo en guillotina.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setOrientationMode(opt.id as any)}
                        className={`w-full p-2.5 rounded border text-left transition-colors ${
                          orientationMode === opt.id
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <strong className="block text-xs">{opt.title}</strong>
                        <span className="text-[10px] text-neutral-400 block mt-0.5 leading-snug">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacing & Gutter */}
                <div className="pt-2 border-t border-neutral-800 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Calle de Corte entre Cartas (Gutter):</span>
                      <span className="font-mono text-amber-400">{gutterMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="0.5"
                      value={gutterMm}
                      onChange={(e) => setGutterMm(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Margen de Pinza de Máquina:</span>
                      <span className="font-mono text-amber-400">{gripperMarginMm} mm (0.8 cm)</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="14"
                      value={gripperMarginMm}
                      onChange={(e) => setGripperMarginMm(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Technical Marks Detail Config */}
                <div className="pt-2 border-t border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono uppercase text-neutral-400 text-[10px] block">
                      Marcas Técnicas de Pliego:
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {activeMarksCount}/4 activas
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <label className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Guías de corte de guillotina</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showCropMarks}
                        onChange={(e) => setShowCropMarks(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                        <span>Cruces de registro concéntricas</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showRegMarks}
                        onChange={(e) => setShowRegMarks(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white">
                      <div className="flex items-center gap-2">
                        <FoldHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span>Guías de plegado punteadas ({activeFoldGuides.length})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showFoldMarks}
                        onChange={(e) => setShowFoldMarks(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Barra de color dinámica (CMYK+Spot)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showColorBar}
                        onChange={(e) => setShowColorBar(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                    </label>
                  </div>

                  {/* Color bar border placement selector */}
                  {showColorBar && (
                    <div className="pt-1.5">
                      <span className="text-[10px] text-neutral-400 block mb-1">
                        Borde de la Barra de Color:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'bottom', label: 'Contra-pinza' },
                          { id: 'top', label: 'Bajo Pinza' },
                          { id: 'left', label: 'Lateral' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => setColorBarPosition(pos.id as any)}
                            className={`py-1 text-[10px] rounded border transition-colors ${
                              colorBarPosition === pos.id
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-semibold'
                                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Editorial Booklets */}
            {impositionCategory === 'editorial' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3.5 text-xs">
                <span className="text-xs font-mono uppercase text-neutral-400 block">
                  Cuadernillos Editorial (Tiro / Retiro):
                </span>

                {/* Scheme Selector */}
                <div>
                  <span className="text-[10px] text-neutral-400 block mb-1">
                    Formato de Salida Post-Prensa:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setEditorialScheme('4_paginas_folleto')}
                      className={`p-2 rounded border text-left transition-colors ${
                        editorialScheme === '4_paginas_folleto'
                          ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <strong className="block text-xs">Díptico (4 Págs)</strong>
                      <span className="text-[9px] text-neutral-500 block">1 pliegue central</span>
                    </button>

                    <button
                      onClick={() => setEditorialScheme('8_paginas_cuadernillo')}
                      className={`p-2 rounded border text-left transition-colors ${
                        editorialScheme === '8_paginas_cuadernillo'
                          ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <strong className="block text-xs">Cuadernillo (8 Págs)</strong>
                      <span className="text-[9px] text-neutral-500 block">2 pliegues cruzados</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPlateSide('tiro')}
                    className={`p-2 rounded border font-semibold transition-colors ${
                      plateSide === 'tiro'
                        ? 'bg-neutral-800 border-amber-500 text-amber-400'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Placa de TIRO (Front)
                  </button>
                  <button
                    onClick={() => setPlateSide('retiro')}
                    className={`p-2 rounded border font-semibold transition-colors ${
                      plateSide === 'retiro'
                        ? 'bg-neutral-800 border-amber-500 text-amber-400'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Placa de RETIRO (Vuelta)
                  </button>
                </div>

                <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] space-y-1">
                  <div className="flex justify-between text-neutral-300">
                    <span>Compensación de lomo (Creep):</span>
                    <strong className="text-amber-400 font-mono">
                      {editorialLayout.creepRecommendationMm} mm
                    </strong>
                  </div>
                  <p className="text-neutral-500 text-[10px]">
                    Evita que las páginas del centro sobresalgan al engrapar el cuadernillo a caballo.
                  </p>
                </div>

                {/* Folding marks info */}
                <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] space-y-1">
                  <span className="font-mono uppercase text-amber-400 text-[10px] block">
                    Secuencia de Plegadora Stahl/MBO:
                  </span>
                  {activeFoldGuides.map((g, i) => (
                    <div key={g.id} className="text-neutral-300 flex items-center gap-1.5 text-[10px]">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span>{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 3: Flexo Cylinder */}
            {impositionCategory === 'cilindro_flexo' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 text-xs">
                <span className="text-xs font-mono uppercase text-neutral-400 block">
                  Rotativas & Flexografía:
                </span>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Desarrollo del Cilindro:</span>
                  <span className="font-mono text-emerald-400">{cylinderRepeatMm} mm</span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="650"
                  value={cylinderRepeatMm}
                  onChange={(e) => setCylinderRepeatMm(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />

                <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>Reducción Longitudinal:</span>
                    <strong className="font-mono text-emerald-400">
                      {flexoDistortion.distortionPercent}%
                    </strong>
                  </div>
                  <div className="flex justify-between text-neutral-400 text-[11px]">
                    <span>Medida compensada en plano:</span>
                    <span className="font-mono text-neutral-200">
                      {flexoDistortion.reducedLengthMm} mm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Sheet Simulation Column */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col items-center justify-between min-h-[660px] overflow-hidden">
            {/* INTERACTIVE MARKS TOGGLE STRIP (DIRECT ACCESS IN WORKSPACE) */}
            <div className="w-full mb-3 p-2 bg-neutral-950 border border-neutral-800 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-neutral-400 uppercase mr-1">
                  Alternar Marcas:
                </span>

                {/* Crop marks chip */}
                <button
                  onClick={() => setShowCropMarks((prev) => !prev)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors ${
                    showCropMarks
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
                  }`}
                  title="Alternar visibilidad de guías de corte"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Corte</span>
                  <span className="text-[9px] font-mono ml-0.5">
                    {showCropMarks ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Reg marks chip */}
                <button
                  onClick={() => setShowRegMarks((prev) => !prev)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors ${
                    showRegMarks
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
                  }`}
                  title="Alternar marcas de registro concéntricas"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Registro</span>
                  <span className="text-[9px] font-mono ml-0.5">
                    {showRegMarks ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Fold marks chip */}
                <button
                  onClick={() => setShowFoldMarks((prev) => !prev)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors ${
                    showFoldMarks
                      ? 'bg-amber-600/20 border-amber-600/50 text-amber-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
                  }`}
                  title="Alternar guías de plegado automáticas punteadas"
                >
                  <FoldHorizontal className="w-3 h-3" />
                  <span>Guías de Plegado ({activeFoldGuides.length})</span>
                  <span className="text-[9px] font-mono ml-0.5">
                    {showFoldMarks ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Color bar chip */}
                <button
                  onClick={() => setShowColorBar((prev) => !prev)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors ${
                    showColorBar
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
                  }`}
                  title="Alternar barra de control CMYK + Spot dinámica"
                >
                  <Palette className="w-3 h-3" />
                  <span>Barra CMYK</span>
                  <span className="text-[9px] font-mono ml-0.5">
                    {showColorBar ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Quick All Toggle */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  onClick={() => toggleAllMarks(true)}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                >
                  Todas ON
                </button>
                <button
                  onClick={() => toggleAllMarks(false)}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800"
                >
                  Ocultar
                </button>
              </div>
            </div>

            {/* Header info over plate */}
            <div className="flex items-center justify-between w-full mb-3 text-xs font-mono">
              <span className="text-neutral-400 font-medium">
                {activeSheetTitle} · {parentW} × {parentH} mm
              </span>
              <span className="text-amber-400 font-bold">
                Pinza: {gripperMarginMm} mm · {orientationMode.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            {/* Mother Plate Container */}
            <div
              className="relative bg-white shadow-2xl border border-neutral-400 transition-all origin-top my-auto"
              style={{
                width: `${parentW * MM_TO_PX * previewScale}px`,
                height: `${parentH * MM_TO_PX * previewScale}px`,
              }}
            >
              {/* Press Gripper Strip on Top */}
              <div
                className="absolute top-0 left-0 w-full bg-amber-500/20 border-b border-dashed border-amber-600 flex items-center justify-between px-2 text-[8px] font-mono font-semibold text-amber-900 z-10"
                style={{ height: `${gripperMarginMm * MM_TO_PX * previewScale}px` }}
              >
                <span>PINZA DE PRENSA ({gripperMarginMm} mm) - ENTRADA DE HOJA</span>
                <span>HEIDELBERG SM 74 / KOMORI LITHRONE</span>
              </div>

              {/* RENDER MULTI-CARD (4, 6, 8 Cartas) */}
              {impositionCategory === 'multicard' && (
                <>
                  {multiCardLayout.slots.map((slot) => (
                    <div
                      key={slot.slotIndex}
                      className="absolute border border-dashed border-neutral-400 flex flex-col p-1.5 bg-neutral-50 overflow-hidden shadow-xs"
                      style={{
                        left: `${slot.x * MM_TO_PX * previewScale}px`,
                        top: `${slot.y * MM_TO_PX * previewScale}px`,
                        width: `${slot.width * MM_TO_PX * previewScale}px`,
                        height: `${slot.height * MM_TO_PX * previewScale}px`,
                        transform: `rotate(${slot.rotationDeg}deg)`,
                        transformOrigin: 'center center',
                      }}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between border-b border-neutral-300 pb-0.5 text-[8px] font-mono text-neutral-800 font-bold">
                        <span>CARTA #{slot.pageNumber}</span>
                        <div className="flex items-center gap-0.5 text-[7px] text-amber-700">
                          <ArrowUp className="w-2.5 h-2.5" />
                          <span>Cabeza</span>
                        </div>
                      </div>

                      {/* Mock Lines */}
                      <div className="flex-1 flex flex-col justify-center space-y-1 my-1 opacity-40">
                        <div className="h-0.5 bg-neutral-400 w-full rounded-xs" />
                        <div className="h-0.5 bg-neutral-400 w-4/5 rounded-xs" />
                        <div className="h-0.5 bg-neutral-400 w-full rounded-xs" />
                        <div className="h-0.5 bg-neutral-400 w-3/4 rounded-xs" />
                      </div>

                      <div className="text-[6px] font-mono text-neutral-500 text-right">
                        {slot.rotationDeg === 180 ? '180° Invertida' : '0° Normal'}
                      </div>
                    </div>
                  ))}

                  {/* Guillotine Crop Marks */}
                  {showCropMarks && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {multiCardLayout.cropMarks.map((m, i) => (
                        <line
                          key={i}
                          x1={m.x1 * MM_TO_PX * previewScale}
                          y1={m.y1 * MM_TO_PX * previewScale}
                          x2={m.x2 * MM_TO_PX * previewScale}
                          y2={m.y2 * MM_TO_PX * previewScale}
                          stroke="#000000"
                          strokeWidth="0.6"
                        />
                      ))}
                    </svg>
                  )}

                  {/* AUTOMATIC FOLD GUIDES (DOTTED LINES WITH POST-PRESS SEQUENCE BADGES) */}
                  {showFoldMarks && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      {activeFoldGuides.map((fg) => {
                        const midX = ((fg.x1 + fg.x2) / 2) * MM_TO_PX * previewScale;
                        const midY = ((fg.y1 + fg.y2) / 2) * MM_TO_PX * previewScale;

                        return (
                          <g key={fg.id}>
                            {/* Dotted crease line */}
                            <line
                              x1={fg.x1 * MM_TO_PX * previewScale}
                              y1={fg.y1 * MM_TO_PX * previewScale}
                              x2={fg.x2 * MM_TO_PX * previewScale}
                              y2={fg.y2 * MM_TO_PX * previewScale}
                              stroke="#d97706"
                              strokeWidth="1.2"
                              strokeDasharray="4,3"
                            />
                            {/* Outer edge crease ticks */}
                            {fg.type === 'horizontal' ? (
                              <>
                                <line
                                  x1={0}
                                  y1={fg.y1 * MM_TO_PX * previewScale}
                                  x2={6 * MM_TO_PX * previewScale}
                                  y2={fg.y1 * MM_TO_PX * previewScale}
                                  stroke="#b45309"
                                  strokeWidth="1.5"
                                />
                                <line
                                  x1={(parentW - 6) * MM_TO_PX * previewScale}
                                  y1={fg.y1 * MM_TO_PX * previewScale}
                                  x2={parentW * MM_TO_PX * previewScale}
                                  y2={fg.y1 * MM_TO_PX * previewScale}
                                  stroke="#b45309"
                                  strokeWidth="1.5"
                                />
                              </>
                            ) : (
                              <>
                                <line
                                  x1={fg.x1 * MM_TO_PX * previewScale}
                                  y1={0}
                                  x2={fg.x1 * MM_TO_PX * previewScale}
                                  y2={6 * MM_TO_PX * previewScale}
                                  stroke="#b45309"
                                  strokeWidth="1.5"
                                />
                                <line
                                  x1={fg.x1 * MM_TO_PX * previewScale}
                                  y1={(parentH - 6) * MM_TO_PX * previewScale}
                                  x2={fg.x1 * MM_TO_PX * previewScale}
                                  y2={parentH * MM_TO_PX * previewScale}
                                  stroke="#b45309"
                                  strokeWidth="1.5"
                                />
                              </>
                            )}

                            {/* Center sequence badge */}
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x="-48"
                                y="-6"
                                width="96"
                                height="12"
                                rx="3"
                                fill="#78350f"
                                opacity="0.85"
                              />
                              <text
                                x="0"
                                y="2.5"
                                textAnchor="middle"
                                fill="#fef3c7"
                                fontSize="6.5"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {fg.label}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {/* DYNAMIC CMYK + SPOT COLOR CONTROL BAR ON BORDERS */}
                  {showColorBar && (
                    <div
                      className={`absolute flex items-center gap-0.5 border border-neutral-400 bg-white p-0.5 shadow-xs z-10 ${
                        colorBarPosition === 'left'
                          ? 'left-1 top-12 bottom-12 flex-col w-3.5'
                          : colorBarPosition === 'top'
                          ? 'left-3 right-3'
                          : 'left-3 right-3'
                      }`}
                      style={{
                        top:
                          colorBarPosition === 'top'
                            ? `${(gripperMarginMm + 1) * MM_TO_PX * previewScale}px`
                            : colorBarPosition === 'bottom'
                            ? `${multiCardLayout.colorBarY * MM_TO_PX * previewScale}px`
                            : undefined,
                        height:
                          colorBarPosition === 'left'
                            ? undefined
                            : `${5.0 * MM_TO_PX * previewScale}px`,
                      }}
                    >
                      {dynamicColorPatches.map((patch, idx) => (
                        <div
                          key={idx}
                          className="flex-1 w-full h-full flex items-center justify-center text-[5px] font-mono font-bold text-white shadow-2xs overflow-hidden"
                          style={{
                            backgroundColor: patch.hex,
                            opacity: patch.densityPercent / 100,
                            color:
                              patch.label.includes('Y') ||
                              patch.label.includes('25') ||
                              patch.hex === '#F8FAFC'
                                ? '#000'
                                : '#fff',
                          }}
                          title={`Tinta: ${patch.name} (${patch.densityPercent}%)`}
                        >
                          <span className="truncate">{patch.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Registration Crosses with Concentric Rings on Sheet Borders */}
                  {showRegMarks && (
                    <>
                      {multiCardLayout.registrationMarks.map((reg, idx) => (
                        <div
                          key={idx}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                          style={{
                            left: `${reg.x * MM_TO_PX * previewScale}px`,
                            top: `${reg.y * MM_TO_PX * previewScale}px`,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <circle cx="7" cy="7" r="4.5" fill="none" stroke="#000" strokeWidth="0.4" />
                            <circle cx="7" cy="7" r="2.5" fill="none" stroke="#000" strokeWidth="0.4" />
                            <line x1="7" y1="0" x2="7" y2="14" stroke="#000" strokeWidth="0.4" />
                            <line x1="0" y1="7" x2="14" y2="7" stroke="#000" strokeWidth="0.4" />
                          </svg>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* RENDER EDITORIAL SIGNATURE (Tiro / Retiro) */}
              {impositionCategory === 'editorial' && (
                <>
                  {editorialLayout.tiroSlots.map((slot) => (
                    <div
                      key={slot.pageNumber}
                      className="absolute border border-dashed border-neutral-400 flex flex-col p-1.5 bg-neutral-50 overflow-hidden shadow-xs"
                      style={{
                        left: `${slot.x * MM_TO_PX * previewScale}px`,
                        top: `${slot.y * MM_TO_PX * previewScale}px`,
                        width: `${slot.width * MM_TO_PX * previewScale}px`,
                        height: `${slot.height * MM_TO_PX * previewScale}px`,
                        transform: `rotate(${slot.rotationDeg}deg)`,
                        transformOrigin: 'center center',
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-neutral-300 pb-0.5 text-[8px] font-mono text-neutral-800 font-bold">
                        <span>PÁG {slot.pageNumber}</span>
                        <span className="text-amber-700 text-[7px]">Cabeza</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-1 my-1 opacity-30">
                        <div className="h-0.5 bg-neutral-400 w-full" />
                        <div className="h-0.5 bg-neutral-400 w-3/4" />
                      </div>
                    </div>
                  ))}

                  {/* AUTOMATIC EDITORIAL FOLD GUIDES */}
                  {showFoldMarks && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      {activeFoldGuides.map((fg) => {
                        const midX = ((fg.x1 + fg.x2) / 2) * MM_TO_PX * previewScale;
                        const midY = ((fg.y1 + fg.y2) / 2) * MM_TO_PX * previewScale;

                        return (
                          <g key={fg.id}>
                            <line
                              x1={fg.x1 * MM_TO_PX * previewScale}
                              y1={fg.y1 * MM_TO_PX * previewScale}
                              x2={fg.x2 * MM_TO_PX * previewScale}
                              y2={fg.y2 * MM_TO_PX * previewScale}
                              stroke="#d97706"
                              strokeWidth="1.2"
                              strokeDasharray="4,3"
                            />
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x="-48"
                                y="-6"
                                width="96"
                                height="12"
                                rx="3"
                                fill="#78350f"
                                opacity="0.85"
                              />
                              <text
                                x="0"
                                y="2.5"
                                textAnchor="middle"
                                fill="#fef3c7"
                                fontSize="6.5"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {fg.label}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {/* Border Registration Marks in Editorial Mode */}
                  {showRegMarks && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div
                        className="absolute top-1 left-1/2 -translate-x-1/2"
                        style={{ top: `${(gripperMarginMm / 2) * MM_TO_PX * previewScale}px` }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14">
                          <circle cx="7" cy="7" r="4.5" fill="none" stroke="#000" strokeWidth="0.4" />
                          <line x1="7" y1="0" x2="7" y2="14" stroke="#000" strokeWidth="0.4" />
                          <line x1="0" y1="7" x2="14" y2="7" stroke="#000" strokeWidth="0.4" />
                        </svg>
                      </div>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                        <svg width="14" height="14" viewBox="0 0 14 14">
                          <circle cx="7" cy="7" r="4.5" fill="none" stroke="#000" strokeWidth="0.4" />
                          <line x1="7" y1="0" x2="7" y2="14" stroke="#000" strokeWidth="0.4" />
                          <line x1="0" y1="7" x2="14" y2="7" stroke="#000" strokeWidth="0.4" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Color Bar in Editorial Mode */}
                  {showColorBar && (
                    <div
                      className="absolute left-2 right-2 flex items-center gap-0.5 border border-neutral-400 bg-white p-0.5 shadow-xs"
                      style={{
                        bottom: `${1 * MM_TO_PX * previewScale}px`,
                        height: `${4.5 * MM_TO_PX * previewScale}px`,
                      }}
                    >
                      {dynamicColorPatches.map((patch, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-full flex items-center justify-center text-[4px] font-mono text-white"
                          style={{
                            backgroundColor: patch.hex,
                            color: patch.label.includes('Y') ? '#000' : '#fff',
                          }}
                        >
                          {patch.label}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* RENDER ROTOGRAVURE / FLEXO CYLINDER */}
              {impositionCategory === 'cilindro_flexo' && (
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between border-b border-emerald-500 pb-1 text-[8px] font-mono text-emerald-800">
                    <span>BOBINA CONTINUA - PASO DE REPETICIÓN ({cylinderRepeatMm} mm)</span>
                    <span>REDUCCIÓN: {flexoDistortion.distortionPercent}%</span>
                  </div>
                  <div className="flex-1 border-2 border-dashed border-emerald-600 rounded my-2 flex items-center justify-center p-2">
                    <span className="text-xs font-mono font-bold text-emerald-900 text-center">
                      DESARROLLO DE CILINDRO COMPENSADO PARA ROTATIVA
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Technical Plate Slug Footer */}
            <div className="mt-4 p-2.5 bg-neutral-950 border border-neutral-800 rounded w-full flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
              <span>
                PLACA:{' '}
                <strong className="text-neutral-200">
                  {cardCount} CARTAS · {orientationMode.toUpperCase()}
                </strong>
              </span>
              <span>
                RENDIMIENTO:{' '}
                <strong className="text-emerald-400">
                  {activeWasteMetrics.efficiencyPercent}% ÚTIL ({activeWasteMetrics.wastePercent}% MERMA)
                </strong>
              </span>
              <span>
                GUIAS DOBLADO:{' '}
                <strong className="text-amber-400">
                  {activeFoldGuides.length} EJES ({showFoldMarks ? 'VISIBLES' : 'OCULTAS'})
                </strong>
              </span>
              <span>
                CONTROL:{' '}
                <strong className="text-neutral-200">FOGRA 39L / {inks.length} TINTAS</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
