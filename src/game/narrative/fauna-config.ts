import * as THREE from 'three';

const point = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
export const FAUNA_CONFIG = {
  companionSpeed: 0.8,
  followRadius: 5,
  interactionRadius: 3,
  refugeSpeed: 1.2,
  veterinarianSpeed: 1.4,
  evaluationSeconds: 2.5,
  routeA: [point(-7, 11.8), point(-6, 13), point(-3.8, 14.3), point(-1.8, 15.3)],
  routeB: [point(-1.8, 15.3), point(0.8, 16.8), point(3, 17.6), point(3.5, 18.3)],
  refugeRoute: [point(-0.2, 16.3), point(0.8, 17.5), point(0.2, 19.5)],
  fox: point(5.6, 17),
  veterinarianRoute: [point(-7.3, 9.5), point(-7, 11), point(-6, 13), point(-3.8, 14.3), point(-1.8, 15.3), point(0.8, 16.8), point(3, 17.6), point(4.5, 17.3)],
  carrier: point(-6.5, 14.5),
} as const;

/** Corredor reservado para no cargar vegetación/rocas sobre actores y refugio. */
export function isFaunaArea(x: number, z: number): boolean {
  return x >= -8 && x <= 7 && z >= 12 && z <= 21;
}
