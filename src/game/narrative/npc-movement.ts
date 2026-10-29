import type { Object3D } from 'three';

/** Travel only. Treatment/evaluation/loading durations remain in their own settings. */
export const NPC_MOVEMENT = {
  companionSpeed: 2.5,
  veterinarianSpeed: 2.5,
  loadedVeterinarianSpeed: 2.2,
  stopDistance: 5.5,
  resumeDistance: 3.5,
  acceleration: 4.5,
  turnResponse: 6,
  crewTravelSeconds: 3.8,
} as const;

export class FollowDistanceGate {
  waiting = false;
  update(distance: number): boolean {
    if (this.waiting ? distance <= NPC_MOVEMENT.resumeDistance : distance >= NPC_MOVEMENT.stopDistance) this.waiting = !this.waiting;
    return !this.waiting;
  }
  speedScale(distance: number): number {
    return Math.max(0.25, Math.min(1, (NPC_MOVEMENT.stopDistance - distance) / 1.2));
  }
}

export function turnTowards(object: Object3D, targetYaw: number, delta: number): void {
  const difference = Math.atan2(Math.sin(targetYaw - object.rotation.y), Math.cos(targetYaw - object.rotation.y));
  object.rotation.y += difference * (1 - Math.exp(-NPC_MOVEMENT.turnResponse * delta));
}
