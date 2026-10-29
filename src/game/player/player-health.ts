import * as THREE from 'three';
import { GAME_BALANCE } from '../balance-config';

export const MAX_PLAYER_HEALTH = GAME_BALANCE.player.maxHealth;
export const PLAYER_FIRE_DANGER_RADIUS = GAME_BALANCE.player.dangerRadius;
export const PLAYER_FIRE_DAMAGE_PER_SECOND = GAME_BALANCE.player.damagePerSecond;

export class PlayerHealth {
  private currentHealth: number = MAX_PLAYER_HEALTH;

  get amount(): number {
    return this.currentHealth;
  }

  get isDepleted(): boolean {
    return this.currentHealth <= 0;
  }

  /** Recuperación narrativa: acotada a la salud máxima y nunca resta salud. */
  restoreTo(amount: number): void {
    if (Number.isFinite(amount)) this.currentHealth = Math.max(this.currentHealth, Math.min(MAX_PLAYER_HEALTH, amount));
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
