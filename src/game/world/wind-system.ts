import * as THREE from 'three';

/** Balance del viento: cambios predecibles y multiplicadores moderados. */
export const WIND_CHANGE_INTERVAL = 42;
export const WIND_TRANSITION_SECONDS = 5;
export const WIND_PARTICLE_SPEED = 0.7;

export interface WindPreset {
  name: string;
  arrow: string;
  direction: THREE.Vector3;
  intensity: number;
}

const WIND_PRESETS: readonly WindPreset[] = [
  { name: 'Norte', arrow: '↑', direction: new THREE.Vector3(0, 0, -1), intensity: 0.62 },
  { name: 'Noreste', arrow: '↗', direction: new THREE.Vector3(0.72, 0, -0.72), intensity: 0.7 },
  { name: 'Este', arrow: '→', direction: new THREE.Vector3(1, 0, 0), intensity: 0.56 },
  { name: 'Sur', arrow: '↓', direction: new THREE.Vector3(0, 0, 1), intensity: 0.66 },
];

export const WIND_BITACORA_ENTRY = {
  title: 'Viento',
  text: 'El viento puede acelerar y cambiar la dirección de un incendio. Por eso las condiciones ambientales son claves para evaluar riesgos.',
};

export interface WindState {
  direction: THREE.Vector3;
  intensity: number;
  name: string;
  arrow: string;
}

export interface WindUpdate {
  changed: boolean;
  state: WindState;
}

interface WindParticle {
  position: THREE.Vector3;
  offset: number;
}

/** Estado ambiental determinístico, partículas ligeras y cambios espaciados. */
export class WindSystem {
  readonly object = new THREE.Group();
  private readonly direction = WIND_PRESETS[0].direction.clone();
  private readonly targetDirection = WIND_PRESETS[0].direction.clone();
  private readonly particlePositions: Float32Array;
  private readonly particles: WindParticle[] = [];
  private elapsed = 0;
  private presetIndex = 0;
  private currentPreset = WIND_PRESETS[0];
  private targetPreset = WIND_PRESETS[0];
  private changes = 0;
  private observed = false;

  constructor() {
    const count = 12;
    this.particlePositions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const position = new THREE.Vector3(
        -22 + (index % 4) * 14,
        0.65 + (index % 3) * 0.32,
        -18 + Math.floor(index / 4) * 16,
      );
      this.particles.push({ position, offset: index * 0.91 });
      this.writeParticle(index, position);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.object.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xc5b08a, size: 0.055, transparent: true, opacity: 0.42, depthWrite: false,
    })));
  }

  get state(): WindState {
    return {
      direction: this.direction,
      intensity: this.currentPreset.intensity,
      name: this.currentPreset.name,
      arrow: this.currentPreset.arrow,
    };
  }

  get changeCount(): number { return this.changes; }
  get hasBeenObserved(): boolean { return this.observed; }
  get strengthLabel(): string { return this.currentPreset.intensity >= 0.6 ? 'Moderado' : 'Leve'; }

  update(delta: number): WindUpdate {
    this.elapsed += delta;
    let changed = false;
    if (this.elapsed >= WIND_CHANGE_INTERVAL) {
      this.elapsed -= WIND_CHANGE_INTERVAL;
      this.presetIndex = (this.presetIndex + 1) % WIND_PRESETS.length;
      this.targetPreset = WIND_PRESETS[this.presetIndex];
      this.targetDirection.copy(this.targetPreset.direction);
      this.currentPreset = this.targetPreset;
      this.changes += 1;
      changed = true;
    }
    this.direction.lerp(this.targetDirection, Math.min(1, delta / WIND_TRANSITION_SECONDS)).normalize();
    this.observed = true;
    this.updateParticles(delta);
    return { changed, state: this.state };
  }

  private updateParticles(delta: number): void {
    const speed = WIND_PARTICLE_SPEED * this.currentPreset.intensity;
    this.particles.forEach((particle, index) => {
      particle.position.x += this.direction.x * speed * delta;
      particle.position.z += this.direction.z * speed * delta;
      particle.position.y = 0.85 + Math.sin(this.elapsed * 1.3 + particle.offset) * 0.18;
      if (particle.position.x > 25) particle.position.x = -25;
      if (particle.position.x < -25) particle.position.x = 25;
      if (particle.position.z > 25) particle.position.z = -25;
      if (particle.position.z < -25) particle.position.z = 25;
      this.writeParticle(index, particle.position);
    });
    const points = this.object.children[0] as THREE.Points;
    points.geometry.attributes.position.needsUpdate = true;
  }

  private writeParticle(index: number, position: THREE.Vector3): void {
    this.particlePositions[index * 3] = position.x;
    this.particlePositions[index * 3 + 1] = position.y;
    this.particlePositions[index * 3 + 2] = position.z;
  }
}
