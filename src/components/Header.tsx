import React, { useState } from 'react';
import { Layers, Sparkles, HelpCircle, FileArchive, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface HeaderProps {
  hasAIKey: boolean;
  onLoadDemo: () => void;
  onExportZIP?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hasAIKey, onLoadDemo, onExportZIP }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-[#0d0e12] border-b border-white/10 text-white select-none">
        {/* App Title & Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg border border-white/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-extrabold tracking-tight uppercase bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                PBR Material Suite Generator
              </h1>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-500/30">
                v2.5 PBR Math
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Gemini AI Albedo Synthesis + Client Canvas WebGL Map Derivation
            </p>
          </div>
        </div>

        {/* Action Controls & AI Connection Badge */}
        <div className="flex items-center space-x-3">
          {/* AI Connection Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-white/10 text-xs font-medium">
            {hasAIKey ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-neutral-300">Gemini 2.5/3.1 Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-neutral-400">Offline / Procedural Mode</span>
              </>
            )}
          </div>

          <button
            onClick={onLoadDemo}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-neutral-300 transition"
          >
            Load Demo
          </button>

          {onExportZIP && (
            <button
              onClick={onExportZIP}
              className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export ZIP</span>
            </button>
          )}

          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition"
            title="Help & Quick Start Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121318] border border-white/10 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative text-neutral-200 text-xs">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 border-b border-white/10 pb-2">
              PBR Material Generator — User Guide
            </h3>

            <div className="space-y-3 leading-relaxed text-neutral-300">
              <p>
                <strong>1. Albedo Synthesis:</strong> Enter a text prompt (e.g. <em>"Rustic dark oak wood"</em>) or upload a reference photo (e.g. carpet or wall photo). Gemini AI will synthesize a flat, orthographic, shadowless Albedo (Base Color) texture map.
              </p>
              <p>
                <strong>2. Seamlessness Verification:</strong> The automated 2D Tileability analyzer detects vignetting and edge seam errors. Click <em>"Apply Automated Seamless Crossfade"</em> to guarantee 100% tileable textures.
              </p>
              <p>
                <strong>3. Mathematical Map Derivation:</strong> Mathematical Sobel operators and contrast filters generate <strong>Normal</strong>, <strong>Roughness</strong>, <strong>Metallic</strong>, <strong>Height</strong>, <strong>Ambient Occlusion</strong>, and <strong>Packed ORM</strong> maps instantly in browser memory.
              </p>
              <p>
                <strong>4. Interactive 3D Viewport:</strong> Preview materials in real-time on Spheres, Cubes, Cylinders, or Displaced Height Meshes with lighting controls and map toggles.
              </p>
              <p>
                <strong>5. ZIP Export:</strong> Export individual map channels or a packaged ZIP suite (512x512, 1024x1024, or 2048x2048).
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
