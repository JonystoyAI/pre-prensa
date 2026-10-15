import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DocumentDimensions,
  InkColor,
  ToolType,
  VectorElement,
  BezierNode,
} from '../types/prepress';
import { MM_TO_PX, PX_TO_MM } from '../utils/prepressCalculations';
import { ZoomIn, ZoomOut, Maximize2, Trash2, Lock } from 'lucide-react';

interface VectorCanvasProps {
  document: DocumentDimensions;
  elements: VectorElement[];
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  inks: InkColor[];
  activeInkId: string;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  viewMode: 'composite' | 'single_color' | 'positive_film';
  isolatedInkId: string | null;
  onElementsChange?: () => void;
}

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  document: doc,
  elements,
  setElements,
  activeTool,
  setActiveTool,
  inks,
  activeInkId,
  selectedElementId,
  setSelectedElementId,
  viewMode,
  isolatedInkId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 60 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState<boolean>(false);

  // Cursor position in document mm
  const [mouseMm, setMouseMm] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Creation / Dragging state
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'resize' | null>(null);
  const [dragStartMm, setDragStartMm] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElRect, setInitialElRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);

  // Pen tool drawing path in progress
  const [penNodes, setPenNodes] = useState<BezierNode[]>([]);

  // Node editing state
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);

  // Keyboard events for Space (pan), Delete, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          const targetEl = elements.find((el) => el.id === selectedElementId);
          if (targetEl && !targetEl.locked) {
            setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
            setSelectedElementId(null);
          }
        }
      } else if (e.key === 'Escape') {
        if (penNodes.length > 0) {
          setPenNodes([]);
        }
        setSelectedElementId(null);
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('node');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rect');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('circle');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('rulings');
      } else if (e.key.toLowerCase() === 'f') {
        setActiveTool('folio');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('text');
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTool('watermark');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed, selectedElementId, penNodes, setActiveTool, setElements, setSelectedElementId]);

  // Convert screen client coordinates to document mm
  const clientToDocMm = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left - pan.x;
      const screenY = clientY - rect.top - pan.y;
      const mmX = (screenX / (MM_TO_PX * zoom));
      const mmY = (screenY / (MM_TO_PX * zoom));
      return { x: mmX, y: mmY };
    },
    [pan, zoom]
  );

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(0.3, Math.min(4.0, zoom * zoomFactor));

    // Zoom centered on cursor
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - ((mouseX - pan.x) * newZoom) / zoom;
      const newPanY = mouseY - ((mouseY - pan.y) * newZoom) / zoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // If middle click or space key: start panning
    if (e.button === 1 || spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only primary click

    const pt = clientToDocMm(e.clientX, e.clientY);

    // Tool: Pen
    if (activeTool === 'pen') {
      // Check if clicking near start node to close path
      if (penNodes.length > 2) {
        const start = penNodes[0];
        const dist = Math.hypot(pt.x - start.x, pt.y - start.y);
        if (dist < 4) {
          // Close path!
          const newPathEl: VectorElement = {
            id: `path-${Date.now()}`,
            type: 'path',
            inkId: activeInkId,
            x: 0,
            y: 0,
            width: doc.widthMm,
            height: doc.heightMm,
            rotationDeg: 0,
            nodes: [...penNodes],
            closed: true,
            fill: 'none',
            fillOpacity: 1.0,
            stroke: inks.find((i) => i.id === activeInkId)?.hex || '#000000',
            strokeWidthMm: 0.35,
          };
          setElements((prev) => [...prev, newPathEl]);
          setPenNodes([]);
          setSelectedElementId(newPathEl.id);
          setActiveTool('select');
          return;
        }
      }

      setPenNodes((prev) => [...prev, { x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)) }]);
      return;
    }

    // Tool: Rulings (Drop sales note rulings)
    if (activeTool === 'rulings') {
      const newRulings: VectorElement = {
        id: `rulings-${Date.now()}`,
        type: 'rulings',
        inkId: activeInkId,
        x: Math.max(10, Number(pt.x.toFixed(1))),
        y: Math.max(20, Number(pt.y.toFixed(1))),
        width: Math.min(doc.widthMm - 20, 160),
        height: 64,
        rotationDeg: 0,
        rowCount: 8,
        rowSpacingMm: 8.0,
        fill: 'none',
        fillOpacity: 1.0,
        stroke: inks.find((i) => i.id === activeInkId)?.hex || '#1e293b',
        strokeWidthMm: 0.25,
      };
      setElements((prev) => [...prev, newRulings]);
      setSelectedElementId(newRulings.id);
      setActiveTool('select');
      return;
    }

    // Tool: Folio Box
    if (activeTool === 'folio') {
      const newFolio: VectorElement = {
        id: `folio-${Date.now()}`,
        type: 'folio',
        inkId: activeInkId,
        x: Math.min(doc.widthMm - 50, Number(pt.x.toFixed(1))),
        y: Math.max(12, Number(pt.y.toFixed(1))),
        width: 44,
        height: 14,
        rotationDeg: 0,
        folioPrefix: 'N° A-',
        folioStartNumber: 101,
        folioDigits: 6,
        fill: 'none',
        fillOpacity: 1.0,
        stroke: '#dc2626',
        strokeWidthMm: 0.35,
      };
      setElements((prev) => [...prev, newFolio]);
      setSelectedElementId(newFolio.id);
      setActiveTool('select');
      return;
    }

    // Tool: Text
    if (activeTool === 'text') {
      const newText: VectorElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        inkId: activeInkId,
        x: Number(pt.x.toFixed(1)),
        y: Number(pt.y.toFixed(1)),
        width: 60,
        height: 10,
        rotationDeg: 0,
        text: 'NOTA DE VENTA',
        fontSizePt: 14,
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 'bold',
        fill: inks.find((i) => i.id === activeInkId)?.hex || '#111827',
        fillOpacity: 1.0,
        stroke: 'none',
        strokeWidthMm: 0,
      };
      setElements((prev) => [...prev, newText]);
      setSelectedElementId(newText.id);
      setActiveTool('select');
      return;
    }

    // Tool: Watermark (Defaults to safe 6% opacity)
    if (activeTool === 'watermark') {
      const newWm: VectorElement = {
        id: `wm-${Date.now()}`,
        type: 'watermark',
        inkId: activeInkId,
        x: Math.round(doc.widthMm * 0.25),
        y: Math.round(doc.heightMm * 0.55),
        width: 90,
        height: 30,
        rotationDeg: -15,
        text: 'ORIGINAL',
        fontSizePt: 36,
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 'bold',
        fill: '#000000',
        fillOpacity: 0.06, // 6% Safe watermark tint!
        stroke: 'none',
        strokeWidthMm: 0,
      };
      setElements((prev) => [...prev, newWm]);
      setSelectedElementId(newWm.id);
      setActiveTool('select');
      return;
    }

    // Tool: Rect or Circle creation
    if (activeTool === 'rect' || activeTool === 'circle') {
      setDragMode('create');
      setDragStartMm(pt);
      const newEl: VectorElement = {
        id: `el-${Date.now()}`,
        type: activeTool,
        inkId: activeInkId,
        x: pt.x,
        y: pt.y,
        width: 1,
        height: 1,
        rotationDeg: 0,
        fill: 'none',
        fillOpacity: 1.0,
        stroke: inks.find((i) => i.id === activeInkId)?.hex || '#111827',
        strokeWidthMm: 0.35,
      };
      setElements((prev) => [...prev, newEl]);
      setSelectedElementId(newEl.id);
      return;
    }

    // In Select or Node tool: check if clicking on canvas background to deselect
    if (activeTool === 'select') {
      setSelectedElementId(null);
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = clientToDocMm(e.clientX, e.clientY);
    setMouseMm({ x: Number(pt.x.toFixed(1)), y: Number(pt.y.toFixed(1)) });

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!dragMode || !selectedElementId) return;

    if (dragMode === 'create') {
      const currentPt = clientToDocMm(e.clientX, e.clientY);
      const w = Math.abs(currentPt.x - dragStartMm.x);
      const h = Math.abs(currentPt.y - dragStartMm.y);
      const x = Math.min(currentPt.x, dragStartMm.x);
      const y = Math.min(currentPt.y, dragStartMm.y);

      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElementId
            ? { ...el, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), width: Math.max(1, Number(w.toFixed(1))), height: Math.max(1, Number(h.toFixed(1))) }
            : el
        )
      );
    } else if (dragMode === 'move' && initialElRect) {
      const deltaX = pt.x - dragStartMm.x;
      const deltaY = pt.y - dragStartMm.y;

      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElementId
            ? {
                ...el,
                x: Number((initialElRect.x + deltaX).toFixed(1)),
                y: Number((initialElRect.y + deltaY).toFixed(1)),
              }
            : el
        )
      );
    } else if (dragMode === 'resize' && initialElRect && resizeCorner) {
      const deltaX = pt.x - dragStartMm.x;
      const deltaY = pt.y - dragStartMm.y;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          let newX = initialElRect.x;
          let newY = initialElRect.y;
          let newW = initialElRect.w;
          let newH = initialElRect.h;

          if (resizeCorner === 'br') {
            newW = Math.max(2, initialElRect.w + deltaX);
            newH = Math.max(2, initialElRect.h + deltaY);
          } else if (resizeCorner === 'tr') {
            newW = Math.max(2, initialElRect.w + deltaX);
            newY = initialElRect.y + deltaY;
            newH = Math.max(2, initialElRect.h - deltaY);
          } else if (resizeCorner === 'bl') {
            newX = initialElRect.x + deltaX;
            newW = Math.max(2, initialElRect.w - deltaX);
            newH = Math.max(2, initialElRect.h + deltaY);
          } else if (resizeCorner === 'tl') {
            newX = initialElRect.x + deltaX;
            newY = initialElRect.y + deltaY;
            newW = Math.max(2, initialElRect.w - deltaX);
            newH = Math.max(2, initialElRect.h - deltaY);
          }

          return {
            ...el,
            x: Number(newX.toFixed(1)),
            y: Number(newY.toFixed(1)),
            width: Number(newW.toFixed(1)),
            height: Number(newH.toFixed(1)),
          };
        })
      );
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragMode === 'create') {
      setActiveTool('select');
    }
    setDragMode(null);
    setInitialElRect(null);
    setResizeCorner(null);
  };

  // Element click handler
  const handleElementMouseDown = (e: React.MouseEvent, el: VectorElement) => {
    if (activeTool !== 'select' && activeTool !== 'node') return;
    e.stopPropagation();

    setSelectedElementId(el.id);
    if (el.locked) {
      // Locked elements cannot be moved or dragged
      return;
    }
    setDragMode('move');
    const pt = clientToDocMm(e.clientX, e.clientY);
    setDragStartMm(pt);
    setInitialElRect({ x: el.x, y: el.y, w: el.width, h: el.height });
  };

  // Resize handle click handler
  const handleResizeHandleDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'br' | 'bl') => {
    e.stopPropagation();
    const selected = elements.find((el) => el.id === selectedElementId);
    if (!selected || selected.locked) return;

    setDragMode('resize');
    setResizeCorner(corner);
    const pt = clientToDocMm(e.clientX, e.clientY);
    setDragStartMm(pt);
    setInitialElRect({ x: selected.x, y: selected.y, w: selected.width, h: selected.height });
  };

  // Fit to screen helper
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 120) / (doc.widthMm * MM_TO_PX);
    const scaleY = (rect.height - 120) / (doc.heightMm * MM_TO_PX);
    const fitScale = Math.min(scaleX, scaleY, 1.8);
    setZoom(fitScale);
    setPan({
      x: (rect.width - doc.widthMm * MM_TO_PX * fitScale) / 2,
      y: (rect.height - doc.heightMm * MM_TO_PX * fitScale) / 2,
    });
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Compute millimeter rulers
  const rulerTicksX = [];
  const maxX = Math.ceil(doc.widthMm + 20);
  for (let x = 0; x <= maxX; x += 10) {
    rulerTicksX.push(x);
  }

  const rulerTicksY = [];
  const maxY = Math.ceil(doc.heightMm + 20);
  for (let y = 0; y <= maxY; y += 10) {
    rulerTicksY.push(y);
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative flex-1 h-full bg-neutral-950 overflow-hidden select-none ${
        spacePressed ? 'cursor-grab active:cursor-grabbing' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Top Floating Zoom & Fit Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-md p-1 shadow-lg backdrop-blur-sm text-neutral-300">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          title="Alejar zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono tabular-nums px-2 min-w-14 text-center text-neutral-200">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          title="Acercar zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-neutral-800 mx-0.5" />

        <button
          onClick={handleFitToScreen}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          title="Ajustar al pliego"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {selectedElement && !selectedElement.locked && (
          <>
            <div className="w-px h-4 bg-neutral-800 mx-0.5" />
            <button
              onClick={() => {
                setElements((prev) => prev.filter((el) => el.id !== selectedElement.id));
                setSelectedElementId(null);
              }}
              className="p-1.5 hover:bg-red-950 text-red-400 rounded"
              title="Eliminar elemento (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Floating Bottom Metric Bar */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 rounded px-3 py-1.5 text-xs font-mono tabular-nums text-neutral-400 backdrop-blur-sm">
        <span>X: <strong className="text-neutral-200">{mouseMm.x}</strong> mm</span>
        <span aria-hidden="true" className="text-neutral-700">|</span>
        <span>Y: <strong className="text-neutral-200">{mouseMm.y}</strong> mm</span>
        {selectedElement && (
          <>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <span>W: <strong className="text-amber-400">{selectedElement.width}</strong> mm</span>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <span>H: <strong className="text-amber-400">{selectedElement.height}</strong> mm</span>
          </>
        )}
      </div>

      {/* Main SVG Coordinate Canvas */}
      <div
        className="absolute origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Bleed outline (3mm extra on all sides) */}
        <div
          className="absolute border border-dashed border-red-500/30 pointer-events-none"
          style={{
            left: `${-doc.bleedMm * MM_TO_PX}px`,
            top: `${-doc.bleedMm * MM_TO_PX}px`,
            width: `${(doc.widthMm + doc.bleedMm * 2) * MM_TO_PX}px`,
            height: `${(doc.heightMm + doc.bleedMm * 2) * MM_TO_PX}px`,
          }}
        >
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-red-400/60 uppercase">
            Rebase 3mm
          </span>
        </div>

        {/* Paper Artboard (Physical sheet of paper in white) */}
        <div
          className="relative bg-white shadow-2xl border border-neutral-300"
          style={{
            width: `${doc.widthMm * MM_TO_PX}px`,
            height: `${doc.heightMm * MM_TO_PX}px`,
          }}
        >
          {/* Gripper margin indicator (0.8 cm / 8 mm on lead edge) */}
          <div
            className="absolute top-0 left-0 w-full bg-amber-500/10 border-b border-dashed border-amber-500 pointer-events-none z-10 overflow-hidden flex items-center justify-between px-2"
            style={{ height: `${doc.gripperMarginMm * MM_TO_PX}px` }}
          >
            <span className="text-[9px] font-mono font-semibold text-amber-700 uppercase tracking-wider">
              Pinza de Máquina: {doc.gripperMarginMm} mm (Zona no imprimible)
            </span>
            <span className="text-[9px] font-mono text-amber-700/80">
              0.8 cm
            </span>
          </div>

          {/* Safe Margins (4mm) */}
          <div
            className="absolute border border-dashed border-sky-400/40 pointer-events-none"
            style={{
              left: `${doc.safeMarginMm * MM_TO_PX}px`,
              top: `${doc.safeMarginMm * MM_TO_PX}px`,
              width: `${(doc.widthMm - doc.safeMarginMm * 2) * MM_TO_PX}px`,
              height: `${(doc.heightMm - doc.safeMarginMm * 2) * MM_TO_PX}px`,
            }}
          />

          {/* SVG Vector Elements Container */}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox={`0 0 ${doc.widthMm} ${doc.heightMm}`}
          >
            {/* Render Vector Elements */}
            {elements.map((el) => {
              if (el.visible === false) return null;

              const ink = inks.find((i) => i.id === el.inkId);
              if (ink && !ink.visible) return null;

              // If single color or positive film view is active:
              if (viewMode === 'single_color' && isolatedInkId && el.inkId !== isolatedInkId) {
                return null;
              }

              const isPositiveFilm = viewMode === 'positive_film';
              const isSelected = el.id === selectedElementId;

              const renderFill =
                el.fill === 'none'
                  ? 'none'
                  : isPositiveFilm
                  ? '#000000'
                  : el.fill;

              const renderStroke =
                el.stroke === 'none'
                  ? 'none'
                  : isPositiveFilm
                  ? '#000000'
                  : isSelected
                  ? '#0284c7'
                  : el.stroke;

              if (el.type === 'rect') {
                return (
                  <rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    fill={renderFill}
                    fillOpacity={el.fillOpacity}
                    stroke={renderStroke}
                    strokeWidth={isSelected ? Math.max(0.4, el.strokeWidthMm) : el.strokeWidthMm}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  />
                );
              }

              if (el.type === 'circle') {
                const rx = el.width / 2;
                const ry = el.height / 2;
                return (
                  <ellipse
                    key={el.id}
                    cx={el.x + rx}
                    cy={el.y + ry}
                    rx={rx}
                    ry={ry}
                    fill={renderFill}
                    fillOpacity={el.fillOpacity}
                    stroke={renderStroke}
                    strokeWidth={el.strokeWidthMm}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  />
                );
              }

              if (el.type === 'rulings') {
                const rows = el.rowCount || 6;
                const spacing = el.rowSpacingMm || 8;
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  >
                    {/* Bounding box hit area */}
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={rows * spacing}
                      fill="transparent"
                    />
                    {Array.from({ length: rows }).map((_, r) => {
                      const lineY = el.y + r * spacing;
                      return (
                        <line
                          key={r}
                          x1={el.x}
                          y1={lineY}
                          x2={el.x + el.width}
                          y2={lineY}
                          stroke={renderStroke}
                          strokeWidth={el.strokeWidthMm}
                        />
                      );
                    })}
                  </g>
                );
              }

              if (el.type === 'folio') {
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      fill={renderFill}
                      stroke={renderStroke}
                      strokeWidth={el.strokeWidthMm}
                    />
                    <text
                      x={el.x + 3}
                      y={el.y + el.height - 4}
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="4.2"
                      fontWeight="bold"
                      fill={isPositiveFilm ? '#000000' : '#dc2626'}
                    >
                      {(el.folioPrefix || 'N° ') +
                        (el.folioStartNumber || 1)
                          .toString()
                          .padStart(el.folioDigits || 6, '0')}
                    </text>
                  </g>
                );
              }

              if (el.type === 'text') {
                const sizeMm = (el.fontSizePt || 12) * 0.3527;
                return (
                  <text
                    key={el.id}
                    x={el.x}
                    y={el.y + sizeMm}
                    fontFamily={el.fontFamily || 'Plus Jakarta Sans, sans-serif'}
                    fontSize={sizeMm}
                    fontWeight={el.fontWeight || 'normal'}
                    fill={renderFill}
                    fillOpacity={el.fillOpacity}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer select-none"
                  >
                    {el.text}
                  </text>
                );
              }

              if (el.type === 'watermark') {
                return (
                  <g
                    key={el.id}
                    transform={`rotate(${el.rotationDeg}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`}
                    opacity={el.fillOpacity}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  >
                    <text
                      x={el.x}
                      y={el.y + 12}
                      fontFamily={el.fontFamily || 'Plus Jakarta Sans'}
                      fontSize="14"
                      fontWeight="bold"
                      fill={renderFill}
                      letterSpacing="2"
                    >
                      {el.text || 'ORIGINAL'}
                    </text>
                  </g>
                );
              }

              if (el.type === 'path' && el.nodes && el.nodes.length > 0) {
                let d = `M ${el.nodes[0].x} ${el.nodes[0].y}`;
                for (let i = 1; i < el.nodes.length; i++) {
                  const curr = el.nodes[i];
                  const prev = el.nodes[i - 1];
                  if (prev.handleOut && curr.handleIn) {
                    d += ` C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.x} ${curr.y}`;
                  } else {
                    d += ` L ${curr.x} ${curr.y}`;
                  }
                }
                if (el.closed) d += ' Z';
                return (
                  <path
                    key={el.id}
                    d={d}
                    fill={renderFill}
                    fillOpacity={el.fillOpacity}
                    stroke={renderStroke}
                    strokeWidth={el.strokeWidthMm}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  />
                );
              }

              return null;
            })}

            {/* In-progress Pen tool lines */}
            {penNodes.length > 0 && (
              <g className="pointer-events-none">
                <polyline
                  points={penNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="0.4"
                  strokeDasharray="2,2"
                />
                {penNodes.map((n, i) => (
                  <circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={i === 0 ? 1.5 : 1.0}
                    fill={i === 0 ? '#10b981' : '#0284c7'}
                    stroke="#ffffff"
                    strokeWidth="0.3"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Selection Box & Transform Handles (Overlay) */}
          {selectedElement && selectedElement.visible !== false && activeTool === 'select' && (
            <div
              className={`absolute pointer-events-none transition-colors ${
                selectedElement.locked
                  ? 'border border-dashed border-amber-500/90'
                  : 'border border-sky-500'
              }`}
              style={{
                left: `${selectedElement.x * MM_TO_PX}px`,
                top: `${selectedElement.y * MM_TO_PX}px`,
                width: `${selectedElement.width * MM_TO_PX}px`,
                height: `${selectedElement.height * MM_TO_PX}px`,
              }}
            >
              {/* Locked Indicator Badge */}
              {selectedElement.locked && (
                <div className="absolute -top-5 right-0 bg-amber-500 text-neutral-950 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-1 shadow-xs pointer-events-auto">
                  <Lock className="w-2.5 h-2.5" />
                  <span>BLOQUEADO</span>
                </div>
              )}

              {/* Corner Handles (only if not locked) */}
              {!selectedElement.locked &&
                (['tl', 'tr', 'br', 'bl'] as const).map((corner) => {
                  const isLeft = corner.includes('l');
                  const isTop = corner.includes('t');
                  return (
                    <div
                      key={corner}
                      onMouseDown={(e) => handleResizeHandleDown(e, corner)}
                      className="absolute w-2.5 h-2.5 bg-white border border-sky-600 rounded-xs pointer-events-auto cursor-nwse-resize hover:bg-sky-500"
                      style={{
                        left: isLeft ? '-4px' : 'calc(100% - 4px)',
                        top: isTop ? '-4px' : 'calc(100% - 4px)',
                      }}
                    />
                  );
                })}
            </div>
          )}

          {/* Trim / Crop Marks on 4 Corners */}
          <div className="absolute -top-3 -left-3 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="0" x2="12" y2="9" stroke="#000" strokeWidth="0.5" />
              <line x1="0" y1="12" x2="9" y2="12" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="absolute -top-3 -right-3 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="0" x2="12" y2="9" stroke="#000" strokeWidth="0.5" />
              <line x1="15" y1="12" x2="24" y2="12" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="absolute -bottom-3 -left-3 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="15" x2="12" y2="24" stroke="#000" strokeWidth="0.5" />
              <line x1="0" y1="12" x2="9" y2="12" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="absolute -bottom-3 -right-3 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="15" x2="12" y2="24" stroke="#000" strokeWidth="0.5" />
              <line x1="15" y1="12" x2="24" y2="12" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Registration Marks (+) centered outside lead margins */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="5" fill="none" stroke="#000" strokeWidth="0.5" />
              <line x1="8" y1="0" x2="8" y2="16" stroke="#000" strokeWidth="0.5" />
              <line x1="0" y1="8" x2="16" y2="8" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="5" fill="none" stroke="#000" strokeWidth="0.5" />
              <line x1="8" y1="0" x2="8" y2="16" stroke="#000" strokeWidth="0.5" />
              <line x1="0" y1="8" x2="16" y2="8" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
