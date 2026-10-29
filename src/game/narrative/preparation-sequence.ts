import * as THREE from 'three';
import { FIRE_TRUCK_POSITION } from '../world/fire-truck';
import { truckAnchorWorld, type TruckAnchor } from '../world/truck-model';
import { createSuitStand } from '../world/preparation-equipment';
import type { CollisionSystem } from '../world/collision-system';

export const PREPARATION_INTERACTION_RADIUS = 2.4;

export type PreparationTaskId = 'suit' | 'hose' | 'connection';

export interface PreparationTask {
  id: PreparationTaskId;
  label: string;
  prompt: string;
  position: THREE.Vector3;
}

export const PREPARATION_TASKS: readonly PreparationTask[] = [
  {
    id: 'suit',
    label: 'Equiparse el traje',
    prompt: 'Presioná F para colocarte el traje',
    position: FIRE_TRUCK_POSITION.clone().add(new THREE.Vector3(-2.5, 0, 0)),
  },
  {
    id: 'hose',
    label: 'Retirar la manguera',
    prompt: 'Presioná F para retirar la manguera',
    position: FIRE_TRUCK_POSITION.clone().add(new THREE.Vector3(0, 0, 3.2)),
  },
  {
    id: 'connection',
    label: 'Conectar la manguera al camión',
    prompt: 'Presioná F para conectar la manguera',
    position: FIRE_TRUCK_POSITION.clone().add(new THREE.Vector3(2.5, 0, 0)),
  },
];

interface PreparationPoint {
  task: PreparationTask;
  object: THREE.Group;
  completed: boolean;
  interactionPosition: THREE.Vector3;
}

function createPointVisual(task: PreparationTask, truck?: THREE.Group): THREE.Group {
  const point = new THREE.Group();
  if (truck) {
    if (task.id === 'suit') {
      const stand = createSuitStand(); point.add(stand); point.position.copy(task.position);
      const anchor = new THREE.Group(); anchor.name='truck-preparation-suit';
      anchor.position.copy(task.position); truck.worldToLocal(anchor.position); truck.add(anchor);
      return point;
    }
    const anchors: Record<PreparationTaskId, TruckAnchor> = { suit: 'equipment-left', hose: 'hose-rack', connection: 'connection-right' };
    const socket = truck.getObjectByName(`truck-${anchors[task.id]}`)!;
    truckAnchorWorld(truck, anchors[task.id], point.position);
    socket.getWorldQuaternion(point.quaternion);
    const marker = new THREE.Mesh(new THREE.TorusGeometry(.21,.025,6,16), new THREE.MeshStandardMaterial({ color: 0xffd778, emissive: 0x705020, emissiveIntensity: .4 }));
    marker.name='preparation-marker'; marker.position.z = .07; point.add(marker);
    return point;
  }
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.62, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0x34483b, roughness: 0.8 }),
  );
  base.position.y = 0.08;
  point.add(base);

  const highlight = new THREE.MeshStandardMaterial({
    color: 0xffc857,
    emissive: 0x613600,
    emissiveIntensity: 0.45,
    roughness: 0.55,
  });

  if (task.id === 'suit') {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.35), highlight);
    torso.position.y = 0.72;
    point.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), highlight);
    helmet.position.y = 1.35;
    point.add(helmet);
  } else if (task.id === 'hose') {
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.08, 10, 24),
      highlight,
    );
    hose.rotation.x = Math.PI / 2;
    hose.position.y = 0.55;
    point.add(hose);
  } else {
    const connector = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.68, 16),
      highlight,
    );
    connector.rotation.z = Math.PI / 2;
    connector.position.y = 0.55;
    point.add(connector);
  }

  point.position.copy(task.position);
  point.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return point;
}

export class PreparationSequence {
  readonly object = new THREE.Group();

  private readonly points: PreparationPoint[];
  constructor(private readonly truck?: THREE.Group, collisions?: CollisionSystem) {
    this.points = PREPARATION_TASKS.map((task) => {
    const object = createPointVisual(task, truck);
    this.object.add(object);
    const interactionPosition = object.position.clone(); interactionPosition.y = task.position.y;
    return { task, object, completed: false, interactionPosition };
    });
    if (truck && collisions) {
      collisions.addCircle(PREPARATION_TASKS[0].position,.3);
      collisions.addCircle(this.points[1].interactionPosition,.24);
    }
  }
  private currentTaskIndex = 0;
  private elapsed = 0;
  private available = true;

  get isComplete(): boolean {
    return this.currentTaskIndex >= this.points.length;
  }

  get tasks(): readonly PreparationPoint[] {
    return this.points;
  }

  get currentTask(): PreparationTask | null {
    return this.points[this.currentTaskIndex]?.task ?? null;
  }

  setAvailable(available: boolean): void {
    this.available=available;
    this.object.visible = this.truck ? true : available;
    for(const point of this.points) {
      const marker=point.object.getObjectByName('preparation-marker');
      if(marker) marker.visible=available&&!point.completed;
    }
  }

  isTaskCompleted(taskId: PreparationTaskId): boolean {
    return this.points.find((point) => point.task.id === taskId)?.completed ?? false;
  }

  getNearbyTask(position: THREE.Vector3): PreparationTask | null {
    if(!this.available) return null;
    const nearbyPoint = this.points
      .filter(
        (point) =>
          position.distanceTo(point.interactionPosition) <= PREPARATION_INTERACTION_RADIUS,
      )
      .sort(
        (first, second) =>
          position.distanceTo(first.interactionPosition) -
          position.distanceTo(second.interactionPosition),
      )[0];
    return nearbyPoint?.task ?? null;
  }

  getInteractionMessage(position: THREE.Vector3): string | null {
    const nearbyTask = this.getNearbyTask(position);
    if (!nearbyTask) {
      return null;
    }
    if (nearbyTask.id === this.currentTask?.id) {
      return nearbyTask.prompt;
    }
    if (this.points.find((point) => point.task.id === nearbyTask.id)?.completed) {
      return `${nearbyTask.label} completado`;
    }
    return `Primero completá: ${this.currentTask?.label}`;
  }

  completeCurrentTask(position: THREE.Vector3): PreparationTask | null {
    const currentPoint = this.points[this.currentTaskIndex];
    if (
      !this.available || !currentPoint ||
      position.distanceTo(currentPoint.interactionPosition) > PREPARATION_INTERACTION_RADIUS
    ) {
      return null;
    }

    currentPoint.completed = true;
    if (this.truck && currentPoint.task.id === 'suit') {
      currentPoint.object.getObjectByName('stored-suit')!.visible=false;
    } else currentPoint.object.visible = false;
    if (this.truck && currentPoint.task.id === 'hose') this.truck.getObjectByName('stored-hose')!.visible=false;
    if (this.truck && currentPoint.task.id === 'connection') {
      this.truck.getObjectByName('connection-cap')!.visible=false;
      this.truck.getObjectByName('connected-hose')!.visible=true;
    }
    this.currentTaskIndex += 1;
    return currentPoint.task;
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.points.forEach((point, index) => {
      if (point.completed) {
        return;
      }
      if (this.truck) return; // Mounted highlights remain fixed to the equipment.
      point.object.position.y =
        point.task.position.y + 0.08 + Math.sin(this.elapsed * 2 + index) * 0.06;
      point.object.rotation.y += delta * 0.45;
    });
  }
}
