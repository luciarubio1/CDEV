import * as THREE from 'three';
import { INVESTIGATION_STYLE as S } from './investigation-style';
import { landscapeNoise as noise } from './landscape-config';
import { TERRAIN_MAP_HALF_SIZE, TERRAIN_SEGMENTS } from './terrain';
import { visualMaterial, SHARED_GEOMETRY as G, visualBox } from './visual-style';

export type GroundHeight = (x:number,z:number)=>number;
const up=new THREE.Vector3(0,1,0);
const stoneGeometry=new THREE.DodecahedronGeometry(1,0);
const metal=visualMaterial(S.colors.metal,.68,.4), coal=visualMaterial(S.colors.charcoal,0,1), ash=visualMaterial(S.colors.ash,0,1);
const patchMaterial=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const grassMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});

/** Matches the existing terrain triangles; important for a millimetre-sized inspection subject. */
export function inspectionGroundHeight(terrain:GroundHeight,x:number,z:number):number {
  const step=TERRAIN_MAP_HALF_SIZE*2/TERRAIN_SEGMENTS;
  const ix=Math.floor((x+TERRAIN_MAP_HALF_SIZE)/step),iz=Math.floor((z+TERRAIN_MAP_HALF_SIZE)/step);
  const x0=-TERRAIN_MAP_HALF_SIZE+ix*step,z0=-TERRAIN_MAP_HALF_SIZE+iz*step;
  const tx=(x-x0)/step,tz=(z-z0)/step;
  const a=terrain(x0,z0),b=terrain(x0,z0+step),d=terrain(x0+step,z0);
  if(tx+tz<=1)return a+(b-a)*tz+(d-a)*tx;
  const c=terrain(x0+step,z0+step);return c+(b-c)*(1-tx)+(d-c)*(1-tz);
}

function patch(parent:THREE.Group,height:GroundHeight,x:number,z:number,radius:number,color:number,seed:number):void {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],base=new THREE.Color(color),shade=new THREE.Color();
  const sectors=24,rings=4;
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<sectors;i++) {
    const angle=i/sectors*Math.PI*2,irregular=.8+noise(i+seed)*.22,r=radius*ring/rings*irregular;
    const px=x+Math.cos(angle)*r,pz=z+Math.sin(angle)*r*.86;
    positions.push(px,height(px,pz)+.009,pz);shade.copy(base).multiplyScalar(.9+noise(i+ring*7+seed)*.2);
    colors.push(shade.r,shade.g,shade.b,ring===rings?0:ring===rings-1?.35:.65);
    if(ring<rings){const a=ring*sectors+i,b=ring*sectors+(i+1)%sectors;indices.push(a,b,a+sectors,b,b+sectors,a+sectors);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,patchMaterial);mesh.name='irregular-ground-patch';mesh.receiveShadow=true;parent.add(mesh);
}
function ribbon(parent:THREE.Group,points:readonly number[][],width:number,height:GroundHeight):void {
  const positions:number[]=[],indices:number[]=[];
  points.forEach(([x,z],index)=>{
    const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)],dx=after[0]-before[0],dz=after[1]-before[1],length=Math.hypot(dx,dz)||1;
    for(const side of [-1,1]){const px=x-dz/length*width*side,pz=z+dx/length*width*side;positions.push(px,height(px,pz)+.012,pz);}
    if(index>0){const a=index*2;indices.push(a-2,a-1,a,a,a-1,a+1);}
  });
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,visualMaterial(S.colors.crack,0,1));mesh.name='dry-crack';parent.add(mesh);
}
function rod(parent:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,radius:number,material:THREE.Material,name:string):THREE.Mesh {
  const mesh=new THREE.Mesh(G.cylinder,material),direction=b.clone().sub(a);mesh.name=name;mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.scale.set(radius,direction.length(),radius);mesh.quaternion.setFromUnitVectors(up,direction.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
}
function bladeGeometry():THREE.BufferGeometry {
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=4;i++){
    const t=i/4,width=.02*(1-t)*(.8+.2*Math.sin(t*3));
    positions.push(-width,t,t*t*.24,width,t,t*t*.24);
    if(i>0){const a=i*2;indices.push(a-2,a,a-1,a,a+1,a-1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
const blade=bladeGeometry();
const leaf=new THREE.BufferGeometry();
leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.5,-.22,0,0,0,.045,.5,.22,0,0,0,.05,0],3));leaf.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leaf.computeVertexNormals();

export function createDroughtStation(height:GroundHeight):{ object:THREE.Group;subject:THREE.Group } {
  const object=new THREE.Group(),subject=new THREE.Group();object.name='drought-station';subject.name='drought-evidence';object.add(subject);
  patch(object,height,0,0,1.15,S.colors.soil,13);
  const grass=new THREE.InstancedMesh(blade,grassMaterial,S.drought.tufts*S.drought.bladesPerTuft),dummy=new THREE.Object3D(),color=new THREE.Color();
  grass.name='dry-leaf-clusters';let instance=0;
  for(let i=0;i<S.drought.tufts;i++){
    const angle=noise(i+17)*Math.PI*2,radius=Math.sqrt(noise(i+51))*S.drought.radius,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    for(let j=0;j<S.drought.bladesPerTuft;j++){
      const px=x+(noise(i*9+j)-.5)*.065,pz=z+(noise(i*11+j)-.5)*.065;
      dummy.position.set(px,height(px,pz)+.007,pz);dummy.rotation.set(.15+noise(i+j)*.4,angle+j*1.9,(noise(i*3+j)-.5)*.35);
      dummy.scale.set(.5+noise(i+j+3)*.6,S.drought.bladeMinHeight+noise(i*7+j)*(S.drought.bladeMaxHeight-S.drought.bladeMinHeight),.25);dummy.updateMatrix();
      grass.setMatrixAt(instance,dummy.matrix);color.set(S.colors.straw[(i+j)%3]);grass.setColorAt(instance++,color);
    }
  }
  grass.castShadow=false;grass.receiveShadow=true;grass.computeBoundingSphere();subject.add(grass);
  const leaves=new THREE.InstancedMesh(leaf,grassMaterial,S.drought.leaves);leaves.name='fallen-dry-leaves';
  for(let i=0;i<S.drought.leaves;i++){
    const x=(noise(i+80)-.5)*1.8,z=(noise(i+99)-.5)*1.8;
    dummy.position.set(x,height(x,z)+.014,z);dummy.rotation.set(0,noise(i+110)*6.28,0);dummy.scale.setScalar(.09+noise(i+140)*.07);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);color.set(S.colors.straw[i%3]);leaves.setColorAt(i,color);
  }
  leaves.castShadow=false;leaves.computeBoundingSphere();subject.add(leaves);
  for(let i=0;i<6;i++){
    const x=(noise(i+160)-.5)*1.25,z=(noise(i+190)-.5)*1.25,angle=noise(i+210)*6.28;
    const points:number[][]=[];
    for(let j=0;j<5;j++){const t=j/4;points.push([x+Math.cos(angle)*t*.5+Math.sin(j+i)*.04,z+Math.sin(angle)*t*.5+Math.cos(j+i)*.04]);}
    ribbon(subject,points,.007+noise(i)*.006,height);
    ribbon(subject,[points[2],[points[2][0]+.16,points[2][1]-.12],[points[2][0]+.23,points[2][1]-.18]],.006,height);
  }
  return {object,subject};
}

export function createCampStation(height:GroundHeight):{object:THREE.Group;subject:THREE.Group} {
  const object=new THREE.Group(),subject=new THREE.Group();object.name='camp-station';subject.name='camp-evidence';object.add(subject);
  patch(object,height,0,0,.86,S.colors.charcoal,71);patch(object,height,.03,-.02,.42,S.colors.ash,32);
  for(let i=0;i<S.camp.stones;i++){
    const angle=i/S.camp.stones*Math.PI*2+(noise(i)*.1),r=S.camp.radius+(noise(i+20)-.5)*.1,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const stone=new THREE.Mesh(stoneGeometry,visualMaterial(S.colors.stone[i%3],0,1));stone.name='hearth-stone';const sy=.09+noise(i+30)*.065;
    stone.scale.set(.12+noise(i+37)*.07,sy,.12+noise(i+43)*.075);stone.rotation.set((noise(i+51)-.5)*.25,noise(i+60)*6.28,(noise(i+70)-.5)*.2);stone.position.set(x,height(x,z)+sy*.65,z);stone.castShadow=stone.receiveShadow=true;subject.add(stone);
  }
  let grateY=-Infinity;
  for(const x of [-.37,.37])for(const z of [-.26,.26])grateY=Math.max(grateY,height(x,z)+S.camp.grateHeight);
  for(const x of [-.37,.37])for(const z of [-.26,.26])rod(subject,new THREE.Vector3(x,height(x,z)+.008,z),new THREE.Vector3(x,grateY,z),S.camp.frameRadius,metal,'grill-leg');
  for(const z of [-.29,.29])rod(subject,new THREE.Vector3(-.41,grateY,z),new THREE.Vector3(.41,grateY,z),S.camp.frameRadius,metal,'grill-frame');
  for(const x of [-.41,.41])rod(subject,new THREE.Vector3(x,grateY,-.29),new THREE.Vector3(x,grateY,.29),S.camp.frameRadius,metal,'grill-frame');
  for(let i=0;i<8;i++){const z=-.25+i/7*.5;rod(subject,new THREE.Vector3(-.4,grateY,z),new THREE.Vector3(.4,grateY,z),S.camp.barRadius,metal,'grill-bar');}
  for(let i=0;i<10;i++){
    const x=(noise(i+230)-.5)*.6,z=(noise(i+250)-.5)*.55,size=.045+noise(i+280)*.06;
    const piece=new THREE.Mesh(stoneGeometry,i%3===0?ash:coal);piece.name='cold-charcoal';piece.scale.set(size,size*.5,size*.7);piece.position.set(x,height(x,z)+size*.3,z);piece.rotation.set(.2,i,.1);subject.add(piece);
  }
  for(let i=0;i<2;i++){
    const a=new THREE.Vector3(-.28+i*.17,0,-.12+i*.18),b=new THREE.Vector3(.23+i*.02,0,-.02+i*.18);a.y=height(a.x,a.z)+.04;b.y=height(b.x,b.z)+.04;
    rod(subject,a,b,.04,visualMaterial(S.colors.charredWood,0,1),'charred-wood');
    const c=a.clone().lerp(b,.45);rod(subject,a,c,.041,visualMaterial(S.colors.wood,0,1),'remaining-bark');
  }
  const utensil=new THREE.Group();utensil.name='cooking-utensil';utensil.position.set(.73,height(.73,-.15)+.018,-.15);utensil.rotation.y=-.5;
  visualBox(utensil,'utensil-handle',[.025,.015,.15],[0,0,0],visualMaterial(S.colors.wood));
  visualBox(utensil,'utensil-head',[.06,.009,.06],[0,0,.105],metal);
  for(const x of [-.022,0,.022])visualBox(utensil,'utensil-prong',[.006,.009,.045],[x,0,.15],metal);subject.add(utensil);
  const bowl=new THREE.Group();bowl.name='meal-container';bowl.position.set(.69,height(.69,.46)+.004,.46);
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(.105,.082,.07,10,1,true),metal);wall.position.y=.035;bowl.add(wall);
  const base=new THREE.Mesh(G.cylinder,metal);base.scale.set(.082,.007,.082);base.position.y=.004;bowl.add(base);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.105,.006,5,10),metal);rim.rotation.x=Math.PI/2;rim.position.y=.07;bowl.add(rim);subject.add(bowl);
  return {object,subject};
}

export function createCigaretteStation(height:GroundHeight):{object:THREE.Group;subject:THREE.Group} {
  const object=new THREE.Group(),subject=new THREE.Group();object.name='cigarette-station';subject.name='cigarette-evidence';object.add(subject);
  patch(object,height,.01,0,S.cigarette.stainRadius,S.colors.charcoal,203);
  const direction=new THREE.Vector3(Math.cos(.4),0,Math.sin(.4)),half=.03;
  direction.y=(height(direction.x*half,direction.z*half)-height(-direction.x*half,-direction.z*half))/(half*2);direction.normalize();
  subject.position.y=height(0,0)+S.cigarette.radius+.001;subject.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),direction);
  const segment=(name:string,length:number,x:number,radius:number,color:number)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,8),visualMaterial(color,0,1));mesh.name=name;mesh.rotation.z=-Math.PI/2;mesh.position.x=x;subject.add(mesh);
    return mesh;
  };
  segment('cigarette-filter',S.cigarette.filterLength,-S.cigarette.filterLength/2,S.cigarette.radius,S.colors.filter);
  segment('cigarette-paper',S.cigarette.paperLength,S.cigarette.paperLength/2,S.cigarette.radius*.97,S.colors.paper);
  const consumed=segment('cigarette-consumed-end',S.cigarette.consumedLength,S.cigarette.paperLength+S.cigarette.consumedLength/2,S.cigarette.radius*.85,S.colors.consumed);
  const tip=consumed.geometry.attributes.position;
  for(let i=0;i<tip.count;i++){tip.setX(i,tip.getX(i)*(.8+noise(i+400)*.2));if(tip.getY(i)>0)tip.setY(i,tip.getY(i)-noise(i+420)*.001);}
  consumed.geometry.computeVertexNormals();
  for(let i=0;i<7;i++){
    const piece=new THREE.Mesh(stoneGeometry,ash);piece.name='cigarette-ash';piece.scale.set(.0015+noise(i+310)*.0015,.0008,.0015);
    piece.position.set(S.cigarette.paperLength+S.cigarette.consumedLength+.002+noise(i+320)*.008,-.003,(noise(i+330)-.5)*.015);piece.rotation.y=i;subject.add(piece);
  }
  return {object,subject};
}
