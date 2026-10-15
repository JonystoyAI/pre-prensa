import React, { useState } from 'react';
import { X, Upload, CheckCircle2, Type } from 'lucide-react';

interface FontUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFontLoaded: (fontFamilyName: string) => void;
}

export const FontUploadModal: React.FC<FontUploadModalProps> = ({
  isOpen,
  onClose,
  onFontLoaded,
}) => {
  const [loadedFonts, setLoadedFonts] = useState<string[]>([
    'Plus Jakarta Sans',
    'JetBrains Mono',
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
  ]);
  const [selectedFont, setSelectedFont] = useState<string>('Plus Jakarta Sans');
  const [customFontName, setCustomFontName] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setLoadedFonts((prev) => [fontName, ...prev]);
      setSelectedFont(fontName);
      setStatusMsg(`Tipografía "${fontName}" cargada exitosamente.`);
      onFontLoaded(fontName);
    } catch (err) {
      console.error('Error loading font file:', err);
      setStatusMsg('Error al procesar el archivo tipográfico.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Gestor de Tipografías de Imprenta
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMsg && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Upload Custom Font */}
        <div>
          <span className="text-xs font-mono uppercase text-neutral-400 block mb-2">
            Cargar Fuente de Cliente (.ttf / .otf / .woff):
          </span>
          <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/40 transition-colors">
            <Upload className="w-6 h-6 text-neutral-500 mb-1" />
            <span className="text-xs font-medium text-neutral-200">
              Seleccionar archivo de fuente
            </span>
            <span className="text-[10px] text-neutral-500">
              Compatible con fuentes góticas, caligráficas y de máquina de escribir
            </span>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Font List */}
        <div className="space-y-1 max-h-48 overflow-y-auto pt-2 border-t border-neutral-800">
          <span className="text-[11px] font-mono text-neutral-500 uppercase block mb-1">
            Fuentes disponibles en el taller:
          </span>
          {loadedFonts.map((fn) => (
            <button
              key={fn}
              onClick={() => {
                setSelectedFont(fn);
                onFontLoaded(fn);
              }}
              className={`w-full flex items-center justify-between p-2 rounded text-left border transition-colors ${
                selectedFont === fn
                  ? 'bg-amber-500/10 border-amber-500 text-white'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="text-xs font-medium truncate" style={{ fontFamily: fn }}>
                {fn}
              </span>
              <span className="text-[10px] text-neutral-500" style={{ fontFamily: fn }}>
                1234567890 AaBbCc
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
