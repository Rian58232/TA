import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const saveData = !!navigator.connection?.saveData;
const canAnimate = !reducedMotion && !saveData;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const damp = (current, target, factor) => current + (target - current) * factor;

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (_) {
    return false;
  }
}

if (!supportsWebGL()) {
  document.documentElement.classList.add('no-webgl');
} else {
  const scenes = [];

  function makeRenderer(canvas, alpha = true) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = !coarsePointer;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  function resizeRenderer(renderer, camera, canvas) {
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    const ratio = renderer.getPixelRatio();
    const targetW = Math.floor(width * ratio);
    const targetH = Math.floor(height * ratio);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function addLights(scene, warm = false) {
    scene.add(new THREE.HemisphereLight(0xcdfbff, 0x06161d, warm ? 1.35 : 1.6));
    const key = new THREE.DirectionalLight(warm ? 0xffe3b0 : 0xb6f7ff, 3.1);
    key.position.set(5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.PointLight(0x12dcec, 15, 14, 2);
    rim.position.set(-4, 1.6, 3.8);
    scene.add(rim);
    const sun = new THREE.PointLight(0xffc21a, warm ? 8 : 5, 12, 2);
    sun.position.set(4.5, 4.5, -3.2);
    scene.add(sun);
    return { key, rim, sun };
  }

  function makeWaterMaterial(alpha = 0.88) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color('#0078b8') },
        uShallow: { value: new THREE.Color('#22e5ef') },
        uAlpha: { value: alpha }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w1 = sin((p.x * 2.6) + uTime * 1.25) * 0.035;
          float w2 = cos((p.y * 3.8) - uTime * 1.05) * 0.026;
          float w3 = sin((p.x + p.y) * 4.2 + uTime * .72) * 0.012;
          p.z += w1 + w2 + w3;
          vWave = w1 + w2 + w3;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform float uAlpha;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float bands = sin(vUv.x * 38.0 + uTime * 1.7) * cos(vUv.y * 31.0 - uTime * 1.25);
          float caustic = smoothstep(.70, 1.0, bands * .5 + .5);
          float edge = smoothstep(.02, .34, vUv.x) * smoothstep(.02, .34, vUv.y) * smoothstep(.02, .34, 1.0-vUv.x) * smoothstep(.02, .34, 1.0-vUv.y);
          vec3 color = mix(uDeep, uShallow, clamp(vUv.y * .5 + .35 + vWave * 2.5, 0.0, 1.0));
          color += caustic * vec3(.30, .62, .68);
          color += pow(1.0 - edge, 3.0) * .18;
          gl_FragColor = vec4(color, uAlpha);
        }
      `
    });
  }

  function makeDeckMaterial() {
    return new THREE.MeshStandardMaterial({ color: 0xc6a77c, roughness: .62, metalness: .02 });
  }

  function makeStoneMaterial() {
    return new THREE.MeshStandardMaterial({ color: 0xd5d0c5, roughness: .82, metalness: .01 });
  }

  function addPoolModel(scene, options = {}) {
    const root = new THREE.Group();
    scene.add(root);

    const shellMat = new THREE.MeshPhysicalMaterial({ color: options.shellColor || 0xf4f4ee, roughness: .28, metalness: 0, clearcoat: .3, clearcoatRoughness: .25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d475f, roughness: .42, metalness: .02 });
    const deckMat = makeDeckMaterial();
    const stoneMat = makeStoneMaterial();

    const pool = new THREE.Group();
    root.add(pool);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.6, .16, 2.8), darkMat);
    floor.position.y = -.7;
    floor.receiveShadow = true;
    pool.add(floor);

    const wallLong = new THREE.BoxGeometry(4.95, .9, .20);
    const wallShort = new THREE.BoxGeometry(.20, .9, 2.8);
    const back = new THREE.Mesh(wallLong, shellMat);
    const front = new THREE.Mesh(wallLong, shellMat);
    const left = new THREE.Mesh(wallShort, shellMat);
    const right = new THREE.Mesh(wallShort, shellMat);
    back.position.set(0, -.22, -1.4);
    front.position.set(0, -.22, 1.4);
    left.position.set(-2.38, -.22, 0);
    right.position.set(2.38, -.22, 0);
    [back, front, left, right].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true; pool.add(mesh); });

    const copingMat = new THREE.MeshStandardMaterial({ color: 0xf5efe5, roughness: .5 });
    const copingLong = new THREE.BoxGeometry(5.35, .13, .33);
    const copingShort = new THREE.BoxGeometry(.33, .13, 2.95);
    const c1 = new THREE.Mesh(copingLong, copingMat); c1.position.set(0, .28, -1.48);
    const c2 = new THREE.Mesh(copingLong, copingMat); c2.position.set(0, .28, 1.48);
    const c3 = new THREE.Mesh(copingShort, copingMat); c3.position.set(-2.52, .28, 0);
    const c4 = new THREE.Mesh(copingShort, copingMat); c4.position.set(2.52, .28, 0);
    [c1,c2,c3,c4].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true; pool.add(mesh); });

    const waterMat = makeWaterMaterial(options.waterAlpha || .9);
    const waterGeo = new THREE.PlaneGeometry(4.55, 2.58, 42, 28);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = .14;
    pool.add(water);

    const steps = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.05 - i * .08, .18, .45), shellMat);
      step.position.set(1.55, -.42 + i * .17, 1.02 - i * .34);
      step.castShadow = true;
      steps.add(step);
    }
    pool.add(steps);

    const deck = new THREE.Group();
    root.add(deck);
    const deckBack = new THREE.Mesh(new THREE.BoxGeometry(6.4, .12, 1.15), deckMat);
    deckBack.position.set(0, .18, -2.15);
    const deckSide = new THREE.Mesh(new THREE.BoxGeometry(1.1, .12, 3.05), deckMat);
    deckSide.position.set(-3.0, .18, 0);
    const deckSideR = deckSide.clone(); deckSideR.position.x = 3.0;
    [deckBack, deckSide, deckSideR].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true; deck.add(mesh); });

    const wall = new THREE.Group();
    root.add(wall);
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.4, .18), stoneMat);
    wallMesh.position.set(0, 1.23, -2.72);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wall.add(wallMesh);

    const slatMat = new THREE.MeshStandardMaterial({ color: 0x67747a, roughness: .74 });
    for (let x = -2.8; x <= 2.8; x += .42) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(.025, 2.25, .02), slatMat);
      groove.position.set(x, 1.23, -2.825);
      wall.add(groove);
    }

    return { root, pool, deck, wall, water, waterMat, shellMat, deckMat, stoneMat };
  }

  function initHeroScene() {
    const canvas = document.getElementById('hero3DCanvas');
    const wrapper = document.getElementById('heroWebGL');
    if (!canvas || !wrapper || coarsePointer || saveData || reducedMotion || window.innerWidth < 981) return null;

    try {
      const renderer = makeRenderer(canvas, true);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
      camera.position.set(7.8, 5.2, 8.7);
      camera.lookAt(0, 0, 0);
      addLights(scene);
      const model = addPoolModel(scene, { waterAlpha: .82 });
      model.root.scale.setScalar(.87);
      model.root.rotation.y = -.52;
      model.root.position.set(.5, -.25, 0);

      const ringMat = new THREE.MeshBasicMaterial({ color: 0x3de8ef, transparent: true, opacity: .17, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45, .018, 8, 180), ringMat);
      ring.rotation.x = Math.PI / 2.25;
      ring.rotation.z = -.28;
      scene.add(ring);

      let tx = 0, ty = 0, rx = 0, ry = 0;
      wrapper.addEventListener('pointermove', e => {
        const r = wrapper.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 2;
        ty = ((e.clientY - r.top) / r.height - .5) * 2;
      }, { passive: true });
      wrapper.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

      return {
        wrapper, renderer, scene, camera, canvas, visible: true,
        tick(time) {
          resizeRenderer(renderer, camera, canvas);
          rx = damp(rx, tx, .045); ry = damp(ry, ty, .045);
          model.root.rotation.y = -.52 + rx * .13;
          model.root.rotation.x = ry * .045;
          model.root.position.y = -.25 + Math.sin(time * .0007) * .035;
          ring.rotation.z = -.28 + time * .000055;
          model.waterMat.uniforms.uTime.value = time * .001;
          camera.position.x = 7.8 + rx * .22;
          camera.position.y = 5.2 - ry * .14;
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        }
      };
    } catch (error) {
      console.warn('Hero 3D indisponível:', error);
      return null;
    }
  }

  function initAssemblyScene() {
    const canvas = document.getElementById('assembly3DCanvas');
    const wrapper = document.getElementById('spatialViewport');
    const section = document.getElementById('composicao3d');
    if (!canvas || !wrapper || !section || saveData || reducedMotion || window.innerWidth < 821) return null;

    try {
      const renderer = makeRenderer(canvas, true);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
      camera.position.set(8.6, 5.4, 9.7);
      camera.lookAt(0, .2, 0);
      addLights(scene, true);
      const model = addPoolModel(scene, { waterAlpha: .9 });
      model.root.rotation.y = -.64;
      model.root.scale.setScalar(.92);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(4.8, 4.8, .08, 64),
        new THREE.MeshStandardMaterial({ color: 0x08252f, roughness: .75, transparent: true, opacity: .62 })
      );
      base.position.y = -.86;
      scene.add(base);

      let tx = 0, ty = 0, px = 0, py = 0;
      if (!coarsePointer) {
        wrapper.addEventListener('pointermove', e => {
          const r = wrapper.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - .5) * 2;
          ty = ((e.clientY - r.top) / r.height - .5) * 2;
        }, { passive: true });
        wrapper.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      }

      wrapper.dataset.webgl = 'ready';

      return {
        wrapper, renderer, scene, camera, canvas, visible: true,
        tick(time) {
          resizeRenderer(renderer, camera, canvas);
          px = damp(px, tx, .05); py = damp(py, ty, .05);
          const rect = section.getBoundingClientRect();
          const total = window.innerHeight + rect.height;
          const progress = clamp((window.innerHeight - rect.top) / total, 0, 1);
          const explode = Math.sin(progress * Math.PI) * 1.0;
          model.pool.position.set(0, explode * .12, explode * .55);
          model.deck.position.set(-explode * .65, explode * .34, -.05 - explode * .35);
          model.wall.position.set(explode * .55, explode * .62, -explode * .9);
          model.root.rotation.y = -.64 + px * .17;
          model.root.rotation.x = py * .05;
          model.waterMat.uniforms.uTime.value = time * .001;
          camera.position.x = 8.6 + px * .35;
          camera.position.y = 5.4 - py * .18;
          camera.lookAt(0, .2, 0);
          renderer.render(scene, camera);
        }
      };
    } catch (error) {
      console.warn('Composição 3D indisponível:', error);
      return null;
    }
  }

  function makeTileTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b78ae'; ctx.fillRect(0,0,256,256);
    ctx.strokeStyle = 'rgba(190,245,255,.42)'; ctx.lineWidth = 3;
    for (let i=0;i<=256;i+=32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(256,i); ctx.stroke(); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1.3);
    return tex;
  }

  function initBuilderScene() {
    const canvas = document.getElementById('builder3DCanvas');
    const wrapper = document.getElementById('builder3DPreview');
    const form = document.getElementById('projectBuilder');
    const label = document.getElementById('builder3DLabel');
    if (!canvas || !wrapper || !form || saveData || reducedMotion) return null;

    try {
      const renderer = makeRenderer(canvas, true);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
      camera.position.set(7.6, 4.6, 8.2);
      camera.lookAt(0, 0, 0);
      addLights(scene);
      const model = addPoolModel(scene, { waterAlpha: .88 });
      model.root.scale.setScalar(.8);
      model.root.rotation.y = -.52;
      const tileTex = makeTileTexture();
      const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, color: 0xffffff, roughness: .35 });
      const originalShellMat = model.shellMat;

      function updateFromForm() {
        const interest = form.querySelector('input[name="interest"]:checked')?.value || '';
        const poolType = form.querySelector('input[name="poolType"]:checked')?.value || '';

        model.pool.visible = interest !== 'Pisos / Revestimentos';
        model.deck.visible = interest !== 'Piscina';
        model.wall.visible = interest !== 'Piscina';

        if (poolType === 'Azulejo') {
          model.pool.children.forEach(mesh => {
            if (mesh.isMesh && mesh !== model.water && mesh.material === originalShellMat) mesh.material = tileMat;
          });
        } else {
          model.pool.children.forEach(mesh => {
            if (mesh.isMesh && mesh !== model.water && mesh.material === tileMat) mesh.material = originalShellMat;
          });
        }

        if (poolType === 'Fibra') {
          originalShellMat.color.set('#e8fbff');
          model.waterMat.uniforms.uDeep.value.set('#078fc2');
        } else if (poolType === 'Vinil') {
          originalShellMat.color.set('#f6f4eb');
          model.waterMat.uniforms.uDeep.value.set('#0066a8');
        } else if (poolType === 'Azulejo') {
          model.waterMat.uniforms.uDeep.value.set('#075f9f');
        } else {
          originalShellMat.color.set('#f4f4ee');
          model.waterMat.uniforms.uDeep.value.set('#0078b8');
        }

        if (label) {
          if (!interest) label.textContent = 'Escolha uma opção abaixo';
          else if (interest === 'Pisos / Revestimentos') label.textContent = 'Piso + revestimento';
          else if (poolType) label.textContent = `${interest} · ${poolType}`;
          else label.textContent = interest;
        }
      }

      form.addEventListener('change', updateFromForm);
      updateFromForm();
      wrapper.dataset.webgl = 'ready';

      let target = 0, rot = -.52;
      if (!coarsePointer) {
        wrapper.addEventListener('pointermove', e => {
          const r = wrapper.getBoundingClientRect();
          target = ((e.clientX - r.left) / r.width - .5) * .28;
        }, { passive: true });
        wrapper.addEventListener('pointerleave', () => { target = 0; });
      }

      return {
        wrapper, renderer, scene, camera, canvas, visible: true,
        tick(time) {
          resizeRenderer(renderer, camera, canvas);
          rot = damp(rot, -.52 + target, .045);
          model.root.rotation.y = rot;
          model.root.position.y = Math.sin(time * .00065) * .025;
          model.waterMat.uniforms.uTime.value = time * .001;
          renderer.render(scene, camera);
        }
      };
    } catch (error) {
      console.warn('Prévia 3D indisponível:', error);
      return null;
    }
  }

  [initHeroScene(), initAssemblyScene(), initBuilderScene()].filter(Boolean).forEach(scene => scenes.push(scene));

  if (scenes.length) {
    document.documentElement.classList.add('webgl-ready');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const item = scenes.find(scene => scene.wrapper === entry.target);
          if (item) item.visible = entry.isIntersecting;
        });
      }, { rootMargin: '160px 0px 160px' });
      scenes.forEach(scene => observer.observe(scene.wrapper));
    }

    function frame(time) {
      if (!document.hidden) {
        scenes.forEach(scene => {
          if (scene.visible) scene.tick(canAnimate ? time : 0);
        });
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('resize', () => scenes.forEach(scene => resizeRenderer(scene.renderer, scene.camera, scene.canvas)), { passive: true });
  }
}
