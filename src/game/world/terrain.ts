import * as THREE from 'three';
import { LANDSCAPE_COLORS as C } from './landscape-config';
import { distanceToRoad, ROAD_HALF_WIDTH } from './road-layout';

export const TERRAIN_MAP_HALF_SIZE = 25;
export const TERRAIN_SEGMENTS = 96;
/** Altura máxima aproximada de las lomas, en unidades de mundo. */
export const TERRAIN_HEIGHT_AMPLITUDE = 2.1;
export const TERRAIN_COLORS = {
  drySoil: new THREE.Color(C.soil),
  ochre: new THREE.Color(C.ochre),
  mutedGreen: new THREE.Color(C.dryGreen),
  ash: new THREE.Color(0x4d4940),
};

const FLAT_AREAS = [
  { x: -16, z: 16, radius: 6.5 },
  { x: 10, z: 10, radius: 5.5 },
];

function smoothStep(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function flatAreaInfluence(x: number, z: number): number {
  return FLAT_AREAS.reduce((influence, area) => {
    const distance = Math.hypot(x - area.x, z - area.z);
    return Math.max(influence, 1 - smoothStep(distance / area.radius));
  }, 0);
}

/** Altura procedural estable: no depende de valores aleatorios ni del tiempo. */
export function getTerrainHeight(x: number, z: number): number {
  const broadHill = Math.sin(x * 0.16) * Math.cos(z * 0.13) * 0.72;
  const secondaryHill = Math.sin((x + z) * 0.095) * 0.34;
  const distantRidge = Math.cos(z * 0.22 - x * 0.07) * 0.18;
  const terrain = (broadHill + secondaryHill + distantRidge) * TERRAIN_HEIGHT_AMPLITUDE;
  return terrain * (1 - flatAreaInfluence(x, z));
}

function getBurnInfluence(x: number, z: number): number {
  return [
    { x: -7, z: -9, radius: 4.6 },
    { x: 5.5, z: 8, radius: 4.1 },
  ].reduce((influence, area) => {
    const distance = Math.hypot(x - area.x, z - area.z);
    return Math.max(influence, 1 - smoothStep(distance / area.radius));
  }, 0);
}

/** Construye el suelo serrano con variación de color por vértice. */
export function createTerrain(): THREE.Mesh {
  const size = TERRAIN_MAP_HALF_SIZE * 2;
  const geometry = new THREE.PlaneGeometry(size, size, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  const roadColor=new THREE.Color(C.road), stoneColor=new THREE.Color(C.stone);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const height = getTerrainHeight(x, z);
    positions.setY(index, height);

    const variation=(Math.sin(x*.23+z*.17)+Math.sin(z*.51-x*.31)+2)/4;
    color.copy(TERRAIN_COLORS.drySoil).lerp(TERRAIN_COLORS.ochre,variation*.5);
    color.lerp(stoneColor,(Math.sin(x*.42-z*.27)+1)*.1);
    color.lerp(TERRAIN_COLORS.mutedGreen,(Math.sin(x*.14+z*.21)+1)*.14);
    color.lerp(roadColor,1-smoothStep((distanceToRoad(x,z)-ROAD_HALF_WIDTH)/.95));
    color.lerp(TERRAIN_COLORS.ash, getBurnInfluence(x, z) * 0.7);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }),
  );
  terrain.receiveShadow = true;
  return terrain;
}
