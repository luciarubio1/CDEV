import * as THREE from 'three';
import { PostFireProgression } from './post-fire-progression';
import { WaypointWalker } from './waypoint-walker';
import { RESCUE_CONFIG } from './wildlife-rescue-config';
import { RESCUE_TEXT } from './fauna-education';
import type { CollisionSystem, RectangleCollider } from '../world/collision-system';
import type { ReinforcementView } from '../world/reinforcement-view';
import type { VeterinarianView } from '../world/veterinarian-view';
import type { FaunaAnimals } from '../world/fauna-animals';
import { WildlifeRescueView } from '../world/wildlife-rescue-view';
import { CARRIER_SIZE } from '../world/animal-carrier';

export class WildlifeRescue {
  readonly view: WildlifeRescueView;
  private activated = false;
  private elapsed = 0;
  private carrierCollider: RectangleCollider | null = null;
  private transport: WaypointWalker | null = null;
  private companionWalk: WaypointWalker | null = null;
  private waiting = false;

  constructor(
    private readonly flow: PostFireProgression,
    private readonly carrier: THREE.Group,
    animals: FaunaAnimals,
    private readonly vet: VeterinarianView,
    private readonly companion: ReinforcementView,
    private readonly collisions: CollisionSystem,
    private readonly terrain: (x: number, z: number) => number,
    private readonly camera: THREE.Camera,
    private readonly dialogue: (title: string, text: string) => void,
    private readonly completed: () => void,
  ) {
    this.view = new WildlifeRescueView(carrier, animals, vet, terrain);
  }
  get isActive(): boolean { return this.activated; }
  get isPlayerCarrying(): boolean { return this.flow.currentStage === 'carrier-carrying' || this.flow.currentStage === 'rescue-identification'; }
  get isWaiting(): boolean { return this.waiting; }
  constrainPlayerMovement(previous: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
    return this.isPlayerCarrying ? this.view.carrying.constrainMovement(this.camera, this.carrier, previous, desired, this.collisions) : desired;
  }
  get navigationTarget(): { position: THREE.Vector3; label: string } {
    const stage = this.flow.currentStage;
    if (stage === 'carrier') return { position: this.carrier.position, label: 'Transportín junto al vehículo' };
    if (stage === 'investigation-meeting' || stage === 'rescue-complete') return { position: this.companion.companionPosition, label: 'Encuentro junto al sendero' };
    return { position: this.vet.object.position, label: stage === 'carrier-carrying' ? 'Entregar al veterinario' : this.waiting ? 'El veterinario te espera' : 'Equipo de fauna' };
  }
  activate(): void {
    if (this.activated || this.flow.currentStage !== 'carrier') return;
    this.activated = true;
    this.carrierCollider = this.collisions.addRectangle(this.carrier.position, CARRIER_SIZE.width, CARRIER_SIZE.depth);
    this.view.station.show(this.collisions);
  }
  interact(player: THREE.Vector3): boolean {
    const stage = this.flow.currentStage;
    if (stage === 'carrier' && this.near(player, this.carrier.position)) {
      if (this.flow.advanceFauna('carrier-carrying')) {
        if (this.carrierCollider) this.collisions.removeRectangle(this.carrierCollider);
        this.carrierCollider = null;
        this.view.hold(this.camera);
      }
      return true;
    }
    if (stage === 'carrier-carrying' && this.near(player, this.vet.object.position)) {
      if (this.flow.advanceFauna('rescue-identification')) this.dialogue('Veterinario', RESCUE_TEXT.identification);
      return true;
    }
    return stage === 'investigation-meeting' && this.near(player, this.companion.companionPosition);
  }
  interactionMessage(player: THREE.Vector3): string | null {
    if (this.flow.currentStage === 'carrier' && this.near(player, this.carrier.position)) return 'Presioná F para recoger el transportín';
    if (this.flow.currentStage === 'carrier-carrying' && this.near(player, this.vet.object.position)) return 'Presioná F para entregar el transportín';
    if (this.flow.currentStage === 'investigation-meeting' && this.near(player, this.companion.companionPosition)) return 'Punto de encuentro · la investigación será la próxima etapa';
    return this.waiting ? 'El veterinario te espera' : null;
  }
  continueDialogue(): void {
    const stage = this.flow.currentStage;
    if (stage === 'rescue-identification' && this.flow.advanceFauna('rescue-loading')) {
      this.elapsed = 0;
      this.view.beginLoading();
      this.companionWalk = new WaypointWalker([this.companion.companionPosition.clone(), new THREE.Vector3(3,0,19.4)], 0.9, this.terrain);
    } else if (stage === 'rescue-ready' && this.flow.advanceFauna('rescue-walk')) {
      this.transport = new WaypointWalker(RESCUE_CONFIG.transportRoute, RESCUE_CONFIG.veterinarianSpeed, this.terrain);
      this.companionWalk = new WaypointWalker([this.companion.companionPosition.clone(), ...RESCUE_CONFIG.companionRoute.slice(1)], RESCUE_CONFIG.companionSpeed, this.terrain);
    } else if (stage === 'rescue-arrival' && this.flow.advanceFauna('rescue-complete')) {
      this.completed();
      this.dialogue('Compañero', RESCUE_TEXT.companion);
    } else if (stage === 'rescue-complete') {
      this.flow.advanceFauna('investigation-meeting');
    }
  }
  update(delta: number, player: THREE.Vector3, paused: boolean): void {
    if (!this.activated || paused) return;
    const stage = this.flow.currentStage;
    this.updateCompanion(delta);
    if (stage === 'rescue-loading') {
      this.elapsed = Math.min(RESCUE_CONFIG.loadingSeconds, this.elapsed + delta);
      this.view.renderLoading(this.elapsed / RESCUE_CONFIG.loadingSeconds);
      if (this.elapsed >= RESCUE_CONFIG.loadingSeconds && this.flow.advanceFauna('rescue-ready')) {
        this.view.finishLoading();
        this.dialogue('Veterinario', RESCUE_TEXT.departure);
      }
    } else if (stage === 'rescue-walk' && this.transport) {
      this.waiting = Math.hypot(player.x - this.vet.object.position.x, player.z - this.vet.object.position.z) > RESCUE_CONFIG.followRadius;
      this.transport.update(delta, !this.waiting);
      this.vet.object.position.copy(this.transport.position);
      const targetYaw = Math.atan2(this.transport.direction.x, this.transport.direction.z);
      const turn = Math.atan2(Math.sin(targetYaw-this.vet.object.rotation.y), Math.cos(targetYaw-this.vet.object.rotation.y));
      this.vet.object.rotation.y += turn * (1-Math.exp(-6*delta));
      if (this.transport.finished && !this.waiting && this.flow.advanceFauna('rescue-placing')) {
        this.elapsed = 0;
        this.view.beginPlacement();
      }
    } else if (stage === 'rescue-placing') {
      this.elapsed = Math.min(RESCUE_CONFIG.placementSeconds, this.elapsed + delta);
      this.view.renderPlacement(this.elapsed / RESCUE_CONFIG.placementSeconds);
      if (this.elapsed >= RESCUE_CONFIG.placementSeconds && this.flow.advanceFauna('rescue-arrival')) {
        this.view.finishPlacement();
        this.dialogue('Veterinario', RESCUE_TEXT.arrival);
      }
    }
  }
  private updateCompanion(delta: number): void {
    if (!this.companionWalk || this.companionWalk.finished) return;
    const tooClose = this.transport && !this.transport.finished && this.companion.companionPosition.distanceTo(this.vet.object.position) < 1.6;
    this.companionWalk.update(delta, !tooClose);
    this.companion.moveCompanion(this.companionWalk.position);
    this.companion.companion.rotation.y = Math.atan2(this.companionWalk.direction.x, this.companionWalk.direction.z);
  }
  private near(a: THREE.Vector3, b: THREE.Vector3): boolean { return Math.hypot(a.x-b.x, a.z-b.z) <= RESCUE_CONFIG.interactionRadius; }
}
