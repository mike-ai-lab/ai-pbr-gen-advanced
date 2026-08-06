import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { ThreeViewport } from './components/ThreeViewport';
import { AlbedoInputPanel } from './components/AlbedoInputPanel';
import { MapEditorDrawer } from './components/MapEditorDrawer';
import { SeamlessnessAnalyzer } from './components/SeamlessnessAnalyzer';
import { ExportPanel } from './components/ExportPanel';

import {
  ExportSettings,
  PBRMapData,
  PBRParams,
  TextureMapType,
  ViewportSettings,
} from './types';
import {
  generateFullPBRSuite,
  generateProceduralAlbedo,
  loadImage,
} from './utils/pbrGenerator';
import { Sliders, Grid, Archive, Sparkles, Layers, Eye, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [hasAIKey, setHasAIKey] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Core Canvas & Map Data State
  const [albedoCanvas, setAlbedoCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maps, setMaps] = useState<PBRMapData | null>(null);
  const [mapCanvases, setMapCanvases] = useState<Record<string, HTMLCanvasElement> | null>(null);

  // Active Bottom Panel Tab
  const [activeTab, setActiveTab] = useState<'input' | 'editor' | 'seamless' | 'export'>('input');

  // Selected Active Map Preview Mode (for 2D Side-by-side)
  const [selectedPreviewMap, setSelectedPreviewMap] = useState<TextureMapType>('albedo');

  // Mathematical Parameters
  const [params, setParams] = useState<PBRParams>({
    normalStrength: 2.5,
    invertNormalY: false,
    roughnessInvert: false,
    roughnessContrast: 1.2,
    roughnessBrightness: 0,
    roughnessVariance: 2.0,
    metallicThreshold: 180,
    metallicInvert: false,
    metallicSmoothness: 15,
    heightBlur: 1,
    heightContrast: 1.4,
    heightInvert: false,
    aoRadius: 6,
    aoIntensity: 1.5,
    seamlessBlendMargin: 0.15,
  });

  // 3D Viewport Settings
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    geometry: 'sphere',
    lightX: 1.5,
    lightY: 2.0,
    lightIntensity: 1.8,
    envRotation: 0,
    uvTiling: 2,
    displacementScale: 0.08,
    autoRotate: true,
    wireframe: false,
    enabledMaps: {
      albedo: true,
      normal: true,
      roughness: true,
      metallic: true,
      height: true,
      ao: true,
      orm: false,
    },
  });

  // Export Settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: 1024,
    format: 'png',
    prefix: 'PBR_Material',
  });

  // 1. Initial Gemini Health Check & Demo Load
  useEffect(() => {
    checkHealthAndInit();
  }, []);

  const checkHealthAndInit = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHasAIKey(!!data.hasKey);
    } catch (e) {
      console.warn('Health check failed, fallback to offline mode:', e);
      setHasAIKey(false);
    }

    // Auto load procedural demo material on startup
    loadProceduralMaterial('wood');
  };

  // Helper to recompute full PBR map suite from current Albedo canvas
  const recomputeSuite = async (currentCanvas: HTMLCanvasElement, currentParams: PBRParams) => {
    try {
      const { maps: newMaps, mapCanvases: newCanvases } = await generateFullPBRSuite(currentCanvas, currentParams);
      setMaps(newMaps);
      setMapCanvases(newCanvases);
    } catch (e) {
      console.error('Failed to compute PBR suite:', e);
    }
  };

  // 2. Handler: AI Albedo Synthesis
  const handleGenerateAI = async (
    prompt: string,
    referenceImageBase64?: string,
    resolution: '512px' | '1K' | '2K' = '1K'
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-albedo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: referenceImageBase64,
          resolution,
          seamlesslyTileable: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate texture from AI model.');
      }

      // Load image URL onto HTMLCanvasElement
      const img = await loadImage(data.imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      setAlbedoCanvas(canvas);
      await recomputeSuite(canvas, params);

      // Sanitize naming prefix
      const cleanPrefix = prompt
        .slice(0, 24)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      setExportSettings((prev) => ({ ...prev, prefix: cleanPrefix || 'Material' }));
    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(err?.message || 'Gemini AI synthesis failed. Falling back to procedural preview.');
      // Fallback
      loadProceduralMaterial('stone');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Handler: Refine AI Albedo
  const handleRefineAI = async (refinementPrompt: string) => {
    if (!maps?.albedo) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/refine-albedo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentImageBase64: maps.albedo,
          refinementPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Refinement failed.');
      }

      const img = await loadImage(data.imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      setAlbedoCanvas(canvas);
      await recomputeSuite(canvas, params);
    } catch (err: any) {
      console.error('Refinement error:', err);
      setError(err?.message || 'Refinement failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Handler: Procedural Material Generation
  const loadProceduralMaterial = async (type: 'wood' | 'stone' | 'metal' | 'brick' | 'tile') => {
    const canvas = generateProceduralAlbedo(type, 1024);
    setAlbedoCanvas(canvas);
    await recomputeSuite(canvas, params);
    setExportSettings((prev) => ({ ...prev, prefix: `Procedural_${type.toUpperCase()}` }));
  };

  // 5. Handler: Param Changes
  const handleParamsChange = async (newParams: PBRParams) => {
    setParams(newParams);
    if (albedoCanvas) {
      await recomputeSuite(albedoCanvas, newParams);
    }
  };

  // 6. Handler: Albedo Canvas Update (e.g. from Seamlessness Crossfade Filter)
  const handleUpdateAlbedoCanvas = async (newCanvas: HTMLCanvasElement) => {
    setAlbedoCanvas(newCanvas);
    await recomputeSuite(newCanvas, params);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090a0d] text-neutral-100 overflow-hidden font-sans">
      {/* Header */}
      <Header
        hasAIKey={hasAIKey}
        onLoadDemo={() => loadProceduralMaterial('wood')}
        onExportZIP={maps ? () => setActiveTab('export') : undefined}
      />

      {/* Main Workspace Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: 3D Viewport & 2D Map Inspection (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3 h-full overflow-hidden">
          {/* Top: 3D Viewport */}
          <div className="flex-1 min-h-[360px] h-full relative">
            <ThreeViewport
              maps={maps}
              settings={viewportSettings}
              onUpdateSettings={(newSettings) =>
                setViewportSettings((prev) => ({ ...prev, ...newSettings }))
              }
            />

            {/* Error Overlay Toast */}
            {error && (
              <div className="absolute top-3 left-3 right-3 z-30 bg-rose-950/90 border border-rose-500/50 p-2.5 rounded-lg text-xs text-rose-200 flex items-center justify-between shadow-xl backdrop-blur-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-white font-bold ml-2 px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Bottom 2D Map Channel Selector Bar */}
          <div className="bg-[#121318] p-2 rounded-xl border border-white/10 flex items-center justify-between gap-1 overflow-x-auto shrink-0 select-none">
            <div className="flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5 text-neutral-400 ml-1 mr-1" />
              {(['albedo', 'normal', 'roughness', 'metallic', 'height', 'ao', 'orm'] as TextureMapType[]).map((mapType) => {
                const mapUrl = maps ? maps[mapType] : null;
                const isSelected = selectedPreviewMap === mapType;

                return (
                  <button
                    key={mapType}
                    onClick={() => setSelectedPreviewMap(mapType)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition border ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {mapUrl && (
                      <img
                        src={mapUrl}
                        alt={mapType}
                        className="w-3.5 h-3.5 rounded-sm object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span>{mapType}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Controls, Tools, & Exports (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-[#0e0f14] rounded-xl border border-white/10">
          {/* Navigation Drawer Tabs */}
          <div className="flex items-center border-b border-white/10 bg-black/40 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'input'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Albedo AI</span>
            </button>

            <button
              onClick={() => setActiveTab('seamless')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'seamless'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2. Tileability</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. PBR Math</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>4. Export</span>
            </button>
          </div>

          {/* Tab Content Panels (Scrollable) */}
          <div className="flex-1 p-3 overflow-y-auto space-y-4 custom-scrollbar">
            {activeTab === 'input' && (
              <AlbedoInputPanel
                onGenerateAI={handleGenerateAI}
                onRefineAI={handleRefineAI}
                onGenerateProcedural={loadProceduralMaterial}
                isGenerating={isGenerating}
                hasAIKey={hasAIKey}
                currentAlbedoUrl={maps?.albedo || null}
              />
            )}

            {activeTab === 'seamless' && (
              <SeamlessnessAnalyzer
                albedoCanvas={albedoCanvas}
                onUpdateAlbedoCanvas={handleUpdateAlbedoCanvas}
              />
            )}

            {activeTab === 'editor' && (
              <MapEditorDrawer
                params={params}
                onChangeParams={handleParamsChange}
                onRecomputeAll={() => albedoCanvas && recomputeSuite(albedoCanvas, params)}
                isProcessing={isGenerating}
              />
            )}

            {activeTab === 'export' && (
              <ExportPanel
                maps={maps}
                mapCanvases={mapCanvases}
                exportSettings={exportSettings}
                onChangeExportSettings={setExportSettings}
              />
            )}

            {/* 2D Selected Map Detail Inspector (Bottom of panel) */}
            {maps && maps[selectedPreviewMap] && (
              <div className="bg-[#121318] p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    2D Map Channel Inspection: <span className="text-indigo-400 font-mono">{selectedPreviewMap.toUpperCase()}</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {albedoCanvas ? `${albedoCanvas.width} x ${albedoCanvas.height} px` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-center bg-black/50 p-2 rounded-lg border border-white/5">
                  <img
                    src={maps[selectedPreviewMap]}
                    alt={selectedPreviewMap}
                    className="max-h-52 w-auto object-contain rounded border border-white/10 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
