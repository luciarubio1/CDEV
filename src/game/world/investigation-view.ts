import * as THREE from 'three';
import { INVESTIGATION_STATIONS } from '../narrative/investigation-data';
import { createDroughtStation,createCampStation,createCigaretteStation,inspectionGroundHeight } from './investigation-models';

/** Cold evidence only; no lights, FireSource, damage or progression in these builders. */
export class InvestigationView {
  readonly object=new THREE.Group();
  readonly markers:THREE.Mesh[]=[];
  readonly subjects:THREE.Group[]=[];
  readonly stations:THREE.Group[]=[];
  constructor(terrain:(x:number,z:number)=>number) {
    const builders=[createDroughtStation,createCampStation,createCigaretteStation];
    const markerOffsets=[[-1.12,.55],[-.86,.75],[-.17,.12]],radii=[.1,.1,.065];
    const markerMaterial=new THREE.MeshBasicMaterial({color:0x8ed1c0,transparent:true,opacity:.65,depthWrite:false});
    INVESTIGATION_STATIONS.forEach((station,index)=>{
      const rootY=terrain(station.position.x,station.position.z);
      const height=(x:number,z:number)=>inspectionGroundHeight(terrain,station.position.x+x,station.position.z+z)-rootY;
      const visual=builders[index](height);visual.object.position.set(station.position.x,rootY,station.position.z);
      const geometry=new THREE.TorusGeometry(radii[index],.007,5,20);geometry.rotateX(-Math.PI/2);
      const vertices=geometry.attributes.position,[x,z]=markerOffsets[index];
      for(let i=0;i<vertices.count;i++){
        const px=vertices.getX(i)+x,pz=vertices.getZ(i)+z;
        vertices.setXYZ(i,px,vertices.getY(i)+height(px,pz)+.016,pz);
      }
      geometry.computeVertexNormals();const marker=new THREE.Mesh(geometry,markerMaterial);marker.name='discovery-marker';
      visual.object.add(marker);this.markers.push(marker);this.subjects.push(visual.subject);this.stations.push(visual.object);this.object.add(visual.object);
    });
    this.object.visible=false;
  }
}
