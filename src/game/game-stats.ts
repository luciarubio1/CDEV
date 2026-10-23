export interface GameStatsSnapshot {
  survivalSeconds: number;
  firesExtinguished: number;
  maxActiveFires: number;
  wavesStarted: number;
  maxHouseRiskRatio: number;
  waterUsed: number;
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export class GameStats {
  private survivalSeconds = 0;
  private firesExtinguished = 0;
  private maxActiveFires = 0;
  private wavesStarted = 0;
  private maxHouseRiskRatio = 0;
  private waterUsed = 0;

  updateSurvivalTime(delta: number): void {
    this.survivalSeconds += nonNegativeFinite(delta);
  }

  recordFireState(
    activeFires: number,
    extinguishedFires: number,
    startedWaves: number,
  ): void {
    this.maxActiveFires = Math.max(
      this.maxActiveFires,
      Math.floor(nonNegativeFinite(activeFires)),
    );
    this.firesExtinguished = Math.max(
      this.firesExtinguished,
      Math.floor(nonNegativeFinite(extinguishedFires)),
    );
    this.wavesStarted = Math.max(
      this.wavesStarted,
      Math.floor(nonNegativeFinite(startedWaves)),
    );
  }

  recordHouseRisk(riskRatio: number): void {
    const safeRatio = Math.min(1, nonNegativeFinite(riskRatio));
    this.maxHouseRiskRatio = Math.max(this.maxHouseRiskRatio, safeRatio);
  }

  recordWaterUsage(totalWaterUsed: number): void {
    this.waterUsed = Math.max(this.waterUsed, nonNegativeFinite(totalWaterUsed));
  }

  snapshot(): GameStatsSnapshot {
    return {
      survivalSeconds: Math.round(this.survivalSeconds),
      firesExtinguished: this.firesExtinguished,
      maxActiveFires: this.maxActiveFires,
      wavesStarted: this.wavesStarted,
      maxHouseRiskRatio: this.maxHouseRiskRatio,
      waterUsed: Math.round(this.waterUsed),
    };
  }
}
