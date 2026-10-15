import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DocumentDimensions,
  InkColor,
  ToolType,
  VectorElement,
  BezierNode,
} from '../types/prepress';
import { MM_TO_PX, PX_TO_MM } from '../utils/prepressCalculations';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Lock,
  Grid,
  Magnet,
  Ruler,
  Settings2,
  Check,
  ChevronDown,
  X,
  Crosshair,
} from 'lucide-react';

export interface GridConfig {
  enabled: boolean;
  spacingMm: number;
  subdivisions: number;
  style: 'lines' | 'dots' | 'crosses';
  opacity: number;
  showRulers: boolean;
}

export interface SnapConfig {
  enabled: boolean;
  snapToGrid: boolean;
  snapToMargins: boolean;
  snapToCenter: boolean;
  thresholdMm: number;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  pos: number;
  label: string;
}

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
  onElementsChange,
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

  // Configurable Grid Settings
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    enabled: true,
    spacingMm: 5, // 5mm default spacing
    subdivisions: 5, // 1mm minor lines
    style: 'lines',
    opacity: 0.35,
    showRulers: true,
  });

  // Magnetism / Snapping Settings
  const [snapConfig, setSnapConfig] = useState<SnapConfig>({
    enabled: true,
    snapToGrid: true,
    snapToMargins: true,
    snapToCenter: true,
    thresholdMm: 2.0, // 2mm magnetic pull radius
  });

  // Active magnetic alignment guides
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // Popover state for grid & magnetism settings
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState<boolean>(false);

  // Precision Magnetism & Snapping Calculator
  const getMagneticSnap = useCallback(
    (
      rawX: number,
      rawY: number,
      boxWidth = 0,
      boxHeight = 0,
      mode: 'point' | 'box' = 'point'
    ): { x: number; y: number; guides: SnapGuide[] } => {
      if (!snapConfig.enabled) {
        return { x: Number(rawX.toFixed(1)), y: Number(rawY.toFixed(1)), guides: [] };
      }

      const guides: SnapGuide[] = [];
      let snappedX = rawX;
      let snappedY = rawY;

      // --- Horizontal X targets (generate vertical guide lines) ---
      const targetsX: { pos: number; label: string }[] = [];
      if (snapConfig.snapToGrid && gridConfig.spacingMm > 0) {
        const step = gridConfig.spacingMm;
        const gridX = Math.round(rawX / step) * step;
        targetsX.push({ pos: Number(gridX.toFixed(1)), label: `${gridX} mm` });

        if (gridConfig.subdivisions > 1) {
          const minorStep = step / gridConfig.subdivisions;
          const minorGridX = Math.round(rawX / minorStep) * minorStep;
          targetsX.push({ pos: Number(minorGridX.toFixed(1)), label: `${Number(minorGridX.toFixed(1))} mm` });
        }

        if (mode === 'box' && boxWidth > 0) {
          const gridRight = Math.round((rawX + boxWidth) / step) * step;
          targetsX.push({ pos: Number(gridRight.toFixed(1)), label: `${gridRight} mm` });
          const gridCenter = Math.round((rawX + boxWidth / 2) / step) * step;
          targetsX.push({ pos: Number(gridCenter.toFixed(1)), label: `${gridCenter} mm` });
        }
      }

      if (snapConfig.snapToMargins) {
        targetsX.push({ pos: 0, label: '0 mm (Borde)' });
        targetsX.push({ pos: doc.widthMm, label: `${doc.widthMm} mm (Borde)` });
        targetsX.push({ pos: doc.safeMarginMm, label: `Margen (${doc.safeMarginMm}mm)` });
        targetsX.push({ pos: doc.widthMm - doc.safeMarginMm, label: `Margen (${doc.widthMm - doc.safeMarginMm}mm)` });
        targetsX.push({ pos: -doc.bleedMm, label: `Rebase (-${doc.bleedMm}mm)` });
        targetsX.push({ pos: doc.widthMm + doc.bleedMm, label: `Rebase (${doc.widthMm + doc.bleedMm}mm)` });
      }

      if (snapConfig.snapToCenter) {
        const centerX = Number((doc.widthMm / 2).toFixed(1));
        targetsX.push({ pos: centerX, label: `Centro X (${centerX} mm)` });
      }

      // Find closest X candidate
      let bestDistX = snapConfig.thresholdMm;
      let bestDeltaX = 0;
      let bestGuideX: SnapGuide | null = null;

      const testPointsX =
        mode === 'box' && boxWidth > 0
          ? [
              { offset: 0, pos: rawX },
              { offset: boxWidth / 2, pos: rawX + boxWidth / 2 },
              { offset: boxWidth, pos: rawX + boxWidth },
            ]
          : [{ offset: 0, pos: rawX }];

      for (const tp of testPointsX) {
        for (const target of targetsX) {
          const dist = Math.abs(tp.pos - target.pos);
          if (dist <= bestDistX) {
            bestDistX = dist;
            bestDeltaX = target.pos - tp.pos;
            bestGuideX = {
              type: 'vertical',
              pos: target.pos,
              label: target.label,
            };
          }
        }
      }

      if (bestGuideX) {
        snappedX = Number((rawX + bestDeltaX).toFixed(1));
        guides.push(bestGuideX);
      } else {
        snappedX = Number(rawX.toFixed(1));
      }

      // --- Vertical Y targets (generate horizontal guide lines) ---
      const targetsY: { pos: number; label: string }[] = [];
      if (snapConfig.snapToGrid && gridConfig.spacingMm > 0) {
        const step = gridConfig.spacingMm;
        const gridY = Math.round(rawY / step) * step;
        targetsY.push({ pos: Number(gridY.toFixed(1)), label: `${gridY} mm` });

        if (gridConfig.subdivisions > 1) {
          const minorStep = step / gridConfig.subdivisions;
          const minorGridY = Math.round(rawY / minorStep) * minorStep;
          targetsY.push({ pos: Number(minorGridY.toFixed(1)), label: `${Number(minorGridY.toFixed(1))} mm` });
        }

        if (mode === 'box' && boxHeight > 0) {
          const gridBottom = Math.round((rawY + boxHeight) / step) * step;
          targetsY.push({ pos: Number(gridBottom.toFixed(1)), label: `${gridBottom} mm` });
          const gridCenterY = Math.round((rawY + boxHeight / 2) / step) * step;
          targetsY.push({ pos: Number(gridCenterY.toFixed(1)), label: `${gridCenterY} mm` });
        }
      }

      if (snapConfig.snapToMargins) {
        targetsY.push({ pos: 0, label: '0 mm (Borde)' });
        targetsY.push({ pos: doc.heightMm, label: `${doc.heightMm} mm (Borde)` });
        targetsY.push({ pos: doc.gripperMarginMm, label: `Pinza (${doc.gripperMarginMm}mm)` });
        targetsY.push({ pos: doc.safeMarginMm, label: `Margen (${doc.safeMarginMm}mm)` });
        targetsY.push({ pos: doc.heightMm - doc.safeMarginMm, label: `Margen (${doc.heightMm - doc.safeMarginMm}mm)` });
        targetsY.push({ pos: -doc.bleedMm, label: `Rebase (-${doc.bleedMm}mm)` });
        targetsY.push({ pos: doc.heightMm + doc.bleedMm, label: `Rebase (${doc.heightMm + doc.bleedMm}mm)` });
      }

      if (snapConfig.snapToCenter) {
        const centerY = Number((doc.heightMm / 2).toFixed(1));
        targetsY.push({ pos: centerY, label: `Centro Y (${centerY} mm)` });
      }

      // Find closest Y candidate
      let bestDistY = snapConfig.thresholdMm;
      let bestDeltaY = 0;
      let bestGuideY: SnapGuide | null = null;

      const testPointsY =
        mode === 'box' && boxHeight > 0
          ? [
              { offset: 0, pos: rawY },
              { offset: boxHeight / 2, pos: rawY + boxHeight / 2 },
              { offset: boxHeight, pos: rawY + boxHeight },
            ]
          : [{ offset: 0, pos: rawY }];

      for (const tp of testPointsY) {
        for (const target of targetsY) {
          const dist = Math.abs(tp.pos - target.pos);
          if (dist <= bestDistY) {
            bestDistY = dist;
            bestDeltaY = target.pos - tp.pos;
            bestGuideY = {
              type: 'horizontal',
              pos: target.pos,
              label: target.label,
            };
          }
        }
      }

      if (bestGuideY) {
        snappedY = Number((rawY + bestDeltaY).toFixed(1));
        guides.push(bestGuideY);
      } else {
        snappedY = Number(rawY.toFixed(1));
      }

      return { x: snappedX, y: snappedY, guides };
    },
    [snapConfig, gridConfig, doc]
  );

  // Keyboard events for Space (pan), Delete, Esc, Grid (G), Snap (S), Rulers (Ctrl+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setGridConfig((prev) => ({ ...prev, showRulers: !prev.showRulers }));
        return;
      }

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
        setIsGridSettingsOpen(false);
        setSelectedElementId(null);
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        setGridConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setSnapConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
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

    const rawPt = clientToDocMm(e.clientX, e.clientY);
    const snapResult = getMagneticSnap(rawPt.x, rawPt.y, 0, 0, 'point');
    const pt = { x: snapResult.x, y: snapResult.y };

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
            name: 'Trazado pluma cerrado',
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
          onElementsChange?.();
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
        name: 'Rayado comercial (talonario)',
        type: 'rulings',
        inkId: activeInkId,
        x: Math.max(10, pt.x),
        y: Math.max(20, pt.y),
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
      onElementsChange?.();
      return;
    }

    // Tool: Folio Box
    if (activeTool === 'folio') {
      const newFolio: VectorElement = {
        id: `folio-${Date.now()}`,
        name: 'Numerador folio rojo',
        type: 'folio',
        inkId: activeInkId,
        x: Math.min(doc.widthMm - 50, pt.x),
        y: Math.max(12, pt.y),
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
      onElementsChange?.();
      return;
    }

    // Tool: Text
    if (activeTool === 'text') {
      const newText: VectorElement = {
        id: `text-${Date.now()}`,
        name: 'Texto: NOTA DE VENTA',
        type: 'text',
        inkId: activeInkId,
        x: pt.x,
        y: pt.y,
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
      onElementsChange?.();
      return;
    }

    // Tool: Watermark (Defaults to safe 6% opacity)
    if (activeTool === 'watermark') {
      const newWm: VectorElement = {
        id: `wm-${Date.now()}`,
        name: 'Marca de agua de seguridad',
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
      onElementsChange?.();
      return;
    }

    // Tool: Rect or Circle creation
    if (activeTool === 'rect' || activeTool === 'circle') {
      setDragMode('create');
      setDragStartMm(pt);
      const newEl: VectorElement = {
        id: `el-${Date.now()}`,
        name: activeTool === 'rect' ? 'Rectángulo vectorial' : 'Círculo vectorial',
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
      if (snapResult.guides.length > 0) {
        setActiveGuides(snapResult.guides);
      }
      return;
    }

    // In Select or Node tool: check if clicking on canvas background to deselect
    if (activeTool === 'select') {
      setSelectedElementId(null);
      setActiveGuides([]);
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const rawPt = clientToDocMm(e.clientX, e.clientY);
    const snapPt = getMagneticSnap(rawPt.x, rawPt.y, 0, 0, 'point');
    setMouseMm({ x: snapPt.x, y: snapPt.y });

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!dragMode || !selectedElementId) return;

    if (dragMode === 'create') {
      const currentSnap = getMagneticSnap(rawPt.x, rawPt.y, 0, 0, 'point');
      const w = Math.abs(currentSnap.x - dragStartMm.x);
      const h = Math.abs(currentSnap.y - dragStartMm.y);
      const x = Math.min(currentSnap.x, dragStartMm.x);
      const y = Math.min(currentSnap.y, dragStartMm.y);

      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElementId
            ? {
                ...el,
                x: Number(x.toFixed(1)),
                y: Number(y.toFixed(1)),
                width: Math.max(1, Number(w.toFixed(1))),
                height: Math.max(1, Number(h.toFixed(1))),
              }
            : el
        )
      );
      setActiveGuides(currentSnap.guides);
    } else if (dragMode === 'move' && initialElRect) {
      const deltaX = rawPt.x - dragStartMm.x;
      const deltaY = rawPt.y - dragStartMm.y;
      const targetX = initialElRect.x + deltaX;
      const targetY = initialElRect.y + deltaY;

      // Apply magnetic snap with bounding box candidate points (edges and center)
      const snapMove = getMagneticSnap(
        targetX,
        targetY,
        initialElRect.w,
        initialElRect.h,
        'box'
      );

      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElementId
            ? {
                ...el,
                x: snapMove.x,
                y: snapMove.y,
              }
            : el
        )
      );
      setActiveGuides(snapMove.guides);
    } else if (dragMode === 'resize' && initialElRect && resizeCorner) {
      const deltaX = rawPt.x - dragStartMm.x;
      const deltaY = rawPt.y - dragStartMm.y;

      let newX = initialElRect.x;
      let newY = initialElRect.y;
      let newW = initialElRect.w;
      let newH = initialElRect.h;
      let guides: SnapGuide[] = [];

      if (resizeCorner === 'br') {
        const rawCornerX = initialElRect.x + initialElRect.w + deltaX;
        const rawCornerY = initialElRect.y + initialElRect.h + deltaY;
        const cornerSnap = getMagneticSnap(rawCornerX, rawCornerY, 0, 0, 'point');
        newW = Math.max(2, Number((cornerSnap.x - initialElRect.x).toFixed(1)));
        newH = Math.max(2, Number((cornerSnap.y - initialElRect.y).toFixed(1)));
        guides = cornerSnap.guides;
      } else if (resizeCorner === 'tr') {
        const rawCornerX = initialElRect.x + initialElRect.w + deltaX;
        const rawCornerY = initialElRect.y + deltaY;
        const cornerSnap = getMagneticSnap(rawCornerX, rawCornerY, 0, 0, 'point');
        newW = Math.max(2, Number((cornerSnap.x - initialElRect.x).toFixed(1)));
        newY = cornerSnap.y;
        newH = Math.max(2, Number((initialElRect.y + initialElRect.h - cornerSnap.y).toFixed(1)));
        guides = cornerSnap.guides;
      } else if (resizeCorner === 'bl') {
        const rawCornerX = initialElRect.x + deltaX;
        const rawCornerY = initialElRect.y + initialElRect.h + deltaY;
        const cornerSnap = getMagneticSnap(rawCornerX, rawCornerY, 0, 0, 'point');
        newX = cornerSnap.x;
        newW = Math.max(2, Number((initialElRect.x + initialElRect.w - cornerSnap.x).toFixed(1)));
        newH = Math.max(2, Number((cornerSnap.y - initialElRect.y).toFixed(1)));
        guides = cornerSnap.guides;
      } else if (resizeCorner === 'tl') {
        const rawCornerX = initialElRect.x + deltaX;
        const rawCornerY = initialElRect.y + deltaY;
        const cornerSnap = getMagneticSnap(rawCornerX, rawCornerY, 0, 0, 'point');
        newX = cornerSnap.x;
        newY = cornerSnap.y;
        newW = Math.max(2, Number((initialElRect.x + initialElRect.w - cornerSnap.x).toFixed(1)));
        newH = Math.max(2, Number((initialElRect.y + initialElRect.h - cornerSnap.y).toFixed(1)));
        guides = cornerSnap.guides;
      }

      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElementId
            ? {
                ...el,
                x: Number(newX.toFixed(1)),
                y: Number(newY.toFixed(1)),
                width: Number(newW.toFixed(1)),
                height: Number(newH.toFixed(1)),
              }
            : el
        )
      );
      setActiveGuides(guides);
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragMode === 'create') {
      setActiveTool('select');
    }
    if (dragMode === 'create' || dragMode === 'move' || dragMode === 'resize') {
      onElementsChange?.();
    }
    setDragMode(null);
    setInitialElRect(null);
    setResizeCorner(null);
    setActiveGuides([]);
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
      {/* Top Floating Zoom, Fit, Grid & Magnet Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-md p-1 shadow-lg backdrop-blur-sm text-neutral-300">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          title="Alejar zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono tabular-nums px-2 min-w-14 text-center text-neutral-200">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          title="Acercar zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-neutral-800 mx-0.5" />

        <button
          onClick={handleFitToScreen}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          title="Ajustar al pliego"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-neutral-800 mx-0.5" />

        {/* Grid Visibility Toggle Button (G) */}
        <button
          onClick={() => setGridConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            gridConfig.enabled
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
          title="Alternar cuadrícula milimétrica (Tecla G)"
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono">{gridConfig.spacingMm}mm</span>
        </button>

        {/* Magnetism / Snapping Toggle Button (S) */}
        <button
          onClick={() => setSnapConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            snapConfig.enabled
              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
          title="Alternar atracción magnética / Imán (Tecla S)"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="text-[11px]">Imán</span>
        </button>

        {/* Grid & Snap Configuration Popover Toggle */}
        <button
          onClick={() => setIsGridSettingsOpen((prev) => !prev)}
          className={`p-1.5 rounded transition-colors ${
            isGridSettingsOpen
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Configuración de Cuadrícula & Imán"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {selectedElement && !selectedElement.locked && (
          <>
            <div className="w-px h-4 bg-neutral-800 mx-0.5" />
            <button
              onClick={() => {
                setElements((prev) => prev.filter((el) => el.id !== selectedElement.id));
                setSelectedElementId(null);
                onElementsChange?.();
              }}
              className="p-1.5 hover:bg-red-950 text-red-400 rounded transition-colors"
              title="Eliminar elemento (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Grid & Magnetism Settings Popover Modal */}
      {isGridSettingsOpen && (
        <div className="absolute top-14 left-4 z-30 w-80 bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 shadow-xl backdrop-blur-md text-neutral-300 text-xs">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-neutral-100 text-xs uppercase tracking-wider">
                Cuadrícula & Magnetismo
              </span>
            </div>
            <button
              onClick={() => setIsGridSettingsOpen(false)}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
              title="Cerrar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Espaciado de Cuadrícula (mm) */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-300">
                  Espaciado Cuadrícula:
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-400">
                  {gridConfig.spacingMm} mm
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {[1, 2, 5, 10, 20].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      setGridConfig((prev) => ({
                        ...prev,
                        spacingMm: val,
                        subdivisions: val >= 10 ? 10 : val >= 5 ? 5 : 1,
                      }))
                    }
                    className={`py-1 rounded text-center font-mono text-[11px] border transition-colors ${
                      gridConfig.spacingMm === val
                        ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    {val}mm
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1">
                <span className="text-[11px] text-neutral-400">Personalizado:</span>
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={gridConfig.spacingMm}
                  onChange={(e) => {
                    const num = Math.max(0.5, Math.min(100, parseFloat(e.target.value) || 1));
                    setGridConfig((prev) => ({
                      ...prev,
                      spacingMm: Number(num.toFixed(1)),
                      subdivisions: num >= 10 ? 10 : num >= 5 ? 5 : 1,
                    }));
                  }}
                  className="w-16 bg-transparent text-right font-mono font-semibold text-neutral-100 text-[11px] focus:outline-none"
                />
                <span className="text-[11px] font-mono text-neutral-500">mm</span>
              </div>
            </div>

            {/* Estilo visual de Cuadrícula */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                Estilo de Cuadrícula:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['lines', 'dots', 'crosses'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setGridConfig((prev) => ({ ...prev, style: st }))}
                    className={`py-1 rounded text-center text-[10px] uppercase font-mono tracking-wider border transition-colors ${
                      gridConfig.style === st
                        ? 'bg-neutral-800 text-white border-neutral-600 font-semibold'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {st === 'lines' ? 'Líneas' : st === 'dots' ? 'Puntos' : 'Cruces'}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones de Magnetismo (Atracción a...) */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5 text-sky-400" />
                  <span>Atracción Magnética (Snapping)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSnapConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${
                    snapConfig.enabled ? 'bg-sky-600' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      snapConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {snapConfig.enabled && (
                <div className="space-y-1.5 pl-1 bg-neutral-950/60 p-2 rounded border border-neutral-800">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={snapConfig.snapToGrid}
                      onChange={(e) =>
                        setSnapConfig((prev) => ({ ...prev, snapToGrid: e.target.checked }))
                      }
                      className="rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-0"
                    />
                    <span>Atraer a cuadrícula milimétrica</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={snapConfig.snapToMargins}
                      onChange={(e) =>
                        setSnapConfig((prev) => ({ ...prev, snapToMargins: e.target.checked }))
                      }
                      className="rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-0"
                    />
                    <span>Atraer a pinza (8mm) y márgenes</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={snapConfig.snapToCenter}
                      onChange={(e) =>
                        setSnapConfig((prev) => ({ ...prev, snapToCenter: e.target.checked }))
                      }
                      className="rounded border-neutral-700 bg-neutral-900 text-sky-600 focus:ring-0"
                    />
                    <span>Atraer al centro del documento</span>
                  </label>

                  {/* Radio de Atracción / Sensibilidad */}
                  <div className="pt-1.5 mt-1 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">Radio Imán:</span>
                    <div className="flex gap-1">
                      {[1.0, 2.0, 3.5].map((rad) => (
                        <button
                          key={rad}
                          type="button"
                          onClick={() =>
                            setSnapConfig((prev) => ({ ...prev, thresholdMm: rad }))
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            snapConfig.thresholdMm === rad
                              ? 'bg-sky-950 text-sky-300 border-sky-700'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {rad}mm
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reglas Milimétricas perimetrales */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-300 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-neutral-400" />
                <span>Reglas milimétricas (Ctrl+R)</span>
              </span>
              <button
                type="button"
                onClick={() => setGridConfig((prev) => ({ ...prev, showRulers: !prev.showRulers }))}
                className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${
                  gridConfig.showRulers ? 'bg-amber-600' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    gridConfig.showRulers ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Metric Bar with Snap Guides Status */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 rounded px-3 py-1.5 text-xs font-mono tabular-nums text-neutral-400 backdrop-blur-sm shadow-md">
        <span>
          X: <strong className="text-neutral-200">{mouseMm.x}</strong> mm
        </span>
        <span aria-hidden="true" className="text-neutral-700">|</span>
        <span>
          Y: <strong className="text-neutral-200">{mouseMm.y}</strong> mm
        </span>
        {selectedElement && (
          <>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <span>
              W: <strong className="text-amber-400">{selectedElement.width}</strong> mm
            </span>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <span>
              H: <strong className="text-amber-400">{selectedElement.height}</strong> mm
            </span>
          </>
        )}

        {/* Real-time Magnetic Snap Feedback */}
        <span aria-hidden="true" className="text-neutral-700">|</span>
        {snapConfig.enabled ? (
          <span className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800/80 text-sky-400 text-[10px] flex items-center gap-1 font-mono">
            <Magnet className="w-3 h-3 text-sky-400 shrink-0" />
            <span>Imán {gridConfig.spacingMm}mm</span>
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-500 text-[10px] font-mono">
            Imán OFF
          </span>
        )}

        {activeGuides.length > 0 && (
          <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-700/80 text-amber-300 text-[10px] flex items-center gap-1 font-mono font-semibold animate-pulse">
            <Crosshair className="w-3 h-3 text-amber-400" />
            <span>Alineado: {activeGuides.map((g) => g.label).join(' · ')}</span>
          </span>
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

        {/* Millimeter Top & Left Rulers */}
        {gridConfig.showRulers && (
          <>
            {/* Corner 'mm' badge */}
            <div
              className="absolute pointer-events-none select-none flex items-center justify-center font-mono font-bold text-[9px] text-amber-400 bg-neutral-900 border border-neutral-700/80 z-20 shadow-xs"
              style={{
                left: '-24px',
                top: '-22px',
                width: '24px',
                height: '22px',
              }}
              title="Escala milimétrica 1:1"
            >
              mm
            </div>

            {/* Top Millimeter Ruler */}
            <div
              className="absolute bg-neutral-900 border-t border-b border-r border-neutral-700/80 pointer-events-none select-none overflow-hidden z-10 shadow-xs"
              style={{
                left: '0px',
                top: '-22px',
                width: `${doc.widthMm * MM_TO_PX}px`,
                height: '22px',
              }}
            >
              <svg
                className="w-full h-full"
                viewBox={`0 0 ${doc.widthMm} 22`}
                preserveAspectRatio="none"
              >
                {/* Highlight band for selected element X span */}
                {selectedElement && (
                  <rect
                    x={selectedElement.x}
                    y="0"
                    width={selectedElement.width}
                    height="22"
                    fill="#0284c7"
                    fillOpacity="0.25"
                  />
                )}

                {/* Millimeter ticks every mm */}
                {Array.from({ length: Math.ceil(doc.widthMm) + 1 }).map((_, mm) => {
                  const isTen = mm % 10 === 0;
                  const isFive = mm % 5 === 0;
                  const tickH = isTen ? 11 : isFive ? 7 : 4;
                  return (
                    <g key={`tick-x-${mm}`}>
                      <line
                        x1={mm}
                        y1={22 - tickH}
                        x2={mm}
                        y2={22}
                        stroke={isTen ? '#cbd5e1' : '#64748b'}
                        strokeWidth={isTen ? 0.35 : 0.2}
                      />
                      {isTen && mm <= doc.widthMm && (
                        <text
                          x={mm + 0.6}
                          y={8}
                          fill="#94a3b8"
                          fontSize="4"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {mm}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Dynamic Cursor X Hairline */}
                <line
                  x1={mouseMm.x}
                  y1={0}
                  x2={mouseMm.x}
                  y2={22}
                  stroke="#38bdf8"
                  strokeWidth="0.6"
                />
              </svg>
            </div>

            {/* Left Millimeter Ruler */}
            <div
              className="absolute bg-neutral-900 border-l border-b border-t border-neutral-700/80 pointer-events-none select-none overflow-hidden z-10 shadow-xs"
              style={{
                left: '-24px',
                top: '0px',
                width: '24px',
                height: `${doc.heightMm * MM_TO_PX}px`,
              }}
            >
              <svg
                className="w-full h-full"
                viewBox={`0 0 24 ${doc.heightMm}`}
                preserveAspectRatio="none"
              >
                {/* Highlight band for selected element Y span */}
                {selectedElement && (
                  <rect
                    x="0"
                    y={selectedElement.y}
                    width="24"
                    height={selectedElement.height}
                    fill="#0284c7"
                    fillOpacity="0.25"
                  />
                )}

                {/* Millimeter ticks every mm */}
                {Array.from({ length: Math.ceil(doc.heightMm) + 1 }).map((_, mm) => {
                  const isTen = mm % 10 === 0;
                  const isFive = mm % 5 === 0;
                  const tickW = isTen ? 11 : isFive ? 7 : 4;
                  return (
                    <g key={`tick-y-${mm}`}>
                      <line
                        x1={24 - tickW}
                        y1={mm}
                        x2={24}
                        y2={mm}
                        stroke={isTen ? '#cbd5e1' : '#64748b'}
                        strokeWidth={isTen ? 0.35 : 0.2}
                      />
                      {isTen && mm <= doc.heightMm && (
                        <text
                          x={3}
                          y={mm + 3.2}
                          fill="#94a3b8"
                          fontSize="4"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {mm}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Dynamic Cursor Y Hairline */}
                <line
                  x1={0}
                  y1={mouseMm.y}
                  x2={24}
                  y2={mouseMm.y}
                  stroke="#38bdf8"
                  strokeWidth="0.6"
                />
              </svg>
            </div>
          </>
        )}

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
            {/* Configurable Millimeter Grid Overlay Pattern */}
            {gridConfig.enabled && (
              <g className="pointer-events-none select-none">
                <defs>
                  {/* Minor Grid Subdivisions (e.g. 1mm or sub-steps) */}
                  {gridConfig.subdivisions > 1 && (
                    <pattern
                      id="vector-canvas-grid-sub"
                      width={gridConfig.spacingMm / gridConfig.subdivisions}
                      height={gridConfig.spacingMm / gridConfig.subdivisions}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${gridConfig.spacingMm / gridConfig.subdivisions} 0 L 0 0 0 ${gridConfig.spacingMm / gridConfig.subdivisions}`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="0.08"
                        strokeOpacity={gridConfig.opacity * 0.45}
                      />
                    </pattern>
                  )}

                  {/* Main Millimetric Grid Pattern */}
                  <pattern
                    id="vector-canvas-grid-main"
                    width={gridConfig.spacingMm}
                    height={gridConfig.spacingMm}
                    patternUnits="userSpaceOnUse"
                  >
                    {gridConfig.subdivisions > 1 && (
                      <rect
                        width={gridConfig.spacingMm}
                        height={gridConfig.spacingMm}
                        fill="url(#vector-canvas-grid-sub)"
                      />
                    )}
                    {gridConfig.style === 'lines' && (
                      <path
                        d={`M ${gridConfig.spacingMm} 0 L 0 0 0 ${gridConfig.spacingMm}`}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="0.16"
                        strokeOpacity={gridConfig.opacity}
                      />
                    )}
                    {gridConfig.style === 'dots' && (
                      <circle
                        cx="0"
                        cy="0"
                        r={Math.min(0.35, Math.max(0.15, gridConfig.spacingMm * 0.05))}
                        fill="#475569"
                        fillOpacity={gridConfig.opacity * 1.8}
                      />
                    )}
                    {gridConfig.style === 'crosses' && (
                      <path
                        d="M -0.8 0 L 0.8 0 M 0 -0.8 L 0 0.8"
                        fill="none"
                        stroke="#475569"
                        strokeWidth="0.16"
                        strokeOpacity={gridConfig.opacity * 1.5}
                      />
                    )}
                  </pattern>
                </defs>

                {/* Grid Overlay Rect covering the sheet */}
                <rect
                  x="0"
                  y="0"
                  width={doc.widthMm}
                  height={doc.heightMm}
                  fill="url(#vector-canvas-grid-main)"
                />
              </g>
            )}

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

              if (el.type === 'line') {
                return (
                  <line
                    key={el.id}
                    x1={el.x}
                    y1={el.y}
                    x2={el.x + el.width}
                    y2={el.y + el.height}
                    stroke={renderStroke}
                    strokeWidth={isSelected ? Math.max(0.4, el.strokeWidthMm) : el.strokeWidthMm}
                    strokeDasharray={el.strokeDashArray}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className="cursor-pointer"
                  />
                );
              }

              if (el.type === 'path') {
                let d = el.pathData || '';
                if (!d && el.nodes && el.nodes.length > 0) {
                  d = `M ${el.nodes[0].x} ${el.nodes[0].y}`;
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
                }
                if (!d) return null;
                return (
                  <path
                    key={el.id}
                    d={d}
                    fill={renderFill}
                    fillOpacity={el.fillOpacity}
                    stroke={renderStroke}
                    strokeWidth={isSelected ? Math.max(0.4, el.strokeWidthMm) : el.strokeWidthMm}
                    strokeDasharray={el.strokeDashArray}
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
