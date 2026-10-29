/** Cronología pura: ver completa u omitir produce el mismo fotograma final. */
export const REINFORCEMENT_TIMING = {
  duration: 15,
  truckStop: 7,
  crewExit: 8,
  crewArrive: 14,
} as const;

export interface ReinforcementFrame {
  elapsed: number;
  truckProgress: number;
  crewVisible: boolean;
  crewProgress: number;
  complete: boolean;
}

export class ReinforcementSequence {
  private elapsed = 0;
  private started = false;
  private simulatedSteps = 0;

  start(): void { this.elapsed = 0; this.simulatedSteps = 0; this.started = true; }
  update(delta: number): ReinforcementFrame {
    if (this.started) this.elapsed = Math.min(REINFORCEMENT_TIMING.duration, this.elapsed + Math.max(0, delta));
    return this.frame;
  }
  finish(): ReinforcementFrame {
    this.started = true;
    this.elapsed = REINFORCEMENT_TIMING.duration;
    return this.frame;
  }
  /** Pasos fijos para que omitir conserve también las marcas y el humo residual. */
  advanceContainment(update: (delta: number) => void): void {
    const targetSteps = Math.floor(this.elapsed * 60 + 1e-7);
    while (this.simulatedSteps < targetSteps) {
      update(1 / 60);
      this.simulatedSteps += 1;
    }
  }
  get frame(): ReinforcementFrame {
    const timing = REINFORCEMENT_TIMING;
    return {
      elapsed: this.elapsed,
      truckProgress: Math.min(1, this.elapsed / timing.truckStop),
      crewVisible: this.elapsed >= timing.crewExit,
      crewProgress: Math.max(0, Math.min(1, (this.elapsed - timing.crewExit) / (timing.crewArrive - timing.crewExit))),
      complete: this.started && this.elapsed >= timing.duration,
    };
  }
}
