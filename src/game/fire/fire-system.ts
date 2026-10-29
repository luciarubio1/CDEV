import * as THREE from 'three';
import { FireSource, type FireSourceOptions } from './fire-source';
import type { WindState } from '../world/wind-system';
import { GAME_BALANCE } from '../balance-config';

/** Balance de oleadas: modificar estos valores para cambiar el ritmo del juego. */
export const FIRE_SPAWN_INTERVAL = GAME_BALANCE.fire.waveInterval;
export const MAX_ACTIVE_FIRES_BEFORE_SPAWN = GAME_BALANCE.fire.maxActiveFires;
export const FIRE_SPAWN_EXCLUSION_PLAYER_RADIUS = 7;
export const FIRE_SPAWN_EXCLUSION_TRUCK_RADIUS = 6;
export const FIRE_SPAWN_EXCLUSION_HOUSE_RADIUS = 8;
/** Viento: bonificación máxima a favor y freno máximo en contra. */
export const WIND_PROPAGATION_MIN_MULTIPLIER = GAME_BALANCE.fire.propagationMinMultiplier;
export const WIND_PROPAGATION_MAX_MULTIPLIER = GAME_BALANCE.fire.propagationMaxMultiplier;

const scheduledFirePositions = [
  new THREE.Vector3(-5, 0, -3),
  new THREE.Vector3(5, 0, -4),
  new THREE.Vector3(-6, 0, 4),
  new THREE.Vector3(6, 0, 5),
  new THREE.Vector3(-8, 0, -7),
  new THREE.Vector3(3, 0, -8),
];

export interface CombustibleTarget {
  position: THREE.Vector3;
  ignitionDistance?: number;
  ignitionTime?: number;
}

export interface FireUpdateContext {
  playerPosition: THREE.Vector3;
  fireTruckPosition: THREE.Vector3;
  housePosition: THREE.Vector3;
  wind?: WindState;
}

export interface WaveSpawnResult {
  wave: number;
  spawnedCount: number;
}

export interface WaterHitResult {
  hit: boolean;
  extinguished: boolean;
}

interface TrackedTarget extends CombustibleTarget {
  exposure: number;
  ignited: boolean;
}

export class FireSystem {
  readonly object = new THREE.Group();

  private readonly sources: FireSource[] = [];
  private readonly extinguishedEvents: FireSource[] = [];
  private readonly targets: TrackedTarget[] = [];
  private spawnElapsed = 0;
  private spawnWave = 0;
  private scheduledFireIndex = 0;
  private extinguishedSources = 0;
  private waveSpawningEnabled = false;
  private propagationEnabled = true;

  addSource(options: FireSourceOptions): FireSource {
    const source = new FireSource(options);
    this.sources.push(source);
    this.object.add(source.object);
    return source;
  }

  extinguishNearest(position: THREE.Vector3, radius: number, amount: number): WaterHitResult {
    const source = this.sources
      .filter((candidate) => candidate.isActive)
      .sort(
        (first, second) =>
          first.object.position.distanceTo(position) -
          second.object.position.distanceTo(position),
      )
      .find((candidate) => candidate.object.position.distanceTo(position) <= radius);

    if (!source) {
      return { hit: false, extinguished: false };
    }

    const wasActive = source.isActive;
    source.applyWaterImpact();
    source.extinguish(amount);
    const extinguished = wasActive && !source.isActive;
    if (extinguished) {
      this.extinguishedSources += 1;
      this.extinguishedEvents.push(source);
    }
    return { hit: true, extinguished };
  }

  getNearestActivePosition(position: THREE.Vector3, radius: number): THREE.Vector3 | null {
    const source = this.sources
      .filter((candidate) => candidate.isActive)
      .sort(
        (first, second) =>
          first.object.position.distanceTo(position) -
          second.object.position.distanceTo(position),
      )
      .find((candidate) => candidate.object.position.distanceTo(position) <= radius);

    return source ? source.object.position.clone() : null;
  }

  /** Tiempo de impacto que aún necesita el foco, para no gastar agua de más en el último frame. */
  getRemainingImpactTime(position: THREE.Vector3, radius: number, rate: number): number {
    let nearest: FireSource | null = null;
    let nearestDistance = radius;
    for (const source of this.sources) {
      const distance = source.object.position.distanceTo(position);
      if (source.isActive && distance <= radius && (!nearest || distance < nearestDistance)) {
        nearest = source;
        nearestDistance = distance;
      }
    }
    return nearest && rate > 0 ? nearest.remainingResistance / rate : 0;
  }

  get activeCount(): number {
    return this.sources.filter((source) => source.isActive).length;
  }

  get extinguishedCount(): number {
    return this.extinguishedSources;
  }

  get wavesStarted(): number {
    return this.spawnWave;
  }

  get activePositions(): THREE.Vector3[] {
    return this.sources
      .filter((source) => source.isActive)
      .map((source) => source.object.position.clone());
  }

  /** Apagado visual posterior a la misión: no incrementa las estadísticas del jugador. */
  containByReinforcements(amount: number): void {
    this.sources.filter((source) => source.isActive).forEach((source) => {
      source.applyWaterImpact();
      source.extinguish(amount);
      if (!source.isActive) {
        this.extinguishedEvents.push(source);
      }
    });
  }

  /** Consume eventos de extinciÃ³n para efectos persistentes del mundo. */
  consumeExtinguishedSources(): FireSource[] {
    return this.extinguishedEvents.splice(0);
  }

  get combustiblesIgnited(): number {
    return this.targets.filter((target) => target.ignited).length;
  }

  get combustibleCount(): number {
    return this.targets.length;
  }

  trackCombustible(target: CombustibleTarget): void {
    this.targets.push({
      ...target,
      exposure: 0,
      ignited: false,
    });
  }

  setWaveSpawningEnabled(enabled: boolean): void {
    this.waveSpawningEnabled = enabled;
  }

  setPropagationEnabled(enabled: boolean): void {
    this.propagationEnabled = enabled;
  }

  /** Registra un foco controlado como oleada para las estadÃ­sticas de misiÃ³n. */
  addModerateWaveSource(options: FireSourceOptions): FireSource {
    this.spawnWave += 1;
    return this.addSource(options);
  }

  update(delta: number, context: FireUpdateContext): WaveSpawnResult | null {
    this.sources.forEach((source) => source.update(delta, context.wind));

    if (this.propagationEnabled) {
      this.targets.forEach((target) => {
      if (target.ignited) {
        return;
      }

      const closestSource = this.sources.reduce(
        (closest, source) => {
          const distance = source.object.position.distanceTo(target.position);
          return distance < closest.distance
            ? { distance, source }
            : closest;
        },
        { distance: Number.POSITIVE_INFINITY, source: null as FireSource | null },
      );
      const ignitionDistance = target.ignitionDistance ?? 6;

      if (
        closestSource.source &&
        closestSource.distance <= ignitionDistance
      ) {
        const windMultiplier = this.getWindPropagationMultiplier(
          closestSource.source.object.position,
          target.position,
          context.wind,
        );
        target.exposure +=
          delta * closestSource.source.intensityValue *
          (1 - closestSource.distance / ignitionDistance) * windMultiplier;
        const ignitionTime = target.ignitionTime ?? 8;
        if (
          target.exposure >= ignitionTime &&
          this.activeCount < MAX_ACTIVE_FIRES_BEFORE_SPAWN &&
          this.isSafeSpawnPosition(target.position, context)
        ) {
          this.addSource({
            position: target.position.clone(),
            intensity: 0.85,
          });
          target.ignited = true;
        }
      }
      });
    }

    if (!this.waveSpawningEnabled || this.activeCount >= MAX_ACTIVE_FIRES_BEFORE_SPAWN) {
      return null;
    }

    this.spawnElapsed += delta;
    if (this.spawnElapsed < FIRE_SPAWN_INTERVAL) {
      return null;
    }

    this.spawnElapsed -= FIRE_SPAWN_INTERVAL;
    const position = this.getNextScheduledFirePosition(context);
    if (!position) {
      return null;
    }

    this.spawnWave += 1;
    this.addSource({ position, intensity: 0.75 });
    return { wave: this.spawnWave, spawnedCount: 1 };
  }

  private getNextScheduledFirePosition(context: FireUpdateContext): THREE.Vector3 | null {
    for (let index = 0; index < scheduledFirePositions.length; index += 1) {
      const position = scheduledFirePositions[
        this.scheduledFireIndex % scheduledFirePositions.length
      ];
      this.scheduledFireIndex += 1;
      if (this.isSafeSpawnPosition(position, context)) {
        return position.clone();
      }
    }
    return null;
  }

  isSafeSpawnPosition(position: THREE.Vector3, context: FireUpdateContext): boolean {
    return (
      position.distanceTo(context.playerPosition) >= FIRE_SPAWN_EXCLUSION_PLAYER_RADIUS &&
      position.distanceTo(context.fireTruckPosition) >= FIRE_SPAWN_EXCLUSION_TRUCK_RADIUS &&
      position.distanceTo(context.housePosition) >= FIRE_SPAWN_EXCLUSION_HOUSE_RADIUS
    );
  }

  private getWindPropagationMultiplier(
    source: THREE.Vector3,
    target: THREE.Vector3,
    wind?: WindState,
  ): number {
    if (!wind) return 1;
    const deltaX = target.x - source.x;
    const deltaZ = target.z - source.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance < 0.001) return 1;
    const alignment = (deltaX / distance) * wind.direction.x + (deltaZ / distance) * wind.direction.z;
    const range = WIND_PROPAGATION_MAX_MULTIPLIER - 1;
    return THREE.MathUtils.clamp(
      1 + alignment * range * wind.intensity,
      WIND_PROPAGATION_MIN_MULTIPLIER,
      WIND_PROPAGATION_MAX_MULTIPLIER,
    );
  }

  get count(): number {
    return this.sources.length;
  }
}
