export const INTRO_DIALOGUE_TEXT =
  'La sequía dejó las sierras al límite. El fuego ya se está expandiendo.\n' +
  'Preparate en el camión, conectá la manguera y contené los focos antes de que alcancen la casa.';

export const GUIDE_REPEAT_TEXT = 'Prepará el equipo en el camión.';

export class IntroDialogue {
  private hasSpoken = false;
  private open = false;

  get isComplete(): boolean {
    return this.hasSpoken;
  }

  get isOpen(): boolean {
    return this.open;
  }

  get text(): string {
    return this.hasSpoken ? GUIDE_REPEAT_TEXT : INTRO_DIALOGUE_TEXT;
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
    this.hasSpoken = true;
  }
}
