import * as THREE from 'three';
import { CarrierCarryView } from '../player/carrier-carry-view';
import { RESCUE_CONFIG } from '../narrative/wildlife-rescue-config';
import { setCarrierDoor } from './animal-carrier';
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
  private readonly foxStart = new THREE.Vector3();
  private readonly vetStart = new THREE.Vector3();
  private readonly staging = new THREE.Vector3();
  private readonly carryTarget = new THREE.Vector3();
  private readonly carryRotation = new THREE.Quaternion();
  private readonly animalTarget = new THREE.Vector3();
  private readonly stationTarget = new THREE.Vector3();
  private readonly neutralRotation = new THREE.Quaternion();

  constructor(
    readonly carrier: THREE.Group,
    private readonly animals: FaunaAnimals,
    private readonly vet: VeterinarianView,
    private readonly terrain: (x: number, z: number) => number,
  ) {
    this.station = new WildlifeStation(terrain);
    this.object.add(this.station.object);
    this.staging.copy(RESCUE_CONFIG.loadingCarrier);
    this.staging.y = terrain(this.staging.x, this.staging.z);
  }
  hold(camera: THREE.Camera): void { this.carrying.hold(camera, this.carrier); }
  beginLoading(): void {
    this.carrying.release(this.object, this.carrier);
    this.carrierStart.copy(this.carrier.position);
    this.carrierRotation.copy(this.carrier.quaternion);
    this.foxStart.copy(this.animals.fox.position);
    this.vetStart.copy(this.vet.object.position);
  }
  renderLoading(progress: number): void {
    const veterinarian = this.vet.object;
    veterinarian.position.lerpVectors(this.vetStart, RESCUE_CONFIG.loadingVeterinarian, smooth(progress / 0.25));
    veterinarian.position.y = this.terrain(veterinarian.position.x, veterinarian.position.z);
    veterinarian.rotation.y = Math.atan2(this.staging.x - veterinarian.position.x, this.staging.z - veterinarian.position.z);
    this.vet.evaluate(progress);
    if (progress <= 0.8) {
      this.carrier.position.lerpVectors(this.carrierStart, this.staging, smooth(progress / 0.25));
      this.carrier.quaternion.slerpQuaternions(this.carrierRotation, this.neutralRotation, smooth(progress / 0.25));
      const open = progress < 0.7 ? smooth((progress - 0.25) / 0.15) : 1 - smooth((progress - 0.7) / 0.1);
      setCarrierDoor(this.carrier, open);
    }
    if (progress >= 0.4 && this.animals.fox.parent !== this.carrier) {
      this.animalTarget.copy(this.staging);
      this.animalTarget.x += 0.07;
      this.animalTarget.y += 0.1;
      this.animals.fox.position.lerpVectors(this.foxStart, this.animalTarget, smooth((progress - 0.4) / 0.3));
      const fox = this.animals.fox;
      fox.position.y = Math.max(fox.position.y, this.terrain(fox.position.x, fox.position.z));
      if (progress >= 0.7) {
        this.carrier.updateWorldMatrix(true, true);
        this.carrier.attach(fox);
        fox.position.set(0.07, 0.1, 0);
        this.animals.restFox();
      }
    }
    if (progress > 0.8) {
      this.carryTarget.set(0, 1.05, 0.85);
      veterinarian.updateWorldMatrix(true, false);
      veterinarian.localToWorld(this.carryTarget);
      veterinarian.getWorldQuaternion(this.carryRotation);
      this.carrier.position.lerpVectors(this.staging, this.carryTarget, smooth((progress - 0.8) / 0.2));
      this.carrier.quaternion.slerpQuaternions(this.neutralRotation, this.carryRotation, smooth((progress - 0.8) / 0.2));
    }
  }
  finishLoading(): void {
    this.renderLoading(1);
    setCarrierDoor(this.carrier, 0);
    this.vet.object.updateWorldMatrix(true, true);
    this.vet.object.attach(this.carrier);
    this.carrier.position.set(0, 1.05, 0.85);
    this.carrier.rotation.set(0, 0, 0);
    this.vet.carryPose(true);
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
    this.vet.carryPose(progress < 1);
  }
  finishPlacement(): void {
    this.renderPlacement(1);
    this.station.socket.attach(this.carrier);
    this.carrier.position.set(0, 0, 0);
    this.carrier.rotation.set(0, 0, 0);
  }
}
