export const ROAD_POINTS = [[-16,16],[-8,14],[1,12],[10,10]] as const;
export const ROAD_HALF_WIDTH = 1.35;
export function distanceToRoad(x: number, z: number): number {
  let minimum=Infinity;
  for(let i=1;i<ROAD_POINTS.length;i++) {
    const a=ROAD_POINTS[i-1], b=ROAD_POINTS[i], dx=b[0]-a[0], dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    minimum=Math.min(minimum,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
  }
  return minimum;
}
