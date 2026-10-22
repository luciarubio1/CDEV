import * as THREE from 'three';

export const MAX_PLAYER_HEALTH = 100;
export const PLAYER_FIRE_DANGER_RADIUS = 4;
export const PLAYER_FIRE_DAMAGE_PER_SECOND = 8;

export class PlayerHealth {
  private currentHealth = MAX_PLAYER_HEALTH;

  get amount(): number {
    return this.currentHealth;
  }

  get isDepleted(): boolean {
    return this.currentHealth <= 0;
  }

  updateFromFirePositions(
    playerPosition: THREE.Vector3,
    firePositions: readonly THREE.Vector3[],
    delta: number,
  ): number {
    const nearestDistance = firePositions.reduce(
      (nearest, firePosition) =>
        Math.min(nearest, playerPosition.distanceTo(firePosition)),
      Number.POSITIVE_INFINITY,
    );

    if (nearestDistance > PLAYER_FIRE_DANGER_RADIUS) {
      return 0;
    }

    const dangerLevel = 1 - nearestDistance / PLAYER_FIRE_DANGER_RADIUS;
    this.currentHealth = Math.max(
      0,
      this.currentHealth - PLAYER_FIRE_DAMAGE_PER_SECOND * dangerLevel * delta,
    );
    return dangerLevel;
  }
}
