import * as THREE from '../vendor/three.module.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 10);

export const WEAPONS = [
  {
    id: 'rifle',
    name: 'VK-4 HAVOC',
    caliber: '5.56 NATO',
    mode: 'AUTO',
    mag: 30,
    reserve: 210,
    maxReserve: 300,
    damage: 34,
    headMult: 2.5,
    rpm: 720,
    auto: true,
    reload: 2.15,
    hipSpread: 0.019,
    adsSpread: 0.0022,
    recoil: 0.0085,
    adsFov: 49,
    hipPos: new THREE.Vector3(0.27, -0.32, -0.86),
    adsPos: new THREE.Vector3(0, -0.158, -0.70),
    sound: 'rifle',
  },
  {
    id: 'pistol',
    name: 'P9 SIDEARM',
    caliber: '9MM',
    mode: 'SEMI',
    mag: 12,
    reserve: 84,
    maxReserve: 144,
    damage: 52,
    headMult: 2.1,
    rpm: 430,
    auto: false,
    reload: 1.55,
    hipSpread: 0.014,
    adsSpread: 0.002,
    recoil: 0.013,
    adsFov: 56,
    hipPos: new THREE.Vector3(0.25, -0.30, -0.72),
    adsPos: new THREE.Vector3(0, -0.148, -0.58),
    sound: 'pistol',
  },
];

function makeMaterials() {
  return {
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x303634, roughness: 0.46, metalness: 0.38, emissive: 0x090c0b, emissiveIntensity: 0.32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x121716, roughness: 0.58, metalness: 0.22, emissive: 0x030504, emissiveIntensity: 0.32 }),
    polymer: new THREE.MeshStandardMaterial({ color: 0x1f2623, roughness: 0.8, metalness: 0.04, emissive: 0x050706, emissiveIntensity: 0.32 }),
    tan: new THREE.MeshStandardMaterial({ color: 0x504431, roughness: 0.82, metalness: 0.06, emissive: 0x0d0b07, emissiveIntensity: 0.32 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141817, roughness: 0.94, metalness: 0.02 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x2b261f, roughness: 0.96, metalness: 0.02, emissive: 0x060504, emissiveIntensity: 0.32 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x29312c, roughness: 0.96, metalness: 0.04, emissive: 0x060807, emissiveIntensity: 0.32 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.65, metalness: 0.2 }),
    dot: new THREE.MeshBasicMaterial({ color: 0xff6b3a, toneMapped: false }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x17322e,
      emissive: 0x245c50,
      emissiveIntensity: 0.8,
      roughness: 0.18,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
    }),
  };
}

function addPart(parent, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(UNIT_BOX, mat);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, length, mat, x, y, z, rx = Math.PI / 2) {
  const mesh = new THREE.Mesh(UNIT_CYL, mat);
  mesh.scale.set(radius, length, radius);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function addGlowSprite(world, parent, scale, color = 0xffc36b) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: world.textures.glowTex,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  sprite.scale.setScalar(scale);
  sprite.visible = false;
  parent.add(sprite);
  return sprite;
}

function finishWeapon(group, world, muzzlePos, flashScale) {
  const muzzle = new THREE.Object3D();
  muzzle.position.copy(muzzlePos);
  group.add(muzzle);
  const flash = addGlowSprite(world, group, flashScale);
  flash.position.copy(muzzlePos);
  const light = new THREE.PointLight(0xffb15c, 0, 4.5, 2);
  light.position.copy(muzzlePos);
  group.add(light);
  group.userData.muzzle = muzzle;
  group.userData.flash = flash;
  group.userData.light = light;
}

function createRifle(world) {
  const m = makeMaterials();
  const g = new THREE.Group();
  g.name = 'VK-4 HAVOC';

  // Stock and cheek rest.
  addPart(g, 0.105, 0.13, 0.35, m.polymer, 0, -0.015, 0.235);
  addPart(g, 0.115, 0.17, 0.1, m.rubber, 0, -0.012, 0.415);
  addPart(g, 0.07, 0.055, 0.22, m.polymer, 0, 0.07, 0.24);
  addPart(g, 0.085, 0.045, 0.17, m.dark, 0, 0.062, 0.115);
  // Receiver.
  addPart(g, 0.135, 0.16, 0.48, m.gunmetal, 0, 0.005, -0.035);
  addPart(g, 0.145, 0.035, 0.36, m.dark, 0, 0.1, -0.055);
  addPart(g, 0.11, 0.09, 0.11, m.dark, 0.07, 0.02, -0.13);
  // Ejection port / charging handle.
  addPart(g, 0.018, 0.055, 0.14, m.dark, 0.073, 0.03, -0.04);
  addPart(g, 0.055, 0.035, 0.09, m.gunmetal, 0.075, 0.075, 0.01);
  addPart(g, 0.006, 0.009, 0.16, m.dot, 0.071, -0.045, -0.07);
  addPart(g, 0.052, 0.008, 0.012, m.dot, 0, 0.065, 0.09);
  // Handguard and barrel.
  addPart(g, 0.11, 0.11, 0.36, m.polymer, 0, 0.0, -0.45);
  addPart(g, 0.105, 0.032, 0.34, m.dark, 0, 0.07, -0.44);
  addPart(g, 0.095, 0.025, 0.2, m.tan, 0, -0.07, -0.46);
  addCylinder(g, 0.017, 0.38, m.gunmetal, 0, 0.005, -0.74);
  addCylinder(g, 0.034, 0.11, m.dark, 0, 0.005, -0.9);
  addCylinder(g, 0.022, 0.06, m.gunmetal, 0, 0.005, -0.965);
  // Magazine.
  addPart(g, 0.08, 0.2, 0.125, m.dark, 0, -0.17, -0.02, 0.16, 0, 0);
  addPart(g, 0.085, 0.03, 0.13, m.accent, 0, -0.265, 0.005, 0.16, 0, 0);
  // Pistol grip and trigger guard.
  addPart(g, 0.075, 0.18, 0.105, m.polymer, 0, -0.15, 0.155, -0.22, 0, 0);
  addPart(g, 0.085, 0.02, 0.16, m.dark, 0, -0.075, 0.09);
  addPart(g, 0.012, 0.075, 0.11, m.gunmetal, 0, -0.095, 0.085);
  // Optic.
  addPart(g, 0.075, 0.035, 0.135, m.dark, 0, 0.125, -0.06);
  addPart(g, 0.058, 0.06, 0.16, m.dark, 0, 0.152, -0.06);
  addPart(g, 0.066, 0.026, 0.02, m.dark, 0, 0.152, -0.142);
  addPart(g, 0.044, 0.038, 0.014, m.glass, 0, 0.152, -0.136);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), m.dot);
  dot.position.set(0, 0.152, -0.146);
  g.add(dot);
  // Sling / laser module.
  addPart(g, 0.055, 0.045, 0.12, m.dark, -0.078, 0.0, -0.44);
  addPart(g, 0.012, 0.012, 0.022, m.dot, -0.078, 0.0, -0.505);

  // Arms and gloves.
  addPart(g, 0.075, 0.075, 0.19, m.glove, -0.01, -0.18, -0.38, 0.45, 0.12, 0.05);
  addPart(g, 0.072, 0.08, 0.18, m.glove, 0.04, -0.21, 0.12, 0.12, -0.06, 0);
  const arm1 = addPart(g, 0.1, 0.1, 0.36, m.sleeve, -0.075, -0.38, -0.02, 0.8, 0.12, 0.3);
  arm1.position.z = -0.04;
  addPart(g, 0.085, 0.085, 0.3, m.sleeve, 0.09, -0.41, 0.36, 0.76, -0.12, -0.25);

  finishWeapon(g, world, new THREE.Vector3(0, 0.005, -0.985), 0.3);
  return g;
}

function createPistol(world) {
  const m = makeMaterials();
  const g = new THREE.Group();
  g.name = 'P9 SIDEARM';
  // Slide.
  addPart(g, 0.105, 0.1, 0.36, m.gunmetal, 0, 0.015, -0.12);
  addPart(g, 0.108, 0.025, 0.37, m.dark, 0, 0.07, -0.12);
  addPart(g, 0.03, 0.025, 0.06, m.dark, 0.065, 0.04, -0.02);
  addPart(g, 0.05, 0.035, 0.055, m.dark, 0, 0.075, 0.03);
  // Frame / trigger guard.
  addPart(g, 0.095, 0.075, 0.26, m.polymer, 0, -0.06, -0.1);
  addPart(g, 0.075, 0.16, 0.13, m.polymer, 0, -0.16, 0.04, -0.2, 0, 0);
  addPart(g, 0.075, 0.015, 0.12, m.dark, 0, -0.095, -0.1);
  addPart(g, 0.011, 0.055, 0.07, m.gunmetal, 0, -0.07, -0.09);
  // Barrel + front sight.
  addCylinder(g, 0.025, 0.085, m.dark, 0, 0.01, -0.345);
  addPart(g, 0.008, 0.03, 0.015, m.dark, 0, 0.082, -0.285);
  addPart(g, 0.035, 0.02, 0.02, m.dot, 0, 0.096, -0.13);
  // Hands.
  addPart(g, 0.09, 0.11, 0.18, m.glove, 0, -0.19, 0.0, 0.1, 0, 0);
  addPart(g, 0.08, 0.08, 0.16, m.glove, -0.07, -0.16, -0.02, 0.2, 0.2, 0.2);
  addPart(g, 0.095, 0.095, 0.3, m.sleeve, 0.03, -0.46, 0.4, 0.8, -0.05, -0.22);
  finishWeapon(g, world, new THREE.Vector3(0, 0.01, -0.4), 0.24);
  return g;
}

export function createWeaponModels(world) {
  return [createRifle(world), createPistol(world)];
}
