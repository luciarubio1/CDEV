import * as THREE from 'three';

/** Recorrido determinista por metros recorridos. Pausar conserva posición y tramo. */
export class WaypointWalker {
  readonly position = new THREE.Vector3();
  readonly direction = new THREE.Vector3(0, 0, 1);
  private nextPoint = 1;
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
  update(delta: number, enabled = true): void {
    if (!enabled) return;
    let travel = Math.max(0, delta) * this.speed;
    while (!this.finished && travel > 0) {
      const target = this.points[this.nextPoint];
      const distance = Math.hypot(target.x - this.position.x, target.z - this.position.z);
      if (distance < 1e-8) { this.nextPoint++; continue; }
      this.direction.set((target.x - this.position.x) / distance, 0, (target.z - this.position.z) / distance);
      const step = Math.min(distance, travel);
      this.position.addScaledVector(this.direction, step);
      travel -= step;
      if (step >= distance) this.nextPoint++;
    }
    this.ground();
  }
  private ground(): void { this.position.y = this.terrain(this.position.x, this.position.z); }
}
