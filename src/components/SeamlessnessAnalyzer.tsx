import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Grid, ShieldCheck, Sparkles } from 'lucide-react';
import { AnalysisResult } from '../types';
import { analyzeQuality, makeSeamlessCrossfade } from '../utils/pbrGenerator';

interface SeamlessnessAnalyzerProps {
  albedoCanvas: HTMLCanvasElement | null;
  onUpdateAlbedoCanvas: (newCanvas: HTMLCanvasElement) => void;
}

export const SeamlessnessAnalyzer: React.FC<SeamlessnessAnalyzerProps> = ({
  albedoCanvas,
  onUpdateAlbedoCanvas,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [gridRepeat, setGridRepeat] = useState<2 | 3>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blendMargin, setBlendMargin] = useState(0.15); // 15% crossfade margin

  // 1. Render 2D Tile Repeat Grid & Analyze Quality when albedoCanvas changes
  useEffect(() => {
    if (!albedoCanvas) return;

    // Run Quality Analysis
    const result = analyzeQuality(albedoCanvas);
    setAnalysis(result);

    // Render 2D Repeat Grid
    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      const ctx = pCanvas.getContext('2d')!;
      const size = pCanvas.width;
      const tileSize = size / gridRepeat;

      ctx.clearRect(0, 0, size, size);

      for (let r = 0; r < gridRepeat; r++) {
        for (let c = 0; c < gridRepeat; c++) {
          ctx.drawImage(albedoCanvas, c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }

      // Draw subtle grid crosslines to indicate tile bounds
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i < gridRepeat; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tileSize, 0);
        ctx.lineTo(i * tileSize, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * tileSize);
        ctx.lineTo(size, i * tileSize);
        ctx.stroke();
      }
    }
  }, [albedoCanvas, gridRepeat]);

  // 2. Handle One-Click Automated Seamlessness Fix
  const handleApplySeamlessFilter = async () => {
    if (!albedoCanvas) return;
    setIsProcessing(true);
    try {
      const seamlessCanvas = await makeSeamlessCrossfade(albedoCanvas, blendMargin);
      onUpdateAlbedoCanvas(seamlessCanvas);
    } catch (e) {
      console.error('Failed to apply seamless crossfade:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!albedoCanvas) {
    return (
      <div className="p-6 text-center text-neutral-500 bg-[#121318] rounded-xl border border-white/10">
        Generate or upload an Albedo texture first to analyze seamlessness.
      </div>
    );
  }

  return (
    <div className="bg-[#121318] rounded-xl border border-white/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <Grid className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
            Tileability & Quality Verification
          </h3>
        </div>

        {/* 2D Grid repeat selector */}
        <div className="flex items-center space-x-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
          <button
            onClick={() => setGridRepeat(2)}
            className={`px-2 py-1 rounded text-xs transition ${gridRepeat === 2 ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            2x2 Grid
          </button>
          <button
            onClick={() => setGridRepeat(3)}
            className={`px-2 py-1 rounded text-xs transition ${gridRepeat === 3 ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            3x3 Grid
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: 2D Repeat Preview */}
        <div className="flex flex-col items-center justify-center bg-black/40 p-3 rounded-lg border border-white/5 relative">
          <canvas
            ref={previewCanvasRef}
            width={380}
            height={380}
            className="w-full max-w-[340px] h-auto aspect-square rounded-md shadow-inner border border-white/10"
          />
          <span className="mt-2 text-[11px] text-neutral-400 italic">
            2D Repeat Tiling Grid ({gridRepeat}x{gridRepeat}) — Check for repeating seam lines
          </span>
        </div>

        {/* Right: Automated Verification Stats & Fix Button */}
        <div className="flex flex-col justify-between space-y-4 bg-black/30 p-4 rounded-lg border border-white/5">
          <div>
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
              Automated Analysis Scores
            </h4>

            {analysis && (
              <div className="space-y-3">
                {/* Edge Tileability Score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Edge Tileability Score:</span>
                    <span className={`font-mono font-bold ${analysis.edgeTileabilityScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {analysis.edgeTileabilityScore}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${analysis.edgeTileabilityScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${analysis.edgeTileabilityScore}%` }}
                    />
                  </div>
                </div>

                {/* Lighting Uniformity */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Lighting Uniformity (No Vignette):</span>
                    <span className={`font-mono font-bold ${analysis.brightnessUniformity >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {analysis.brightnessUniformity}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${analysis.brightnessUniformity >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${analysis.brightnessUniformity}%` }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="pt-2">
                  {analysis.isSeamless ? (
                    <div className="flex items-center space-x-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Material texture passes seamless tileability verification!</span>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-semibold block">Seam/Vignette warning detected.</span>
                        {analysis.warnings.map((w, i) => (
                          <span key={i} className="block text-[11px] text-amber-300/80">• {w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Automated Crossfade Fix Tool */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="font-semibold">Seamless Crossfade Margin:</span>
              <span className="font-mono text-indigo-400">{Math.round(blendMargin * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.25"
              step="0.01"
              value={blendMargin}
              onChange={(e) => setBlendMargin(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />

            <button
              onClick={handleApplySeamlessFilter}
              disabled={isProcessing}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Processing Seamless Blend...' : 'Apply Automated Seamless Crossfade'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
