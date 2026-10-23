import * as THREE from 'three';

export type MissionRoute = 'house' | 'forest';

export interface MissionBranchConfig {
  route: MissionRoute;
  label: string;
  hudLabel: string;
  objective: string;
  criticalFirePositions: readonly THREE.Vector3[];
  criticalIntensity: number;
  markerColor: number;
  finalHoldDuration: number;
  finalMaxModerateFires: number;
  finalFirePositions: readonly THREE.Vector3[];
  finalFireTimes: readonly number[];
  forestAffectedLimit?: number;
  forestZone?: { position: THREE.Vector3; radius: number };
  npcMessage: string;
  victoryTitle: string;
  victoryReflection: string;
}

export const REAL_EMERGENCY_NOTICE =
  'Esta experiencia es ficción educativa. Ante un incendio real, avisá a los servicios de emergencia y seguí las indicaciones de las autoridades.';

export const MISSION_BRANCHES: Record<MissionRoute, MissionBranchConfig> = {
  house: {
    route: 'house',
    label: 'Priorizar la vivienda',
    hudLabel: 'Ruta: vivienda',
    objective: 'Objetivo 3: evitá que el fuego alcance la vivienda',
    criticalFirePositions: [new THREE.Vector3(5.5, 0, 8)],
    criticalIntensity: 1.05,
    markerColor: 0xe63946,
    finalHoldDuration: 30,
    finalMaxModerateFires: 2,
    finalFirePositions: [new THREE.Vector3(-10, 0, -10), new THREE.Vector3(4, 0, -12)],
    finalFireTimes: [10, 20],
    npcMessage: 'Priorizá la vivienda. Mantené el riesgo bajo mientras llegan los refuerzos.',
    victoryTitle: 'La vivienda fue protegida',
    victoryReflection:
      'La detección temprana, la comunicación y la protección de zonas habitadas reducen el impacto de los incendios.',
  },
  forest: {
    route: 'forest',
    label: 'Priorizar el bosque nativo',
    hudLabel: 'Ruta: bosque nativo',
    objective: 'Objetivo 3: contené el avance hacia el bosque nativo',
    criticalFirePositions: [new THREE.Vector3(-13, 0, -10), new THREE.Vector3(-10, 0, -13)],
    criticalIntensity: 0.82,
    markerColor: 0x55b86a,
    finalHoldDuration: 28,
    finalMaxModerateFires: 1,
    finalFirePositions: [new THREE.Vector3(5, 0, -12)],
    finalFireTimes: [14],
    forestAffectedLimit: 5,
    forestZone: { position: new THREE.Vector3(-12, 0, -11), radius: 5.2 },
    npcMessage: 'Priorizá el bosque nativo. Contené los focos antes de que el daño a la vegetación supere el límite.',
    victoryTitle: 'El bosque nativo fue contenido',
    victoryReflection:
      'La protección de flora, fauna y suelo es parte de la recuperación de los ecosistemas afectados por el fuego.',
  },
};

export function getMissionBranch(route: MissionRoute): MissionBranchConfig {
  return MISSION_BRANCHES[route];
}
