import * as THREE from 'three';

export const CARRIER_SIZE = { width: 1.4, depth: 0.75, height: 0.8 } as const;

/** Transportín único: se reparentea al jugador, al equipo y al puesto. */
export function createAnimalCarrier(): THREE.Group {
  const object = new THREE.Group();
  object.name = 'transportin';
  const shell = new THREE.MeshStandardMaterial({ color: 0xa8b5a9, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x35423f });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.75), dark);
  base.position.y = 0.05; object.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.75), shell);
  roof.position.y = 0.8; object.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 0.05), shell);
  back.position.set(0, 0.43, -0.35); object.add(back);
  for (const x of [-0.68, 0.68]) for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.045), shell);
    slat.position.set(x, 0.43, -0.32 + i * 0.128); object.add(slat);
  }
  const door = new THREE.Group();
  door.name = 'carrier-door';
  for (let i = 0; i < 9; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.69, 0.035), dark);
    bar.position.set(-0.64 + i * 0.16, 0.43, 0.37); door.add(bar);
  }
  for (const y of [0.1, 0.77]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.035, 0.04), dark);
    bar.position.set(0, y, 0.37); door.add(bar);
  }
  object.add(door);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16, Math.PI), dark);
  handle.position.y = 0.85; object.add(handle);
  object.visible = false;
  return object;
}

export function setCarrierDoor(carrier: THREE.Group, open: number): void {
  const door = carrier.getObjectByName('carrier-door');
  if (door) door.position.y = THREE.MathUtils.clamp(open, 0, 1) * 0.8;
}
