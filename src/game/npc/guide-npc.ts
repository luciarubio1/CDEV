import * as THREE from 'three';
import { FIRE_TRUCK_POSITION } from '../world/fire-truck';

export const GUIDE_NPC_POSITION = FIRE_TRUCK_POSITION.clone().add(
  new THREE.Vector3(-3.8, 0, -3.6),
);
export const GUIDE_NPC_INTERACTION_RADIUS = 2.5;

function setShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function createGuideNpc(): THREE.Group {
  const guide = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({
    color: 0xe85d04,
    roughness: 0.8,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: 0x263238,
    roughness: 0.85,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: 0xb97854,
    roughness: 0.9,
  });
  const helmet = new THREE.MeshStandardMaterial({
    color: 0xffc857,
    roughness: 0.65,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1, 0.38), jacket);
  torso.position.y = 1.45;
  guide.add(torso);

  [-0.22, 0.22].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.85, 10), pants);
    leg.position.set(x, 0.48, 0);
    guide.add(leg);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.38),
      pants,
    );
    boot.position.set(x, 0.08, -0.08);
    guide.add(boot);
  });

  [-0.48, 0.48].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.76, 10), jacket);
    arm.rotation.z = x < 0 ? 0.18 : -0.18;
    arm.position.set(x, 1.45, 0);
    guide.add(arm);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), skin);
  head.position.y = 2.12;
  guide.add(head);

  const helmetTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    helmet,
  );
  helmetTop.position.y = 2.22;
  guide.add(helmetTop);

  const helmetBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.07, 16),
    helmet,
  );
  helmetBrim.position.set(0, 2.17, -0.06);
  guide.add(helmetBrim);

  guide.position.copy(GUIDE_NPC_POSITION);
  guide.lookAt(new THREE.Vector3(0, 0, 7));
  setShadows(guide);
  return guide;
}
