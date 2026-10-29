import * as THREE from 'three';
import { createLabel, SHARED_GEOMETRY as GEO, VISUAL_PALETTE as P, visualBox, visualMaterial } from './visual-style';
import type { CollisionSystem } from './collision-system';

/** Local +Z = equipment/rear, -Z = cab/front. Existing exterior envelope is preserved. */
export const TRUCK_STYLE = { width: 2.3, length: 5.2, wheelRadius: .43, roofHeight: 2.62 } as const;
export const TRUCK_ANCHORS = {
  'door-left': [-1.16, 0, -1.55], 'door-right': [1.16, 0, -1.55],
  'connection-left': [-1.17, .85, .4], 'connection-right': [1.17, .85, .4],
  'equipment-left': [-1.17, 1.4, -.12], 'hose-rack': [-1.16, 1.5, 1.7],
  'roof-equipment': [0, 2.62, .8],
  'beacon-left': [-.58, 2.57, -1.45], 'beacon-right': [.58, 2.57, -1.45],
} as const;
export type TruckAnchor = keyof typeof TRUCK_ANCHORS;
/** Capsule-like footprint follows cab/equipment length without blocking the side workstations. */
export function registerTruckCollision(truck:THREE.Object3D,collisions:CollisionSystem):void {
  for(const z of [-1.6,0,1.4]) collisions.addCircle(truck.localToWorld(new THREE.Vector3(0,0,z)),1.2);
}
const tireGeometry = new THREE.CylinderGeometry(.43, .43, .3, 12);
const rimGeometry = new THREE.CylinderGeometry(.24, .24, .32, 10);
const fenderGeometry = new THREE.TorusGeometry(.46, .065, 6, 12, Math.PI);
const hoseGeometry = new THREE.TorusGeometry(.33, .04, 6, 16);
const valveGeometry = new THREE.TorusGeometry(.1,.018,5,10);

export function truckAnchorWorld(truck: THREE.Object3D, name: TruckAnchor, target: THREE.Vector3): THREE.Vector3 {
  const socket = truck.getObjectByName(`truck-${name}`);
  if (!socket) throw new Error(`Falta el anclaje ${name}`);
  return socket.getWorldPosition(target);
}

export function buildTruckVisual(): THREE.Group {
  const truck = new THREE.Group(); truck.name = 'fire-truck';
  const paint = visualMaterial(P.red,.12,.65), orange = visualMaterial(P.orange), rubber = visualMaterial(P.rubber), metal = visualMaterial(P.silver,.55,.42);
  const glass = visualMaterial(P.glass,.2,.3), reflective = visualMaterial(P.reflector), dark = visualMaterial(P.navy);
  const box = (name: string, size: readonly number[], at: readonly number[], material: THREE.Material) => visualBox(truck,name,size,at,material);
  box('chassis',[2.3,.45,5.2],[0,.65,0],rubber);
  box('cab',[2.14,1.65,1.7],[0,1.55,-1.55],paint);
  box('cab-roof',[2.22,.12,1.8],[0,2.37,-1.55],metal);
  box('equipment-body',[2.25,1.75,2.7],[0,1.6,.8],paint);
  box('roof-deck',[2.28,.08,2.75],[0,2.51,.8],metal);
  for (const side of [-1,1]) {
    box('windshield',[.83,.64,.035],[side*.45,1.95,-2.414],glass);
    box('door',[.035,1.15,1.36],[side*1.085,1.48,-1.53],paint);
    box('side-window',[.045,.57,1.05],[side*1.11,1.94,-1.61],glass);
    box('door-handle',[.07,.05,.22],[side*1.13,1.45,-1.03],metal);
    box('door-reflector',[.045,.09,1.35],[side*1.115,1.08,-1.53],reflective);
    box('mirror-stem',[.15,.035,.035],[side*1.12,2.02,-2.03],metal);
    box('mirror-housing',[.09,.26,.18],[side*1.15,2.05,-2.07],rubber);
    box('mirror-glass',[.012,.2,.12],[side*1.19,2.05,-2.07],glass);
    for (const z of [-1.55,1.55]) {
      const tire = new THREE.Mesh(tireGeometry,rubber); tire.name = 'tire'; tire.rotation.z = Math.PI/2; tire.position.set(side,.48,z); truck.add(tire);
      const rim = new THREE.Mesh(rimGeometry,metal); rim.name = 'wheel-rim'; rim.rotation.z = Math.PI/2; rim.position.copy(tire.position); truck.add(rim);
      const fender = new THREE.Mesh(fenderGeometry,paint); fender.rotation.y = Math.PI/2; fender.position.copy(tire.position); truck.add(fender);
    }
    for (const z of [0,.85,1.7]) {
      if (side === -1 && z === 1.7) {
        box('open-hose-bay',[.02,.85,.72],[-1.13,1.55,z],rubber);
        continue;
      }
      box('equipment-compartment',[.035,.85,.72],[side*1.144,1.55,z],metal);
      for (let line = 0; line < 5; line++) box('shutter-seam',[.009,.012,.68],[side*1.166,1.23+line*.15,z],dark);
      box('compartment-handle',[.035,.045,.2],[side*1.17,1.23,z],rubber);
    }
    box('equipment-reflector',[.04,.09,2.55],[side*1.15,.96,.8],reflective);
    const label = createLabel('BOMBEROS',1.5,.19); label.rotation.y = side*Math.PI/2; label.position.set(side*1.17,2.2,.8); truck.add(label);
    const coupling = new THREE.Mesh(GEO.cylinder,metal); coupling.scale.set(.1,.14,.1); coupling.rotation.z = Math.PI/2; coupling.position.set(side*1.13,.85,.4); truck.add(coupling);
    const valve = new THREE.Mesh(valveGeometry,orange); valve.rotation.y = Math.PI/2; valve.position.set(side*1.18,.85,.4); truck.add(valve);
  }
  box('front-bumper',[2.4,.2,.24],[0,.67,-2.72],metal);
  box('rear-bumper',[2.4,.18,.2],[0,.67,2.5],metal);
  box('grille-back',[1.05,.38,.035],[0,1.15,-2.414],rubber);
  for (let i = 0; i < 5; i++) box('grille-slat',[.98,.025,.02],[0,1.0+i*.075,-2.44],metal);
  for (const x of [-.82,.82]) {
    box('headlight',[.28,.19,.04],[x,1.17,-2.43],visualMaterial(0xede8cd,.1,.4));
    box('indicator',[.13,.09,.035],[x,1.4,-2.43],orange);
    box('tail-light',[.17,.3,.035],[x,1.2,2.17],visualMaterial(0xb73c36));
    for (const y of [.9,1.7]) box('rear-reflector',[.22,.12,.025],[x,y,2.18],reflective);
  }
  const rearLabel = createLabel('BOMBEROS',1.2,.18); rearLabel.position.set(0,2.13,2.18); truck.add(rearLabel);
  const frontLabel = createLabel('BOMBEROS',.95,.13); frontLabel.rotation.y = Math.PI; frontLabel.position.set(0,1.52,-2.42); truck.add(frontLabel);
  const hose = new THREE.Group(); hose.name = 'stored-hose'; hose.position.set(-1.16,1.5,1.7); hose.rotation.y = -Math.PI/2;
  const coil = new THREE.Mesh(hoseGeometry,visualMaterial(0xc2ad78)); coil.scale.setScalar(.88); hose.add(coil);
  const inner = coil.clone(); inner.scale.setScalar(.58); inner.position.z = .01; hose.add(inner); truck.add(hose);
  box('hose-support',[.1,.065,.78],[-1.16,1.12,1.7],metal);
  const waterSign=createLabel('AGUA',.38,.12); waterSign.position.set(1.18,1.05,.4); waterSign.rotation.y=Math.PI/2; truck.add(waterSign);
  const cap = box('connection-cap',[.035,.18,.18],[1.2,.85,.4],metal);
  cap.userData.preparationPart = true;
  const connected = new THREE.Group(); connected.name='connected-hose'; connected.visible=false;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(1.2,.85,.4),new THREE.Vector3(1.3,.76,.4),new THREE.Vector3(1.28,.35,.55),new THREE.Vector3(1.15,.24,.8)]);
  connected.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.045,6,false),visualMaterial(0xc2ad78)));
  const connectedSign=createLabel('CONECTADA',.52,.11); connectedSign.rotation.y=Math.PI/2; connectedSign.position.set(1.19,1.05,.4); connected.add(connectedSign); truck.add(connected);
  for (const x of [-.36,.36]) box('ladder-rail',[.065,.09,2.95],[x,2.62,.65],metal);
  for (let i = 0; i < 9; i++) box('ladder-rung',[.72,.055,.055],[0,2.62,-.65+i*.32],metal);
  box('beacon-bar',[1.6,.07,.26],[0,2.47,-1.45],rubber);
  Object.entries(TRUCK_ANCHORS).forEach(([name,at]) => {
    const anchor = new THREE.Group(); anchor.name = `truck-${name}`; anchor.position.set(at[0],at[1],at[2]);
    if (name.includes('connection') || name === 'equipment-left' || name === 'hose-rack') anchor.rotation.y = at[0] < 0 ? -Math.PI/2 : Math.PI/2;
    truck.add(anchor);
  });
  truck.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = child.receiveShadow = true; });
  return truck;
}
