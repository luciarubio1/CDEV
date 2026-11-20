import * as THREE from 'three';
import { FireSystem, type FireUpdateContext } from '../fire/fire-system';
import type { FireSource } from '../fire/fire-source';
import { getMissionBranch, type MissionRoute } from './mission-branch';

export const ACCESS_FIRE_POSITION = new THREE.Vector3(-7, 0, -9);
export const RADIO_INTERACTION_RADIUS = 2.5;
const ACCESS_CONFIRMATION_SECONDS = 1.5;

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

interface RadioVisual { object: THREE.Group; indicator: THREE.MeshStandardMaterial; }
function createRadio(): RadioVisual {
  const radio = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x243238, roughness: 0.75 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x33b5e5,
    emissive: 0x0a3850,
    emissiveIntensity: 0.7,
    roughness: 0.5,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.48,.58,.12,8), new THREE.MeshStandardMaterial({ color: 0x394542, roughness: .9 }));
  base.position.y = .06;
  const support = new THREE.Mesh(new THREE.BoxGeometry(.66,.18,.44),dark);
  support.position.y = .18;
  const body = new THREE.Mesh(new THREE.BoxGeometry(.86,.62,.34), dark);
  body.position.y = .55;
  const face = new THREE.Mesh(new THREE.BoxGeometry(.66,.46,.025), new THREE.MeshStandardMaterial({ color: 0x1b272b, roughness: .72 }));
  face.position.set(0,.55,-.185);
  radio.add(base, support, body, face);
  // Frente legible a distancia: pantalla, rejilla y un único PTT grande.
  const screen = new THREE.Mesh(new THREE.BoxGeometry(.24,.16,.022), accent);
  screen.position.set(-.18,.67,-.207);
  radio.add(screen);
  for (const y of [.43,.51,.59]) {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(.23,.025,.026), new THREE.MeshStandardMaterial({ color: 0x687773, roughness: .8 }));
    grille.position.set(.15,y,-.208); radio.add(grille);
  }
  const button = new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.035,10), new THREE.MeshStandardMaterial({ color: 0xd46a43, roughness: .6 }));
  button.rotation.x = Math.PI / 2; button.position.set(.31,.7,-.21); radio.add(button);
  const indicator = new THREE.MeshStandardMaterial({ color: 0x8ee6d3, emissive: 0x0d5a50, emissiveIntensity: .55, roughness: .45 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.045,8,6), indicator);
  lamp.position.set(-.31,.43,-.215); radio.add(lamp);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), dark);
  antenna.position.set(.28, 1.14, 0);
  antenna.rotation.z = -0.18;
  radio.add(antenna);
  radio.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
  return { object: radio, indicator };
}

/** Recorrido único V2. Cada incidente se crea al entrar a su etapa. */
export class MissionDirector {
  readonly object = new THREE.Group();
  readonly radioPosition: THREE.Vector3;
  private stage: MissionStage = 'idle';
  private readonly radioVisual = createRadio();
  private readonly radio = this.radioVisual.object;
  private radioSignalRemaining = 0;
  private accessFire: FireSource | null = null;
  private accessExtinguishedElapsed = 0;
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
    const approach = ACCESS_FIRE_POSITION.clone().sub(this.radioPosition);
    this.radio.rotation.y = Math.atan2(-approach.x, -approach.z);
    this.radio.visible = false;
    this.object.add(this.radio);
  }

  get currentStage(): MissionStage { return this.stage; }
  get objectiveText(): string {
    switch (this.stage) {
      case 'access': return 'Apagá el fuego del camino';
      case 'radio': return 'Pedí ayuda por radio';
      case 'house': return 'Protegé la casa';
      case 'forest': return 'Protegé el bosque';
      case 'complete': return '¡Fuego controlado!';
      default: return 'Prepará el equipo';
    }
  }
  get isActive(): boolean { return this.stage !== 'idle'; }
  get statusMessage(): string { return this.notificationRemaining > 0 ? this.notification : ''; }
  get routeLabel(): string { return 'Recorrido: vivienda y bosque'; }
  get forestDamageText(): string { return ''; }

  getNavigationTarget(playerPosition: THREE.Vector3, _housePosition: THREE.Vector3): MissionNavigationTarget | null {
    if (this.stage === 'radio') return this.navigationTarget(this.radioPosition, 'Radio', 90);
    const source = this.stage === 'access' ? this.accessFire : this.criticalFires
      .filter((fire) => fire.isActive)
      .sort((a, b) => a.object.position.distanceToSquared(playerPosition) - b.object.position.distanceToSquared(playerPosition))[0];
    if (!source?.isActive) return null;
    return this.navigationTarget(source.object.position,
      this.stage === 'access' ? 'Fuego del camino' : this.stage === 'house' ? 'Fuego de la vivienda' : 'Fuego del bosque', 100);
  }

  startAfterPreparation(): void {
    if (this.stage !== 'idle') return;
    this.stage = 'access';
    this.accessFire = this.createMissionFire(ACCESS_FIRE_POSITION, 1);
    this.accessExtinguishedElapsed = 0;
  }
  isNearRadio(position: THREE.Vector3): boolean {
    return this.stage === 'radio' && position.distanceTo(this.radioPosition) <= RADIO_INTERACTION_RADIUS;
  }
  requestReinforcements(position: THREE.Vector3): boolean {
    if (!this.isNearRadio(position)) return false;
    // El objetivo cambia de inmediato, pero el indicador confirma el uso antes
    // de ocultar la radio; el pitido se dispara desde la misma interacción.
    this.radioSignalRemaining = .55;
    this.radio.visible = true;
    this.activateSector('house');
    this.announce('¡Ayuda en camino! Protegé la casa y después el bosque.');
    return true;
  }
  update(delta: number, _context: FireUpdateContext, _houseRiskRatio: number): MissionUpdate {
    this.notificationRemaining = Math.max(0, this.notificationRemaining - delta);
    if (this.radioSignalRemaining > 0) {
      this.radioSignalRemaining = Math.max(0, this.radioSignalRemaining - delta);
      this.radioVisual.indicator.emissiveIntensity = 2.2 + Math.sin(this.radioSignalRemaining * 38) * .7;
      if (this.radioSignalRemaining === 0 && this.stage !== 'radio') {
        this.radio.visible = false;
        this.radioVisual.indicator.emissiveIntensity = .55;
      }
    }
    if (this.stage === 'access' && this.accessFire && !this.accessFire.isActive) {
      this.accessExtinguishedElapsed += delta;
    }
    if (this.stage === 'access' &&
      this.accessFire?.isFullyExtinguished &&
      this.accessExtinguishedElapsed >= ACCESS_CONFIRMATION_SECONDS) {
      this.stage = 'radio';
      this.radio.visible = true;
      this.announce('¡Buen trabajo! Volvé al camión y pedí ayuda por radio.');
    } else if ((this.stage === 'house' || this.stage === 'forest') &&
      this.criticalFires.length > 0 && this.criticalFires.every((source) => !source.isActive)) {
      if (this.stage === 'house') {
        this.activateSector('forest');
        this.announce('¡Casa protegida! Ahora cuidá el bosque.');
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
