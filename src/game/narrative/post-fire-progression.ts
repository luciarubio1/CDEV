export type PostFireStage = 'inactive' | 'companion' | 'assistance' | 'care-intro' | 'care' | 'care-outro' | 'fauna-companion' | 'fauna-briefed'
  | 'fauna-walk-a' | 'fauna-refuge' | 'fauna-dialogue-a' | 'fauna-walk-b' | 'fauna-dialogue-b' | 'fauna-radio'
  | 'vet-arriving' | 'vet-evaluating' | 'vet-dialogue' | 'carrier'
  | 'carrier-carrying' | 'rescue-identification' | 'rescue-loading' | 'rescue-ready' | 'rescue-walk'
  | 'rescue-placing' | 'rescue-arrival' | 'rescue-complete' | 'investigation-meeting';

/** Única fuente del orden posterior al incendio; las transiciones son idempotentes. */
export class PostFireProgression {
  private stage: PostFireStage = 'inactive';
  private completed = false;
  private rescueCount = 0;
  get rescueCompleted(): boolean { return this.rescueCount === 1; }
  get rescueCompletionCount(): number { return this.rescueCount; }
  get currentStage(): PostFireStage { return this.stage; }
  get assistanceCompleted(): boolean { return this.completed; }
  get careLocked(): boolean { return this.stage === 'care-intro' || this.stage === 'care' || this.stage === 'care-outro'; }
  get objective(): string {
    if (this.stage === 'inactive' || this.stage === 'companion') return 'Reunite con tu compañero junto al camión';
    if (this.stage === 'assistance') return 'Acercate al puesto de asistencia';
    if (this.careLocked) return 'Revisión en el puesto de asistencia';
    if (this.stage.startsWith('fauna-walk') || this.stage === 'fauna-refuge' || this.stage === 'fauna-dialogue-a') return 'Acompañá a tu compañero por el sendero';
    if (this.stage === 'fauna-radio' || this.stage === 'fauna-dialogue-b') return 'Avisá al equipo de fauna';
    if (this.stage.startsWith('vet-')) return 'El equipo de fauna se acerca al zorro';
    if (this.stage === 'carrier') return 'Buscá el transportín junto al vehículo';
    if (this.stage === 'carrier-carrying') return 'Llevá el transportín al veterinario';
    if (this.stage === 'rescue-identification' || this.stage === 'rescue-loading') return 'El veterinario prepara el rescate acompañado';
    if (this.stage === 'rescue-ready' || this.stage === 'rescue-walk') return 'Acompañá al veterinario al puesto de fauna';
    if (this.stage === 'rescue-placing' || this.stage === 'rescue-arrival') return 'El zorro queda al cuidado del equipo de fauna';
    if (this.stage === 'rescue-complete') return 'Rescate acompañado completado';
    if (this.stage === 'investigation-meeting') return 'Reunite con tu compañero junto al sendero';
    return 'Reunite con tu compañero para revisar la fauna';
  }
  activate(): void { if (this.stage === 'inactive') this.stage = 'companion'; }
  meetCompanion(): boolean {
    if (this.stage !== 'companion') return false;
    this.stage = 'assistance';
    return true;
  }
  requestAssistance(): boolean {
    if (this.stage !== 'assistance' || this.completed) return false;
    this.stage = 'care-intro';
    return true;
  }
  startCare(): boolean {
    if (this.stage !== 'care-intro') return false;
    this.stage = 'care';
    return true;
  }
  finishCare(): boolean {
    if (this.stage !== 'care' || this.completed) return false;
    this.completed = true;
    this.stage = 'care-outro';
    return true;
  }
  closeCare(): boolean {
    if (this.stage !== 'care-outro') return false;
    this.stage = 'fauna-companion';
    return true;
  }
  meetForFauna(): boolean {
    if (this.stage !== 'fauna-companion') return false;
    this.stage = 'fauna-briefed';
    return true;
  }

  /** Solo acepta el siguiente paso de la recorrida; reintentos no repiten encuentros. */
  advanceFauna(next: PostFireStage): boolean {
    const order: PostFireStage[] = ['fauna-briefed', 'fauna-walk-a', 'fauna-refuge', 'fauna-dialogue-a', 'fauna-walk-b', 'fauna-dialogue-b', 'fauna-radio', 'vet-arriving', 'vet-evaluating', 'vet-dialogue', 'carrier', 'carrier-carrying', 'rescue-identification', 'rescue-loading', 'rescue-ready', 'rescue-walk', 'rescue-placing', 'rescue-arrival', 'rescue-complete', 'investigation-meeting'];
    const index = order.indexOf(this.stage);
    if (index < 0 || order[index + 1] !== next) return false;
    this.stage = next;
    if (next === 'rescue-complete') this.rescueCount += 1;
    return true;
  }
}
