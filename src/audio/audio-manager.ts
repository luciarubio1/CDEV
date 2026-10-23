import ambienceWindUrl from './ambience-wind.mp3';
import defeatUrl from './defeat.mp3';
import fireLoopUrl from './fire-loop.mp3';
import sirenUrl from './siren.mp3';
import truckRefillUrl from './truck-refill.mp3';
import waterSprayUrl from './water-spray.mp3';

export const AUDIO_VOLUMES = {
  ambience: 0.2,
  fireMin: 0.04,
  fireMax: 0.28,
  waterSpray: 0.35,
  truckRefill: 0.5,
  siren: 0.45,
  defeat: 0.6,
} as const;

export const FIRE_AUDIO_FALLOFF_DISTANCE = 22;

type LoopSoundName = 'ambience' | 'fire' | 'waterSpray' | 'siren';
type OneShotSoundName = 'truckRefill' | 'defeat' | 'sirenCue';

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
    siren: createAudio(sirenUrl, true),
  };
  private readonly oneShots: Record<OneShotSoundName, HTMLAudioElement> = {
    truckRefill: createAudio(truckRefillUrl),
    defeat: createAudio(defeatUrl),
    sirenCue: createAudio(sirenUrl),
  };
  private started = false;
  private muted = false;
  private fireTargetVolume = 0;
  private defeatPlayed = false;

  constructor() {
    this.loops.ambience.volume = AUDIO_VOLUMES.ambience;
    this.loops.fire.volume = 0;
    this.loops.waterSpray.volume = AUDIO_VOLUMES.waterSpray;
    this.loops.siren.volume = AUDIO_VOLUMES.siren;
    this.oneShots.truckRefill.volume = AUDIO_VOLUMES.truckRefill;
    this.oneShots.defeat.volume = AUDIO_VOLUMES.defeat;
    this.oneShots.sirenCue.volume = AUDIO_VOLUMES.siren;
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

  playDefeatOnce(): void {
    if (this.defeatPlayed) {
      return;
    }

    this.defeatPlayed = true;
    this.stopAllLoops();
    this.playOneShot('defeat');
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
