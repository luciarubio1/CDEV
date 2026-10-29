import * as THREE from 'three';
import { FIRE_TRUCK_POSITION } from '../world/fire-truck';
import { createCharacter } from './character-model';

export const GUIDE_NPC_POSITION = FIRE_TRUCK_POSITION.clone().add(new THREE.Vector3(-3.8, 0, -3.6));
export const GUIDE_NPC_INTERACTION_RADIUS = 2.5;

/** Stable logical root; the articulated visual is a child of it. */
export function createGuideNpc(): THREE.Group {
  const guide = createCharacter('brigadista');
  guide.position.copy(GUIDE_NPC_POSITION);
  guide.rotation.y = Math.atan2(-GUIDE_NPC_POSITION.x, 7-GUIDE_NPC_POSITION.z);
  return guide;
}
