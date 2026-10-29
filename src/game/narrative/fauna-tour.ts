import * as THREE from 'three';
import { FAUNA_CONFIG } from './fauna-config';
import { WaypointWalker } from './waypoint-walker';
import { FollowDistanceGate, turnTowards } from './npc-movement';
import type { PostFireProgression } from './post-fire-progression';
import type { ReinforcementView } from '../world/reinforcement-view';
import type { CollisionSystem } from '../world/collision-system';
import { FaunaAnimals } from '../world/fauna-animals';
import { VeterinarianView } from '../world/veterinarian-view';
import { createAnimalCarrier } from '../world/animal-carrier';
import { WildlifeRescue } from './wildlife-rescue';

/** Encuentros y navegación; los modelos y los recorridos no conocen el HUD. */
export class FaunaTour {
  readonly object = new THREE.Group();
  readonly animals: FaunaAnimals;
  readonly veterinarian: VeterinarianView;
  readonly carrier = createAnimalCarrier();
  readonly rescue: WildlifeRescue;
  private walker: WaypointWalker | null = null;
  private readonly refugeWalker: WaypointWalker;
  private vetCollider: THREE.Vector3 | null = null;
  private evaluationElapsed = 0;
  private waiting = false;
  private readonly following = new FollowDistanceGate();
  private started = false;
  private reported = false;

  constructor(
    private readonly flow: PostFireProgression,
    private readonly companion: ReinforcementView,
    private readonly collisions: CollisionSystem,
    private readonly terrain: (x: number, z: number) => number,
    private readonly showDialogue: (title: string, text: string) => void,
    options: { camera?: THREE.Camera; onRescueCompleted?: () => void } = {},
  ) {
    this.animals = new FaunaAnimals(terrain);
    this.veterinarian = new VeterinarianView(terrain);
    this.refugeWalker = new WaypointWalker(FAUNA_CONFIG.refugeRoute, FAUNA_CONFIG.refugeSpeed, terrain);
    this.carrier.position.copy(FAUNA_CONFIG.carrier);
    this.carrier.position.y = terrain(this.carrier.position.x, this.carrier.position.z);
    this.object.add(this.animals.object, this.veterinarian.object, this.carrier);
    this.rescue = new WildlifeRescue(flow, this.carrier, this.animals, this.veterinarian, companion, collisions, terrain,
      options.camera ?? new THREE.PerspectiveCamera(60,16/9,0.1,100), showDialogue, options.onRescueCompleted ?? (() => {}));
    this.object.add(this.rescue.view.object);
    this.object.visible = false;
  }
  get isActive(): boolean { return this.started; }
  get isWaiting(): boolean { return this.rescue.isActive ? this.rescue.isWaiting : this.waiting; }
  get noticeSent(): boolean { return this.reported; }
  get navigationTarget(): { position: THREE.Vector3; label: string } {
    if (this.rescue.isActive) return this.rescue.navigationTarget;
    const stage = this.flow.currentStage;
    if (stage === 'carrier') return { position: this.carrier.position, label: 'Transportín junto al vehículo' };
    if (stage.startsWith('vet-')) return { position: this.veterinarian.object.position, label: 'Equipo de fauna' };
    if (stage === 'fauna-radio') return { position: this.animals.fox.position, label: 'Avisar al equipo de fauna' };
    return { position: this.companion.companionPosition, label: this.waiting ? 'Tu compañero te espera' : 'Compañero en el sendero' };
  }
  start(): void {
    if (this.started || !this.flow.advanceFauna('fauna-walk-a')) return;
    this.started = true;
    this.object.visible = this.animals.object.visible = true;
    this.walker = new WaypointWalker(FAUNA_CONFIG.routeA, FAUNA_CONFIG.companionSpeed, this.terrain);
  }
  update(delta: number, player: THREE.Vector3, paused: boolean): void {
    if (!this.started || paused) return;
    this.animals.update(delta);
    if (this.rescue.isActive) {
      this.rescue.update(delta, player, false);
      this.vetCollider?.copy(this.veterinarian.object.position);
      return;
    }
    const stage = this.flow.currentStage;
    if ((stage === 'fauna-walk-a' || stage === 'fauna-walk-b') && this.walker) {
      const distance = this.distance(player, this.walker.position);
      this.waiting = !this.following.update(distance);
      this.walker.update(delta, !this.waiting, this.following.speedScale(distance));
      this.companion.moveCompanion(this.walker.position);
      turnTowards(this.companion.companion, Math.atan2(this.walker.direction.x, this.walker.direction.z), delta);
      if (this.walker.finished && !this.waiting) {
        if (stage === 'fauna-walk-a') this.flow.advanceFauna('fauna-refuge');
        else if (this.flow.advanceFauna('fauna-dialogue-b')) this.showDialogue('Compañero', 'Este necesita que lo revise el equipo de fauna. Avisemos al veterinario.');
      }
    } else if (stage === 'fauna-refuge') {
      this.refugeWalker.update(delta);
      this.animals.smallAnimal.position.copy(this.refugeWalker.position);
      this.animals.smallAnimal.rotation.y = -Math.atan2(this.refugeWalker.direction.z, this.refugeWalker.direction.x);
      if (this.refugeWalker.finished && this.flow.advanceFauna('fauna-dialogue-a')) {
        this.animals.smallAnimal.visible = false;
        this.showDialogue('Compañero', 'Este pudo llegar a una zona de refugio. Sigamos revisando.');
      }
    } else if (stage === 'vet-arriving') {
      this.veterinarian.arrive(delta);
      this.vetCollider?.copy(this.veterinarian.object.position);
      if (this.veterinarian.walker.finished) this.flow.advanceFauna('vet-evaluating');
    } else if (stage === 'vet-evaluating') {
      this.evaluationElapsed += delta;
      this.veterinarian.evaluate(this.evaluationElapsed / FAUNA_CONFIG.evaluationSeconds);
      if (this.evaluationElapsed >= FAUNA_CONFIG.evaluationSeconds && this.flow.advanceFauna('vet-dialogue')) {
        this.showDialogue('Veterinario', 'Gracias por avisar. Yo me encargo de revisarlo. Necesitamos el transportín que quedó junto al vehículo.');
      }
    }
  }
  continueDialogue(): void {
    if (this.rescue.isActive) { this.rescue.continueDialogue(); return; }
    if (this.flow.currentStage === 'fauna-dialogue-a' && this.flow.advanceFauna('fauna-walk-b')) {
      this.walker = new WaypointWalker(FAUNA_CONFIG.routeB, FAUNA_CONFIG.companionSpeed, this.terrain);
    } else if (this.flow.currentStage === 'fauna-dialogue-b') {
      this.flow.advanceFauna('fauna-radio');
    } else if (this.flow.currentStage === 'vet-dialogue' && this.flow.advanceFauna('carrier')) {
      this.carrier.visible = true;
      this.rescue.activate();
    }
  }
  interact(player: THREE.Vector3): boolean {
    if (this.rescue.isActive) return this.rescue.interact(player);
    if (this.flow.currentStage !== 'fauna-radio' || this.reported || this.distance(player, this.animals.fox.position) > FAUNA_CONFIG.interactionRadius) return false;
    if (!this.flow.advanceFauna('vet-arriving')) return false;
    this.reported = true;
    this.veterinarian.object.visible = true;
    this.vetCollider = this.collisions.addCircle(this.veterinarian.object.position, 0.4);
    this.showDialogue('Radio', 'Equipo de fauna: encontramos un zorro que necesita evaluación junto al sendero. Aviso recibido; el veterinario sale del puesto.');
    return true;
  }
  interactionMessage(player: THREE.Vector3): string | null {
    if (this.rescue.isActive) return this.rescue.interactionMessage(player);
    if (this.flow.currentStage === 'fauna-radio' && this.distance(player, this.animals.fox.position) <= FAUNA_CONFIG.interactionRadius) return 'Presioná F para avisar al equipo de fauna';
    if (this.flow.currentStage === 'carrier' && this.distance(player, this.carrier.position) <= 2.5) return 'Transportín disponible · la recogida será la próxima etapa';
    return this.waiting ? 'Tu compañero te espera' : null;
  }
  private distance(a: THREE.Vector3, b: THREE.Vector3): number { return Math.hypot(a.x - b.x, a.z - b.z); }
}
