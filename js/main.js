import * as THREE from '../vendor/three.module.js';
import { createWorld } from './world.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { Enemy } from './enemy.js';
import { WEAPONS, createWeaponModels } from './weapons.js';
import { Hud } from './hud.js';
import {
  isBlockedCircle,
  lineOfSight,
  moveWithCollisions,
  rayBoxNearest,
  raySphere,
  groundDistance,
} from './collision.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const pad = (n, size) => String(n).padStart(size, '0');

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const quality = !isTouchDevice && window.innerWidth >= 900 ? 'high' : 'low';

const WAVES = [
  { count: 4, maxAlive: 4, heavy: 0, label: 'FIRST CONTACT' },
  { count: 6, maxAlive: 5, heavy: 0, label: 'PRESSURE RISING' },
  { count: 8, maxAlive: 6, heavy: 0, label: 'NO QUARTER' },
  { count: 10, maxAlive: 6, heavy: 0, label: 'BROKEN LINE' },
  { count: 12, maxAlive: 7, heavy: 1, label: 'THE WARDEN' },
];

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _target = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _quat = new THREE.Quaternion();

class Game {
  constructor() {
    this.canvas = $('game-canvas');
    this.isTouch = isTouchDevice;
    this.quality = quality;
    this.state = 'boot';
    this.el = {
      boot: $('boot'),
      bootFill: $('boot-fill'),
      bootLog: $('boot-log'),
      menu: $('menu'),
      hud: $('hud'),
      touch: $('touch-ui'),
      pause: $('pause'),
      end: $('end'),
      deploy: $('deploy'),
      resume: $('resume'),
      restart: $('restart'),
      quit: $('quit'),
      redeploy: $('redeploy'),
      endQuit: $('end-quit'),
      menuClock: $('menu-clock'),
      damageFlash: $('damage-flash'),
      lowHealth: $('low-health'),
      bossBar: $('boss-bar'),
    };

    this.clock = new THREE.Clock();
    this.time = 0;
    this.menuTime = 0;
    this.elapsed = 0;
    this.lastFrame = 0;
    this.frameCount = 0;
    this.fpsAccum = 0;
    this.lowFpsChecks = 0;
    this.pointerLocked = false;
    this.hadPointerLock = false;
    this.pointerLockFailed = false;
    this.triggerDown = false;
    this.aimHeld = false;
    this.touchAiming = false;
    this.touchMove = { x: 0, y: 0, magnitude: 0 };
    this.touchSprintTimer = 0;
    this.keys = Object.create(null);
    this.yaw = 0;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.trauma = 0;
    this.crosshairKick = 0;
    this.adsT = 0;
    this.sprinting = false;
    this.crouching = false;
    this.eyeHeight = 1.62;
    this.walkCycle = 0;
    this.speedSmoothed = 0;
    this.stepTimer = 0;
    this.landDip = 0;
    this.vy = 0;
    this.onGround = true;
    this.jumpQueued = false;
    this.dragLook = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseDX = 0;
    this.mouseDY = 0;

    this.player = {
      pos: new THREE.Vector3(0, 0, 33),
      velocity: new THREE.Vector3(),
      health: 100,
      armor: 75,
      alive: true,
      eyeHeight: 1.62,
      speed: 0,
      sprinting: false,
      crouching: false,
      lastDamageTime: -99,
    };

    this.weaponDefs = WEAPONS;
    this.weaponState = WEAPONS.map((w) => ({ mag: w.mag, reserve: w.reserve }));
    this.weaponIndex = 0;
    this.lastWeaponIndex = 1;
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadT = 0;
    this.reloadDuration = 0;
    this.switchTimer = 0;
    this.muzzleTimer = 0;
    this.gunKick = 0;
    this.gunKickVel = 0;
    this.autoReloadTimer = 0;
    this.gunSwayX = 0;
    this.gunSwayY = 0;
    this.grenades = 2;
    this.grenadeList = [];
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.streak = 0;
    this.streakTimer = 0;
    this.multiplier = 1;
    this.waveIndex = -1;
    this.waveActive = false;
    this.wavePending = 0;
    this.waveSpawned = 0;
    this.waveKilled = 0;
    this.waveTotal = 0;
    this.spawnTimer = 0;
    this.intermission = 4.0;
    this.nextWaveIndex = 0;
    this.pendingVictory = 0;
    this.enemies = [];
    this.pickups = [];
    this.effects = null;
    this.world = null;
    this.hud = null;
    this.audio = new AudioEngine();

    try {
      this.initGraphics();
    } catch (err) {
      console.error(err);
      this.el.bootLog.textContent = 'RENDERER FAILURE // WEBGL UNAVAILABLE';
      return;
    }
    this.hud = new Hud(this);
    this.bindEvents();
    this.bindTouch();
    this.resize();
    this.setupBoot();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initGraphics() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality === 'high',
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.75 : 1.25));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.44;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.045, 430);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.world = createWorld(this.scene, this.renderer, this.quality);
    this.effects = new Effects(this.scene, this.quality);

    // Camera belongs to the scene so its weapon children are rendered.
    this.gunRig = new THREE.Group();
    this.gunRig.position.copy(WEAPONS[0].hipPos);
    this.gunRig.scale.setScalar(0.88);
    this.camera.add(this.gunRig);
    this.weaponModels = createWeaponModels(this.world);
    this.weaponModels.forEach((model, index) => {
      model.visible = index === 0;
      this.gunRig.add(model);
    });
    this.gunRig.visible = false;
    const cameraFill = new THREE.PointLight(0xffdfc4, 0.9, 3.2, 2);
    cameraFill.position.set(0.16, 0.28, 0.12);
    this.camera.add(cameraFill);
    const cameraRim = new THREE.PointLight(0x6fa99c, 0.4, 2.8, 2);
    cameraRim.position.set(-0.28, 0.08, -0.55);
    this.camera.add(cameraRim);

    this.menuAngle = 0.7;
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
  }

  setupBoot() {
    const steps = [
      [8, 'ESTABLISHING SECURE UPLINK'],
      [24, 'VERIFYING OPERATOR CREDENTIALS'],
      [43, 'STREAMING SECTOR GEOMETRY'],
      [61, 'CALIBRATING BALLISTIC MODEL'],
      [79, 'SYNCING TACTICAL UPLINK'],
      [93, 'READY FOR DEPLOYMENT'],
      [100, 'WELCOME BACK, RAVEN-1'],
    ];
    let i = 0;
    const tick = () => {
      if (!this.el.boot) return;
      const [pct, text] = steps[i++];
      this.el.bootFill.style.width = `${pct}%`;
      this.el.bootLog.textContent = text;
      if (i < steps.length) {
        setTimeout(tick, 110 + Math.random() * 80);
      } else {
        this.el.menu.classList.remove('hidden');
        setTimeout(() => {
          this.el.boot.classList.add('done');
          this.state = 'menu';
          setTimeout(() => this.el.boot.classList.add('hidden'), 650);
        }, 420);
      }
    };
    setTimeout(tick, 220);
    setInterval(() => {
      const d = new Date();
      this.el.menuClock.textContent = `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
    }, 1000);
  }

  bindEvents() {
    this.el.deploy.addEventListener('click', () => {
      this.audio.init();
      this.audio.ui();
      this.startMission();
    });
    this.el.resume.addEventListener('click', () => this.resumeGame());
    this.el.restart.addEventListener('click', () => this.startMission());
    this.el.quit.addEventListener('click', () => this.toMenu());
    this.el.redeploy.addEventListener('click', () => this.startMission());
    this.el.endQuit.addEventListener('click', () => this.toMenu());

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => {
      if (this.state === 'playing' && !this.isTouch) this.pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing' && !this.isTouch) this.pauseGame();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.pointerLocked) {
        this.hadPointerLock = true;
      } else if (this.state === 'playing' && this.hadPointerLock && !this.isTouch) {
        this.hadPointerLock = false;
        this.pauseGame();
      }
    });
    document.addEventListener('pointerlockerror', () => {
      this.pointerLockFailed = true;
      this.hud?.toast('POINTER LOCK UNAVAILABLE // DRAG TO LOOK', 3);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.state !== 'playing') return;
      if (this.pointerLocked) {
        this.applyLook(e.movementX || 0, e.movementY || 0);
      } else if (this.dragLook) {
        this.applyLook(e.movementX || 0, e.movementY || 0);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state !== 'playing') return;
      if (e.button === 0) {
        this.triggerDown = true;
        this.dragLook = !this.pointerLocked;
        if (!this.pointerLocked && !this.isTouch) this.requestLock();
        this.tryFire();
      } else if (e.button === 2) {
        this.aimHeld = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.triggerDown = false;
        this.dragLook = false;
      } else if (e.button === 2) {
        this.aimHeld = false;
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.pointerLocked && !this.isTouch) this.requestLock();
    });
    window.addEventListener('wheel', (e) => {
      if (this.state !== 'playing') return;
      if (Math.abs(e.deltaY) < 6) return;
      e.preventDefault();
      this.switchWeapon(this.weaponIndex === 0 ? 1 : 0);
    }, { passive: false });
  }

  onKeyDown(e) {
    const code = e.code;
    if (code === 'Escape') {
      if (this.state === 'playing') {
        e.preventDefault();
        this.pauseGame();
      } else if (this.state === 'paused') {
        e.preventDefault();
        this.resumeGame();
      }
      return;
    }
    if (code === 'Enter' && this.state === 'menu') {
      e.preventDefault();
      this.el.deploy.click();
      return;
    }
    if (code === 'KeyM') {
      const muted = !this.audio.muted;
      this.audio.setMuted(muted);
      this.hud?.toast(muted ? 'AUDIO MUTED' : 'AUDIO ONLINE', 1.2);
      return;
    }
    if (this.state !== 'playing') return;
    if (['Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(code)) e.preventDefault();
    this.keys[code] = true;
    if (e.repeat) return;
    if (code === 'Space') this.jumpQueued = true;
    if (code === 'KeyR') this.startReload();
    if (code === 'KeyG') this.throwGrenade();
    if (code === 'Digit1') this.switchWeapon(0);
    if (code === 'Digit2') this.switchWeapon(1);
    if (code === 'KeyQ') this.switchWeapon(this.lastWeaponIndex);
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  applyLook(dx, dy) {
    if (!dx && !dy) return;
    const sensitivity = 0.00205 * (this.adsT > 0.5 ? 0.66 : 1);
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = clamp(this.pitch, -1.44, 1.44);
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  bindTouch() {
    if (!this.isTouch) return;
    document.body.classList.add('is-touch');

    const stick = $('move-stick');
    const knob = $('move-knob');
    let stickId = null;

    const updateStick = (e) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const rad = rect.width * 0.36;
      const mag = Math.hypot(dx, dy);
      if (mag > rad) {
        dx = (dx / mag) * rad;
        dy = (dy / mag) * rad;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / rad;
      const ny = -dy / rad;
      this.touchMove.x = nx;
      this.touchMove.y = ny;
      this.touchMove.magnitude = Math.min(1, Math.hypot(nx, ny));
      if (ny > 0.55 && this.touchMove.magnitude > 0.9) this.touchSprintTimer += 0.016;
      else this.touchSprintTimer = 0;
    };

    stick.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return;
      e.preventDefault();
      stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      updateStick(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      e.preventDefault();
      updateStick(e);
    });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      knob.style.transform = 'translate(0, 0)';
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      this.touchMove.magnitude = 0;
      this.touchSprintTimer = 0;
    };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);

    // Touch look: swipe on the open canvas.
    let lookId = null;
    let lx = 0;
    let ly = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || this.state !== 'playing') return;
      e.preventDefault();
      lookId = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      e.preventDefault();
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      this.yaw -= dx * 0.0047;
      this.pitch -= dy * 0.0042;
      this.pitch = clamp(this.pitch, -1.44, 1.44);
    });
    const endLook = (e) => {
      if (e.pointerId === lookId) lookId = null;
    };
    this.canvas.addEventListener('pointerup', endLook);
    this.canvas.addEventListener('pointercancel', endLook);

    const fire = $('btn-fire');
    const startFire = (e) => {
      if (this.state !== 'playing') return;
      e.preventDefault();
      fire.setPointerCapture(e.pointerId);
      this.triggerDown = true;
      this.tryFire();
    };
    const stopFire = (e) => {
      e.preventDefault();
      this.triggerDown = false;
    };
    fire.addEventListener('pointerdown', startFire);
    fire.addEventListener('pointerup', stopFire);
    fire.addEventListener('pointercancel', stopFire);
    fire.addEventListener('lostpointercapture', () => { this.triggerDown = false; });

    const aim = $('btn-aim');
    aim.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchAiming = !this.touchAiming;
      aim.classList.toggle('active', this.touchAiming);
    });
    $('btn-reload').addEventListener('pointerdown', (e) => { e.preventDefault(); this.startReload(); });
    $('btn-grenade').addEventListener('pointerdown', (e) => { e.preventDefault(); this.throwGrenade(); });
    $('btn-swap').addEventListener('pointerdown', (e) => { e.preventDefault(); this.switchWeapon(this.weaponIndex === 0 ? 1 : 0); });
    $('btn-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); this.jumpQueued = true; });
    $('btn-touch-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); this.pauseGame(); });
    $('look-hint').addEventListener('pointerdown', () => {});
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      const result = this.canvas.requestPointerLock();
      if (result && result.catch) result.catch(() => { this.pointerLockFailed = true; });
    } catch {
      this.pointerLockFailed = true;
    }
  }

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.effects) {
      const scale = Math.min(h, 1200) * 0.55;
      this.effects.sparks.points.material.uniforms.uScale.value = scale;
      this.effects.smoke.points.material.uniforms.uScale.value = scale * 1.1;
    }
    const rotateHint = $('rotate-hint');
    if (rotateHint) rotateHint.classList.toggle('show', this.isTouch && this.state === 'playing' && h > w);
  }

  // ---- mission lifecycle ----
  startMission() {
    this.audio.init();
    this.audio.resume();
    this.clearMissionEntities();
    this.state = 'playing';
    this.triggerDown = false;
    this.aimHeld = false;
    this.touchAiming = false;
    this.keys = Object.create(null);
    this.pointerLocked = false;
    this.hadPointerLock = false;
    this.dragLook = false;

    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.end.classList.add('hidden');
    this.el.end.classList.remove('dead');
    this.el.boot.classList.add('hidden');
    this.el.bossBar.classList.add('hidden');
    this.hud.setVisible(true);
    this.gunRig.visible = true;
    this.gunRig.position.copy(WEAPONS[0].hipPos);
    this.weaponModels.forEach((m, i) => { m.visible = i === 0; });

    this.player.pos.copy(this.world.playerSpawn);
    this.player.pos.y = 0;
    this.player.velocity.set(0, 0, 0);
    this.player.health = 100;
    this.player.armor = 75;
    this.player.alive = true;
    this.player.eyeHeight = 1.62;
    this.player.lastDamageTime = -99;
    this.player.speed = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.trauma = 0;
    this.eyeHeight = 1.62;
    this.vy = 0;
    this.onGround = true;
    this.jumpQueued = false;
    this.walkCycle = 0;
    this.stepTimer = 1.2;
    this.muzzleTimer = 0;
    this.fireCooldown = 0;
    this.autoReloadTimer = 0;
    this.reloading = false;
    this.reloadT = 0;
    this.switchTimer = 0;
    this.weaponIndex = 0;
    this.lastWeaponIndex = 1;
    this.weaponState = WEAPONS.map((w) => ({ mag: w.mag, reserve: w.reserve }));
    this.grenades = 2;
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.streak = 0;
    this.streakTimer = 0;
    this.multiplier = 1;
    this.elapsed = 0;
    this.waveIndex = -1;
    this.waveActive = false;
    this.wavePending = 0;
    this.waveSpawned = 0;
    this.waveKilled = 0;
    this.waveTotal = 0;
    this.spawnTimer = 0;
    this.intermission = 4.2;
    this.nextWaveIndex = 0;
    this.pendingVictory = 0;
    this.adsT = 0;
    this.crosshairKick = 0;
    this.sprinting = false;
    this.crouching = false;
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();
    this.hud.reset();
    this.hud.updateWeapon();
    this.hud.announce('OPERATION IRON VEIL', 'MISSION <em>START</em>', 'HOLD THE RELAY // SURVIVE FIVE WAVES', 3.4);
    this.hud.radio('RAVEN-1, you are on the ground. The relay is still hot. Hold the compound.', 5);
    this.audio.waveAlarm();
    this.resize();
    this.requestLock();
    if (this.isTouch) {
      setTimeout(() => {
        if (this.state === 'playing' && this.isTouch) this.hud.radio('Touch controls online. Move with the left pad, drag the screen to aim.', 4.5);
      }, 3600);
    }
  }

  clearMissionEntities() {
    if (!this.world) return;
    for (const e of this.enemies) {
      if (!e.removed) e.remove();
    }
    this.enemies.length = 0;
    for (const p of this.pickups) {
      this.scene.remove(p.group);
      disposeObject(p.group);
    }
    this.pickups.length = 0;
    for (const g of this.grenadeList) {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    }
    this.grenadeList.length = 0;
    this.effects.clear();
    this.el.bossBar.classList.add('hidden');
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
  }

  toMenu() {
    if (this.state === 'playing' || this.state === 'paused') this.exitLock();
    this.state = 'menu';
    this.triggerDown = false;
    this.aimHeld = false;
    this.touchAiming = false;
    this.clearMissionEntities();
    this.hud.setVisible(false);
    this.el.pause.classList.add('hidden');
    this.el.end.classList.add('hidden');
    this.el.menu.classList.remove('hidden');
    this.el.bossBar.classList.add('hidden');
    this.gunRig.visible = false;
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.menuTime = 0;
    this.player.alive = false;
    this.resize();
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.triggerDown = false;
    this.aimHeld = false;
    this.dragLook = false;
    this.keys = Object.create(null);
    $('pause-wave').textContent = pad(Math.max(1, this.waveIndex + 1), 2);
    $('pause-kills').textContent = String(this.kills);
    $('pause-score').textContent = String(this.score).padStart(6, '0');
    this.el.pause.classList.remove('hidden');
    this.el.pause.setAttribute('aria-hidden', 'false');
    this.exitLock();
    this.resize();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.audio.resume();
    this.el.pause.classList.add('hidden');
    this.el.pause.setAttribute('aria-hidden', 'true');
    this.state = 'playing';
    this.requestLock();
  }

  exitLock() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    this.pointerLocked = false;
  }

  showEnd(victory) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.exitLock();
    this.triggerDown = false;
    this.touchAiming = false;
    this.hud.setVisible(false);
    this.el.pause.classList.add('hidden');
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    $('end-code').textContent = victory ? 'MISSION STATUS // SECURED' : 'SIGNAL LOST // OPERATOR DOWN';
    $('end-title').innerHTML = victory ? 'MISSION <em>COMPLETE</em>' : 'OPERATOR <em>K.I.A.</em>';
    $('end-copy').textContent = victory
      ? 'The blacksite is quiet. Extraction is inbound. The relay is yours.'
      : 'The relay went dark. No extraction. No second chances.';
    $('end-score').textContent = String(this.score).padStart(6, '0');
    $('end-kills').textContent = String(this.kills);
    $('end-headshots').textContent = String(this.headshots);
    $('end-accuracy').textContent = `${accuracy}%`;
    const wavesCleared = victory ? WAVES.length : Math.min(WAVES.length, Math.max(0, this.waveActive ? this.waveIndex : this.waveIndex + 1));
    $('end-waves').textContent = `${wavesCleared} / ${WAVES.length}`;
    const secs = Math.floor(this.elapsed);
    $('end-time').textContent = `${pad(Math.floor(secs / 60), 2)}:${pad(secs % 60, 2)}`;
    this.el.end.classList.toggle('dead', !victory);
    this.el.end.classList.remove('hidden');
    this.el.end.setAttribute('aria-hidden', 'false');
    if (victory) this.audio.missionComplete();
    else this.audio.gameOver();
    this.resize();
  }

  // ---- frame loop ----
  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    if (!this.renderer) return;

    if (this.state === 'boot' || this.state === 'menu') {
      this.updateMenuCamera(dt);
      this.world.update(dt, this.time);
      this.effects.update(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'ending') {
      this.updateEnding(dt);
    } else if (this.state === 'ended') {
      this.world.update(dt, this.time);
      this.effects.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
    this.fpsAccum += dt;
    if (this.frameCount >= 120) {
      const avg = this.fpsAccum / this.frameCount;
      if (avg > 1 / 42 && this.renderer.getPixelRatio() > 1 && this.lowFpsChecks < 2 && this.state === 'playing') {
        this.renderer.setPixelRatio(1);
        this.lowFpsChecks++;
        this.resize();
      }
      this.frameCount = 0;
      this.fpsAccum = 0;
    }
  }

  updateMenuCamera(dt) {
    this.menuTime += dt;
    const angle = 0.66 + this.menuTime * 0.018;
    const radius = 42;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 15.5 + Math.sin(this.menuTime * 0.16) * 1.2;
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 2.6, -3.5);
    this.camera.rotation.order = 'YXZ';
  }

  updatePlaying(dt) {
    this.elapsed += dt;
    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.updateWeapons(dt);
    this.updateEnemies(dt);
    this.updateGrenades(dt);
    this.updatePickups(dt);
    this.updateWaves(dt);
    this.updateTimers(dt);
    this.world.update(dt, this.time);
    this.effects.update(dt);
    this.hud.update(dt);
  }

  updateEnding(dt) {
    this.deathTime = (this.deathTime || 0) + dt;
    const p = this.player;
    if (!p.alive) {
      const fall = Math.min(1, this.deathTime / 0.8);
      const eye = lerp(p.eyeHeight || 1.62, 0.35, fall);
      this.camera.position.set(p.pos.x, p.pos.y + eye, p.pos.z);
      this.camera.rotation.set(this.pitch - fall * 0.26, this.yaw, fall * 0.6, 'YXZ');
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();
    }
    this.effects.update(dt);
    this.world.update(dt, this.time);
    this.hud.update(dt);
  }

  updateTimers(dt) {
    if (this.streakTimer > 0) {
      this.streakTimer -= dt;
      if (this.streakTimer <= 0) {
        this.streak = 0;
        this.multiplier = 1;
      }
    }
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        const model = this.weaponModels[this.weaponIndex];
        model.userData.flash.visible = false;
        model.userData.light.intensity = 0;
      }
    }
    this.recoilPitch = damp(this.recoilPitch, 0, 13, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 13, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.65);
    this.landDip = damp(this.landDip, 0, 14, dt);
    this.crosshairKick = damp(this.crosshairKick, 0, 9, dt);
  }

  // ---- movement / camera ----
  updatePlayer(dt) {
    const p = this.player;
    if (!p.alive) return;

    const keys = this.keys;
    let ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    if (this.isTouch) {
      ix += this.touchMove.x;
      iz += this.touchMove.y;
    }
    let mag = Math.hypot(ix, iz);
    if (mag > 1) {
      ix /= mag;
      iz /= mag;
      mag = 1;
    }

    const shift = keys.ShiftLeft || keys.ShiftRight;
    const ctrl = keys.ControlLeft || keys.ControlRight || keys.KeyC;
    this.crouching = !!ctrl;
    const aiming = this.isAiming();
    const touchSprint = this.isTouch && this.touchSprintTimer > 0.75 && iz > 0.45;
    const wantSprint = (shift || touchSprint) && iz > 0.25 && !aiming && !this.crouching && !this.reloading;
    this.sprinting = !!wantSprint && this.onGround;
    p.sprinting = this.sprinting;
    p.crouching = this.crouching;

    const targetEye = this.crouching ? 1.08 : 1.62;
    this.eyeHeight = damp(this.eyeHeight, targetEye, 10, dt);
    p.eyeHeight = this.eyeHeight;

    let speed = 5.25;
    if (this.sprinting) speed = 8.3;
    else if (aiming) speed = 3.0;
    if (this.crouching) speed = Math.min(speed, 2.5);
    if (iz < -0.15) speed *= 0.78;

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const tvx = (fx * iz + rx * ix) * speed;
    const tvz = (fz * iz + rz * ix) * speed;
    p.velocity.x = damp(p.velocity.x, tvx, 12, dt);
    p.velocity.z = damp(p.velocity.z, tvz, 12, dt);
    p.velocity.x = Math.abs(p.velocity.x) < 0.01 ? 0 : p.velocity.x;
    p.velocity.z = Math.abs(p.velocity.z) < 0.01 ? 0 : p.velocity.z;

    if (this.jumpQueued) {
      if (this.onGround) {
        this.vy = 5.9;
        this.onGround = false;
        this.audio.footstep(true);
      }
      this.jumpQueued = false;
    }

    this.vy -= 19.5 * dt;
    p.pos.y += this.vy * dt;
    if (p.pos.y <= 0) {
      if (!this.onGround && this.vy < -4) {
        this.landDip = Math.min(0.12, -this.vy * 0.012);
        this.trauma = Math.min(1, this.trauma + 0.12);
      }
      p.pos.y = 0;
      this.vy = 0;
      this.onGround = true;
    }

    moveWithCollisions(p.pos, p.velocity.x * dt, p.velocity.z * dt, 0.34, p.pos.y, 1.72, this.world.colliders, this.world.bounds);
    p.speed = Math.hypot(p.velocity.x, p.velocity.z);

    if (p.speed > 0.35 && this.onGround) {
      this.walkCycle += p.speed * dt * 1.4;
      this.stepTimer -= p.speed * dt;
      if (this.stepTimer <= 0) {
        this.audio.footstep(this.sprinting);
        this.stepTimer = this.sprinting ? 2.5 : this.crouching ? 1.85 : 2.05;
      }
    } else {
      this.stepTimer = Math.min(this.stepTimer, 0.6);
    }

    // Health regenerates after a short break from damage.
    if (this.elapsed - p.lastDamageTime > 4.4 && p.health < 100) {
      p.health = Math.min(100, p.health + 13.5 * dt);
    }
    if (this.elapsed - p.lastDamageTime > 7 && p.armor < 75) {
      p.armor = Math.min(75, p.armor + 7.5 * dt);
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const speedRatio = clamp(p.speed / 8.3, 0, 1);
    const bobAmp = this.adsT > 0.5 ? 0.004 : this.crouching ? 0.006 : 0.018;
    const bobX = Math.cos(this.walkCycle * 2) * bobAmp * speedRatio;
    const bobY = Math.sin(this.walkCycle * 4) * bobAmp * 0.58 * speedRatio;
    const shake = this.trauma * this.trauma;
    const shakeX = Math.sin(this.time * 47.3) * 0.014 * shake + Math.sin(this.time * 31.1) * 0.008 * shake;
    const shakeY = Math.cos(this.time * 39.7) * 0.012 * shake;
    const roll = (p.velocity.x * Math.cos(this.yaw) - p.velocity.z * Math.sin(this.yaw)) * -0.0022;
    this.camera.position.set(
      p.pos.x + bobX + shakeX,
      p.pos.y + this.eyeHeight + bobY - this.landDip + shakeY,
      p.pos.z
    );
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + Math.cos(this.time * 42) * 0.006 * shake,
      this.yaw + this.recoilYaw + Math.sin(this.time * 37) * 0.006 * shake,
      roll + Math.sin(this.time * 29) * 0.004 * shake,
      'YXZ'
    );
    const aiming = this.isAiming();
    const targetFov = aiming ? this.weaponDefs[this.weaponIndex].adsFov : this.sprinting ? 77 : 72;
    const diff = targetFov - this.camera.fov;
    if (Math.abs(diff) > 0.02) {
      this.camera.fov = damp(this.camera.fov, targetFov, 11, dt);
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }

  isAiming() {
    return (this.aimHeld || this.touchAiming) && !this.reloading && this.switchTimer <= 0 && !this.sprinting;
  }

  // ---- weapons ----
  updateWeapons(dt) {
    const def = this.weaponDefs[this.weaponIndex];
    const state = this.weaponState[this.weaponIndex];
    const aiming = this.isAiming();
    this.aiming = aiming;
    this.adsT = damp(this.adsT, aiming ? 1 : 0, 12, dt);
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.switchTimer > 0) this.switchTimer = Math.max(0, this.switchTimer - dt);
    if (this.autoReloadTimer > 0) {
      this.autoReloadTimer -= dt;
      if (this.autoReloadTimer <= 0) this.startReload();
    }

    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }

    if (this.triggerDown && def.auto && !this.sprinting && !this.reloading && this.switchTimer <= 0 && this.player.alive) {
      if (this.fireCooldown <= 0) this.tryFire();
    }

    this.updateWeaponVisual(dt, aiming, def, state);
    if (this.hud) this.hud.updateWeapon();
  }

  updateWeaponVisual(dt, aiming, def, state) {
    const model = this.weaponModels[this.weaponIndex];
    if (!model) return;
    const base = aiming ? def.adsPos : def.hipPos;
    const speedRatio = clamp(this.player.speed / 7, 0, 1);
    const bobScale = aiming ? 0.2 : 1;
    const bobX = Math.cos(this.walkCycle * 2) * 0.008 * speedRatio * bobScale;
    const bobY = Math.sin(this.walkCycle * 4) * 0.006 * speedRatio * bobScale;
    const swayTargetX = clamp(-this.mouseDX * 0.00055, -0.025, 0.025);
    const swayTargetY = clamp(this.mouseDY * 0.00055, -0.02, 0.02);
    this.gunSwayX = damp(this.gunSwayX, swayTargetX, 10, dt);
    this.gunSwayY = damp(this.gunSwayY, swayTargetY, 10, dt);
    this.mouseDX = 0;
    this.mouseDY = 0;

    this.gunKickVel += -this.gunKick * 120 * dt;
    this.gunKickVel *= Math.exp(-14 * dt);
    this.gunKick += this.gunKickVel * dt;
    this.gunKick = Math.max(-0.02, Math.min(0.09, this.gunKick));

    let reloadPose = 0;
    if (this.reloading) {
      const total = this.reloadDuration || 1;
      const progress = 1 - this.reloadT / total;
      reloadPose = Math.sin(clamp(progress, 0, 1) * Math.PI);
    }
    const sprintPose = this.sprinting ? 1 : 0;
    const switchDrop = this.switchTimer > 0 ? this.switchTimer / 0.5 : 0;

    const px = base.x + bobX + this.gunSwayX + (sprintPose ? 0.055 : 0);
    const py = base.y + bobY + this.gunSwayY - reloadPose * 0.085 - switchDrop * 0.18 + (sprintPose ? -0.045 : 0);
    const pz = base.z + this.gunKick * 0.34 + (sprintPose ? 0.04 : 0);
    const lambda = this.switchTimer > 0 ? 16 : 22;
    this.gunRig.position.x = damp(this.gunRig.position.x, px, lambda, dt);
    this.gunRig.position.y = damp(this.gunRig.position.y, py, lambda, dt);
    this.gunRig.position.z = damp(this.gunRig.position.z, pz, lambda, dt);

    const targetRotX = (aiming ? 0 : 0.012) + this.gunKick * 1.8 + reloadPose * 0.42 + switchDrop * 0.65 + sprintPose * 0.18;
    const targetRotY = (aiming ? 0 : -0.028) + this.gunSwayX * 0.6 + reloadPose * 0.16 + sprintPose * -0.18;
    const targetRotZ = (aiming ? 0 : 0.018) + this.gunSwayX * 0.45 + reloadPose * 0.24 - sprintPose * 0.32;
    this.gunRig.rotation.x = damp(this.gunRig.rotation.x, targetRotX, 16, dt);
    this.gunRig.rotation.y = damp(this.gunRig.rotation.y, targetRotY, 16, dt);
    this.gunRig.rotation.z = damp(this.gunRig.rotation.z, targetRotZ, 16, dt);

    if (this.muzzleTimer > 0) {
      model.userData.flash.visible = true;
      model.userData.flash.material.rotation = this.time * 23;
      const baseScale = this.weaponIndex === 0 ? 0.31 : 0.24;
      model.userData.flash.scale.setScalar(baseScale * (0.9 + Math.random() * 0.35));
      model.userData.light.intensity = 17;
    } else {
      model.userData.flash.visible = false;
      model.userData.light.intensity = 0;
    }

    // Tiny ambient glint on the optic.
    model.userData.flash.material.opacity = 0.92;
  }

  tryFire() {
    if (this.state !== 'playing' || !this.player.alive) return;
    if (this.reloading || this.switchTimer > 0 || this.sprinting) return;
    if (this.fireCooldown > 0) return;
    const def = this.weaponDefs[this.weaponIndex];
    const state = this.weaponState[this.weaponIndex];
    if (state.mag <= 0) {
      this.audio.empty();
      this.fireCooldown = 0.3;
      if (state.reserve > 0) this.autoReloadTimer = 0.25;
      this.hud.updateWeapon();
      return;
    }

    this.camera.updateMatrixWorld(true);
    this.camera.getWorldDirection(_dir);
    const aiming = this.isAiming();
    let spread = aiming ? def.adsSpread : def.hipSpread;
    spread += this.player.speed * 0.0009;
    if (!this.onGround) spread += 0.018;
    if (this.crouching) spread *= 0.72;
    const radius = spread * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    _dir.addScaledVector(_right, Math.cos(theta) * radius).addScaledVector(_up, Math.sin(theta) * radius).normalize();
    _origin.copy(this.camera.position);

    state.mag--;
    this.fireCooldown = 60 / def.rpm;
    this.shotsFired++;
    this.recoilPitch += def.recoil * (aiming ? 0.64 : 1) * (1 + Math.random() * 0.2);
    this.recoilYaw += (Math.random() - 0.5) * def.recoil * 0.7;
    this.crosshairKick = Math.min(1.2, this.crosshairKick + (aiming ? 0.12 : 0.32));
    this.trauma = Math.min(1, this.trauma + (aiming ? 0.018 : 0.03));
    this.gunKick = Math.min(0.085, this.gunKick + (aiming ? 0.018 : 0.03));
    this.gunKickVel += 0.12;
    this.muzzleTimer = 0.05;

    const model = this.weaponModels[this.weaponIndex];
    this.gunRig.updateMatrixWorld(true);
    model.userData.muzzle.getWorldPosition(_muzzle);
    this.effects.muzzle(_muzzle, _dir, 0xffbd6b, aiming ? 4 : 7);
    this.audio.shot(def.sound, 0);

    const result = this.hitscan(_origin, _dir, def);
    const endPoint = result.point || _tmp.copy(_origin).addScaledVector(_dir, 90);
    this.effects.tracer(_muzzle, endPoint, 0xffd59b, 0.062, 0.72);

    if (state.mag === 0 && state.reserve > 0) this.autoReloadTimer = 0.4;
    this.hud.updateWeapon();
  }

  hitscan(origin, dir, def) {
    const worldHit = rayBoxNearest(origin, dir, this.world.colliders, 0.12);
    let bestWorld = worldHit.distance;
    const groundD = groundDistance(origin, dir);
    if (groundD < bestWorld) bestWorld = groundD;
    if (bestWorld > 130) bestWorld = Infinity;

    let bestEnemy = null;
    let bestEnemyDist = Infinity;
    let bestPart = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const hit = e.getHit(origin, dir);
      if (hit && hit.distance < bestEnemyDist) {
        bestEnemyDist = hit.distance;
        bestEnemy = e;
        bestPart = hit.part;
      }
    }

    if (bestEnemy && bestEnemyDist < bestWorld) {
      const point = origin.clone().addScaledVector(dir, bestEnemyDist);
      const headshot = bestPart === 'head';
      this.shotsHit++;
      const damage = def.damage * (headshot ? def.headMult : 1);
      this.effects.blood(point, dir, headshot);
      this.audio.hitmarker(headshot);
      this.hud.hitmarker(headshot);
      bestEnemy.takeDamage(damage, headshot, point, false);
      return { point, enemy: bestEnemy, headshot };
    }

    if (bestWorld < Infinity) {
      const point = origin.clone().addScaledVector(dir, bestWorld);
      this.effects.impact(point, 0xffc06a, 6);
      _tmp.copy(point).sub(this.player.pos);
      _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const pan = clamp(_tmp.normalize().dot(_right), -1, 1) * 0.5;
      this.audio.impact(pan);
      return { point, enemy: null, headshot: false };
    }
    return { point: null, enemy: null, headshot: false };
  }

  startReload() {
    if (this.state !== 'playing' || !this.player.alive) return;
    const def = this.weaponDefs[this.weaponIndex];
    const state = this.weaponState[this.weaponIndex];
    if (this.reloading || state.mag >= def.mag || state.reserve <= 0 || this.switchTimer > 0) return;
    this.reloading = true;
    this.reloadT = def.reload;
    this.reloadDuration = def.reload;
    this.audio.reload(def.reload);
    this.aimHeld = false;
    this.touchAiming = false;
    if (this.hud) this.hud.updateWeapon();
  }

  finishReload() {
    const def = this.weaponDefs[this.weaponIndex];
    const state = this.weaponState[this.weaponIndex];
    const needed = def.mag - state.mag;
    const take = Math.min(needed, state.reserve);
    state.mag += take;
    state.reserve -= take;
    this.reloading = false;
    this.reloadT = 0;
    if (this.hud) {
      this.hud.updateWeapon();
      this.hud.toast(`MAGAZINE // ${state.mag}`, 1);
    }
  }

  switchWeapon(index) {
    if (this.state !== 'playing' || index === this.weaponIndex || this.switchTimer > 0) return;
    this.lastWeaponIndex = this.weaponIndex;
    this.weaponModels[this.weaponIndex].visible = false;
    this.weaponIndex = index;
    this.weaponModels[this.weaponIndex].visible = true;
    this.reloading = false;
    this.reloadT = 0;
    this.switchTimer = 0.5;
    this.fireCooldown = Math.max(this.fireCooldown, 0.44);
    this.aimHeld = false;
    this.touchAiming = false;
    this.audio.switchWeapon();
    if (this.hud) this.hud.updateWeapon();
  }

  // ---- grenades / pickups ----
  throwGrenade() {
    if (this.state !== 'playing' || !this.player.alive) return;
    if (this.grenades <= 0) {
      this.hud.toast('NO FRAG REMAINING', 1.3);
      this.audio.empty();
      return;
    }
    this.grenades--;
    this.camera.getWorldDirection(_dir);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d4b3d, roughness: 0.6, metalness: 0.4, emissive: 0x120600, emissiveIntensity: 0 })
    );
    mesh.castShadow = true;
    mesh.position.copy(this.camera.position).addScaledVector(_dir, 0.5);
    this.scene.add(mesh);
    const velocity = _dir.clone().multiplyScalar(14.5);
    velocity.y += 2.7;
    velocity.x += this.player.velocity.x * 0.4;
    velocity.z += this.player.velocity.z * 0.4;
    this.grenadeList.push({ mesh, velocity, fuse: 2.35, blink: Math.random() });
    this.audio.ui();
    this.hud.toast('FRAG OUT // M67', 1.1);
    this.hud.updateWeapon();
  }

  updateGrenades(dt) {
    for (let i = this.grenadeList.length - 1; i >= 0; i--) {
      const g = this.grenadeList[i];
      g.fuse -= dt;
      g.velocity.y -= 20 * dt;
      g.mesh.position.y += g.velocity.y * dt;
      const oldX = g.mesh.position.x;
      const oldZ = g.mesh.position.z;
      moveWithCollisions(
        g.mesh.position,
        g.velocity.x * dt,
        g.velocity.z * dt,
        0.12,
        Math.max(0, g.mesh.position.y - 0.05),
        0.18,
        this.world.colliders,
        this.world.bounds
      );
      if (Math.abs(g.mesh.position.x - oldX) < Math.abs(g.velocity.x * dt) * 0.4) g.velocity.x *= -0.36;
      if (Math.abs(g.mesh.position.z - oldZ) < Math.abs(g.velocity.z * dt) * 0.4) g.velocity.z *= -0.36;
      if (g.mesh.position.y < 0.13) {
        g.mesh.position.y = 0.13;
        if (g.velocity.y < -0.4) {
          g.velocity.y *= -0.38;
          g.velocity.x *= 0.7;
          g.velocity.z *= 0.7;
        } else {
          g.velocity.y = 0;
          g.velocity.x *= 0.86;
          g.velocity.z *= 0.86;
        }
      }
      g.mesh.rotation.x += g.velocity.z * dt * 4;
      g.mesh.rotation.z -= g.velocity.x * dt * 4;
      g.mesh.material.emissiveIntensity = Math.sin((2.35 - g.fuse) * 22) > 0.1 ? 1.4 : 0;
      if (g.fuse <= 0) {
        const pos = g.mesh.position.clone();
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.grenadeList.splice(i, 1);
        this.explodeGrenade(pos);
      }
    }
  }

  explodeGrenade(pos) {
    this.effects.explosion(pos);
    this.audio.explosion(0);
    this.trauma = Math.min(1, this.trauma + 0.95);
    this.hud.flash(0.22);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dist = e.position.distanceTo(pos);
      if (dist > 5.4) continue;
      const chest = new THREE.Vector3(e.position.x, 1.2 * e.scale, e.position.z);
      if (!lineOfSight(_tmp.copy(pos).setY(0.6), chest, this.world.colliders) && dist > 1.6) continue;
      const dmg = 20 + 190 * Math.max(0, 1 - dist / 5.2);
      e.takeDamage(dmg, false, chest, true);
    }
    const pd = this.player.pos.distanceTo(pos);
    if (pd < 4.8 && this.player.alive) {
      this.playerHit(8 + 34 * (1 - pd / 4.8), pos);
    }
  }

  spawnPickup(pos, type) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.45, pos.z);
    const color = type === 'health' ? 0x2f5d44 : 0x5b512d;
    const accent = type === 'health' ? 0x8fe89a : 0xffbf61;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.26, 0.32),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35, emissive: color, emissiveIntensity: 0.18 })
    );
    box.castShadow = true;
    group.add(box);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.035, 0.33), new THREE.MeshBasicMaterial({ color: accent }));
    strip.position.y = 0.03;
    group.add(strip);
    if (type === 'health') {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xf2f1dd }));
      c1.position.set(0, 0.03, 0.17);
      group.add(c1);
      const c2 = c1.clone();
      c2.rotation.z = Math.PI / 2;
      group.add(c2);
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.012, 4, 28),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.28;
    group.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.world.textures.glowTex,
      color: accent,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.scale.set(1.25, 1.25, 1);
    group.add(glow);
    this.scene.add(group);
    this.pickups.push({ group, type, ring, life: 46, phase: Math.random() * 10, baseY: 0.45 });
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.life -= dt;
      item.phase += dt;
      item.group.position.y = item.baseY + Math.sin(item.phase * 2.3) * 0.08;
      item.group.rotation.y += dt * (item.type === 'health' ? 1.1 : 1.7);
      item.ring.rotation.z += dt * 1.5;
      item.ring.material.opacity = 0.35 + Math.sin(item.phase * 3) * 0.14;
      const dist = Math.hypot(item.group.position.x - this.player.pos.x, item.group.position.z - this.player.pos.z);
      if (dist < 1.55 && this.player.alive) {
        this.collectPickup(item);
        this.scene.remove(item.group);
        disposeObject(item.group);
        this.pickups.splice(i, 1);
        continue;
      }
      if (item.life <= 0) {
        this.scene.remove(item.group);
        disposeObject(item.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  collectPickup(item) {
    if (item.type === 'health') {
      this.player.health = Math.min(100, this.player.health + 34);
      this.player.armor = Math.min(75, this.player.armor + 12);
      this.hud.toast('FIELD STIM // +34 HEALTH', 1.4);
    } else if (item.type === 'ammo') {
      this.weaponState.forEach((s, i) => {
        const def = this.weaponDefs[i];
        s.reserve = Math.min(def.maxReserve, s.reserve + Math.ceil(def.mag * 1.5));
      });
      this.hud.toast('AMMO CACHE // RESUPPLIED', 1.4);
    } else if (item.type === 'frag') {
      this.grenades = Math.min(4, this.grenades + 1);
      this.hud.toast('FRAG // +1', 1.2);
    }
    this.audio.pickup(item.type === 'health' ? 'health' : 'ammo');
    this.hud.updateWeapon();
  }

  // ---- waves / enemies ----
  aliveEnemies() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) enemy.update(dt, this.time);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].removed) this.enemies.splice(i, 1);
    }
    let heavy = null;
    for (const e of this.enemies) {
      if (e.type === 'heavy' && !e.dead) { heavy = e; break; }
    }
    if (heavy) {
      this.hud.showBoss(true);
      this.hud.updateBoss(heavy.hp / heavy.maxHp);
    } else {
      this.hud.showBoss(false);
    }
  }

  updateWaves(dt) {
    if (this.pendingVictory > 0) {
      this.pendingVictory -= dt;
      if (this.pendingVictory <= 0) {
        this.pendingVictory = 0;
        this.showEnd(true);
      }
      return;
    }
    if (this.waveActive) {
      if (this.spawnTimer > 0) this.spawnTimer -= dt;
      const alive = this.aliveEnemies();
      const wave = WAVES[this.waveIndex];
      if (this.wavePending > 0 && alive < wave.maxAlive && this.spawnTimer <= 0) {
        this.spawnEnemy();
      }
      if (this.wavePending === 0 && alive === 0) this.completeWave();
    } else if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.beginWave(this.nextWaveIndex);
    }
  }

  beginWave(index) {
    if (this.state !== 'playing') return;
    if (index >= WAVES.length) {
      this.showEnd(true);
      return;
    }
    const wave = WAVES[index];
    this.waveIndex = index;
    this.waveActive = true;
    this.wavePending = wave.count + wave.heavy;
    this.waveTotal = this.wavePending;
    this.waveSpawned = 0;
    this.waveKilled = 0;
    this.spawnTimer = 0.6;
    this.intermission = 0;
    this.hud.showBoss(false);
    this.hud.announce(`INCOMING // ${wave.label}`, `WAVE ${pad(index + 1, 2)}`, `${this.wavePending} HOSTILE SIGNATURES DETECTED`, 2.7);
    this.audio.waveAlarm();
    const lines = [
      'Contact at the perimeter. Keep your head down, Raven.',
      'Multiple hostiles moving through the yard. They know you are here.',
      'That is a lot of heat. Watch the flanks.',
      'They are pushing hard. Do not let them close.',
      'Warden signature confirmed. Heavy armor. Aim for the head.',
    ];
    setTimeout(() => {
      if (this.state === 'playing') this.hud.radio(lines[index] || lines[lines.length - 1], 4);
    }, 1400);
  }

  spawnEnemy() {
    const wave = WAVES[this.waveIndex];
    const heavy = wave.heavy > 0 && this.wavePending === 1;
    const type = heavy ? 'heavy' : 'grunt';
    const pos = this.pickSpawnPoint();
    const enemy = new Enemy(this, pos, type);
    this.enemies.push(enemy);
    this.effects.smokePuff(new THREE.Vector3(pos.x, 0.7, pos.z), 0x6d6a5f, 10, 1.5, 6);
    this.waveSpawned++;
    this.wavePending--;
    this.spawnTimer = heavy ? 1.2 : 0.8 + Math.random() * 1.25;
    if (heavy) {
      this.hud.showBoss(true);
      this.hud.announce('HEAVY CONTACT', 'WARDEN', 'ELITE GUARD // ARMORED', 3.2);
      this.hud.radio('Warden on the ground. Hit him hard and do not stop moving.', 4.2);
      this.audio.waveAlarm();
    }
  }

  pickSpawnPoint() {
    const p = this.player.pos;
    const points = this.world.spawnPoints;
    let best = null;
    let bestScore = -Infinity;
    for (const point of points) {
      const dist = Math.hypot(point.x - p.x, point.z - p.z);
      if (dist < 14) continue;
      if (isBlockedCircle(point.x, point.z, 0.5, 0, 1.9, this.world.colliders)) continue;
      let occupied = false;
      for (const e of this.enemies) {
        if (!e.dead && Math.hypot(e.position.x - point.x, e.position.z - point.z) < 1.6) {
          occupied = true;
          break;
        }
      }
      if (occupied) continue;
      const eye = _tmp.set(point.x, 1.7, point.z);
      const target = _tmp2.set(p.x, p.y + this.player.eyeHeight, p.z);
      const seen = lineOfSight(eye, target, this.world.colliders);
      const score = dist + (seen ? -16 : 0) + Math.random() * 9;
      if (score > bestScore) {
        bestScore = score;
        best = point;
      }
    }
    return best || points[Math.floor(Math.random() * points.length)];
  }

  completeWave() {
    this.waveActive = false;
    this.audio.waveClear();
    this.hud.showBoss(false);
    this.weaponState.forEach((s, i) => {
      const def = this.weaponDefs[i];
      s.reserve = Math.min(def.maxReserve, s.reserve + Math.ceil(def.mag * 1.2));
    });
    this.player.health = Math.min(100, this.player.health + 24);
    this.player.armor = Math.min(75, this.player.armor + 18);
    this.grenades = Math.min(4, this.grenades + 1);
    this.hud.updateWeapon();

    if (this.waveIndex >= WAVES.length - 1) {
      this.hud.announce('OBJECTIVE COMPLETE', 'SECTOR <em>SECURED</em>', 'RELAY HELD // EXTRACTION INBOUND', 4.2);
      this.hud.radio('Warden is down. Relay is holding. Extraction is inbound, Raven. Good work.', 5);
      this.pendingVictory = 4.2;
      this.audio.missionComplete();
    } else {
      this.intermission = 8.5;
      this.nextWaveIndex = this.waveIndex + 1;
      this.hud.announce('WAVE CLEARED', 'REGROUP', 'REARMING // NEXT ASSAULT INBOUND', 2.8);
      this.hud.radio('Sector quiet. Re-arm, patch up, and stay sharp. Next wave is already moving.', 4.4);
    }
  }

  playerHit(damage, sourcePos) {
    const p = this.player;
    if (!p.alive || this.state !== 'playing') return;
    const absorbed = Math.min(p.armor, damage * 0.62);
    p.armor -= absorbed;
    p.health -= damage - absorbed;
    p.lastDamageTime = this.elapsed;
    this.trauma = Math.min(1, this.trauma + 0.36 + damage * 0.008);
    this.hud.flash(Math.min(0.62, damage * 0.035));
    this.audio.playerHit();
    if (sourcePos) {
      const sourceAngle = Math.atan2(sourcePos.x - p.pos.x, -(sourcePos.z - p.pos.z));
      const heading = -this.yaw;
      this.hud.damageDirection(sourceAngle - heading);
    }
    if (p.health <= 0) {
      p.health = 0;
      this.die();
    }
  }

  onEnemyKilled(enemy, headshot) {
    this.kills++;
    if (headshot) this.headshots++;
    this.waveKilled++;
    if (this.streakTimer > 0) this.streak++;
    else this.streak = 1;
    this.streakTimer = 5;
    this.multiplier = clamp(1 + Math.floor(this.streak / 3), 1, 5);
    this.score += (headshot ? 150 : 100) * this.multiplier;
    this.hud.killfeed(headshot);
    if (enemy.type === 'heavy') {
      this.hud.showBoss(false);
      this.hud.toast('WARDEN ELIMINATED // +1000', 2.4);
      this.score += 1000;
    }
    const r = Math.random();
    if (enemy.type === 'heavy') {
      this.spawnPickup(enemy.position, 'ammo');
      this.spawnPickup(enemy.position, 'health');
    } else if (r < 0.18) {
      this.spawnPickup(enemy.position, 'health');
    } else if (r < 0.5) {
      this.spawnPickup(enemy.position, 'ammo');
    } else if (r < 0.55) {
      this.spawnPickup(enemy.position, 'frag');
    }
  }

  die() {
    if (this.state !== 'playing') return;
    this.player.alive = false;
    this.state = 'ending';
    this.deathTime = 0;
    this.triggerDown = false;
    this.aimHeld = false;
    this.touchAiming = false;
    this.exitLock();
    this.audio.gameOver();
    this.hud.flash(0.75);
    this.endTimer = setTimeout(() => {
      if (this.state === 'ending') this.showEnd(false);
    }, 2100);
  }
}

function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

const game = new Game();
window.__BLACKSITE__ = game;

export default Game;
