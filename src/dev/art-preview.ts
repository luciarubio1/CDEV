import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCharacter, animateCharacters, setCharacterCarrier, setCharacterGesture } from '../game/npc/character-model';
import { createFireTruck, FireTruckEmergencyLights } from '../game/world/fire-truck';
import { createAnimalCarrier, CARRIER_CARRY_POSE } from '../game/world/animal-carrier';

const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb5a58d);
scene.add(new THREE.HemisphereLight(0xe2c9a5,0x56605a,1.5));
const key = new THREE.DirectionalLight(0xffe1b3,2.65); key.position.set(-8,14,6); scene.add(key);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:0x807756,roughness:1}));
ground.rotation.x = -Math.PI/2; scene.add(ground);
const camera = new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100); camera.position.set(9,6,12);
const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); document.body.append(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement); controls.target.set(0,1,-3); controls.update();
const actors = [createCharacter('brigadista'),createCharacter('salud'),createCharacter('fauna')];
actors.forEach((actor,index)=>{ actor.position.set((index-1)*3,0,0); scene.add(actor); });
const carrier = createAnimalCarrier(); carrier.position.set(0,CARRIER_CARRY_POSE.height,CARRIER_CARRY_POSE.forward); actors[2].add(carrier);
const trucks = [createFireTruck(),createFireTruck()];
trucks.forEach((truck,index)=>{truck.position.set(index===0?-3.5:3.5,0,-7);truck.rotation.y=0;scene.add(truck);});
const lights = trucks.map((truck)=>new FireTruckEmergencyLights(truck));
let mode = 'idle', elapsed = 0;
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button)=>button.addEventListener('click',()=>{
  mode = button.dataset.mode!; elapsed = 0;
  setCharacterCarrier(actors[2],mode==='carry'?carrier:null); carrier.visible = mode==='carry';
  actors.forEach((actor,index)=>{actor.position.set((index-1)*3,0,0);actor.rotation.y=0;setCharacterGesture(actor,0);});
}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button)=>button.addEventListener('click',()=>{
  const view = button.dataset.view; camera.position.set(view==='side'?12:0,5,view==='front'?-15:view==='rear'?12:-3); controls.target.set(0,1,-3); controls.update();
}));
const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const delta = Math.min(clock.getDelta(),.1); elapsed += delta;
  if(mode==='walk') actors.forEach((actor)=>{const cycle=elapsed*2.5%8;actor.position.z=cycle<4?cycle:8-cycle;actor.rotation.y=cycle<4?0:Math.PI;});
  if(mode==='carry') { actors[2].position.z=Math.sin(elapsed*.65)*1.5; actors[2].rotation.y=.3*Math.sin(elapsed*.4); }
  if(mode==='care') {setCharacterGesture(actors[1],.5+.35*Math.sin(elapsed*1.5));setCharacterGesture(actors[2],.65);}
  lights.forEach((light)=>light.update(delta,true));
  animateCharacters(scene,delta,camera.position,mode==='idle'||mode==='care'); controls.update(); renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
