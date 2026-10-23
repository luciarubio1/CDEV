import * as THREE from 'three';
import { getTerrainHeight, TERRAIN_COLORS } from './terrain';

export const ENVIRONMENT_COLORS = {
  road: 0x755333,
  safeZone: 0x77834f,
  mountainNear: 0x56564c,
  mountainFar: 0x737064,
  burnedGround: 0x39362f,
};

function createRoad(): THREE.Mesh {
  const points = [
    new THREE.Vector2(-16, 16),
    new THREE.Vector2(-8, 14),
    new THREE.Vector2(1, 12),
    new THREE.Vector2(10, 10),
  ];
  const width = 1.35;
  const vertices: number[] = [];
  const indices: number[] = [];

  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const direction = next.clone().sub(previous).normalize();
    const perpendicular = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(width);
    [1, -1].forEach((side) => {
      const position = point.clone().addScaledVector(perpendicular, side);
      vertices.push(position.x, getTerrainHeight(position.x, position.y) + 0.055, position.y);
    });
    if (index > 0) {
      const base = index * 2;
      indices.push(base - 2, base, base - 1, base, base + 1, base - 1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: ENVIRONMENT_COLORS.road, roughness: 1 }),
  );
  road.receiveShadow = true;
  return road;
}

function createGroundPatch(x: number, z: number, radius: number, color: number, opacity: number): THREE.Mesh {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(x, getTerrainHeight(x, z) + 0.035, z);
  return patch;
}

function createMountain(x: number, z: number, radius: number, height: number, color: number): THREE.Mesh {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 7),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
  );
  mountain.position.set(x, height / 2 - 0.8, z);
  mountain.rotation.y = (x + z) * 0.09;
  return mountain;
}

/** Elementos procedurales de composición: camino, suelo quemado y sierras lejanas. */
export function createSierraEnvironment(): THREE.Group {
  const environment = new THREE.Group();
  environment.add(createRoad());
  environment.add(createGroundPatch(-16, 16, 5.8, ENVIRONMENT_COLORS.safeZone, 0.16));
  environment.add(createGroundPatch(-7, -9, 4.5, ENVIRONMENT_COLORS.burnedGround, 0.32));
  environment.add(createGroundPatch(5.5, 8, 3.9, ENVIRONMENT_COLORS.burnedGround, 0.25));

  [
    [-42, -32, 13, 16, ENVIRONMENT_COLORS.mountainFar],
    [-18, -43, 11, 14, ENVIRONMENT_COLORS.mountainFar],
    [18, -40, 15, 19, ENVIRONMENT_COLORS.mountainNear],
    [43, -18, 17, 22, ENVIRONMENT_COLORS.mountainFar],
    [38, 28, 14, 17, ENVIRONMENT_COLORS.mountainNear],
    [-35, 35, 16, 20, ENVIRONMENT_COLORS.mountainFar],
  ].forEach(([x, z, radius, height, color]) => {
    environment.add(createMountain(x, z, radius, height, color));
  });

  [
    [-22, -14, 1.9], [21, -17, 2.3], [22, 16, 1.7],
  ].forEach(([x, z, scale]) => {
    const formation = new THREE.Mesh(
      new THREE.DodecahedronGeometry(scale, 1),
      new THREE.MeshStandardMaterial({ color: TERRAIN_COLORS.ash, roughness: 1, flatShading: true }),
    );
    formation.position.set(x, getTerrainHeight(x, z) + scale * 0.65, z);
    formation.scale.y = 1.35;
    formation.rotation.set(0.2, x * 0.3, 0.12);
    formation.castShadow = true;
    formation.receiveShadow = true;
    environment.add(formation);
  });
  return environment;
}
