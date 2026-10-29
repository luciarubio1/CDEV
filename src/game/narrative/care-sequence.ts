import { GAME_BALANCE } from '../balance-config';

/** Tiempo y recuperación de la atención. No decide diálogos ni mueve objetos. */
export class CareSequence {
  private initialHealth = GAME_BALANCE.player.maxHealth as number;
  private elapsed = 0;
  private started = false;
  get needsTreatment(): boolean { return this.initialHealth < GAME_BALANCE.player.maxHealth; }
  get duration(): number { return this.needsTreatment ? GAME_BALANCE.assistance.treatmentSeconds : GAME_BALANCE.assistance.checkupSeconds; }
  start(health: number): boolean {
    if (this.started) return false;
    this.initialHealth = Math.max(0, Math.min(GAME_BALANCE.player.maxHealth, health));
    this.elapsed = 0;
    this.started = true;
    return true;
  }
  update(delta: number): { progress: number; health: number; complete: boolean } {
    if (this.started) this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, delta));
    if (this.elapsed > this.duration - 1e-9) this.elapsed = this.duration;
    const progress = this.started ? this.elapsed / this.duration : 0;
    return {
      progress,
      health: this.initialHealth + (GAME_BALANCE.player.maxHealth - this.initialHealth) * progress,
      complete: this.started && progress >= 1,
    };
  }
}
