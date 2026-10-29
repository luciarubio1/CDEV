import * as THREE from 'three';
import { FlameView } from '../fire/flame-view';

export const INTRO_CINEMATIC_DURATION = 12.5;

export interface CinematicShot {
  start: number;
  end: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
  text: string;
}

export interface IntroCinematicOptions {
  shots: readonly CinematicShot[];
  playerPosition: THREE.Vector3;
  playerTarget: THREE.Vector3;
  distantFirePosition: THREE.Vector3;
}

export interface CinematicFrame {
  text: string;
  sirenCue: boolean;
  complete: boolean;
}

function smooth(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function createDistantFire(flames:FlameView): THREE.Group {
  const fire = new THREE.Group();
  fire.add(flames.object);
  [0, 1, 2].forEach((index) => {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.18 + index * 0.06, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b6862, transparent: true, opacity: 0.38 - index * 0.07 }),
    );
    smoke.position.set((index - 1) * 0.14, 1.45 + index * 0.35, 0);
    fire.add(smoke);
  });
  return fire;
}

/** Cámara narrativa breve; no inicia mecánicas de juego. */
export class IntroCinematic {
  readonly object = new THREE.Group();
  private readonly flames=new FlameView(new THREE.Vector3(),false,.65);
  private readonly fire = createDistantFire(this.flames);
  private elapsed = 0;
  private active = false;
  private sirenPlayed = false;
  private readonly interpolatedTarget = new THREE.Vector3();

  constructor(private readonly options: IntroCinematicOptions) {
    this.fire.position.copy(options.distantFirePosition);
    this.object.add(this.fire);
    this.object.visible = false;
  }

  get isActive(): boolean { return this.active; }

  start(): void {
    this.elapsed = 0;
    this.sirenPlayed = false;
    this.active = true;
    this.object.visible = true;
  }

  update(camera: THREE.PerspectiveCamera, delta: number): CinematicFrame {
    if (!this.active) return { text: '', sirenCue: false, complete: false };
    this.elapsed = Math.min(INTRO_CINEMATIC_DURATION, this.elapsed + delta);
    const shotIndex = this.options.shots.findIndex((shot) => this.elapsed >= shot.start && this.elapsed < shot.end);
    const index = shotIndex >= 0 ? shotIndex : this.options.shots.length - 1;
    const shot = this.options.shots[index];
    const next = this.options.shots[Math.min(index + 1, this.options.shots.length - 1)];
    const progress = smooth((this.elapsed - shot.start) / Math.max(0.001, shot.end - shot.start));
    camera.position.lerpVectors(shot.position, next.position, progress);
    this.interpolatedTarget.lerpVectors(shot.target, next.target, progress);
    camera.lookAt(this.interpolatedTarget);
    this.flames.update(delta,1);

    const sirenCue = !this.sirenPlayed && this.elapsed >= 4.2;
    if (sirenCue) this.sirenPlayed = true;
    const complete = this.elapsed >= INTRO_CINEMATIC_DURATION;
    return { text: shot.text, sirenCue, complete };
  }

  finish(camera: THREE.PerspectiveCamera): void {
    this.active = false;
    this.object.visible = false;
    camera.position.copy(this.options.playerPosition);
    camera.lookAt(this.options.playerTarget);
  }
}
