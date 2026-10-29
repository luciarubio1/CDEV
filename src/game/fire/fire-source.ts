import * as THREE from 'three';
import { GAME_BALANCE } from '../balance-config';

export interface FireSourceOptions {
  position: THREE.Vector3;
  intensity?: number;
  kind?: 'common' | 'critical';
}

export interface FireWind {
  direction: THREE.Vector3;
  intensity: number;
}

interface FireParticle {
  sprite: THREE.Sprite;
  origin: THREE.Vector3;
  phase: number;
  speed: number;
  rise: number;
}

interface ImpactParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
}

/** Cantidad fija de salpicaduras reutilizadas al mojar un foco. */
export const FIRE_WATER_SPLASH_PARTICLE_COUNT = 14;
/** Segundos que persiste el humo extra generado por el agua. */
export const FIRE_WATER_SMOKE_DURATION = 0.75;

function createParticleTexture(
  centerColor: string,
  edgeColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo crear la textura procedural del incendio.');
  }

  const gradient = context.createRadialGradient(64, 70, 4, 64, 64, 60);
  gradient.addColorStop(0, centerColor);
  gradient.addColorStop(0.35, centerColor);
  gradient.addColorStop(1, edgeColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class FireSource {
  readonly object = new THREE.Group();

  private readonly flames: FireParticle[] = [];
  private readonly smoke: FireParticle[] = [];
  private readonly waterSplashes: ImpactParticle[] = [];
  private readonly waterMist: ImpactParticle[] = [];
  private readonly embers: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberPhases: number[];
  private readonly light: THREE.PointLight;
  private intensity: number;
  private readonly initialIntensity: number;
  private readonly initialResistance: number;
  private resistance: number;
  private elapsed = 0;
  private waterImpactTime = 0;
  private nextSplash = 0;
  private nextMist = 0;
  private active = true;

  get intensityValue(): number {
    return this.intensity;
  }

  get startingIntensity(): number {
    return this.initialIntensity;
  }

  get activeDuration(): number {
    return this.elapsed;
  }

  get isActive(): boolean {
    return this.active;
  }

  get remainingResistance(): number { return this.resistance; }
  get extinguishProgress(): number { return 1 - this.resistance / this.initialResistance; }

  extinguish(amount: number): void {
    if (!this.active) {
      return;
    }

    this.resistance = Math.max(0, this.resistance - Math.max(0, amount));
    if (this.resistance < 1e-10) this.resistance = 0;
    this.intensity = this.initialIntensity * (this.resistance / this.initialResistance);
    if (this.resistance === 0) {
      this.active = false;
      this.object.visible = false;
      this.light.intensity = 0;
    } else {
      // Sin esperar al siguiente frame de simulación para reducir llamas y luz.
      const fraction = this.resistance / this.initialResistance;
      this.flames.forEach((particle) => particle.sprite.scale.setScalar(this.intensity));
      this.light.intensity = 6 * this.initialIntensity * fraction;
    }
  }

  /** Activa efectos visuales preasignados; no crea partículas durante el juego. */
  applyWaterImpact(): void {
    if (!this.active) return;
    this.waterImpactTime = FIRE_WATER_SMOKE_DURATION;
    for (let index = 0; index < 3; index += 1) {
      const splash = this.waterSplashes[this.nextSplash++ % this.waterSplashes.length];
      splash.life = 0.32 + Math.random() * 0.16;
      splash.sprite.position.set((Math.random() - 0.5) * 0.6, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6);
      splash.velocity.set((Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 0.8, (Math.random() - 0.5) * 1.5);
      splash.sprite.visible = true;
    }
    for (let index = 0; index < 2; index += 1) {
      const mist = this.waterMist[this.nextMist++ % this.waterMist.length];
      mist.life = FIRE_WATER_SMOKE_DURATION;
      mist.sprite.position.set((Math.random() - 0.5) * 0.5, 1 + Math.random() * 0.35, (Math.random() - 0.5) * 0.5);
      mist.velocity.set((Math.random() - 0.5) * 0.2, 0.7 + Math.random() * 0.25, (Math.random() - 0.5) * 0.2);
      mist.sprite.visible = true;
    }
  }

  constructor(options: FireSourceOptions) {
    this.intensity = options.intensity ?? 1;
    this.initialIntensity = this.intensity;
    this.initialResistance = GAME_BALANCE.fire.waterResistance[options.kind ?? 'common'];
    this.resistance = this.initialResistance;
    this.object.position.copy(options.position);

    const flameTexture = createParticleTexture(
      'rgba(255, 245, 175, 1)',
      'rgba(244, 78, 0, 0)',
    );
    const smokeTexture = createParticleTexture(
      'rgba(75, 75, 75, 0.45)',
      'rgba(35, 35, 35, 0)',
    );
    const waterTexture = createParticleTexture(
      'rgba(228, 250, 255, 0.95)',
      'rgba(139, 217, 255, 0)',
    );
    const mistTexture = createParticleTexture(
      'rgba(232, 238, 238, 0.58)',
      'rgba(170, 181, 183, 0)',
    );

    for (let index = 0; index < 7; index += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: flameTexture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.7,
        0.65 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.7,
      );
      sprite.position.copy(origin);
      sprite.scale.setScalar(1 + Math.random() * 0.7);
      this.object.add(sprite);
      this.flames.push({
        sprite,
        origin,
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 2,
        rise: 0.8 + Math.random() * 0.5,
      });
    }

    for (let index = 0; index < 5; index += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.35,
        }),
      );
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        1.6 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.5,
      );
      sprite.position.copy(origin);
      sprite.scale.setScalar(0.8 + Math.random() * 0.6);
      this.object.add(sprite);
      this.smoke.push({
        sprite,
        origin,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.25,
        rise: 0.4 + Math.random() * 0.3,
      });
    }

    for (let index = 0; index < FIRE_WATER_SPLASH_PARTICLE_COUNT; index += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: waterTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.visible = false;
      this.object.add(sprite);
      this.waterSplashes.push({ sprite, velocity: new THREE.Vector3(), life: 0 });
    }
    for (let index = 0; index < 8; index += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTexture, transparent: true, depthWrite: false, opacity: 0.45,
      }));
      sprite.visible = false;
      this.object.add(sprite);
      this.waterMist.push({ sprite, velocity: new THREE.Vector3(), life: 0 });
    }

    const emberCount = 24;
    this.emberPositions = new Float32Array(emberCount * 3);
    this.emberPhases = [];
    for (let index = 0; index < emberCount; index += 1) {
      this.emberPositions[index * 3] = (Math.random() - 0.5) * 0.8;
      this.emberPositions[index * 3 + 1] = 0.6 + Math.random() * 2;
      this.emberPositions[index * 3 + 2] = (Math.random() - 0.5) * 0.8;
      this.emberPhases.push(Math.random() * Math.PI * 2);
    }

    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.emberPositions, 3),
    );
    this.embers = new THREE.Points(
      emberGeometry,
      new THREE.PointsMaterial({
        color: 0xffa51f,
        size: 0.08,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.object.add(this.embers);

    this.light = new THREE.PointLight(0xff6a1a, 6 * this.intensity, 8, 2);
    this.light.position.set(0, 1.4, 0);
    this.object.add(this.light);
  }

  update(delta: number, wind?: FireWind): void {
    if (!this.active) {
      this.object.visible = false;
      return;
    }

    this.object.visible = true;
    this.elapsed += delta;
    const windX = (wind?.direction.x ?? 0) * (wind?.intensity ?? 0);
    const windZ = (wind?.direction.z ?? 0) * (wind?.intensity ?? 0);
    const flicker = 0.85 + Math.sin(this.elapsed * 11) * 0.1;
    this.light.intensity = 6 * this.intensity * flicker;

    this.flames.forEach((particle) => {
      const time = this.elapsed * particle.speed + particle.phase;
      particle.sprite.position.x =
        particle.origin.x + Math.sin(time) * 0.12;
      particle.sprite.position.y =
        particle.origin.y + ((this.elapsed * particle.rise) % 1.1);
      particle.sprite.position.z =
        particle.origin.z + Math.cos(time * 0.8) * 0.12;
      particle.sprite.scale.setScalar(
        (1 + Math.sin(time * 1.4) * 0.15) * this.intensity,
      );
    });

    this.smoke.forEach((particle) => {
      const time = this.elapsed * particle.speed + particle.phase;
      particle.sprite.position.x =
        particle.origin.x + Math.sin(time) * 0.25;
      particle.sprite.position.y =
        particle.origin.y + ((this.elapsed * particle.rise) % 1.5);
      particle.sprite.position.z =
        particle.origin.z + Math.cos(time * 0.7) * 0.2 + windZ * ((this.elapsed * particle.rise) % 1.5) * 0.75;
      particle.sprite.position.x += windX * ((this.elapsed * particle.rise) % 1.5) * 0.75;
      particle.sprite.material.opacity = 0.22 + Math.sin(time) * 0.08 + (this.waterImpactTime > 0 ? 0.12 : 0);
    });

    this.waterImpactTime = Math.max(0, this.waterImpactTime - delta);
    this.updateImpactParticles(this.waterSplashes, delta, 1.9);
    this.updateImpactParticles(this.waterMist, delta, 0.28);

    for (let index = 0; index < this.emberPhases.length; index += 1) {
      const time = this.elapsed * 1.5 + this.emberPhases[index];
      this.emberPositions[index * 3 + 1] += delta * 0.35;
      if (this.emberPositions[index * 3 + 1] > 2.8) {
        this.emberPositions[index * 3 + 1] = 0.6;
      }
      this.emberPositions[index * 3] += Math.sin(time) * delta * 0.15;
      this.emberPositions[index * 3 + 2] += Math.cos(time) * delta * 0.15;
      this.emberPositions[index * 3] += windX * delta * 0.45;
      this.emberPositions[index * 3 + 2] += windZ * delta * 0.45;
    }

    this.embers.geometry.attributes.position.needsUpdate = true;
  }

  private updateImpactParticles(particles: ImpactParticle[], delta: number, gravity: number): void {
    particles.forEach((particle) => {
      if (particle.life <= 0) return;
      particle.life = Math.max(0, particle.life - delta);
      particle.velocity.y -= gravity * delta;
      particle.sprite.position.addScaledVector(particle.velocity, delta);
      const opacity = Math.min(1, particle.life * 3);
      particle.sprite.material.opacity = opacity * (particles === this.waterMist ? 0.5 : 0.9);
      particle.sprite.scale.setScalar(particles === this.waterMist ? 0.8 + (1 - particle.life / FIRE_WATER_SMOKE_DURATION) * 0.8 : 0.12 + particle.life * 0.18);
      particle.sprite.visible = particle.life > 0;
    });
  }
}
