import { PostFireProgression } from './narrative/post-fire-progression';

export type DefeatReason = 'player' | 'house' | 'forest';
export type GameResult = DefeatReason | 'victory';
export type GamePhase = 'mission' | 'reinforcements' | 'companion-dialogue' | 'review' | 'closing' | 'results' | 'defeat';

export class GameSession {
  readonly postFire = new PostFireProgression();
  private result: GameResult | null = null;
  private phase: GamePhase = 'mission';

  get isOver(): boolean {
    return this.result !== null;
  }

  get defeatReason(): DefeatReason | null {
    return this.result === 'victory' ? null : this.result;
  }

  get isVictory(): boolean {
    return this.result === 'victory';
  }

  get currentPhase(): GamePhase { return this.phase; }
  get isContainment(): boolean { return this.phase === 'reinforcements'; }
  get isEpilogue(): boolean { return this.phase === 'review'; }
  get isClosing(): boolean { return this.phase === 'closing'; }
  beginClosing(): void { if (!this.result && this.isEpilogue && this.postFire.rescueCompleted) this.phase = 'closing'; }
  get isCompanionDialogue(): boolean { return this.phase === 'companion-dialogue'; }
  get interventionClosed(): boolean { return this.phase !== 'mission' && this.phase !== 'defeat'; }
  get isMissionActive(): boolean { return this.phase === 'mission'; }

  end(reason: DefeatReason): void {
    if (!this.result && this.isMissionActive) {
      this.result = reason;
      this.phase = 'defeat';
    }
  }

  win(): void {
    if (!this.result && this.isClosing) {
      this.result = 'victory';
      this.phase = 'results';
    }
  }

  beginContainment(): void {
    if (!this.result && this.phase === 'mission') this.phase = 'reinforcements';
  }

  beginCompanionDialogue(): void {
    if (!this.result && this.isContainment) this.phase = 'companion-dialogue';
  }

  beginEpilogue(): void {
    if (!this.result && this.isCompanionDialogue) {
      this.phase = 'review';
      this.postFire.activate();
    }
  }
}
