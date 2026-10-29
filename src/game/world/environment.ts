import * as THREE from 'three';
import { getTerrainHeight, TERRAIN_COLORS } from './terrain';
import { createSierraBackdrop } from './sierra-backdrop';
import { LANDSCAPE_COLORS as C } from './landscape-config';

export const ENVIRONMENT_COLORS = {
  road:C.road, safeZone:C.dryGreen, mountainNear:C.nearRidge, mountainFar:C.farRidge, burnedGround:0x39362f,
};
/** Ground color/road are integrated into terrain vertices; only distant relief and landmarks here. */
export function createSierraEnvironment():THREE.Group {
  const environment=new THREE.Group(); environment.name='sierra-environment';
  environment.add(createSierraBackdrop());
  const rockGeometry=new THREE.DodecahedronGeometry(1,1);
  const rockMaterial=new THREE.MeshStandardMaterial({color:TERRAIN_COLORS.ash,roughness:1,flatShading:true});
  for(const [x,z,scale] of [[-22,-14,1.9],[21,-17,2.3],[22,16,1.7]]) {
    const rock=new THREE.Mesh(rockGeometry,rockMaterial);rock.position.set(x,getTerrainHeight(x,z)+scale*.65,z);
    rock.scale.set(scale,scale*1.35,scale);rock.rotation.set(.2,x*.3,.12);rock.castShadow=rock.receiveShadow=true;environment.add(rock);
  }
  return environment;
}
