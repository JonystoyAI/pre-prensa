import React from 'react';
import { PrintSystem, DocumentDimensions } from '../types/prepress';
import { Download, Sliders, AlertTriangle, Layers, Wand2, Grid, Sparkles } from 'lucide-react';

interface TopBarProps {
  currentView: 'canvas' | 'separation' | 'imposition' | 'assistant';
  setCurrentView: (view: 'canvas' | 'separation' | 'imposition' | 'assistant') => void;
  printSystem: PrintSystem;
  setPrintSystem: (system: PrintSystem) => void;
  document: DocumentDimensions;
  setDocument: (doc: DocumentDimensions) => void;
  alertCount: number;
  onOpenExport: () => void;
  onOpenVectorizer: () => void;
  onOpenFontUpload: () => void;
  onOpenEnhancer: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  setCurrentView,
  printSystem,
  setPrintSystem,
  document: doc,
  alertCount,
  onOpenExport,
  onOpenVectorizer,
  onOpenFontUpload,
  onOpenEnhancer,
}) => {
  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-900 text-neutral-100 px-4 flex items-center justify-between gap-6 select-none shrink-0 z-30">
      {/* Zone 1: Wordmark & Format Metadata */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded flex items-center justify-center font-bold text-neutral-950 text-sm tracking-tighter">
            PF
          </div>
          <span className="font-semibold text-sm tracking-tight text-white whitespace-nowrap">
            PressForge Studio
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 font-mono tabular-nums">
          <span>{doc.name}</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>{doc.widthMm} × {doc.heightMm} mm</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span className="text-amber-400">Pinza: {doc.gripperMarginMm} mm</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Single-line controls) */}
      <nav className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-md border border-neutral-700/60">
        <button
          onClick={() => setCurrentView('canvas')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'canvas'
              ? 'bg-neutral-900 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Lienzo CAD
        </button>

        <button
          onClick={() => setCurrentView('separation')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'separation'
              ? 'bg-neutral-900 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Separación de Tintas
        </button>

        <button
          onClick={() => setCurrentView('imposition')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'imposition'
              ? 'bg-neutral-900 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Armado de Pliegos
        </button>

        <button
          onClick={() => setCurrentView('assistant')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'assistant'
              ? 'bg-neutral-900 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          Asistente IA (Fotos & Taller)
        </button>
      </nav>

      {/* Zone 3: Actions & System Selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* System Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-500 hidden sm:inline">Sistema:</span>
          <select
            value={printSystem}
            onChange={(e) => setPrintSystem(e.target.value as PrintSystem)}
            className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="offset">Offset (Pliego / Rotoplana)</option>
            <option value="serigrafia">Serigrafía (Manual / Textil)</option>
            <option value="flexo">Flexografía (Etiquetas / Empaques)</option>
            <option value="huecograbado">Huecograbado (Cilindros)</option>
            <option value="vinil">Vinil de Corte (Plotter)</option>
          </select>
        </div>

        {/* Image Enhancer shortcut */}
        <button
          onClick={onOpenEnhancer}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors"
          title="Aumentar resolución, nitidez y contraste de imágenes borrosas"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Realzar Imagen
        </button>

        {/* Vectorize Image shortcut */}
        <button
          onClick={onOpenVectorizer}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
          title="Vectorizar imagen por capas de color"
        >
          Vectorizar
        </button>

        {/* Font loader shortcut */}
        <button
          onClick={onOpenFontUpload}
          className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
          title="Cargar fuentes tipográficas .ttf / .otf"
        >
          Fuentes (.ttf)
        </button>

        {/* Preflight Badge */}
        {alertCount > 0 && (
          <button
            onClick={() => setCurrentView('canvas')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-colors"
            title={`${alertCount} alertas de pre-vuelo técnico`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{alertCount}</span>
          </button>
        )}

        {/* Primary Action Button: Export */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded transition-colors shadow-sm whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar Salidas
        </button>
      </div>
    </header>
  );
};
