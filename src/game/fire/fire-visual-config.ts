/** Rendering only. Water resistance, drain and damage remain in balance-config.ts. */
export const FIRE_VISUAL = {
  commonTongues: 9, criticalTongues: 12, crossedPlanes: 3, heightSegments: 7,
  height: 1.85, width: .42, spread: .7, criticalScale: 1.12,
  widthProfile: [.6,1,.91,.72,.5,.3,.12,0],
  sway: .13, animationSpeed: 2.4, windLean: .16, response: 18,
  opacity: .86, baseClearance: .025, obstacleMargin: .26, maxVisualOffset: 1.8,
  red: 0xd34716, orange: 0xf17c17, yellow: 0xffc450,
  smokeCount: 5, smokeStartHeight: 1.35, smokeRise: 2.1, smokeOpacity: .3,
  smokeBaseSize: .9, smokeGrowth: 1.25, smokeDark: 0xa8aaa4, smokeLight: 0xd0cec5,
  emberCount: 18, emberSize: .035, emberColor: 0xffad38, emberRiseSpeed: .55,
  lightColor: 0xff9b43, lightIntensity: 1.9, lightDistance: 6, lightHeight: 1,
  finishTailSeconds: 1.1,
} as const;

export interface FireVisualSurface {
  terrainHeight: (x: number, z: number) => number;
  canBurnAt?: (x: number, z: number, radius: number) => boolean;
}
