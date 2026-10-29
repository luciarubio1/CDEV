import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain,getTerrainHeight } from '../game/world/terrain';
import { createSierraEnvironment } from '../game/world/environment';
import { LandscapeDecoration } from '../game/world/landscape-decoration';
import { LANDSCAPE_SETTINGS as S,TREE_PLACEMENTS } from '../game/world/landscape-config';
import { createSierraTree } from '../game/world/sierra-vegetation';
import { isReinforcementArea } from '../game/world/reinforcement-view';
import { isFaunaArea } from '../game/narrative/fauna-config';
import { createFireTruck } from '../game/world/fire-truck';
import { PREPARATION_TASKS, PreparationSequence } from '../game/narrative/preparation-sequence';
import { HoseView } from '../game/player/hose-view';
import { FireSystem } from '../game/fire/fire-system';
import { BurnedGroundSystem } from '../game/world/burned-ground';
import { VegetationStateSystem } from '../game/world/vegetation-state';

const scene=new THREE.Scene();scene.background=new THREE.Color(S.sky);scene.fog=new THREE.Fog(S.sky,S.fogNear,S.fogFar);
scene.add(createTerrain(),createSierraEnvironment(),new THREE.HemisphereLight(0xe2c9a5,0x56605a,1.5));
const sun=new THREE.DirectionalLight(0xffe1b3,2.65);sun.position.set(-8,14,6);scene.add(sun);
const decoration=new LandscapeDecoration(getTerrainHeight);scene.add(decoration.object);
const vegetation=new VegetationStateSystem();
TREE_PLACEMENTS.forEach(([x,z],index)=>{
  if(isReinforcementArea(x,z)||isFaunaArea(x,z))return;
  const tree=createSierraTree(5.5+(index%4)*.8,index);tree.position.set(x,getTerrainHeight(x,z),z);tree.rotation.y=index*.73;scene.add(tree);vegetation.register(tree,tree.position,5);
});
const truck=createFireTruck();truck.position.y=getTerrainHeight(truck.position.x,truck.position.z);scene.add(truck);
PREPARATION_TASKS.forEach((task)=>task.position.y=getTerrainHeight(task.position.x,task.position.z));
const preparation=new PreparationSequence(truck);preparation.setAvailable(true);scene.add(preparation.object);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,S.cameraFar);scene.add(camera);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);camera.position.set(-7,7,23);orbit.target.set(-16,1,16);orbit.update();
const hose=new HoseView(camera,scene);hose.setEquipped(false);
const ground=new BurnedGroundSystem(getTerrainHeight);scene.add(ground.object);
const fire=new FireSystem();
function near():void {
  const point=preparation.tasks.find((entry)=>entry.task.id===preparation.currentTask?.id)??preparation.tasks[2];
  orbit.target.copy(point.object.position);orbit.target.y+=.7;
  camera.position.copy(orbit.target).add(new THREE.Vector3(-3,1.3,3));orbit.update();
}
document.querySelector('#near')!.addEventListener('click',near);
document.querySelector('#wide')!.addEventListener('click',()=>{camera.position.set(-22,8,23);orbit.target.set(0,1,-5);orbit.update();});
document.querySelector('#complete')!.addEventListener('click',()=>{
  const point=preparation.tasks.find((entry)=>entry.task.id===preparation.currentTask?.id);if(!point)return;
  preparation.completeCurrentTask(point.interactionPosition.clone().add(new THREE.Vector3(0,1.7,0)));hose.setEquipped(preparation.isComplete);near();
});
document.querySelector('#burn')!.addEventListener('click',()=>{
  const p=new THREE.Vector3(-13,getTerrainHeight(-13,-10),-10);
  vegetation.update(3,[p]);vegetation.update(1,[]);decoration.updateBurning([p]);
  const source=fire.addSource({position:p,intensity:1});source.extinguish(10);ground.addExtinguishedFire(source);
});
document.querySelector('#restart')!.addEventListener('click',()=>location.reload());
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{
  const delta=Math.min(clock.getDelta(),.1);ground.update(delta);hose.update(null,delta);orbit.update();
  document.querySelector('#status')!.textContent=preparation.currentTask?.label??'Equipo conectado · manguera en primera persona';renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
