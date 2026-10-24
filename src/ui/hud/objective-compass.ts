import * as THREE from 'three';

export interface CompassTarget {
  position: THREE.Vector3;
  label: string;
  priority?: number;
}

const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'O', angle: 270 },
] as const;

function normalizeAngle(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function horizontalDistance(first: THREE.Vector3, second: THREE.Vector3): number {
  const distance = Math.hypot(first.x - second.x, first.z - second.z);
  return Number.isFinite(distance) && distance >= 0 ? distance : 0;
}

/** HUD de navegación: no conoce estados de juego, solo destinos ya resueltos. */
export class ObjectiveCompass {
  readonly element = document.createElement('aside');
  private readonly cardinalElements = CARDINALS.map(() => document.createElement('span'));
  private readonly primary = document.createElement('div');
  private readonly primaryArrow = document.createElement('b');
  private readonly primaryText = document.createElement('span');
  private readonly optional = document.createElement('div');
  private readonly optionalArrow = document.createElement('i');
  private readonly optionalText = document.createElement('span');

  constructor(parent: HTMLElement) {
    this.element.className = 'objective-compass hidden';
    const tape = document.createElement('div');
    tape.className = 'objective-compass__tape';
    const center = document.createElement('i');
    center.className = 'objective-compass__center';
    tape.appendChild(center);
    CARDINALS.forEach((cardinal, index) => {
      const element = this.cardinalElements[index];
      element.className = 'objective-compass__cardinal';
      element.textContent = cardinal.label;
      tape.appendChild(element);
    });
    this.primary.className = 'objective-compass__primary hidden';
    this.primaryArrow.textContent = '▲';
    this.primary.append(this.primaryArrow, this.primaryText);
    this.optional.className = 'objective-compass__optional hidden';
    this.optionalArrow.textContent = '▲';
    this.optional.append(this.optionalArrow, this.optionalText);
    this.element.append(tape, this.primary, this.optional);
    parent.appendChild(this.element);
  }

  update(
    playerPosition: THREE.Vector3,
    forward: THREE.Vector3,
    primaryTarget: CompassTarget | null,
    optionalTarget: CompassTarget | null,
    visible: boolean,
  ): void {
    const hasPrimary = this.updateTarget(this.primary, this.primaryArrow, this.primaryText, playerPosition, forward, primaryTarget, '');
    const hasOptional = this.updateTarget(this.optional, this.optionalArrow, this.optionalText, playerPosition, forward, optionalTarget, 'Hallazgo opcional: ');
    this.element.classList.toggle('hidden', !visible || (!hasPrimary && !hasOptional));
    if (!visible || (!hasPrimary && !hasOptional)) return;

    const heading = Math.atan2(forward.x, forward.z) * THREE.MathUtils.RAD2DEG;
    CARDINALS.forEach((cardinal, index) => {
      const offset = normalizeAngle(cardinal.angle - heading);
      this.cardinalElements[index].style.transform = `translateX(${offset * 0.78}px)`;
    });
  }

  private updateTarget(
    container: HTMLElement,
    arrow: HTMLElement,
    text: HTMLElement,
    playerPosition: THREE.Vector3,
    forward: THREE.Vector3,
    target: CompassTarget | null,
    prefix: string,
  ): boolean {
    if (!target || !Number.isFinite(target.position.x) || !Number.isFinite(target.position.z)) {
      container.classList.add('hidden');
      return false;
    }
    const deltaX = target.position.x - playerPosition.x;
    const deltaZ = target.position.z - playerPosition.z;
    const distance = horizontalDistance(playerPosition, target.position);
    const length = Math.hypot(deltaX, deltaZ);
    const targetX = length > 0 ? deltaX / length : forward.x;
    const targetZ = length > 0 ? deltaZ / length : forward.z;
    const angle = Math.atan2(forward.x * targetZ - forward.z * targetX, forward.x * targetX + forward.z * targetZ);
    arrow.style.transform = `rotate(${Number.isFinite(angle) ? angle * THREE.MathUtils.RAD2DEG : 0}deg)`;
    text.textContent = `${prefix}${target.label} · ${Math.round(distance)} m`;
    container.classList.remove('hidden');
    return true;
  }
}
