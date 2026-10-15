import React, { useState, useMemo } from 'react';
import { InkColor, VectorElement } from '../types/prepress';
import {
  PANTONE_COLOR_LIBRARY,
  PantoneSpotDefinition,
  SpotCategory,
  createCustomSpotInk,
  hexToCmyk,
} from '../utils/colorSeparation';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Image,
  Check,
  Search,
  X,
  Sparkles,
  Trash2,
  Sliders,
  Palette,
  CheckCircle2,
} from 'lucide-react';

interface ColorSeparationPanelProps {
  inks: InkColor[];
  setInks: React.Dispatch<React.SetStateAction<InkColor[]>>;
  activeInkId: string;
  setActiveInkId: (id: string) => void;
  elements: VectorElement[];
  viewMode: 'composite' | 'single_color' | 'positive_film';
  setViewMode: (mode: 'composite' | 'single_color' | 'positive_film') => void;
  isolatedInkId: string | null;
  setIsolatedInkId: (id: string | null) => void;
  onOpenVectorizer: () => void;
}

export const ColorSeparationPanel: React.FC<ColorSeparationPanelProps> = ({
  inks,
  setInks,
  activeInkId,
  setActiveInkId,
  elements,
  viewMode,
  setViewMode,
  isolatedInkId,
  setIsolatedInkId,
  onOpenVectorizer,
}) => {
  const [showAddSpotModal, setShowAddSpotModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<SpotCategory | 'all' | 'custom'>('all');

  // Custom Spot Ink Creation State
  const [customName, setCustomName] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [customHex, setCustomHex] = useState<string>('#E11D48');
  const [customAngle, setCustomAngle] = useState<number>(45);

  // Success toast
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Toggle visibility of an ink plate
  const toggleVisibility = (id: string) => {
    setInks((prev) =>
      prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i))
    );
  };

  // Toggle lock of an ink plate
  const toggleLock = (id: string) => {
    setInks((prev) =>
      prev.map((i) => (i.id === id ? { ...i, locked: !i.locked } : i))
    );
  };

  // Remove spot ink if unused or requested
  const handleRemoveSpotInk = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = elements.filter((el) => el.inkId === id).length;
    if (count > 0) {
      setAddedToast(`Tinta eliminada. ${count} objeto(s) reasignados a Negro K.`);
      setTimeout(() => setAddedToast(null), 3000);
    }

    setInks((prev) => prev.filter((i) => i.id !== id));
    if (activeInkId === id && inks.length > 1) {
      const remaining = inks.find((i) => i.id !== id);
      if (remaining) setActiveInkId(remaining.id);
    }
    if (isolatedInkId === id) {
      setIsolatedInkId(null);
    }
  };

  // Add a spot ink from Pantone catalog
  const handleAddSpotInk = (spot: InkColor) => {
    if (!inks.some((i) => i.id === spot.id || (i.pantoneCode && i.pantoneCode === spot.pantoneCode))) {
      setInks((prev) => [...prev, spot]);
      setActiveInkId(spot.id);
      setAddedToast(`Tinta "${spot.name}" añadida.`);
      setTimeout(() => setAddedToast(null), 2500);
    }
  };

  // Add custom spot ink
  const handleCreateCustomInk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newSpot = createCustomSpotInk(
      customName,
      customHex,
      customCode || 'Custom Spot',
      customAngle
    );

    setInks((prev) => [...prev, newSpot]);
    setActiveInkId(newSpot.id);
    setAddedToast(`Tinta personalizada "${newSpot.name}" creada y añadida.`);
    setTimeout(() => setAddedToast(null), 2500);
    setShowAddSpotModal(false);

    // Reset form
    setCustomName('');
    setCustomCode('');
  };

  // Filtered Pantone library based on search and category
  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PANTONE_COLOR_LIBRARY.filter((spot) => {
      const matchesCategory =
        activeCategory === 'all' || spot.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        spot.name.toLowerCase().includes(q) ||
        (spot.pantoneCode && spot.pantoneCode.toLowerCase().includes(q)) ||
        spot.description.toLowerCase().includes(q) ||
        spot.hex.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  // Calculate approximate element count per ink
  const getInkElementCount = (inkId: string) => {
    return elements.filter((el) => el.inkId === inkId).length;
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-y-auto text-neutral-200">
      {/* Panel Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Separación de Color & Tintas
          </h2>
          <p className="text-[11px] text-neutral-500">
            Gestión de películas, pantallas y fotolitos
          </p>
        </div>
        <button
          onClick={() => setShowAddSpotModal(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-200 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded transition-colors shadow-xs"
          title="Buscar y agregar tintas planas o Pantone"
        >
          <Search className="w-3 h-3 text-amber-400" />
          Buscador Pantone
        </button>
      </div>

      {/* Added Toast */}
      {addedToast && (
        <div className="mx-3 mt-2 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-[11px] text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* View Mode Switcher */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/40">
        <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1.5">
          Modo de Previsualización:
        </span>
        <div className="grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
          <button
            onClick={() => {
              setViewMode('composite');
              setIsolatedInkId(null);
            }}
            className={`px-2 py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'composite'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Compuesto
          </button>
          <button
            onClick={() => {
              setViewMode('single_color');
              if (!isolatedInkId && inks.length > 0) setIsolatedInkId(inks[0].id);
            }}
            className={`px-2 py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'single_color'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Aislado
          </button>
          <button
            onClick={() => {
              setViewMode('positive_film');
              if (!isolatedInkId && inks.length > 0) setIsolatedInkId(inks[0].id);
            }}
            className={`px-2 py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'positive_film'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Positivo (100% K)
          </button>
        </div>

        {viewMode === 'positive_film' && (
          <p className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded p-1.5 leading-snug">
            Modo fotolito activo: Las tintas se muestran en negro óptico puro para quemado de placas offset o insolado de mallas de serigrafía.
          </p>
        )}
      </div>

      {/* Inks List */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-neutral-500">
            Placas de Impresión ({inks.length}):
          </span>
          <button
            onClick={() => setShowAddSpotModal(true)}
            className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-2.5 h-2.5" /> + Agregar Tinta
          </button>
        </div>

        {inks.map((ink) => {
          const isActive = activeInkId === ink.id;
          const isIsolated = isolatedInkId === ink.id;
          const count = getInkElementCount(ink.id);

          return (
            <div
              key={ink.id}
              onClick={() => {
                setActiveInkId(ink.id);
                if (viewMode !== 'composite') {
                  setIsolatedInkId(ink.id);
                }
              }}
              className={`p-2.5 rounded-md border transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 border-amber-500/60 shadow-xs'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Ink swatch */}
                  <div
                    className="w-4 h-4 rounded-xs border border-white/20 shrink-0 shadow-xs"
                    style={{ backgroundColor: ink.hex }}
                  />

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-neutral-100 truncate">
                        {ink.name}
                      </span>
                      {ink.pantoneCode && (
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-neutral-950 text-amber-400/90 border border-neutral-700 rounded-xs shrink-0">
                          {ink.pantoneCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 block truncate">
                      {ink.isSpot ? 'Spot Pantone' : 'Proceso CMYK'} · Ág: {ink.screenAngleDeg}° · {count} obj
                    </span>
                  </div>
                </div>

                {/* Plate Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleVisibility(ink.id)}
                    className={`p-1 rounded hover:bg-neutral-700 ${
                      ink.visible ? 'text-neutral-300' : 'text-neutral-600'
                    }`}
                    title={ink.visible ? 'Ocultar tinta' : 'Mostrar tinta'}
                  >
                    {ink.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleLock(ink.id)}
                    className={`p-1 rounded hover:bg-neutral-700 ${
                      ink.locked ? 'text-amber-400' : 'text-neutral-500'
                    }`}
                    title={ink.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                  >
                    {ink.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Remove button for Spot Inks if more than 1 ink exists */}
                  {ink.isSpot && inks.length > 1 && (
                    <button
                      onClick={(e) => handleRemoveSpotInk(ink.id, e)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-700"
                      title="Eliminar tinta spot del pliego"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {viewMode !== 'composite' && isIsolated && (
                <div className="mt-1.5 pt-1.5 border-t border-neutral-700/50 flex items-center justify-between text-[10px] text-amber-400 font-mono">
                  <span>Placa aislada para salida</span>
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vectorizer CTA in footer */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex flex-col gap-2">
        <button
          onClick={onOpenVectorizer}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
        >
          <Image className="w-3.5 h-3.5 text-amber-400" />
          Vectorizar Imagen por Tintas
        </button>
      </div>

      {/* Searchable Pantone Color Library & Custom Spot Modal */}
      {showAddSpotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">
                    Buscador de Bibliotecas de Color Pantone & Tintas Planas
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Selecciona o define tintas directas para separación de serigrafía, offset y flexo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSpotModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/40 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código ej. 877, 348, Warm Red, Reflex, Neón, UV..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-md pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'Todas las Tintas' },
                  { id: 'formula_guide', label: 'Guía Clásica (Fórmula)' },
                  { id: 'metallics', label: 'Metálicos & Oro' },
                  { id: 'neons_pastels', label: 'Neón & Fluorescentes' },
                  { id: 'technical_specialties', label: 'Serigrafía & UV Técnico' },
                  { id: 'custom', label: '+ Crear Tinta Personalizada' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Custom Creator or Library Browser */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeCategory === 'custom' ? (
                /* Custom Ink Definition Form */
                <form onSubmit={handleCreateCustomInk} className="max-w-md mx-auto space-y-4 py-2">
                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Formular Nueva Tinta Plana / Spot Especial</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">
                        Nombre de la Tinta:
                      </label>
                      <input
                        type="text"
                        required
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Ej. Pantone 219 C (Rosa Barbie) / Tinta Verde Jade"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1">
                          Código Pantone / Referencia:
                        </label>
                        <input
                          type="text"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value)}
                          placeholder="Ej. 219 C"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1">
                          Ángulo de Trama (°):
                        </label>
                        <select
                          value={customAngle}
                          onChange={(e) => setCustomAngle(parseInt(e.target.value))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="45">45° (Estándar para tinta dominante)</option>
                          <option value="75">75° (Magenta / Rojos)</option>
                          <option value="15">15° (Cyan / Azules)</option>
                          <option value="0">0° (Amarillos / Barnices)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">
                        Color Visual (Hex / Selector):
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customHex}
                          onChange={(e) => setCustomHex(e.target.value)}
                          className="w-10 h-8 rounded border border-neutral-700 bg-neutral-900 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customHex}
                          onChange={(e) => setCustomHex(e.target.value)}
                          className="w-28 font-mono bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white uppercase"
                        />
                        <span className="text-[11px] font-mono text-neutral-400">
                          {(() => {
                            const c = hexToCmyk(customHex);
                            return `C:${c.c}% M:${c.m}% Y:${c.y}% K:${c.k}%`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar e Insertar Tinta al Pliego
                  </button>
                </form>
              ) : (
                /* Filtered Pantone Cards Grid */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span>Resultados de la biblioteca ({filteredSpots.length} tintas disponibles):</span>
                  </div>

                  {filteredSpots.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      No se encontraron tintas con el término "{searchQuery}". Puedes crearla en "+ Crear Tinta Personalizada".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredSpots.map((spot) => {
                        const isAlreadyAdded = inks.some(
                          (i) => i.id === spot.id || (i.pantoneCode && i.pantoneCode === spot.pantoneCode)
                        );

                        return (
                          <div
                            key={spot.id}
                            className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 transition-colors flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  {/* Swatch */}
                                  <div
                                    className="w-6 h-6 rounded border border-white/20 shadow-xs shrink-0"
                                    style={{ backgroundColor: spot.hex }}
                                  />
                                  <div>
                                    <h4 className="text-xs font-semibold text-neutral-200 leading-snug">
                                      {spot.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                                        {spot.pantoneCode}
                                      </span>
                                      <span className="text-[9px] text-neutral-500 font-mono">
                                        · {spot.categoryLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {isAlreadyAdded ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                    ✓ En Pliego
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAddSpotInk(spot)}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors whitespace-nowrap shadow-xs flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Añadir
                                  </button>
                                )}
                              </div>

                              <p className="text-[10px] text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                                {spot.description}
                              </p>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[9px] font-mono text-neutral-500">
                              <span>Simulado: C:{spot.cmyk.c} M:{spot.cmyk.m} Y:{spot.cmyk.y} K:{spot.cmyk.k}</span>
                              <span>{spot.hex.toUpperCase()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[11px]">
                {inks.length} placas de tinta configuradas en este trabajo
              </span>
              <button
                onClick={() => setShowAddSpotModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
