import * as THREE from 'three';
import { LANDSCAPE_SETTINGS as S, LANDSCAPE_COLORS as C, landscapeNoise } from './landscape-config';
import { distanceToRoad } from './road-layout';
import { DISCOVERABLES } from '../narrative/discoverables';
import { INVESTIGATION_STATIONS } from '../narrative/investigation-data';

/** Clearance for bodies, indicators and small educational evidence, not just their centers. */
export function isLandscapeReserved(x:number,z:number,margin=.6):boolean {
  if(x>=-14.5-margin&&x<=margin&&z>=6.5-margin&&z<=17+margin) return true;
  if(x>=-8-margin&&x<=7+margin&&z>=12-margin&&z<=21+margin) return true;
  if(distanceToRoad(x,z)<2.25+margin) return true;
  if(Math.hypot(x+16,z-16)<6.5+margin||Math.hypot(x-10,z-10)<4.7+margin||Math.hypot(x,z-7)<2.5+margin) return true;
  for(const point of [...DISCOVERABLES,...INVESTIGATION_STATIONS]) if(Math.hypot(x-point.position.x,z-point.position.z)<2+margin) return true;
  for(const [fx,fz] of [[-7,-9],[5.5,8],[-13,-10],[-10,-13]]) if(Math.hypot(x-fx,z-fz)<2.5+margin) return true;
  return false;
}
export function decorativePlacements(density:number=S.detailDensity):readonly {x:number;z:number;seed:number}[] {
  const centers=[[-20,7],[-18,1],[-10,1],[-2,3],[4,5],[9,22],[15,20],[20,11],[20,-3],[6,-5],[-7,-18],[-18,-18]];
  const points:{x:number;z:number;seed:number}[]=[];
  for(let i=0;i<Math.floor(S.maxDetailClusters*Math.max(0,Math.min(2,density)));i++) {
    const c=centers[i%centers.length], x=c[0]+(landscapeNoise(i*7+1)-.5)*5,z=c[1]+(landscapeNoise(i*7+2)-.5)*5;
    if(Math.abs(x)>23||Math.abs(z)>23||isLandscapeReserved(x,z)) continue;
    points.push({x,z,seed:i});
  }
  return points;
}

/** Decorative instancing: no FireSystem targets, colliders or gameplay area metrics. */
export class LandscapeDecoration {
  readonly object=new THREE.Group();
  readonly grass:THREE.InstancedMesh;
  readonly grassPositions:THREE.Vector3[]=[];
  private readonly charred:boolean[]=[];
  private readonly charcoal=new THREE.Color(0x45463b);
  constructor(terrain:(x:number,z:number)=>number,density:number=S.detailDensity) {
    this.object.name='landscape-decoration';this.object.userData.decorative=true;
    const points=decorativePlacements(density), dummy=new THREE.Object3D(), color=new THREE.Color();
    const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.1,0,0,0,.32,0,.07,0,0,0,0,-.09,0,.25,0,0,0,.1],3));blade.computeVertexNormals();
    this.grass=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:C.grass,side:THREE.DoubleSide,roughness:1}),points.length*S.grassPerCluster);
    const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:C.stone,roughness:1,flatShading:true}),points.length);
    const sticks=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5),new THREE.MeshStandardMaterial({color:C.branch,roughness:1}),points.length);
    const up=new THREE.Vector3(0,1,0), a=new THREE.Vector3(), b=new THREE.Vector3();
    let grassIndex=0;
    points.forEach((p,index)=>{
      for(let j=0;j<S.grassPerCluster;j++) {
        const x=p.x+(landscapeNoise(p.seed*31+j)-.5)*.65,z=p.z+(landscapeNoise(p.seed*47+j)-.5)*.65;
        dummy.position.set(x,terrain(x,z)+.006,z);dummy.rotation.set(0,landscapeNoise(j+p.seed)*6.28,0);dummy.scale.setScalar(.65+landscapeNoise(j*7+p.seed)*.8);dummy.updateMatrix();
        this.grass.setMatrixAt(grassIndex,dummy.matrix);color.set(C.grass).lerp(new THREE.Color(C.dryGreen),landscapeNoise(j+p.seed)*.4);this.grass.setColorAt(grassIndex,color);
        this.grassPositions.push(dummy.position.clone());this.charred.push(false);grassIndex++;
      }
      const size=.08+landscapeNoise(p.seed)*.16;
      dummy.position.set(p.x,terrain(p.x,p.z)+size*.3,p.z);dummy.rotation.set(.1,p.seed,.2);dummy.scale.set(size*1.3,size*.7,size);dummy.updateMatrix();stones.setMatrixAt(index,dummy.matrix);
      a.set(p.x+.3,terrain(p.x+.3,p.z)+.025,p.z);b.set(p.x+.65,terrain(p.x+.65,p.z+.12)+.025,p.z+.12);
      dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());dummy.scale.set(.025,a.distanceTo(b),.025);dummy.updateMatrix();sticks.setMatrixAt(index,dummy.matrix);
    });
    for(const mesh of [this.grass,stones,sticks]){mesh.castShadow=false;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.object.add(mesh);}
  }
  updateBurning(fires:readonly THREE.Vector3[]):void {
    let changed=false;
    for(let i=0;i<this.grassPositions.length;i++) {
      if(this.charred[i]) continue;
      const p=this.grassPositions[i];
      for(const f of fires) if(Math.hypot(p.x-f.x,p.z-f.z)<4.5) {this.charred[i]=true;this.grass.setColorAt(i,this.charcoal);changed=true;break;}
    }
    if(changed&&this.grass.instanceColor) this.grass.instanceColor.needsUpdate=true;
  }
}
