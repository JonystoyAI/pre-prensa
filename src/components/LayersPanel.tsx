import React, { useState, useMemo } from 'react';
import { VectorElement, InkColor } from '../types/prepress';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Trash2,
  Copy,
  Search,
  Type,
  Square,
  Circle,
  PenTool,
  AlignJustify,
  Stamp,
  Hash,
  GripVertical,
  Edit2,
  Check,
  X,
  Droplets,
  Filter,
} from 'lucide-react';

interface LayersPanelProps {
  elements: VectorElement[];
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  inks: InkColor[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onElementsChange?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  setElements,
  inks,
  selectedElementId,
  setSelectedElementId,
  onElementsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterInkId, setFilterInkId] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [openInkSelectorId, setOpenInkSelectorId] = useState<string | null>(null);

  // Helper to generate a descriptive default label
  const getElementLabel = (el: VectorElement): string => {
    if (el.name && el.name.trim().length > 0) return el.name;
    switch (el.type) {
      case 'text':
        return el.text
          ? `Texto: "${el.text.substring(0, 20)}${el.text.length > 20 ? '…' : ''}"`
          : 'Caja de Texto';
      case 'folio':
        return `Folio: ${el.folioPrefix || 'No.'} ${(el.folioStartNumber || 1)
          .toString()
          .padStart(el.folioDigits || 4, '0')}`;
      case 'watermark':
        return `Marca de Agua: "${el.text || 'ORIGINAL'}" (${Math.round((el.fillOpacity || 0.06) * 100)}%)`;
      case 'rulings':
        return `Tabla Renglones (${el.rowCount || 6} filas)`;
      case 'rect':
        return `Rectángulo (${Math.round(el.width)}×${Math.round(el.height)} mm)`;
      case 'circle':
        return `Elipse/Círculo (Ø ${Math.round(el.width)} mm)`;
      case 'path':
        return `Trazado Bézier (${el.nodes?.length || 0} nodos)`;
      case 'line':
        return `Línea Vectorial`;
      default:
        return `Elemento Vectorial`;
    }
  };

  // Helper to get type icon
  const renderTypeIcon = (type: VectorElement['type']) => {
    switch (type) {
      case 'text':
        return <Type className="w-3.5 h-3.5 text-sky-400" />;
      case 'folio':
        return <Hash className="w-3.5 h-3.5 text-red-400" />;
      case 'watermark':
        return <Stamp className="w-3.5 h-3.5 text-neutral-400" />;
      case 'rulings':
        return <AlignJustify className="w-3.5 h-3.5 text-emerald-400" />;
      case 'rect':
        return <Square className="w-3.5 h-3.5 text-amber-400" />;
      case 'circle':
        return <Circle className="w-3.5 h-3.5 text-amber-400" />;
      case 'path':
        return <PenTool className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  // Toggle visibility of one element
  const toggleVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
      )
    );
    onElementsChange?.();
  };

  // Toggle lock of one element
  const toggleLock = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el))
    );
    onElementsChange?.();
  };

  // Bulk actions
  const toggleAllVisibility = (visible: boolean) => {
    setElements((prev) => prev.map((el) => ({ ...el, visible })));
    onElementsChange?.();
  };

  const toggleAllLocks = (locked: boolean) => {
    setElements((prev) => prev.map((el) => ({ ...el, locked })));
    onElementsChange?.();
  };

  // Layer Reordering (Z-Index operations)
  // Bring to Front (highest z-index / end of array)
  const bringToFront = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
    onElementsChange?.();
  };

  // Send to Back (lowest z-index / start of array)
  const sendToBack = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      if (idx === -1 || idx === 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
    onElementsChange?.();
  };

  // Move Up 1 level (towards front)
  const moveUp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
    onElementsChange?.();
  };

  // Move Down 1 level (towards back)
  const moveDown = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
    onElementsChange?.();
  };

  // Duplicate element
  const duplicateElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const source = elements.find((el) => el.id === id);
    if (!source) return;

    const cloned: VectorElement = {
      ...JSON.parse(JSON.stringify(source)),
      id: `${source.type}-${Date.now()}`,
      name: source.name ? `${source.name} (Copia)` : `${getElementLabel(source)} (Copia)`,
      x: Number((source.x + 3).toFixed(1)),
      y: Number((source.y + 3).toFixed(1)),
      locked: false,
    };

    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, cloned);
      return next;
    });
    setSelectedElementId(cloned.id);
    onElementsChange?.();
  };

  // Delete element
  const deleteElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = elements.find((el) => el.id === id);
    if (target?.locked) return;

    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    onElementsChange?.();
  };

  // Reassign Ink
  const reassignInk = (elementId: string, newInkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== elementId) return el;
        const targetInk = inks.find((i) => i.id === newInkId);
        const updated: VectorElement = {
          ...el,
          inkId: newInkId,
        };
        // Update stroke/fill if it wasn't none
        if (el.stroke !== 'none' && targetInk) {
          updated.stroke = targetInk.hex;
        }
        if (el.fill !== 'none' && targetInk && el.type !== 'rect') {
          updated.fill = targetInk.hex;
        }
        return updated;
      })
    );
    setOpenInkSelectorId(null);
    onElementsChange?.();
  };

  // Save custom name
  const saveName = (id: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, name: editingName.trim() } : el))
    );
    setEditingId(null);
    setEditingName('');
    onElementsChange?.();
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedElementId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (indexInReversedList: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(indexInReversedList);
  };

  const handleDrop = (targetIndexInReversedList: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceId = draggedElementId || e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    // Convert reversed list index back to real elements array index
    // In reversed list: index 0 is elements.length - 1
    // realIndex = elements.length - 1 - indexInReversedList
    const targetRealIndex = elements.length - 1 - targetIndexInReversedList;

    setElements((prev) => {
      const sourceRealIndex = prev.findIndex((el) => el.id === sourceId);
      if (sourceRealIndex === -1 || sourceRealIndex === targetRealIndex) return prev;

      const next = [...prev];
      const [draggedItem] = next.splice(sourceRealIndex, 1);
      next.splice(targetRealIndex, 0, draggedItem);
      return next;
    });

    setDraggedElementId(null);
    onElementsChange?.();
  };

  // Filtering elements
  const filteredElements = useMemo(() => {
    return elements.filter((el) => {
      // Query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const label = getElementLabel(el).toLowerCase();
        const textContent = (el.text || '').toLowerCase();
        const ink = inks.find((i) => i.id === el.inkId);
        const inkName = (ink?.name || '').toLowerCase();
        const matchesQuery =
          label.includes(q) ||
          textContent.includes(q) ||
          inkName.includes(q) ||
          el.type.includes(q);
        if (!matchesQuery) return false;
      }

      // Type filter
      if (filterType !== 'all') {
        if (filterType === 'textos' && !['text', 'folio', 'watermark'].includes(el.type)) {
          return false;
        }
        if (filterType === 'formas' && !['rect', 'circle', 'path', 'line'].includes(el.type)) {
          return false;
        }
        if (filterType === 'tablas' && el.type !== 'rulings') {
          return false;
        }
        if (filterType === 'marcas_agua' && el.type !== 'watermark') {
          return false;
        }
      }

      // Ink filter
      if (filterInkId !== 'all' && el.inkId !== filterInkId) {
        return false;
      }

      return true;
    });
  }, [elements, searchQuery, filterType, filterInkId, inks]);

  // Display list: in CAD/graphics software, top layer = frontmost object (highest array index)
  // So we reverse the array for display in the layer list.
  const reversedList = useMemo(() => {
    return [...filteredElements].reverse();
  }, [filteredElements]);

  // Summary counts
  const totalCount = elements.length;
  const visibleCount = elements.filter((el) => el.visible !== false).length;
  const lockedCount = elements.filter((el) => el.locked === true).length;
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-neutral-900/95">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
              <span>Gestor de Capas</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
                {totalCount}
              </span>
            </h2>
            <p className="text-[10px] text-neutral-400 font-mono">
              {visibleCount} visibles · {lockedCount} bloqueadas
            </p>
          </div>
        </div>

        {/* Global Bulk Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleAllVisibility(visibleCount !== totalCount)}
            className={`p-1.5 rounded transition-colors ${
              visibleCount === 0
                ? 'bg-neutral-800 text-neutral-500 hover:text-white'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title={visibleCount === totalCount ? 'Ocultar todas las capas' : 'Mostrar todas las capas'}
          >
            {visibleCount === 0 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => toggleAllLocks(lockedCount !== totalCount)}
            className={`p-1.5 rounded transition-colors ${
              lockedCount === totalCount
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title={lockedCount === totalCount ? 'Desbloquear todas las capas' : 'Bloquear todas las capas'}
          >
            {lockedCount === totalCount ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Search and Filters Strip */}
      <div className="p-2.5 border-b border-neutral-800 space-y-2 bg-neutral-950/40">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, texto o tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Type & Ink Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'textos', label: 'Textos' },
            { id: 'formas', label: 'Formas' },
            { id: 'tablas', label: 'Tablas' },
            { id: 'marcas_agua', label: 'Agua' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2 py-0.5 rounded-sm whitespace-nowrap border transition-colors ${
                filterType === f.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Ink Filter dropdown if more than 1 ink */}
        {inks.length > 1 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Filter className="w-3 h-3 text-neutral-500 shrink-0" />
            <select
              value={filterInkId}
              onChange={(e) => setFilterInkId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] focus:outline-hidden focus:border-amber-500/50"
            >
              <option value="all">Filtrar por Tinta: Todas las tintas ({inks.length})</option>
              {inks.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.isSpot ? `[Spot] ${i.pantoneCode || i.name}` : `[Proceso] ${i.name}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Layer Stack Level Indicator */}
      <div className="px-3 py-1 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center justify-between text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
        <span>▲ Al Frente (Superficie)</span>
        <span>Reordenar / Z-Index</span>
      </div>

      {/* Layers List (Scrollable) */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/50 p-1.5 space-y-1">
        {reversedList.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-neutral-500">
            <Layers className="w-8 h-8 mb-2 opacity-40 text-neutral-400" />
            <p className="text-xs font-medium text-neutral-400">Sin elementos coincidentes</p>
            <p className="text-[10px] text-neutral-600 mt-1">
              {searchQuery || filterType !== 'all' || filterInkId !== 'all'
                ? 'Prueba limpiando los filtros de búsqueda'
                : 'Usa las herramientas de dibujo para crear trazados y textos'}
            </p>
          </div>
        ) : (
          reversedList.map((el, revIndex) => {
            const isSelected = el.id === selectedElementId;
            const isHidden = el.visible === false;
            const isLocked = el.locked === true;
            const ink = inks.find((i) => i.id === el.inkId) || inks[0];
            const realIndex = elements.findIndex((item) => item.id === el.id);
            const isTop = realIndex === elements.length - 1;
            const isBottom = realIndex === 0;

            return (
              <div
                key={el.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(el.id, e)}
                onDragOver={(e) => handleDragOver(revIndex, e)}
                onDrop={(e) => handleDrop(revIndex, e)}
                onClick={() => setSelectedElementId(el.id)}
                className={`group relative rounded-md border p-2 text-xs transition-all cursor-pointer ${
                  dragOverIndex === revIndex ? 'border-amber-500 bg-amber-500/10' : ''
                } ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-xs'
                    : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/60 hover:border-neutral-700'
                } ${isHidden ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className="flex items-center gap-2">
                  {/* Drag Handle */}
                  <div
                    className={`cursor-grab active:cursor-grabbing text-neutral-600 group-hover:text-neutral-400 p-0.5 ${
                      isLocked ? 'invisible' : ''
                    }`}
                    title="Arrastra para reordenar el nivel de capa"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Type Icon */}
                  <div className="p-1 rounded bg-neutral-950 border border-neutral-800 shrink-0">
                    {renderTypeIcon(el.type)}
                  </div>

                  {/* Main Element Info / Inline Renaming */}
                  <div className="flex-1 min-w-0">
                    {editingId === el.id ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName(el.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full bg-neutral-950 border border-amber-500/80 rounded px-1.5 py-0.5 text-xs text-white focus:outline-hidden"
                        />
                        <button
                          onClick={() => saveName(el.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-neutral-500 hover:text-neutral-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-medium truncate ${
                            isSelected ? 'text-white' : 'text-neutral-200'
                          } ${isHidden ? 'line-through text-neutral-500' : ''}`}
                          title={getElementLabel(el)}
                        >
                          {getElementLabel(el)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(el.id);
                            setEditingName(el.name || getElementLabel(el));
                          }}
                          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 p-0.5 transition-opacity"
                          title="Renombrar capa"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Metadata line: Dimensions & Ink */}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-neutral-400">
                      <span>
                        {Math.round(el.width)}×{Math.round(el.height)} mm
                      </span>
                      <span className="text-neutral-700">·</span>

                      {/* Ink Tag */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenInkSelectorId(openInkSelectorId === el.id ? null : el.id);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-[9px] transition-colors"
                        title="Click para reasignar tinta"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: ink?.hex || '#000' }}
                        />
                        <span className="truncate max-w-20">
                          {ink?.isSpot ? ink.pantoneCode || ink.name : ink?.name || 'Tinta'}
                        </span>
                      </button>

                      {el.strokeWidthMm > 0 && (
                        <>
                          <span className="text-neutral-700">·</span>
                          <span className="text-neutral-500">
                            {el.strokeWidthMm}mm
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Visibility, Lock, Reorder */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Visibility Toggle */}
                    <button
                      onClick={(e) => toggleVisibility(el.id, e)}
                      className={`p-1 rounded transition-colors ${
                        isHidden
                          ? 'text-neutral-600 hover:text-neutral-400'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title={isHidden ? 'Mostrar capa' : 'Ocultar capa'}
                    >
                      {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      onClick={(e) => toggleLock(el.id, e)}
                      className={`p-1 rounded transition-colors ${
                        isLocked
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                      title={isLocked ? 'Desbloquear capa' : 'Bloquear capa'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Ink Reassignment Popover Menu */}
                {openInkSelectorId === el.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 p-2 bg-neutral-950 border border-neutral-700 rounded shadow-xl text-xs space-y-1.5 z-30"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800 pb-1">
                      <span>Reasignar a placa de tinta:</span>
                      <button
                        onClick={() => setOpenInkSelectorId(null)}
                        className="text-neutral-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                      {inks.map((i) => (
                        <button
                          key={i.id}
                          onClick={(e) => reassignInk(el.id, i.id, e)}
                          className={`flex items-center justify-between px-2 py-1 rounded text-left transition-colors text-[11px] ${
                            el.inkId === i.id
                              ? 'bg-amber-500/20 text-amber-300 font-semibold'
                              : 'hover:bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-neutral-700"
                              style={{ backgroundColor: i.hex }}
                            />
                            <span>{i.name}</span>
                          </div>
                          {i.isSpot && (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded">
                              SPOT
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-toolbar for the Selected Layer */}
                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-neutral-400"
                  >
                    {/* Z-Index Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        disabled={isTop || isLocked}
                        onClick={(e) => bringToFront(el.id, e)}
                        className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Traer al frente (Nivel máximo)"
                      >
                        <ArrowUpToLine className="w-3 h-3" />
                      </button>
                      <button
                        disabled={isTop || isLocked}
                        onClick={(e) => moveUp(el.id, e)}
                        className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Subir un nivel"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={isBottom || isLocked}
                        onClick={(e) => moveDown(el.id, e)}
                        className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Bajar un nivel"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={isBottom || isLocked}
                        onClick={(e) => sendToBack(el.id, e)}
                        className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Enviar al fondo (Nivel mínimo)"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Secondary Actions: Duplicate & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => duplicateElement(el.id, e)}
                        className="p-1 rounded hover:bg-neutral-800 hover:text-white text-neutral-400"
                        title="Duplicar elemento"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      <button
                        disabled={isLocked}
                        onClick={(e) => deleteElement(el.id, e)}
                        className="p-1 rounded hover:bg-red-950/60 hover:text-red-400 text-neutral-400 disabled:opacity-30 disabled:pointer-events-none"
                        title="Eliminar elemento"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Layer Stack Level Bottom Indicator */}
      <div className="px-3 py-1 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center justify-between text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
        <span>▼ Al Fondo (Base del Pliego)</span>
        <span>{filteredElements.length} de {elements.length} capas</span>
      </div>

      {/* Bottom Summary Bar & Quick Actions for Selected Element */}
      {selectedElement && (
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/90 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-neutral-400 uppercase">
              Capa Activa:
            </span>
            <span className="font-mono text-[10px] text-amber-400 truncate max-w-40">
              {getElementLabel(selectedElement)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => duplicateElement(selectedElement.id)}
              className="py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center gap-1.5 text-[11px] font-medium"
            >
              <Copy className="w-3 h-3" />
              <span>Duplicar</span>
            </button>

            <button
              disabled={selectedElement.locked}
              onClick={() => deleteElement(selectedElement.id)}
              className="py-1 px-2 rounded bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 text-red-400 flex items-center justify-center gap-1.5 text-[11px] font-medium disabled:opacity-30 disabled:pointer-events-none"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
