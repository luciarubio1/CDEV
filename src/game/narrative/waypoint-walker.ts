import * as THREE from 'three';
import { NPC_MOVEMENT } from './npc-movement';

/** Recorrido determinista por metros recorridos. Pausar conserva posición y tramo. */
export class WaypointWalker {
  readonly position = new THREE.Vector3();
  readonly direction = new THREE.Vector3(0, 0, 1);
  private nextPoint = 1;
  private currentSpeed = 0;
  constructor(
    private readonly points: readonly THREE.Vector3[],
    private readonly speed: number,
    private readonly terrain: (x: number, z: number) => number,
  ) {
    if (points.length === 0) throw new Error('El recorrido necesita un punto inicial.');
    this.position.copy(points[0]);
    this.ground();
  }
  get finished(): boolean { return this.nextPoint >= this.points.length; }
  update(delta: number, enabled = true, speedScale = 1): void {
    if (!enabled) { this.currentSpeed = 0; return; }
    let remaining = 0;
    for (let i = this.nextPoint; i < this.points.length; i++) {
      const previous = i === this.nextPoint ? this.position : this.points[i - 1];
      remaining += Math.hypot(this.points[i].x - previous.x, this.points[i].z - previous.z);
    }
    const targetSpeed = Math.min(this.speed * speedScale, Math.sqrt(2 * NPC_MOVEMENT.acceleration * remaining));
    const change = NPC_MOVEMENT.acceleration * Math.max(0, delta);
    this.currentSpeed += THREE.MathUtils.clamp(targetSpeed - this.currentSpeed, -change, change);
    let travel = remaining < 0.025 && delta > 0 ? remaining : Math.max(0, delta) * this.currentSpeed;
    while (!this.finished && travel > 0) {
      const target = this.points[this.nextPoint];
      const distance = Math.hypot(target.x - this.position.x, target.z - this.position.z);
      if (distance < 1e-8) { this.nextPoint++; continue; }
      this.direction.set((target.x - this.position.x) / distance, 0, (target.z - this.position.z) / distance);
      const step = Math.min(distance, travel);
      this.position.addScaledVector(this.direction, step);
      travel -= step;
      if (step >= distance) { this.position.x = target.x; this.position.z = target.z; this.nextPoint++; }
    }
    this.ground();
  }
  private ground(): void { this.position.y = this.terrain(this.position.x, this.position.z); }
}
