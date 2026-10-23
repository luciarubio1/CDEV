import * as THREE from 'three';

export const VEGETATION_FIRE_RADIUS = 4.5;
export const VEGETATION_IGNITION_SECONDS = 0.55;
export const VEGETATION_COLORS = {
  burned: new THREE.Color(0x272520),
  ember: new THREE.Color(0x8a3f1d),
};

type VegetationVisualState = 'dry' | 'burning' | 'burned';

interface VegetationEntry {
  position: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
  surfaceArea: number;
  exposure: number;
  state: VegetationVisualState;
}

function collectMaterials(object: THREE.Object3D): {
  materials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
} {
  const materials: THREE.MeshStandardMaterial[] = [];
  const baseColors: THREE.Color[] = [];
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = sourceMaterials.map((material) => {
      const clone = material.clone();
      if (clone instanceof THREE.MeshStandardMaterial) {
        materials.push(clone);
        baseColors.push(clone.color.clone());
      }
      return clone;
    });
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
  });
  return { materials, baseColors };
}

/** Estado visual persistente de árboles, arbustos y pasto expuestos al fuego. */
export class VegetationStateSystem {
  private readonly entries: VegetationEntry[] = [];

  register(object: THREE.Object3D, position: THREE.Vector3, surfaceArea: number): void {
    const { materials, baseColors } = collectMaterials(object);
    this.entries.push({
      position: position.clone(),
      materials,
      baseColors,
      surfaceArea,
      exposure: 0,
      state: 'dry',
    });
  }

  update(delta: number, firePositions: readonly THREE.Vector3[]): void {
    this.entries.forEach((entry) => {
      if (entry.state === 'burned') {
        return;
      }

      const distance = firePositions.reduce(
        (nearest, firePosition) => Math.min(
          nearest,
          Math.hypot(entry.position.x - firePosition.x, entry.position.z - firePosition.z),
        ),
        Number.POSITIVE_INFINITY,
      );
      const exposed = distance <= VEGETATION_FIRE_RADIUS;
      if (exposed) {
        entry.exposure += delta * (1 - distance / VEGETATION_FIRE_RADIUS + 0.2);
        entry.state = entry.exposure >= VEGETATION_IGNITION_SECONDS ? 'burning' : 'dry';
      } else if (entry.state === 'burning') {
        entry.state = 'burned';
      }

      this.applyVisualState(entry);
    });
  }

  get burnedCount(): number {
    return this.entries.filter((entry) => entry.state === 'burned').length;
  }

  get affectedCount(): number {
    return this.entries.filter((entry) => entry.state !== 'dry').length;
  }

  get affectedSurfaceArea(): number {
    return this.entries
      .filter((entry) => entry.state !== 'dry')
      .reduce((total, entry) => total + entry.surfaceArea, 0);
  }

  get count(): number {
    return this.entries.length;
  }

  private applyVisualState(entry: VegetationEntry): void {
    const damage = entry.state === 'burned'
      ? 1
      : Math.min(0.82, entry.exposure / VEGETATION_IGNITION_SECONDS * 0.75);
    entry.materials.forEach((material, index) => {
      material.color.copy(entry.baseColors[index]).lerp(VEGETATION_COLORS.burned, damage);
      material.roughness = 0.8 + damage * 0.18;
      material.emissive.copy(VEGETATION_COLORS.ember).multiplyScalar(
        entry.state === 'burning' ? 0.14 : 0,
      );
      material.emissiveIntensity = entry.state === 'burning' ? 0.7 : 0;
    });
  }
}
