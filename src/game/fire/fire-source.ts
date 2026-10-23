import * as THREE from 'three';

export interface FireSourceOptions {
  position: THREE.Vector3;
  intensity?: number;
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
  private readonly embers: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberPhases: number[];
  private readonly light: THREE.PointLight;
  private intensity: number;
  private readonly initialIntensity: number;
  private elapsed = 0;
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

  extinguish(amount: number): void {
    if (!this.active) {
      return;
    }

    this.intensity = Math.max(0, this.intensity - amount);
    if (this.intensity === 0) {
      this.active = false;
    }
  }

  constructor(options: FireSourceOptions) {
    this.intensity = options.intensity ?? 1;
    this.initialIntensity = this.intensity;
    this.object.position.copy(options.position);

    const flameTexture = createParticleTexture(
      'rgba(255, 245, 175, 1)',
      'rgba(244, 78, 0, 0)',
    );
    const smokeTexture = createParticleTexture(
      'rgba(75, 75, 75, 0.45)',
      'rgba(35, 35, 35, 0)',
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
      particle.sprite.material.opacity = 0.22 + Math.sin(time) * 0.08;
    });

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
}
