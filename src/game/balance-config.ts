/**
 * Balance principal de la experiencia. Mantener estos valores juntos permite
 * ajustar el ritmo sin buscar constantes repartidas entre sistemas.
 */
export const GAME_BALANCE = {
  water: { max: 100, drainPerSecond: 4 },
  hose: { extinguishPerSecond: 0.4, interactionRadius: 4 },
  movement: { speed: 3.2 },
  player: { maxHealth: 100, dangerRadius: 4, damagePerSecond: 5 },
  fire: {
    waterResistance: { common: 1, critical: 1.8 },
    waveInterval: 24,
    maxActiveFires: 3,
    propagationMinMultiplier: 0.9,
    propagationMaxMultiplier: 1.08,
  },
  house: { dangerRadius: 7, exposureToIgnite: 60, exposureDecayPerSecond: 2.5 },
  reinforcements: { visualExtinguishPerSecond: 0.42 },
  assistance: { treatmentSeconds: 7, checkupSeconds: 2.5, interactionRadius: 2.4 },
} as const;
