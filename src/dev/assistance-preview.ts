/** Banco visual local, servido solo desde tests/assistance-preview.html. */
import * as THREE from 'three';
import { PlayerHealth } from '../game/player/player-health';
import { PostFireProgression } from '../game/narrative/post-fire-progression';
import { AssistanceScene } from '../game/narrative/assistance-scene';
import { AssistanceView, ASSISTANCE_LAYOUT } from '../game/world/assistance-view';
import { CollisionSystem } from '../game/world/collision-system';
import { createTerrain, getTerrainHeight } from '../game/world/terrain';
import { createGuideNpc } from '../game/npc/guide-npc';
import { GAME_BALANCE } from '../game/balance-config';
import '../app/styles.css';

const app = document.querySelector<HTMLElement>('#app')!;
const start = document.querySelector<HTMLButtonElement>('#preview-start')!;
const status = document.querySelector<HTMLElement>('#preview-status')!;
const panel = document.querySelector<HTMLElement>('#preview-controls')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);
const world = new THREE.Scene();
world.background = new THREE.Color(0xb5a58d);
world.add(createTerrain(), new THREE.HemisphereLight(0xe2dfc9, 0x414c37, 2.5));
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
world.add(camera);
const health = new PlayerHealth();
if (new URLSearchParams(location.search).get('health') !== 'full') {
  health.updateFromFirePositions(new THREE.Vector3(), [new THREE.Vector3()], 50 / GAME_BALANCE.player.damagePerSecond);
}
const flow = new PostFireProgression();
flow.activate(); flow.meetCompanion();
const view = new AssistanceView(getTerrainHeight);
view.show(new CollisionSystem());
world.add(view.object);
view.setCamera(camera);
const companion = createGuideNpc();
companion.position.copy(ASSISTANCE_LAYOUT.faunaCompanion);
companion.position.y = getTerrainHeight(companion.position.x, companion.position.z);
companion.visible = false;
world.add(companion);
const scene = new AssistanceScene(app, camera, health, flow, view,
  () => { panel.hidden = true; },
  () => { panel.hidden = false; start.hidden = true; },
  () => { companion.visible = true; },
);
start.addEventListener('click', () => { if (flow.requestAssistance()) scene.open(); });
let enterHeld = false;
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Enter' || !flow.careLocked) return;
  event.preventDefault();
  if (!enterHeld && !event.repeat) scene.confirm();
  enterHeld = true;
});
window.addEventListener('keyup', (event) => { if (event.code === 'Enter') enterHeld = false; });
window.addEventListener('blur', () => { enterHeld = false; });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  if (!document.hidden && document.hasFocus()) scene.update(delta);
  status.textContent = `Salud: ${health.amount.toFixed(1)} / 100 · ${flow.currentStage}`;
  renderer.render(world, camera);
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
