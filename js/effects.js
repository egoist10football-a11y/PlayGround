import * as THREE from '../vendor/three.module.js';

const _v = new THREE.Vector3();
const _c = new THREE.Color();

class ParticleField {
  constructor(scene, max, blending, scale) {
    this.max = max;
    this.cursor = 0;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.growth = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.baseAlpha = new Float32Array(max);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending,
      uniforms: { uScale: { value: scale } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * (uScale / max(1.0, -mv.z)), 0.0, 140.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float glow = pow(max(0.0, 1.0 - d), 1.65);
          if (glow < 0.01) discard;
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    scene.add(this.points);
    this.geometry = geometry;
  }

  spawn(pos, opts = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3;
    const color = opts.color ?? 0xffb35c;
    const c = _c.setHex(color);
    this.positions[i3] = pos.x;
    this.positions[i3 + 1] = pos.y;
    this.positions[i3 + 2] = pos.z;
    this.colors[i3] = c.x;
    this.colors[i3 + 1] = c.y;
    this.colors[i3 + 2] = c.z;
    const speed = opts.speed ?? 2;
    const spread = opts.spread ?? 1;
    const dx = (Math.random() * 2 - 1) * spread;
    const dy = (Math.random() * 2 - 1) * spread;
    const dz = (Math.random() * 2 - 1) * spread;
    const len = Math.hypot(dx, dy, dz) || 1;
    const dir = opts.dir;
    if (dir) {
      this.vel[i3] = dir.x * speed + (dx / len) * speed * 0.45;
      this.vel[i3 + 1] = dir.y * speed + (dy / len) * speed * 0.45;
      this.vel[i3 + 2] = dir.z * speed + (dz / len) * speed * 0.45;
    } else {
      this.vel[i3] = (dx / len) * speed;
      this.vel[i3 + 1] = (dy / len) * speed;
      this.vel[i3 + 2] = (dz / len) * speed;
    }
    const life = (opts.life ?? 0.6) * (0.65 + Math.random() * 0.7);
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = opts.gravity ?? 4;
    this.drag[i] = opts.drag ?? 0.6;
    this.growth[i] = opts.growth ?? 0.4;
    this.baseSize[i] = (opts.size ?? 3) * (0.7 + Math.random() * 0.6);
    this.baseAlpha[i] = opts.alpha ?? 0.85;
    this.sizes[i] = this.baseSize[i];
    this.alphas[i] = this.baseAlpha[i];
  }

  update(dt) {
    const { positions, vel, life, maxLife, gravity, drag, sizes, alphas, baseSize, baseAlpha, growth } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) {
        if (alphas[i] !== 0) alphas[i] = 0;
        continue;
      }
      life[i] -= dt;
      if (life[i] <= 0) {
        alphas[i] = 0;
        continue;
      }
      const i3 = i * 3;
      const f = Math.max(0, 1 - drag[i] * dt);
      vel[i3] *= f;
      vel[i3 + 1] = vel[i3 + 1] * f - gravity[i] * dt;
      vel[i3 + 2] *= f;
      positions[i3] += vel[i3] * dt;
      positions[i3 + 1] += vel[i3 + 1] * dt;
      positions[i3 + 2] += vel[i3 + 2] * dt;
      if (positions[i3 + 1] < 0.03) {
        positions[i3 + 1] = 0.03;
        vel[i3 + 1] *= -0.18;
        vel[i3] *= 0.7;
        vel[i3 + 2] *= 0.7;
      }
      const k = life[i] / maxLife[i];
      alphas[i] = Math.pow(k, 0.7) * baseAlpha[i];
      sizes[i] = baseSize[i] * (1 + growth[i] * (1 - k));
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
  }
}

export class Effects {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    this.high = quality === 'high';
    const scale = Math.min(window.innerHeight, 1200) * 0.55;
    this.sparks = new ParticleField(scene, this.high ? 900 : 420, THREE.AdditiveBlending, scale);
    this.smoke = new ParticleField(scene, this.high ? 480 : 220, THREE.NormalBlending, scale * 1.1);
    this.tracers = [];
    this.rings = [];
    this.lights = [];
    this.flashes = [];
    this.tmpColor = new THREE.Color();
  }

  muzzle(pos, dir, color = 0xffc06a, count = 5) {
    for (let i = 0; i < count; i++) {
      this.sparks.spawn(pos, {
        color: i < 2 ? 0xfff3c4 : color,
        dir,
        speed: 5 + Math.random() * 9,
        spread: 0.7,
        life: 0.09 + Math.random() * 0.08,
        size: 2.5,
        gravity: 1.5,
        drag: 3,
        growth: 0.2,
        alpha: 0.95,
      });
    }
  }

  impact(pos, color = 0xffc06a, count = 7) {
    for (let i = 0; i < count; i++) {
      this.sparks.spawn(pos, {
        color: i % 3 === 0 ? 0xfff1cc : color,
        speed: 1.5 + Math.random() * 5.5,
        spread: 1,
        life: 0.14 + Math.random() * 0.28,
        size: 1.35 + Math.random() * 1.5,
        gravity: 8,
        drag: 1.2,
        growth: 0.1,
        alpha: 0.9,
      });
      if (i < 2) {
        this.smoke.spawn(pos, {
          color: 0x77746b,
          speed: 0.3 + Math.random() * 0.8,
          spread: 1,
          life: 0.5 + Math.random() * 0.6,
          size: 5,
          gravity: -0.15,
          drag: 2.2,
          growth: 2.6,
          alpha: 0.26,
        });
      }
    }
  }

  blood(pos, dir, headshot = false) {
    for (let i = 0; i < (headshot ? 18 : 9); i++) {
      this.smoke.spawn(pos, {
        color: i % 3 === 0 ? 0x771a13 : 0x3f0a07,
        dir,
        speed: 1 + Math.random() * 3.5,
        spread: 0.75,
        life: 0.25 + Math.random() * 0.35,
        size: 2 + Math.random() * 3,
        gravity: 9,
        drag: 0.9,
        growth: 1.3,
        alpha: 0.8,
      });
    }
    this.sparks.spawn(pos, { color: 0xffcf9d, speed: 2, spread: 1, life: 0.12, size: 1.8, gravity: 5, alpha: 0.5 });
  }

  tracer(start, end, color = 0xffc170, duration = 0.075, opacity = 0.9) {
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 7;
    this.scene.add(line);
    this.tracers.push({ line, life: duration, maxLife: duration, baseOpacity: opacity });
  }

  smokePuff(pos, color = 0x6b6a63, count = 7, force = 1.2, size = 5) {
    for (let i = 0; i < count; i++) {
      this.smoke.spawn(pos, {
        color,
        speed: (0.2 + Math.random() * force) * 1.5,
        spread: 0.8,
        life: 0.7 + Math.random() * 1.2,
        size: size * (0.6 + Math.random() * 0.8),
        gravity: -0.08,
        drag: 1.1,
        growth: 3.2,
        alpha: 0.24,
      });
    }
  }

  explosion(pos) {
    for (let i = 0; i < 42; i++) {
      this.sparks.spawn(pos, {
        color: i % 4 === 0 ? 0xfff4ca : i % 3 === 0 ? 0xff4a18 : 0xff9a2e,
        speed: 5 + Math.random() * 17,
        spread: 1,
        life: 0.25 + Math.random() * 0.65,
        size: 2 + Math.random() * 4,
        gravity: 6,
        drag: 1.3,
        growth: 0.2,
        alpha: 1,
      });
    }
    for (let i = 0; i < 24; i++) {
      this.smoke.spawn(pos, {
        color: i % 5 === 0 ? 0x24211e : 0x45413a,
        speed: 1.2 + Math.random() * 5,
        spread: 1,
        life: 1.1 + Math.random() * 1.8,
        size: 9 + Math.random() * 18,
        gravity: -0.45,
        drag: 1.2,
        growth: 3.5,
        alpha: 0.38,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.smoke.spawn(pos, {
        color: 0x1b1714,
        speed: 7 + Math.random() * 13,
        spread: 1,
        life: 0.5 + Math.random() * 0.9,
        size: 3 + Math.random() * 6,
        gravity: 15,
        drag: 0.8,
        growth: 0.7,
        alpha: 0.8,
      });
    }

    const geo = new THREE.SphereGeometry(1, 16, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb05b,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.copy(pos);
    flash.scale.setScalar(0.8);
    flash.renderOrder = 9;
    this.scene.add(flash);
    this.flashes.push({ mesh: flash, life: 0.28, maxLife: 0.28 });

    const ringGeo = new THREE.RingGeometry(0.5, 0.85, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc27d,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.06, pos.z);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, life: 0.65, maxLife: 0.65 });

    const light = new THREE.PointLight(0xff8a35, 55, 18, 2);
    light.position.copy(pos).y += 0.6;
    this.scene.add(light);
    this.lights.push({ light, life: 0.3, maxLife: 0.3, base: 55 });
  }

  flash(pos, color = 0xffb366, intensity = 16, distance = 8) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.copy(pos);
    this.scene.add(light);
    this.lights.push({ light, life: 0.07, maxLife: 0.07, base: intensity });
  }

  clear() {
    for (const t of this.tracers) {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    }
    this.tracers.length = 0;
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
    this.rings.length = 0;
    for (const f of this.flashes) {
      this.scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
    }
    this.flashes.length = 0;
    for (const l of this.lights) this.scene.remove(l.light);
    this.lights.length = 0;
    this.sparks.alphas.fill(0);
    this.sparks.life.fill(0);
    this.smoke.alphas.fill(0);
    this.smoke.life.fill(0);
  }

  update(dt) {
    this.sparks.update(dt);
    this.smoke.update(dt);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / t.maxLife) * t.baseOpacity;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + k * 14);
      r.mesh.material.opacity = (1 - k) * 0.8;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const k = 1 - f.life / f.maxLife;
      f.mesh.scale.setScalar(0.8 + k * 5.4);
      f.mesh.material.opacity = (1 - k) * 0.9;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        this.flashes.splice(i, 1);
      }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i];
      l.life -= dt;
      l.light.intensity = Math.max(0, l.life / l.maxLife) * l.base;
      if (l.life <= 0) {
        this.scene.remove(l.light);
        this.lights.splice(i, 1);
      }
    }
  }
}
