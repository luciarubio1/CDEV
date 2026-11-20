import * as THREE from 'three';
import { CarrierCarryView } from '../player/carrier-carry-view';
import { RESCUE_CONFIG } from '../narrative/wildlife-rescue-config';
import { setCarrierDoor, CARRIER_CARRY_POSE } from './animal-carrier';
import { WildlifeStation } from './wildlife-station';
import type { FaunaAnimals } from './fauna-animals';
import type { VeterinarianView } from './veterinarian-view';

const smooth = (value: number): number => THREE.MathUtils.smoothstep(value, 0, 1);
export class WildlifeRescueView {
  readonly object = new THREE.Group();
  readonly carrying = new CarrierCarryView();
  readonly station: WildlifeStation;
  private readonly carrierStart = new THREE.Vector3();
  private readonly carrierRotation = new THREE.Quaternion();
  private readonly stationTarget = new THREE.Vector3();
  private readonly neutralRotation = new THREE.Quaternion();
  private readonly foxBounds = new THREE.Box3();
  private readonly foxSize = new THREE.Vector3();
  private readonly foxCenter = new THREE.Vector3();
  private readonly foxCorner = new THREE.Vector3();

  constructor(
    readonly carrier: THREE.Group,
    private readonly animals: FaunaAnimals,
    private readonly vet: VeterinarianView,
    private readonly terrain: (x: number, z: number) => number,
  ) {
    this.station = new WildlifeStation(terrain);
    this.object.add(this.station.object);
  }
  hold(camera: THREE.Camera): void { this.carrying.hold(camera, this.carrier); }
  beginLoading(): void {
    this.carrying.release(this.object, this.carrier);
  }
  finishLoading(): void {
    // Corte directo: el zorro pasa del suelo al transportín ya sostenido.
    this.vet.object.position.copy(RESCUE_CONFIG.loadingVeterinarian);
    this.vet.object.position.y = this.terrain(this.vet.object.position.x, this.vet.object.position.z);
    const fox = this.animals.fox;
    this.carrier.attach(fox);
    fox.position.set(0.07, 0.1, 0);
    this.fitFoxInsideCarrier(fox);
    this.animals.restFox();
    setCarrierDoor(this.carrier, 0);
    this.vet.object.updateWorldMatrix(true, true);
    this.vet.object.attach(this.carrier);
    this.carrier.position.set(0, CARRIER_CARRY_POSE.height, CARRIER_CARRY_POSE.forward);
    this.carrier.rotation.set(0, 0, 0);
    this.vet.carryPose(true, this.carrier);
  }
  beginPlacement(): void {
    this.carrier.updateWorldMatrix(true, true);
    this.object.attach(this.carrier);
    this.carrierStart.copy(this.carrier.position);
    this.carrierRotation.copy(this.carrier.quaternion);
    this.station.object.updateWorldMatrix(true, true);
    this.station.socket.getWorldPosition(this.stationTarget);
  }
  renderPlacement(progress: number): void {
    this.carrier.position.lerpVectors(this.carrierStart, this.stationTarget, smooth(progress));
    this.carrier.position.y += Math.sin(progress * Math.PI) * 0.15;
    this.carrier.quaternion.slerpQuaternions(this.carrierRotation, this.neutralRotation, smooth(progress));
    this.vet.carryPose(progress < 1, this.carrier);
  }
  finishPlacement(): void {
    this.renderPlacement(1);
    this.station.socket.attach(this.carrier);
    this.carrier.position.set(0, 0, 0);
    this.carrier.rotation.set(0, 0, 0);
  }

  private fitFoxInsideCarrier(fox: THREE.Object3D): void {
    this.carrier.updateWorldMatrix(true, true);
    fox.updateWorldMatrix(true, true);
    this.foxBounds.setFromObject(fox);
    this.foxSize.copy(this.foxBounds.max).sub(this.foxBounds.min);
    const scale = Math.min(
      1,
      1.1 / Math.max(this.foxSize.x, 0.001),
      0.55 / Math.max(this.foxSize.y, 0.001),
      0.5 / Math.max(this.foxSize.z, 0.001),
    );
    fox.children.forEach((child) => child.scale.multiplyScalar(scale));
    fox.updateWorldMatrix(true, true);
    this.foxBounds.setFromObject(fox);
    this.foxCenter.copy(this.foxBounds.min).add(this.foxBounds.max).multiplyScalar(0.5);
    this.foxCorner.copy(this.foxCenter);
    this.carrier.worldToLocal(this.foxCorner);
    fox.position.x += 0.0 - this.foxCorner.x;
    fox.position.y += 0.4 - this.foxCorner.y;
    fox.position.z += 0.0 - this.foxCorner.z;
  }
}
