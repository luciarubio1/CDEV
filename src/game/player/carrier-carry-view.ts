import * as THREE from 'three';
import type { CollisionSystem } from '../world/collision-system';
import { CARRIER_SIZE } from '../world/animal-carrier';

/** Manos y mangas a escala fija, sujetas a los laterales del mismo transportín. */
export class CarrierCarryView {
  readonly object = new THREE.Group();
  readonly hands: THREE.Group[] = [];
  constructor() {
    this.object.name = 'player-carrier-hands';
    const skin = new THREE.MeshStandardMaterial({ color: 0xb97854 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0xd86523 });
    for (const side of [-1, 1]) {
      const hand = new THREE.Group();
      hand.position.set(side * 0.71, 0.48, 0.1);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
      palm.scale.set(0.065, 0.07, 0.1); hand.add(palm);
      const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.13), skin);
      fingers.position.set(-side * 0.04, 0, 0); hand.add(fingers);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 12), sleeve);
      arm.rotation.x = Math.PI / 2; arm.position.z = 0.26; hand.add(arm);
      this.hands.push(hand);
    }
    this.object.visible = false;
  }
  hold(camera: THREE.Camera, carrier: THREE.Group): void {
    if (this.object.parent !== camera) camera.add(this.object);
    this.object.add(carrier);
    carrier.position.set(0, -0.95, -1.55);
    carrier.rotation.set(0, 0, 0);
    this.hands.forEach((hand) => carrier.add(hand));
    carrier.visible = this.object.visible = true;
  }
  release(parent: THREE.Object3D, carrier: THREE.Group): void {
    carrier.updateWorldMatrix(true, true);
    parent.attach(carrier);
    this.hands.forEach((hand) => this.object.add(hand));
    this.object.visible = false;
  }
  constrainMovement(camera: THREE.Camera, carrier: THREE.Group, previous: THREE.Vector3, desired: THREE.Vector3, collisions: CollisionSystem): THREE.Vector3 {
    camera.updateWorldMatrix(true, true);
    const sample = new THREE.Vector3(), offset = new THREE.Vector3();
    const clear = (position: THREE.Vector3): boolean => {
      offset.copy(position).sub(camera.position);
      for (const x of [-CARRIER_SIZE.width/2, 0, CARRIER_SIZE.width/2]) for (const z of [-CARRIER_SIZE.depth/2, 0, CARRIER_SIZE.depth/2]) {
        sample.set(x, 0.4, z);
        carrier.localToWorld(sample);
        sample.add(offset);
        if (!collisions.canOccupy(sample, 0.07)) return false;
      }
      return true;
    };
    if (clear(desired)) return desired;
    const result = previous.clone();
    const axis = previous.clone(); axis.x = desired.x;
    if (clear(axis)) result.x = desired.x;
    axis.copy(result); axis.z = desired.z;
    if (clear(axis)) result.z = desired.z;
    return result;
  }
}
