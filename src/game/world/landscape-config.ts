/** Decorative quality never changes the playable combustible inventory. */
export const LANDSCAPE_SETTINGS = {
  ridgeSegments: 76, ridgeDepthSegments: 12, ridgeHeight: 1, apronRings: 8,
  detailDensity: 1, maxDetailClusters: 90, grassPerCluster: 5,
  treeTrunkRadius: .32, canopyScale: 1,
  sky: 0xb9bbaa, fogNear: 48, fogFar: 125, cameraFar: 150,
} as const;
export const LANDSCAPE_COLORS = {
  soil: 0x918064, ochre: 0xab9368, stone: 0x85877b, dryGreen: 0x7a8258,
  foliage: [0x798357,0x687951,0x8a895e], bark: 0x625745,
  road: 0x9b8667, grass: 0xaaa075, branch: 0x76634d,
  nearRidge: 0x6a796c, farRidge: 0x93a198,
};
// Existing gameplay placements: keep order, count and ignition parameters unchanged.
export const TREE_PLACEMENTS = [[-15,-12],[-12,-14],[-9,-12],[-5,-15],[2,-14],[6,-12],[13,-11],[16,-8],[-17,-4],[-14,-6],[-11,-4],[-8,-7],[14,-1],[17,3],[15,6],[-11,9]] as const;
export const BUSH_PLACEMENTS = [[-15,-9],[-11,-10],[-12,-1],[0,-9],[7,-11],[-15,9],[1,15],[12,11]] as const;
export const ROCK_PLACEMENTS = [[-7,-3,1.2],[3,-5,.9],[11,2,1.1],[-4,8,1.3],[4,9,.8],[14,-8,1]] as const;
export function landscapeNoise(seed: number): number { const value = Math.sin(seed*127.1+311.7)*43758.5453; return value-Math.floor(value); }
