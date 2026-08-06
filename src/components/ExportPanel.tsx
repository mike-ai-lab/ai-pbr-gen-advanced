import React, { useState } from 'react';
import { Download, Archive, Check, FileArchive, Settings } from 'lucide-react';
import JSZip from 'jszip';
import { ExportSettings, PBRMapData, TextureMapType } from '../types';
import { canvasToDataURL, createCanvas } from '../utils/pbrGenerator';

interface ExportPanelProps {
  maps: PBRMapData | null;
  mapCanvases: Record<string, HTMLCanvasElement> | null;
  exportSettings: ExportSettings;
  onChangeExportSettings: (newSettings: ExportSettings) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  maps,
  mapCanvases,
  exportSettings,
  onChangeExportSettings,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [downloadedMaps, setDownloadedMaps] = useState<Record<string, boolean>>({});

  // Rescale a canvas to target resolution
  const rescaleCanvas = (sourceCanvas: HTMLCanvasElement, targetSize: number): HTMLCanvasElement => {
    if (sourceCanvas.width === targetSize && sourceCanvas.height === targetSize) {
      return sourceCanvas;
    }
    const scaledCanvas = createCanvas(targetSize, targetSize);
    const ctx = scaledCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
    return scaledCanvas;
  };

  // Helper to trigger browser download and revoke object URL
  const downloadDataURL = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle single map export
  const handleDownloadSingle = (mapType: TextureMapType) => {
    if (!mapCanvases || !mapCanvases[mapType]) return;

    const sourceCanvas = mapCanvases[mapType];
    const scaledCanvas = rescaleCanvas(sourceCanvas, exportSettings.resolution);
    const dataUrl = canvasToDataURL(scaledCanvas, exportSettings.format);

    const ext = exportSettings.format === 'jpeg' ? 'jpg' : 'png';
    const filename = `${exportSettings.prefix || 'Material'}_${mapType.toUpperCase()}.${ext}`;

    downloadDataURL(dataUrl, filename);

    setDownloadedMaps((prev) => ({ ...prev, [mapType]: true }));
    setTimeout(() => {
      setDownloadedMaps((prev) => ({ ...prev, [mapType]: false }));
    }, 2000);
  };

  // Handle full ZIP package download
  const handleDownloadZIP = async () => {
    if (!mapCanvases) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const prefix = exportSettings.prefix || 'Material';
      const ext = exportSettings.format === 'jpeg' ? 'jpg' : 'png';

      const mapNames: TextureMapType[] = ['albedo', 'normal', 'roughness', 'metallic', 'height', 'ao', 'orm'];

      for (const mapType of mapNames) {
        if (mapCanvases[mapType]) {
          const scaledCanvas = rescaleCanvas(mapCanvases[mapType], exportSettings.resolution);
          const dataUrl = canvasToDataURL(scaledCanvas, exportSettings.format);
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');

          zip.file(`${prefix}_${mapType.toUpperCase()}.${ext}`, base64Data, { base64: true });
        }
      }

      // Add readme description text file
      const infoText = `PBR Material Suite Package
Generated with PBR Material Suite Generator
Material Name: ${prefix}
Resolution: ${exportSettings.resolution}x${exportSettings.resolution}
Format: ${exportSettings.format.toUpperCase()}
Included Maps:
- Albedo (Base Color)
- Normal Map (Tangential DirectX/OpenGL Height Vectors)
- Roughness Map
- Metallic Map
- Height/Displacement Map
- Ambient Occlusion (AO)
- Packed ORM (R: AO, G: Roughness, B: Metallic)
`;
      zip.file('readme_material_info.txt', infoText);

      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);

      downloadDataURL(zipUrl, `${prefix}_PBR_Suite_${exportSettings.resolution}p.zip`);

      // Cleanup object URL
      setTimeout(() => {
        URL.revokeObjectURL(zipUrl);
      }, 5000);
    } catch (e) {
      console.error('ZIP generation error:', e);
    } finally {
      setIsZipping(false);
    }
  };

  if (!maps) {
    return (
      <div className="p-6 text-center text-neutral-500 bg-[#121318] rounded-xl border border-white/10">
        Generate a material to enable texture map export options.
      </div>
    );
  }

  const mapList: { type: TextureMapType; name: string; desc: string; color: string }[] = [
    { type: 'albedo', name: 'Albedo (Base Color)', desc: 'Flat diffuse color texture without baked lighting', color: 'border-indigo-500/30 text-indigo-300' },
    { type: 'normal', name: 'Normal Map', desc: 'Tangent-space surface height orientation', color: 'border-purple-500/30 text-purple-300' },
    { type: 'roughness', name: 'Roughness Map', desc: 'Micro-surface specular reflection spread', color: 'border-emerald-500/30 text-emerald-300' },
    { type: 'metallic', name: 'Metallic Map', desc: 'Dielectric vs conductor reflection mask', color: 'border-amber-500/30 text-amber-300' },
    { type: 'height', name: 'Height / Displacement', desc: 'Grayscale vertex offset displacement map', color: 'border-cyan-500/30 text-cyan-300' },
    { type: 'ao', name: 'Ambient Occlusion (AO)', desc: 'Deep crevice ambient shadow attenuation', color: 'border-blue-500/30 text-blue-300' },
    { type: 'orm', name: 'Packed ORM Map', desc: 'R: AO | G: Roughness | B: Metallic combined', color: 'border-rose-500/30 text-rose-300' },
  ];

  return (
    <div className="bg-[#121318] rounded-xl border border-white/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <Archive className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
            Export Management & Pre-Generation Settings
          </h3>
        </div>

        {/* Master ZIP Download Button */}
        <button
          onClick={handleDownloadZIP}
          disabled={isZipping}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-lg transition"
        >
          <FileArchive className={`w-4 h-4 ${isZipping ? 'animate-bounce' : ''}`} />
          <span>{isZipping ? 'Packaging ZIP Archive...' : `Export All as ZIP (${exportSettings.resolution}px)`}</span>
        </button>
      </div>

      {/* Pre-Export Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-400 uppercase mb-1">
            Asset Name Prefix
          </label>
          <input
            type="text"
            value={exportSettings.prefix}
            onChange={(e) => onChangeExportSettings({ ...exportSettings, prefix: e.target.value })}
            placeholder="e.g. Oak_Wood_Planks"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-400 uppercase mb-1">
            Export Texture Resolution
          </label>
          <select
            value={exportSettings.resolution}
            onChange={(e) => onChangeExportSettings({ ...exportSettings, resolution: parseInt(e.target.value) as any })}
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:border-indigo-500 focus:outline-none"
          >
            <option value={512}>512 x 512 px (Fast / Mobile)</option>
            <option value={1024}>1024 x 1024 px (1K Standard)</option>
            <option value={2048}>2048 x 2048 px (2K High Quality)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-400 uppercase mb-1">
            File Format
          </label>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => onChangeExportSettings({ ...exportSettings, format: 'png' })}
              className={`flex-1 py-1.5 text-xs font-mono transition ${exportSettings.format === 'png' ? 'bg-indigo-600 text-white font-bold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              PNG (Lossless)
            </button>
            <button
              onClick={() => onChangeExportSettings({ ...exportSettings, format: 'jpeg' })}
              className={`flex-1 py-1.5 text-xs font-mono transition ${exportSettings.format === 'jpeg' ? 'bg-indigo-600 text-white font-bold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              JPG (Compressed)
            </button>
          </div>
        </div>
      </div>

      {/* Individual Map Downloads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {mapList.map(({ type, name, desc, color }) => {
          const mapDataUrl = maps[type];
          const downloaded = downloadedMaps[type];

          return (
            <div key={type} className={`bg-black/30 p-3 rounded-lg border ${color} flex flex-col justify-between space-y-2`}>
              <div className="flex items-start space-x-2">
                <img
                  src={mapDataUrl}
                  alt={name}
                  className="w-12 h-12 rounded object-cover border border-white/10 shrink-0 bg-neutral-900"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <span className="block text-xs font-bold text-neutral-200 truncate">{name}</span>
                  <span className="block text-[10px] text-neutral-400 leading-tight line-clamp-2">{desc}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadSingle(type)}
                className="w-full flex items-center justify-center space-x-1 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-200 rounded border border-white/10 text-xs font-medium transition"
              >
                {downloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Downloaded</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {type.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
