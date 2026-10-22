export type DefeatReason = 'player' | 'house';

export class GameSession {
  private defeat: DefeatReason | null = null;

  get isOver(): boolean {
    return this.defeat !== null;
  }

  get defeatReason(): DefeatReason | null {
    return this.defeat;
  }

  end(reason: DefeatReason): void {
    if (!this.defeat) {
      this.defeat = reason;
    }
  }
}
