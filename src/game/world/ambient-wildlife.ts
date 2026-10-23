import * as THREE from 'three';
import type { WindState } from './wind-system';

export const AMBIENT_BIRD_COUNT = 6;
export const AMBIENT_BIRD_SPEED = 1.25;
export const AMBIENT_BIRD_FLEE_RADIUS = 13;

interface Bird {
  object: THREE.Group;
  heading: THREE.Vector3;
  phase: number;
}

function createBird(): THREE.Group {
  const bird = new THREE.Group();
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.28, 0, 0), new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.28, 0, 0),
  ]);
  bird.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x302e2b })));
  return bird;
}

/** Siluetas de aves que abandonan zonas de focos activos. */
export class AmbientWildlife {
  readonly object = new THREE.Group();
  private readonly birds: Bird[] = [];
  private elapsed = 0;

  constructor() {
    for (let index = 0; index < AMBIENT_BIRD_COUNT; index += 1) {
      const object = createBird();
      object.position.set(-18 + (index % 3) * 11, 8 + (index % 2) * 1.4, -9 + Math.floor(index / 3) * 14);
      const heading = new THREE.Vector3(index % 2 === 0 ? 1 : -1, 0, index % 3 === 0 ? 0.25 : -0.2).normalize();
      this.birds.push({ object, heading, phase: index * 0.83 });
      this.object.add(object);
    }
  }

  update(delta: number, wind: WindState, fires: readonly THREE.Vector3[]): void {
    this.elapsed += delta;
    this.birds.forEach((bird) => {
      let nearestFireX = 0;
      let nearestFireZ = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      fires.forEach((fire) => {
        const distance = Math.hypot(bird.object.position.x - fire.x, bird.object.position.z - fire.z);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestFireX = fire.x;
          nearestFireZ = fire.z;
        }
      });
      if (nearestDistance < AMBIENT_BIRD_FLEE_RADIUS) {
        bird.heading.set(
          bird.object.position.x - nearestFireX,
          0,
          bird.object.position.z - nearestFireZ,
        ).normalize().lerp(wind.direction, 0.24).normalize();
      } else {
        bird.heading.x += Math.sin(this.elapsed * 0.22 + bird.phase) * delta * 0.08;
        bird.heading.z += Math.cos(this.elapsed * 0.19 + bird.phase) * delta * 0.08;
        bird.heading.normalize();
      }
      bird.object.position.addScaledVector(bird.heading, AMBIENT_BIRD_SPEED * delta);
      bird.object.position.y = 8.5 + Math.sin(this.elapsed * 1.4 + bird.phase) * 0.45;
      bird.object.rotation.y = Math.atan2(bird.heading.x, bird.heading.z);
      bird.object.rotation.z = Math.sin(this.elapsed * 4 + bird.phase) * 0.16;
      if (bird.object.position.x > 28) bird.object.position.x = -28;
      if (bird.object.position.x < -28) bird.object.position.x = 28;
      if (bird.object.position.z > 28) bird.object.position.z = -28;
      if (bird.object.position.z < -28) bird.object.position.z = 28;
    });
  }
}
