import * as THREE from 'three';
import { createCharacter, setCharacterCarrier, setCharacterGesture } from '../npc/character-model';
import { FAUNA_CONFIG } from '../narrative/fauna-config';
import { WaypointWalker } from '../narrative/waypoint-walker';
import { turnTowards } from '../narrative/npc-movement';

export class VeterinarianView {
  readonly object = createCharacter('fauna');
  readonly walker: WaypointWalker;
  constructor(terrain: (x: number, z: number) => number) {
    this.walker = new WaypointWalker(FAUNA_CONFIG.veterinarianRoute, FAUNA_CONFIG.veterinarianSpeed, terrain);
    this.object.position.copy(this.walker.position);
    this.object.visible = false;
  }
  arrive(delta: number): void {
    this.walker.update(delta);
    this.object.position.copy(this.walker.position);
    turnTowards(this.object, Math.atan2(this.walker.direction.x, this.walker.direction.z), delta);
  }
  evaluate(progress: number): void {
    this.object.rotation.y = Math.atan2(FAUNA_CONFIG.fox.x - this.object.position.x, FAUNA_CONFIG.fox.z - this.object.position.z);
    setCharacterGesture(this.object, Math.sin(Math.PI * Math.min(1, progress)));
  }
  carryPose(active: boolean, carrier?: THREE.Object3D): void {
    setCharacterCarrier(this.object, active && carrier ? carrier : null);
  }
}
