export const MAX_WATER = 100;
export const WATER_DRAIN_PER_SECOND = 10;

export class WaterTank {
  private currentWater = MAX_WATER;

  get amount(): number {
    return this.currentWater;
  }

  get isEmpty(): boolean {
    return this.currentWater <= 0;
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
    return activeTime;
  }

  refill(): void {
    this.currentWater = MAX_WATER;
  }
}
