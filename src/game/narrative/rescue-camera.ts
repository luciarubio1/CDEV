import * as THREE from 'three';
import type { CollisionSystem } from '../world/collision-system';

/** External offset in world space: stable side/rear view along the westbound route. */
export const RESCUE_CAMERA = {
  offset: new THREE.Vector3(3.2, 2.6, -2),
  lookHeight: 1.1,
  response: 5,
  clearance: 0.3,
  groundClearance: 1.8,
  returnPosition: new THREE.Vector3(-7.8, 0, 10.4),
};

export class RescueCamera {
  active = false;
  private readonly desired = new THREE.Vector3();
  private readonly candidate = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly sample = new THREE.Vector3();
  private readonly carrierBox = new THREE.Box3();
  private readonly aim = new THREE.PerspectiveCamera();
  private readonly visibility = new Map<THREE.Object3D, boolean>();
  constructor(private readonly camera: THREE.Camera, private readonly collisions: CollisionSystem, private readonly terrain: (x: number, z: number) => number) {}
  begin(vet: THREE.Object3D, carrier: THREE.Object3D): void {
    if (this.active) return;
    this.active = true;
    this.camera.children.forEach((child) => { this.visibility.set(child, child.visible); child.visible = false; });
    // Relocate immediately if the delivery viewpoint overlaps the crate; never interpolate through it.
    this.update(1, vet, carrier, true);
  }
  update(delta: number, vet: THREE.Object3D, carrier: THREE.Object3D, initial = false): void {
    if (!this.active) return;
    carrier.updateWorldMatrix(true, true);
    this.carrierBox.setFromObject(carrier).expandByScalar(RESCUE_CAMERA.clearance);
    this.desired.copy(vet.position).add(RESCUE_CAMERA.offset);
    this.desired.y = Math.max(this.desired.y, this.terrain(this.desired.x, this.desired.z) + RESCUE_CAMERA.groundClearance);
    // Search only external viewpoints; never fall back to a point inside the animal carrier.
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      this.candidate.copy(this.desired);
      if (i > 0) {
        this.candidate.x = vet.position.x + Math.cos(angle) * 4;
        this.candidate.z = vet.position.z + Math.sin(angle) * 4;
        this.candidate.y = Math.max(vet.position.y + 2.6, this.terrain(this.candidate.x, this.candidate.z) + RESCUE_CAMERA.groundClearance);
      }
      if (!this.clear(this.candidate, vet)) continue;
      this.desired.copy(this.candidate);
      break;
    }
    const alpha = 1 - Math.exp(-RESCUE_CAMERA.response * delta);
    this.candidate.lerpVectors(this.camera.position, this.desired, alpha);
    let safePath = !initial;
    for (let i = 1; safePath && i <= 12; i++) {
      this.sample.lerpVectors(this.camera.position, this.candidate, i / 12);
      if (!this.clear(this.sample, vet)) safePath = false;
    }
    if (safePath) this.camera.position.copy(this.candidate);
    else if (initial || !this.clear(this.camera.position, vet)) this.camera.position.copy(this.desired);
    this.target.copy(vet.position); this.target.y += RESCUE_CAMERA.lookHeight;
    this.aim.position.copy(this.camera.position); this.aim.lookAt(this.target);
    this.camera.quaternion.slerp(this.aim.quaternion, initial ? 1 : alpha);
  }
  restore(target: THREE.Vector3): void {
    if (!this.active) return;
    this.active = false;
    this.desired.copy(RESCUE_CAMERA.returnPosition);
    if (!this.collisions.canOccupy(this.desired)) {
      for (let i = 1; i <= 20; i++) {
        this.desired.set(RESCUE_CAMERA.returnPosition.x + (i % 5) * .5, 0, RESCUE_CAMERA.returnPosition.z - Math.floor(i / 5) * .5);
        if (this.collisions.canOccupy(this.desired)) break;
      }
    }
    this.desired.y = this.terrain(this.desired.x, this.desired.z) + 1.7;
    this.camera.position.copy(this.desired);
    this.target.copy(target); this.target.y += 1.2;
    this.camera.lookAt(this.target);
    this.visibility.forEach((visible, child) => { child.visible = visible; });
    this.visibility.clear();
  }
  private clear(position: THREE.Vector3, vet: THREE.Object3D): boolean {
    return this.collisions.canOccupy(position, RESCUE_CAMERA.clearance)
      && !this.carrierBox.containsPoint(position)
      && Math.hypot(position.x - vet.position.x, position.z - vet.position.z) > 1.2
      && position.y >= this.terrain(position.x, position.z) + RESCUE_CAMERA.groundClearance - .01;
  }
}
