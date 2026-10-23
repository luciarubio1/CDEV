import * as THREE from 'three';
import type { FireSource } from '../fire/fire-source';

export const BURNED_GROUND_BASE_RADIUS = 1.35;
export const BURNED_GROUND_MAX_MARKS = 12;
export const RESIDUAL_SMOKE_DURATION = 8;
export const RESIDUAL_SMOKE_MAX_SOURCES = 8;
export const BURNED_GROUND_COLOR = 0x302d29;

const BURNED_PATCH_MATERIAL = new THREE.MeshBasicMaterial({
  color: BURNED_GROUND_COLOR,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
});

interface BurnMark {
  patch: THREE.Mesh;
  smoke: THREE.Points | null;
  elapsed: number;
}

function createPatch(
  position: THREE.Vector3,
  radius: number,
  getTerrainHeight: (x: number, z: number) => number,
): THREE.Mesh {
  const segments = 18;
  const vertices = [position.x, getTerrainHeight(position.x, position.z) + 0.052, position.z];
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const irregularity = 0.82 + Math.sin(index * 2.71 + position.x) * 0.14;
    const x = position.x + Math.cos(angle) * radius * irregularity;
    const z = position.z + Math.sin(angle) * radius * irregularity;
    vertices.push(x, getTerrainHeight(x, z) + 0.052, z);
  }
  const indices: number[] = [];
  for (let index = 1; index <= segments; index += 1) {
    indices.push(0, index, index + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return new THREE.Mesh(
    geometry,
    BURNED_PATCH_MATERIAL,
  );
}

function createResidualSmoke(position: THREE.Vector3): THREE.Points {
  const particlePositions = new Float32Array([
    -0.25, 0.35, 0.1,
    0.16, 0.72, -0.16,
    0.04, 1.1, 0.22,
    -0.12, 1.45, -0.08,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const smoke = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x77736b, size: 0.42, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  smoke.position.copy(position);
  return smoke;
}

/** Marcas permanentes y humo temporal generados cuando los focos se apagan. */
export class BurnedGroundSystem {
  readonly object = new THREE.Group();
  private readonly marks: BurnMark[] = [];
  private totalAffectedArea = 0;

  constructor(private readonly getTerrainHeight: (x: number, z: number) => number) {}

  addExtinguishedFire(source: FireSource): void {
    const radius = BURNED_GROUND_BASE_RADIUS + source.startingIntensity * 0.8 + Math.min(0.7, source.activeDuration * 0.08);
    const position = source.object.position.clone();
    position.y = this.getTerrainHeight(position.x, position.z);
    const patch = createPatch(position, radius, this.getTerrainHeight);
    const smoke = this.marks.filter((mark) => mark.smoke).length < RESIDUAL_SMOKE_MAX_SOURCES
      ? createResidualSmoke(position)
      : null;
    this.object.add(patch);
    if (smoke) {
      this.object.add(smoke);
    }
    this.marks.push({ patch, smoke, elapsed: 0 });
    this.totalAffectedArea += Math.PI * radius * radius;
    while (this.marks.length > BURNED_GROUND_MAX_MARKS) {
      const oldest = this.marks.shift();
      if (oldest) {
        this.object.remove(oldest.patch);
        oldest.patch.geometry.dispose();
        if (oldest.smoke) {
          this.object.remove(oldest.smoke);
          oldest.smoke.geometry.dispose();
        }
      }
    }
  }

  update(delta: number): void {
    this.marks.forEach((mark) => {
      if (!mark.smoke) {
        return;
      }
      mark.elapsed += delta;
      mark.smoke.position.y += delta * 0.06;
      const material = mark.smoke.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 0.42 * (1 - mark.elapsed / RESIDUAL_SMOKE_DURATION));
      if (mark.elapsed >= RESIDUAL_SMOKE_DURATION) {
        this.object.remove(mark.smoke);
        mark.smoke.geometry.dispose();
        mark.smoke = null;
      }
    });
  }

  get affectedSurfaceArea(): number {
    return this.totalAffectedArea;
  }

  get visibleMarks(): number {
    return this.marks.length;
  }
}
