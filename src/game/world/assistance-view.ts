import * as THREE from 'three';
import { createCharacter, setCharacterGesture } from '../npc/character-model';
import { createLabel } from './visual-style';
import type { CollisionSystem } from './collision-system';
import { CareArmsView } from '../player/care-arms-view';

/** Dentro de la franja despejada que reserva isReinforcementArea. */
export const ASSISTANCE_LAYOUT = {
  table: new THREE.Vector3(-4, 0, 11),
  seat: new THREE.Vector3(-3.8, 0, 8.6),
  medic: new THREE.Vector3(-5.5, 0, 10.2),
  medicApproach: new THREE.Vector3(-4.7, 0, 9.4),
  playerReturn: new THREE.Vector3(-5.8, 0, 8),
  faunaCompanion: new THREE.Vector3(-7, 0, 11.8),
};

export const CARE_VIEW_SETTINGS = { eyeHeight: 1.35, downwardOffset: 0.43, tiltProgress: 0.2 } as const;

export class AssistanceView {
  readonly object = new THREE.Group();
  readonly medic = createCharacter('salud');
  readonly medicPosition = new THREE.Vector3();
  readonly arms = new CareArmsView();
  private careProgress = 0;
  private readonly target = new THREE.Vector3();
  private collisionsRegistered = false;

  constructor(private readonly terrain: (x: number, z: number) => number) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a7158, roughness: 0.9 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf0f2e7, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x536466, roughness: 0.6 });
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.8), wood);
    top.position.y = 0.9;
    table.add(top);
    for (const x of [-0.7, 0.7]) for (const z of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), metal);
      leg.position.set(x, 0.43, z);
      table.add(leg);
    }
    const kit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.35), white);
    kit.position.set(0, 1.15, 0);
    const kitLabel = createLabel('SALUD', .43,.12);
    kitLabel.position.set(0,1.15,-.181); kitLabel.rotation.y = Math.PI;
    table.add(kit, kitLabel);
    this.place(table, ASSISTANCE_LAYOUT.table);
    this.object.add(table);

    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.8), wood);
    seat.position.y = 0.54;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.1), wood);
    back.position.set(0, 0.92, -0.37);
    chair.add(seat, back);
    for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), metal);
      leg.position.set(x, 0.25, z);
      chair.add(leg);
    }
    this.place(chair, ASSISTANCE_LAYOUT.seat);
    this.object.add(chair);

    this.place(this.medic, ASSISTANCE_LAYOUT.medic);
    this.medicPosition.copy(this.medic.position);
    this.medic.rotation.y = Math.PI;
    this.object.add(this.medic);
    this.object.visible = false;
  }

  show(collisions: CollisionSystem): void {
    this.object.visible = true;
    if (this.collisionsRegistered) return;
    collisions.addRectangle(ASSISTANCE_LAYOUT.table, 1.8, 0.8);
    collisions.addRectangle(ASSISTANCE_LAYOUT.seat, 0.8, 0.8);
    collisions.addCircle(this.medicPosition, 0.4);
    this.collisionsRegistered = true;
  }

  renderCare(progress: number, injured: boolean): void {
    this.careProgress = progress;
    const approach = Math.min(1, progress * 3);
    this.medic.position.lerpVectors(ASSISTANCE_LAYOUT.medic, ASSISTANCE_LAYOUT.medicApproach, approach * approach * (3 - 2 * approach));
    this.medic.position.y = this.terrain(this.medic.position.x, this.medic.position.z);
    this.arms.render(progress, injured);
    const gesture = Math.sin(Math.PI * THREE.MathUtils.smoothstep(progress, 0.2, 0.8));
    setCharacterGesture(this.medic, gesture * (injured ? 1 : .35));
  }

  setCamera(camera: THREE.Camera): void {
    this.arms.attach(camera);
    camera.position.copy(ASSISTANCE_LAYOUT.seat);
    camera.position.y = this.terrain(camera.position.x, camera.position.z) + CARE_VIEW_SETTINGS.eyeHeight;
    this.target.copy(ASSISTANCE_LAYOUT.medicApproach);
    const tilt = THREE.MathUtils.smoothstep(this.careProgress, 0, CARE_VIEW_SETTINGS.tiltProgress);
    this.target.y = camera.position.y - THREE.MathUtils.lerp(0.02, CARE_VIEW_SETTINGS.downwardOffset, tilt);
    camera.lookAt(this.target);
  }

  restorePlayer(camera: THREE.Camera): void {
    this.place(this.medic, ASSISTANCE_LAYOUT.medic);
    this.arms.hide();
    setCharacterGesture(this.medic, 0);
    camera.position.copy(ASSISTANCE_LAYOUT.playerReturn);
    camera.position.y = this.terrain(camera.position.x, camera.position.z) + 1.7;
    this.target.copy(ASSISTANCE_LAYOUT.faunaCompanion);
    this.target.y = this.terrain(this.target.x, this.target.z) + 1.7;
    camera.lookAt(this.target);
  }

  private place(object: THREE.Object3D, position: THREE.Vector3): void {
    object.position.copy(position);
    object.position.y = this.terrain(position.x, position.z);
  }
}
