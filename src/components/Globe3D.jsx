import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Crosshair, Radio, ShieldAlert, Play, Pause, Zap, Flame, CheckCircle2, Shield, FastForward } from 'lucide-react';
import { sound } from '../utils/audio';
import { formatDistance, formatScientific, getTierData } from '../utils/constants';

// Helper: Circular radial glow sprite texture
const _glowTextureCache = {};
function createGlowSpriteTexture(colorHex = '#10B981') {
  if (_glowTextureCache[colorHex]) return _glowTextureCache[colorHex];

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.3, colorHex);
  gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  _glowTextureCache[colorHex] = texture;
  return texture;
}

// --- GLOBAL CACHE FOR HIGH PERFORMANCE ---
const _sharedBodyGeom = new THREE.BoxGeometry(0.2, 0.2, 0.26);
const _sharedWingGeom = new THREE.BoxGeometry(0.5, 0.02, 0.18);
const _sharedDishGeom = new THREE.ConeGeometry(0.09, 0.12, 16);
const _sharedDishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
const _matCache = {};

function getSharedMaterial(colorHex, type) {
  const key = `${colorHex}-${type}`;
  if (!_matCache[key]) {
    _matCache[key] = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: type === 'body' ? 0.8 : 0.6,
      roughness: type === 'body' ? 0.2 : 0.3,
    });
  }
  return _matCache[key];
}

// Helper: Physical 3D Satellite Mesh (Bus + Solar Arrays)
function createSatelliteModel(bodyColorHex = 0xffd700, wingColorHex = 0x0284c7) {
  const group = new THREE.Group();

  // Central Satellite Body
  const bodyMat = getSharedMaterial(bodyColorHex, 'body');
  const body = new THREE.Mesh(_sharedBodyGeom, bodyMat);
  group.add(body);

  // Solar Wings
  const wingMat = getSharedMaterial(wingColorHex, 'wing');

  const leftWing = new THREE.Mesh(_sharedWingGeom, wingMat);
  leftWing.position.set(-0.38, 0, 0);
  group.add(leftWing);

  const rightWing = new THREE.Mesh(_sharedWingGeom, wingMat);
  rightWing.position.set(0.38, 0, 0);
  group.add(rightWing);

  // Antenna Dish
  const dish = new THREE.Mesh(_sharedDishGeom, _sharedDishMat);
  dish.rotation.x = Math.PI;
  dish.position.set(0, 0.16, 0);
  group.add(dish);

  return group;
}

export default function Globe3D({ 
  selectedEvent, 
  activeEvents = [], 
  objects = [], 
  initialMode = 'live',
  onModeChange,
  onLoadProgress
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const earthGroupRef = useRef(null);
  const orbitsGroupRef = useRef(null);
  const satellitesGroupRef = useRef(null);
  const conjunctionGroupRef = useRef(null);
  const debrisGroupRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Mode: 'live' | 'collision_2009' | 'avoidance_2009'
  const [simMode, setSimMode] = useState(initialMode);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simProgress, setSimProgress] = useState(0); // 0 (T-24h) to 1.0 (T+2h)
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 5x, 15x
  const [autoRotate, setAutoRotate] = useState(true);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.25, y: 0.8 });
  const currentRotationRef = useRef({ x: 0.25, y: 0.8 });
  const cameraDistanceRef = useRef(20);

  const simProgressRef = useRef(0);
  const isPlayingRef = useRef(true);
  const simSpeedRef = useRef(1);
  const simModeRef = useRef(initialMode);

  // Sync prop changes to state so we don't have to unmount/remount the whole WebGL canvas
  useEffect(() => {
    setSimMode(initialMode);
    setSimProgress(0);
    setIsPlaying(true);
  }, [initialMode]);

  useEffect(() => {
    simModeRef.current = simMode;
    if (onModeChange) onModeChange(simMode);
  }, [simMode, onModeChange]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    simProgressRef.current = simProgress;
  }, [simProgress]);

  // Main Three.js Setup
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Wire up global loading manager for progress bar
    THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      if (onLoadProgress) {
        onLoadProgress(Math.round((itemsLoaded / itemsTotal) * 100));
      }
    };

    const getContainerSize = () => {
      const el = containerRef.current;
      if (!el) return { width: 800, height: 520 };
      const w = el.clientWidth || el.parentElement?.clientWidth || 800;
      const h = el.clientHeight || 520;
      return { width: Math.max(300, w), height: Math.max(300, h) };
    };

    const { width, height } = getContainerSize();

    // 1. Scene setup
    // --- 🌌 Cinematic Starfield Background ---
    const textureLoader = new THREE.TextureLoader();
    const starTexture = textureLoader.load('/textures/night-sky.png');
    
    const scene = new THREE.Scene();
    // Use the starmap as the scene background
    scene.background = starTexture;
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, cameraDistanceRef.current);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer setup with safe WebGL fallback
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Tone mapping for realistic bright sun / dark space
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Cinematic Space Lighting
    // Very low ambient light so the "dark side" of Earth is actually dark
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
    scene.add(ambientLight);
    
    // Strong directional "Sun"
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.set(25, 10, 15);
    scene.add(sunLight);
    
    // Subtle blue rim light from the opposite side to highlight the edge
    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.8);
    rimLight.position.set(-25, -10, -25);
    scene.add(rimLight);

    // 5. Earth Group
    const earthParent = new THREE.Group();
    earthParent.rotation.x = targetRotationRef.current.x;
    earthParent.rotation.y = targetRotationRef.current.y;
    scene.add(earthParent);
    earthGroupRef.current = earthParent;

    const earthRadius = 6.378;

    // Fake Continents Canvas (Fallback logic)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base Earth background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Simple pseudo-continents using noise/dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    
    // Instead of random, draw a few static blobs
    const drawBlob = (cx, cy, r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    [ [500, 300, 120], [1400, 350, 150], [1200, 600, 180] ].forEach(([x, y, r]) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      drawBlob(x, y, r);
      drawBlob(x + 50, y + 20, r * 0.8);
      drawBlob(x - 30, y - 40, r * 0.9);
      for(let i=0; i<20; i++) {
        ctx.beginPath();
        ctx.arc(x + (Math.random()-0.5)*r*1.5, y + (Math.random()-0.5)*r*1.5, Math.random()*20+5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    });
    // --- 🌍 Photorealistic Earth Textures ---
    
    // Use reliable high-res textures loaded from local public folder
    const earthDiffuse = textureLoader.load('/textures/earth-blue-marble.jpg');
    const earthBump = textureLoader.load('/textures/earth-topology.png');
    const earthSpecular = textureLoader.load('/textures/earth-water.png');
    const earthNight = textureLoader.load('/textures/earth-night.jpg');
    
    // Create the Earth Mesh
    const earthGeom = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthDiffuse,
      bumpMap: earthBump,
      bumpScale: 0.1,
      specularMap: earthSpecular,
      specular: new THREE.Color('grey'),
      shininess: 35,
      emissiveMap: earthNight,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.5, // Reduced intensity so cities don't look radioactive
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthParent.add(earthMesh);

    // --- ☁️ Cloud Layer ---
    const cloudTexture = textureLoader.load('/textures/earth-clouds.png');
    const cloudGeom = new THREE.SphereGeometry(earthRadius * 1.008, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    // Slowly rotate clouds over time
    cloudMesh.userData.isCloud = true;
    earthParent.add(cloudMesh);

    // Lat/Long Wireframe Overlay (keep it but make it very subtle)
    const wireGeom = new THREE.SphereGeometry(earthRadius * 1.003, 36, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    earthParent.add(wireMesh);

    // Atmospheric Glow Shell (blue instead of green for realism)
    const atmosGeom = new THREE.SphereGeometry(earthRadius * 1.025, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    earthParent.add(atmosMesh);

    // Groups
    const orbitsGroup = new THREE.Group();
    earthParent.add(orbitsGroup);
    orbitsGroupRef.current = orbitsGroup;

    const satellitesGroup = new THREE.Group();
    earthParent.add(satellitesGroup);
    satellitesGroupRef.current = satellitesGroup;

    const conjunctionGroup = new THREE.Group();
    earthParent.add(conjunctionGroup);
    conjunctionGroupRef.current = conjunctionGroup;

    const debrisGroup = new THREE.Group();
    earthParent.add(debrisGroup);
    debrisGroupRef.current = debrisGroup;

    // Starfield Background
    const starsCount = 900;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      const r = 70 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);

      starColors[i] = 0.8;
      starColors[i + 1] = 0.9;
      starColors[i + 2] = 1.0;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.75 });
    const starField = new THREE.Points(starGeometry, starMat);
    scene.add(starField);

    // Resize Observer
    const updateSize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const { width: newW, height: newH } = getContainerSize();
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update simulation progress if playing
      if (isPlayingRef.current && simModeRef.current !== 'live') {
        let nextP = simProgressRef.current + delta * 0.04 * simSpeedRef.current;
        if (nextP > 1.0) nextP = 0; // loop
        simProgressRef.current = nextP;
        setSimProgress(nextP);
      }

      if (autoRotate && !isDraggingRef.current) {
        targetRotationRef.current.y += delta * 0.06;
      }

      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.1;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.1;

      if (earthParent) {
        earthParent.rotation.y = currentRotationRef.current.y;
        earthParent.rotation.x = currentRotationRef.current.x;
      }

      // Animate Satellites depending on mode
      const currentMode = simModeRef.current;
      const p = simProgressRef.current; // 0 to 1.0 (TCA at p = 0.8)
      const tcaFraction = 0.8;

      if (satellitesGroup) {
        satellitesGroup.children.forEach(sat => {
          if (currentMode === 'live') {
            if (sat.userData?.speed) {
              const angle = time * sat.userData.speed + sat.userData.initialAngle;
              // sat is the pivotGroup
              sat.rotation.y = -angle;
            }
          } else {
            // Replay mode: position is driven strictly by progress p
            if (sat.userData?.isTarget2009) {
              // Iridium 33 approach angle -> reaches encounter at p = tcaFraction
              const startAngle = -Math.PI * 0.8;
              const encAngle = 0; // encounter at angle 0
              const currentAngle = startAngle + (encAngle - startAngle) * (p / tcaFraction);
              const r = sat.userData.orbitRadius;
              
              if (currentMode === 'avoidance_2009') {
                let thrustActive = false;
                let offsetShift = 0;
                
                if (p > 0.15) {
                  if (p < 0.45) thrustActive = true; // Make burn duration longer so it's clearly visible
                  const shiftProgress = Math.min(1, (p - 0.15) / 0.4);
                  const ease = 1 - Math.pow(1 - shiftProgress, 3);
                  offsetShift = ease * 0.00483 * 80;
                }
                
                const offsetR = r + offsetShift;
                sat.position.set(offsetR * Math.cos(currentAngle), (offsetShift > 0 ? 0.4 : 0), offsetR * Math.sin(currentAngle));
                
                const flame = sat.getObjectByName("thrustFlame");
                if (flame) flame.visible = thrustActive;
              } else {
                // Collision mode
                if (p < tcaFraction) {
                  sat.position.set(r * Math.cos(currentAngle), 0, r * Math.sin(currentAngle));
                  sat.visible = true;
                } else {
                  // Satellite destroyed at TCA!
                  sat.visible = false;
                }
              }
            } else if (sat.userData?.isChaser2009) {
              // Cosmos 2251 approach angle
              const startAngle = Math.PI * 0.8;
              const encAngle = 0;
              const currentAngle = startAngle + (encAngle - startAngle) * (p / tcaFraction);
              const r = sat.userData.orbitRadius;

              if (currentMode === 'collision_2009' && p >= tcaFraction) {
                sat.visible = false; // Destroyed in collision
              } else {
                sat.visible = true;
                sat.position.set(r * Math.cos(currentAngle), 0, r * Math.sin(currentAngle));
              }
            }
          }
        });
      }

      // Animate Debris Cloud in 2009 Collision Mode
      if (debrisGroup) {
        if (currentMode === 'collision_2009' && p >= tcaFraction) {
          debrisGroup.visible = true;
          const debrisExpansion = (p - tcaFraction) * 12;
          debrisGroup.children.forEach(fragment => {
            if (fragment.userData?.dir) {
              fragment.position.x = fragment.userData.origin.x + fragment.userData.dir.x * debrisExpansion;
              fragment.position.y = fragment.userData.origin.y + fragment.userData.dir.y * debrisExpansion;
              fragment.position.z = fragment.userData.origin.z + fragment.userData.dir.z * debrisExpansion;
            }
          });
        } else {
          debrisGroup.visible = false;
        }
      }

      // Pulsate encounter nodes & Animate Shockwave
      if (conjunctionGroup) {
        conjunctionGroup.children.forEach(child => {
          if (child.userData?.isBeacon) {
            const scale = 1 + 0.3 * Math.sin(time * 5);
            child.scale.set(scale, scale, scale);
          }
          if (child.userData?.isShockwave) {
            if (currentMode === 'collision_2009' && p >= tcaFraction) {
              child.visible = true;
              // Expand rapidly
              const expansion = (p - tcaFraction) * 50; 
              child.scale.set(1 + expansion, 1 + expansion, 1 + expansion);
              // Fade out
              child.material.opacity = Math.max(0, 1 - (p - tcaFraction) * 4);
            } else {
              child.visible = false;
              child.scale.set(1, 1, 1);
              child.material.opacity = 1;
            }
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse Listeners
    const dom = renderer.domElement;
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      targetRotationRef.current.y += deltaX * 0.005;
      targetRotationRef.current.x += deltaY * 0.005;
      targetRotationRef.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotationRef.current.x));
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const zoom = e.deltaY * 0.015;
      cameraDistanceRef.current = Math.max(10, Math.min(38, cameraDistanceRef.current + zoom));
      if (cameraRef.current) {
        cameraRef.current.position.z = cameraDistanceRef.current;
      }
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Geometry whenever Mode / Events change
  useEffect(() => {
    if (!orbitsGroupRef.current || !conjunctionGroupRef.current || !satellitesGroupRef.current || !debrisGroupRef.current) return;

    while (orbitsGroupRef.current.children.length > 0) {
      orbitsGroupRef.current.remove(orbitsGroupRef.current.children[0]);
    }
    while (conjunctionGroupRef.current.children.length > 0) {
      conjunctionGroupRef.current.remove(conjunctionGroupRef.current.children[0]);
    }
    while (satellitesGroupRef.current.children.length > 0) {
      satellitesGroupRef.current.remove(satellitesGroupRef.current.children[0]);
    }
    while (debrisGroupRef.current.children.length > 0) {
      debrisGroupRef.current.remove(debrisGroupRef.current.children[0]);
    }

    const scaleFactor = 1 / 1000;

    const createOrbitRing = (radiusKm, incDeg, raanDeg, colorHex, isDashed = false) => {
      const r = (radiusKm || 7100) * scaleFactor;
      
      // Use shared base geometry of radius 1 and scale the mesh
      if (!window._sharedOrbitGeom) {
        const points = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
        }
        window._sharedOrbitGeom = new THREE.BufferGeometry().setFromPoints(points);
      }
      
      const mat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: isDashed ? 0.4 : 0.85,
        linewidth: 2,
      });
      
      const line = new THREE.Line(window._sharedOrbitGeom, mat);
      line.scale.set(r, r, r);
      line.rotation.z = (incDeg || 0) * (Math.PI / 180);
      line.rotation.y = (raanDeg || 0) * (Math.PI / 180);
      return line;
    };

    if (simMode === 'live') {
      // Live Tracking Mode
      activeEvents.forEach((ev, idx) => {
        const isSelected = selectedEvent && selectedEvent.target_id === ev.target_id && selectedEvent.chaser_id === ev.chaser_id;
        const isCritical = (ev.risk_tier || '').toLowerCase().includes('crit') || ev.pc > 1e-4;

        const altKm = 7150 + idx * 40;
        const incA = 86.4;
        const incB = 74.0;

        if (isSelected || idx < 4) {
          const orbitA = createOrbitRing(altKm, incA, idx * 30, isCritical ? 0x10b981 : 0x06b6d4);
          orbitsGroupRef.current.add(orbitA);

          const orbitB = createOrbitRing(altKm, incB, idx * 30 + 45, isCritical ? 0xef4444 : 0xf59e0b);
          orbitsGroupRef.current.add(orbitB);

          const targetSat = createSatelliteModel(0xffd700, 0x0284c7);
          targetSat.userData = { orbitRadius: altKm * scaleFactor, speed: 0.3, initialAngle: idx * 0.8 };
          targetSat.rotation.z = incA * (Math.PI / 180);
          satellitesGroupRef.current.add(targetSat);

          const chaserSat = createSatelliteModel(0xef4444, 0x334155);
          chaserSat.userData = { orbitRadius: altKm * scaleFactor, speed: -0.28, initialAngle: idx * 0.8 + 1.2 };
          chaserSat.rotation.z = incB * (Math.PI / 180);
          satellitesGroupRef.current.add(chaserSat);

          const encDist = altKm * scaleFactor;
          const encX = encDist * Math.cos(idx * 0.8);
          const encY = encDist * Math.sin(incA * Math.PI / 180) * 0.7;
          const encZ = encDist * Math.sin(idx * 0.8);

          const coreGeom = new THREE.SphereGeometry(0.18, 16, 16);
          const coreMat = new THREE.MeshBasicMaterial({ color: isCritical ? 0xef4444 : 0xf59e0b });
          const coreMesh = new THREE.Mesh(coreGeom, coreMat);
          coreMesh.position.set(encX, encY, encZ);
          coreMesh.userData = { isBeacon: true, event: ev };
          conjunctionGroupRef.current.add(coreMesh);
        }
      });

      // Background Catalog Satellites
      if (objects.length > 0) {
        objects.forEach((obj, idx) => {
          if (obj.position_km && obj.position_km.length === 3) {
            const [x, y, z] = obj.position_km;
            const dist = Math.sqrt(x*x + y*y + z*z) || 7000; // prevent divide by zero
            const r = dist * scaleFactor;
            
            // Infer some orbital parameters just for visual wow-factor animation
            // Clamp to [-1, 1] to prevent NaN from float precision errors
            const inclination = Math.acos(Math.max(-1, Math.min(1, z / dist))); 
            const raan = Math.atan2(y, x) || 0; 
            const speed = 0.5 + (idx % 5) * 0.1;
            const initialAngle = raan;

            // Orbit Ring (Trail)
            const orbit = createOrbitRing(dist, inclination * (180/Math.PI), raan * (180/Math.PI), 0x0ea5e9);
            orbit.material.opacity = 0.5;
            orbitsGroupRef.current.add(orbit);

            // Orbit Pivot (rotates the satellite around Earth)
            const pivotGroup = new THREE.Group();
            // Apply inclination tilt so it rotates in its own plane
            pivotGroup.rotation.z = inclination;
            pivotGroup.rotation.y = raan;

            // Satellite Model (offset by orbit radius)
            const satGroup = new THREE.Group();
            satGroup.position.set(r, 0, 0); // Offset it to the orbit ring

            const satModel = createSatelliteModel(0xffffff, 0x0ea5e9);
            satModel.scale.set(0.4, 0.4, 0.4);
            satGroup.add(satModel);

            pivotGroup.add(satGroup);

            pivotGroup.userData = {
              speed: speed,
              initialAngle: initialAngle
            };
            
            satellitesGroupRef.current.add(pivotGroup);
          }
        });
      }
    } else {
      // 2009 Collision or Avoidance Mode
      const altKm = 7167; // 789 km altitude (R_earth + 789 = 7167 km)
      const incIridium = 86.4;
      const incCosmos = 74.0;

      // 1. Orbits
      if (simMode === 'collision_2009') {
        // Red / Amber collision tracks
        const orbitIridium = createOrbitRing(altKm, incIridium, 0, 0xef4444);
        const orbitCosmos = createOrbitRing(altKm, incCosmos, 45, 0xf59e0b);
        orbitsGroupRef.current.add(orbitIridium);
        orbitsGroupRef.current.add(orbitCosmos);
      } else if (simMode === 'avoidance_2009') {
        const orbitOriginal = createOrbitRing(altKm, incIridium, 0, 0xef4444, true);
        const orbitAvoidance = createOrbitRing(altKm + 4.83, incIridium, 0, 0x10b981);
        const orbitCosmos = createOrbitRing(altKm, incCosmos, 45, 0xf59e0b);
        orbitsGroupRef.current.add(orbitOriginal);
        orbitsGroupRef.current.add(orbitAvoidance);
        orbitsGroupRef.current.add(orbitCosmos);
      }

      // 2. 3D Satellite Models
      const iridiumSat = createSatelliteModel(0xffd700, 0x0284c7);
      iridiumSat.userData = { orbitRadius: altKm * scaleFactor, isTarget2009: true };
      iridiumSat.rotation.z = incIridium * (Math.PI / 180);
      
      // Thrust Flame (hidden by default)
      const flameGeom = new THREE.ConeGeometry(0.18, 1.2, 16);
      flameGeom.translate(0, -0.6, 0); // shift pivot
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });
      const flameMesh = new THREE.Mesh(flameGeom, flameMat);
      flameMesh.rotation.x = -Math.PI / 2; // point it backwards
      flameMesh.position.z = -0.15; // back of bus
      flameMesh.name = "thrustFlame";
      flameMesh.visible = false;
      iridiumSat.add(flameMesh);

      satellitesGroupRef.current.add(iridiumSat);

      const cosmosSat = createSatelliteModel(0x94a3b8, 0x334155);
      cosmosSat.userData = { orbitRadius: altKm * scaleFactor, isChaser2009: true };
      cosmosSat.rotation.z = incCosmos * (Math.PI / 180);
      cosmosSat.rotation.y = 45 * (Math.PI / 180);
      satellitesGroupRef.current.add(cosmosSat);

      // 3. Encounter Node
      const encDist = altKm * scaleFactor;
      const encX = encDist;
      const encY = 0;
      const encZ = 0;

      const encounterNode = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: simMode === 'collision_2009' ? 0xef4444 : 0x10b981 })
      );
      encounterNode.position.set(encX, encY, encZ);
      encounterNode.userData = { isBeacon: true };
      conjunctionGroupRef.current.add(encounterNode);

      // Collision Shockwave Ring
      if (simMode === 'collision_2009') {
        const shockwave = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.05, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1, side: THREE.DoubleSide })
        );
        shockwave.position.set(encX, encY, encZ);
        // orient it roughly perpendicular to the collision
        shockwave.lookAt(0, encY, encZ);
        shockwave.userData = { isShockwave: true };
        shockwave.visible = false;
        conjunctionGroupRef.current.add(shockwave);
      }

      // 4. Generate 200 Debris Fragments for Collision Shockwave
      if (simMode === 'collision_2009') {
        const debrisCount = 180;
        for (let i = 0; i < debrisCount; i++) {
          const fragment = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.04, 0.04),
            new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff4444 : 0xffaa00 })
          );
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const speed = Math.random() * 0.4 + 0.1;
          fragment.userData = {
            origin: new THREE.Vector3(encX, encY, encZ),
            dir: new THREE.Vector3(
              Math.sin(phi) * Math.cos(theta) * speed,
              Math.sin(phi) * Math.sin(theta) * speed,
              Math.cos(phi) * speed
            ),
          };
          fragment.position.set(encX, encY, encZ);
          debrisGroupRef.current.add(fragment);
        }
      }
    }
  }, [simMode, selectedEvent, activeEvents, objects]);

  const handleResetCamera = () => {
    sound.playClick();
    targetRotationRef.current = { x: 0.25, y: 0.8 };
    cameraDistanceRef.current = 20;
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 4, 20);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleToggleRotate = () => {
    sound.playClick();
    setAutoRotate(!autoRotate);
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-border/80 bg-background shadow-lg select-none font-sans">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Center Simulation Mode Switcher Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-card/90 border border-border/80 rounded-xl shadow-xl backdrop-blur-md text-xs">
        <button
          onClick={() => {
            sound.playClick();
            setSimMode('live');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            simMode === 'live'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <Radio className="size-3.5" />
          <span>Live Radar</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setSimMode('collision_2009');
            setSimProgress(0);
            setIsPlaying(true);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            simMode === 'collision_2009'
              ? 'bg-destructive text-destructive-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <Flame className="size-3.5" />
          <span>1. Simulate 2009 Collision</span>
        </button>

        <button
          onClick={() => {
            sound.playSuccess();
            setSimMode('avoidance_2009');
            setSimProgress(0);
            setIsPlaying(true);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            simMode === 'avoidance_2009'
              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <Zap className="size-3.5" />
          <span>2. Simulate Escape Maneuver</span>
        </button>
      </div>

      {/* Top Left HUD Telemetry Readout */}
      <div className="absolute top-16 left-4 z-10 flex flex-col gap-1.5 p-3.5 rounded-xl bg-card/90 border border-border/80 text-xs backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          <div className={`size-2 rounded-full animate-pulse ${
            simMode === 'collision_2009' ? 'bg-destructive' : simMode === 'avoidance_2009' ? 'bg-emerald-400' : 'bg-primary'
          }`} />
          <span className="font-mono uppercase text-[11px]">
            {simMode === 'live' ? 'LIVE RADAR TRACKING' : simMode === 'collision_2009' ? '2009 COLLISION REENACTMENT' : 'CW AVOIDANCE SIMULATION'}
          </span>
        </div>
        
        {simMode === 'live' ? (
          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground font-mono">
            <div className="flex justify-between gap-4">
              <span>FRAME:</span>
              <span className="text-primary font-semibold">GCRS / ECI</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>ALTITUDE:</span>
              <span className="text-foreground">LEO (789 km)</span>
            </div>
          </div>
        ) : simMode === 'collision_2009' ? (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            <span className="text-destructive font-semibold">Iridium 33 × Cosmos 2251</span>
            <span className="text-foreground">Rel Speed: 14.12 km/s</span>
            <span className="text-muted-foreground">Impact: 10 Feb 2009 16:56 UTC</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            <span className="text-primary font-semibold">Iridium 33 Escape Burn</span>
            <span className="text-foreground">ΔV = 0.10 m/s at T - 24h</span>
            <span className="text-emerald-400 font-semibold">Clearance: +4.83 km (Safe)</span>
          </div>
        )}
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-16 right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleToggleRotate}
          title={autoRotate ? 'Pause Rotation' : 'Resume Rotation'}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 backdrop-blur-md ${
            autoRotate
              ? 'bg-card/90 text-primary border-primary/30 hover:bg-card'
              : 'bg-card/90 text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          <RotateCcw className={`size-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span>{autoRotate ? 'ROTATING' : 'PAUSED'}</span>
        </button>

        <button
          onClick={handleResetCamera}
          title="Reset Camera"
          className="p-2 rounded-lg border border-border/80 bg-card/90 text-muted-foreground hover:text-foreground hover:border-border transition-all backdrop-blur-md"
        >
          <Crosshair className="size-3.5" />
        </button>
      </div>

      {/* Bottom Timeline Control Bar (Active in 2009 Collision & Avoidance modes) */}
      {simMode !== 'live' ? (
        <div className="absolute bottom-4 left-4 right-4 z-20 p-3.5 bg-card/95 border border-border/80 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPlaying(!isPlaying);
                }}
                className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setSimProgress(0);
                }}
                title="Restart Simulation"
                className="p-1.5 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border"
              >
                <RotateCcw className="size-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                <span className="text-muted-foreground">Timeline:</span>
                <strong className={simProgress >= 0.8 ? (simMode === 'collision_2009' ? 'text-destructive' : 'text-emerald-400') : 'text-foreground'}>
                  {simProgress < 0.8 
                    ? `T - ${((0.8 - simProgress) * 30).toFixed(1)}h`
                    : simProgress === 0.8
                    ? 'TCA (16:56:00 UTC)'
                    : `T + ${((simProgress - 0.8) * 10).toFixed(1)}h`}
                </strong>
              </div>
            </div>

            {/* Status Message Banner */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {simMode === 'collision_2009' ? (
                simProgress >= 0.8 ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/30 font-medium flex items-center gap-1">
                    <Flame className="size-3.5" />
                    Catastrophic Impact · Debris Dispersion
                  </span>
                ) : (
                  <span className="text-destructive/80 font-mono text-[11px]">Head-on rate: 14.1 km/s (Pc: 2.0e-4)</span>
                )
              ) : (
                simProgress >= 0.8 ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Safe Clearance: +4.83 km · Collision Avoided
                  </span>
                ) : (
                  <span className="text-primary font-mono text-[11px]">Avoidance burn applied at T-24h (ΔV: 0.10 m/s)</span>
                )
              )}
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 font-mono">
              {[1, 5, 15].map(spd => (
                <button
                  key={spd}
                  onClick={() => {
                    sound.playClick();
                    setSimSpeed(spd);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    simSpeed === spd
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'bg-secondary/40 text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Scrub Bar */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={simProgress}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSimProgress(val);
            }}
            className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      ) : (
        /* Live Mode Status Indicator */
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full bg-card/90 border border-border/80 text-[11px] text-muted-foreground font-mono flex items-center gap-3 backdrop-blur-md shadow-md">
          <span>Drag to Rotate</span>
          <span className="text-border">|</span>
          <span>Scroll to Zoom</span>
          <span className="text-border">|</span>
          <span className="text-primary font-medium">
            {activeEvents.length} Conjunctions Tracked
          </span>
        </div>
      )}
    </div>
  );
}
