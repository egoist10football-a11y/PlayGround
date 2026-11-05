const $ = (id) => document.getElementById(id);

const CARDINALS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
const DIR_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export class Hud {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: $('hud'),
      touch: $('touch-ui'),
      crosshair: $('crosshair'),
      hitmarker: $('hitmarker'),
      healthValue: $('health-value'),
      armorValue: $('armor-value'),
      healthBar: $('health-bar'),
      armorBar: $('armor-bar'),
      vitals: document.querySelector('.vitals'),
      damageState: $('damage-state'),
      weaponName: $('weapon-name'),
      fireMode: $('fire-mode'),
      ammoMag: $('ammo-mag'),
      ammoReserve: $('ammo-reserve'),
      ammoBar: $('ammo-bar'),
      reloadState: $('reload-state'),
      fragCount: $('frag-count'),
      score: $('score-value'),
      kills: $('kill-value'),
      streak: $('streak-value'),
      waveLabel: $('wave-label'),
      hostileCount: $('hostile-count'),
      waveBar: $('wave-bar-fill'),
      objectiveSub: $('objective-sub'),
      missionTime: $('mission-time'),
      compass: $('compass'),
      compassDegree: $('compass-degree'),
      radar: $('radar'),
      radarRange: $('radar-range'),
      killfeed: $('killfeed'),
      radio: $('radio'),
      radioText: $('radio-text'),
      toast: $('toast'),
      announce: $('announce'),
      announceKicker: $('announce-kicker'),
      announceMain: $('announce-main'),
      announceSub: $('announce-sub'),
      bossBar: $('boss-bar'),
      bossFill: $('boss-fill'),
      damageFlash: $('damage-flash'),
      lowHealth: $('low-health'),
    };
    this.compassCtx = this.el.compass.getContext('2d');
    this.radarCtx = this.el.radar.getContext('2d');
    this.announceTimer = 0;
    this.radioTimer = 0;
    this.toastTimer = 0;
    this.hitTimer = 0;
    this.damageOpacity = 0;
    this.tick = 0;
    this.radarTick = 0;
    this.compassTick = 0;
    this.cache = {};
  }

  setVisible(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
    this.el.hud.setAttribute('aria-hidden', String(!visible));
    if (this.game.isTouch) this.el.touch.classList.toggle('hidden', !visible);
    if (visible) {
      this.reset();
    }
  }

  reset() {
    this.el.killfeed.innerHTML = '';
    this.el.announce.classList.remove('show');
    this.el.radio.classList.add('hidden');
    this.el.toast.classList.remove('show');
    this.el.bossBar.classList.add('hidden');
    this.el.hitmarker.classList.remove('show', 'headshot');
    this.el.damageFlash.style.opacity = '0';
    this.el.lowHealth.style.opacity = '0';
    this.el.healthValue.textContent = '100';
    this.el.armorValue.textContent = '75';
    this.el.healthBar.style.width = '100%';
    this.el.armorBar.style.width = '100%';
    this.el.score.textContent = '000000';
    this.el.kills.textContent = '00';
    this.el.streak.textContent = 'x1';
    this.el.waveLabel.textContent = 'WAVE 01 // 05';
    this.el.hostileCount.textContent = 'HOSTILES 0';
    this.el.waveBar.style.width = '0%';
    this.el.objectiveSub.textContent = 'REPEL ALL ASSAULT WAVES';
    this.el.missionTime.textContent = '00:00';
    this.el.reloadState.textContent = 'READY';
    this.el.fragCount.textContent = '2';
    this.el.crosshair.classList.remove('ads', 'reloading');
    this.el.bossFill.style.width = '100%';
    this.announceTimer = this.radioTimer = this.toastTimer = this.hitTimer = 0;
    this.damageOpacity = 0;
    this.updateWeapon();
  }

  announce(kicker, main, sub, duration = 2.6) {
    const e = this.el;
    e.announceKicker.textContent = kicker;
    e.announceMain.innerHTML = main;
    e.announceSub.textContent = sub;
    e.announce.classList.remove('show');
    void e.announce.offsetWidth;
    e.announce.classList.add('show');
    this.announceTimer = duration;
  }

  radio(text, duration = 4.2) {
    this.el.radioText.textContent = text;
    this.el.radio.classList.remove('hidden');
    this.el.radio.style.animation = 'none';
    void this.el.radio.offsetWidth;
    this.el.radio.style.animation = '';
    this.radioTimer = duration;
    this.game.audio.radio();
  }

  toast(text, duration = 1.5) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastTimer = duration;
  }

  killfeed(headshot = false) {
    const item = document.createElement('div');
    item.className = 'killfeed-item';
    item.innerHTML = `YOU <b>▸</b> HOSTILE${headshot ? ' <span class="hs">HEADSHOT</span>' : ''}`;
    this.el.killfeed.appendChild(item);
    while (this.el.killfeed.children.length > 4) this.el.killfeed.removeChild(this.el.killfeed.firstChild);
    setTimeout(() => {
      item.style.transition = 'opacity .3s ease';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 320);
    }, 4600);
  }

  hitmarker(headshot = false) {
    this.el.hitmarker.classList.toggle('headshot', headshot);
    this.el.hitmarker.classList.add('show');
    this.hitTimer = headshot ? 0.15 : 0.1;
  }

  damageDirection(angle) {
    const el = document.createElement('div');
    el.className = 'dmg-arc';
    el.style.transform = `rotate(${angle}rad)`;
    this.el.hud.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  flash(intensity = 0.5) {
    this.damageOpacity = Math.min(0.85, this.damageOpacity + intensity);
  }

  showBoss(show) {
    this.el.bossBar.classList.toggle('hidden', !show);
  }

  updateBoss(ratio) {
    this.el.bossFill.style.width = `${Math.max(0, ratio) * 100}%`;
  }

  updateWeapon() {
    const g = this.game;
    if (!g.weaponState || !g.weaponState[g.weaponIndex]) return;
    const def = g.weaponDefs[g.weaponIndex];
    const state = g.weaponState[g.weaponIndex];
    this.el.weaponName.textContent = def.name;
    this.el.fireMode.textContent = def.mode;
    this.el.ammoMag.textContent = String(state.mag).padStart(2, '0');
    this.el.ammoReserve.textContent = String(state.reserve).padStart(3, '0');
    this.el.ammoBar.style.width = `${(state.mag / def.mag) * 100}%`;
    this.el.fragCount.textContent = String(g.grenades);
    if (g.reloading) {
      this.el.reloadState.textContent = 'RELOADING';
      this.el.crosshair.classList.add('reloading');
    } else if (g.switchTimer > 0) {
      this.el.reloadState.textContent = 'SWITCHING';
      this.el.crosshair.classList.remove('reloading');
    } else if (state.mag === 0) {
      this.el.reloadState.textContent = state.reserve > 0 ? 'PRESS R' : 'NO AMMO';
      this.el.crosshair.classList.remove('reloading');
    } else {
      this.el.reloadState.textContent = 'READY';
      this.el.crosshair.classList.remove('reloading');
    }
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    this.tick += dt;
    this.compassTick += dt;
    this.radarTick += dt;

    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      if (this.announceTimer <= 0) this.el.announce.classList.remove('show');
    }
    if (this.radioTimer > 0) {
      this.radioTimer -= dt;
      if (this.radioTimer <= 0) this.el.radio.classList.add('hidden');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) this.el.hitmarker.classList.remove('show', 'headshot');
    }

    this.damageOpacity = Math.max(0, this.damageOpacity - dt * 1.8);
    this.el.damageFlash.style.opacity = this.damageOpacity.toFixed(3);
    const low = p.alive && p.health < 35;
    this.el.lowHealth.style.opacity = low ? String(0.4 + (1 - p.health / 35) * 0.4) : '0';

    if (this.tick > 0.05) {
      this.tick = 0;
      this.el.healthValue.textContent = String(Math.ceil(p.health));
      this.el.armorValue.textContent = String(Math.ceil(p.armor));
      this.el.healthBar.style.width = `${clamp(p.health, 0, 100)}%`;
      this.el.armorBar.style.width = `${clamp(p.armor / 75 * 100, 0, 100)}%`;
      this.el.vitals.classList.toggle('low', p.health < 35);
      if (!p.alive) this.el.damageState.textContent = 'SIGNAL LOST';
      else if (p.health < 35) this.el.damageState.textContent = 'CRITICAL';
      else if (g.elapsed - p.lastDamageTime > 4.4 && p.health < 100) this.el.damageState.textContent = 'REGENERATING';
      else if (p.armor <= 0) this.el.damageState.textContent = 'ARMOR BROKEN';
      else this.el.damageState.textContent = 'COMBAT READY';

      this.el.score.textContent = String(g.score).padStart(6, '0');
      this.el.kills.textContent = String(g.kills).padStart(2, '0');
      this.el.streak.textContent = `x${g.multiplier}`;
      this.el.fragCount.textContent = String(g.grenades);
      this.el.waveLabel.textContent = `WAVE ${String(Math.min(5, Math.max(1, g.waveIndex + 1))).padStart(2, '0')} // 05`;
      const alive = g.aliveEnemies();
      const hostiles = g.waveActive ? g.wavePending + alive : 0;
      this.el.hostileCount.textContent = hostiles > 0 ? `HOSTILES ${String(hostiles).padStart(2, '0')}` : (g.waveActive ? 'SECTOR CLEAR' : 'REGROUP');
      const ratio = g.waveActive ? (g.waveTotal > 0 ? g.waveKilled / g.waveTotal : 0) : (g.waveIndex >= 0 ? 1 : 0);
      this.el.waveBar.style.width = `${clamp(ratio * 100, 0, 100)}%`;
      if (g.waveActive) {
        this.el.objectiveSub.textContent = hostiles > 0 ? `HOSTILES ACTIVE // ${String(hostiles).padStart(2, '0')}` : 'SECTOR CLEAR';
      } else if (g.intermission > 0) {
        this.el.objectiveSub.textContent = `REGROUP // NEXT WAVE IN ${String(Math.ceil(g.intermission)).padStart(2, '0')}`;
      } else {
        this.el.objectiveSub.textContent = 'REPEL ALL ASSAULT WAVES';
      }
      const secs = Math.floor(g.elapsed);
      this.el.missionTime.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

      // Crosshair spread.
      const speed = p.speed;
      let gap = 10 + (g.aiming ? 1 : speed * 0.65) + g.crosshairKick * 16;
      if (p.crouching) gap -= 2;
      gap = clamp(gap, 5, 30);
      this.el.crosshair.style.setProperty('--ch-gap', `${gap}px`);
      this.el.crosshair.classList.toggle('ads', g.adsT > 0.65);
    }

    if (this.compassTick > 0.04) {
      this.compassTick = 0;
      this.drawCompass();
    }
    if (this.radarTick > 0.11) {
      this.radarTick = 0;
      this.drawRadar();
    }
  }

  drawCompass() {
    const ctx = this.compassCtx;
    const w = this.el.compass.width;
    const h = this.el.compass.height;
    ctx.clearRect(0, 0, w, h);
    const heading = (((-this.game.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const span = 120;
    const pxPerDeg = w / span;
    const left = Math.floor((heading - span / 2) / 5) * 5;
    const right = heading + span / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let d = left; d <= right; d += 5) {
      const x = (d - heading) * pxPerDeg + w / 2;
      if (x < 2 || x > w - 2) continue;
      const norm = ((d % 360) + 360) % 360;
      const fade = 1 - Math.abs(x - w / 2) / (w / 2);
      const alpha = 0.18 + fade * 0.62;
      const isMajor = norm % 45 === 0;
      const isMid = norm % 15 === 0;
      const tickH = isMajor ? 10 : isMid ? 6 : 3;
      ctx.strokeStyle = `rgba(235,238,228,${alpha})`;
      ctx.lineWidth = norm === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, h - 7 - tickH);
      ctx.lineTo(x, h - 7);
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = norm === 0 ? `rgba(255,139,56,${0.5 + fade * 0.5})` : `rgba(235,238,228,${alpha})`;
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(CARDINALS[norm], x, 4);
      } else if (isMid) {
        ctx.fillStyle = `rgba(160,178,170,${alpha * 0.6})`;
        ctx.font = '400 7px "JetBrains Mono", monospace';
        ctx.fillText(String(norm).padStart(3, '0'), x, 8);
      }
    }
    ctx.strokeStyle = 'rgba(255,139,56,.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, h - 7);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    const index = Math.round(heading / 45) % 8;
    this.el.compassDegree.textContent = `${DIR_NAMES[index]} ${String(Math.round(heading) % 360).padStart(3, '0')}`;
  }

  drawRadar() {
    const ctx = this.radarCtx;
    const g = this.game;
    const p = g.player;
    const size = this.el.radar.width;
    const c = size / 2;
    const range = 28;
    const scale = (c - 8) / range;
    ctx.clearRect(0, 0, size, size);

    // Rings / cross hair.
    ctx.save();
    ctx.translate(c, c);
    ctx.strokeStyle = 'rgba(127,203,180,.14)';
    ctx.lineWidth = 1;
    for (const r of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, (c - 7) * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-c + 4, 0);
    ctx.lineTo(c - 4, 0);
    ctx.moveTo(0, -c + 4);
    ctx.lineTo(0, c - 4);
    ctx.strokeStyle = 'rgba(127,203,180,.08)';
    ctx.stroke();

    // View cone (north-up = look angle).
    ctx.rotate(-g.yaw);
    const cone = ctx.createLinearGradient(0, 0, 0, -c);
    cone.addColorStop(0, 'rgba(126,226,198,.16)');
    cone.addColorStop(1, 'rgba(126,226,198,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, c - 8, -Math.PI / 2 - 0.48, -Math.PI / 2 + 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(g.yaw);

    // Map geometry.
    for (const wall of g.world.mapWalls) {
      const dx = (wall.x - p.pos.x) * scale;
      const dz = (wall.z - p.pos.z) * scale;
      if (Math.hypot(dx, dz) > c + Math.max(wall.w, wall.d) * scale * 0.6) continue;
      let color = 'rgba(132,194,173,.18)';
      if (wall.kind === 'building' || wall.kind === 'tower') color = 'rgba(132,194,173,.3)';
      else if (wall.kind === 'container') color = 'rgba(132,194,173,.24)';
      else if (wall.kind === 'cover') color = 'rgba(132,194,173,.13)';
      ctx.fillStyle = color;
      ctx.fillRect(dx - (wall.w * scale) / 2, dz - (wall.d * scale) / 2, wall.w * scale, wall.d * scale);
    }

    // Enemies.
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = (e.position.x - p.pos.x) * scale;
      const dz = (e.position.z - p.pos.z) * scale;
      if (Math.hypot(dx, dz) > c - 6) continue;
      const heavy = e.type === 'heavy';
      ctx.fillStyle = heavy ? 'rgba(255,167,71,.95)' : 'rgba(255,74,58,.92)';
      ctx.beginPath();
      ctx.arc(dx, dz, heavy ? 4.4 : 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,60,40,.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dx, dz, heavy ? 7 : 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pickups.
    for (const item of g.pickups) {
      const dx = (item.group.position.x - p.pos.x) * scale;
      const dz = (item.group.position.z - p.pos.z) * scale;
      if (Math.hypot(dx, dz) > c - 6) continue;
      ctx.fillStyle = item.type === 'health' ? 'rgba(143,232,154,.9)' : 'rgba(255,190,97,.9)';
      ctx.fillRect(dx - 2, dz - 2, 4, 4);
    }

    // Player arrow.
    ctx.save();
    ctx.rotate(-g.yaw);
    ctx.fillStyle = 'rgba(240,243,233,.96)';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
