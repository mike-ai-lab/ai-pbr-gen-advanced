import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sun, Maximize2, Layers, Eye, EyeOff, Box, Circle, Cylinder as CylinderIcon, Square, Grid } from 'lucide-react';
import { PBRMapData, ViewportSettings, TextureMapType } from '../types';

interface ThreeViewportProps {
  maps: PBRMapData | null;
  settings: ViewportSettings;
  onUpdateSettings: (newSettings: Partial<ViewportSettings>) => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  maps,
  settings,
  onUpdateSettings,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const texturesRef = useRef<Record<string, THREE.CanvasTexture>>({});
  const animFrameRef = useRef<number | null>(null);

  // Mouse interaction state for camera controls
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 3.5 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Initialize Three.js Scene on Mount
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#121318');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const { theta, phi, radius } = cameraRotationRef.current;
    camera.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(cameraTargetRef.current);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5ea, settings.lightIntensity);
    dirLight.position.set(settings.lightX, settings.lightY, 2.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Fill Rim Light
    const rimLight = new THREE.DirectionalLight(0x88bbff, 0.4);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    // Initial Material
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.5,
      metalness: 0.0,
    });
    materialRef.current = material;

    // Initial Mesh
    const geometry = createGeometry(settings.geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Grid floor helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x333344, 0x222233);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (meshRef.current && settings.autoRotate && !isDraggingRef.current) {
        meshRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(mountRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Memory Disposals
      Object.values(texturesRef.current).forEach((tex: THREE.Texture) => tex.dispose());
      texturesRef.current = {};

      if (meshRef.current) {
        meshRef.current.geometry.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && rendererRef.current.domElement) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // 2. Helper to Create Three.js Geometries
  function createGeometry(type: ViewportSettings['geometry']): THREE.BufferGeometry {
    switch (type) {
      case 'sphere':
        return new THREE.SphereGeometry(1.0, 128, 128);
      case 'cube':
        return new THREE.BoxGeometry(1.5, 1.5, 1.5, 64, 64, 64);
      case 'cylinder':
        return new THREE.CylinderGeometry(0.9, 0.9, 1.8, 64, 64);
      case 'plane':
        return new THREE.PlaneGeometry(2.2, 2.2, 1, 1);
      case 'displaced_mesh':
      default:
        return new THREE.PlaneGeometry(2.2, 2.2, 256, 256);
    }
  }

  // 3. Update Geometry when settings.geometry changes
  useEffect(() => {
    if (!meshRef.current || !sceneRef.current) return;
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = createGeometry(settings.geometry);
  }, [settings.geometry]);

  // 4. Load & Attach Textures when maps change
  useEffect(() => {
    if (!maps || !materialRef.current) return;

    const textureLoader = new THREE.TextureLoader();

    // Helper to update individual texture channel
    const loadMap = (url: string, enabled: boolean, onLoaded: (tex: THREE.Texture) => void) => {
      if (!enabled || !url) return null;

      const texture = textureLoader.load(url, (loadedTex) => {
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.RepeatWrapping;
        loadedTex.repeat.set(settings.uvTiling, settings.uvTiling);
        loadedTex.needsUpdate = true;
        onLoaded(loadedTex);
      });
      return texture;
    };

    const mat = materialRef.current;

    // Albedo
    if (settings.enabledMaps.albedo && maps.albedo) {
      loadMap(maps.albedo, true, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      });
    } else {
      mat.map = null;
      mat.color.setHex(0xaaaaaa);
    }

    // Normal
    if (settings.enabledMaps.normal && maps.normal) {
      loadMap(maps.normal, true, (tex) => {
        mat.normalMap = tex;
        mat.normalScale.set(1, 1);
        mat.needsUpdate = true;
      });
    } else {
      mat.normalMap = null;
    }

    // Roughness
    if (settings.enabledMaps.roughness && maps.roughness) {
      loadMap(maps.roughness, true, (tex) => {
        mat.roughnessMap = tex;
        mat.roughness = 1.0;
        mat.needsUpdate = true;
      });
    } else {
      mat.roughnessMap = null;
      mat.roughness = 0.5;
    }

    // Metallic
    if (settings.enabledMaps.metallic && maps.metallic) {
      loadMap(maps.metallic, true, (tex) => {
        mat.metalnessMap = tex;
        mat.metalness = 1.0;
        mat.needsUpdate = true;
      });
    } else {
      mat.metalnessMap = null;
      mat.metalness = 0.0;
    }

    // Height / Displacement
    if (settings.enabledMaps.height && maps.height) {
      loadMap(maps.height, true, (tex) => {
        mat.displacementMap = tex;
        mat.displacementScale = settings.displacementScale;
        mat.displacementBias = -settings.displacementScale * 0.5;
        mat.needsUpdate = true;
      });
    } else {
      mat.displacementMap = null;
      mat.displacementScale = 0;
    }

    // Ambient Occlusion
    if (settings.enabledMaps.ao && maps.ao) {
      loadMap(maps.ao, true, (tex) => {
        mat.aoMap = tex;
        mat.aoMapIntensity = 1.0;
        mat.needsUpdate = true;
      });
    } else {
      mat.aoMap = null;
    }

    mat.wireframe = settings.wireframe;
    mat.needsUpdate = true;
  }, [maps, settings.enabledMaps, settings.wireframe]);

  // 5. Update UV Tiling & Displacement depth on settings change
  useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;

    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'aoMap'].forEach((mapName) => {
      const tex = (mat as any)[mapName] as THREE.Texture | null;
      if (tex) {
        tex.repeat.set(settings.uvTiling, settings.uvTiling);
        tex.needsUpdate = true;
      }
    });

    if (mat.displacementMap) {
      mat.displacementScale = settings.displacementScale;
      mat.displacementBias = -settings.displacementScale * 0.5;
    }

    if (dirLightRef.current) {
      dirLightRef.current.position.set(settings.lightX, settings.lightY, 2.5);
      dirLightRef.current.intensity = settings.lightIntensity;
    }

    mat.wireframe = settings.wireframe;
  }, [settings.uvTiling, settings.displacementScale, settings.lightX, settings.lightY, settings.lightIntensity, settings.wireframe]);

  // 6. Camera Mouse Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      isDraggingRef.current = true;
    } else if (e.button === 2) {
      isPanningRef.current = true;
    }
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current && !isPanningRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (isDraggingRef.current) {
      const rot = cameraRotationRef.current;
      rot.theta -= deltaX * 0.008;
      rot.phi = Math.max(0.1, Math.min(Math.PI - 0.1, rot.phi - deltaY * 0.008));
      updateCameraPosition();
    } else if (isPanningRef.current) {
      const panSpeed = 0.003;
      cameraTargetRef.current.x -= deltaX * panSpeed;
      cameraTargetRef.current.y += deltaY * panSpeed;
      updateCameraPosition();
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const rot = cameraRotationRef.current;
    rot.radius = Math.max(1.2, Math.min(8.0, rot.radius + e.deltaY * 0.003));
    updateCameraPosition();
  };

  function updateCameraPosition() {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraRotationRef.current;
    cameraRef.current.position.set(
      cameraTargetRef.current.x + radius * Math.sin(phi) * Math.cos(theta),
      cameraTargetRef.current.y + radius * Math.cos(phi),
      cameraTargetRef.current.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    cameraRef.current.lookAt(cameraTargetRef.current);
  }

  const toggleMap = (mapType: TextureMapType) => {
    onUpdateSettings({
      enabledMaps: {
        ...settings.enabledMaps,
        [mapType]: !settings.enabledMaps[mapType],
      },
    });
  };

  return (
    <div className={`relative flex flex-col bg-[#0e0f12] rounded-xl border border-white/10 overflow-hidden select-none ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full min-h-[420px]'}`}>
      {/* Viewport Top Bar Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            3D PBR Realtime Viewport
          </span>
        </div>

        {/* Geometry Selector Controls */}
        <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
          <button
            onClick={() => onUpdateSettings({ geometry: 'sphere' })}
            className={`p-1.5 rounded-md text-xs transition ${settings.geometry === 'sphere' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Sphere Mesh"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ geometry: 'cube' })}
            className={`p-1.5 rounded-md text-xs transition ${settings.geometry === 'cube' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Cube Mesh"
          >
            <Box className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ geometry: 'cylinder' })}
            className={`p-1.5 rounded-md text-xs transition ${settings.geometry === 'cylinder' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Cylinder Mesh"
          >
            <CylinderIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ geometry: 'plane' })}
            className={`p-1.5 rounded-md text-xs transition ${settings.geometry === 'plane' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Flat Plane"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ geometry: 'displaced_mesh' })}
            className={`p-1.5 rounded-md text-xs transition ${settings.geometry === 'displaced_mesh' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Subdivided Height Displacement Mesh"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
            className={`p-1.5 rounded-lg border text-xs transition ${settings.autoRotate ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'}`}
            title="Toggle Auto Rotation"
          >
            <RotateCw className={`w-3.5 h-3.5 ${settings.autoRotate ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onUpdateSettings({ wireframe: !settings.wireframe })}
            className={`px-2 py-1 rounded-lg border text-[11px] transition ${settings.wireframe ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'}`}
            title="Toggle Wireframe"
          >
            Wireframe
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition"
            title="Toggle Viewport Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WebGL Mount Canvas */}
      <div
        ref={mountRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating Bottom Controls Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-xs">
        {/* Map Toggles */}
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mr-1">Maps:</span>
          {(['albedo', 'normal', 'roughness', 'metallic', 'height', 'ao'] as TextureMapType[]).map((m) => (
            <button
              key={m}
              onClick={() => toggleMap(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition border ${
                settings.enabledMaps[m]
                  ? 'bg-indigo-600/40 border-indigo-500 text-indigo-200'
                  : 'bg-white/5 border-white/10 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Sliders: UV Tiling, Displacement Scale, Lighting */}
        <div className="flex items-center space-x-3 text-neutral-300">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold">Tiling:</span>
            <select
              value={settings.uvTiling}
              onChange={(e) => onUpdateSettings({ uvTiling: parseFloat(e.target.value) })}
              className="bg-neutral-800 border border-white/10 rounded px-1 py-0.5 text-xs text-neutral-200 font-mono"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold">Depth:</span>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={settings.displacementScale}
              onChange={(e) => onUpdateSettings({ displacementScale: parseFloat(e.target.value) })}
              className="w-16 accent-indigo-500"
            />
            <span className="font-mono text-[10px] w-6 text-right">
              {settings.displacementScale.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="range"
              min="-4"
              max="4"
              step="0.2"
              value={settings.lightX}
              onChange={(e) => onUpdateSettings({ lightX: parseFloat(e.target.value) })}
              className="w-14 accent-amber-500"
              title="Light Position Angle"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
