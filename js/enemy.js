import * as THREE from '../vendor/three.module.js';
import { isBlockedCircle, lineOfSight, moveWithCollisions, raySphere } from './collision.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 12, 8);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 7);
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _target = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _end = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _right = new THREE.Vector3();
const _forward = new THREE.Vector3();

function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export class Enemy {
  constructor(game, position, type = 'grunt') {
    this.game = game;
    this.type = type;
    this.scale = type === 'heavy' ? 1.45 : 1;
    this.hp = type === 'heavy' ? 880 : 90 + Math.max(0, game.waveIndex) * 8;
    this.maxHp = this.hp;
    this.damage = type === 'heavy' ? 14 : 6.2 + Math.max(0, game.waveIndex) * 0.55;
    this.moveSpeed = type === 'heavy' ? 1.65 : 2.35 + Math.max(0, game.waveIndex) * 0.09;
    this.preferred = type === 'heavy' ? 13 : 15;
    this.dead = false;
    this.removed = false;
    this.deathT = 0;
    this.spawnGrace = 0.9 + Math.random() * 0.85;
    this.fireCooldown = 1.4 + Math.random() * 1.4;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.muzzleTimer = 0;
    this.losTimer = Math.random() * 0.16;
    this.hasLOS = false;
    this.avoidDir = Math.random() > 0.5 ? 1 : -1;
    this.avoidTimer = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 1.2 + Math.random() * 1.6;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.walkAmount = 0;
    this.flinch = 0;
    this.aim = 0;
    this.position = new THREE.Vector3(position.x, 0, position.z);
    this.eye = new THREE.Vector3();
    this.headWorld = new THREE.Vector3();
    this.chestWorld = new THREE.Vector3();
    this.pelvisWorld = new THREE.Vector3();

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    this.buildModel();
    game.scene.add(this.group);
  }

  buildModel() {
    const heavy = this.type === 'heavy';
    const mats = {
      uniform: new THREE.MeshStandardMaterial({
        color: heavy ? 0x333a36 : 0x4b5750,
        roughness: 0.94,
        metalness: 0.06,
        emissive: 0x070b09,
        emissiveIntensity: 0.5,
      }),
      armor: new THREE.MeshStandardMaterial({
        color: heavy ? 0x3c4341 : 0x5a6860,
        roughness: 0.75,
        metalness: 0.24,
        emissive: 0x060a09,
        emissiveIntensity: 0.4,
      }),
      webbing: new THREE.MeshStandardMaterial({ color: 0x27291f, roughness: 1 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x121716, roughness: 0.65, metalness: 0.34 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x2c3331, roughness: 0.5, metalness: 0.66 }),
      skin: new THREE.MeshStandardMaterial({ color: heavy ? 0x805d46 : 0x7e604b, roughness: 0.92 }),
      visor: new THREE.MeshStandardMaterial({
        color: 0x280804,
        emissive: heavy ? 0xff6a1f : 0xff2c19,
        emissiveIntensity: 2.4,
        roughness: 0.25,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: heavy ? 0x9b461c : 0x7d5632,
        emissive: heavy ? 0x3d1707 : 0x1e1208,
        emissiveIntensity: 0.7,
        roughness: 0.8,
      }),
    };
    this.materials = Object.values(mats);

    const add = (parent, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) => {
      const m = new THREE.Mesh(UNIT_BOX, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const sphere = (parent, sx, sy, sz, mat, x, y, z, cast = true) => {
      const m = new THREE.Mesh(UNIT_SPHERE, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const limb = (parent, ax, ay, az, bx, by, bz, thickness, mat, cast = false) => {
      const a = new THREE.Vector3(ax, ay, az);
      const b = new THREE.Vector3(bx, by, bz);
      const dir = b.clone().sub(a);
      const len = dir.length();
      const m = new THREE.Mesh(UNIT_CYL, mat);
      m.scale.set(thickness, len, thickness);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, dir.normalize());
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const v = this.visual;
    // Legs (pivot at hip so they can swing).
    this.legL = new THREE.Group();
    this.legL.position.set(-0.17, 0.84, 0);
    v.add(this.legL);
    add(this.legL, 0.18, 0.47, 0.23, mats.uniform, 0, -0.22, 0);
    add(this.legL, 0.15, 0.37, 0.18, mats.uniform, 0, -0.62, 0);
    add(this.legL, 0.18, 0.12, 0.31, mats.dark, 0, -0.81, 0.055);
    this.legR = new THREE.Group();
    this.legR.position.set(0.17, 0.84, 0);
    v.add(this.legR);
    add(this.legR, 0.18, 0.47, 0.23, mats.uniform, 0, -0.22, 0);
    add(this.legR, 0.15, 0.37, 0.18, mats.uniform, 0, -0.62, 0);
    add(this.legR, 0.18, 0.12, 0.31, mats.dark, 0, -0.81, 0.055);

    add(v, 0.48, 0.2, 0.29, mats.webbing, 0, 0.9, 0);
    add(v, 0.64, 0.56, 0.36, mats.uniform, 0, 1.27, 0);
    add(v, 0.52, 0.38, 0.075, mats.armor, 0, 1.3, 0.21);
    // Magazine pouches and belt.
    add(v, 0.14, 0.18, 0.08, mats.webbing, -0.16, 1.08, 0.22);
    add(v, 0.14, 0.18, 0.08, mats.webbing, 0.0, 1.08, 0.23);
    add(v, 0.14, 0.18, 0.08, mats.webbing, 0.16, 1.08, 0.22);
    // Backpack + radio.
    add(v, 0.42, 0.48, 0.2, mats.webbing, 0, 1.29, -0.27);
    add(v, 0.11, 0.25, 0.09, mats.dark, 0.14, 1.44, -0.39, 0.1);
    add(v, 0.035, 0.13, 0.035, mats.metal, 0.14, 1.62, -0.39, 0.1);
    // Shoulder armor / hostile accent.
    add(v, 0.22, 0.18, 0.3, mats.armor, -0.38, 1.45, 0, 0, 0, 0.15);
    add(v, 0.22, 0.18, 0.3, mats.armor, 0.38, 1.45, 0, 0, 0, -0.15);
    add(v, 0.055, 0.18, 0.06, mats.accent, -0.42, 1.44, 0.15);
    add(v, 0.055, 0.18, 0.06, mats.accent, 0.42, 1.44, 0.15);
    if (heavy) {
      add(v, 0.32, 0.16, 0.42, mats.armor, -0.46, 1.53, 0);
      add(v, 0.32, 0.16, 0.42, mats.armor, 0.46, 1.53, 0);
      add(v, 0.5, 0.2, 0.1, mats.accent, 0, 1.5, 0.24);
    }

    // Head, helmet and visor.
    sphere(v, 0.15, 0.175, 0.165, mats.skin, 0, 1.68, 0.01);
    add(v, 0.3, 0.14, 0.32, mats.armor, 0, 1.79, -0.005, 0.04);
    add(v, 0.34, 0.045, 0.37, mats.armor, 0, 1.735, 0.02, 0.04);
    add(v, 0.23, 0.11, 0.07, mats.dark, 0, 1.66, 0.16);
    add(v, 0.155, 0.047, 0.025, mats.visor, 0, 1.675, 0.2, 0, 0, 0, false);
    add(v, 0.09, 0.055, 0.06, mats.dark, 0.19, 1.68, 0.07, 0, 0, 0, false);
    // Neck.
    add(v, 0.16, 0.15, 0.16, mats.skin, 0, 1.54, 0.01);
    // Visor glow.
    const glowTex = this.game.world.textures.glowTex;
    this.visorGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: heavy ? 0xff8a3a : 0xff3b24,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.visorGlow.position.set(0, 1.675, 0.24);
    this.visorGlow.scale.setScalar(heavy ? 0.55 : 0.34);
    v.add(this.visorGlow);

    // Arms reach toward the rifle.
    limb(v, -0.36, 1.47, 0.02, 0.02, 1.17, 0.48, 0.075, mats.uniform, true);
    limb(v, 0.36, 1.47, 0.02, 0.25, 1.14, 0.42, 0.075, mats.uniform, true);
    sphere(v, 0.085, 0.075, 0.1, mats.dark, 0.02, 1.17, 0.49, false);
    sphere(v, 0.085, 0.075, 0.1, mats.dark, 0.25, 1.14, 0.44, false);

    // Rifle points +Z (the model's forward).
    this.rifle = new THREE.Group();
    this.rifle.position.set(0.17, 1.19, 0.38);
    v.add(this.rifle);
    add(this.rifle, 0.09, 0.12, 0.48, mats.dark, 0, 0, 0, 0, 0, 0, false);
    add(this.rifle, 0.07, 0.1, 0.23, mats.metal, 0, 0, 0.3, 0, 0, 0, false);
    const barrel = new THREE.Mesh(UNIT_CYL, mats.metal);
    barrel.scale.set(0.017, 0.32, 0.017);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.5);
    this.rifle.add(barrel);
    add(this.rifle, 0.045, 0.045, 0.12, mats.dark, 0, 0.01, 0.68, 0, 0, 0, false);
    add(this.rifle, 0.055, 0.18, 0.1, mats.dark, 0, -0.14, 0.02, 0.18, 0, 0, false);
    add(this.rifle, 0.06, 0.075, 0.18, mats.dark, 0, 0.13, -0.02, 0, 0, 0, false);
    if (heavy) {
      add(this.rifle, 0.14, 0.14, 0.55, mats.metal, 0, 0, 0, 0, 0, 0, false);
      for (const ox of [-0.05, 0.05]) {
        const bbl = new THREE.Mesh(UNIT_CYL, mats.metal);
        bbl.scale.set(0.025, 0.34, 0.025);
        bbl.rotation.x = Math.PI / 2;
        bbl.position.set(ox, -0.01, 0.48);
        this.rifle.add(bbl);
      }
    }
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.012, 0.74);
    this.rifle.add(this.muzzle);

    this.muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffb35f,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.muzzleFlash.position.set(0, 0.012, 0.76);
    this.muzzleFlash.scale.setScalar(heavy ? 0.9 : 0.55);
    this.muzzleFlash.visible = false;
    this.rifle.add(this.muzzleFlash);

    this.visual.scale.setScalar(this.scale);
    this.group.traverse((obj) => {
      if (obj.isMesh) obj.frustumCulled = true;
    });
  }

  update(dt, time) {
    if (this.dead) {
      this.updateDeath(dt);
      return;
    }
    if (this.game.state !== 'playing' || !this.game.player.alive) return;

    const player = this.game.player;
    _target.set(player.pos.x, player.pos.y + player.eyeHeight, player.pos.z);
    this.eye.set(this.position.x, 1.62 * this.scale, this.position.z);
    this.chestWorld.set(this.position.x, 1.27 * this.scale, this.position.z);
    this.headWorld.set(this.position.x, 1.69 * this.scale, this.position.z);
    this.pelvisWorld.set(this.position.x, 0.88 * this.scale, this.position.z);

    const dx = player.pos.x - this.position.x;
    const dz = player.pos.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.hasLOS = lineOfSight(this.eye, _target, this.game.world.colliders);
      this.losTimer = 0.17 + Math.random() * 0.1;
    }

    if (this.spawnGrace > 0) this.spawnGrace -= dt;

    // Face the player.
    const targetAngle = Math.atan2(dx, dz);
    const turn = shortestAngle(this.group.rotation.y, targetAngle);
    this.group.rotation.y += turn * (1 - Math.exp(-this.type === 'heavy' ? 4 : 8.5) * dt);
    this.aim = Math.max(0, Math.min(1, this.aim + (this.hasLOS ? dt * 2 : -dt * 2)));

    // Movement selection.
    const desired = _v.set(dx, 0, dz);
    if (dist > 0.01) desired.multiplyScalar(1 / dist);
    let moving = false;
    let speedScale = 1;

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeDir *= -1;
      this.strafeTimer = 1.1 + Math.random() * 1.7;
    }

    if (!this.hasLOS || dist > this.preferred + 6) {
      moving = true;
    } else if (dist < 6.5) {
      desired.multiplyScalar(-1);
      moving = true;
      speedScale = 0.7;
    } else {
      // Strafe while holding the angle.
      desired.set(-dz, 0, dx).multiplyScalar(this.strafeDir / Math.max(0.001, dist));
      moving = true;
      speedScale = 0.46;
    }

    // Keep a little distance from each other.
    for (const other of this.game.enemies) {
      if (other === this || other.dead) continue;
      const sx = this.position.x - other.position.x;
      const sz = this.position.z - other.position.z;
      const sd = Math.hypot(sx, sz);
      if (sd > 0.001 && sd < 1.35) {
        desired.x += (sx / sd) * (1.35 - sd) * 0.55;
        desired.z += (sz / sd) * (1.35 - sd) * 0.55;
      }
    }

    // Obstacle steering.
    if (desired.lengthSq() > 0.001) {
      desired.normalize();
      if (this.avoidTimer > 0) this.avoidTimer -= dt;
      if (this.avoidTimer <= 0) {
        const probeX = this.position.x + desired.x * 1.25;
        const probeZ = this.position.z + desired.z * 1.25;
        if (isBlockedCircle(probeX, probeZ, 0.36, 0, 1.65, this.game.world.colliders)) {
          const left = desired.clone().applyAxisAngle(UP, 0.95);
          const right = desired.clone().applyAxisAngle(UP, -0.95);
          const leftBlocked = isBlockedCircle(this.position.x + left.x * 1.25, this.position.z + left.z * 1.25, 0.36, 0, 1.65, this.game.world.colliders);
          const rightBlocked = isBlockedCircle(this.position.x + right.x * 1.25, this.position.z + right.z * 1.25, 0.36, 0, 1.65, this.game.world.colliders);
          if (!leftBlocked || rightBlocked) this.avoidDir = 1;
          else this.avoidDir = -1;
          this.avoidTimer = 0.55;
        }
      }
      if (this.avoidTimer > 0) desired.applyAxisAngle(UP, this.avoidDir * 0.72);
      const step = this.moveSpeed * speedScale * dt;
      moveWithCollisions(this.position, desired.x * step, desired.z * step, 0.38, 0, 1.72 * this.scale, this.game.world.colliders, 41.2);
      this.group.position.set(this.position.x, 0, this.position.z);
      this.walkAmount = Math.min(1, this.walkAmount + dt * 5);
    } else {
      this.walkAmount = Math.max(0, this.walkAmount - dt * 6);
    }

    // Animate legs and torso.
    this.walkPhase += dt * (2.3 + this.moveSpeed * 1.45) * (moving ? 1 : 0.15);
    const swing = Math.sin(this.walkPhase) * 0.54 * this.walkAmount;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.visual.position.y = Math.abs(Math.sin(this.walkPhase * 2)) * 0.025 * this.walkAmount + this.flinch * 0.022;
    this.visual.rotation.z = Math.sin(this.walkPhase) * 0.018 * this.walkAmount - this.flinch * 0.06;
    this.flinch = Math.max(0, this.flinch - dt * 4.5);
    this.visorGlow.material.opacity = 0.38 + Math.sin(time * 5 + this.walkPhase) * 0.12;

    this.muzzleTimer -= dt;
    this.muzzleFlash.visible = this.muzzleTimer > 0;

    // Combat.
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.fireOne(dist);
        this.burstLeft--;
        this.burstTimer = this.type === 'heavy' ? 0.095 : 0.135;
      }
    } else {
      this.fireCooldown -= dt;
      if (this.hasLOS && dist < 46 && this.spawnGrace <= 0 && this.fireCooldown <= 0 && this.aim > 0.55) {
        this.burstLeft = this.type === 'heavy' ? 6 : 2 + Math.floor(Math.random() * 3);
        this.burstTimer = 0.04;
        this.fireCooldown = (this.type === 'heavy' ? 1.95 : 1.85) + Math.random() * 1.2;
      }
    }
  }

  fireOne(dist) {
    if (!this.game.player.alive || this.game.state !== 'playing') return;
    this.group.updateMatrixWorld(true);
    this.muzzle.getWorldPosition(_muzzle);
    const player = this.game.player;
    _target.set(player.pos.x, player.pos.y + player.eyeHeight, player.pos.z);

    let chance = 0.2 + Math.max(0, this.game.waveIndex) * 0.012 + (this.type === 'heavy' ? 0.095 : 0);
    chance *= clamp(1 - (dist - 10) * 0.0125, 0.28, 1.08);
    if (player.speed > 4.5) chance *= 0.78;
    if (player.sprinting) chance *= 0.82;
    if (player.crouching) chance *= 0.9;
    const hit = Math.random() < chance;

    _end.copy(_target);
    if (!hit) {
      _end.x += (Math.random() - 0.5) * 1.8;
      _end.y += (Math.random() - 0.5) * 1.5;
      _end.z += (Math.random() - 0.5) * 1.8;
    }
    this.muzzleFlash.material.rotation = Math.random() * Math.PI;
    this.muzzleFlash.visible = true;
    this.muzzleTimer = 0.055;
    this.game.effects.tracer(_muzzle, _end, this.type === 'heavy' ? 0xffa052 : 0xff5f45, 0.075, 0.82);
    this.game.effects.muzzle(_muzzle, _v.copy(_end).sub(_muzzle).normalize(), 0xff9a54, 2);

    _toPlayer.copy(this.position).sub(player.pos).setY(0);
    if (_toPlayer.lengthSq() > 0.001) _toPlayer.normalize();
    this.game.camera.getWorldDirection(_forward);
    _right.crossVectors(_forward, UP).normalize();
    const pan = clamp(_toPlayer.dot(_right), -1, 1) * 0.8;
    this.game.audio.enemyShot(dist, pan);
    if (!hit && Math.random() < 0.16 && dist < 28) this.game.audio.nearMiss(pan);
    if (hit) this.game.playerHit(this.damage, this.position);
  }

  getHit(origin, dir) {
    if (this.dead) return null;
    const headR = (this.type === 'heavy' ? 0.26 : 0.195) * this.scale;
    const bodyR = (this.type === 'heavy' ? 0.57 : 0.4) * this.scale;
    const pelvisR = (this.type === 'heavy' ? 0.5 : 0.34) * this.scale;
    const tests = [
      { center: this.headWorld, radius: headR, part: 'head' },
      { center: this.chestWorld, radius: bodyR, part: 'body' },
      { center: this.pelvisWorld, radius: pelvisR, part: 'body' },
    ];
    let best = Infinity;
    let part = null;
    for (const t of tests) {
      const d = raySphere(origin, dir, t.center, t.radius);
      if (d < best) {
        best = d;
        part = t.part;
      }
    }
    if (!part || best === Infinity) return null;
    return { distance: best, part };
  }

  takeDamage(amount, headshot, point, fromExplosion = false) {
    if (this.dead) return false;
    this.hp -= amount;
    this.flinch = Math.min(1, this.flinch + (fromExplosion ? 0.7 : 0.35));
    if (this.hp <= 0) {
      this.die(headshot);
      return true;
    }
    return false;
  }

  die(headshot) {
    this.dead = true;
    this.deathT = 0;
    this.burstLeft = 0;
    this.muzzleFlash.visible = false;
    for (const m of this.materials) {
      m.transparent = true;
      m.depthWrite = false;
    }
    this.visorGlow.material.opacity = 0.2;
    this.game.onEnemyKilled(this, headshot);
  }

  updateDeath(dt) {
    this.deathT += dt;
    const k = Math.min(1, this.deathT / 0.38);
    const ease = 1 - Math.pow(1 - k, 3);
    this.visual.rotation.x = -ease * Math.PI * 0.49;
    this.visual.position.y = -ease * 0.04;
    if (this.deathT > 3.4) {
      const fade = Math.max(0, 1 - (this.deathT - 3.4) / 1.6);
      for (const m of this.materials) m.opacity = fade;
      this.visorGlow.material.opacity = fade * 0.25;
    }
    if (this.deathT > 5.1) this.remove();
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.game.scene.remove(this.group);
    for (const m of this.materials) m.dispose();
    this.muzzleFlash.material.dispose();
    this.visorGlow.material.dispose();
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
