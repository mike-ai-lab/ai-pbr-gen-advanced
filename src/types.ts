export type TextureMapType = 
  | 'albedo' 
  | 'normal' 
  | 'roughness' 
  | 'metallic' 
  | 'height' 
  | 'ao' 
  | 'orm';

export interface PBRMapData {
  albedo: string;    // Data URL (PNG)
  normal: string;    // Data URL (PNG)
  roughness: string; // Data URL (PNG)
  metallic: string;  // Data URL (PNG)
  height: string;    // Data URL (PNG)
  ao: string;        // Data URL (PNG)
  orm: string;       // Data URL (PNG)
}

export interface PBRParams {
  // Normal map parameters
  normalStrength: number; // 0.1 to 10.0
  invertNormalY: boolean; // DirectX (inverted Y) vs OpenGL

  // Roughness parameters
  roughnessInvert: boolean;
  roughnessContrast: number; // 0.2 to 3.0
  roughnessBrightness: number; // -100 to 100
  roughnessVariance: number; // Detail frequency multiplier

  // Metallic parameters
  metallicThreshold: number; // 0 to 255
  metallicInvert: boolean;
  metallicSmoothness: number; // 0 to 50

  // Height / Displacement parameters
  heightBlur: number; // 0 to 10 blur radius
  heightContrast: number; // 0.5 to 3.0
  heightInvert: boolean;

  // Ambient Occlusion parameters
  aoRadius: number; // 1 to 20
  aoIntensity: number; // 0.1 to 3.0

  // Tile Seamlessness
  seamlessBlendMargin: number; // 0.05 to 0.25 (5% to 25%)
}

export interface AnalysisResult {
  vignettingScore: number; // 0 to 100 (lower is better, <15 is clean)
  edgeTileabilityScore: number; // 0 to 100 (higher is better, >85 is seamless)
  isSeamless: boolean;
  brightnessUniformity: number; // 0 to 100
  warnings: string[];
}

export interface ExportSettings {
  resolution: 512 | 1024 | 2048;
  format: 'png' | 'jpeg';
  prefix: string;
}

export interface ViewportSettings {
  geometry: 'sphere' | 'cube' | 'cylinder' | 'plane' | 'displaced_mesh';
  lightX: number;
  lightY: number;
  lightIntensity: number;
  envRotation: number;
  uvTiling: number;
  displacementScale: number;
  autoRotate: boolean;
  enabledMaps: Record<TextureMapType, boolean>;
  wireframe: boolean;
}

export interface PresetMaterial {
  id: string;
  name: string;
  category: 'Wood' | 'Stone' | 'Metal' | 'Fabric' | 'Ground' | 'Sci-Fi';
  prompt: string;
  thumbnailUrl: string;
}
