export interface GameStatsSnapshot {
  survivalSeconds: number;
  explorationSeconds: number;
  firesExtinguished: number;
  maxActiveFires: number;
  wavesStarted: number;
  maxHouseRiskRatio: number;
  waterUsed: number;
  vegetationBurned: number;
  affectedSurfaceArea: number;
  missionRoute: string;
  discoveriesFound: number;
  predominantWind: string;
  windChanges: number;
  epilogueStationsFound: number;
  accompaniedRescueCompleted: boolean;
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export class GameStats {
  private survivalSeconds = 0;
  private explorationSeconds = 0;
  private firesExtinguished = 0;
  private maxActiveFires = 0;
  private wavesStarted = 0;
  private maxHouseRiskRatio = 0;
  private waterUsed = 0;
  private vegetationBurned = 0;
  private affectedSurfaceArea = 0;
  private missionRoute = 'Sin elegir';
  private discoveriesFound = 0;
  private predominantWind = 'Norte';
  private windChanges = 0;
  private epilogueStationsFound = 0;
  private accompaniedRescueCompleted = false;
  recordAccompaniedRescue(): void { this.accompaniedRescueCompleted = true; }

  updateSurvivalTime(delta: number): void {
    this.survivalSeconds += nonNegativeFinite(delta);
  }

  updateExplorationTime(delta: number): void { this.explorationSeconds += nonNegativeFinite(delta); }
  recordEpilogueStations(found: number): void { this.epilogueStationsFound = Math.max(this.epilogueStationsFound, Math.floor(nonNegativeFinite(found))); }

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

  recordEnvironmentalDamage(vegetationBurned: number, affectedSurfaceArea: number): void {
    this.vegetationBurned = Math.max(this.vegetationBurned, Math.floor(nonNegativeFinite(vegetationBurned)));
    this.affectedSurfaceArea = Math.max(this.affectedSurfaceArea, nonNegativeFinite(affectedSurfaceArea));
  }

  recordMissionRoute(route: string): void {
    this.missionRoute = route;
  }

  recordDiscoveries(found: number): void {
    this.discoveriesFound = Math.max(this.discoveriesFound, Math.floor(nonNegativeFinite(found)));
  }

  recordWind(direction: string, changes: number): void {
    this.predominantWind = direction;
    this.windChanges = Math.max(this.windChanges, Math.floor(nonNegativeFinite(changes)));
  }

  snapshot(): GameStatsSnapshot {
    return {
      survivalSeconds: Math.round(this.survivalSeconds),
      explorationSeconds: Math.round(this.explorationSeconds),
      firesExtinguished: this.firesExtinguished,
      maxActiveFires: this.maxActiveFires,
      wavesStarted: this.wavesStarted,
      maxHouseRiskRatio: this.maxHouseRiskRatio,
      waterUsed: Math.round(this.waterUsed),
      vegetationBurned: this.vegetationBurned,
      affectedSurfaceArea: Math.round(this.affectedSurfaceArea),
      missionRoute: this.missionRoute,
      discoveriesFound: this.discoveriesFound,
      predominantWind: this.predominantWind,
      windChanges: this.windChanges,
      epilogueStationsFound: this.epilogueStationsFound,
      accompaniedRescueCompleted: this.accompaniedRescueCompleted,
    };
  }
}
