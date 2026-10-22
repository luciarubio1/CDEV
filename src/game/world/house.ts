import * as THREE from 'three';
import { FireSource } from '../fire/fire-source';

export class House {
  readonly object = new THREE.Group();

  private readonly wallsMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b7653,
    roughness: 0.9,
  });
  private readonly roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b3832,
    roughness: 0.85,
  });
  private readonly fire = new FireSource({
    position: new THREE.Vector3(0, 0, 0),
    intensity: 1.3,
  });
  private burned = false;

  constructor(position: THREE.Vector3) {
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.8, 4),
      this.wallsMaterial,
    );
    walls.position.y = 1.4;
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.object.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 2.2, 4),
      this.roofMaterial,
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.9;
    roof.castShadow = true;
    this.object.add(roof);

    this.object.position.copy(position);
  }

  ignite(): void {
    if (this.burned) {
      return;
    }

    this.burned = true;
    this.wallsMaterial.color.set(0x302721);
    this.roofMaterial.color.set(0x171312);
    this.object.add(this.fire.object);
  }
}
