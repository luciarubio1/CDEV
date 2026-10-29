import * as THREE from 'three';

/** Rig local a la cámara: todas las piezas conservan escala y parentesco. */
export class CareArmsView {
  readonly object = new THREE.Group();
  readonly forearms: THREE.Group[] = [];
  readonly bandages: THREE.Mesh[] = [];

  constructor() {
    this.object.name = 'player-care-arms';
    const skin = new THREE.MeshStandardMaterial({ color: 0xb97854, roughness: 0.85 });
    const fabric = new THREE.MeshStandardMaterial({ color: 0xd86523, roughness: 0.95 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x35444b, roughness: 1 });
    const wrap = new THREE.MeshStandardMaterial({ color: 0xf2eadb, roughness: 1 });
    const lap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.48), pants);
    lap.position.set(0, -0.43, -0.68);
    this.object.add(lap);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = side === -1 ? 'bandaged-forearm' : 'resting-forearm';
      arm.position.set(side * 0.22, -0.32, -0.72);
      arm.rotation.y = side * 0.17;
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.074, 0.38, 12), skin);
      forearm.rotation.x = Math.PI / 2;
      arm.add(forearm);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.095, 0.28, 12), fabric);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.z = 0.24;
      arm.add(sleeve);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.045, 12), pants);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.z = 0.115;
      arm.add(cuff);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
      hand.scale.set(0.078, 0.045, 0.115);
      hand.position.z = -0.265;
      arm.add(hand);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skin);
      thumb.scale.set(0.033, 0.035, 0.065);
      thumb.position.set(-side * 0.07, 0, -0.24);
      arm.add(thumb);
      if (side === -1) for (let i = 0; i < 5; i++) {
        const bandage = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.027, 16), wrap);
        bandage.rotation.x = Math.PI / 2;
        bandage.position.z = -0.07 + i * 0.029;
        bandage.name = 'attached-bandage';
        bandage.visible = false;
        arm.add(bandage);
        this.bandages.push(bandage);
      }
      this.forearms.push(arm);
      this.object.add(arm);
    }
    this.object.visible = false;
  }

  attach(camera: THREE.Camera): void {
    if (this.object.parent !== camera) camera.add(this.object);
  }

  render(progress: number, injured: boolean): void {
    const entrance = THREE.MathUtils.smoothstep(progress, 0, 0.12);
    const withdrawal = THREE.MathUtils.smoothstep(progress, 0.85, 1);
    this.object.position.y = -0.45 * (1 - entrance + withdrawal);
    this.object.visible = progress < 1;
    this.bandages.forEach((bandage, index) => {
      bandage.visible = injured && progress >= 0.35 + index * 0.07;
    });
  }

  hide(): void { this.object.visible = false; }
}
