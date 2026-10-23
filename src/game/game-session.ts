export type DefeatReason = 'player' | 'house' | 'forest';
export type GameResult = DefeatReason | 'victory';

export class GameSession {
  private result: GameResult | null = null;

  get isOver(): boolean {
    return this.result !== null;
  }

  get defeatReason(): DefeatReason | null {
    return this.result === 'victory' ? null : this.result;
  }

  get isVictory(): boolean {
    return this.result === 'victory';
  }

  end(reason: DefeatReason): void {
    if (!this.result) {
      this.result = reason;
    }
  }

  win(): void {
    if (!this.result) {
      this.result = 'victory';
    }
  }
}
