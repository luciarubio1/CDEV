import * as THREE from 'three';
const point = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const meeting = point(-12, 10.8);
export const RESCUE_CONFIG = {
  loadingSeconds: 9,
  placementSeconds: 4,
  veterinarianSpeed: 0.7,
  companionSpeed: 0.9,
  followRadius: 5.5,
  interactionRadius: 2.5,
  foxScale: 0.65,
  loadingVeterinarian: point(4.3, 16),
  loadingCarrier: point(5.6, 15.9),
  station: point(-10.6, 8.5),
  stationTop: 0.92,
  meeting,
  transportRoute: [point(4.3,16), point(3,17.4), point(0.8,16.8), point(-1.8,15.3), point(-3.8,14.3), point(-5.8,12.3), point(-6.5,11.2), point(-8.2,10.3), point(-9.3,10)],
  companionRoute: [point(3.5,18.3), point(3,17.4), point(0.8,16.8), point(-1.8,15.3), point(-3.8,14.3), point(-6,13), point(-7.8,11.8), point(-8.5,11), point(-10.4,11), meeting],
} as const;
