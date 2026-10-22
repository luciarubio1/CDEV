import * as THREE from 'three';

export const FIRE_TRUCK_POSITION = new THREE.Vector3(-16, 0, 16);
export const FIRE_TRUCK_RELOAD_RADIUS = 3.5;

function createMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 });
}

function enableShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function createFireTruck(): THREE.Group {
  const truck = new THREE.Group();
  const red = createMaterial(0xc83333);
  const dark = createMaterial(0x252b2f);
  const silver = createMaterial(0xc7d0d3);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x82c9e8,
    roughness: 0.2,
    metalness: 0.35,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 5.2), dark);
  chassis.position.y = 0.65;
  truck.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.65, 1.7), red);
  cabin.position.set(0, 1.55, -1.55);
  truck.add(cabin);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.75, 2.7), red);
  tank.position.set(0, 1.6, 0.8);
  truck.add(tank);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.72), glass);
  windshield.position.set(0, 1.8, -2.41);
  truck.add(windshield);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.24), silver);
  bumper.position.set(0, 0.67, -2.72);
  truck.add(bumper);

  [-0.95, 0.95].forEach((x) => {
    [-1.55, 1.55].forEach((z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.3, 16),
        dark,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      truck.add(wheel);
    });
  });

  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 3.3), silver);
  ladder.position.set(0, 2.62, 0.8);
  truck.add(ladder);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12),
    createMaterial(0x1976d2),
  );
  beacon.position.set(0, 2.47, -1.52);
  truck.add(beacon);

  truck.position.copy(FIRE_TRUCK_POSITION);
  truck.rotation.y = Math.PI / 5;
  enableShadows(truck);
  return truck;
}
