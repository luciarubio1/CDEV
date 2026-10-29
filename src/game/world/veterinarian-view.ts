import * as THREE from 'three';
import { createGuideNpc } from '../npc/guide-npc';
import { FAUNA_CONFIG } from '../narrative/fauna-config';
import { WaypointWalker } from '../narrative/waypoint-walker';

export class VeterinarianView {
  readonly object = createGuideNpc();
  readonly walker: WaypointWalker;
  private readonly arms: THREE.Object3D[] = [];
  constructor(terrain: (x: number, z: number) => number) {
    this.walker = new WaypointWalker(FAUNA_CONFIG.veterinarianRoute, FAUNA_CONFIG.veterinarianSpeed, terrain);
    this.object.position.copy(this.walker.position);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.8, 0.42), new THREE.MeshStandardMaterial({ color: 0x6b9381 }));
    vest.position.y = 1.45; this.object.add(vest);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.025), new THREE.MeshStandardMaterial({ color: 0xe7eadc }));
    badge.position.set(0, 1.6, 0.23); this.object.add(badge);
    this.object.children.forEach((child) => { if (Math.abs(child.position.x) === 0.48 && child.position.y === 1.45) this.arms.push(child); });
    this.object.visible = false;
  }
  arrive(delta: number): void {
    this.walker.update(delta);
    this.object.position.copy(this.walker.position);
    this.object.rotation.y = Math.atan2(this.walker.direction.x, this.walker.direction.z);
  }
  evaluate(progress: number): void {
    this.object.rotation.y = Math.atan2(FAUNA_CONFIG.fox.x - this.object.position.x, FAUNA_CONFIG.fox.z - this.object.position.z);
    this.arms.forEach((arm) => { arm.rotation.x = -0.75 * Math.sin(Math.PI * Math.min(1, progress)); });
  }
  carryPose(active: boolean): void {
    this.arms.forEach((arm) => { arm.rotation.x = active ? -0.95 : 0; });
  }
}
