import React, { useEffect, useRef, useState } from 'react';
import { subscribeLevels } from '@/lib/audioBus';

/**
 * Vinil de cromo em three.js.
 *
 * O disco gira enquanto a faixa toca, inclina de leve seguindo o ponteiro e
 * respira no ritmo do som — o anel metálico acende nos graves e a rotação
 * acelera com a energia da faixa. A capa da música vira o selo central.
 *
 * O three.js entra por import dinâmico: são ~600 KB que não têm por que
 * pesar no bundle inicial de quem só quer ouvir música. Enquanto carrega (e
 * se falhar, ou se o usuário pediu menos movimento) o componente mostra um
 * disco em CSS que faz a mesma leitura visual.
 */
export default function ChromeVinyl({
  coverUrl,
  isPlaying = false,
  size = 320,
  className = '',
}) {
  const mountRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Valores lidos pelo laço de render sem provocar re-render.
  const playingRef = useRef(isPlaying);
  const pointerRef = useRef({ x: 0, y: 0 });
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setFailed(true); return undefined; }

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let THREE;
      try {
        THREE = await import('three');
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const width = mount.clientWidth || size;
      const height = mount.clientHeight || size;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0.35, 4.2);
      camera.lookAt(0, 0, 0);

      // --- Ambiente refletido ---------------------------------------------
      // Metal sem nada para refletir fica preto. Este céu de estúdio (faixa
      // clara em cima, escuro embaixo, com dois "softbox") é o que faz o
      // anel parecer cromo de verdade.
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 512; envCanvas.height = 256;
      const ectx = envCanvas.getContext('2d');
      const sky = ectx.createLinearGradient(0, 0, 0, 256);
      sky.addColorStop(0.00, '#ffffff');
      sky.addColorStop(0.30, '#c8c8d4');
      sky.addColorStop(0.52, '#3a3a44');
      sky.addColorStop(0.75, '#101014');
      sky.addColorStop(1.00, '#000000');
      ectx.fillStyle = sky;
      ectx.fillRect(0, 0, 512, 256);
      ectx.globalAlpha = 0.9;
      ectx.fillStyle = '#ffffff';
      ectx.beginPath(); ectx.ellipse(120, 70, 90, 42, 0, 0, Math.PI * 2); ectx.fill();
      ectx.globalAlpha = 0.55;
      ectx.beginPath(); ectx.ellipse(390, 96, 70, 30, 0, 0, Math.PI * 2); ectx.fill();
      ectx.globalAlpha = 1;

      const envTex = new THREE.CanvasTexture(envCanvas);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      envTex.colorSpace = THREE.SRGBColorSpace ?? undefined;
      scene.environment = envTex;

      // --- Sulcos do disco -------------------------------------------------
      const grooveCanvas = document.createElement('canvas');
      grooveCanvas.width = 512; grooveCanvas.height = 512;
      const gctx = grooveCanvas.getContext('2d');
      gctx.fillStyle = '#0a0a0c';
      gctx.fillRect(0, 0, 512, 512);
      for (let r = 60; r < 250; r += 2) {
        gctx.beginPath();
        gctx.arc(256, 256, r, 0, Math.PI * 2);
        gctx.strokeStyle = r % 4 === 0 ? 'rgba(255,255,255,0.075)' : 'rgba(0,0,0,0.5)';
        gctx.lineWidth = 1;
        gctx.stroke();
      }
      const grooveTex = new THREE.CanvasTexture(grooveCanvas);

      const group = new THREE.Group();
      scene.add(group);

      // Corpo do disco
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.045, 96),
        new THREE.MeshStandardMaterial({
          map: grooveTex,
          color: 0x15151a,
          metalness: 0.72,
          roughness: 0.34,
        })
      );
      disc.rotation.x = Math.PI / 2;
      group.add(disc);

      // Anel de cromo — é ele que acende com os graves
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xe6e6ee,
        metalness: 1,
        roughness: 0.08,
        emissive: 0x9a9aa8,
        emissiveIntensity: 0.05,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.035, 20, 128), ringMat);
      group.add(ring);

      // Selo central com a capa
      const labelMat = new THREE.MeshStandardMaterial({
        color: 0xd8d8e2, metalness: 0.35, roughness: 0.45,
      });
      const label = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), labelMat);
      label.position.z = 0.024;
      group.add(label);

      const labelBack = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), labelMat.clone());
      labelBack.position.z = -0.024;
      labelBack.rotation.y = Math.PI;
      group.add(labelBack);

      // Furo central
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.055, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      hole.position.z = 0.026;
      group.add(hole);

      let coverTex = null;
      if (coverUrl) {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          coverUrl,
          (tex) => {
            if (disposed) { tex.dispose(); return; }
            if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
            coverTex = tex;
            labelMat.map = tex;
            labelMat.color.set(0xffffff);
            labelMat.needsUpdate = true;
            labelBack.material.map = tex;
            labelBack.material.color.set(0xffffff);
            labelBack.material.needsUpdate = true;
          },
          undefined,
          () => { /* capa indisponível: o selo prateado já resolve */ }
        );
      }

      // --- Luzes ------------------------------------------------------------
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.PointLight(0xd8d8e2, 6, 14);
      rim.position.set(-3.2, -1.4, 2.4);
      scene.add(rim);

      // --- Ponteiro ---------------------------------------------------------
      const onPointer = (e) => {
        const rect = mount.getBoundingClientRect();
        pointerRef.current = {
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        };
      };
      const onLeave = () => { pointerRef.current = { x: 0, y: 0 }; };
      mount.addEventListener('pointermove', onPointer);
      mount.addEventListener('pointerleave', onLeave);

      // --- Áudio ------------------------------------------------------------
      let level = 0, low = 0;
      const unsub = subscribeLevels((s) => { level = s.level; low = s.low; });

      // --- Laço -------------------------------------------------------------
      let raf = null;
      let spin = 0;
      let tiltX = 0, tiltY = 0;
      let visible = true;

      // Fora da tela, nada é renderizado — o vinil não pode custar bateria
      // enquanto o usuário rola a página lá embaixo.
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
      io.observe(mount);

      const clock = new THREE.Clock();

      const animate = () => {
        raf = requestAnimationFrame(animate);
        if (!visible) return;

        const dt = Math.min(clock.getDelta(), 0.05);

        // 33 1/3 RPM de base, acelerando com a energia da faixa.
        const targetSpin = playingRef.current ? (0.62 + level * 1.25) : 0;
        spin += (targetSpin - spin) * 0.06;
        group.rotation.z -= spin * dt;

        // A inclinação persegue o ponteiro em vez de saltar até ele.
        const px = pointerRef.current.x, py = pointerRef.current.y;
        tiltY += (px * 0.34 - tiltY) * 0.07;
        tiltX += (py * 0.26 - tiltX) * 0.07;
        group.rotation.y = tiltY;
        group.rotation.x = tiltX + (playingRef.current ? Math.sin(clock.elapsedTime * 0.6) * 0.03 : 0);

        // O anel pulsa nos graves; o disco inteiro respira.
        ringMat.emissiveIntensity = 0.05 + low * 1.5;
        const breathe = 1 + level * 0.05;
        group.scale.setScalar(breathe);
        rim.intensity = 4 + level * 10;

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w = mount.clientWidth || size;
        const h = mount.clientHeight || size;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      setReady(true);

      cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        unsub();
        io.disconnect();
        ro.disconnect();
        mount.removeEventListener('pointermove', onPointer);
        mount.removeEventListener('pointerleave', onLeave);
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m.dispose());
          }
        });
        grooveTex.dispose();
        envTex.dispose();
        coverTex?.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => { disposed = true; cleanup(); };
    // coverUrl reconstrói a cena: é a única entrada que altera geometria/textura.
  }, [coverUrl, size]);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Halo por trás do disco, reagindo ao som via CSS. */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(216,216,226,0.20), transparent 62%)',
          opacity: 'calc(0.25 + var(--v-level) * 0.75)',
          filter: 'blur(18px)',
          transition: 'opacity 90ms linear',
        }}
      />

      <div ref={mountRef} className="absolute inset-0" />

      {/* Disco em CSS: aparece antes do three.js carregar e fica se ele
          falhar. Só a camada dos sulcos gira — o aro de cromo fica parado.
          Girar a borda junto fazia o círculo "ondular" na renderização
          subpixel, e o disco parecia amassado. */}
      {(!ready || failed) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative rounded-full v-audio-glow overflow-hidden"
            style={{
              width: '86%',
              height: '86%',
              background: 'radial-gradient(circle at 38% 32%, #26262f 0%, #101015 42%, #08080b 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.95), 0 0 0 2px rgba(216,216,226,0.55)',
            }}
          >
            {/* Sulcos + varredura de luz, girando por dentro do aro. */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px),' +
                  'conic-gradient(from 0deg, rgba(255,255,255,0.11), transparent 22%, rgba(255,255,255,0.07) 50%, transparent 74%, rgba(255,255,255,0.11))',
                animation: isPlaying ? 'v-spin-slow 3.2s linear infinite' : 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden"
              style={{
                width: '34%',
                height: '34%',
                background: 'linear-gradient(145deg,#f2f2f7,#8f8f9d 45%,#2a2a33)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
              }}
            >
              {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            {/* Furo central */}
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: '4.5%', height: '4.5%', background: '#000' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
