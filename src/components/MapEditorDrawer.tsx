import React from 'react';
import { Sliders, RefreshCw, Zap, Layers, Sparkles } from 'lucide-react';
import { PBRParams } from '../types';

interface MapEditorDrawerProps {
  params: PBRParams;
  onChangeParams: (newParams: PBRParams) => void;
  onRecomputeAll: () => void;
  isProcessing?: boolean;
}

export const MapEditorDrawer: React.FC<MapEditorDrawerProps> = ({
  params,
  onChangeParams,
  onRecomputeAll,
  isProcessing = false,
}) => {
  const updateParam = <K extends keyof PBRParams>(key: K, value: PBRParams[K]) => {
    onChangeParams({ ...params, [key]: value });
  };

  return (
    <div className="bg-[#121318] rounded-xl border border-white/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
            PBR Mathematical Map Derivation Controls
          </h3>
        </div>
        <button
          onClick={onRecomputeAll}
          disabled={isProcessing}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>Recompute PBR Suite</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Normal Map Controls */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
              Normal Map (Sobel Gradients)
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
              RGB (XYZ)
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Normal Strength:</span>
              <span className="font-mono font-bold text-indigo-400">{params.normalStrength.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="8.0"
              step="0.1"
              value={params.normalStrength}
              onChange={(e) => updateParam('normalStrength', parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-300">Invert Green Channel (DirectX Y-):</span>
            <input
              type="checkbox"
              checked={params.invertNormalY}
              onChange={(e) => updateParam('invertNormalY', e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Roughness Map Controls */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
              Roughness Map
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              Micro-Detail
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Contrast Stretch:</span>
              <span className="font-mono font-bold text-emerald-400">{params.roughnessContrast.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={params.roughnessContrast}
              onChange={(e) => updateParam('roughnessContrast', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Micro-Roughness Frequency:</span>
              <span className="font-mono font-bold text-emerald-400">{params.roughnessVariance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={params.roughnessVariance}
              onChange={(e) => updateParam('roughnessVariance', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-300">Invert Specular (Glossiness):</span>
            <input
              type="checkbox"
              checked={params.roughnessInvert}
              onChange={(e) => updateParam('roughnessInvert', e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Metallic Map Controls */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              Metallic Map (Masking)
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
              Binary / Smooth
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Luminance Cutoff Threshold:</span>
              <span className="font-mono font-bold text-amber-400">{params.metallicThreshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={params.metallicThreshold}
              onChange={(e) => updateParam('metallicThreshold', parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Transition Softness:</span>
              <span className="font-mono font-bold text-amber-400">{params.metallicSmoothness}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={params.metallicSmoothness}
              onChange={(e) => updateParam('metallicSmoothness', parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-300">Invert Metalness Mask:</span>
            <input
              type="checkbox"
              checked={params.metallicInvert}
              onChange={(e) => updateParam('metallicInvert', e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Height / Displacement Controls */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
              Height / Displacement
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
              Grayscale
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Height Contrast:</span>
              <span className="font-mono font-bold text-purple-400">{params.heightContrast.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={params.heightContrast}
              onChange={(e) => updateParam('heightContrast', parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>Blur Radius (Displacement Smoothing):</span>
              <span className="font-mono font-bold text-purple-400">{params.heightBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              value={params.heightBlur}
              onChange={(e) => updateParam('heightBlur', parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-300">Invert Height Peaks/Valleys:</span>
            <input
              type="checkbox"
              checked={params.heightInvert}
              onChange={(e) => updateParam('heightInvert', e.target.checked)}
              className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 5. Ambient Occlusion (AO) Controls */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5 space-y-3 md:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
              Ambient Occlusion (AO) High-Pass Blur
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
              Crevice Shadows
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-neutral-300">
                <span>Occlusion Radius:</span>
                <span className="font-mono font-bold text-cyan-400">{params.aoRadius}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={params.aoRadius}
                onChange={(e) => updateParam('aoRadius', parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-neutral-300">
                <span>Shadow Intensity:</span>
                <span className="font-mono font-bold text-cyan-400">{params.aoIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={params.aoIntensity}
                onChange={(e) => updateParam('aoIntensity', parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
