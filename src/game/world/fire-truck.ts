import * as THREE from 'three';
import { buildTruckVisual } from './truck-model';

export const FIRE_TRUCK_POSITION = new THREE.Vector3(-16, 0, 16);
export const FIRE_TRUCK_RELOAD_RADIUS = 3.5;
export const TRUCK_BEACON_FLASH_FREQUENCY = 2.4;
export const TRUCK_EMERGENCY_FLASH_SECONDS = 1.4;

export function createFireTruck(): THREE.Group {
  const truck = buildTruckVisual();
  truck.position.copy(FIRE_TRUCK_POSITION);
  truck.rotation.y = Math.PI / 5;
  return truck;
}

/** Existing alternating beacons, attached to the shared roof sockets. */
export class FireTruckEmergencyLights {
  private readonly leftBeacon: THREE.Mesh;
  private readonly rightBeacon: THREE.Mesh;
  private readonly leftLight: THREE.PointLight;
  private readonly rightLight: THREE.PointLight;
  private elapsed = 0;
  private flashRemaining = 0;

  constructor(truck: THREE.Group) {
    const red = new THREE.MeshStandardMaterial({ color: 0xcf332c, emissive: 0xa81008, emissiveIntensity: 0 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xffa51f, emissive: 0xc36a00, emissiveIntensity: 0 });
    this.leftBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 12), red);
    this.rightBeacon = new THREE.Mesh(this.leftBeacon.geometry, amber);
    this.leftLight = new THREE.PointLight(0xe43b2f, 0, 4.2, 2);
    this.rightLight = new THREE.PointLight(0xffaa26, 0, 4.2, 2);
    truck.getObjectByName('truck-beacon-left')!.add(this.leftBeacon, this.leftLight);
    truck.getObjectByName('truck-beacon-right')!.add(this.rightBeacon, this.rightLight);
  }
  triggerEmergencyFlash(): void { this.flashRemaining = TRUCK_EMERGENCY_FLASH_SECONDS; }
  setActive(active: boolean): void {
    if (!active) {
      this.leftLight.intensity = this.rightLight.intensity = 0;
      (this.leftBeacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      (this.rightBeacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }
  }
  update(delta: number, active: boolean): void {
    if (!active) { this.setActive(false); return; }
    this.elapsed += delta;
    this.flashRemaining = Math.max(0, this.flashRemaining - delta);
    const phase = Math.sin(this.elapsed * Math.PI * 2 * TRUCK_BEACON_FLASH_FREQUENCY);
    const boost = this.flashRemaining > 0 ? 1.35 : 1;
    const leftOn = Math.max(0, phase) * boost, rightOn = Math.max(0, -phase) * boost;
    (this.leftBeacon.material as THREE.MeshStandardMaterial).emissiveIntensity = leftOn * 1.5;
    (this.rightBeacon.material as THREE.MeshStandardMaterial).emissiveIntensity = rightOn * 1.5;
    this.leftLight.intensity = leftOn * 1.25;
    this.rightLight.intensity = rightOn * 1.25;
  }
}
