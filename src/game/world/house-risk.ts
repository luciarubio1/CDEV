import * as THREE from 'three';

export const HOUSE_FIRE_DANGER_RADIUS = 7;
export const HOUSE_EXPOSURE_TO_IGNITE = 45;
export const HOUSE_EXPOSURE_DECAY_PER_SECOND = 2;

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
