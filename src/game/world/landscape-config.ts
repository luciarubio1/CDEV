/** Decorative quality never changes the playable combustible inventory. */
export const LANDSCAPE_SETTINGS = {
  ridgeSegments: 76, ridgeDepthSegments: 12, ridgeHeight: 1, apronRings: 8,
  detailDensity: 1, maxDetailClusters: 90, grassPerCluster: 5,
  treeTrunkRadius: .32, canopyScale: 1,
  // Dry late-afternoon atmosphere: warm ground plane, cooler distant air.
  // Keep the fog inside the camera range so the playable valley reads separately
  // from the non-walkable apron and the successive sierras.
  sky: 0xc6baa1, fogNear: 42, fogFar: 138, cameraFar: 160,
  hemisphereSky: 0xf0cfa8, hemisphereGround: 0x52605a, hemisphereIntensity: 1.28,
  sun: 0xffd29a, sunIntensity: 2.35, sunPosition: [-14, 16, 9] as const,
} as const;
export const LANDSCAPE_COLORS = {
  // Slightly warm, mineral soil against desaturated olive vegetation.  The
  // ridge pair is deliberately cooler so it does not merge with the playfield.
  soil: 0x927958, ochre: 0xae8e5f, stone: 0x77766c, dryGreen: 0x707956,
  foliage: [0x737d52,0x5f704b,0x85845a], bark: 0x5f503d,
  road: 0xa28763, grass: 0xb0a16e, branch: 0x705d45,
  nearRidge: 0x596b68, farRidge: 0x8f9b92,
};
// Existing gameplay placements: keep order, count and ignition parameters unchanged.
export const TREE_PLACEMENTS = [[-15,-12],[-12,-14],[-9,-12],[-5,-15],[2,-14],[6,-12],[13,-11],[16,-8],[-17,-4],[-14,-6],[-11,-4],[-8,-7],[14,-1],[17,3],[15,6],[-11,9]] as const;
export const BUSH_PLACEMENTS = [[-15,-9],[-11,-10],[-12,-1],[0,-9],[7,-11],[-15,9],[1,15],[12,11]] as const;
export const ROCK_PLACEMENTS = [[-7,-3,1.2],[3,-5,.9],[11,2,1.1],[-4,8,1.3],[4,9,.8],[14,-8,1]] as const;
export function landscapeNoise(seed: number): number { const value = Math.sin(seed*127.1+311.7)*43758.5453; return value-Math.floor(value); }
