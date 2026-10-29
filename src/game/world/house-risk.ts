import * as THREE from 'three';
import { GAME_BALANCE } from '../balance-config';

export const HOUSE_FIRE_DANGER_RADIUS = GAME_BALANCE.house.dangerRadius;
export const HOUSE_EXPOSURE_TO_IGNITE = GAME_BALANCE.house.exposureToIgnite;
export const HOUSE_EXPOSURE_DECAY_PER_SECOND = GAME_BALANCE.house.exposureDecayPerSecond;

export class HouseRisk {
  private exposure = 0;
  private burned = false;

  get exposureRatio(): number {
    return Math.min(1, this.exposure / HOUSE_EXPOSURE_TO_IGNITE);
  }

  get isBurned(): boolean {
    return this.burned;
  }

  update(
    housePosition: THREE.Vector3,
    activeFirePositions: readonly THREE.Vector3[],
    delta: number,
  ): void {
    if (this.burned) {
      return;
    }

    const hasNearbyFire = activeFirePositions.some(
      (firePosition) =>
        firePosition.distanceTo(housePosition) <= HOUSE_FIRE_DANGER_RADIUS,
    );

    this.exposure = hasNearbyFire
      ? Math.min(HOUSE_EXPOSURE_TO_IGNITE, this.exposure + delta)
      : Math.max(0, this.exposure - HOUSE_EXPOSURE_DECAY_PER_SECOND * delta);

    if (this.exposure >= HOUSE_EXPOSURE_TO_IGNITE) {
      this.burned = true;
    }
  }
}
