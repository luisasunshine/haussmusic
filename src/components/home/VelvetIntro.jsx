import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BRAND_COLOR = 0xb1b5db;
const IMPACT_TIME = 1.15;
const EXIT_START = 2.2;
const EXIT_DURATION = 0.55;
const TOTAL_DURATION = EXIT_START + EXIT_DURATION + 0.05;

function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t) {
  return t * t * t;
}
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeStreakTexture() {
  const w = 8;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}

function makeStreak(texture, color, width, length) {
  const geo = new THREE.PlaneGeometry(width, length);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.Mesh(geo, mat);
}

export default function VelvetIntro({ onComplete, logoUrl = '/logo.png' }) {
  const mountRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onCompleteRef.current?.();
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Drifting sparkle field
    const glowTex = makeGlowTexture();
    const particleCount = 260;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const white = new THREE.Color(0xffffff);
    const brand = new THREE.Color(BRAND_COLOR);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 3;
      const mixed = white.clone().lerp(brand, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // The Velvet wordmark, flown in from deep space
    const logoTex = new THREE.TextureLoader().load(logoUrl);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), logoMat);
    logoMesh.position.set(0, 0, -18);
    logoMesh.rotation.y = -1.4;
    logoMesh.scale.setScalar(0.4);
    scene.add(logoMesh);

    // A soft burst of light behind the logo at the moment of impact
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: BRAND_COLOR,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const impactGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), glowMat);
    impactGlow.position.set(0, 0, -1);
    scene.add(impactGlow);

    // Lightning streaks that flash across the whole frame at impact
    const streakTex = makeStreakTexture();
    const rotZ = THREE.MathUtils.degToRad(-24);
    const streak1 = makeStreak(streakTex, 0xffffff, 0.22, 20);
    streak1.position.set(-3.6, 1.6, 0.6);
    streak1.rotation.z = rotZ;
    const streak2 = makeStreak(streakTex, BRAND_COLOR, 0.1, 18);
    streak2.position.set(3.2, -1.2, 0.6);
    streak2.rotation.z = rotZ;
    scene.add(streak1, streak2);

    // A soft shine that sweeps across the wordmark once it lands
    const shine = makeStreak(streakTex, 0xffffff, 1.1, 3.6);
    shine.position.set(-3.4, 0, 0.4);
    scene.add(shine);

    let raf;
    const clock = new THREE.Clock();
    let hasFlashed = false;
    let flashStart = 0;
    let hasSwept = false;
    let sweepStart = 0;
    let completed = false;

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    function animate() {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      particles.rotation.y += delta * 0.02;
      particles.rotation.x = Math.sin(elapsed * 0.1) * 0.04;
      particleMat.opacity = 0.5 + Math.sin(elapsed * 1.1) * 0.2;

      const flyStart = 0.15;
      const flyDur = 1.0;
      if (elapsed >= flyStart) {
        const t = clamp01((elapsed - flyStart) / flyDur);
        const eBack = easeOutBack(t);
        const eCubic = easeOutCubic(t);
        logoMesh.position.z = lerp(-18, 0, eBack);
        logoMesh.rotation.y = lerp(-1.4, 0, eCubic);
        logoMesh.scale.setScalar(lerp(0.4, 1, eBack));
        logoMat.opacity = clamp01(t * 2.2);
      }

      if (elapsed >= IMPACT_TIME - 0.05 && !hasFlashed) {
        hasFlashed = true;
        flashStart = elapsed;
      }
      if (hasFlashed) {
        const ft = clamp01((elapsed - flashStart) / 0.4);
        const env = Math.sin(Math.PI * ft);
        streak1.material.opacity = env * 0.95;
        streak2.material.opacity = env * 0.7;
        glowMat.opacity = env * 0.55;
      }

      if (elapsed >= IMPACT_TIME && !hasSwept) {
        hasSwept = true;
        sweepStart = elapsed;
      }
      if (hasSwept) {
        const st = clamp01((elapsed - sweepStart) / 0.8);
        shine.position.x = lerp(-3.4, 3.4, easeOutCubic(st));
        shine.material.opacity = Math.sin(Math.PI * st) * 0.6;
      }

      if (elapsed >= IMPACT_TIME && elapsed < EXIT_START) {
        const idle = elapsed - IMPACT_TIME;
        logoMesh.position.y = Math.sin(idle * 1.6) * 0.05;
        logoMesh.rotation.y = Math.sin(idle * 0.7) * 0.06;
      }

      if (elapsed >= EXIT_START) {
        const t2 = clamp01((elapsed - EXIT_START) / EXIT_DURATION);
        const e2 = easeInCubic(t2);
        logoMesh.position.z = lerp(0, 12, e2);
        logoMesh.scale.setScalar(lerp(1, 2.6, e2));
        logoMat.opacity = lerp(1, 0, clamp01(t2 * 1.3));
        logoMesh.rotation.y += delta * 3.5;
        camera.fov = lerp(50, 63, e2);
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);

      if (elapsed >= TOTAL_DURATION && !completed) {
        completed = true;
        onCompleteRef.current?.();
      }
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      particleGeo.dispose();
      particleMat.dispose();
      glowTex.dispose();
      streakTex.dispose();
      logoTex.dispose();
      logoMat.dispose();
      logoMesh.geometry.dispose();
      [streak1, streak2, shine, impactGlow].forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} id="velvet-intro-root" className="w-full h-full" />;
}
