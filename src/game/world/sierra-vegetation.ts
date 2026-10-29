import * as THREE from 'three';
import { LANDSCAPE_COLORS as C, LANDSCAPE_SETTINGS as S, landscapeNoise } from './landscape-config';

const branchGeometry=new THREE.CylinderGeometry(.65,1,1,7);
const canopyGeometry=new THREE.IcosahedronGeometry(1,1);
const bark=new THREE.MeshStandardMaterial({color:C.bark,roughness:1,flatShading:true});
const foliage=C.foliage.map((color)=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
const up=new THREE.Vector3(0,1,0);
function branch(parent:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,radius:number):void {
  const mesh=new THREE.Mesh(branchGeometry,bark), direction=b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,direction.length(),radius);mesh.quaternion.setFromUnitVectors(up,direction.normalize());
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
/** Three broadleaf silhouettes. Root stays on the existing combustible/trunk position. */
export function createSierraTree(height:number,variant:number):THREE.Group {
  const group=new THREE.Group();group.name='sierra-tree';group.userData.variant=variant%3;
  const trunkTop=new THREE.Vector3((variant%3-1)*.16,height*.54,.07);
  branch(group,new THREE.Vector3(),trunkTop,S.treeTrunkRadius*(.8+(variant%3)*.1));
  const lobes=variant%3===1?4:5;
  for(let i=0;i<lobes;i++) {
    const angle=i/lobes*Math.PI*2+variant*.71, spread=height*(variant%3===2?.17:.13);
    const center=new THREE.Vector3(Math.cos(angle)*spread,height*(.64+landscapeNoise(i+variant*9)*.13),Math.sin(angle)*spread);
    branch(group,trunkTop.clone().multiplyScalar(.8),center,.075+(i%2)*.015);
    const crown=new THREE.Mesh(canopyGeometry,foliage[(variant+i)%foliage.length]);
    const radius=height*(.17+landscapeNoise(i*13+variant)*.035)*S.canopyScale;
    crown.position.copy(center);crown.scale.set(radius*(1.1+(i%2)*.2),radius*(variant%3===2?.65:.9),radius);crown.rotation.set(i*.2,angle,.1);
    crown.castShadow=crown.receiveShadow=true;group.add(crown);
  }
  return group;
}

/** Retain the local shrub mesh/texture, fitting its dense body to the existing collider. */
export function styleSierraBush(model:THREE.Object3D,variant:number,radius:number):void {
  const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const fit=radius/Math.max(.001,size.x/2,size.z/2);model.scale.x*=fit;model.scale.z*=fit;
  const tint=new THREE.Color(variant%2===0?0xc1c5a2:0xaab99d);
  model.traverse((node)=>{
    if(!(node instanceof THREE.Mesh)) return;
    const sources=Array.isArray(node.material)?node.material:[node.material];
    const materials=sources.map((source)=>{
      const material=source.clone();
      if(material instanceof THREE.MeshStandardMaterial){material.color.lerp(tint,.2);material.flatShading=true;material.roughness=1;}
      return material;
    });
    node.material=Array.isArray(node.material)?materials:materials[0];
  });
}
