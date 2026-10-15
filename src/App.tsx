/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DocumentDimensions,
  InkColor,
  PrintSystem,
  ToolType,
  VectorElement,
} from './types/prepress';
import { STANDARD_FORMATS, runPreflightCheck } from './utils/prepressCalculations';
import { STANDARD_CMYK_INKS, POPULAR_SPOT_INKS } from './utils/colorSeparation';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { VectorCanvas } from './components/VectorCanvas';
import { ColorSeparationPanel } from './components/ColorSeparationPanel';
import { LayersPanel } from './components/LayersPanel';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { ImpositionView } from './components/ImpositionView';
import { PreflightInspector } from './components/PreflightInspector';
import { VectorizerModal } from './components/VectorizerModal';
import { ExportModal } from './components/ExportModal';
import { FontUploadModal } from './components/FontUploadModal';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { ImageEnhancerModal } from './components/ImageEnhancerModal';
import { ImportFileModal } from './components/ImportFileModal';
import { BookTemplate, RotateCcw, RotateCw, Layers, Palette, Upload } from 'lucide-react';

export default function App() {
  // Document setup: Media Carta Apaisada (21.5 × 14 cm) with 8mm mechanical gripper on top
  const [doc, setDoc] = useState<DocumentDimensions>(STANDARD_FORMATS[0]);

  // Active print system: Offset, Serigrafía, Flexo, Huecograbado, Vinil
  const [printSystem, setPrintSystem] = useState<PrintSystem>('offset');

  // Main navigation view
  const [currentView, setCurrentView] = useState<'canvas' | 'separation' | 'imposition' | 'assistant'>('canvas');

  // Inks list
  const [inks, setInks] = useState<InkColor[]>([
    STANDARD_CMYK_INKS[3], // Key / Black
    POPULAR_SPOT_INKS[0],  // Pantone Warm Red C (for Folio & Highlights)
    POPULAR_SPOT_INKS[1],  // Pantone Reflex Blue C
  ]);
  const [activeInkId, setActiveInkId] = useState<string>(STANDARD_CMYK_INKS[3].id);

  // Separation preview mode
  const [viewMode, setViewMode] = useState<'composite' | 'single_color' | 'positive_film'>('composite');
  const [isolatedInkId, setIsolatedInkId] = useState<string | null>(null);

  // Active drawing CAD tool
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Active lateral panel tab: 'layers' or 'separation'
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'separation'>('layers');

  // Sync sidebar tab when user switches to separation view from TopBar
  useEffect(() => {
    if (currentView === 'separation') {
      setSidebarTab('separation');
    }
  }, [currentView]);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isVectorizerOpen, setIsVectorizerOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [vectorizerInitialImage, setVectorizerInitialImage] = useState<string | null>(null);
  const [assistantInitialImage, setAssistantInitialImage] = useState<string | null>(null);

  // Initial Vector Elements: Professional Media Carta Sales Note with Folio, 8 lines, and safe 6% watermark
  const [elements, setElements] = useState<VectorElement[]>([
    {
      id: 'init-title',
      type: 'text',
      inkId: STANDARD_CMYK_INKS[3].id,
      x: 14,
      y: 16,
      width: 80,
      height: 9,
      rotationDeg: 0,
      text: 'NOTA DE VENTA / REMISIÓN',
      fontSizePt: 15,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'bold',
      fill: '#111827',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    },
    {
      id: 'init-subtitle',
      type: 'text',
      inkId: STANDARD_CMYK_INKS[3].id,
      x: 14,
      y: 25,
      width: 120,
      height: 5,
      rotationDeg: 0,
      text: 'PAPELERÍA & SUMINISTROS GRÁFICOS · TEL. 55-4890-1120',
      fontSizePt: 7.5,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'normal',
      fill: '#374151',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    },
    {
      id: 'init-folio',
      type: 'folio',
      inkId: POPULAR_SPOT_INKS[0].id, // Red ink
      x: 160,
      y: 14,
      width: 42,
      height: 14,
      rotationDeg: 0,
      folioPrefix: 'N° A-',
      folioStartNumber: 1045,
      folioDigits: 6,
      fill: 'none',
      fillOpacity: 1.0,
      stroke: '#dc2626',
      strokeWidthMm: 0.35,
    },
    {
      id: 'init-client',
      type: 'text',
      inkId: STANDARD_CMYK_INKS[3].id,
      x: 14,
      y: 35,
      width: 180,
      height: 7,
      rotationDeg: 0,
      text: 'Cliente: _____________________________________ Fecha: ____/____/2026',
      fontSizePt: 9,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'normal',
      fill: '#1f2937',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    },
    {
      id: 'init-rulings',
      type: 'rulings',
      inkId: STANDARD_CMYK_INKS[3].id,
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
      id: 'init-watermark',
      type: 'watermark',
      inkId: STANDARD_CMYK_INKS[3].id,
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
      fillOpacity: 0.06, // strictly 6% safe watermark!
      stroke: 'none',
      strokeWidthMm: 0,
    },
    {
      id: 'init-legal',
      type: 'text',
      inkId: STANDARD_CMYK_INKS[3].id,
      x: 14,
      y: 128,
      width: 180,
      height: 6,
      rotationDeg: 0,
      text: '* Esta nota ampara la entrega de mercancía a entera conformidad.',
      fontSizePt: 6.5,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'normal',
      fill: '#4b5563',
      fillOpacity: 1.0,
      stroke: 'none',
      strokeWidthMm: 0,
    },
  ]);

  // Undo / Redo history
  const [history, setHistory] = useState<VectorElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback(
    (newEls: VectorElement[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, newEls];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setElements(history[prevIdx]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setElements(history[nextIdx]);
    }
  };

  // Run automated Pre-Flight check whenever elements, doc or printSystem changes
  const alerts = useMemo(() => {
    return runPreflightCheck(elements, doc, printSystem);
  }, [elements, doc, printSystem]);

  // Insert vectorized elements
  const handleInsertVectorizedElements = (newEls: VectorElement[], newInks: InkColor[]) => {
    // Add new inks if not present
    setInks((prev) => {
      const merged = [...prev];
      for (const ni of newInks) {
        if (!merged.some((i) => i.id === ni.id)) {
          merged.push(ni);
        }
      }
      return merged;
    });

    setElements((prev) => [...prev, ...newEls]);
    pushHistory([...elements, ...newEls]);
    setCurrentView('canvas');
  };

  // Import vector elements from files (.svg, .ai, .eps, .cdr, .pdf, .json)
  const handleImportVectorElements = (
    newEls: VectorElement[],
    newInks: InkColor[],
    replaceAll: boolean
  ) => {
    setInks((prev) => {
      const merged = [...prev];
      for (const ni of newInks) {
        if (!merged.some((i) => i.id === ni.id)) {
          merged.push(ni);
        }
      }
      return merged;
    });

    if (replaceAll) {
      setElements(newEls);
      pushHistory(newEls);
    } else {
      const combined = [...elements, ...newEls];
      setElements(combined);
      pushHistory(combined);
    }
    setCurrentView('canvas');
  };

  // Route bitmap image from importer to vectorizer
  const handleOpenVectorizerWithImage = (imageSrc: string, fileName: string) => {
    setVectorizerInitialImage(imageSrc);
    setIsVectorizerOpen(true);
  };

  // Load template
  const handleLoadTemplate = (
    templateDoc: DocumentDimensions,
    templateEls: VectorElement[],
    templateInks: InkColor[]
  ) => {
    setDoc(templateDoc);
    setInks(templateInks);
    setActiveInkId(templateInks[0].id);
    setElements(templateEls);
    pushHistory(templateEls);
    setCurrentView('canvas');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 font-sans text-neutral-100 overflow-hidden select-none">
      {/* Top Bar with 3-zone contract */}
      <TopBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        printSystem={printSystem}
        setPrintSystem={setPrintSystem}
        document={doc}
        setDocument={setDoc}
        alertCount={alerts.length}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenVectorizer={() => setIsVectorizerOpen(true)}
        onOpenFontUpload={() => setIsFontOpen(true)}
        onOpenEnhancer={() => setIsEnhancerOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Vertical CAD Toolbar */}
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          undo={undo}
          redo={redo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />

        {/* Center Area Based on Navigation */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Sub-header Bar: Template picker + Quick format selector */}
          <div className="h-10 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between gap-4 text-xs shrink-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTemplateOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors"
              >
                <BookTemplate className="w-3.5 h-3.5" />
                Plantillas de Taller
              </button>

              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition-colors"
                title="Importar archivos vectoriales (.ai, .eps, .cdr, .pdf, .svg) o imágenes (.png, .jpg)"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                Importar Archivo
              </button>

              <div className="h-4 w-px bg-neutral-800" />

              {/* Format Quick Selector */}
              <div className="flex items-center gap-1.5 text-neutral-400">
                <span>Formato:</span>
                <select
                  value={doc.name}
                  onChange={(e) => {
                    const match = STANDARD_FORMATS.find((f) => f.name === e.target.value);
                    if (match) setDoc(match);
                  }}
                  className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-0.5"
                >
                  {STANDARD_FORMATS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Undo / Redo & Stats */}
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 rounded hover:bg-neutral-800"
                title="Deshacer (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 rounded hover:bg-neutral-800"
                title="Rehacer (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono text-neutral-500 tabular-nums ml-2">
                {elements.length} objetos · {inks.length} tintas
              </span>
            </div>
          </div>

          {/* View Content */}
          <div className="flex-1 flex overflow-hidden relative">
            {(currentView === 'canvas' || currentView === 'separation') && (
              <>
                <VectorCanvas
                  document={doc}
                  elements={elements}
                  setElements={setElements}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  inks={inks}
                  activeInkId={activeInkId}
                  selectedElementId={selectedElementId}
                  setSelectedElementId={setSelectedElementId}
                  viewMode={
                    currentView === 'separation'
                      ? viewMode === 'composite'
                        ? 'single_color'
                        : viewMode
                      : viewMode
                  }
                  isolatedInkId={
                    currentView === 'separation'
                      ? isolatedInkId || inks[0]?.id
                      : isolatedInkId
                  }
                  onElementsChange={() => pushHistory(elements)}
                />

                {/* Right Lateral Panel: Gestor de Capas & Separación de Tintas */}
                <aside className="w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col h-full select-none shrink-0 z-20 overflow-hidden">
                  {/* Tab Switcher Header */}
                  <div className="flex border-b border-neutral-800 bg-neutral-950 p-1 gap-1 shrink-0">
                    <button
                      onClick={() => setSidebarTab('layers')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        sidebarTab === 'layers'
                          ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700/80 font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Capas</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-900 text-neutral-300">
                        {elements.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setSidebarTab('separation')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        sidebarTab === 'separation'
                          ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700/80 font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5 text-sky-400" />
                      <span>Separación</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-900 text-neutral-300">
                        {inks.length}
                      </span>
                    </button>
                  </div>

                  {/* Active Lateral Panel Content */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {sidebarTab === 'layers' ? (
                      <LayersPanel
                        elements={elements}
                        setElements={setElements}
                        inks={inks}
                        selectedElementId={selectedElementId}
                        setSelectedElementId={setSelectedElementId}
                        onElementsChange={() => pushHistory(elements)}
                      />
                    ) : (
                      <ColorSeparationPanel
                        inks={inks}
                        setInks={setInks}
                        activeInkId={activeInkId}
                        setActiveInkId={setActiveInkId}
                        elements={elements}
                        viewMode={
                          currentView === 'separation' && viewMode === 'composite'
                            ? 'single_color'
                            : viewMode
                        }
                        setViewMode={setViewMode}
                        isolatedInkId={
                          currentView === 'separation'
                            ? isolatedInkId || inks[0]?.id
                            : isolatedInkId
                        }
                        setIsolatedInkId={setIsolatedInkId}
                        onOpenVectorizer={() => setIsVectorizerOpen(true)}
                      />
                    )}
                  </div>
                </aside>
              </>
            )}

            {currentView === 'imposition' && (
              <ImpositionView document={doc} elements={elements} inks={inks} />
            )}

            {currentView === 'assistant' && (
              <AIAssistantPanel
                document={doc}
                setDocument={setDoc}
                setElements={setElements}
                printSystem={printSystem}
                initialImageSrc={assistantInitialImage}
                onApplyComplete={() => setCurrentView('canvas')}
              />
            )}
          </div>

          {/* Bottom Pre-Flight Inspector Bar */}
          <PreflightInspector
            alerts={alerts}
            elements={elements}
            setElements={setElements}
            gripperMarginMm={doc.gripperMarginMm}
          />
        </main>
      </div>

      {/* Modals */}
      <ImportFileModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        document={doc}
        setDocument={setDoc}
        inks={inks}
        setInks={setInks}
        onImportVectorElements={handleImportVectorElements}
        onOpenVectorizerWithImage={handleOpenVectorizerWithImage}
      />

      <VectorizerModal
        isOpen={isVectorizerOpen}
        onClose={() => setIsVectorizerOpen(false)}
        docWidthMm={doc.widthMm}
        docHeightMm={doc.heightMm}
        activeInkId={activeInkId}
        initialImageSrc={vectorizerInitialImage}
        onVectorized={handleInsertVectorizedElements}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        document={doc}
        elements={elements}
        inks={inks}
        printSystem={printSystem}
      />

      <FontUploadModal
        isOpen={isFontOpen}
        onClose={() => setIsFontOpen(false)}
        onFontLoaded={(fontName) => {
          if (selectedElementId) {
            setElements((prev) =>
              prev.map((el) => (el.id === selectedElementId ? { ...el, fontFamily: fontName } : el))
            );
          }
        }}
      />

      <TemplateLibraryModal
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onLoadTemplate={handleLoadTemplate}
      />

      <ImageEnhancerModal
        isOpen={isEnhancerOpen}
        onClose={() => setIsEnhancerOpen(false)}
        onSendToVectorizer={(enhancedUrl) => {
          setVectorizerInitialImage(enhancedUrl);
          setIsVectorizerOpen(true);
        }}
        onSendToAI={(enhancedUrl) => {
          setAssistantInitialImage(enhancedUrl);
          setCurrentView('assistant');
        }}
      />
    </div>
  );
}
