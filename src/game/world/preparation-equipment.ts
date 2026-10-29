import * as THREE from 'three';
import { createLabel, visualBox, visualMaterial, VISUAL_PALETTE as P } from './visual-style';

/** Standing equipment remains independent of the jacket that is collected. */
export function createSuitStand(): THREE.Group {
  const stand = new THREE.Group(); stand.name = 'suit-stand';
  const metal = visualMaterial(P.silver,.4), rubber = visualMaterial(P.rubber), cloth = visualMaterial(P.orange);
  visualBox(stand,'stand-base',[.72,.08,.55],[0,.04,0],metal);
  visualBox(stand,'stand-post',[.065,1.9,.065],[0,.98,-.12],metal);
  visualBox(stand,'stand-hanger',[.85,.07,.07],[0,1.55,-.08],metal);
  const equipment = new THREE.Group(); equipment.name = 'stored-suit'; stand.add(equipment);
  visualBox(equipment,'jacket',[.62,.65,.25],[0,1.24,0],cloth);
  for (const side of [-1,1]) {
    const sleeve = visualBox(equipment,'sleeve',[.18,.57,.22],[side*.39,1.24,0],cloth); sleeve.rotation.z = side*.16;
    visualBox(equipment,'reflective-band',[.07,.48,.025],[side*.19,1.27,.14],visualMaterial(P.reflector));
    visualBox(equipment,'trousers',[.23,.59,.23],[side*.15,.64,0],visualMaterial(P.navy));
    visualBox(equipment,'boot',[.25,.18,.35],[side*.15,.25,.05],rubber);
  }
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.24,10,5,0,Math.PI*2,0,Math.PI/2),visualMaterial(P.helmet)); helmet.position.set(0,1.73,0); equipment.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.045,10),helmet.material); brim.position.set(0,1.73,0); equipment.add(brim);
  const sign = createLabel('EQUIPO',.5,.12); sign.position.set(0,1.96,.02); stand.add(sign);
  stand.traverse((node)=>{if(node instanceof THREE.Mesh) node.castShadow=node.receiveShadow=true;});
  return stand;
}
