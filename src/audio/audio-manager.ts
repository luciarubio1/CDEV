import ambienceWindUrl from './ambience-wind.mp3';
import defeatUrl from './defeat.mp3';
import fireLoopUrl from './fire-loop.mp3';
import fireTruckUrl from './firetruck.mp3';
import radioBeepUrl from './radio beep.mp3';
import sirenUrl from './siren.mp3';
import truckRefillUrl from './truck-refill.mp3';
import waterSprayUrl from './water-spray.mp3';
import introOneUrl from './inicio_1.mp3';
import introTwoUrl from './inicio_2.mp3';
import missionOneUrl from './mission-01.mp3';
import missionTwoUrl from './mission-02.mp3';
import safetyOneUrl from './safety-01.mp3';
import endingMissionUrl from './mision_cumplida.mp3';
import endingEducationUrl from './mensaje_educativo.mp3';
import endingSafetyUrl from './aviso_de_seguridad.mp3';
import faunaTrailStartUrl from './inicio_sendero.mp3';
import faunaRefugeUrl from './animal_refugio.mp3';
import faunaFoxFoundUrl from './zorro_encontrado.mp3';
import faunaRadioUrl from './aviso_zorro_radio.mp3';
import faunaVeterinarianUrl from './veterinario.mp3';
import faunaIdentificationUrl from './identificacion_zorro.mp3';
import faunaTransferUrl from './traslado.mp3';
import faunaRescueEndUrl from './cierre_de_rescate.mp3';
import preparationUrl from './preparacion.mp3';
import radioUrl from './radio.mp3';
import houseProtectedUrl from './casa_protegida.mp3';
import finalFireUrl from './final del incendio.mp3';
import investigationUrl from './investigacion.mp3';
import investigationClosingUrl from './cierre de investigacion.mp3';

export const AUDIO_VOLUMES = {
  ambience: 0.2,
  fireMin: 0.04,
  fireMax: 0.28,
  waterSpray: 0.35,
  truckRefill: 0.5,
  siren: 0.45,
  defeat: 0.6,
  narration: 0.9,
} as const;

export const FIRE_AUDIO_FALLOFF_DISTANCE = 22;

type LoopSoundName = 'ambience' | 'fire' | 'waterSpray' | 'siren';
type OneShotSoundName = 'truckRefill' | 'defeat' | 'sirenCue' | 'radioBeep';
export type NarrationName =
  | 'intro-01' | 'intro-02' | 'intro-03' | 'mission-01' | 'mission-02' | 'safety-01'
  | 'ending-mission' | 'ending-education' | 'ending-safety'
  | 'fauna-trail-start' | 'fauna-refuge' | 'fauna-fox-found' | 'fauna-radio'
  | 'fauna-veterinarian' | 'fauna-identification' | 'fauna-transfer' | 'fauna-rescue-end'
  | 'preparation' | 'radio' | 'house-protected' | 'final-fire' | 'investigation' | 'investigation-closing';

function createAudio(url: string, loop = false): HTMLAudioElement {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.preload = 'auto';
  audio.addEventListener('error', () => undefined);
  return audio;
}

export class AudioManager {
  private readonly loops: Record<LoopSoundName, HTMLAudioElement> = {
    ambience: createAudio(ambienceWindUrl, true),
    fire: createAudio(fireLoopUrl, true),
    waterSpray: createAudio(waterSprayUrl, true),
    siren: createAudio(fireTruckUrl, true),
  };
  private readonly oneShots: Record<OneShotSoundName, HTMLAudioElement> = {
    truckRefill: createAudio(truckRefillUrl),
    defeat: createAudio(defeatUrl),
    sirenCue: createAudio(sirenUrl),
    radioBeep: createAudio(radioBeepUrl),
  };
  private started = false;
  private muted = false;
  private fireTargetVolume = 0;
  private defeatPlayed = false;
  private readonly narration: Record<NarrationName, HTMLAudioElement> = {
    'intro-01': createAudio(introOneUrl),
    'intro-02': createAudio(introTwoUrl),
    'intro-03': createAudio(preparationUrl),
    'mission-01': createAudio(missionOneUrl),
    'mission-02': createAudio(missionTwoUrl),
    'safety-01': createAudio(safetyOneUrl),
    'ending-mission': createAudio(endingMissionUrl),
    'ending-education': createAudio(endingEducationUrl),
    'ending-safety': createAudio(endingSafetyUrl),
    'fauna-trail-start': createAudio(faunaTrailStartUrl),
    'fauna-refuge': createAudio(faunaRefugeUrl),
    'fauna-fox-found': createAudio(faunaFoxFoundUrl),
    'fauna-radio': createAudio(faunaRadioUrl),
    'fauna-veterinarian': createAudio(faunaVeterinarianUrl),
    'fauna-identification': createAudio(faunaIdentificationUrl),
    'fauna-transfer': createAudio(faunaTransferUrl),
    'fauna-rescue-end': createAudio(faunaRescueEndUrl),
    preparation: createAudio(preparationUrl),
    radio: createAudio(radioUrl),
    'house-protected': createAudio(houseProtectedUrl),
    'final-fire': createAudio(finalFireUrl),
    investigation: createAudio(investigationUrl),
    'investigation-closing': createAudio(investigationClosingUrl),
  };
  private narrationSequenceToken = 0;

  constructor() {
    this.loops.ambience.volume = AUDIO_VOLUMES.ambience;
    this.loops.fire.volume = 0;
    this.loops.waterSpray.volume = AUDIO_VOLUMES.waterSpray;
    this.loops.siren.volume = AUDIO_VOLUMES.siren;
    this.oneShots.truckRefill.volume = AUDIO_VOLUMES.truckRefill;
    this.oneShots.defeat.volume = AUDIO_VOLUMES.defeat;
    this.oneShots.sirenCue.volume = AUDIO_VOLUMES.siren;
    this.oneShots.radioBeep.volume = AUDIO_VOLUMES.siren;
    Object.values(this.narration).forEach((audio) => { audio.volume = AUDIO_VOLUMES.narration; });
  }

  get isMuted(): boolean {
    return this.muted;
  }

  start(): void {
    this.started = true;
    this.playLoop('ambience');
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    [...Object.values(this.loops), ...Object.values(this.oneShots)].forEach(
      (audio) => {
        audio.muted = this.muted;
      },
    );
    Object.values(this.narration).forEach((audio) => { audio.muted = this.muted; });
    return this.muted;
  }

  updateFire(activeFireCount: number, nearestDistance: number, delta: number): void {
    if (!this.started || activeFireCount === 0) {
      this.fireTargetVolume = 0;
      this.stopLoop('fire');
      return;
    }

    const proximity = Number.isFinite(nearestDistance)
      ? Math.max(0, 1 - nearestDistance / FIRE_AUDIO_FALLOFF_DISTANCE)
      : 0;
    this.fireTargetVolume =
      AUDIO_VOLUMES.fireMin +
      (AUDIO_VOLUMES.fireMax - AUDIO_VOLUMES.fireMin) * proximity;
    this.playLoop('fire');

    const smoothing = 1 - Math.exp(-5 * delta);
    this.loops.fire.volume +=
      (this.fireTargetVolume - this.loops.fire.volume) * smoothing;
  }

  setWaterSpray(active: boolean): void {
    if (!this.started || !active) {
      this.stopLoop('waterSpray');
      return;
    }

    this.playLoop('waterSpray');
  }

  setTruckSiren(active: boolean): void {
    if (!this.started || !active) {
      this.stopLoop('siren');
      return;
    }

    this.playLoop('siren');
  }

  playTruckRefill(): void {
    this.playOneShot('truckRefill');
  }

  playSirenCue(): void {
    this.playOneShot('sirenCue');
  }

  playRadioBeep(): void {
    this.playOneShot('radioBeep');
  }

  playDefeatOnce(): void {
    if (this.defeatPlayed) {
      return;
    }

    this.defeatPlayed = true;
    this.stopAllLoops();
    this.stopNarration();
    this.playOneShot('defeat');
  }

  playNarration(name: NarrationName): void {
    if (!this.started) return;
    this.stopNarration();
    const audio = this.narration[name];
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  playNarrationSequence(
    names: readonly NarrationName[],
    onStart?: (name: NarrationName) => void,
  ): void {
    if (!this.started || names.length === 0) return;
    this.stopNarration();
    const token = ++this.narrationSequenceToken;
    let index = 0;
    const playNext = (): void => {
      if (token !== this.narrationSequenceToken || index >= names.length) return;
      const audio = this.narration[names[index]];
      const name = names[index];
      index += 1;
      onStart?.(name);
      audio.currentTime = 0;
      audio.onended = playNext;
      audio.onerror = playNext;
      void audio.play().catch(() => {
        if (token === this.narrationSequenceToken) playNext();
      });
    };
    playNext();
  }

  stopNarration(): void {
    this.narrationSequenceToken += 1;
    Object.values(this.narration).forEach((audio) => {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    });
  }

  stopAllLoops(): void {
    (Object.keys(this.loops) as LoopSoundName[]).forEach((name) =>
      this.stopLoop(name),
    );
  }

  private playLoop(name: LoopSoundName): void {
    if (!this.started) {
      return;
    }

    const audio = this.loops[name];
    if (!audio.paused) {
      return;
    }
    void audio.play().catch(() => undefined);
  }

  private stopLoop(name: LoopSoundName): void {
    const audio = this.loops[name];
    audio.pause();
    audio.currentTime = 0;
  }

  private playOneShot(name: OneShotSoundName): void {
    if (!this.started) {
      return;
    }

    const audio = this.oneShots[name];
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }
}
