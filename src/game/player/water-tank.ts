import { GAME_BALANCE } from '../balance-config';

export const MAX_WATER = GAME_BALANCE.water.max;
export const WATER_DRAIN_PER_SECOND = GAME_BALANCE.water.drainPerSecond;

export class WaterTank {
  private currentWater: number = MAX_WATER;
  private consumedWater = 0;

  get amount(): number {
    return this.currentWater;
  }

  get isEmpty(): boolean {
    return this.currentWater <= 0;
  }

  get totalConsumed(): number {
    return this.consumedWater;
  }

  /**
   * Consumes water for the requested time and returns the time that the hose
   * could actually remain active. This lets the last amount of water work
   * proportionally instead of extinguishing a full frame for free.
   */
  consume(delta: number): number {
    const availableTime = this.currentWater / WATER_DRAIN_PER_SECOND;
    const activeTime = Math.min(delta, availableTime);
    this.currentWater = Math.max(
      0,
      this.currentWater - activeTime * WATER_DRAIN_PER_SECOND,
    );
    this.consumedWater += activeTime * WATER_DRAIN_PER_SECOND;
    return activeTime;
  }

  refill(): void {
    this.currentWater = MAX_WATER;
  }
}
