import * as THREE from 'three';
import { createFireTruck, FireTruckEmergencyLights } from './fire-truck';
import { createGuideNpc } from '../npc/guide-npc';
import type { ReinforcementFrame } from '../narrative/reinforcement-sequence';

/** Coordenadas X/Z: tramo del camino entre camión original y vivienda. */
export const REINFORCEMENT_LAYOUT = {
  truckStart: new THREE.Vector3(-3, 0, 12.9),
  truckStop: new THREE.Vector3(-10, 0, 14.5),
  sectorCrew: new THREE.Vector3(-13, 0, 8),
  companion: new THREE.Vector3(-12, 0, 11.2),
  playerReturn: new THREE.Vector3(-8.5, 0, 10),
  camera: new THREE.Vector3(-5, 0, 7),
};

/** Franja reservada también al cargar vegetación y rocas (incluye cámara y regreso). */
export function isReinforcementArea(x: number, z: number): boolean {
  return x >= -14.5 && x <= 0 && z >= 6.5 && z <= 17;
}

function smooth(value: number): number { return value * value * (3 - 2 * value); }

export class ReinforcementView {
  readonly object = new THREE.Group();
  readonly truck = createFireTruck();
  readonly companion = createGuideNpc();
  readonly sectorCrew = createGuideNpc();
  readonly companionPosition = new THREE.Vector3();
  private readonly lights = new FireTruckEmergencyLights(this.truck);
  private readonly firstDoor = new THREE.Vector3(-10.9, 0, 13);
  private readonly secondDoor = new THREE.Vector3(-11.6, 0, 15.9);
  private readonly crewAroundTruck = new THREE.Vector3(-13.4, 0, 16);
  private readonly cameraTarget = new THREE.Vector3();

  constructor(private readonly terrainHeight: (x: number, z: number) => number) {
    this.truck.rotation.y = Math.atan2(7, -1.6);
    this.object.add(this.truck, this.companion, this.sectorCrew);
    this.object.visible = false;
    this.ground(this.companionPosition.copy(REINFORCEMENT_LAYOUT.companion));
  }

  render(frame: ReinforcementFrame): void {
    this.object.visible = true;
    this.truck.position.lerpVectors(REINFORCEMENT_LAYOUT.truckStart, REINFORCEMENT_LAYOUT.truckStop, smooth(frame.truckProgress));
    this.ground(this.truck.position);
    this.companion.visible = this.sectorCrew.visible = frame.crewVisible;
    this.companion.position.lerpVectors(this.firstDoor, REINFORCEMENT_LAYOUT.companion, smooth(frame.crewProgress));
    // Sale por el otro lado y rodea la trompa; no atraviesa el vehículo.
    const crewTravel = smooth(frame.crewProgress);
    if (crewTravel < 0.3) {
      this.sectorCrew.position.lerpVectors(this.secondDoor, this.crewAroundTruck, crewTravel / 0.3);
    } else {
      this.sectorCrew.position.lerpVectors(this.crewAroundTruck, REINFORCEMENT_LAYOUT.sectorCrew, (crewTravel - 0.3) / 0.7);
    }
    this.ground(this.companion.position);
    this.ground(this.sectorCrew.position);
    this.companion.rotation.y = Math.atan2(REINFORCEMENT_LAYOUT.playerReturn.x - this.companion.position.x, REINFORCEMENT_LAYOUT.playerReturn.z - this.companion.position.z);
    this.sectorCrew.rotation.y = Math.PI;
    if (frame.complete) this.lights.setActive(false);
  }

  updateLights(delta: number, active: boolean): void { this.lights.update(delta, active); }

  moveCompanion(position: THREE.Vector3): void {
    this.companionPosition.copy(position);
    this.ground(this.companionPosition);
    this.companion.position.copy(this.companionPosition);
    this.companion.visible = true;
  }

  setCamera(camera: THREE.Camera): void {
    camera.position.copy(REINFORCEMENT_LAYOUT.camera);
    camera.position.y = this.terrainHeight(camera.position.x, camera.position.z) + 3.7;
    this.cameraTarget.copy(REINFORCEMENT_LAYOUT.truckStop);
    this.cameraTarget.y = this.terrainHeight(this.cameraTarget.x, this.cameraTarget.z) + 1.5;
    camera.lookAt(this.cameraTarget);
  }

  restorePlayer(camera: THREE.Camera): void {
    camera.position.copy(REINFORCEMENT_LAYOUT.playerReturn);
    camera.position.y = this.terrainHeight(camera.position.x, camera.position.z) + 1.7;
    this.cameraTarget.copy(this.companionPosition).add(new THREE.Vector3(0, 1.7, 0));
    camera.lookAt(this.cameraTarget);
  }

  private ground(position: THREE.Vector3): void { position.y = this.terrainHeight(position.x, position.z); }
}
