import * as THREE from 'three';
import { InvestigationView } from '../world/investigation-view';
import type { ReinforcementView } from '../world/reinforcement-view';
import type { Bitacora } from '../../ui/bitacora';
import { InvestigationProgress, INVESTIGATION_SETTINGS as CONFIG, INVESTIGATION_STATIONS as STATIONS, INVESTIGATION_RETURN_ROUTE, INVESTIGATION_CLOSING_SHOTS } from './investigation-data';
import { WaypointWalker } from './waypoint-walker';
import { FollowDistanceGate, turnTowards } from './npc-movement';

export type InvestigationStage = 'inactive' | 'intro' | 'walking' | 'observing' | 'question' | 'conclusion' | 'return' | 'closing' | 'complete';
export class InvestigationTour {
  readonly progress = new InvestigationProgress();
  readonly view: InvestigationView;
  stage: InvestigationStage = 'inactive';
  private walker: WaypointWalker | null = null;
  private elapsed = 0;
  private readonly savedPosition = new THREE.Vector3();
  private readonly savedRotation = new THREE.Quaternion();
  private readonly targetRotation = new THREE.Quaternion();
  private readonly temporaryCamera = new THREE.PerspectiveCamera();
  private readonly target = new THREE.Vector3();
  private readonly shotPosition = new THREE.Vector3();
  isWaiting = false;
  private readonly following = new FollowDistanceGate();
  constructor(
    private readonly companion: ReinforcementView,
    private readonly camera: THREE.Camera,
    private readonly terrain: (x: number, z: number) => number,
    private readonly bitacora: Bitacora,
    private readonly dialogue: (text: string) => void,
    private readonly lock: () => void,
    private readonly release: () => void,
    private readonly completed: () => void,
  ) { this.view = new InvestigationView(terrain); }
  get active(): boolean { return this.stage !== 'inactive'; }
  get cameraLocked(): boolean { return ['observing', 'question', 'closing'].includes(this.stage); }
  get objective(): string {
    if (this.stage === 'return') return 'Regresá al puesto para cerrar la intervención';
    if (this.stage === 'closing' || this.stage === 'complete') return 'Cierre de la intervención';
    return `Investigación: ${this.progress.count}/3 · ${STATIONS[Math.min(this.progress.count, 2)].title}`;
  }
  get navigationTarget(): { position: THREE.Vector3; label: string } {
    if (this.stage === 'return') return { position: this.companion.companionPosition, label: 'Compañero · regreso al puesto' };
    const station = STATIONS[Math.min(this.progress.count, 2)];
    return { position: station.position, label: station.title };
  }
  interact(player: THREE.Vector3): boolean {
    if (this.stage === 'inactive') {
      if (player.distanceTo(this.companion.companionPosition) > 3.2) return false;
      this.stage = 'intro';
      this.view.object.visible = true;
      this.dialogue('Encontraron algunos indicios junto al sendero. Vamos a observarlos y entender qué pudo pasar.');
      return true;
    }
    if (this.stage === 'return' && this.walker?.finished && this.near(player, this.companion.companionPosition)) {
      this.stage = 'closing';
      this.elapsed = 0;
      this.savedPosition.copy(this.camera.position);
      this.savedRotation.copy(this.camera.quaternion);
      this.lock();
      return true;
    }
    if (this.stage !== 'walking' || !this.walker?.finished || !this.near(player, STATIONS[this.progress.count].position)) return false;
    this.stage = 'observing';
    this.elapsed = 0;
    this.savedPosition.copy(this.camera.position);
    this.savedRotation.copy(this.camera.quaternion);
    this.temporaryCamera.position.copy(this.camera.position);
    this.target.copy(STATIONS[this.progress.count].position);
    this.target.y = this.terrain(this.target.x, this.target.z) + 0.08;
    this.temporaryCamera.lookAt(this.target);
    this.targetRotation.copy(this.temporaryCamera.quaternion);
    this.lock();
    return true;
  }
  interactionMessage(player: THREE.Vector3): string {
    if (this.stage === 'return') return this.walker?.finished && this.near(player, this.companion.companionPosition) ? 'Presioná F para cerrar la intervención' : this.objective;
    if (this.stage === 'walking' && this.walker?.finished && this.near(player, STATIONS[this.progress.count].position)) return ['F para observar la vegetación seca', 'F para inspeccionar los restos del fogón', 'F para inspeccionar el indicio'][this.progress.count];
    return this.isWaiting ? 'Tu compañero te espera' : this.objective;
  }
  continueDialogue(): void {
    if (this.stage === 'intro') this.walkToStation();
    else if (this.stage === 'conclusion') {
      this.stage = 'return';
      this.walker = new WaypointWalker(INVESTIGATION_RETURN_ROUTE, CONFIG.speed, this.terrain);
    }
  }
  update(delta: number, player: THREE.Vector3, paused: boolean, scenePaused: boolean): void {
    if (scenePaused) return;
    if (this.stage === 'observing') {
      this.elapsed += delta;
      const t = Math.min(1, this.elapsed / CONFIG.inspectionSeconds);
      this.camera.quaternion.slerpQuaternions(this.savedRotation, this.targetRotation, t * t * (3 - 2 * t));
      if (t === 1) this.ask();
      return;
    }
    if (this.stage === 'closing') {
      this.elapsed += delta;
      this.renderClosing();
      if (this.elapsed >= CONFIG.closingSeconds) this.finish();
      return;
    }
    if (paused || !this.walker || !['walking', 'return'].includes(this.stage)) return;
    const distance = Math.hypot(player.x - this.companion.companionPosition.x, player.z - this.companion.companionPosition.z);
    this.isWaiting = !this.following.update(distance);
    this.walker.update(delta, !this.isWaiting, this.following.speedScale(distance));
    this.companion.moveCompanion(this.walker.position);
    turnTowards(this.companion.companion, Math.atan2(this.walker.direction.x, this.walker.direction.z), delta);
  }
  finish(): void {
    if (this.stage !== 'closing') return;
    this.elapsed = CONFIG.closingSeconds;
    this.renderClosing();
    this.stage = 'complete';
    this.completed();
  }
  private walkToStation(): void {
    this.stage = 'walking';
    this.walker = new WaypointWalker([this.companion.companionPosition.clone(), ...STATIONS[this.progress.count].route], CONFIG.speed, this.terrain);
  }
  private ask(): void {
    this.stage = 'question';
    const index = this.progress.count;
    const station = STATIONS[index];
    this.bitacora.unlockEntry(station);
    this.bitacora.showQuestion(station, station.question, station.options, (option) => {
      this.progress.answer(index, option);
      this.view.markers[index].visible = false;
      return `${option === 0 ? 'Esa lectura distingue el indicio de una causa confirmada.' : 'Gracias por observar. Revisemos qué podemos afirmar.'}\n${station.feedback}`;
    }, () => {
      this.camera.position.copy(this.savedPosition);
      this.camera.quaternion.copy(this.savedRotation);
      if (this.progress.count === 3) {
        this.stage = 'conclusion';
        this.dialogue('Contener el fuego fue una parte. Cuidar a quienes quedaron y comprender lo ocurrido también forma parte de la respuesta.');
      } else { this.walkToStation(); this.release(); }
    });
  }
  private near(a: THREE.Vector3, b: THREE.Vector3, radius = CONFIG.interactionRadius): boolean { return Math.hypot(a.x - b.x, a.z - b.z) <= radius; }
  private renderClosing(): void {
    // Three smooth shots: actual crew/vehicles, actual veterinary station and house/landscape.
    const t = Math.min(1, this.elapsed / CONFIG.closingSeconds);
    const { positions, targets } = INVESTIGATION_CLOSING_SHOTS;
    const segment = Math.min(2, Math.floor(t * 3));
    const local = Math.min(1, t * 3 - segment);
    const smooth = local * local * (3 - 2 * local);
    const a = positions[segment], b = positions[segment + 1], c = targets[segment], d = targets[segment + 1];
    this.shotPosition.set(a[0] + (b[0] - a[0]) * smooth, a[1] + (b[1] - a[1]) * smooth, a[2] + (b[2] - a[2]) * smooth);
    this.shotPosition.y += this.terrain(this.shotPosition.x, this.shotPosition.z);
    this.target.set(c[0] + (d[0] - c[0]) * smooth, c[1] + (d[1] - c[1]) * smooth, c[2] + (d[2] - c[2]) * smooth);
    this.target.y += this.terrain(this.target.x, this.target.z);
    // Blend from the player's camera at entry rather than snap to a cut.
    this.temporaryCamera.position.copy(this.shotPosition);
    this.temporaryCamera.lookAt(this.target);
    const entry = Math.min(1, this.elapsed / 1.2);
    const blend = entry * entry * (3 - 2 * entry);
    this.camera.position.lerpVectors(this.savedPosition, this.shotPosition, blend);
    this.camera.quaternion.slerpQuaternions(this.savedRotation, this.temporaryCamera.quaternion, blend);
  }
}
