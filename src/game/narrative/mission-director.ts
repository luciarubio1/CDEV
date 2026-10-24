import * as THREE from 'three';
import { FireSystem, type FireUpdateContext } from '../fire/fire-system';
import type { FireSource } from '../fire/fire-source';
import {
  getMissionBranch,
  type MissionBranchConfig,
  type MissionRoute,
} from './mission-branch';

export const ACCESS_FIRE_POSITION = new THREE.Vector3(-7, 0, -9);
export const RADIO_INTERACTION_RADIUS = 2.5;

type MissionStage = 'idle' | 'access' | 'radio' | 'decision' | 'critical' | 'hold' | 'victory';

interface MissionMarker {
  source: FireSource;
  object: THREE.Group;
}

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

function createMarker(color: number): THREE.Group {
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.13, 3.2, 12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    }),
  );
  beam.position.y = 2;
  marker.add(beam);
  const pointer = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 0.9, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }),
  );
  pointer.position.y = 0.7;
  pointer.rotation.x = Math.PI;
  marker.add(pointer);
  return marker;
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

function createForestZone(
  config: MissionBranchConfig,
  getTerrainHeight: (x: number, z: number) => number,
): THREE.Mesh | null {
  if (!config.forestZone) {
    return null;
  }
  const { position, radius } = config.forestZone;
  const zone = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 32),
    new THREE.MeshBasicMaterial({
      color: config.markerColor,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    }),
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(position.x, getTerrainHeight(position.x, position.z) + 0.08, position.z);
  return zone;
}

/** Controla los objetivos narrativos y reutiliza la configuración de cada ruta. */
export class MissionDirector {
  readonly object = new THREE.Group();
  readonly radioPosition: THREE.Vector3;

  private stage: MissionStage = 'idle';
  private readonly radio = createRadio();
  private readonly markers: MissionMarker[] = [];
  private accessFire: FireSource | null = null;
  private readonly criticalFires: FireSource[] = [];
  private branch: MissionBranchConfig | null = null;
  private forestZone: THREE.Mesh | null = null;
  private holdElapsed = 0;
  private moderateFiresSpawned = 0;
  private notification = '';
  private notificationRemaining = 0;
  private forestDamageBaseline = 0;
  private forestDamage = 0;
  private forestDamageCheckArmed = false;

  constructor(
    private readonly fireSystem: FireSystem,
    truckPosition: THREE.Vector3,
    private readonly getTerrainHeight: (x: number, z: number) => number,
    private readonly getForestBurnedCount: (center: THREE.Vector3, radius: number) => number,
    private readonly getForestAffectedCount: (center: THREE.Vector3, radius: number) => number,
  ) {
    this.radioPosition = truckPosition.clone().add(new THREE.Vector3(3.4, 0, -1));
    this.radioPosition.y = this.getTerrainHeight(this.radioPosition.x, this.radioPosition.z);
    this.radio.position.copy(this.radioPosition);
    this.radio.visible = false;
    this.object.add(this.radio);
  }

  get objectiveText(): string {
    switch (this.stage) {
      case 'access': return 'Objetivo 1: contené el foco de acceso';
      case 'radio': return 'Objetivo 2: solicitá refuerzos por radio';
      case 'decision': return 'Elegí una prioridad para la misión';
      case 'critical': return this.branch?.objective ?? '';
      case 'hold':
        return `Refuerzos en camino: ${Math.ceil(Math.max(0, (this.branch?.finalHoldDuration ?? 0) - this.holdElapsed))} s`;
      case 'victory': return 'Misión cumplida';
      default: return 'Protegé la vivienda hasta la llegada de refuerzos';
    }
  }

  get isActive(): boolean { return this.stage !== 'idle'; }
  get isDecisionPending(): boolean { return this.stage === 'decision'; }
  get statusMessage(): string { return this.notificationRemaining > 0 ? this.notification : ''; }
  get route(): MissionRoute | null { return this.branch?.route ?? null; }
  get routeLabel(): string { return this.branch?.hudLabel ?? ''; }
  get victoryTitle(): string { return this.branch?.victoryTitle ?? 'Misión cumplida'; }
  get victoryReflection(): string { return this.branch?.victoryReflection ?? ''; }
  get forestDamageText(): string {
    if (this.branch?.route !== 'forest') return '';
    const limit = this.forestDamageLimit;
    return `Bosque protegido: ${this.forestDamage}/${limit} áreas afectadas`;
  }

  getNavigationTarget(playerPosition: THREE.Vector3, housePosition: THREE.Vector3): MissionNavigationTarget | null {
    if (this.stage === 'access' && this.accessFire?.isActive) {
      return this.navigationTarget(this.accessFire.object.position, 'Foco de acceso', 100);
    }
    if (this.stage === 'radio') {
      return this.navigationTarget(this.radioPosition, 'Radio de refuerzos', 90);
    }
    if (this.stage === 'critical') {
      const activeFire = this.criticalFires
        .filter((source) => source.isActive)
        .sort((first, second) =>
          Math.hypot(first.object.position.x - playerPosition.x, first.object.position.z - playerPosition.z) -
          Math.hypot(second.object.position.x - playerPosition.x, second.object.position.z - playerPosition.z),
        )[0];
      if (activeFire) {
        const label = this.branch?.route === 'forest' ? 'Foco crítico: bosque' : 'Foco crítico: vivienda';
        return this.navigationTarget(activeFire.object.position, label, 80);
      }
      if (this.branch?.route === 'forest' && this.branch.forestZone) {
        return this.navigationTarget(this.branch.forestZone.position, 'Bosque nativo', 70);
      }
    }
    if (this.stage === 'hold') {
      return this.navigationTarget(housePosition, 'Proteger la vivienda', 60);
    }
    return null;
  }

  startAfterPreparation(): void {
    if (this.stage !== 'idle') return;
    this.stage = 'access';
    this.accessFire = this.createMissionFire(ACCESS_FIRE_POSITION, 1, 0xffb347);
    this.announce('Protegé la vivienda hasta la llegada de refuerzos.');
  }

  isNearRadio(position: THREE.Vector3): boolean {
    return this.stage === 'radio' && position.distanceTo(this.radioPosition) <= RADIO_INTERACTION_RADIUS;
  }

  requestReinforcements(position: THREE.Vector3): boolean {
    if (!this.isNearRadio(position)) return false;
    this.stage = 'decision';
    this.radio.visible = false;
    this.announce('Central recibió la alerta. Elegí una prioridad para la misión.');
    return true;
  }

  selectBranch(route: MissionRoute): boolean {
    if (this.stage !== 'decision') return false;
    this.branch = getMissionBranch(route);
    this.stage = 'critical';
    this.forestDamage = 0;
    this.forestDamageCheckArmed = false;
    // Incluye focos ya ardiendo para que, al apagarse, no se atribuyan a esta misión.
    this.forestDamageBaseline = this.readForestAffectedCount(this.branch);
    this.branch.criticalFirePositions.forEach((position) => {
      this.criticalFires.push(
        this.createMissionFire(position, this.branch?.criticalIntensity ?? 1, this.branch?.markerColor ?? 0xe63946),
      );
    });
    this.forestZone = createForestZone(this.branch, this.getTerrainHeight);
    if (this.forestZone) this.object.add(this.forestZone);
    this.announce(this.branch.npcMessage);
    return true;
  }

  update(
    delta: number,
    context: FireUpdateContext,
    houseRiskRatio: number,
  ): MissionUpdate {
    this.notificationRemaining = Math.max(0, this.notificationRemaining - delta);
    this.updateMarkers(delta);

    if (this.stage === 'access' && this.accessFire && !this.accessFire.isActive) {
      this.stage = 'radio';
      this.radio.visible = true;
      this.announce('Foco de acceso contenido. Pedí refuerzos junto al camión.');
    }

    if (this.stage === 'critical' && this.branch?.route === 'forest') {
      this.forestDamage = Math.max(0, this.readForestBurnedCount(this.branch) - this.forestDamageBaseline);
      // La decisión siempre recibe al menos un ciclo de simulación antes de poder fallar.
      if (this.forestDamageCheckArmed && this.forestDamage > this.forestDamageLimit) {
        return { victory: false, failure: 'forest' };
      }
      this.forestDamageCheckArmed = true;
    }

    const criticalFiresContained =
      this.criticalFires.length > 0 && this.criticalFires.every((source) => !source.isActive);
    const routeConditionMet = this.branch?.route === 'house'
      ? houseRiskRatio < 0.25
      : this.forestDamage <= this.forestDamageLimit;
    if (this.stage === 'critical' && criticalFiresContained && routeConditionMet) {
      this.stage = 'hold';
      this.holdElapsed = 0;
      if (this.forestZone) {
        this.object.remove(this.forestZone);
        this.forestZone = null;
      }
      this.announce('Objetivo contenido. Resistí hasta que lleguen los refuerzos.');
    }

    if (this.stage === 'hold') {
      this.holdElapsed += delta;
      this.spawnFinalFires(context);
      if (this.holdElapsed >= (this.branch?.finalHoldDuration ?? 0)) {
        this.stage = 'victory';
        return { victory: true, failure: null };
      }
    }
    return { victory: false, failure: null };
  }

  private createMissionFire(position: THREE.Vector3, intensity: number, color: number): FireSource {
    const groundedPosition = position.clone();
    groundedPosition.y = this.getTerrainHeight(groundedPosition.x, groundedPosition.z);
    const source = this.fireSystem.addSource({ position: groundedPosition, intensity });
    const marker = createMarker(color);
    marker.position.copy(groundedPosition);
    this.object.add(marker);
    this.markers.push({ source, object: marker });
    return source;
  }

  private spawnFinalFires(context: FireUpdateContext): void {
    while (
      this.branch &&
      this.moderateFiresSpawned < this.branch.finalMaxModerateFires &&
      this.holdElapsed >= this.branch.finalFireTimes[this.moderateFiresSpawned]
    ) {
      const position = this.branch.finalFirePositions[this.moderateFiresSpawned];
      this.moderateFiresSpawned += 1;
      if (this.fireSystem.activeCount < this.branch.finalMaxModerateFires && this.fireSystem.isSafeSpawnPosition(position, context)) {
        const source = this.fireSystem.addModerateWaveSource({
          position: new THREE.Vector3(position.x, this.getTerrainHeight(position.x, position.z), position.z),
          intensity: 0.65,
        });
        const marker = createMarker(0x58c7e8);
        marker.position.copy(source.object.position);
        this.object.add(marker);
        this.markers.push({ source, object: marker });
        this.announce('Nuevo foco detectado. Los refuerzos ya están en camino.');
      }
    }
  }

  private updateMarkers(delta: number): void {
    this.markers.forEach((marker) => {
      marker.object.visible = marker.source.isActive;
      marker.object.rotation.y += delta * 0.8;
    });
  }

  private navigationTarget(position: THREE.Vector3, label: string, priority: number): MissionNavigationTarget | null {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
    return { position: position.clone(), label, priority };
  }

  private get forestDamageLimit(): number {
    const configuredLimit = this.branch?.forestBurnedElementLimit;
    return Number.isFinite(configuredLimit) && configuredLimit! >= 0
      ? Math.floor(configuredLimit!)
      : Number.MAX_SAFE_INTEGER;
  }

  private readForestBurnedCount(branch: MissionBranchConfig): number {
    return this.readForestVegetationCount(branch, this.getForestBurnedCount);
  }

  private readForestAffectedCount(branch: MissionBranchConfig): number {
    return this.readForestVegetationCount(branch, this.getForestAffectedCount);
  }

  private readForestVegetationCount(
    branch: MissionBranchConfig,
    readCount: (center: THREE.Vector3, radius: number) => number,
  ): number {
    const zone = branch.forestZone;
    if (!zone || !Number.isFinite(zone.radius) || zone.radius < 0) return 0;
    const count = readCount(zone.position, zone.radius);
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  }

  private announce(message: string): void {
    this.notification = message;
    this.notificationRemaining = 4;
  }
}
