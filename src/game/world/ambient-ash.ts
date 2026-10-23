import * as THREE from 'three';
import type { WindState } from './wind-system';

/** Rendimiento/estética: partículas reutilizadas, sin instancias por cuadro. */
export const AMBIENT_ASH_PARTICLE_COUNT = 84;
export const AMBIENT_ASH_SPEED = 0.62;
export const AMBIENT_ASH_NEAR_FIRE_RATIO = 0.28;

interface AshParticle {
  x: number;
  y: number;
  z: number;
  phase: number;
}

export class AmbientAsh {
  readonly object: THREE.Points;
  private readonly positions = new Float32Array(AMBIENT_ASH_PARTICLE_COUNT * 3);
  private readonly particles: AshParticle[] = [];
  private elapsed = 0;

  constructor() {
    for (let index = 0; index < AMBIENT_ASH_PARTICLE_COUNT; index += 1) {
      const particle = {
        x: -24 + (index % 12) * 4.2,
        y: 1.8 + (index % 5) * 0.74,
        z: -22 + Math.floor(index / 12) * 6.2,
        phase: index * 0.71,
      };
      this.particles.push(particle);
      this.write(index, particle);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.object = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xa9a19a,
      size: 0.075,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }));
  }

  update(delta: number, wind: WindState, fires: readonly THREE.Vector3[]): void {
    this.elapsed += delta;
    const nearFireCount = fires.length > 0
      ? Math.floor(AMBIENT_ASH_PARTICLE_COUNT * AMBIENT_ASH_NEAR_FIRE_RATIO)
      : 0;
    this.particles.forEach((particle, index) => {
      if (index < nearFireCount) {
        const fire = fires[index % fires.length];
        const angle = index * 2.4 + this.elapsed * 0.18;
        particle.x = fire.x + Math.cos(angle) * (0.8 + (index % 4) * 0.3);
        particle.z = fire.z + Math.sin(angle) * (0.8 + (index % 4) * 0.3);
        particle.y = fire.y + 1.2 + (index % 5) * 0.35;
      }
      particle.x += wind.direction.x * AMBIENT_ASH_SPEED * wind.intensity * delta;
      particle.z += wind.direction.z * AMBIENT_ASH_SPEED * wind.intensity * delta;
      particle.y += Math.sin(this.elapsed * 1.4 + particle.phase) * delta * 0.1;
      if (particle.x > 25) particle.x = -25;
      if (particle.x < -25) particle.x = 25;
      if (particle.z > 25) particle.z = -25;
      if (particle.z < -25) particle.z = 25;
      this.write(index, particle);
    });
    this.object.geometry.attributes.position.needsUpdate = true;
  }

  private write(index: number, particle: AshParticle): void {
    this.positions[index * 3] = particle.x;
    this.positions[index * 3 + 1] = particle.y;
    this.positions[index * 3 + 2] = particle.z;
  }
}
