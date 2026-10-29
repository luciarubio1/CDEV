import * as THREE from 'three';
import { FAUNA_CONFIG } from '../narrative/fauna-config';
import { RESCUE_CONFIG } from '../narrative/wildlife-rescue-config';

function material(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
}
function ellipsoid(parent: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
}

export class FaunaAnimals {
  readonly object = new THREE.Group();
  readonly smallAnimal = new THREE.Group();
  readonly fox = new THREE.Group();
  private readonly foxBody: THREE.Mesh;
  private elapsed = 0;
  private readonly legs: THREE.Object3D[] = [];
  constructor(private readonly terrain: (x: number, z: number) => number) {
    const grey = material(0x867d68), cream = material(0xe4d3b2), dark = material(0x34302b);
    ellipsoid(this.smallAnimal, grey, 0, 0.22, 0, 0.22, 0.18, 0.14);
    ellipsoid(this.smallAnimal, grey, 0.2, 0.31, 0, 0.11, 0.12, 0.1);
    for (const z of [-0.055, 0.055]) {
      ellipsoid(this.smallAnimal, grey, 0.21, 0.49, z, 0.04, 0.15, 0.03);
      ellipsoid(this.smallAnimal, grey, 0.03, 0.06, z * 1.6, 0.18, 0.05, 0.055);
    }
    ellipsoid(this.smallAnimal, cream, -0.23, 0.24, 0, 0.07, 0.07, 0.07);
    this.smallAnimal.position.copy(FAUNA_CONFIG.refugeRoute[0]);
    this.ground(this.smallAnimal);
    const conserved = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), material(0x687e4d));
      shrub.position.set(-0.5 + i * 0.3, 0.25, 0); conserved.add(shrub);
    }
    conserved.position.set(-0.4, 0, 17.3); this.ground(conserved);
    this.object.add(conserved);

    this.fox.name = 'zorro-en-evaluacion';
    this.foxBody = ellipsoid(this.fox, grey, 0, 0.36, 0, 0.43, 0.22, 0.18);
    ellipsoid(this.fox, cream, 0.23, 0.4, 0, 0.18, 0.16, 0.15);
    ellipsoid(this.fox, grey, 0.4, 0.55, 0, 0.18, 0.17, 0.14);
    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), cream);
    muzzle.rotation.z = -Math.PI / 2; muzzle.position.set(0.61, 0.52, 0); this.fox.add(muzzle);
    ellipsoid(this.fox, dark, 0.74, 0.52, 0, 0.035, 0.035, 0.04);
    for (const z of [-0.11, 0.11]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), grey);
      ear.position.set(0.39, 0.77, z); this.fox.add(ear);
      ellipsoid(this.fox, dark, 0.49, 0.6, z * 1.16, 0.024, 0.024, 0.018);
      for (const x of [-0.26, 0.25]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 8), dark);
        leg.position.set(x, 0.14, z); this.fox.add(leg);
        this.legs.push(leg);
      }
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.55, 10), grey);
    tail.rotation.z = Math.PI / 2; tail.position.set(-0.62, 0.25, 0); this.fox.add(tail);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.25, 10), dark);
    tip.rotation.z = Math.PI / 2; tip.position.set(-0.99, 0.25, 0); this.fox.add(tip);
    this.fox.scale.setScalar(RESCUE_CONFIG.foxScale);
    this.fox.position.copy(FAUNA_CONFIG.fox); this.ground(this.fox);
    // Apoyar cada pata en el relieve, sin elevar el animal entero para simular respiración.
    this.fox.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry.type === 'CylinderGeometry' && child.position.y === 0.14) {
        child.position.y += (terrain(this.fox.position.x + child.position.x * RESCUE_CONFIG.foxScale, this.fox.position.z + child.position.z * RESCUE_CONFIG.foxScale) - this.fox.position.y) / RESCUE_CONFIG.foxScale;
      }
    });

    const refuge = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), material(0x777569));
    rock.scale.set(1.2, 0.65, 0.8); rock.position.set(-0.45, 0.3, 0.1); refuge.add(rock);
    for (let i = 0; i < 4; i++) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), material(0x63734f));
      shrub.position.set(0.3 + i * 0.15, 0.3, (i % 2) * 0.25); refuge.add(shrub);
    }
    refuge.position.copy(FAUNA_CONFIG.refugeRoute.at(-1)!); this.ground(refuge);
    this.object.add(this.smallAnimal, this.fox, refuge);
    this.object.visible = false;
  }
  update(delta: number): void {
    this.elapsed += delta;
    this.foxBody.scale.y = 0.22 * (1 + Math.sin(this.elapsed * 2.5) * 0.035);
  }
  restFox(): void {
    this.foxBody.position.y = 0.30;
    this.legs.forEach((leg) => { leg.rotation.z = 1.1; leg.position.y = 0.12; });
  }
  private ground(object: THREE.Object3D): void { object.position.y = this.terrain(object.position.x, object.position.z); }
}
