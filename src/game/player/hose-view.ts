import * as THREE from 'three';

export class HoseView {
  readonly object = new THREE.Group();

  private readonly water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.08, 1, 12),
    new THREE.MeshBasicMaterial({
      color: 0x9edcff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );

  private readonly nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.45, 12),
    new THREE.MeshStandardMaterial({
      color: 0x30363b,
      roughness: 0.55,
      metalness: 0.6,
    }),
  );

  private watering = false;

  constructor(private readonly camera: THREE.Camera, private readonly scene: THREE.Scene) {
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.045, 8, 24, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({
        color: 0x1c2429,
        roughness: 0.8,
        metalness: 0.1,
      }),
    );
    hose.rotation.set(0.4, 0.2, -0.5);
    hose.position.set(0.26, -0.3, -0.62);
    this.object.add(hose);

    this.nozzle.rotation.x = Math.PI / 2;
    this.nozzle.position.set(0.26, -0.3, -0.78);
    this.object.add(this.nozzle);
    this.water.visible = false;
    this.scene.add(this.water);
    this.camera.add(this.object);
  }

  setWatering(enabled: boolean): void {
    this.watering = enabled;
    this.water.visible = enabled;
  }

  update(target: THREE.Vector3 | null): void {
    if (!this.watering || !target) {
      this.water.visible = false;
      return;
    }

    const origin = new THREE.Vector3();
    this.nozzle.getWorldPosition(origin);
    const distance = origin.distanceTo(target);
    this.water.visible = distance > 0.1;
    this.water.position.copy(origin).lerp(target, 0.5);
    this.water.scale.set(1, distance, 1);
    this.water.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      target.clone().sub(origin).normalize(),
    );
  }
}
