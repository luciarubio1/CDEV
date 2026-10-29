import * as THREE from 'three';
import { LANDSCAPE_COLORS as C, LANDSCAPE_SETTINGS as S } from './landscape-config';
import { getTerrainHeight, TERRAIN_MAP_HALF_SIZE, TERRAIN_SEGMENTS } from './terrain';

/** Non-walkable continuation, stitched to the exact existing terrain boundary. */
function createApron():THREE.Mesh {
  const vertices:number[]=[],colors:number[]=[],indices:number[]=[], count=TERRAIN_SEGMENTS*4;
  const color=new THREE.Color(), earth=new THREE.Color(C.soil),gray=new THREE.Color(C.stone);
  for(let ring=0;ring<=S.apronRings;ring++) for(let index=0;index<count;index++) {
    const side=Math.floor(index/TERRAIN_SEGMENTS), t=(index%TERRAIN_SEGMENTS)/TERRAIN_SEGMENTS;
    const half=TERRAIN_MAP_HALF_SIZE+ring/S.apronRings*70;
    const x=side===0?-half+t*half*2:side===1?half:side===2?half-t*half*2:-half;
    const z=side===0?-half:side===1?-half+t*half*2:side===2?half:half-t*half*2;
    const blend=Math.min(1,ring/S.apronRings*2);
    vertices.push(x,getTerrainHeight(x,z)*(1-blend)-1.5*blend,z);
    color.copy(earth).lerp(gray,(Math.sin(x*.12+z*.09)+1)*.2+blend*.15);colors.push(color.r,color.g,color.b);
    if(ring<S.apronRings){const a=ring*count+index,b=ring*count+(index+1)%count;indices.push(a,b,a+count,b,b+count,a+count);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));mesh.name='non-walkable-apron';return mesh;
}

export const RIDGE_LAYERS = [
  { x:-70,z:-69,width:145,depth:34,axis:'x',seed:2,far:true },
  { x:-61,z:-51,width:132,depth:20,axis:'x',seed:5,far:false },
  { x:34,z:-45,width:100,depth:34,axis:'z',seed:9,far:true },
  { x:-68,z:4,width:72,depth:34,axis:'z',seed:14,far:false },
  { x:-25,z:37,width:83,depth:30,axis:'x',seed:19,far:true },
] as const;

/** One connected relief grid per range, with multiple asymmetric summits and tapered ends. */
export function createSierraBackdrop(): THREE.Group {
  const group=new THREE.Group(); group.name='sierra-backdrop';
  group.add(createApron());
  RIDGE_LAYERS.forEach((layer)=>{
    const vertices:number[]=[], colors:number[]=[], indices:number[]=[];
    const color=new THREE.Color(), base=new THREE.Color(layer.far?C.farRidge:C.nearRidge);
    const n=S.ridgeSegments, m=S.ridgeDepthSegments;
    for(let j=0;j<=m;j++) for(let i=0;i<=n;i++) {
      const u=i/n,v=j/m, along=u*layer.width;
      const crest=.49+.1*Math.sin(u*8+layer.seed);
      const cross=Math.exp(-(((v-crest)/.28)**2));
      const peaks=8+5*Math.sin(u*9+layer.seed)**2+3*Math.sin(u*21+layer.seed*.7)**2+2*Math.sin(u*37+layer.seed);
      const ends=Math.min(1,u*7,(1-u)*7);
      const height=-1.5+Math.max(0,peaks)*cross*ends*S.ridgeHeight;
      const x=layer.x+(layer.axis==='x'?along:v*layer.depth), z=layer.z+(layer.axis==='x'?v*layer.depth:along);
      vertices.push(x,height,z);
      color.copy(base).multiplyScalar(.87+.14*v+.06*Math.sin(u*17+v*8)); colors.push(color.r,color.g,color.b);
      if(i<n&&j<m){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
    }
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));
    mesh.name=layer.far?'far-ridge':'near-ridge'; group.add(mesh);
  });
  return group;
}
