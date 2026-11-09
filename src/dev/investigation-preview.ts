import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain,getTerrainHeight } from '../game/world/terrain';
import { createSierraEnvironment } from '../game/world/environment';
import { LANDSCAPE_SETTINGS as S } from '../game/world/landscape-config';
import { InvestigationView } from '../game/world/investigation-view';
import { INSPECTION_FRAMES } from '../game/world/investigation-style';
import { INVESTIGATION_STATIONS, INVESTIGATION_SETTINGS } from '../game/narrative/investigation-data';
import { InspectionCamera } from '../game/narrative/inspection-camera';
import { Bitacora } from '../ui/bitacora';
import '../app/styles.css';

const app=document.querySelector<HTMLElement>('#app')!,tools=document.querySelector<HTMLElement>('#preview-tools')!;
const scene=new THREE.Scene();scene.background=new THREE.Color(S.sky);scene.fog=new THREE.Fog(S.sky,S.fogNear,S.fogFar);
scene.add(createTerrain(),createSierraEnvironment(),new THREE.HemisphereLight(0xe2c9a5,0x56605a,1.5));
const key=new THREE.DirectionalLight(0xffe1b3,2.65);key.position.set(-8,14,6);scene.add(key);
const view=new InvestigationView(getTerrainHeight);view.object.visible=true;scene.add(view.object);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,S.cameraFar);scene.add(camera);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));app.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement),inspection=new InspectionCamera(camera,getTerrainHeight);
const held=new Set<string>();let selected=0,questionOpened=false;
const log=new Bitacora(app,()=>{if(!inspection.active){orbit.enabled=true;tools.hidden=false;}});
function normalView(index:number):void {
  if(inspection.active||log.isOpen)return;selected=index;
  const station=INVESTIGATION_STATIONS[index],point=station.route[station.route.length-1];
  camera.position.set(point.x-.1,getTerrainHeight(point.x-.1,point.z+.8)+1.7,point.z+.8);
  orbit.target.copy(station.position);orbit.target.y=getTerrainHeight(station.position.x,station.position.z)+.15;orbit.update();
}
function observe():void {
  if(inspection.active||log.isOpen)return;
  inspection.begin(view.subjects[selected],INSPECTION_FRAMES[selected],INVESTIGATION_SETTINGS.inspectionSeconds);
  questionOpened=false;orbit.enabled=false;tools.hidden=true;view.markers[selected].visible=false;
}
normalView(0);
document.querySelectorAll<HTMLButtonElement>('[data-station]').forEach((button)=>button.addEventListener('click',()=>normalView(Number(button.dataset.station))));
document.querySelector('#observe')!.addEventListener('click',observe);document.querySelector('#restart')!.addEventListener('click',()=>location.reload());
window.addEventListener('keydown',(event)=>{
  const repeated=held.has(event.code)||event.repeat;held.add(event.code);
  if(log.isOpen){
    if(event.code==='Enter'||event.code==='Escape'){
      if(log.requiresAnswer){if(repeated||event.code==='Escape')event.preventDefault();}
      else {event.preventDefault();if(!repeated)log.close();}
    }
    return;
  }
  if(inspection.active)return;
  if(event.code==='KeyF'&&!repeated){event.preventDefault();observe();}
  if(event.code==='KeyB'&&!repeated){event.preventDefault();orbit.enabled=false;tools.hidden=true;log.showLog([]);}
});
window.addEventListener('keyup',(event)=>held.delete(event.code));window.addEventListener('blur',()=>held.clear());
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{
  const delta=Math.min(clock.getDelta(),.1);
  if(inspection.active&&!document.hidden&&document.hasFocus()){
    if(!questionOpened&&inspection.update(delta)){
      questionOpened=true;const station=INVESTIGATION_STATIONS[selected];log.unlockEntry(station);
      log.showQuestion(station,station.question,station.options,()=>station.feedback,()=>{
        inspection.restore();orbit.enabled=true;tools.hidden=false;
      },'inspection');
    }else inspection.maintain();
  }
  if(orbit.enabled)orbit.update();renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
