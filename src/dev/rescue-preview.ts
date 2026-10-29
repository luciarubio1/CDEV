/** Banco visual de la secuencia real, sin repetir preparación, incendio ni asistencia. */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GameSession } from '../game/game-session';
import { FaunaTour } from '../game/narrative/fauna-tour';
import { FAUNA_CONFIG } from '../game/narrative/fauna-config';
import { FOX_NOTE, OTHER_FAUNA_NOTES } from '../game/narrative/fauna-education';
import { ReinforcementSequence } from '../game/narrative/reinforcement-sequence';
import { ReinforcementView, REINFORCEMENT_LAYOUT } from '../game/world/reinforcement-view';
import { CollisionSystem } from '../game/world/collision-system';
import { AssistanceView } from '../game/world/assistance-view';
import { createTerrain, getTerrainHeight } from '../game/world/terrain';
import { createFireTruck, FIRE_TRUCK_POSITION } from '../game/world/fire-truck';
import { ObjectiveCompass } from '../ui/hud/objective-compass';
import { Bitacora } from '../ui/bitacora';
import '../app/styles.css';

const app = document.querySelector<HTMLElement>('#app')!;
const status = document.querySelector<HTMLElement>('#preview-status')!;
const interaction = document.querySelector<HTMLElement>('#preview-interaction')!;
const dialog = document.querySelector<HTMLElement>('#preview-dialog')!;
const button = dialog.querySelector<HTMLButtonElement>('button')!;
const world = new THREE.Scene();
world.background = new THREE.Color(0xb5a58d);
world.add(createTerrain(), new THREE.HemisphereLight(0xe2dfc9,0x414c37,2.5));
const camera = new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,100);
camera.position.set(-4.8,getTerrainHeight(-4.8,15)+1.7,15);
camera.lookAt(FAUNA_CONFIG.carrier.clone().add(new THREE.Vector3(0,0.6,0)));
world.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
app.appendChild(renderer.domElement);
const controls = new PointerLockControls(camera,renderer.domElement);
const collision = new CollisionSystem();
const companion = new ReinforcementView(getTerrainHeight);
companion.render(new ReinforcementSequence().finish());
companion.moveCompanion(FAUNA_CONFIG.routeB.at(-1)!);
world.add(companion.object);
collision.addCircle(REINFORCEMENT_LAYOUT.truckStop,2.9);
const originalTruck = createFireTruck();
originalTruck.position.y = getTerrainHeight(originalTruck.position.x,originalTruck.position.z);
world.add(originalTruck); collision.addCircle(FIRE_TRUCK_POSITION,2);
const medical = new AssistanceView(getTerrainHeight); medical.show(collision); world.add(medical.object);
const companionCollider = collision.addCircle(companion.companionPosition,0.4);
const session = new GameSession(); session.beginContainment(); session.beginCompanionDialogue(); session.beginEpilogue();
const flow = session.postFire;
flow.meetCompanion(); flow.requestAssistance(); flow.startCare(); flow.finishCare(); flow.closeCare(); flow.meetForFauna();
for(const stage of ['fauna-walk-a','fauna-refuge','fauna-dialogue-a','fauna-walk-b','fauna-dialogue-b','fauna-radio','vet-arriving','vet-evaluating','vet-dialogue','carrier'] as const) flow.advanceFauna(stage);
let dialogOpen = false;
const keys = new Set<string>(), held = new Set<string>();
const log = new Bitacora(app, () => { keys.clear(); controls.lock(); });
const tour = new FaunaTour(flow,companion,collision,getTerrainHeight,(title,text) => {
  dialogOpen = true; keys.clear(); controls.unlock();
  dialog.querySelector('strong')!.textContent = title; dialog.querySelector('p')!.textContent = text;
  dialog.classList.add('visible'); queueMicrotask(() => button.focus());
},{camera,onRescueCompleted: () => { log.unlockEntry(FOX_NOTE); OTHER_FAUNA_NOTES.forEach((note) => log.unlockEntry(note)); }});
tour.object.visible = tour.animals.object.visible = tour.veterinarian.object.visible = true;
tour.animals.smallAnimal.visible = false;
tour.veterinarian.object.position.copy(FAUNA_CONFIG.veterinarianRoute.at(-1)!);
tour.veterinarian.object.position.y = getTerrainHeight(tour.veterinarian.object.position.x,tour.veterinarian.object.position.z);
const vetCollider = collision.addCircle(tour.veterinarian.object.position,0.4);
tour.carrier.visible = true; tour.rescue.activate(); world.add(tour.object);
function closeDialogue(): void {
  dialogOpen = false; dialog.classList.remove('visible');
  tour.continueDialogue(); if (!dialogOpen) controls.lock();
}
button.addEventListener('click',closeDialogue);
renderer.domElement.addEventListener('click', () => { if (!dialogOpen && !log.isOpen) controls.lock(); });
window.addEventListener('keydown',(event) => {
  const repeated = held.has(event.code) || event.repeat; held.add(event.code);
  if(dialogOpen) { if(event.code==='Enter') { event.preventDefault(); if(!repeated) closeDialogue(); } return; }
  if(log.isOpen) { if(event.code==='Enter' || event.code==='Escape') { event.preventDefault(); log.close(); } return; }
  if(event.code==='KeyB' && !repeated) { keys.clear(); controls.unlock(); log.showLog([]); return; }
  if(!controls.isLocked) return;
  if(event.code==='KeyF' && !repeated) { tour.rescue.interact(camera.position); return; }
  keys.add(event.code);
});
window.addEventListener('keyup',(event) => { keys.delete(event.code); held.delete(event.code); });
window.addEventListener('blur',() => { keys.clear(); held.clear(); });
controls.addEventListener('unlock',() => keys.clear());
const clock = new THREE.Clock(), compass = new ObjectiveCompass(app), forward = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(),0.1);
  const paused = !controls.isLocked || dialogOpen || log.isOpen || !document.hasFocus();
  if(!paused) {
    const before = camera.position.clone();
    const movement = new THREE.Vector2(Number(keys.has('KeyD'))-Number(keys.has('KeyA')),Number(keys.has('KeyW'))-Number(keys.has('KeyS'))).normalize().multiplyScalar(3.2*delta);
    controls.moveRight(movement.x); controls.moveForward(movement.y);
    const body = collision.resolveMovement(before,camera.position);
    const position = tour.rescue.constrainPlayerMovement(before,body);
    camera.position.copy(position); camera.position.y = getTerrainHeight(position.x,position.z)+1.7;
    tour.animals.update(delta); tour.rescue.update(delta,camera.position,false);
    companionCollider.copy(companion.companionPosition);
    vetCollider.copy(tour.veterinarian.object.position);
  }
  status.textContent = tour.rescue.isWaiting ? 'El veterinario te espera' : flow.objective;
  interaction.textContent = tour.rescue.interactionMessage(camera.position) ?? '';
  camera.getWorldDirection(forward);
  compass.update(camera.position,forward,tour.rescue.navigationTarget,null,!dialogOpen && !log.isOpen);
  renderer.render(world,camera);
});
window.addEventListener('resize',() => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
});
