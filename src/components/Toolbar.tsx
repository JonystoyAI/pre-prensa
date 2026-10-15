import React from 'react';
import { ToolType } from '../types/prepress';
import {
  MousePointer,
  Spline,
  PenTool,
  Square,
  Circle,
  AlignJustify,
  Hash,
  Type,
  Droplets,
  Ruler,
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: 'Seleccionar / Mover', shortcut: 'V', icon: MousePointer },
  { id: 'node', label: 'Editar Nodos Bézier', shortcut: 'A', icon: Spline },
  { id: 'pen', label: 'Pluma Vectorial', shortcut: 'P', icon: PenTool },
  { id: 'rect', label: 'Rectángulo / Marco', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Elipse / Óvalo', shortcut: 'E', icon: Circle },
  { id: 'rulings', label: 'Renglones de Nota', shortcut: 'L', icon: AlignJustify },
  { id: 'folio', label: 'Caja de Folio Numerado', shortcut: 'F', icon: Hash },
  { id: 'text', label: 'Texto Tipográfico', shortcut: 'T', icon: Type },
  { id: 'watermark', label: 'Marca de Agua (4-8%)', shortcut: 'W', icon: Droplets },
  { id: 'gripper_measure', label: 'Regla de Pinza (8mm)', shortcut: 'M', icon: Ruler },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
}) => {
  return (
    <aside className="w-14 border-r border-neutral-800 bg-neutral-900 text-neutral-300 flex flex-col items-center py-3 select-none shrink-0 z-20">
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-10 h-10 rounded flex flex-col items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon className="w-4 h-4" />
              {/* Keyboard indicator */}
              <span className={`text-[9px] font-mono leading-none mt-0.5 ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`}>
                {tool.shortcut}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-950 text-neutral-200 text-xs rounded border border-neutral-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-50 transition-opacity">
                {tool.label} <span className="text-amber-400 font-mono">[{tool.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
