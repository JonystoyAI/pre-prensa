import React, { useState } from 'react';
import { PreflightAlert, VectorElement } from '../types/prepress';
import { AlertTriangle, Info, AlertOctagon, CheckCircle2, ChevronUp, ChevronDown, Wrench } from 'lucide-react';

interface PreflightInspectorProps {
  alerts: PreflightAlert[];
  elements: VectorElement[];
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  gripperMarginMm: number;
}

export const PreflightInspector: React.FC<PreflightInspectorProps> = ({
  alerts,
  elements,
  setElements,
  gripperMarginMm,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  // Quick fix for watermarks: auto-adjust all watermarks to safe 6%
  const handleAutoFixWatermarks = () => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.type === 'watermark' || el.fillOpacity < 0.25) {
          return { ...el, fillOpacity: 0.06 };
        }
        return el;
      })
    );
  };

  // Quick fix for gripper: shift down any elements inside the top 8mm
  const handleAutoFixGripper = () => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.y < gripperMarginMm) {
          return { ...el, y: gripperMarginMm + 1.5 };
        }
        return el;
      })
    );
  };

  const errorCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm text-neutral-200 select-none z-20">
      {/* Header bar */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {errorCount > 0 ? (
              <AlertOctagon className="w-4 h-4 text-red-500" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Pre-Vuelo Técnico de Taller
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            {errorCount > 0 && (
              <span className="text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded text-[11px]">
                {errorCount} error(es)
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[11px]">
                {warningCount} advertencia(s)
              </span>
            )}
            {alerts.length === 0 && (
              <span className="text-emerald-400 text-[11px]">
                Pliego 100% apto para impresión
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {alerts.some((a) => a.id.startsWith('wm-')) && (
                <button
                  onClick={handleAutoFixWatermarks}
                  className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  Fijar Marca de Agua al 6%
                </button>
              )}
              {alerts.some((a) => a.id === 'gripper-violation') && (
                <button
                  onClick={handleAutoFixGripper}
                  className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  Respetar Pinza 8mm
                </button>
              )}
            </div>
          )}

          <button className="text-neutral-400 hover:text-white p-1">
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Alert list */}
      {!collapsed && (
        <div className="max-h-56 overflow-y-auto px-4 pb-3 space-y-2 border-t border-neutral-800/60 pt-2">
          {alerts.length === 0 ? (
            <p className="text-xs text-neutral-400 py-2">
              No se detectaron conflictos de pinzas de máquina, emplastado ni sobre-entintado.
            </p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded border text-xs flex items-start gap-2.5 ${
                  alert.severity === 'error'
                    ? 'bg-red-950/30 border-red-800/60 text-red-200'
                    : alert.severity === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-neutral-800/40 border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {alert.severity === 'error' ? (
                    <AlertOctagon className="w-4 h-4 text-red-400" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-400" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="font-semibold text-neutral-100 flex items-center justify-between">
                    <span>{alert.title}</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">{alert.message}</p>
                  <p className="text-[11px] font-mono opacity-80 text-amber-300/90 pt-0.5">
                    Sugerencia: {alert.recommendation}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
