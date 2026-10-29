import * as THREE from 'three';

/** Alcance visual máximo del chorro, en metros. */
export const HOSE_SPRAY_RANGE = 5.2;
/** Apertura lateral máxima de las gotas al final del chorro, en metros. */
export const HOSE_SPRAY_SPREAD = 0.22;
/** Cantidad fija de gotas reutilizadas por el chorro. */
export const HOSE_SPRAY_PARTICLE_COUNT = 22;

interface WaterParticle {
  sprite: THREE.Sprite;
  phase: number;
  lane: number;
}

function createWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la textura del agua.');

  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 29);
  gradient.addColorStop(0, 'rgba(245, 255, 255, 1)');
  gradient.addColorStop(0.45, 'rgba(151, 221, 255, 0.92)');
  gradient.addColorStop(1, 'rgba(106, 190, 245, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class HoseView {
  readonly object = new THREE.Group();

  private readonly nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: 0x30363b, roughness: 0.55, metalness: 0.6 }),
  );
  private readonly spray = new THREE.Group();
  private readonly particles: WaterParticle[] = [];
  private readonly origin = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private elapsed = 0;
  private watering = false;
  private equipped = false;

  constructor(private readonly camera: THREE.Camera, private readonly scene: THREE.Scene) {
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.045, 8, 24, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1c2429, roughness: 0.8, metalness: 0.1 }),
    );
    hose.rotation.set(0.4, 0.2, -0.5);
    hose.position.set(0.26, -0.3, -0.62);
    this.object.add(hose);

    this.nozzle.rotation.x = Math.PI / 2;
    this.nozzle.position.set(0.26, -0.3, -0.78);
    this.object.add(this.nozzle);

    const waterTexture = createWaterTexture();
    for (let index = 0; index < HOSE_SPRAY_PARTICLE_COUNT; index += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: waterTexture,
        color: 0xb9ecff,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.visible = false;
      this.spray.add(sprite);
      this.particles.push({ sprite, phase: Math.random(), lane: Math.random() * 2 - 1 });
    }
    this.spray.visible = false;
    this.object.visible = false;
    this.scene.add(this.spray);
    this.camera.add(this.object);
  }

  setEquipped(equipped: boolean): void {
    this.equipped = equipped;
    this.object.visible = equipped;
    if (!equipped) this.setWatering(false);
  }

  setWatering(enabled: boolean): void {
    this.watering = enabled && this.equipped;
    this.spray.visible = this.watering;
  }

  update(target: THREE.Vector3 | null, delta = 0): void {
    if (!this.watering) {
      this.spray.visible = false;
      return;
    }

    this.elapsed += delta;
    this.nozzle.getWorldPosition(this.origin);
    this.camera.getWorldDirection(this.direction).normalize();
    let distance = HOSE_SPRAY_RANGE;
    if (target) {
      const targetDistance = target.distanceTo(this.origin);
      distance = Math.min(HOSE_SPRAY_RANGE, targetDistance);
    }
    this.right.crossVectors(this.direction, this.camera.up).normalize();
    this.up.crossVectors(this.right, this.direction).normalize();
    this.spray.visible = distance > 0.1;

    this.particles.forEach((particle, index) => {
      const travel = (particle.phase + this.elapsed * 1.75) % 1;
      const spread = HOSE_SPRAY_SPREAD * travel;
      const wave = Math.sin((this.elapsed + index) * 7) * 0.035;
      particle.sprite.position.copy(this.origin)
        .addScaledVector(this.direction, distance * travel)
        .addScaledVector(this.right, particle.lane * spread + wave)
        .addScaledVector(this.up, Math.cos((this.elapsed + index) * 5) * spread * 0.55 - travel * travel * 0.08);
      const size = 0.075 + travel * 0.11;
      particle.sprite.scale.set(size * 0.72, size * 1.5, 1);
      particle.sprite.material.opacity = 0.5 + (1 - travel) * 0.4;
      particle.sprite.visible = true;
    });
  }
}
