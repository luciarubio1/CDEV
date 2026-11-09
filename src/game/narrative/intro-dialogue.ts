export const INTRO_NARRATION_LINES = [
  'El fuego avanza por las sierras.',
  'Vamos a proteger la casa y el bosque.',
  'Primero, prepará el equipo.',
] as const;

export const INTRO_DIALOGUE_TEXT = INTRO_NARRATION_LINES.join('\n');

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
