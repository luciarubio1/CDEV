import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FireSystem } from '../game/fire/fire-system';
import { GAME_BALANCE } from '../game/balance-config';
import { WaterTank } from '../game/player/water-tank';
import { createTerrain,getTerrainHeight } from '../game/world/terrain';
import { BurnedGroundSystem } from '../game/world/burned-ground';
import { CollisionSystem } from '../game/world/collision-system';
import { LANDSCAPE_SETTINGS as S } from '../game/world/landscape-config';

const scene=new THREE.Scene();scene.background=new THREE.Color(S.sky);scene.fog=new THREE.Fog(S.sky,S.fogNear,S.fogFar);
scene.add(createTerrain(),new THREE.HemisphereLight(0xe2c9a5,0x56605a,1.5));
const key=new THREE.DirectionalLight(0xffe1b3,2.65);key.position.set(-8,14,6);scene.add(key);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,S.cameraFar);camera.position.set(8,6,12);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);orbit.update();
const collision=new CollisionSystem(),rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.6,1),new THREE.MeshStandardMaterial({color:0x777d72,roughness:1,flatShading:true}));
rock.position.set(2,getTerrainHeight(2,0)+.3,0);scene.add(rock);collision.addCircle(rock.position,.6);
const fire=new FireSystem();fire.setPropagationEnabled(false);fire.setWaveSpawningEnabled(false);
fire.setVisualSurface({terrainHeight:getTerrainHeight,canBurnAt:(x,z,r)=>collision.canOccupyXZ(x,z,r)});scene.add(fire.object);
const sources=[[-4,0],[-1,1.5],[2,0],[4,2]].map(([x,z],i)=>fire.addSource({position:new THREE.Vector3(x,getTerrainHeight(x,z),z),kind:i%2?'critical':'common',intensity:i%2?1.05:1}));
const tank=new WaterTank(),ground=new BurnedGroundSystem(getTerrainHeight);scene.add(ground.object);
const select=document.querySelector<HTMLSelectElement>('#focus')!,windSelect=document.querySelector<HTMLSelectElement>('#wind')!;
const wind={direction:new THREE.Vector3(),intensity:.65,name:'Prueba',arrow:'→'};
const context={playerPosition:camera.position,fireTruckPosition:new THREE.Vector3(-16,0,16),housePosition:new THREE.Vector3(10,0,10),wind};
const status=document.querySelector('#status')!;
let watering=false,support=false;
function focus(near:boolean):void{const source=sources[Number(select.value)];orbit.target.copy(source.object.position);orbit.target.y+=1;camera.position.copy(orbit.target).add(near?new THREE.Vector3(1,1.4,4):new THREE.Vector3(8,4,10));orbit.update();}
select.addEventListener('change',()=>focus(true));document.querySelector('#near')!.addEventListener('click',()=>focus(true));document.querySelector('#far')!.addEventListener('click',()=>focus(false));
const waterButton=document.querySelector('#water')!;waterButton.addEventListener('pointerdown',(event)=>{event.preventDefault();watering=true;});window.addEventListener('pointerup',()=>watering=false);
window.addEventListener('keydown',(event)=>{if(event.code==='KeyE'){event.preventDefault();watering=true;}});window.addEventListener('keyup',(event)=>{if(event.code==='KeyE')watering=false;});window.addEventListener('blur',()=>watering=false);
document.querySelector('#support')!.addEventListener('click',()=>support=!support);document.querySelector('#restart')!.addEventListener('click',()=>location.reload());
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{
  const delta=Math.min(clock.getDelta(),.1),source=sources[Number(select.value)];
  if(document.hasFocus()&&!document.hidden){
    wind.direction.set(windSelect.value==='1'?1:0,0,windSelect.value==='2'?-1:0);
    if(watering&&!support&&!tank.isEmpty&&source.isActive){const dt=fire.getRemainingImpactTime(source.object.position,.1,GAME_BALANCE.hose.extinguishPerSecond);const used=tank.consume(Math.min(delta,dt));fire.extinguishNearest(source.object.position,.1,used*GAME_BALANCE.hose.extinguishPerSecond);}
    if(support)fire.containByReinforcements(GAME_BALANCE.reinforcements.visualExtinguishPerSecond*delta);
    fire.update(delta,context);
    fire.consumeExtinguishedSources().forEach((entry)=>ground.addExtinguishedFire(entry));ground.update(delta);
  }
  status.textContent=`Foco ${source.isActive?'activo':'contenido'} · agua ${tank.amount.toFixed(1)} · focos del jugador ${fire.extinguishedCount}. ${support?'Apoyo activo.':''}`;
  orbit.update();renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
