import { AnalysisResult, PBRMapData, PBRParams } from '../types';

/**
 * Creates an HTMLCanvasElement with specific dimensions
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Loads an image URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Converts ImageData or Canvas to PNG Data URL
 */
export function canvasToDataURL(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png'): string {
  return canvas.toDataURL(`image/${format}`, 0.92);
}

/**
 * Creates ImageData from Canvas
 */
export function getCanvasImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Automated Seamless Crossfade Algorithm
 * Shifts texture by 50% horizontally & vertically, then cross-fades central seams
 */
export async function makeSeamlessCrossfade(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  blendMarginPercent: number = 0.15
): Promise<HTMLCanvasElement> {
  const width = sourceImage.width;
  const height = sourceImage.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  // 1. Draw offset source image (Shifted by w/2, h/2)
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  // Buffer canvas for offset calculation
  const bufferCanvas = createCanvas(width, height);
  const bufferCtx = bufferCanvas.getContext('2d')!;

  // Draw 4 quadrants offset
  bufferCtx.drawImage(sourceImage, 0, 0, halfW, halfH, halfW, halfH, halfW, halfH); // Top-left -> Bottom-right
  bufferCtx.drawImage(sourceImage, halfW, 0, width - halfW, halfH, 0, halfH, width - halfW, halfH); // Top-right -> Bottom-left
  bufferCtx.drawImage(sourceImage, 0, halfH, halfW, height - halfH, halfW, 0, halfW, height - halfH); // Bottom-left -> Top-right
  bufferCtx.drawImage(sourceImage, halfW, halfH, width - halfW, height - halfH, 0, 0, width - halfW, height - halfH); // Bottom-right -> Top-left

  // Draw original and offset with gradient blending mask along center cross
  const offsetImgData = bufferCtx.getImageData(0, 0, width, height);

  // Create temporary original canvas
  const origCanvas = createCanvas(width, height);
  const origCtx = origCanvas.getContext('2d')!;
  origCtx.drawImage(sourceImage, 0, 0);
  const origImgData = origCtx.getImageData(0, 0, width, height);

  const outputImgData = ctx.createImageData(width, height);
  const blendW = Math.floor(width * blendMarginPercent);
  const blendH = Math.floor(height * blendMarginPercent);

  const origData = origImgData.data;
  const offsetData = offsetImgData.data;
  const outData = outputImgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Distance from center cross (x = halfW, y = halfH)
      const distX = Math.abs(x - halfW);
      const distY = Math.abs(y - halfH);

      // Smooth step factor (1 inside seam center, 0 outside blend radius)
      let factorX = 0;
      if (distX < blendW) {
        factorX = 0.5 * (1 + Math.cos((Math.PI * distX) / blendW));
      }

      let factorY = 0;
      if (distY < blendH) {
        factorY = 0.5 * (1 + Math.cos((Math.PI * distY) / blendH));
      }

      // Max blend weight along the crosshairs
      const blendWeight = Math.max(factorX, factorY);

      // Linear interpolation between orig and offset
      for (let c = 0; c < 3; c++) {
        outData[idx + c] = Math.round(
          origData[idx + c] * (1 - blendWeight) + offsetData[idx + c] * blendWeight
        );
      }
      outData[idx + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(outputImgData, 0, 0);
  return canvas;
}

/**
 * Quality Verification Analyzer
 * Evaluates non-uniform lighting/vignetting & seam continuity
 */
export function analyzeQuality(canvas: HTMLCanvasElement): AnalysisResult {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Calculate Center vs Corner Luminance (Vignetting check)
  let centerLumSum = 0;
  let centerCount = 0;
  let cornerLumSum = 0;
  let cornerCount = 0;

  const centerRadiusX = width * 0.25;
  const centerRadiusY = height * 0.25;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      if (dx < centerRadiusX && dy < centerRadiusY) {
        centerLumSum += lum;
        centerCount++;
      } else if (x < width * 0.15 || x > width * 0.85 || y < height * 0.15 || y > height * 0.85) {
        cornerLumSum += lum;
        cornerCount++;
      }
    }
  }

  const avgCenter = centerCount > 0 ? centerLumSum / centerCount : 128;
  const avgCorner = cornerCount > 0 ? cornerLumSum / cornerCount : 128;

  const vignettingScore = Math.min(100, Math.round((Math.abs(avgCenter - avgCorner) / 128) * 100));

  // 2. Calculate Edge Seam Discontinuity (Left vs Right edge, Top vs Bottom edge)
  let edgeDiffSum = 0;
  let edgeSamples = 0;

  for (let i = 0; i < height; i += 2) {
    const leftIdx = (i * width + 0) * 4;
    const rightIdx = (i * width + (width - 1)) * 4;

    const diffR = Math.abs(data[leftIdx] - data[rightIdx]);
    const diffG = Math.abs(data[leftIdx + 1] - data[rightIdx + 1]);
    const diffB = Math.abs(data[leftIdx + 2] - data[rightIdx + 2]);

    edgeDiffSum += (diffR + diffG + diffB) / 3;
    edgeSamples++;
  }

  for (let i = 0; i < width; i += 2) {
    const topIdx = (0 * width + i) * 4;
    const botIdx = ((height - 1) * width + i) * 4;

    const diffR = Math.abs(data[topIdx] - data[botIdx]);
    const diffG = Math.abs(data[topIdx + 1] - data[botIdx + 1]);
    const diffB = Math.abs(data[topIdx + 2] - data[botIdx + 2]);

    edgeDiffSum += (diffR + diffG + diffB) / 3;
    edgeSamples++;
  }

  const avgEdgeDiff = edgeSamples > 0 ? edgeDiffSum / edgeSamples : 0;
  const edgeTileabilityScore = Math.max(0, Math.min(100, Math.round(100 - (avgEdgeDiff / 128) * 100)));

  const warnings: string[] = [];
  if (vignettingScore > 20) {
    warnings.push('Lighting non-uniformity/vignetting detected (center is brighter than edges).');
  }
  if (edgeTileabilityScore < 80) {
    warnings.push('Visible edge seams detected across left/right or top/bottom tile borders.');
  }

  return {
    vignettingScore,
    edgeTileabilityScore,
    isSeamless: edgeTileabilityScore >= 80 && vignettingScore <= 25,
    brightnessUniformity: 100 - vignettingScore,
    warnings,
  };
}

/**
 * Computes Height / Displacement Map
 */
export function computeHeightMap(albedoCanvas: HTMLCanvasElement, params: PBRParams): HTMLCanvasElement {
  const width = albedoCanvas.width;
  const height = albedoCanvas.height;
  const ctx = albedoCanvas.getContext('2d')!;
  const srcData = ctx.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const contrast = params.heightContrast;
  const invert = params.heightInvert;

  for (let i = 0; i < srcData.length; i += 4) {
    let lum = 0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2];

    // Contrast stretch
    lum = (lum / 255 - 0.5) * contrast + 0.5;
    lum = Math.max(0, Math.min(1, lum));

    if (invert) {
      lum = 1.0 - lum;
    }

    const val = Math.round(lum * 255);
    outData[i] = val;
    outData[i + 1] = val;
    outData[i + 2] = val;
    outData[i + 3] = 255;
  }

  outCtx.putImageData(outImgData, 0, 0);

  // Apply height blur if requested to smooth out high-frequency noise for displacement
  if (params.heightBlur > 0) {
    const blurCanvas = createCanvas(width, height);
    const blurCtx = blurCanvas.getContext('2d')!;
    blurCtx.filter = `blur(${params.heightBlur}px)`;
    blurCtx.drawImage(outputCanvas, 0, 0);
    return blurCanvas;
  }

  return outputCanvas;
}

/**
 * Computes Normal Map using Sobel Filter on Height/Grayscale Data
 */
export function computeNormalMap(heightCanvas: HTMLCanvasElement, params: PBRParams): HTMLCanvasElement {
  const width = heightCanvas.width;
  const height = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d')!;
  const srcData = ctx.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const strength = params.normalStrength;
  const invertY = params.invertNormalY;

  // Helper to read luminance safely with tile wrapping (toroidal repeat)
  const getLumAt = (x: number, y: number): number => {
    const wx = (x + width) % width;
    const wy = (y + height) % height;
    const idx = (wy * width + wx) * 4;
    return (srcData[idx] + srcData[idx + 1] + srcData[idx + 2]) / (3 * 255);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Sobel kernel for dX
      // [-1 0 1]
      // [-2 0 2]
      // [-1 0 1]
      const dx =
        (getLumAt(x + 1, y - 1) + 2 * getLumAt(x + 1, y) + getLumAt(x + 1, y + 1)) -
        (getLumAt(x - 1, y - 1) + 2 * getLumAt(x - 1, y) + getLumAt(x - 1, y + 1));

      // Sobel kernel for dY
      // [-1 -2 -1]
      // [ 0  0  0]
      // [ 1  2  1]
      const dy =
        (getLumAt(x - 1, y + 1) + 2 * getLumAt(x, y + 1) + getLumAt(x + 1, y + 1)) -
        (getLumAt(x - 1, y - 1) + 2 * getLumAt(x, y - 1) + getLumAt(x + 1, y - 1));

      // Compute normal vector (Nx, Ny, Nz)
      let nx = -dx * strength;
      let ny = invertY ? dy * strength : -dy * strength;
      let nz = 1.0;

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      // Map from [-1, 1] to [0, 255]
      outData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      outData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      outData[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      outData[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

/**
 * Computes Roughness Map from Albedo & High Frequency Texture Gradient
 */
export function computeRoughnessMap(albedoCanvas: HTMLCanvasElement, params: PBRParams): HTMLCanvasElement {
  const width = albedoCanvas.width;
  const height = albedoCanvas.height;
  const ctx = albedoCanvas.getContext('2d')!;
  const srcData = ctx.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const { roughnessInvert, roughnessContrast, roughnessBrightness, roughnessVariance } = params;

  // Compute local variance/high-frequency detail
  const getLum = (x: number, y: number): number => {
    const wx = (x + width) % width;
    const wy = (y + height) % height;
    const idx = (wy * width + wx) * 4;
    return (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const center = getLum(x, y);
      const right = getLum(x + 1, y);
      const bottom = getLum(x, y + 1);

      // Local gradient magnitude (surface micro-roughness detail)
      const grad = Math.sqrt((right - center) ** 2 + (bottom - center) ** 2) * roughnessVariance;

      // Base luminance + local high frequency micro-roughness detail
      let rough = center * 0.6 + grad * 0.4;

      // Apply invert if specular inversion is chosen
      if (roughnessInvert) {
        rough = 1.0 - rough;
      }

      // Apply contrast stretch & brightness offset
      rough = (rough - 0.5) * roughnessContrast + 0.5 + roughnessBrightness / 255;
      rough = Math.max(0, Math.min(1, rough));

      const val = Math.round(rough * 255);
      outData[idx] = val;
      outData[idx + 1] = val;
      outData[idx + 2] = val;
      outData[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

/**
 * Computes Metallic Map from Albedo thresholding & specular saturation analysis
 */
export function computeMetallicMap(albedoCanvas: HTMLCanvasElement, params: PBRParams): HTMLCanvasElement {
  const width = albedoCanvas.width;
  const height = albedoCanvas.height;
  const ctx = albedoCanvas.getContext('2d')!;
  const srcData = ctx.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const { metallicThreshold, metallicInvert, metallicSmoothness } = params;

  for (let i = 0; i < srcData.length; i += 4) {
    const r = srcData[i];
    const g = srcData[i + 1];
    const b = srcData[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Smoothstep threshold
    let metalVal = 0;
    const low = Math.max(0, metallicThreshold - metallicSmoothness);
    const high = Math.min(255, metallicThreshold + metallicSmoothness);

    if (high === low) {
      metalVal = lum >= metallicThreshold ? 255 : 0;
    } else {
      const t = Math.max(0, Math.min(1, (lum - low) / (high - low)));
      metalVal = Math.round(t * t * (3 - 2 * t) * 255);
    }

    if (metallicInvert) {
      metalVal = 255 - metalVal;
    }

    outData[i] = metalVal;
    outData[i + 1] = metalVal;
    outData[i + 2] = metalVal;
    outData[i + 3] = 255;
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

/**
 * Computes Ambient Occlusion (AO) Map using High-Pass Blur Inversion from Height Map
 */
export function computeAOMap(heightCanvas: HTMLCanvasElement, params: PBRParams): HTMLCanvasElement {
  const width = heightCanvas.width;
  const height = heightCanvas.height;

  // 1. Create blurred copy of height map
  const blurCanvas = createCanvas(width, height);
  const blurCtx = blurCanvas.getContext('2d')!;
  blurCtx.filter = `blur(${Math.max(1, params.aoRadius)}px)`;
  blurCtx.drawImage(heightCanvas, 0, 0);

  const origCtx = heightCanvas.getContext('2d')!;
  const origData = origCtx.getImageData(0, 0, width, height).data;
  const blurData = blurCtx.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const intensity = params.aoIntensity;

  for (let i = 0; i < origData.length; i += 4) {
    const hOrig = origData[i] / 255;
    const hBlur = blurData[i] / 255;

    // Crevices occur where blurred height is higher than original fine height
    const diff = hOrig - hBlur;
    let ao = 1.0 + Math.min(0, diff) * intensity;
    ao = Math.max(0, Math.min(1, ao));

    const val = Math.round(ao * 255);
    outData[i] = val;
    outData[i + 1] = val;
    outData[i + 2] = val;
    outData[i + 3] = 255;
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

/**
 * Computes Packed ORM Map: Red = AO, Green = Roughness, Blue = Metallic
 */
export function computeORMMap(
  aoCanvas: HTMLCanvasElement,
  roughnessCanvas: HTMLCanvasElement,
  metallicCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const width = aoCanvas.width;
  const height = aoCanvas.height;

  const aoData = aoCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const roughData = roughnessCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const metalData = metallicCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  for (let i = 0; i < outData.length; i += 4) {
    outData[i] = aoData[i];         // R = Ambient Occlusion
    outData[i + 1] = roughData[i];  // G = Roughness
    outData[i + 2] = metalData[i];  // B = Metallic
    outData[i + 3] = 255;           // A = Alpha
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

/**
 * Computes ALL 7 PBR Maps from an Albedo canvas
 */
export async function generateFullPBRSuite(
  albedoCanvas: HTMLCanvasElement,
  params: PBRParams
): Promise<{ maps: PBRMapData; mapCanvases: Record<string, HTMLCanvasElement> }> {
  const heightCanvas = computeHeightMap(albedoCanvas, params);
  const normalCanvas = computeNormalMap(heightCanvas, params);
  const roughnessCanvas = computeRoughnessMap(albedoCanvas, params);
  const metallicCanvas = computeMetallicMap(albedoCanvas, params);
  const aoCanvas = computeAOMap(heightCanvas, params);
  const ormCanvas = computeORMMap(aoCanvas, roughnessCanvas, metallicCanvas);

  const maps: PBRMapData = {
    albedo: canvasToDataURL(albedoCanvas),
    normal: canvasToDataURL(normalCanvas),
    roughness: canvasToDataURL(roughnessCanvas),
    metallic: canvasToDataURL(metallicCanvas),
    height: canvasToDataURL(heightCanvas),
    ao: canvasToDataURL(aoCanvas),
    orm: canvasToDataURL(ormCanvas),
  };

  const mapCanvases = {
    albedo: albedoCanvas,
    normal: normalCanvas,
    roughness: roughnessCanvas,
    metallic: metallicCanvas,
    height: heightCanvas,
    ao: aoCanvas,
    orm: ormCanvas,
  };

  return { maps, mapCanvases };
}

/**
 * Procedural Fallback Albedo Generator (for instant preview or offline mode)
 */
export function generateProceduralAlbedo(
  type: 'wood' | 'stone' | 'metal' | 'brick' | 'tile' = 'stone',
  size: number = 1024
): HTMLCanvasElement {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      let r = 128, g = 128, b = 128;

      if (type === 'wood') {
        const ring = Math.sin((Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 30) + Math.sin(nx * 10) * 0.5);
        r = 160 + ring * 40;
        g = 100 + ring * 30;
        b = 50 + ring * 20;
      } else if (type === 'brick') {
        const row = Math.floor(ny * 10);
        const colShift = (row % 2) * 0.05;
        const col = Math.floor((nx + colShift) * 10);
        const isMortar = ((nx + colShift) * 10) % 1 < 0.08 || (ny * 10) % 1 < 0.08;

        if (isMortar) {
          r = 200; g = 200; b = 200;
        } else {
          r = 180 + Math.sin(col * 3 + row) * 20;
          g = 70 + Math.cos(col * 2) * 15;
          b = 50;
        }
      } else if (type === 'metal') {
        const noise = (Math.sin(nx * 100) * Math.cos(ny * 100) + 1) * 0.5;
        const val = 170 + noise * 60;
        r = val; g = val + 5; b = val + 15;
      } else { // stone / marble
        const n1 = Math.sin(nx * 12 + Math.cos(ny * 12) * 2);
        const val = 140 + n1 * 50;
        r = val; g = val - 5; b = val - 10;
      }

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
