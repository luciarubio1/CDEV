import * as THREE from 'three';
import { RESCUE_CONFIG } from '../narrative/wildlife-rescue-config';
import type { CollisionSystem } from './collision-system';

export class WildlifeStation {
  readonly object = new THREE.Group();
  readonly socket = new THREE.Group();
  private registered = false;
  constructor(terrain: (x: number, z: number) => number) {
    const green = new THREE.MeshStandardMaterial({ color: 0x55796c });
    const metal = new THREE.MeshStandardMaterial({ color: 0x465252 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.2), green);
    top.position.y = RESCUE_CONFIG.stationTop - 0.06;
    this.object.add(top);
    for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), metal);
      leg.position.set(x, 0.43, z); this.object.add(leg);
    }
    for (let i = 0; i < 2; i++) {
      const supply = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.45), new THREE.MeshStandardMaterial({ color: 0xc1b99a }));
      supply.position.set(-0.6 + i * 0.5, 0.2, -0.25); this.object.add(supply);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.06), green);
    sign.position.set(0, 1.65, -0.8); this.object.add(sign);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf1e1bb }));
    paw.scale.set(1.5, 1, 0.3); paw.position.set(0, 1.6, -0.76); this.object.add(paw);
    for (const x of [-0.12, 0, 0.12]) {
      const toe = paw.clone(); toe.scale.set(0.6, 0.6, 0.2); toe.position.set(x, 1.72, -0.76); this.object.add(toe);
    }
    this.object.position.copy(RESCUE_CONFIG.station);
    this.object.position.y = terrain(this.object.position.x, this.object.position.z);
    this.socket.position.y = RESCUE_CONFIG.stationTop;
    this.object.add(this.socket);
    this.object.visible = false;
  }
  show(collisions: CollisionSystem): void {
    this.object.visible = true;
    if (!this.registered) {
      collisions.addRectangle(this.object.position, 1.9, 1.2);
      this.registered = true;
    }
  }
}
