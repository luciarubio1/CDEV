import * as THREE from 'three';
import { createLabel, SHARED_GEOMETRY as GEO, VISUAL_PALETTE as P, visualBox, visualMaterial } from '../world/visual-style';

export type CharacterRole = 'brigadista' | 'salud' | 'fauna';
export const CHARACTER_STYLE = {
  hipHeight: .94, shoulderHeight: 1.64, shoulderWidth: .86,
  upperArm: .39, forearm: .38, thigh: .43, shin: .39,
  strideLength: 1.45, legSwing: .42, armSwing: .32, kneeFlex: .48, settleResponse: 12, headTurn: .55,
} as const;
interface Limb { pivot: THREE.Group; joint: THREE.Group; end: THREE.Group; }
export interface CharacterRig {
  visual: THREE.Group; torso: THREE.Group; head: THREE.Group; arms: Limb[]; legs: Limb[];
  previous: THREE.Vector3; initialized: boolean; phase: number; blend: number; gesture: number;
  carrier: THREE.Object3D | null;
}
const rigs = new WeakMap<THREE.Object3D, CharacterRig>();
const roots = new Set<THREE.Group>();
const torsoGeometry = new THREE.CylinderGeometry(.39, .28, .64, 6);
const helmetGeometry = new THREE.SphereGeometry(.255, 10, 5, 0, Math.PI*2, 0, Math.PI/2);
const position = new THREE.Vector3(), target = new THREE.Vector3(), shoulder = new THREE.Vector3();
const direction = new THREE.Vector3(), pole = new THREE.Vector3(), elbow = new THREE.Vector3(), fore = new THREE.Vector3();
const down = new THREE.Vector3(0, -1, 0), inverse = new THREE.Quaternion();

function joint(parent: THREE.Object3D, name: string, x: number, y: number, z = 0): THREE.Group {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group); return group;
}
function limb(parent: THREE.Object3D, name: string, x: number, y: number, upper: number, lower: number, radius: number, material: THREE.Material): Limb {
  const pivot = joint(parent, `${name}-pivot`, x, y);
  const bone = (node: THREE.Object3D, length: number) => {
    const mesh = new THREE.Mesh(GEO.cylinder, material); mesh.scale.set(radius, length, radius); mesh.position.y = -length / 2;
    mesh.castShadow = mesh.receiveShadow = true; node.add(mesh);
  };
  bone(pivot, upper);
  const middle = joint(pivot, `${name}-joint`, 0, -upper);
  const cap = new THREE.Mesh(GEO.sphere, material); cap.scale.setScalar(radius * 1.04); middle.add(cap);
  bone(middle, lower);
  return { pivot, joint: middle, end: joint(middle, `${name}-end`, 0, -lower) };
}

export function createCharacter(role: CharacterRole = 'brigadista'): THREE.Group {
  const root = new THREE.Group(); root.name = `npc-${role}`; root.userData.role = role;
  const visual = joint(root, 'character-visual', 0, 0);
  const torso = joint(visual, 'torso', 0, 0);
  const cloth = visualMaterial(role === 'brigadista' ? P.orange : role === 'salud' ? P.health : P.fauna);
  const trousers = visualMaterial(P.navy), boots = visualMaterial(P.rubber), skin = visualMaterial(P.skin), reflector = visualMaterial(P.reflector);
  const jacket = new THREE.Mesh(torsoGeometry, cloth);
  jacket.scale.z = .7; jacket.position.y = 1.32; jacket.castShadow = jacket.receiveShadow = true; torso.add(jacket);
  visualBox(torso, 'shoulder-yoke', [.78,.15,.36], [0,1.58,0], cloth);
  visualBox(torso, 'belt', [.56,.09,.32], [0,.99,0], boots);
  visualBox(torso, 'hip', [.56,.18,.3], [0,.9,0], trousers);
  for (const side of [-1,1]) {
    visualBox(torso, 'reflective-strap', [.055,.43,.018], [side*.25,1.35,.235], reflector);
    visualBox(torso, 'pocket', [.17,.16,.04], [side*.16,1.15,.21], cloth);
  }
  visualBox(torso, 'reflective-waist', [.58,.055,.025], [0,1.04,.18], reflector);
  const neck = new THREE.Mesh(GEO.cylinder, skin); neck.scale.set(.095,.16,.095); neck.position.y = 1.74; torso.add(neck);
  const head = joint(torso, 'head-pivot', 0, 1.79);
  const face = new THREE.Mesh(GEO.sphere, skin); face.scale.set(.21,.255,.2); face.position.y = .2; face.castShadow = true; head.add(face);
  for (const side of [-1,1]) visualBox(head, 'eye', [.033,.028,.015], [side*.075,.22,.185], boots);
  visualBox(head, 'nose', [.045,.055,.045], [0,.16,.2], skin);
  visualBox(head, 'mouth', [.07,.012,.012], [0,.09,.185], boots);
  const helmetMaterial = visualMaterial(role === 'brigadista' ? P.helmet : role === 'salud' ? P.health : P.fauna, .05,.65);
  const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
  helmet.position.y = .34; helmet.scale.z = 1.04; helmet.castShadow = true; head.add(helmet);
  const brim = new THREE.Mesh(GEO.cylinder, helmetMaterial); brim.scale.set(.29,.045,.31); brim.position.set(0,.34,.015); head.add(brim);
  visualBox(head, 'helmet-ridge', [.055,.06,.37], [0,.55,0], helmetMaterial);
  visualBox(head, 'helmet-band', [.24,.035,.02], [0,.4,.238], reflector);
  const arms = [-1,1].map((side) => {
    const arm = limb(torso, side < 0 ? 'left-arm' : 'right-arm', side*CHARACTER_STYLE.shoulderWidth/2, CHARACTER_STYLE.shoulderHeight, CHARACTER_STYLE.upperArm, CHARACTER_STYLE.forearm, .09, cloth);
    visualBox(arm.joint, 'reflective-cuff', [.19,.055,.19], [0,-.27,0], reflector);
    const palm = new THREE.Mesh(GEO.sphere, skin); palm.scale.set(.075,.09,.075); arm.end.add(palm);
    return arm;
  });
  const legs = [-1,1].map((side) => {
    const leg = limb(visual, side < 0 ? 'left-leg' : 'right-leg', side*.18, CHARACTER_STYLE.hipHeight, CHARACTER_STYLE.thigh, CHARACTER_STYLE.shin, .115, trousers);
    visualBox(leg.joint, 'knee-pad', [.2,.16,.08], [0,-.02,.095], boots);
    visualBox(leg.end, 'boot', [.25,.22,.36], [0,-.01,.06], boots);
    visualBox(leg.end, 'sole', [.26,.045,.38], [0,-.097,.06], visualMaterial(0x526163));
    return leg;
  });
  if (role !== 'brigadista') {
    const label = createLabel(role === 'salud' ? 'SALUD' : 'FAUNA', .47,.13); label.position.set(0,1.46,.265); torso.add(label);
    const backLabel = label.clone(); backLabel.position.z = -.245; backLabel.rotation.y = Math.PI; torso.add(backLabel);
    visualBox(torso, 'work-kit', [.27,.23,.18], [-.32,1.02,-.02], visualMaterial(role === 'salud' ? P.health : P.navy));
    const tag = createLabel(role === 'salud' ? 'BOTIQUÍN' : 'EQUIPO', .24,.06); tag.position.set(-.32,1.02,.079); torso.add(tag);
  } else {
    visualBox(torso, 'radio', [.11,.2,.07], [-.2,1.5,.25], boots);
    visualBox(torso, 'radio-antenna', [.015,.15,.015], [-.2,1.66,.25], boots);
  }
  rigs.set(root, { visual, torso, head, arms, legs, previous: new THREE.Vector3(), initialized: false, phase: 0, blend: 0, gesture: 0, carrier: null });
  roots.add(root);
  return root;
}
export function characterRig(root: THREE.Object3D): CharacterRig { const rig = rigs.get(root); if (!rig) throw new Error('Personaje sin articulaciones'); return rig; }
export function setCharacterGesture(root: THREE.Object3D, strength: number): void { characterRig(root).gesture = strength; }
export function setCharacterCarrier(root: THREE.Object3D, carrier: THREE.Object3D | null): void { characterRig(root).carrier = carrier; }

/** Analytic two-bone pose. Named grip sockets are on the crate, not the camera. */
function reach(rig: CharacterRig, arm: Limb, grip: THREE.Object3D, side: number): void {
  grip.getWorldPosition(target); rig.torso.worldToLocal(target); shoulder.copy(arm.pivot.position);
  direction.copy(target).sub(shoulder);
  const distance = THREE.MathUtils.clamp(direction.length(), .02, CHARACTER_STYLE.upperArm + CHARACTER_STYLE.forearm - .001);
  direction.normalize();
  const along = (CHARACTER_STYLE.upperArm**2 - CHARACTER_STYLE.forearm**2 + distance**2)/(2*distance);
  pole.set(side, -.2, -.4); pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  elbow.copy(direction).multiplyScalar(along).addScaledVector(pole, Math.sqrt(Math.max(0,CHARACTER_STYLE.upperArm**2-along**2)));
  arm.pivot.quaternion.setFromUnitVectors(down, fore.copy(elbow).normalize());
  fore.copy(direction).multiplyScalar(distance).sub(elbow).normalize(); inverse.copy(arm.pivot.quaternion).invert(); fore.applyQuaternion(inverse);
  arm.joint.quaternion.setFromUnitVectors(down, fore);
}

export function animateCharacter(root: THREE.Group, delta: number, viewer?: THREE.Vector3, talking = false): void {
  const rig = characterRig(root); root.getWorldPosition(position);
  const distance = rig.initialized ? Math.hypot(position.x-rig.previous.x,position.z-rig.previous.z) : 0;
  rig.previous.copy(position); rig.initialized = true;
  const travel = distance < Math.max(.5, delta*6) ? distance : 0; // Teleports and reset are not footsteps.
  rig.phase += travel / CHARACTER_STYLE.strideLength * Math.PI * 2;
  rig.blend = THREE.MathUtils.lerp(rig.blend, travel > .0001 ? 1 : 0, 1-Math.exp(-CHARACTER_STYLE.settleResponse*delta));
  rig.visual.position.y = Math.abs(Math.sin(rig.phase))*rig.blend*.012;
  rig.legs.forEach((leg,index) => {
    const wave = Math.sin(rig.phase + index*Math.PI);
    leg.pivot.rotation.x = wave*CHARACTER_STYLE.legSwing*rig.blend;
    leg.joint.rotation.x = Math.max(0,-wave)*CHARACTER_STYLE.kneeFlex*rig.blend;
    leg.end.rotation.x = -leg.pivot.rotation.x-leg.joint.rotation.x;
  });
  rig.arms.forEach((arm,index) => {
    arm.pivot.rotation.set(-Math.sin(rig.phase+index*Math.PI)*CHARACTER_STYLE.armSwing*rig.blend-rig.gesture*.65,0,0);
    arm.joint.rotation.set(-.08-rig.gesture*.55,0,0);
  });
  if (viewer) {
    target.copy(viewer); root.worldToLocal(target);
    const yaw = talking ? THREE.MathUtils.clamp(Math.atan2(target.x,target.z), -CHARACTER_STYLE.headTurn, CHARACTER_STYLE.headTurn) : 0;
    rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y,yaw,1-Math.exp(-5*delta));
  }
  if (rig.carrier) {
    root.updateWorldMatrix(true,true); rig.carrier.updateWorldMatrix(true,true);
    rig.arms.forEach((arm,index) => { const grip = rig.carrier!.getObjectByName(index === 0 ? 'carrier-grip-left' : 'carrier-grip-right'); if (grip) reach(rig,arm,grip,index === 0 ? -1 : 1); });
  }
}

export function animateCharacters(scene: THREE.Scene, delta: number, viewer: THREE.Vector3, talking: boolean): void {
  roots.forEach((root) => {
    let node: THREE.Object3D | null = root;
    while (node && node !== scene) { if (!node.visible) return; node = node.parent; }
    if (node === scene) animateCharacter(root,delta,viewer,talking);
  });
}
