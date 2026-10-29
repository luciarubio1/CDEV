import type * as THREE from 'three';
import type { PlayerHealth } from '../player/player-health';
import { MAX_PLAYER_HEALTH } from '../player/player-health';
import type { AssistanceView } from '../world/assistance-view';
import type { PostFireProgression } from './post-fire-progression';
import { CareSequence } from './care-sequence';

/** Orquesta cámara, diálogo y representación; la progresión y el reloj son independientes. */
export class AssistanceScene {
  private readonly overlay = document.createElement('section');
  private readonly text: HTMLParagraphElement;
  private readonly button: HTMLButtonElement;
  private readonly sequence = new CareSequence();

  constructor(
    parent: HTMLElement,
    private readonly camera: THREE.Camera,
    private readonly health: PlayerHealth,
    private readonly flow: PostFireProgression,
    private readonly view: AssistanceView,
    private readonly onLock: () => void,
    private readonly onRelease: () => void,
    private readonly onCompleted: () => void,
  ) {
    this.overlay.className = 'guide-dialogue assistance-dialogue';
    this.overlay.innerHTML = '<div class="guide-dialogue__card" role="dialog" aria-modal="true"><strong>Puesto de asistencia</strong><p></p><button type="button">Continuar</button></div>';
    parent.appendChild(this.overlay);
    this.text = this.overlay.querySelector('p')!;
    this.button = this.overlay.querySelector('button')!;
    this.button.addEventListener('click', () => this.confirm());
  }

  open(): void {
    if (this.flow.currentStage !== 'care-intro') return;
    this.onLock();
    this.text.textContent = this.health.amount < MAX_PLAYER_HEALTH
      ? 'Ya estás en una zona segura. Sentate un momento, vamos a revisarte.'
      : 'Estás bien. Terminamos la revisión; podés acompañar al equipo en la recorrida.';
    this.overlay.classList.add('visible');
    this.button.hidden = false;
    queueMicrotask(() => this.button.focus());
  }

  confirm(): void {
    if (this.flow.currentStage === 'care-intro') {
      this.sequence.start(this.health.amount);
      this.flow.startCare();
      this.overlay.classList.remove('visible');
      this.button.hidden = true;
      this.view.renderCare(0, this.sequence.needsTreatment);
      this.view.setCamera(this.camera);
    } else if (this.flow.closeCare()) {
      this.overlay.classList.remove('visible');
      this.view.restorePlayer(this.camera);
      this.onRelease();
    }
  }

  update(delta: number): void {
    if (this.flow.currentStage !== 'care') return;
    const frame = this.sequence.update(delta);
    this.health.restoreTo(frame.health);
    this.view.renderCare(frame.progress, this.sequence.needsTreatment);
    this.view.setCamera(this.camera);
    if (frame.complete && this.flow.finishCare()) {
      this.onCompleted();
      this.text.textContent = this.sequence.needsTreatment
        ? 'Listo. Tu compañero te espera para revisar la zona.'
        : 'Estás bien. Terminamos la revisión; podés acompañar al equipo en la recorrida.';
      this.button.hidden = false;
      this.overlay.classList.add('visible');
      queueMicrotask(() => this.button.focus());
    }
  }
}
