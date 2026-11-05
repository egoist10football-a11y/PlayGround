import * as THREE from '../vendor/three.module.js';

// Deterministic RNG keeps the compound composition stable between reloads.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  paint(ctx, size);
  return canvas;
}

function textureFromCanvas(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

function makeSandTexture(seed = 7) {
  const rnd = mulberry32(seed);
  return makeCanvas(512, (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grain = (rnd() - 0.5) * 25;
        const ripple = Math.sin(x * 0.045 + Math.sin(y * 0.02) * 2.2) * 4.5;
        const band = Math.sin(y * 0.13 + x * 0.012) * 2.5;
        img.data[i] = 110 + grain + ripple + band;
        img.data[i + 1] = 101 + grain * 0.9 + ripple + band;
        img.data[i + 2] = 82 + grain * 0.75 + ripple + band;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 130; i++) {
      ctx.fillStyle = rnd() > 0.5 ? '#2b261e' : '#d0c1a2';
      const r = rnd() * 1.8 + 0.2;
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function makeConcreteTexture(seed = 19) {
  const rnd = mulberry32(seed);
  return makeCanvas(512, (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grain = (rnd() - 0.5) * 19;
        const stain = Math.sin(x * 0.02 + y * 0.008) * 3;
        img.data[i] = 95 + grain + stain;
        img.data[i + 1] = 97 + grain + stain;
        img.data[i + 2] = 91 + grain + stain;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(35,38,35,.38)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (rnd() - 0.5) * 34;
        y += rnd() * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,32,30,.18)';
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.ellipse(rnd() * size, rnd() * size, 2 + rnd() * 15, 1 + rnd() * 6, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeMetalTexture(seed = 31) {
  const rnd = mulberry32(seed);
  return makeCanvas(512, (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grain = (rnd() - 0.5) * 15;
        const scratch = Math.sin(x * 0.7 + y * 0.05) > 0.94 ? 11 : 0;
        img.data[i] = 72 + grain + scratch;
        img.data[i + 1] = 82 + grain + scratch;
        img.data[i + 2] = 79 + grain + scratch;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 34; i++) {
      ctx.fillStyle = rnd() > 0.4 ? '#241f1a' : '#b09a78';
      ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 6 + rnd() * 90);
    }
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = '#090d0d';
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function makeContainerTexture(seed = 41) {
  const rnd = mulberry32(seed);
  return makeCanvas(512, (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const rib = Math.sin(x * Math.PI / 13);
        const shade = rib > 0.55 ? 18 : rib < -0.6 ? -13 : 0;
        const grain = (rnd() - 0.5) * 13;
        img.data[i] = 84 + shade + grain;
        img.data[i + 1] = 101 + shade + grain;
        img.data[i + 2] = 98 + shade + grain;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = rnd() > 0.45 ? '#6d3c22' : '#1c2322';
      const x = rnd() * size;
      const y = rnd() * size;
      ctx.fillRect(x, y, 1 + rnd() * 2, 4 + rnd() * 100);
    }
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#222b29';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.globalAlpha = 1;
  });
}

function makeWoodTexture(seed = 53) {
  const rnd = mulberry32(seed);
  return makeCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#715136';
    ctx.fillRect(0, 0, size, size);
    const planks = 6;
    for (let p = 0; p < planks; p++) {
      const y = (p / planks) * size;
      const shade = 68 + rnd() * 25;
      ctx.fillStyle = `rgb(${shade + 24},${shade},${shade - 20})`;
      ctx.fillRect(0, y + 1, size, size / planks - 2);
      ctx.strokeStyle = 'rgba(38,25,16,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      for (let j = 0; j < 14; j++) {
        ctx.strokeStyle = `rgba(50,32,18,${0.1 + rnd() * 0.15})`;
        ctx.beginPath();
        const yy = y + 3 + rnd() * (size / planks - 6);
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(size * 0.3, yy + rnd() * 4, size * 0.6, yy - rnd() * 4, size, yy + rnd() * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(20,12,7,.35)';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size, 2 + rnd() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeSandbagTexture(seed = 67) {
  const rnd = mulberry32(seed);
  return makeCanvas(256, (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const weave = (Math.sin(x * 1.7) + Math.sin(y * 1.7)) * 4;
        const grain = (rnd() - 0.5) * 18;
        img.data[i] = 106 + grain + weave;
        img.data[i + 1] = 93 + grain + weave;
        img.data[i + 2] = 70 + grain + weave;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(46,36,23,.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(rnd() * size, rnd() * size);
      ctx.lineTo(rnd() * size, rnd() * size);
      ctx.stroke();
    }
  });
}

function makeGroundDecal() {
  return makeCanvas(1024, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = 'rgba(213,209,178,.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 288, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 263, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 340, -0.2, 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 340, 2.95, 3.9);
    ctx.stroke();
    ctx.rotate(-0.16);
    ctx.fillStyle = 'rgba(219,212,174,.4)';
    ctx.font = '700 176px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('07', -34, -74);
    ctx.font = '600 35px "Barlow Condensed", sans-serif';
    ctx.letterSpacing = '13px';
    ctx.fillText('BLACKSITE', 0, 84);
    ctx.font = '400 18px monospace';
    ctx.letterSpacing = '5px';
    ctx.fillStyle = 'rgba(219,212,174,.25)';
    ctx.fillText('LZ // DO NOT BLOCK', 0, 124);
    ctx.restore();

    // Worn paint / oil marks.
    ctx.globalAlpha = 0.23;
    for (let i = 0; i < 24; i++) {
      const x = 100 + Math.random() * 824;
      const y = 100 + Math.random() * 824;
      const r = 18 + Math.random() * 65;
      const grd = ctx.createRadialGradient(x, y, 1, x, y, r);
      grd.addColorStop(0, 'rgba(18,17,13,.8)');
      grd.addColorStop(1, 'rgba(18,17,13,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#d2b05d';
    for (let i = 0; i < 14; i++) {
      const x = 0;
      const y = 140 + i * 23;
      ctx.save();
      ctx.translate(55, y);
      ctx.rotate(-0.25);
      ctx.fillRect(0, 0, 84, 8);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
}

function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return textureFromCanvas(makeCanvas(128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.2, 'rgba(255,255,255,.75)');
    g.addColorStop(0.68, 'rgba(255,255,255,.18)');
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }));
}

function makeHazardTexture() {
  return makeCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#b4923d';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#151612';
    ctx.lineWidth = 38;
    for (let i = -size; i < size * 2; i += 76) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 90; i++) ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 14, 1 + Math.random() * 2);
    ctx.globalAlpha = 1;
  });
}

function makeSignTexture(text, sub = '') {
  return textureFromCanvas(makeCanvas(512, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10,13,12,.75)';
    ctx.fillRect(0, 156, size, 200);
    ctx.strokeStyle = 'rgba(255,139,56,.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 160, size - 8, 192);
    ctx.fillStyle = 'rgba(238,236,221,.88)';
    ctx.font = '700 82px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, 235);
    if (sub) {
      ctx.fillStyle = 'rgba(255,139,56,.8)';
      ctx.font = '400 19px monospace';
      ctx.letterSpacing = '8px';
      ctx.fillText(sub, size / 2, 308);
    }
  }), 1, 1);
}

export function createWorld(scene, renderer, quality = 'high') {
  const high = quality === 'high';
  const rnd = mulberry32(7741);
  const colliders = [];
  const mapWalls = [];
  const animated = [];
  const fires = [];
  const dustLights = [];
  const spawnPoints = [];
  const tmpBox = new THREE.Box3();
  const tmpVec = new THREE.Vector3();
  const dummy = new THREE.Object3D();

  scene.background = new THREE.Color(0x06090b);
  scene.fog = new THREE.FogExp2(0x0a1112, high ? 0.008 : 0.0102);

  // ----- textures -----
  const sandTex = textureFromCanvas(makeSandTexture());
  const concreteTex = textureFromCanvas(makeConcreteTexture());
  const metalTex = textureFromCanvas(makeMetalTexture());
  const containerTex = textureFromCanvas(makeContainerTexture());
  const woodTex = textureFromCanvas(makeWoodTexture());
  const sandbagTex = textureFromCanvas(makeSandbagTexture());
  const hazardTex = textureFromCanvas(makeHazardTexture());

  const groundTex = sandTex.clone();
  groundTex.needsUpdate = true;
  groundTex.repeat.set(20, 20);

  const concreteGroundTex = concreteTex.clone();
  concreteGroundTex.needsUpdate = true;
  concreteGroundTex.repeat.set(12, 12);

  const mats = {
    ground: new THREE.MeshStandardMaterial({ map: groundTex, color: 0xaea184, roughness: 1, metalness: 0 }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0xa5a69a, roughness: 0.94, metalness: 0.03 }),
    concreteDark: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x6e7269, roughness: 0.95, metalness: 0.04 }),
    concretePad: new THREE.MeshStandardMaterial({ map: concreteGroundTex, color: 0x85877c, roughness: 0.96, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ map: metalTex, color: 0x88908a, roughness: 0.58, metalness: 0.5 }),
    metalDark: new THREE.MeshStandardMaterial({ map: metalTex, color: 0x4c5653, roughness: 0.62, metalness: 0.62 }),
    containerGreen: new THREE.MeshStandardMaterial({ map: containerTex, color: 0x527b6d, roughness: 0.72, metalness: 0.34 }),
    containerRust: new THREE.MeshStandardMaterial({ map: containerTex, color: 0x946047, roughness: 0.8, metalness: 0.25 }),
    containerBlue: new THREE.MeshStandardMaterial({ map: containerTex, color: 0x4e697e, roughness: 0.72, metalness: 0.32 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, color: 0xb89269, roughness: 0.92 }),
    sandbag: new THREE.MeshStandardMaterial({ map: sandbagTex, color: 0xa89470, roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1e2524, roughness: 0.8, metalness: 0.25 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0d1111, roughness: 0.55, metalness: 0.4 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6f3f2b, roughness: 0.9 }),
    hazard: new THREE.MeshStandardMaterial({ map: hazardTex, color: 0xffffff, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a3434, roughness: 0.18, metalness: 0.2, emissive: 0x1a5551, emissiveIntensity: 0.25 }),
    lightPanel: new THREE.MeshBasicMaterial({ color: 0xc4e3d8 }),
    redPanel: new THREE.MeshBasicMaterial({ color: 0xff4a2d }),
    orangePanel: new THREE.MeshBasicMaterial({ color: 0xffa14e }),
    cable: new THREE.MeshStandardMaterial({ color: 0x111514, roughness: 0.85 }),
  };
  mats.hazard.map.repeat.set(2, 1);

  // ----- sky / horizon -----
  const skyGeo = new THREE.SphereGeometry(280, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x020507) },
      mid: { value: new THREE.Color(0x0a1418) },
      bottom: { value: new THREE.Color(0x2b2c25) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bottom;
      void main() {
        float h = clamp(vPos.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(bottom, mid, smoothstep(0.42, 0.62, h));
        c = mix(c, top, smoothstep(0.61, 0.93, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const starCount = high ? 800 : 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const az = rnd() * Math.PI * 2;
    const el = 0.1 + rnd() * 0.88;
    const r = 260;
    starPos[i * 3] = Math.cos(az) * Math.cos(el) * r;
    starPos[i * 3 + 1] = Math.sin(el) * r;
    starPos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xa8c1c2,
    size: 1.3,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    fog: false,
  }));
  scene.add(stars);

  const glowTex = makeGlowTexture();
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(8.5, 40),
    new THREE.MeshBasicMaterial({ color: 0xdde7df, fog: false, transparent: true, opacity: 0.92 })
  );
  moon.position.set(-120, 102, -205);
  moon.lookAt(0, 0, 0);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xbbd7d7,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  moonGlow.position.copy(moon.position);
  moonGlow.scale.set(78, 78, 1);
  scene.add(moonGlow);

  function createHorizon(radius, color, base, variance, phase) {
    const segments = 128;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const n = Math.sin(a * 3 + phase) * 0.32 + Math.sin(a * 7.7 + phase * 1.7) * 0.18 + Math.sin(a * 13.1) * 0.08;
      const h = base + n * variance + Math.max(0, Math.sin(a * 4.3 + phase)) * variance * 0.55;
      pos.push(Math.cos(a) * radius, -3, Math.sin(a) * radius);
      pos.push(Math.cos(a) * radius, h, Math.sin(a) * radius);
      if (i < segments) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(g, m);
    scene.add(mesh);
  }
  createHorizon(230, 0x070d0f, 9, 22, 1.4);
  createHorizon(192, 0x0b1516, 5, 14, 4.2);

  // ----- lighting -----
  const hemi = new THREE.HemisphereLight(0x86a9aa, 0x2e261b, 1.35);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x536568, 0.72);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0xb8d2dd, 2.8);
  moonLight.position.set(-82, 102, -94);
  moonLight.castShadow = true;
  const shadowSize = high ? 2048 : 1024;
  moonLight.shadow.mapSize.set(shadowSize, shadowSize);
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 180;
  moonLight.shadow.camera.left = -55;
  moonLight.shadow.camera.right = 55;
  moonLight.shadow.camera.top = 55;
  moonLight.shadow.camera.bottom = -55;
  moonLight.shadow.bias = -0.00045;
  moonLight.shadow.normalBias = 0.025;
  scene.add(moonLight);
  scene.add(moonLight.target);

  // Low bounce fill from the south keeps silhouettes readable without flattening the night.
  const fillLight = new THREE.DirectionalLight(0x6f97a0, 0.65);
  fillLight.position.set(48, 36, 64);
  scene.add(fillLight);

  // ----- ground -----
  const groundGeo = new THREE.PlaneGeometry(240, 240, 80, 80);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const dist = Math.hypot(x, y);
    const edge = Math.max(0, (dist - 48) / 30);
    const h = Math.sin(x * 0.11 + y * 0.07) * 0.16 * edge + Math.sin(x * 0.033 - y * 0.05) * 0.4 * edge;
    posAttr.setZ(i, h);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(72, 0.16, 72), mats.concretePad);
  pad.position.y = -0.02;
  pad.receiveShadow = true;
  scene.add(pad);

  const decalMat = new THREE.MeshStandardMaterial({
    map: textureFromCanvas(makeGroundDecal()),
    transparent: true,
    roughness: 0.98,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), decalMat);
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.072;
  decal.receiveShadow = true;
  scene.add(decal);

  // Faint, larger markings to break up the apron.
  const arrowTex = textureFromCanvas(makeCanvas(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = 'rgba(205,199,166,.18)';
    ctx.beginPath();
    ctx.moveTo(-40, -170);
    ctx.lineTo(100, -170);
    ctx.lineTo(100, -70);
    ctx.lineTo(170, -70);
    ctx.lineTo(0, 120);
    ctx.lineTo(-170, -70);
    ctx.lineTo(-100, -70);
    ctx.lineTo(-100, -170);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }));
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(7, 15), new THREE.MeshStandardMaterial({
    map: arrowTex,
    transparent: true,
    roughness: 1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  }));
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = -0.36;
  arrow.position.set(12, 0.075, -5);
  scene.add(arrow);

  // ----- helpers -----
  function addCollider(cx, cz, w, d, minY, maxY, tag = 'solid') {
    colliders.push({
      box: new THREE.Box3(
        new THREE.Vector3(cx - w / 2, minY, cz - d / 2),
        new THREE.Vector3(cx + w / 2, maxY, cz + d / 2)
      ),
      tag,
    });
  }

  function addBox(x, bottom, z, w, h, d, material, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    const rot = opts.rotY || 0;
    mesh.position.set(x, bottom + h / 2, z);
    mesh.rotation.y = rot;
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    (opts.parent || scene).add(mesh);
    if (opts.collide !== false) {
      const cw = Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * d;
      const cd = Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * d;
      addCollider(x, z, cw, cd, bottom, bottom + h, opts.tag || 'solid');
      if (opts.map && Math.max(cw, cd) > 1.6) {
        mapWalls.push({ x, z, w: cw, d: cd, kind: opts.mapKind || 'structure' });
      }
    }
    return mesh;
  }

  function addPlaneSign(x, y, z, w, h, rotY, text, sub = '') {
    const tex = makeSignTexture(text, sub);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.7,
      emissive: 0x3a2a16,
      emissiveIntensity: 0.4,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    return mesh;
  }

  function addLightPanel(x, y, z, w, h, colorMat, rotY = 0) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), colorMat);
    panel.position.set(x, y, z);
    panel.rotation.y = rotY;
    scene.add(panel);
    return panel;
  }

  function addCrate(x, z, s = 1.15, rot = 0, bottom = 0, dark = false) {
    const mesh = addBox(x, bottom, z, s, s * 0.86, s * 0.92, dark ? mats.metalDark : mats.wood, { rotY: rot, map: true, mapKind: 'crate' });
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 20),
      new THREE.LineBasicMaterial({ color: 0x251b12, transparent: true, opacity: 0.55 })
    );
    mesh.add(edges);
    const band = new THREE.Mesh(new THREE.BoxGeometry(s * 1.01, 0.055, s * 0.93), mats.metalDark);
    band.position.y = 0.08;
    mesh.add(band);
    const band2 = band.clone();
    band2.position.y = -s * 0.34;
    mesh.add(band2);
    return mesh;
  }

  function addBarrel(x, z, opts = {}) {
    const h = 1.02;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, h, 14), opts.fire ? mats.rust : mats.metal);
    barrel.position.set(x, h / 2, z);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    scene.add(barrel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.025, 5, 14), mats.metalDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.26;
    barrel.add(ring);
    const ring2 = ring.clone();
    ring2.position.y = -0.26;
    barrel.add(ring2);
    addCollider(x, z, 0.72, 0.72, 0, h, 'barrel');
    if (opts.fire) {
      const light = new THREE.PointLight(0xff7b2c, 8, 9, 2);
      light.position.set(x, 1.2, z);
      scene.add(light);
      const sprites = [];
      for (let i = 0; i < 3; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex,
          color: i === 0 ? 0xff7a28 : i === 1 ? 0xffb14d : 0xff4e1a,
          transparent: true,
          opacity: i === 0 ? 0.75 : 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }));
        sp.position.set(x + (i - 1) * 0.1, 1.25 + i * 0.12, z + (i % 2 ? 0.08 : -0.06));
        sp.scale.setScalar(1.2 - i * 0.22);
        scene.add(sp);
        sprites.push(sp);
      }
      fires.push({ x, z, light, sprites, phase: rnd() * 10 });
    }
    return barrel;
  }

  function addJersey(x, z, rot, length = 2.4) {
    addBox(x, 0, z, length, 0.28, 0.75, mats.concreteDark, { rotY: rot, map: true, mapKind: 'cover' });
    const top = addBox(x, 0.28, z, length, 0.72, 0.42, mats.concrete, { rotY: rot });
    top.receiveShadow = true;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.88, 0.18), mats.hazard);
    strip.position.set(0, 0.35, 0.216);
    top.add(strip);
    const strip2 = strip.clone();
    strip2.rotation.y = Math.PI;
    strip2.position.z = -0.216;
    top.add(strip2);
    return top;
  }

  function addContainer(x, z, rot, kind = 0) {
    const mat = kind === 0 ? mats.containerGreen : kind === 1 ? mats.containerRust : mats.containerBlue;
    const w = 6.2;
    const h = 2.62;
    const d = 2.7;
    const box = addBox(x, 0, z, w, h, d, mat, { rotY: rot, map: true, mapKind: 'container' });
    // structural rails
    const railGeo = new THREE.BoxGeometry(w + 0.1, 0.14, 0.16);
    const railMat = mats.metalDark;
    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(0, h / 2 - 0.07, d / 2 + 0.05);
    box.add(rail1);
    const rail2 = rail1.clone();
    rail2.position.z = -d / 2 - 0.05;
    box.add(rail2);
    const end1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, d + 0.1), railMat);
    end1.position.x = -w / 2 - 0.02;
    box.add(end1);
    const end2 = end1.clone();
    end2.position.x = w / 2 + 0.02;
    box.add(end2);
    // door seam
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.78, 0.03), mats.black);
    seam.position.set(0, 0, d / 2 + 0.052);
    box.add(seam);
    return box;
  }

  function addFloodlight(x, z, targetX, targetZ, height = 6.2) {
    addBox(x, 0, z, 0.18, height, 0.18, mats.metalDark, { collide: false, castShadow: false });
    addBox(x, 0, z, 0.7, 0.16, 0.7, mats.metalDark, { collide: false, castShadow: false });
    const head = addBox(x, height - 0.35, z, 0.7, 0.42, 0.44, mats.metalDark, { collide: false, castShadow: false, rotY: Math.atan2(targetX - x, targetZ - z) });
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), mats.lightPanel);
    lens.position.set(0, -0.02, 0.23);
    head.add(lens);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffb567,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.position.set(x, height - 0.3, z);
    glow.scale.set(3.6, 3.6, 1);
    scene.add(glow);
    const target = new THREE.Object3D();
    target.position.set(targetX, 0.5, targetZ);
    scene.add(target);
    const spot = new THREE.SpotLight(0xffb46a, high ? 560 : 360, 42, 0.48, 0.76, 1.8);
    spot.position.set(x, height - 0.25, z);
    spot.target = target;
    scene.add(spot);
    // Volumetric-looking cone.
    const coneGeo = new THREE.ConeGeometry(5.2, height, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffa557,
      transparent: true,
      opacity: 0.026,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(x, height / 2, z);
    cone.rotation.z = Math.PI;
    scene.add(cone);
    return spot;
  }

  function addWatchtower(x, z) {
    const legMat = mats.metalDark;
    for (const dx of [-1.4, 1.4]) {
      for (const dz of [-1.4, 1.4]) {
        addBox(x + dx, 0, z + dz, 0.16, 5.2, 0.16, legMat, { collide: false, castShadow: true });
      }
    }
    addBox(x, 5.0, z, 3.7, 0.3, 3.7, mats.metalDark, { map: true, mapKind: 'tower' });
    for (const dx of [-1.75, 1.75]) {
      addBox(x + dx, 5.3, z, 0.09, 0.95, 3.7, mats.metalDark, { collide: false, castShadow: false });
    }
    addBox(x, 5.3, z - 1.75, 3.7, 0.95, 0.09, mats.metalDark, { collide: false, castShadow: false });
    addBox(x, 6.3, z, 4.0, 0.18, 4.0, mats.metalDark, { collide: false });
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.35), mats.lightPanel);
    lamp.position.set(x, 6.0, z - 1.83);
    lamp.rotation.y = Math.PI;
    scene.add(lamp);
    const spot = new THREE.SpotLight(0xffcf8b, high ? 330 : 220, 38, 0.5, 0.8, 2);
    spot.position.set(x, 5.95, z - 1.9);
    const t = new THREE.Object3D();
    t.position.set(x * 0.45, 0, z * 0.45);
    scene.add(t);
    spot.target = t;
    scene.add(spot);
  }

  // ----- perimeter -----
  const wallMat = mats.concreteDark;
  addBox(0, 0, -43.2, 88, 4.0, 1.1, wallMat, { map: true, mapKind: 'wall' });
  addBox(0, 0, 43.2, 88, 4.0, 1.1, wallMat, { map: true, mapKind: 'wall' });
  addBox(-43.2, 0, 0, 1.1, 4.0, 86, wallMat, { map: true, mapKind: 'wall' });
  addBox(43.2, 0, 0, 1.1, 4.0, 86, wallMat, { map: true, mapKind: 'wall' });
  // Wall buttresses give the perimeter silhouette variation.
  for (let i = -3; i <= 3; i++) {
    addBox(i * 12, 0, -42.55, 1.5, 4.5, 0.8, mats.concrete, { collide: false, castShadow: false });
    addBox(i * 12, 0, 42.55, 1.5, 4.5, 0.8, mats.concrete, { collide: false, castShadow: false });
    addBox(-42.55, 0, i * 12, 0.8, 4.5, 1.5, mats.concrete, { collide: false, castShadow: false });
    addBox(42.55, 0, i * 12, 0.8, 4.5, 1.5, mats.concrete, { collide: false, castShadow: false });
  }
  // Top edge / wire line.
  for (const side of [-1, 1]) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 87, 4), mats.cable);
    wire.rotation.z = Math.PI / 2;
    wire.position.set(0, 4.55, side * 43.2);
    scene.add(wire);
    const wire2 = wire.clone();
    wire2.rotation.set(0, 0, 0);
    wire2.rotation.x = Math.PI / 2;
    wire2.position.set(side * 43.2, 4.55, 0);
    scene.add(wire2);
  }
  // South gate visual.
  addBox(0, 0, 43.15, 10, 4.6, 1.3, mats.metalDark, { collide: true, map: true, mapKind: 'gate' });
  addBox(-5.2, 0, 42.4, 0.5, 4.8, 0.6, mats.metal, { collide: false });
  addBox(5.2, 0, 42.4, 0.5, 4.8, 0.6, mats.metal, { collide: false });
  addPlaneSign(0, 2.9, 42.45, 6.0, 1.5, Math.PI, 'BLACKSITE 07', 'AUTHORIZED PERSONNEL ONLY');

  // ----- command building -----
  {
    const bx = -18;
    const bz = -15;
    // floor and roof
    addBox(bx, 0, bz, 16, 0.18, 10, mats.concrete, { collide: false });
    addBox(bx, 4.32, bz, 16.5, 0.4, 10.4, mats.concreteDark, { collide: false, map: true, mapKind: 'roof' });
    // perimeter walls
    addBox(-26, 0, bz, 0.48, 4.4, 10, mats.concrete, { map: true, mapKind: 'wall' });
    // east wall with door
    addBox(-10, 0, -17.8, 0.48, 4.4, 4.4, mats.concrete, { map: true, mapKind: 'wall' });
    addBox(-10, 0, -12.2, 0.48, 4.4, 4.4, mats.concrete, { map: true, mapKind: 'wall' });
    addBox(-10, 2.55, bz, 0.48, 1.85, 2.8, mats.concrete, { collide: true });
    // north wall
    addBox(bx, 0, -20, 16, 4.4, 0.48, mats.concrete, { map: true, mapKind: 'wall' });
    // south wall with cut-out windows
    addBox(bx, 0, -10, 16, 1.05, 0.4, mats.concrete, { map: true, mapKind: 'wall' });
    addBox(bx, 2.45, -10, 16, 1.95, 0.4, mats.concrete, { map: true, mapKind: 'wall' });
    for (const px of [-26, -22, -18, -14, -10]) {
      addBox(px, 1.05, -10, 0.42, 1.4, 0.4, mats.concrete, { collide: true });
    }
    // roof parapet
    addBox(bx, 4.7, -20, 16.5, 0.55, 0.35, mats.concreteDark, { collide: false, castShadow: false });
    addBox(bx, 4.7, -10, 16.5, 0.55, 0.35, mats.concreteDark, { collide: false, castShadow: false });
    addPlaneSign(-18, 3.05, -9.78, 7.2, 1.8, 0, 'COMMAND', 'SECTOR 07 // TOC');
    // interior consoles
    addBox(-23.5, 0.18, -18.4, 3.8, 0.92, 0.9, mats.metalDark, { map: true, mapKind: 'console' });
    addBox(-18.6, 0.18, -18.4, 3.2, 0.92, 0.9, mats.metalDark, { map: true, mapKind: 'console' });
    const monitorMat = new THREE.MeshStandardMaterial({ color: 0x203733, emissive: 0x3ab8a2, emissiveIntensity: 1.25, roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.44), monitorMat);
      screen.position.set(-24.8 + i * 1.45, 1.33, -17.92);
      screen.rotation.x = -0.12;
      scene.add(screen);
    }
    // maps on wall
    const mapPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshStandardMaterial({
      color: 0x2b403b,
      emissive: 0x1a4c42,
      emissiveIntensity: 0.45,
      roughness: 0.9,
    }));
    mapPanel.position.set(-23, 2.7, -19.74);
    scene.add(mapPanel);
    // hanging lights
    for (const lx of [-23, -13]) {
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.2), mats.lightPanel);
      lightBar.position.set(lx, 3.85, -15);
      scene.add(lightBar);
      const pl = new THREE.PointLight(0xa2e3d1, 24, 11, 2);
      pl.position.set(lx, 3.6, -15);
      scene.add(pl);
    }
    addBox(-13.4, 4.72, -18.0, 1.8, 1.1, 1.2, mats.metalDark, { collide: false, map: true });
    addBox(-22.0, 4.72, -18.3, 2.4, 0.6, 1.0, mats.metal, { collide: false });
    addCrate(-13.6, -12.0, 1.0, 0.2);
    addCrate(-12.8, -13.2, 0.9, -0.2, 0.86);
    addBarrel(-16.2, -13.1);
  }

  // ----- barracks / machine shop -----
  {
    const bx = 20;
    const bz = 14;
    addBox(bx, 0, bz, 13, 0.14, 8.8, mats.concrete, { collide: false });
    addBox(bx, 3.62, bz, 13.4, 0.32, 9.2, mats.metalDark, { collide: false, map: true, mapKind: 'roof' });
    addBox(13.6, 0, bz, 0.4, 3.9, 8.8, mats.containerRust, { map: true, mapKind: 'wall' });
    addBox(26.4, 0, bz, 0.4, 3.9, 8.8, mats.concreteDark, { map: true, mapKind: 'wall' });
    addBox(bx, 0, 9.6, 13, 3.9, 0.4, mats.concrete, { map: true, mapKind: 'wall' });
    // south wall, two openings
    addBox(16.3, 0, 18.4, 5.4, 3.9, 0.4, mats.containerRust, { map: true, mapKind: 'wall' });
    addBox(23.8, 0, 18.4, 5.4, 3.9, 0.4, mats.containerRust, { map: true, mapKind: 'wall' });
    addBox(bx, 2.75, 18.4, 2.1, 1.15, 0.4, mats.metalDark, { collide: true });
    addPlaneSign(20, 2.8, 18.18, 5.6, 1.4, 0, 'MOTOR POOL', 'BAY 03');
    // interior clutter
    addBox(17.2, 0.14, 12.0, 2.6, 0.85, 1.3, mats.wood, { map: true, mapKind: 'bench' });
    addBox(23.2, 0.14, 12.2, 2.2, 1.2, 1.0, mats.metalDark, { map: true, mapKind: 'bench' });
    addCrate(24.2, 16.6, 1.1, 0.3);
    addCrate(15.6, 16.0, 0.9, -0.2);
    addBarrel(18.2, 10.9);
    addBarrel(19.0, 10.9, { fire: true });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.2), mats.orangePanel);
    lamp.position.set(20, 3.4, 14);
    scene.add(lamp);
    const pl = new THREE.PointLight(0xffb264, 22, 10, 2);
    pl.position.set(20, 3.1, 14);
    scene.add(pl);
  }

  // ----- ammo depot (open-sided) -----
  {
    addBox(-9.5, 3.0, 20.5, 7.4, 0.22, 6.0, mats.metalDark, { collide: false, map: true, mapKind: 'roof' });
    for (const [px, pz] of [[-12.7, 17.9], [-12.7, 23.1], [-6.3, 17.9], [-6.3, 23.1]]) {
      addBox(px, 0, pz, 0.22, 3.0, 0.22, mats.metalDark, { collide: true });
    }
    for (let i = 0; i < 5; i++) {
      addCrate(-12.0 + (i % 2) * 1.2, 19.0 + Math.floor(i / 2) * 1.2, 1.0, 0.06 * i);
    }
    addBox(-7.7, 0, 21.8, 2.2, 1.6, 1.3, mats.metalDark, { map: true, mapKind: 'container' });
    addPlaneSign(-9.5, 2.6, 23.55, 4.0, 1.0, 0, 'ARMORY', 'CLASSIFIED');
  }

  // ----- containers / cover -----
  addContainer(10.5, -22.5, 0, 0);
  addContainer(20.5, -6.5, Math.PI / 2, 1);
  addContainer(-23.5, 4.5, Math.PI / 2, 2);
  addContainer(7.0, 23.0, 0, 1);
  addContainer(29.5, -24.0, 0, 2);
  addContainer(-31.0, 21.0, 0, 0);

  // Sandbags (instanced, filled after all walls are declared).
  const sandbagInstances = [];
  function addSandbagWall(x, z, length, rot = 0) {
    const segments = Math.ceil(length / 0.88);
    for (let row = 0; row < 3; row++) {
      const count = segments - (row % 2 === 1 ? 1 : 0);
      const offset = row % 2 === 1 ? 0.44 : 0;
      for (let i = 0; i < count; i++) {
        const lx = -length / 2 + offset + i * 0.9 + 0.44;
        const y = 0.16 + row * 0.29;
        const dz = (rnd() - 0.5) * 0.1;
        const angle = rot + (rnd() - 0.5) * 0.12;
        sandbagInstances.push({ x: x + Math.cos(rot) * lx + Math.sin(rot) * dz, y, z: z - Math.sin(rot) * lx + Math.cos(rot) * dz, angle });
      }
    }
    const cw = Math.abs(Math.cos(rot)) * length + Math.abs(Math.sin(rot)) * 0.92;
    const cd = Math.abs(Math.sin(rot)) * length + Math.abs(Math.cos(rot)) * 0.92;
    addCollider(x, z, cw, cd, 0, 0.96, 'sandbags');
    mapWalls.push({ x, z, w: cw, d: cd, kind: 'cover' });
  }
  addSandbagWall(0, 9.5, 8.5, 0);
  addSandbagWall(-8.0, 1.5, 6.0, Math.PI / 2);
  addSandbagWall(13.0, 1.0, 6.5, Math.PI / 2);
  addSandbagWall(-4.5, -25.0, 7.5, 0.08);
  addSandbagWall(30.0, 8.0, 7.0, Math.PI / 2);
  addSandbagWall(-30.0, -4.0, 7.0, Math.PI / 2);
  addSandbagWall(11.0, 12.5, 5.5, 0.05);
  addSandbagWall(-18.8, 32.0, 6.0, 0);

  {
    const geo = new THREE.BoxGeometry(0.88, 0.3, 0.62);
    const inst = new THREE.InstancedMesh(geo, mats.sandbag, sandbagInstances.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    sandbagInstances.forEach((b, i) => {
      dummy.position.set(b.x, b.y + 0.15, b.z);
      dummy.rotation.set(0, b.angle, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // Jersey barriers.
  addJersey(-12.5, 12.5, 0, 2.6);
  addJersey(-9.7, 12.5, 0, 2.6);
  addJersey(5.0, -11.0, Math.PI / 2, 2.8);
  addJersey(5.0, -8.1, Math.PI / 2, 2.8);
  addJersey(25.0, 21.5, 0, 2.4);
  addJersey(-36.0, 11.0, Math.PI / 2, 2.3);
  addJersey(36.0, -13.5, Math.PI / 2, 2.5);

  // Crates around the yard.
  const cratePos = [
    [-5.5, 7.0, 1.2, 0.1], [-4.2, 7.7, 0.9, -0.3], [-5.1, 7.3, 0.8, 0.5, 1.0],
    [18.5, -14.8, 1.25, 0.05], [19.8, -15.0, 1.0, -0.2], [18.8, -14.8, 0.8, 0.3, 1.05],
    [-20.5, 9.4, 1.1, 0.2], [-21.4, 8.7, 0.8, -0.1],
    [4.0, 18.0, 1.15, 0.15], [12.6, 27.0, 1.0, -0.25], [13.4, 27.8, 0.8, 0.1],
    [-27.0, -28.5, 1.15, 0.4], [-33.0, -24.0, 0.95, 0.2],
    [28.0, 28.0, 1.1, -0.15], [25.6, 29.0, 0.9, 0.2],
    [-1.5, -31.5, 1.2, 0.1], [0.0, -30.8, 0.85, -0.4],
    [33.0, 0.0, 1.15, 0.15], [34.2, 0.9, 0.9, -0.2],
  ];
  cratePos.forEach(([x, z, s, r, b]) => addCrate(x, z, s, r, b || 0));

  // Barrels.
  const barrelPos = [
    [-11.5, 5.5], [-10.8, 6.2], [-11.1, 4.6], [12.5, -8.5], [13.4, -8.1],
    [31.5, 12.0], [32.2, 12.7], [-26.0, 17.0], [-27.0, 17.6], [16.0, 32.0],
    [-21.0, -26.0], [-20.2, -26.5], [27.0, -28.0],
  ];
  barrelPos.forEach(([x, z], i) => addBarrel(x, z, { fire: i === 1 || i === 6 || i === 10 }));

  // Vehicle wreck.
  {
    const g = new THREE.Group();
    g.position.set(9.0, 0, 15.5);
    g.rotation.y = -0.55;
    scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 2.0), mats.rust);
    body.position.y = 0.85;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 1.85), mats.rust);
    cab.position.set(0.7, 1.68, 0);
    cab.castShadow = true;
    g.add(cab);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.9), mats.rust);
    hood.position.set(1.9, 1.1, 0);
    g.add(hood);
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.33, 10);
    for (const [wx, wz] of [[-1.35, -1.03], [-1.35, 1.03], [1.55, -1.03], [1.55, 1.03]]) {
      const wheel = new THREE.Mesh(wheelGeo, mats.black);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.46, wz);
      g.add(wheel);
    }
    addCollider(9.0, 15.5, 4.9, 2.6, 0, 2.15, 'vehicle');
    mapWalls.push({ x: 9, z: 15.5, w: 4.9, d: 2.6, kind: 'vehicle' });
    // smoke plume from the wreck
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x3b403b,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }));
      sp.position.set(9.8, 2.4 + i * 1.8, 15.5);
      sp.scale.set(5 + i * 3, 4 + i * 2, 1);
      scene.add(sp);
      animated.push({ type: 'driftSmoke', sprite: sp, base: 2.4 + i * 1.8, phase: i * 2.3 });
    }
  }

  // Central relay tower.
  {
    const x = 0;
    const z = -4.5;
    addBox(x, 0, z, 4.2, 0.45, 4.2, mats.concreteDark, { map: true, mapKind: 'tower' });
    addBox(x, 0.45, z, 2.6, 0.4, 2.6, mats.metalDark, { collide: false });
    // Four legs.
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      addBox(x + dx, 0.7, z + dz, 0.12, 14.4, 0.12, mats.metalDark, { collide: false, castShadow: false });
    }
    for (let i = 0; i < 7; i++) {
      const y = 1.4 + i * 2.0;
      addBox(x, y, z - 0.8, 1.7, 0.07, 0.07, mats.metalDark, { collide: false, castShadow: false });
      addBox(x, y, z + 0.8, 1.7, 0.07, 0.07, mats.metalDark, { collide: false, castShadow: false });
      addBox(x - 0.8, y, z, 0.07, 0.07, 1.7, mats.metalDark, { collide: false, castShadow: false });
      addBox(x + 0.8, y, z, 0.07, 0.07, 1.7, mats.metalDark, { collide: false, castShadow: false });
      // diagonal-ish cross members
      const diag = addBox(x, y + 0.65, z, 1.7, 0.045, 0.045, mats.metalDark, { collide: false, castShadow: false });
      diag.rotation.z = (i % 2 ? -1 : 1) * 0.72;
      const diag2 = addBox(x, y + 0.65, z, 0.045, 0.045, 1.7, mats.metalDark, { collide: false, castShadow: false });
      diag2.rotation.x = (i % 2 ? -1 : 1) * 0.72;
    }
    // Dish array.
    const dish = new THREE.Mesh(new THREE.CircleGeometry(1.35, 24), mats.metal);
    dish.position.set(1.6, 9.4, z);
    dish.rotation.y = -0.8;
    dish.rotation.x = -0.3;
    scene.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), mats.metalDark);
    feed.rotation.z = 0.8;
    feed.position.set(1.15, 9.55, z);
    scene.add(feed);
    // Blinking beacon.
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mats.redPanel);
    beacon.position.set(x, 15.3, z);
    scene.add(beacon);
    const beaconLight = new THREE.PointLight(0xff3d24, 10, 12, 2);
    beaconLight.position.copy(beacon.position);
    scene.add(beaconLight);
    animated.push({ type: 'beacon', mesh: beacon, light: beaconLight, phase: 0 });
    addPlaneSign(0, 2.0, z + 2.11, 2.6, 0.8, 0, 'RELAY 07', 'BROADCASTING');
  }

  // Watchtowers and floodlights.
  addWatchtower(-34.5, -34.5);
  addWatchtower(34.5, 34.5);
  addWatchtower(34.5, -34.5);
  addFloodlight(-31, 14, -12, 4, 6.5);
  addFloodlight(18, -30, 8, -15, 6.5);
  addFloodlight(31, 6, 10, 2, 6.0);
  addFloodlight(-12, 31, -3, 18, 6.0);

  // Light poles with warm bulbs along the route.
  for (const [x, z] of [[-16, 29], [18, 10.8], [-31, 8]]) {
    addBox(x, 0, z, 0.12, 4.0, 0.12, mats.metalDark, { collide: false, castShadow: false });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mats.orangePanel);
    bulb.position.set(x, 4.0, z);
    scene.add(bulb);
    const pl = new THREE.PointLight(0xffb469, 14, 9, 2);
    pl.position.set(x, 3.9, z);
    scene.add(pl);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffb264,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.position.set(x, 4, z);
    glow.scale.set(2.5, 2.5, 1);
    scene.add(glow);
  }

  // Concrete blocks / Hesco line accents.
  for (let i = 0; i < 8; i++) {
    const x = -36 + i * 3.4;
    addBox(x, 0, 37.7, 2.7, 1.1, 1.0, mats.concreteDark, { map: true, mapKind: 'cover', castShadow: false });
    addBox(x, 1.1, 37.7, 2.5, 0.45, 0.9, mats.concrete, { collide: false, castShadow: false });
  }

  // Ground rubble. Instanced for performance.
  {
    const count = high ? 180 : 90;
    const geo = new THREE.DodecahedronGeometry(0.16, 0);
    const inst = new THREE.InstancedMesh(geo, mats.concreteDark, count);
    inst.castShadow = false;
    inst.receiveShadow = true;
    for (let i = 0; i < count; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 12 + rnd() * 38;
      let x = Math.cos(angle) * radius;
      let z = Math.sin(angle) * radius;
      dummy.position.set(x, 0.08 + rnd() * 0.08, z);
      dummy.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      const s = 0.3 + rnd() * 1.8;
      dummy.scale.set(s, s * (0.4 + rnd() * 0.5), s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // Small sand drifts against cover.
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 30 + rnd() * 11;
    const drift = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), mats.ground);
    drift.position.set(Math.cos(a) * r, -0.45, Math.sin(a) * r);
    drift.scale.set(3 + rnd() * 5, 0.3 + rnd() * 0.35, 1.8 + rnd() * 3.5);
    drift.castShadow = false;
    drift.receiveShadow = true;
    scene.add(drift);
  }

  // Floating dust.
  const dustCount = high ? 420 : 220;
  const dustPos = new Float32Array(dustCount * 3);
  const dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (rnd() - 0.5) * 74;
    dustPos[i * 3 + 1] = 0.2 + rnd() * 9;
    dustPos[i * 3 + 2] = (rnd() - 0.5) * 74;
    dustSeed[i] = rnd() * 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xb9c5ba,
    size: 0.045,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  scene.add(dust);

  // Distant aircraft warning lights.
  const distantLights = [];
  for (const [x, z] of [[-190, -80], [180, 95], [-160, 140]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2f1f }));
    m.position.set(x, 17 + Math.abs(x) * 0.05, z);
    scene.add(m);
    distantLights.push(m);
  }

  // Spawn locations — deliberately spread around the perimeter and behind cover.
  spawnPoints.push(
    new THREE.Vector3(-36, 0, 33),
    new THREE.Vector3(35, 0, 33),
    new THREE.Vector3(-36, 0, 7),
    new THREE.Vector3(36, 0, 6),
    new THREE.Vector3(-35, 0, -31),
    new THREE.Vector3(34, 0, -31),
    new THREE.Vector3(-8, 0, -36),
    new THREE.Vector3(11, 0, -36),
    new THREE.Vector3(0, 0, 36),
    new THREE.Vector3(-23, 0, 30),
    new THREE.Vector3(23, 0, 25)
  );

  // Useful map markers for the minimap.
  mapWalls.push({ x: -18, z: -15, w: 16.5, d: 10.4, kind: 'building' });
  mapWalls.push({ x: 20, z: 14, w: 13.4, d: 9.2, kind: 'building' });
  mapWalls.push({ x: -9.5, z: 20.5, w: 7.4, d: 6.0, kind: 'cover' });
  mapWalls.push({ x: 0, z: -4.5, w: 4.2, d: 4.2, kind: 'tower' });

  const clock = new THREE.Clock();

  function update(dt, time) {
    for (const f of fires) {
      const pulse = 0.72 + Math.sin(time * 12 + f.phase) * 0.17 + Math.sin(time * 27 + f.phase * 2) * 0.08;
      f.light.intensity = 8 + pulse * 13;
      f.sprites.forEach((sp, i) => {
        const p = 0.76 + Math.sin(time * (7 + i * 2.6) + f.phase + i) * 0.14 + Math.sin(time * 17 + i) * 0.08;
        sp.scale.setScalar((1.5 - i * 0.27) * p);
        sp.position.y = 1.18 + i * 0.18 + Math.sin(time * 8 + i) * 0.07;
      });
    }
    for (const a of animated) {
      if (a.type === 'beacon') {
        const on = Math.sin(time * 3.2 + a.phase) > 0.2;
        a.mesh.visible = on;
        a.light.intensity = on ? 12 : 0;
      } else if (a.type === 'driftSmoke') {
        a.sprite.position.y = a.base + Math.sin(time * 0.4 + a.phase) * 0.12;
        a.sprite.material.opacity = 0.07 + Math.sin(time * 0.7 + a.phase) * 0.025;
      }
    }
    // Dust drift.
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      arr[i3] += Math.sin(time * 0.17 + dustSeed[i]) * dt * 0.14;
      arr[i3 + 1] += Math.sin(time * 0.3 + dustSeed[i] * 2) * dt * 0.035;
      arr[i3 + 2] += dt * 0.08;
      if (arr[i3 + 2] > 38) arr[i3 + 2] = -38;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.33 + Math.sin(time * 0.2) * 0.05;
    distantLights.forEach((m, i) => {
      m.visible = Math.sin(time * 1.3 + i * 2.1) > 0.75;
    });
  }

  return {
    colliders,
    mapWalls,
    spawnPoints,
    playerSpawn: new THREE.Vector3(0, 0, 33),
    update,
    mats,
    textures: { sandTex, concreteTex, glowTex },
    bounds: 41.5,
  };
}
