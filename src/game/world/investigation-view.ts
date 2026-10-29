import * as THREE from 'three';
import { INVESTIGATION_STATIONS } from '../narrative/investigation-data';

/** Cold evidence only. Shared materials/geometries are allocated once. */
export class InvestigationView {
  readonly object = new THREE.Group();
  readonly markers: THREE.Mesh[] = [];
  constructor(terrain: (x: number, z: number) => number) {
    const dry = new THREE.MeshStandardMaterial({ color: 0x9c8753 });
    const ash = new THREE.MeshStandardMaterial({ color: 0x383431 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x807969 });
    const grassGeometry = new THREE.ConeGeometry(0.045, 0.32, 3);
    INVESTIGATION_STATIONS.forEach((station, index) => {
      const group = new THREE.Group();
      group.position.set(station.position.x, terrain(station.position.x, station.position.z) + 0.025, station.position.z);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(index === 0 ? 1 : 0.65, 20), index === 0 ? dry : ash);
      patch.geometry.rotateX(-Math.PI / 2);
      const vertices = patch.geometry.attributes.position;
      for (let v = 0; v < vertices.count; v++) vertices.setY(v, terrain(station.position.x + vertices.getX(v), station.position.z + vertices.getZ(v)) - group.position.y + 0.012);
      patch.geometry.computeVertexNormals();
      group.add(patch);
      if (index === 0) {
        for (let i = 0; i < 28; i++) {
          const blade = new THREE.Mesh(grassGeometry, dry);
          blade.position.set(Math.sin(i * 2.4) * (0.2 + i / 40), 0.15, Math.cos(i * 2.4) * (0.2 + i / 40));
          blade.position.y += terrain(station.position.x + blade.position.x, station.position.z + blade.position.z) - group.position.y;
          group.add(blade);
        }
        for (let i = 0; i < 7; i++) {
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.6), ash);
          crack.position.set(Math.sin(i) * 0.5, 0.008, Math.cos(i) * 0.4);
          crack.rotation.y = i;
          group.add(crack);
        }
      } else if (index === 1) {
        const grill = new THREE.Group();
        for (let bar = 0; bar < 7; bar++) {
          const rod = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.025, 0.025), stone);
          rod.position.set(0, 0.25, -0.3 + bar * 0.1);
          grill.add(rod);
        }
        for (const x of [-0.36, 0.36]) {
          const support = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.26, 0.65), ash);
          support.position.set(x, 0.13, 0);
          grill.add(support);
        }
        group.add(grill);
        const rockGeometry = new THREE.DodecahedronGeometry(0.16);
        for (let i = 0; i < 9; i++) {
          const rock = new THREE.Mesh(rockGeometry, stone);
          rock.position.set(Math.sin(i * Math.PI * 2 / 9) * 0.5, 0.1, Math.cos(i * Math.PI * 2 / 9) * 0.5);
          group.add(rock);
          const coal = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.1), ash);
          coal.position.set(Math.sin(i) * 0.25, 0.04, Math.cos(i * 3) * 0.25);
          group.add(coal);
        }
      } else {
        patch.scale.setScalar(0.3);
        const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0xd6a65e }));
        butt.rotation.z = Math.PI / 2;
        butt.position.y = 0.008;
        const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.018, 8), new THREE.MeshStandardMaterial({ color: 0xe5dfca }));
        paper.rotation.z = Math.PI / 2;
        paper.position.set(0.026, 0.008, 0);
        group.add(butt, paper);
      }
      const marker = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 6, 24), new THREE.MeshBasicMaterial({ color: 0x8ed1c0 }));
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.025;
      group.add(marker);
      this.markers.push(marker);
      this.object.add(group);
    });
    this.object.visible = false;
  }
}
