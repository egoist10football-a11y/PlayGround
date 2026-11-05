import * as THREE from '../vendor/three.module.js';

const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _ray = new THREE.Ray();

export function isBlockedCircle(x, z, radius, minY, maxY, colliders) {
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i].box;
    if (box.max.y <= minY || box.min.y >= maxY) continue;
    if (x > box.min.x - radius && x < box.max.x + radius && z > box.min.z - radius && z < box.max.z + radius) {
      return true;
    }
  }
  return false;
}

export function moveWithCollisions(pos, dx, dz, radius, feetY, height, colliders, bounds = 41.3) {
  const minY = feetY + 0.14;
  const maxY = feetY + height;
  // Resolve X first, then Z, for smooth wall sliding.
  pos.x += dx;
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i].box;
    if (box.max.y <= minY || box.min.y >= maxY) continue;
    if (pos.z > box.min.z - radius && pos.z < box.max.z + radius && pos.x > box.min.x - radius && pos.x < box.max.x + radius) {
      if (dx > 0) pos.x = box.min.x - radius;
      else if (dx < 0) pos.x = box.max.x + radius;
      else {
        const left = pos.x - (box.min.x - radius);
        const right = (box.max.x + radius) - pos.x;
        pos.x += left < right ? -left : right;
      }
    }
  }
  pos.z += dz;
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i].box;
    if (box.max.y <= minY || box.min.y >= maxY) continue;
    if (pos.x > box.min.x - radius && pos.x < box.max.x + radius && pos.z > box.min.z - radius && pos.z < box.max.z + radius) {
      if (dz > 0) pos.z = box.min.z - radius;
      else if (dz < 0) pos.z = box.max.z + radius;
      else {
        const back = pos.z - (box.min.z - radius);
        const front = (box.max.z + radius) - pos.z;
        pos.z += back < front ? -back : front;
      }
    }
  }
  pos.x = Math.max(-bounds, Math.min(bounds, pos.x));
  pos.z = Math.max(-bounds, Math.min(bounds, pos.z));
  return pos;
}

export function lineOfSight(from, to, colliders) {
  _dir.copy(to).sub(from);
  const dist = _dir.length();
  if (dist < 0.05) return true;
  _dir.multiplyScalar(1 / dist);
  _ray.origin.copy(from);
  _ray.direction.copy(_dir);
  for (let i = 0; i < colliders.length; i++) {
    if (_ray.intersectBox(colliders[i].box, _hit)) {
      const d = _hit.distanceTo(from);
      if (d > 0.12 && d < dist - 0.18) return false;
    }
  }
  return true;
}

export function rayBoxNearest(origin, dir, colliders, skipWithin = 0.15) {
  _ray.origin.copy(origin);
  _ray.direction.copy(dir);
  let best = Infinity;
  let box = null;
  for (let i = 0; i < colliders.length; i++) {
    if (_ray.intersectBox(colliders[i].box, _hit)) {
      const d = _hit.distanceTo(origin);
      if (d > skipWithin && d < best) {
        best = d;
        box = colliders[i];
      }
    }
  }
  return { distance: best, box };
}

export function raySphere(origin, dir, center, radius) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const h = b * b - c;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  if (t > 0) return t;
  const t2 = -b + Math.sqrt(h);
  return t2 > 0 ? 0 : Infinity;
}

export function groundDistance(origin, dir) {
  if (dir.y >= -0.0001) return Infinity;
  return Math.max(0, -origin.y / dir.y);
}
