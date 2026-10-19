import * as THREE from 'three';
import { FireSource, type FireSourceOptions } from './fire-source';

export interface CombustibleTarget {
  position: THREE.Vector3;
  ignitionDistance?: number;
  ignitionTime?: number;
}

interface TrackedTarget extends CombustibleTarget {
  exposure: number;
  ignited: boolean;
}

export class FireSystem {
  readonly object = new THREE.Group();

  private readonly sources: FireSource[] = [];
  private readonly targets: TrackedTarget[] = [];

  addSource(options: FireSourceOptions): FireSource {
    const source = new FireSource(options);
    this.sources.push(source);
    this.object.add(source.object);
    return source;
  }

  extinguishNearest(position: THREE.Vector3, radius: number, amount: number): boolean {
    const source = this.sources
      .filter((candidate) => candidate.isActive)
      .sort(
        (first, second) =>
          first.object.position.distanceTo(position) -
          second.object.position.distanceTo(position),
      )
      .find((candidate) => candidate.object.position.distanceTo(position) <= radius);

    if (!source) {
      return false;
    }

    source.extinguish(amount);
    return true;
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

  get activeCount(): number {
    return this.sources.filter((source) => source.isActive).length;
  }

  get activePositions(): THREE.Vector3[] {
    return this.sources
      .filter((source) => source.isActive)
      .map((source) => source.object.position.clone());
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

  update(delta: number): void {
    this.sources.forEach((source) => source.update(delta));

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
        target.exposure +=
          delta * closestSource.source.intensityValue *
          (1 - closestSource.distance / ignitionDistance);
        const ignitionTime = target.ignitionTime ?? 8;
        if (target.exposure >= ignitionTime) {
          this.addSource({
            position: target.position.clone(),
            intensity: 0.85,
          });
          target.ignited = true;
        }
      }
    });
  }

  get count(): number {
    return this.sources.length;
  }
}
