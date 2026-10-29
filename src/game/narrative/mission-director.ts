import * as THREE from 'three';
import { FireSystem, type FireUpdateContext } from '../fire/fire-system';
import type { FireSource } from '../fire/fire-source';
import { getMissionBranch, type MissionRoute } from './mission-branch';

export const ACCESS_FIRE_POSITION = new THREE.Vector3(-7, 0, -9);
export const RADIO_INTERACTION_RADIUS = 2.5;

export type MissionStage = 'idle' | 'access' | 'radio' | 'house' | 'forest' | 'complete';

export interface MissionUpdate {
  victory: boolean;
  failure: 'forest' | null;
}

/** Destino compacto consumido por el HUD, separado de sus representaciones 3D. */
export interface MissionNavigationTarget {
  position: THREE.Vector3;
  label: string;
  priority: number;
}

function createRadio(): THREE.Group {
  const radio = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x243238, roughness: 0.75 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x33b5e5,
    emissive: 0x0a3850,
    emissiveIntensity: 0.7,
    roughness: 0.5,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.25), dark);
  const support = new THREE.Mesh(new THREE.BoxGeometry(.56,.16,.36),dark);
  support.position.y = .08; radio.add(support);
  body.position.y = 0.42;
  radio.add(body);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.02), accent);
  screen.position.set(-0.12, 0.45, -0.14);
  radio.add(screen);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), dark);
  antenna.position.set(0.24, 1.02, 0);
  antenna.rotation.z = -0.18;
  radio.add(antenna);
  return radio;
}

/** Recorrido único V2. Cada incidente se crea al entrar a su etapa. */
export class MissionDirector {
  readonly object = new THREE.Group();
  readonly radioPosition: THREE.Vector3;
  private stage: MissionStage = 'idle';
  private readonly radio = createRadio();
  private accessFire: FireSource | null = null;
  private readonly criticalFires: FireSource[] = [];
  private notification = '';
  private notificationRemaining = 0;

  constructor(
    private readonly fireSystem: FireSystem,
    truckPosition: THREE.Vector3,
    private readonly getTerrainHeight: (x: number, z: number) => number,
  ) {
    this.radioPosition = truckPosition.clone().add(new THREE.Vector3(3.4, 0, -1));
    this.radioPosition.y = getTerrainHeight(this.radioPosition.x, this.radioPosition.z);
    this.radio.position.copy(this.radioPosition);
    this.radio.visible = false;
    this.object.add(this.radio);
  }

  get currentStage(): MissionStage { return this.stage; }
  get objectiveText(): string {
    switch (this.stage) {
      case 'access': return 'Contené el foco de acceso';
      case 'radio': return 'Solicitá refuerzos por radio junto al camión';
      case 'house': return 'Contené el foco de la vivienda';
      case 'forest': return 'Contené el sector del bosque';
      case 'complete': return 'Intervención completada · unidad de apoyo en camino';
      default: return 'Preparate junto al camión';
    }
  }
  get isActive(): boolean { return this.stage !== 'idle'; }
  get statusMessage(): string { return this.notificationRemaining > 0 ? this.notification : ''; }
  get routeLabel(): string { return 'Recorrido: vivienda y bosque'; }
  get forestDamageText(): string { return ''; }

  getNavigationTarget(playerPosition: THREE.Vector3, _housePosition: THREE.Vector3): MissionNavigationTarget | null {
    if (this.stage === 'radio') return this.navigationTarget(this.radioPosition, 'Radio de refuerzos', 90);
    const source = this.stage === 'access' ? this.accessFire : this.criticalFires
      .filter((fire) => fire.isActive)
      .sort((a, b) => a.object.position.distanceToSquared(playerPosition) - b.object.position.distanceToSquared(playerPosition))[0];
    if (!source?.isActive) return null;
    return this.navigationTarget(source.object.position,
      this.stage === 'access' ? 'Foco de acceso' : this.stage === 'house' ? 'Foco de la vivienda' : 'Sector del bosque', 100);
  }

  startAfterPreparation(): void {
    if (this.stage !== 'idle') return;
    this.stage = 'access';
    this.accessFire = this.createMissionFire(ACCESS_FIRE_POSITION, 1);
    this.announce('Contené el acceso; después solicitaremos apoyo por radio.');
  }
  isNearRadio(position: THREE.Vector3): boolean {
    return this.stage === 'radio' && position.distanceTo(this.radioPosition) <= RADIO_INTERACTION_RADIUS;
  }
  requestReinforcements(position: THREE.Vector3): boolean {
    if (!this.isNearRadio(position)) return false;
    this.radio.visible = false;
    this.activateSector('house');
    this.announce('Central recibió la alerta. Primero la vivienda; después el bosque.');
    return true;
  }
  update(delta: number, _context: FireUpdateContext, _houseRiskRatio: number): MissionUpdate {
    this.notificationRemaining = Math.max(0, this.notificationRemaining - delta);
    if (this.stage === 'access' && this.accessFire && !this.accessFire.isActive) {
      this.stage = 'radio';
      this.radio.visible = true;
      this.announce('Acceso contenido. Solicitá refuerzos junto al camión.');
    } else if ((this.stage === 'house' || this.stage === 'forest') &&
      this.criticalFires.length > 0 && this.criticalFires.every((source) => !source.isActive)) {
      if (this.stage === 'house') {
        this.activateSector('forest');
        this.announce('Vivienda contenida. Ahora revisá los focos del bosque.');
      } else {
        this.stage = 'complete';
        return { victory: true, failure: null };
      }
    }
    return { victory: false, failure: null };
  }
  private activateSector(route: MissionRoute): void {
    this.stage = route;
    this.criticalFires.length = 0;
    const sector = getMissionBranch(route);
    sector.criticalFirePositions.forEach((position) => {
      this.criticalFires.push(this.createMissionFire(position, sector.criticalIntensity));
    });
  }
  private createMissionFire(position: THREE.Vector3, intensity: number): FireSource {
    const grounded = position.clone();
    grounded.y = this.getTerrainHeight(grounded.x, grounded.z);
    const source = this.fireSystem.addSource({ position: grounded, intensity, kind: this.stage === 'access' ? 'common' : 'critical' });
    return source;
  }
  private navigationTarget(position: THREE.Vector3, label: string, priority: number): MissionNavigationTarget {
    return { position: position.clone(), label, priority };
  }
  private announce(message: string): void {
    this.notification = message;
    this.notificationRemaining = 5;
  }
}
