import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Image as ImageIcon, RefreshCw, Wand2, Layers, Check, AlertCircle } from 'lucide-react';
import { PresetMaterial } from '../types';

interface AlbedoInputPanelProps {
  onGenerateAI: (prompt: string, referenceImageBase64?: string, resolution?: '512px' | '1K' | '2K') => Promise<void>;
  onRefineAI: (refinementPrompt: string) => Promise<void>;
  onGenerateProcedural: (type: 'wood' | 'stone' | 'metal' | 'brick' | 'tile') => void;
  isGenerating: boolean;
  hasAIKey: boolean;
  currentAlbedoUrl: string | null;
}

const PRESETS: PresetMaterial[] = [
  { id: '1', name: 'Oak Wood Planks', category: 'Wood', prompt: 'Rustic dark oak wooden floor planks with natural wood grain, knots, and fine saw marks', thumbnailUrl: '' },
  { id: '2', name: 'Polished Marble', category: 'Stone', prompt: 'Polished Italian white Carrara marble with subtle grey veins and crystal depth', thumbnailUrl: '' },
  { id: '3', name: 'Brushed Steel', category: 'Metal', prompt: 'Industrial brushed stainless steel plate with fine directional scratches', thumbnailUrl: '' },
  { id: '4', name: 'Red Brick Wall', category: 'Ground', prompt: 'Aged red clay masonry bricks with cement mortar joints', thumbnailUrl: '' },
  { id: '5', name: 'Cracked Desert Mud', category: 'Ground', prompt: 'Dry cracked mud clay earth ground with deep fissures and small pebbles', thumbnailUrl: '' },
  { id: '6', name: 'Woven Linen Fabric', category: 'Fabric', prompt: 'Coarse woven natural beige linen textile fabric cross-hatch pattern', thumbnailUrl: '' },
  { id: '7', name: 'Cyberpunk Panel', category: 'Sci-Fi', prompt: 'Dark sci-fi metallic hull plate with glowing neon yellow ventilation grills and hex rivets', thumbnailUrl: '' },
];

export const AlbedoInputPanel: React.FC<AlbedoInputPanelProps> = ({
  onGenerateAI,
  onRefineAI,
  onGenerateProcedural,
  isGenerating,
  hasAIKey,
  currentAlbedoUrl,
}) => {
  const [prompt, setPrompt] = useState('Rustic dark oak wood planks with natural wood grain and subtle saw marks');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const [refImageName, setRefImageName] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'512px' | '1K' | '2K'>('1K');
  const [activeTab, setActiveTab] = useState<'ai' | 'presets' | 'procedural'>('ai');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRefImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setRefImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearRefImage = () => {
    setRefImageBase64(null);
    setRefImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !refImageBase64) return;
    onGenerateAI(prompt, refImageBase64 || undefined, resolution);
  };

  const handleSubmitRefine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim()) return;
    onRefineAI(refinementPrompt);
    setRefinementPrompt('');
  };

  return (
    <div className="bg-[#121318] rounded-xl border border-white/10 p-4 space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-1 bg-black/40 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI Synthesis</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'presets' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('procedural')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'procedural' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Procedural Math</span>
          </button>
        </div>

        {/* AI Key Status Indicator */}
        <div className="flex items-center space-x-2 text-xs">
          {hasAIKey ? (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemini 2.5 / 3.1 AI Ready</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>AI Key Missing (Using Procedural Mode)</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab 1: AI Prompt & Reference Image Synthesis */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <form onSubmit={handleSubmitAI} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                Text Prompt Description
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the material surface, pattern, tone, micro-texture (e.g., 'Polished white marble with subtle golden streaks', 'Rustic charred wood planks')..."
                rows={2}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {/* Reference Image Upload & Resolution Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Image Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Reference Photo Upload (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {refImageBase64 ? (
                  <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-lg border border-indigo-500/50">
                    <div className="flex items-center space-x-2">
                      <img src={refImageBase64} alt="Reference" className="w-8 h-8 rounded object-cover" />
                      <span className="text-xs text-neutral-300 truncate max-w-[140px]">{refImageName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRefImage}
                      className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-white/20 rounded-lg text-xs text-neutral-400 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload photo (e.g. carpet/wall sample)</span>
                  </button>
                )}
              </div>

              {/* Resolution Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  AI Target Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-xs text-neutral-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="512px">512px (Fast Generation)</option>
                  <option value="1K">1024px (1K Balanced)</option>
                  <option value="2K">2048px (2K High Quality)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing PBR Albedo Map...' : 'Generate Flat Seamless Albedo Map'}</span>
            </button>
          </form>

          {/* Iterative Refinement Section (if Albedo already exists) */}
          {currentAlbedoUrl && (
            <div className="border-t border-white/10 pt-3 mt-3">
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                Iterative Refinement & Tweaking
              </label>
              <form onSubmit={handleSubmitRefine} className="flex gap-2">
                <input
                  type="text"
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder="e.g. 'Make the grain darker with weathered cracks' or 'Add moss in crevices'"
                  className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !refinementPrompt.trim()}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shrink-0"
                >
                  Refine Sample
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Curated Presets */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setPrompt(preset.prompt);
                onGenerateAI(preset.prompt, undefined, resolution);
              }}
              disabled={isGenerating}
              className="flex flex-col text-left p-2.5 bg-black/40 hover:bg-indigo-600/20 active:bg-indigo-600/30 border border-white/10 rounded-lg transition group"
            >
              <span className="text-xs font-bold text-neutral-200 group-hover:text-indigo-300">{preset.name}</span>
              <span className="text-[10px] text-neutral-500 uppercase font-mono mt-0.5">{preset.category}</span>
              <span className="text-[10px] text-neutral-400/80 line-clamp-2 mt-1">{preset.prompt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab 3: Procedural Math Generator (Instant Offline Mode) */}
      {activeTab === 'procedural' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { type: 'wood', name: 'Procedural Wood' },
            { type: 'stone', name: 'Procedural Marble' },
            { type: 'metal', name: 'Procedural Steel' },
            { type: 'brick', name: 'Procedural Brick' },
          ].map(({ type, name }) => (
            <button
              key={type}
              onClick={() => onGenerateProcedural(type as any)}
              className="py-3 px-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-lg text-xs font-semibold text-neutral-200 text-center transition"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
