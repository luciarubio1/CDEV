import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioManager } from '../audio/audio-manager';
import { FireSystem } from '../game/fire/fire-system';
import { GameSession, type DefeatReason } from '../game/game-session';
import { GameStats, type GameStatsSnapshot } from '../game/game-stats';
import { IntroDialogue } from '../game/narrative/intro-dialogue';
import { IntroCinematic, type CinematicShot } from '../game/narrative/intro-cinematic';
import { DiscoverableSystem, type DiscoverableDefinition } from '../game/narrative/discoverables';
import { REAL_EMERGENCY_NOTICE, type MissionRoute } from '../game/narrative/mission-branch';
import { MissionDirector } from '../game/narrative/mission-director';
import {
  PREPARATION_TASKS,
  PreparationSequence,
} from '../game/narrative/preparation-sequence';
import {
  createGuideNpc,
  GUIDE_NPC_INTERACTION_RADIUS,
  GUIDE_NPC_POSITION,
} from '../game/npc/guide-npc';
import { HoseView } from '../game/player/hose-view';
import {
  MAX_PLAYER_HEALTH,
  PlayerHealth,
} from '../game/player/player-health';
import { MAX_WATER, WaterTank } from '../game/player/water-tank';
import {
  createFireTruck,
  FireTruckEmergencyLights,
  FIRE_TRUCK_POSITION,
  FIRE_TRUCK_RELOAD_RADIUS,
} from '../game/world/fire-truck';
import { House } from '../game/world/house';
import { HouseRisk } from '../game/world/house-risk';
import { CollisionSystem } from '../game/world/collision-system';
import {
  createTerrain,
  getTerrainHeight,
  TERRAIN_MAP_HALF_SIZE,
} from '../game/world/terrain';
import { createSierraEnvironment } from '../game/world/environment';
import { BurnedGroundSystem } from '../game/world/burned-ground';
import { VegetationStateSystem } from '../game/world/vegetation-state';
import { WindSystem, WIND_BITACORA_ENTRY } from '../game/world/wind-system';
import { AmbientAsh } from '../game/world/ambient-ash';
import { AmbientWildlife } from '../game/world/ambient-wildlife';
import { MainMenu } from '../ui/menus/main-menu';
import { Bitacora } from '../ui/bitacora';
import './styles.css';

const MAP_HALF_SIZE = TERRAIN_MAP_HALF_SIZE;
const PLAYER_MAP_MARGIN = 1;
const EXTINGUISH_RATE_PER_SECOND = 0.9;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación.');
}

const gameSession = new GameSession();
const gameStats = new GameStats();
const introDialogue = new IntroDialogue();
const audioManager = new AudioManager();
let experienceSelected = false;
let experienceStarted = false;
let gameMenuOpen = false;
let missionDecisionOpen = false;
let educationalOverlayOpen = false;
let cinematicActive = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5a58d);
scene.fog = new THREE.Fog(0xb5a58d, 42, 100);

const PLAYER_INITIAL_POSITION = new THREE.Vector3(0, getTerrainHeight(0, 7) + 1.7, 7);
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.copy(PLAYER_INITIAL_POSITION);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
app.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);

const instructions = document.createElement('section');
instructions.className = 'instructions';
instructions.innerHTML = `
  <strong>Entorno virtual de incendios</strong>
  <span>Haz clic para comenzar</span>
  <small>WASD para moverte · Mouse para mirar · ESC para liberar el mouse</small>
`;
app.appendChild(instructions);
instructions.classList.add('hidden');

const status = document.createElement('aside');
status.className = 'status';
status.textContent = 'Zona segura · Cargando escenario';
app.appendChild(status);

const environmentPanel = document.createElement('aside');
environmentPanel.className = 'environment-panel';
environmentPanel.innerHTML = `
  <strong>Estado del entorno</strong>
  <span data-metric="expansion">Expansión: calculando</span>
  <span data-metric="vegetation">Vegetación quemada: 0 · Suelo: 0 m²</span>
  <span data-metric="house">Riesgo de la casa: 0% · Estable</span>
  <div class="house-risk-meter" aria-label="Exposición de la casa al incendio">
    <div class="house-risk-meter__fill"></div>
  </div>
`;
app.appendChild(environmentPanel);

const interaction = document.createElement('aside');
interaction.className = 'interaction hidden';
interaction.textContent = 'Presioná E para usar la manguera';
app.appendChild(interaction);

const preparationChecklist = document.createElement('aside');
preparationChecklist.className = 'preparation-checklist';
preparationChecklist.innerHTML = `
  <strong>Preparación</strong>
  ${PREPARATION_TASKS.map(
    (task) =>
      `<span data-preparation-task="${task.id}"><i>○</i>${task.label}</span>`,
  ).join('')}
`;
preparationChecklist.classList.add('hidden');
app.appendChild(preparationChecklist);

const missionHud = document.createElement('aside');
missionHud.className = 'mission-hud hidden';
missionHud.innerHTML = '<strong>MisiÃ³n principal</strong><span></span>';
app.appendChild(missionHud);
const missionObjective = missionHud.querySelector<HTMLSpanElement>('span');

const discoveriesHud = document.createElement('aside');
discoveriesHud.className = 'discoveries-hud';
discoveriesHud.textContent = 'Hallazgos: 0/5 · B: bitácora';
app.appendChild(discoveriesHud);

const windHud = document.createElement('aside');
windHud.className = 'wind-hud';
windHud.textContent = 'Viento: ↑ Norte · Moderado';
app.appendChild(windHud);

const cinematicOverlay = document.createElement('section');
cinematicOverlay.className = 'cinematic-overlay';
cinematicOverlay.innerHTML = `
  <p class="cinematic-overlay__text"></p>
  <button type="button">Omitir <small>Espacio</small></button>
  <span>Presioná Espacio para omitir</span>
`;
app.appendChild(cinematicOverlay);
const cinematicText = cinematicOverlay.querySelector<HTMLParagraphElement>('.cinematic-overlay__text');
const cinematicSkipButton = cinematicOverlay.querySelector<HTMLButtonElement>('button');

const missionDecisionOverlay = document.createElement('section');
missionDecisionOverlay.className = 'mission-decision';
missionDecisionOverlay.innerHTML = `
  <div class="mission-decision__card" role="dialog" aria-modal="true" aria-labelledby="mission-decision-title">
    <strong>Decisión de misión</strong>
    <h2 id="mission-decision-title">¿Qué prioridad vas a asumir?</h2>
    <p>Esta experiencia es ficción educativa: elegí una prioridad para continuar la misión.</p>
    <div class="mission-decision__actions">
      <button type="button" data-mission-route="house">Priorizar la vivienda <small>Teclas 1 / H</small></button>
      <button type="button" data-mission-route="forest">Priorizar el bosque nativo <small>Teclas 2 / B</small></button>
    </div>
  </div>
`;
app.appendChild(missionDecisionOverlay);
const houseRouteButton = missionDecisionOverlay.querySelector<HTMLButtonElement>('[data-mission-route="house"]');
const forestRouteButton = missionDecisionOverlay.querySelector<HTMLButtonElement>('[data-mission-route="forest"]');

const waterHud = document.createElement('aside');
waterHud.className = 'water-hud';
waterHud.innerHTML = `
  <strong>Agua</strong>
  <div class="water-meter" aria-label="Nivel de agua">
    <div class="water-meter__fill"></div>
  </div>
  <span class="water-value">100 / 100</span>
`;
app.appendChild(waterHud);

const waterFill = waterHud.querySelector<HTMLDivElement>('.water-meter__fill');
const waterValue = waterHud.querySelector<HTMLSpanElement>('.water-value');

const healthHud = document.createElement('aside');
healthHud.className = 'health-hud';
healthHud.innerHTML = `
  <strong>Salud</strong>
  <div class="health-meter" aria-label="Salud del jugador">
    <div class="health-meter__fill"></div>
  </div>
  <span class="health-value">100 / 100</span>
`;
app.appendChild(healthHud);

const healthFill = healthHud.querySelector<HTMLDivElement>('.health-meter__fill');
const healthValue = healthHud.querySelector<HTMLSpanElement>('.health-value');

const damageVignette = document.createElement('div');
damageVignette.className = 'damage-vignette';
app.appendChild(damageVignette);

const guideDialogueOverlay = document.createElement('section');
guideDialogueOverlay.className = 'guide-dialogue';
guideDialogueOverlay.innerHTML = `
  <div class="guide-dialogue__card" role="dialog" aria-modal="true">
    <strong>Guía de emergencia</strong>
    <p></p>
    <button type="button">Entendido</button>
  </div>
`;
app.appendChild(guideDialogueOverlay);

const guideDialogueText = guideDialogueOverlay.querySelector<HTMLParagraphElement>('p');
const guideDialogueButton = guideDialogueOverlay.querySelector<HTMLButtonElement>('button');
guideDialogueButton?.addEventListener('click', () => closeGuideDialogue());

const defeatOverlay = document.createElement('section');
defeatOverlay.className = 'defeat-overlay';
defeatOverlay.innerHTML = `
  <div class="defeat-card" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
    <strong class="result-eyebrow">Fin de la experiencia</strong>
    <h1 id="defeat-title"></h1>
    <p class="defeat-reflection"></p>
    <p class="impact-message">Incluso cuando las llamas se apagan, el impacto sobre el suelo y la vegetación permanece.</p>
    <p class="real-emergency-message">${REAL_EMERGENCY_NOTICE}</p>
    <section class="defeat-summary" aria-labelledby="defeat-summary-title">
      <h2 id="defeat-summary-title">Resumen de la intervención</h2>
      <dl>
        <div><dt>Tiempo de supervivencia</dt><dd data-result-stat="survival"></dd></div>
        <div><dt>Focos apagados</dt><dd data-result-stat="fires"></dd></div>
        <div><dt>Máximo de focos activos</dt><dd data-result-stat="active-fires"></dd></div>
        <div><dt>Oleadas iniciadas</dt><dd data-result-stat="waves"></dd></div>
        <div><dt>Máximo riesgo de la casa</dt><dd data-result-stat="house-risk"></dd></div>
        <div><dt>Agua utilizada</dt><dd data-result-stat="water"></dd></div>
        <div><dt>Vegetación quemada</dt><dd data-result-stat="burned-vegetation"></dd></div>
        <div><dt>Superficie afectada</dt><dd data-result-stat="affected-surface"></dd></div>
        <div><dt>Ruta elegida</dt><dd data-result-stat="route"></dd></div>
        <div><dt>Hallazgos opcionales</dt><dd data-result-stat="discoveries"></dd></div>
        <div><dt>Viento predominante</dt><dd data-result-stat="wind"></dd></div>
        <div><dt>Cambios de viento</dt><dd data-result-stat="wind-changes"></dd></div>
      </dl>
    </section>
    <div class="defeat-actions">
      <button class="defeat-actions__retry" type="button">Reintentar</button>
      <button class="defeat-actions__menu" type="button">Volver al menú</button>
    </div>
  </div>
`;
app.appendChild(defeatOverlay);

const defeatMessage = defeatOverlay.querySelector<HTMLHeadingElement>('h1');
const defeatReflection = defeatOverlay.querySelector<HTMLParagraphElement>('.defeat-reflection');
const resultEyebrow = defeatOverlay.querySelector<HTMLElement>('.result-eyebrow');
const retryButton = defeatOverlay.querySelector<HTMLButtonElement>('.defeat-actions__retry');
const returnToMenuButton = defeatOverlay.querySelector<HTMLButtonElement>('.defeat-actions__menu');
retryButton?.addEventListener('click', () => window.location.reload());
returnToMenuButton?.addEventListener('click', () => window.location.reload());

const gameMenuButton = document.createElement('button');
gameMenuButton.type = 'button';
gameMenuButton.className = 'game-menu-button';
gameMenuButton.textContent = 'Menú';
gameMenuButton.hidden = true;
gameMenuButton.addEventListener('click', () => openGameMenu());
app.appendChild(gameMenuButton);

const mainMenu = new MainMenu(app, {
  onStart: beginExperience,
  onResume: resumeExperience,
});

function beginExperience(): void {
  experienceSelected = true;
  cinematicActive = true;
  introCinematic.start();
  cinematicOverlay.classList.add('visible');
  instructions.classList.add('hidden');
  status.textContent = 'Llegando a la zona de emergencia';
  instructions.classList.remove('hidden');
  status.textContent = 'Hacé clic sobre la escena para comenzar';
  instructions.classList.add('hidden');
  status.textContent = 'Llegando a la zona de emergencia';
  audioManager.start();
}

function openGameMenu(): void {
  if (!experienceStarted || gameSession.isOver || missionDecisionOpen) {
    return;
  }

  gameMenuOpen = true;
  keys.clear();
  hoseView.setWatering(false);
  audioManager.stopAllLoops();
  gameMenuButton.hidden = true;
  controls.unlock();
  mainMenu.showForPause();
}

function resumeExperience(): void {
  gameMenuOpen = false;
  gameMenuButton.hidden = false;
  audioManager.start();
  controls.lock();
}

function openMissionDecision(): void {
  if (!missionDirector.isDecisionPending) {
    return;
  }
  missionDecisionOpen = true;
  keys.clear();
  hoseView.setWatering(false);
  gameMenuButton.hidden = true;
  instructions.classList.add('hidden');
  missionDecisionOverlay.classList.add('visible');
  controls.unlock();
  queueMicrotask(() => houseRouteButton?.focus());
}

function selectMissionBranch(route: MissionRoute): void {
  if (!missionDecisionOpen || !missionDirector.selectBranch(route)) {
    return;
  }
  gameStats.recordMissionRoute(missionDirector.routeLabel);
  truckEmergencyLights.triggerEmergencyFlash();
  missionDecisionOpen = false;
  missionDecisionOverlay.classList.remove('visible');
  gameMenuButton.hidden = false;
  controls.lock();
}

houseRouteButton?.addEventListener('click', () => selectMissionBranch('house'));
forestRouteButton?.addEventListener('click', () => selectMissionBranch('forest'));

controls.addEventListener('lock', () => {
  experienceStarted = true;
  audioManager.start();
  gameMenuButton.hidden = false;
  instructions.classList.add('hidden');
});

controls.addEventListener('unlock', () => {
  if (
    experienceStarted &&
    !gameMenuOpen &&
    !gameSession.isOver &&
    !introDialogue.isOpen &&
    !missionDecisionOpen &&
    !educationalOverlayOpen
  ) {
    instructions.classList.remove('hidden');
  }
});

const ambientLight = new THREE.HemisphereLight(0xe2c9a5, 0x3b4237, 1.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffe1b3, 2.65);
directionalLight.position.set(-8, 14, 6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

scene.add(createTerrain());
scene.add(createSierraEnvironment());
const burnedGroundSystem = new BurnedGroundSystem(getTerrainHeight);
const vegetationStateSystem = new VegetationStateSystem();
const discoverableSystem = new DiscoverableSystem(getTerrainHeight);
const windSystem = new WindSystem();
const ambientAsh = new AmbientAsh();
const ambientWildlife = new AmbientWildlife();
scene.add(burnedGroundSystem.object);
scene.add(discoverableSystem.object);
scene.add(windSystem.object);
scene.add(ambientAsh.object);
scene.add(ambientWildlife.object);

const fireSystem = new FireSystem();
fireSystem.setWaveSpawningEnabled(false);
fireSystem.setPropagationEnabled(false);
scene.add(fireSystem.object);
const housePosition = new THREE.Vector3(10, getTerrainHeight(10, 10), 10);
const house = new House(housePosition);
const houseRisk = new HouseRisk();
scene.add(house.object);
const collisionSystem = new CollisionSystem();
collisionSystem.addRectangle(housePosition, 5, 4);

const hoseView = new HoseView(camera, scene);
const waterTank = new WaterTank();
const playerHealth = new PlayerHealth();
FIRE_TRUCK_POSITION.y = getTerrainHeight(FIRE_TRUCK_POSITION.x, FIRE_TRUCK_POSITION.z);
GUIDE_NPC_POSITION.y = getTerrainHeight(GUIDE_NPC_POSITION.x, GUIDE_NPC_POSITION.z);
PREPARATION_TASKS.forEach((task) => {
  task.position.y = getTerrainHeight(task.position.x, task.position.z);
});
const fireTruck = createFireTruck();
const truckEmergencyLights = new FireTruckEmergencyLights(fireTruck);
scene.add(fireTruck);
collisionSystem.addCircle(FIRE_TRUCK_POSITION, 2);
const missionDirector = new MissionDirector(
  fireSystem,
  FIRE_TRUCK_POSITION,
  getTerrainHeight,
);
scene.add(missionDirector.object);
const preparationSequence = new PreparationSequence();
preparationSequence.setAvailable(false);
scene.add(preparationSequence.object);
scene.add(createGuideNpc());

const cinematicShots: readonly CinematicShot[] = [
  {
    start: 0, end: 3.1,
    position: new THREE.Vector3(-22, getTerrainHeight(-22, 20) + 9, 20),
    target: new THREE.Vector3(-2, getTerrainHeight(-2, 1), 1),
    text: 'Sierras de Córdoba',
  },
  {
    start: 3.1, end: 6.2,
    position: new THREE.Vector3(-21, getTerrainHeight(-21, 19) + 4.4, 19),
    target: FIRE_TRUCK_POSITION.clone().add(new THREE.Vector3(0, 1.3, 0)),
    text: 'La sequía dejó el paisaje al límite',
  },
  {
    start: 6.2, end: 9.3,
    position: new THREE.Vector3(1, getTerrainHeight(1, 3) + 6.2, 3),
    target: new THREE.Vector3(5.5, getTerrainHeight(5.5, 8), 8),
    text: 'Un foco de incendio amenaza la zona',
  },
  {
    start: 9.3, end: 12.5,
    position: PLAYER_INITIAL_POSITION.clone(),
    target: GUIDE_NPC_POSITION.clone().add(new THREE.Vector3(0, 1.25, 0)),
    text: 'Tu equipo debe proteger la vivienda hasta la llegada de refuerzos',
  },
];
const introCinematic = new IntroCinematic({
  shots: cinematicShots,
  playerPosition: PLAYER_INITIAL_POSITION,
  playerTarget: GUIDE_NPC_POSITION.clone().add(new THREE.Vector3(0, 1.25, 0)),
  distantFirePosition: new THREE.Vector3(-7, getTerrainHeight(-7, -9), -9),
});
scene.add(introCinematic.object);

function finishCinematic(): void {
  if (!cinematicActive) return;
  cinematicActive = false;
  introCinematic.finish(camera);
  cinematicOverlay.classList.remove('visible');
  showGuideDialogue();
}

cinematicSkipButton?.addEventListener('click', () => finishCinematic());

function closeEducationalOverlay(): void {
  educationalOverlayOpen = false;
  if (!gameSession.isOver && !gameMenuOpen && !missionDecisionOpen) {
    controls.lock();
  }
}

const bitacora = new Bitacora(app, closeEducationalOverlay);

function openDiscoverable(item: DiscoverableDefinition): void {
  const discovered = discoverableSystem.discover(item.id);
  if (!discovered) return;
  educationalOverlayOpen = true;
  keys.clear();
  hoseView.setWatering(false);
  controls.unlock();
  bitacora.showDiscoverable(discovered);
}

function openBitacora(): void {
  if (gameSession.isOver || missionDecisionOpen) return;
  educationalOverlayOpen = true;
  keys.clear();
  hoseView.setWatering(false);
  controls.unlock();
  bitacora.showLog(
    windSystem.hasBeenObserved
      ? [...discoverableSystem.discovered, WIND_BITACORA_ENTRY]
      : discoverableSystem.discovered,
  );
}

const loader = new GLTFLoader();
const modelCache = new Map<string, THREE.Object3D>();
const assetUrls = import.meta.glob('../assets/*.glb', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

function prepareModel(model: THREE.Object3D): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material.roughness = Math.max(child.material.roughness, 0.75);
      }
    }
  });
}

async function loadModel(
  fileName: string,
  position: THREE.Vector3,
  targetHeight: number,
  rotation = 0,
): Promise<THREE.Object3D> {
  const assetPath = `../assets/${fileName}`;
  const assetUrl = assetUrls[assetPath];
  if (!assetUrl) {
    throw new Error(`No se encontró el modelo 3D: ${fileName}`);
  }

  let model = modelCache.get(fileName);
  if (!model) {
    const gltf = await loader.loadAsync(assetUrl);
    model = gltf.scene;
    prepareModel(model);
    modelCache.set(fileName, model);
  }

  model = model.clone(true);
  prepareModel(model);

  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.copy(position);
  model.rotation.y = rotation;
  scene.add(model);
  return model;
}

async function loadEnvironment(): Promise<void> {
  const assets: Promise<unknown>[] = [];
  const vegetation = [
    [-15, -12], [-12, -14], [-9, -12], [-5, -15],
    [2, -14], [6, -12], [13, -11], [16, -8],
    [-17, -4], [-14, -6], [-11, -4], [-8, -7],
    [14, -1], [17, 3], [15, 6], [-11, 9],
  ];

  vegetation.forEach(([x, z], index) => {
    const height = 5.5 + (index % 4) * 0.8;
    const position = new THREE.Vector3(x, getTerrainHeight(x, z), z);
    assets.push(
      loadModel(
        'TreeHigh001.glb',
        position,
        height,
        index * 0.73,
      ).then((model) => vegetationStateSystem.register(model, position, 5)),
    );
    fireSystem.trackCombustible({
      position,
      ignitionDistance: 5.5,
      ignitionTime: 10 + (index % 4) * 3,
    });
    collisionSystem.addCircle(new THREE.Vector3(x, 0, z), 1.15);
  });

  [
    [-7, -3, 1.2], [3, -5, 0.9], [11, 2, 1.1],
    [-4, 8, 1.3], [4, 9, 0.8], [14, -8, 1],
  ].forEach(([x, z, scale], index) => {
    assets.push(
      loadModel(
        'Rock001.glb',
        new THREE.Vector3(x, getTerrainHeight(x, z), z),
        scale,
        index * 1.1,
      ),
    );
    collisionSystem.addCircle(new THREE.Vector3(x, 0, z), Number(scale) * 0.8);
  });

  [
    [-15, -9], [-11, -10], [-12, -1], [0, -9], [7, -11], [-15, 9], [1, 15], [12, 11],
  ].forEach(([x, z], index) => {
    const position = new THREE.Vector3(x, getTerrainHeight(x, z), z);
    assets.push(
      loadModel(
        'Bush001 (1).glb',
        position,
        1.1 + (index % 3) * 0.2,
        index * 0.8,
      ).then((model) => vegetationStateSystem.register(model, position, 1.4)),
    );
  });

  for (let index = 0; index < 8; index += 1) {
    const x = -17 + index * 4.5;
    const z = 17 - (index % 3) * 2;
    const position = new THREE.Vector3(x, getTerrainHeight(x, z), z);
    assets.push(
      loadModel(
        'Grass001.glb',
        position,
        0.7 + (index % 2) * 0.15,
        index * 0.5,
      ).then((model) => vegetationStateSystem.register(model, position, 0.35)),
    );
  }

  try {
    await Promise.all(assets);
    status.textContent = !introDialogue.isComplete
      ? 'Hablá con la guía junto al camión'
      : preparationSequence.isComplete
      ? `Incendio activo · Focos: ${fireSystem.activeCount}`
      : 'Preparación requerida · acercate al camión';
  } catch (error) {
    status.textContent = 'Error al cargar un modelo del escenario';
    console.error('No se pudo cargar el entorno 3D.', error);
  }
}

void loadEnvironment();

const expansionMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="expansion"]');
const vegetationMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="vegetation"]');
const houseMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="house"]');
const houseRiskFill = environmentPanel.querySelector<HTMLDivElement>(
  '.house-risk-meter__fill',
);

function updateEnvironmentPanel(): void {
  const vegetationBurned = vegetationStateSystem.burnedCount;
  const affectedSurface = burnedGroundSystem.affectedSurfaceArea;
  const houseExposurePercentage = Math.round(houseRisk.exposureRatio * 100);
  const houseRiskLabel = houseRisk.isBurned
    ? 'Incendiada'
    : houseExposurePercentage >= 60
      ? 'Alto'
      : houseExposurePercentage >= 25
        ? 'Moderado'
        : 'Bajo';

  if (expansionMetric) {
    expansionMetric.textContent =
      `Expansión: ${fireSystem.activeCount > 1 ? 'Múltiples frentes' : 'Activa'}`;
  }
  if (vegetationMetric) {
    vegetationMetric.textContent =
      `Vegetación quemada: ${vegetationBurned}/${vegetationStateSystem.count} · ` +
      `Suelo: ${Math.round(affectedSurface)} m²`;
  }
  if (houseMetric) {
    houseMetric.textContent =
      `Riesgo de la casa: ${houseExposurePercentage}% · ${houseRiskLabel}`;
    houseMetric.dataset.risk = houseRiskLabel.toLowerCase();
  }
  if (houseRiskFill) {
    houseRiskFill.style.width = `${houseExposurePercentage}%`;
  }
}

const keys = new Set<string>();
const movement = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
const healthyColor = new THREE.Color(0x30bc14);
const warningHealthColor = new THREE.Color(0xf2c94c);
const criticalHealthColor = new THREE.Color(0xd62828);
let reloadedAt = Number.NEGATIVE_INFINITY;
let equipmentReadyAt = Number.NEGATIVE_INFINITY;
let audioStatusUntil = Number.NEGATIVE_INFINITY;
let audioStatusMessage = '';
let damageVignetteOpacity = 0;
let waveNoticeUntil = Number.NEGATIVE_INFINITY;
let waveNoticeMessage = '';
let windNoticeUntil = Number.NEGATIVE_INFINITY;
let windNoticeMessage = '';

function isNearFireTruck(): boolean {
  const horizontalDistance = Math.hypot(
    camera.position.x - FIRE_TRUCK_POSITION.x,
    camera.position.z - FIRE_TRUCK_POSITION.z,
  );
  return horizontalDistance <= FIRE_TRUCK_RELOAD_RADIUS;
}

function isNearGuideNpc(): boolean {
  const horizontalDistance = Math.hypot(
    camera.position.x - GUIDE_NPC_POSITION.x,
    camera.position.z - GUIDE_NPC_POSITION.z,
  );
  return horizontalDistance <= GUIDE_NPC_INTERACTION_RADIUS;
}

function getNearestFireDistance(): number {
  return fireSystem.activePositions.reduce(
    (nearest, firePosition) =>
      Math.min(nearest, camera.position.distanceTo(firePosition)),
    Number.POSITIVE_INFINITY,
  );
}

function showAudioStatus(muted: boolean): void {
  audioStatusMessage = muted ? 'Audio silenciado' : 'Audio activado';
  audioStatusUntil = performance.now() + 1800;
}

function showGuideDialogue(): void {
  introDialogue.show();
  keys.clear();
  hoseView.setWatering(false);
  if (guideDialogueText) {
    guideDialogueText.textContent = introDialogue.text;
  }
  guideDialogueOverlay.classList.add('visible');
  controls.unlock();
}

function closeGuideDialogue(): void {
  const firstConversation = !introDialogue.isComplete;
  introDialogue.close();
  guideDialogueOverlay.classList.remove('visible');

  if (firstConversation) {
    preparationSequence.setAvailable(true);
    preparationChecklist.classList.remove('hidden');
    status.textContent = 'Preparación requerida · acercate al camión';
  }

  controls.lock();
}

function updateWaterHud(): void {
  const percentage = (waterTank.amount / MAX_WATER) * 100;
  if (waterFill) {
    waterFill.style.height = `${percentage}%`;
  }
  if (waterValue) {
    waterValue.textContent = `${Math.ceil(waterTank.amount)} / ${MAX_WATER}`;
  }
  waterHud.classList.toggle('empty', waterTank.isEmpty);
}

function updatePreparationChecklist(): void {
  PREPARATION_TASKS.forEach((task) => {
    const taskElement = preparationChecklist.querySelector<HTMLElement>(
      `[data-preparation-task="${task.id}"]`,
    );
    if (!taskElement) {
      return;
    }

    const completed = preparationSequence.isTaskCompleted(task.id);
    taskElement.classList.toggle('completed', completed);
    const indicator = taskElement.querySelector<HTMLElement>('i');
    if (indicator) {
      indicator.textContent = completed ? '✓' : '○';
    }
  });
  preparationChecklist.classList.toggle('complete', preparationSequence.isComplete);
}

function completePreparationTask(): void {
  const completedTask = preparationSequence.completeCurrentTask(camera.position);
  if (!completedTask) {
    return;
  }

  updatePreparationChecklist();
  if (preparationSequence.isComplete) {
    hoseView.setEquipped(true);
    equipmentReadyAt = performance.now();
    missionDirector.startAfterPreparation();
    truckEmergencyLights.triggerEmergencyFlash();
  } else {
    status.textContent = `${completedTask.label} completado`;
  }
}

function updateHealthHud(dangerLevel: number, delta: number): void {
  const healthRatio = playerHealth.amount / MAX_PLAYER_HEALTH;
  const healthColor =
    healthRatio >= 0.5
      ? healthyColor.clone().lerp(warningHealthColor, (1 - healthRatio) * 2)
      : warningHealthColor
          .clone()
          .lerp(criticalHealthColor, (0.5 - healthRatio) * 2);

  if (healthFill) {
    healthFill.style.height = `${healthRatio * 100}%`;
    healthFill.style.backgroundColor = `#${healthColor.getHexString()}`;
  }
  if (healthValue) {
    healthValue.textContent =
      `${Math.ceil(playerHealth.amount)} / ${MAX_PLAYER_HEALTH}`;
  }

  const targetOpacity = dangerLevel * 0.65;
  damageVignetteOpacity = THREE.MathUtils.damp(
    damageVignetteOpacity,
    targetOpacity,
    7,
    delta,
  );
  damageVignette.style.opacity = `${damageVignetteOpacity}`;
}

function recordCurrentStats(): void {
  gameStats.recordFireState(
    fireSystem.activeCount,
    fireSystem.extinguishedCount,
    fireSystem.wavesStarted,
  );
  gameStats.recordHouseRisk(houseRisk.exposureRatio);
  gameStats.recordWaterUsage(waterTank.totalConsumed);
  gameStats.recordEnvironmentalDamage(
    vegetationStateSystem.burnedCount,
    burnedGroundSystem.affectedSurfaceArea,
  );
  gameStats.recordDiscoveries(discoverableSystem.foundCount);
  gameStats.recordWind(windSystem.state.name, windSystem.changeCount);
}

function formatSurvivalTime(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.round(totalSeconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return minutes > 0
    ? `${minutes} min ${seconds.toString().padStart(2, '0')} s`
    : `${seconds} s`;
}

function setDefeatStat(name: string, value: string): void {
  const stat = defeatOverlay.querySelector<HTMLElement>(
    `[data-result-stat="${name}"]`,
  );
  if (stat) {
    stat.textContent = value;
  }
}

function updateDefeatSummary(snapshot: GameStatsSnapshot): void {
  const safeRiskPercentage = Math.round(
    Math.min(1, Math.max(0, snapshot.maxHouseRiskRatio)) * 100,
  );

  setDefeatStat('survival', formatSurvivalTime(snapshot.survivalSeconds));
  setDefeatStat('fires', `${snapshot.firesExtinguished}`);
  setDefeatStat('active-fires', `${snapshot.maxActiveFires}`);
  setDefeatStat('waves', `${snapshot.wavesStarted}`);
  setDefeatStat('house-risk', `${safeRiskPercentage}%`);
  setDefeatStat('water', `${snapshot.waterUsed} unidades`);
  setDefeatStat('burned-vegetation', `${snapshot.vegetationBurned}`);
  setDefeatStat('discoveries', `${snapshot.discoveriesFound}/${discoverableSystem.totalCount}`);
  setDefeatStat('wind', snapshot.predominantWind);
  setDefeatStat('wind-changes', `${snapshot.windChanges}`);
  setDefeatStat('route', snapshot.missionRoute);
  setDefeatStat('affected-surface', `${snapshot.affectedSurfaceArea} m²`);
}

function endGame(reason: DefeatReason): void {
  if (gameSession.isOver) {
    return;
  }

  recordCurrentStats();
  gameSession.end(reason);
  bitacora.close();
  truckEmergencyLights.setActive(false);
  keys.clear();
  hoseView.setWatering(false);
  audioManager.playDefeatOnce();
  gameMenuButton.hidden = true;
  controls.unlock();
  instructions.classList.add('hidden');

  if (defeatMessage) {
    defeatMessage.textContent =
      reason === 'player'
        ? 'El fuego te superó'
        : 'La casa fue alcanzada por el incendio';
  }
  if (defeatReflection) {
    defeatReflection.textContent =
      reason === 'player'
        ? 'La cercanía al fuego puede volver peligrosa cualquier intervención. La preparación, la distancia y el equipo adecuado ayudan a reducir la exposición.'
        : 'La prevención y la detección temprana son claves para evitar que el fuego alcance zonas habitadas. Actuar a tiempo permite proteger más vidas y hogares.';
  }
  if (reason === 'forest') {
    if (defeatMessage) defeatMessage.textContent = 'El bosque nativo superó el umbral de daño';
    if (defeatReflection) {
      defeatReflection.textContent =
        'El daño acumulado sobre la vegetación muestra por qué proteger el bosque nativo importa para la flora, la fauna y la recuperación del suelo.';
    }
  }
  updateDefeatSummary(gameStats.snapshot());
  defeatOverlay.classList.add('visible');
  queueMicrotask(() => retryButton?.focus());
}

function endVictory(): void {
  if (gameSession.isOver) {
    return;
  }

  recordCurrentStats();
  gameSession.win();
  bitacora.close();
  truckEmergencyLights.setActive(false);
  keys.clear();
  hoseView.setWatering(false);
  audioManager.stopAllLoops();
  gameMenuButton.hidden = true;
  controls.unlock();
  instructions.classList.add('hidden');
  if (resultEyebrow) {
    resultEyebrow.textContent = 'MisiÃ³n cumplida';
  }
  if (defeatMessage) {
    defeatMessage.textContent = 'La vivienda fue protegida';
  }
  if (defeatReflection) {
    defeatReflection.textContent =
      'La prevenciÃ³n, la comunicaciÃ³n temprana y el trabajo coordinado reducen el impacto de los incendios.';
  }
  if (defeatMessage) defeatMessage.textContent = missionDirector.victoryTitle;
  if (defeatReflection) defeatReflection.textContent = missionDirector.victoryReflection;
  updateDefeatSummary(gameStats.snapshot());
  defeatOverlay.classList.add('visible');
  queueMicrotask(() => retryButton?.focus());
}

function updateInteraction(nearFireTruck: boolean): void {
  if (!controls.isLocked || gameMenuOpen || missionDecisionOpen || educationalOverlayOpen || gameSession.isOver) {
    interaction.classList.add('hidden');
    return;
  }

  if (!introDialogue.isComplete) {
    if (isNearGuideNpc()) {
      interaction.textContent = 'Presioná F para hablar';
      interaction.classList.remove('hidden');
    } else {
      interaction.classList.add('hidden');
    }
    return;
  }

  if (!preparationSequence.isComplete) {
    interaction.textContent =
      preparationSequence.getInteractionMessage(camera.position) ??
      `Preparación pendiente: ${preparationSequence.currentTask?.label}`;
    interaction.classList.remove('hidden');
    return;
  }

  if (missionDirector.isNearRadio(camera.position)) {
    interaction.textContent = 'PresionÃ¡ F para solicitar refuerzos';
  } else if (discoverableSystem.findNearby(camera.position)) {
    interaction.textContent = 'Presioná F para investigar';
  } else if (nearFireTruck) {
    interaction.textContent = 'Presioná R para recargar agua';
  } else if (waterTank.isEmpty) {
    interaction.textContent = 'Sin agua · acercate al camión para recargar';
  } else if (fireSystem.activeCount > 0) {
    interaction.textContent = 'Mantené E para usar la manguera';
  } else {
    interaction.classList.add('hidden');
    return;
  }

  interaction.classList.remove('hidden');
}

window.addEventListener('keydown', (event) => {
  if (!experienceSelected) {
    return;
  }

  if (gameMenuOpen) {
    return;
  }

  if (cinematicActive) {
    if (event.code === 'Space') {
      event.preventDefault();
      finishCinematic();
    } else if (event.code === 'KeyM') {
      event.preventDefault();
      showAudioStatus(audioManager.toggleMuted());
    }
    return;
  }

  if (missionDecisionOpen) {
    if (!event.repeat && (event.code === 'Digit1' || event.code === 'KeyH')) {
      selectMissionBranch('house');
    } else if (!event.repeat && (event.code === 'Digit2' || event.code === 'KeyB')) {
      selectMissionBranch('forest');
    }
    return;
  }

  if (educationalOverlayOpen) {
    if (event.code === 'Escape' || event.code === 'Enter') {
      event.preventDefault();
      bitacora.close();
    }
    return;
  }

  if (event.code === 'KeyM') {
    event.preventDefault();
    showAudioStatus(audioManager.toggleMuted());
    return;
  }

  if (gameSession.isOver) {
    return;
  }

  if (event.code === 'KeyB') {
    event.preventDefault();
    openBitacora();
    return;
  }

  if (introDialogue.isOpen) {
    if (event.code === 'Enter') {
      event.preventDefault();
      closeGuideDialogue();
    }
    return;
  }

  keys.add(event.code);

  if (event.code === 'KeyF' && controls.isLocked) {
    if (isNearGuideNpc()) {
      showGuideDialogue();
      return;
    }
    if (introDialogue.isComplete && !preparationSequence.isComplete) {
      completePreparationTask();
      return;
    }
    if (
      preparationSequence.isComplete &&
      !event.repeat &&
      missionDirector.requestReinforcements(camera.position)
    ) {
      openMissionDecision();
      return;
    }
    if (preparationSequence.isComplete) {
      const nearbyDiscoverable = discoverableSystem.findNearby(camera.position);
      if (nearbyDiscoverable) {
        openDiscoverable(nearbyDiscoverable);
        return;
      }
    }
  }

  if (
    event.code === 'KeyR' &&
    controls.isLocked &&
    introDialogue.isComplete &&
    preparationSequence.isComplete &&
    isNearFireTruck() &&
    !event.repeat
  ) {
    waterTank.refill();
    reloadedAt = performance.now();
    audioManager.playTruckRefill();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  if (event.code === 'KeyE') {
    hoseView.setWatering(false);
  }
});

renderer.domElement.addEventListener('click', () => {
  if (experienceSelected && !cinematicActive && !gameMenuOpen && !missionDecisionOpen && !educationalOverlayOpen && !gameSession.isOver) {
    controls.lock();
  }
});

// Iniciar el ambiente dentro del gesto nativo del usuario evita que el
// navegador bloquee la reproducción al esperar el evento de Pointer Lock.
renderer.domElement.addEventListener(
  'pointerdown',
  () => {
    if (experienceSelected) {
      audioManager.start();
    }
  },
  { once: true },
);

function updateMovement(delta: number): void {
  if (!controls.isLocked || gameMenuOpen || missionDecisionOpen || educationalOverlayOpen || gameSession.isOver) {
    return;
  }

  direction.z = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  direction.x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  direction.normalize();

  const speed = 4;
  movement.x = direction.x * speed * delta;
  movement.z = direction.z * speed * delta;
  const previousPosition = camera.position.clone();
  controls.moveRight(movement.x);
  controls.moveForward(movement.z);

  const movementLimit = MAP_HALF_SIZE - PLAYER_MAP_MARGIN;
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    -movementLimit,
    movementLimit,
  );
  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    -movementLimit,
    movementLimit,
  );
  const resolvedPosition = collisionSystem.resolveMovement(
    previousPosition,
    camera.position,
  );
  camera.position.x = resolvedPosition.x;
  camera.position.z = resolvedPosition.z;
  camera.position.y = getTerrainHeight(camera.position.x, camera.position.z) + 1.7;
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  let extinguishing = false;
  let dangerLevel = 0;

  if (cinematicActive) {
    const frame = introCinematic.update(camera, delta);
    if (cinematicText) cinematicText.textContent = frame.text;
    if (frame.sirenCue) audioManager.playSirenCue();
    if (frame.complete) finishCinematic();
  }

  discoverableSystem.update(delta);

  if (experienceStarted && !gameMenuOpen && !missionDecisionOpen && !gameSession.isOver) {
    const windUpdate = windSystem.update(delta);
    if (windUpdate.changed) {
      windNoticeMessage = `El viento cambió: el fuego puede avanzar hacia el ${windUpdate.state.name.toLowerCase()}.`;
      windNoticeUntil = performance.now() + 3200;
    }
    const activeFirePositions = fireSystem.activePositions;
    ambientAsh.update(delta, windSystem.state, activeFirePositions);
    ambientWildlife.update(delta, windSystem.state, activeFirePositions);
    truckEmergencyLights.update(delta, preparationSequence.isComplete);
    updateMovement(delta);
    gameStats.updateSurvivalTime(delta);
    recordCurrentStats();

    if (!introDialogue.isComplete) {
      hoseView.setWatering(false);
      hoseView.update(null);
      status.textContent = 'Hablá con la guía junto al camión';
    } else {
      preparationSequence.update(delta);

      if (!preparationSequence.isComplete) {
        hoseView.setWatering(false);
        hoseView.update(null);
        status.textContent =
          `Preparación: ${preparationSequence.currentTask?.label ?? 'completa'}`;
      } else {
        fireSystem.setWaveSpawningEnabled(false);
        fireSystem.setPropagationEnabled(true);
        const wave = fireSystem.update(delta, {
          playerPosition: camera.position,
          fireTruckPosition: FIRE_TRUCK_POSITION,
          housePosition,
          wind: windSystem.state,
        });
        if (wave) {
          waveNoticeMessage = `Nuevo foco detectado · Oleada ${wave.wave}`;
          waveNoticeUntil = performance.now() + 2600;
          truckEmergencyLights.triggerEmergencyFlash();
        }
        fireSystem.consumeExtinguishedSources().forEach((source) => {
          burnedGroundSystem.addExtinguishedFire(source);
        });
        vegetationStateSystem.update(delta, fireSystem.activePositions);
        burnedGroundSystem.update(delta);
        recordCurrentStats();
        dangerLevel = playerHealth.updateFromFirePositions(
          camera.position,
          fireSystem.activePositions,
          delta,
        );
        houseRisk.update(housePosition, fireSystem.activePositions, delta);
        recordCurrentStats();

        const missionUpdate = missionDirector.update(
          delta,
          {
            playerPosition: camera.position,
            fireTruckPosition: FIRE_TRUCK_POSITION,
            housePosition,
          },
          houseRisk.exposureRatio,
          vegetationStateSystem.affectedCount,
        );

        if (playerHealth.isDepleted) {
          endGame('player');
        } else if (houseRisk.isBurned) {
          house.ignite();
          endGame('house');
        } else if (missionUpdate.failure === 'forest') {
          endGame('forest');
        } else if (missionUpdate.victory) {
          endVictory();
        }

        if (!gameSession.isOver) {
          const nearestFire = fireSystem.getNearestActivePosition(camera.position, 4);
          const usingHose = keys.has('KeyE') && controls.isLocked;

          if (usingHose && nearestFire && !waterTank.isEmpty) {
            const activeTime = waterTank.consume(delta);
            extinguishing =
              activeTime > 0 &&
              fireSystem.extinguishNearest(
                camera.position,
                4,
                activeTime * EXTINGUISH_RATE_PER_SECOND,
              );
          }
          recordCurrentStats();

          hoseView.setWatering(extinguishing);
          hoseView.update(extinguishing ? nearestFire : null);

          if (performance.now() - equipmentReadyAt < 2500) {
            status.textContent = 'Equipo listo. Contené el incendio.';
          } else if (performance.now() - reloadedAt < 1500) {
            status.textContent = 'Agua recargada al 100%';
          } else if (usingHose && waterTank.isEmpty) {
            status.textContent = 'Sin agua · la manguera no puede apagar el fuego';
          } else if (extinguishing) {
            status.textContent = `Manguera activa · Focos: ${fireSystem.activeCount}`;
          } else if (usingHose) {
            status.textContent = `Acercate al fuego · Focos: ${fireSystem.activeCount}`;
          } else {
            status.textContent =
              `Incendio en expansión · Focos: ${fireSystem.activeCount} · ` +
              `Vegetación afectada: ${fireSystem.combustiblesIgnited}/` +
              `${fireSystem.combustibleCount}`;
          }
        }
      }
    }
  }

  if (gameSession.isOver) {
    hoseView.setWatering(false);
    hoseView.update(null);
  }

  audioManager.setTruckSiren(
    experienceStarted &&
      !cinematicActive &&
      !gameMenuOpen &&
      !missionDecisionOpen &&
      !gameSession.isOver &&
      introDialogue.isComplete &&
      !preparationSequence.isComplete,
  );
  if (
    experienceStarted &&
    !cinematicActive &&
    !gameMenuOpen &&
    !missionDecisionOpen &&
    !gameSession.isOver &&
    preparationSequence.isComplete
  ) {
    audioManager.updateFire(
      fireSystem.activeCount,
      getNearestFireDistance(),
      delta,
    );
  } else {
    audioManager.updateFire(0, Number.POSITIVE_INFINITY, delta);
  }
  audioManager.setWaterSpray(!gameSession.isOver && extinguishing);

  updateWaterHud();
  updateHealthHud(dangerLevel, delta);
  updateInteraction(isNearFireTruck());
  updateEnvironmentPanel();
  windHud.textContent = `Viento: ${windSystem.state.arrow} ${windSystem.state.name} · ${windSystem.strengthLabel}`;
  discoveriesHud.textContent = `Hallazgos: ${discoverableSystem.foundCount}/${discoverableSystem.totalCount} · B: bitácora`;
  missionHud.classList.toggle('hidden', !missionDirector.isActive);
  if (missionObjective) {
    missionObjective.textContent = missionDirector.routeLabel
      ? `${missionDirector.routeLabel} · ${missionDirector.objectiveText}`
      : missionDirector.objectiveText;
  }
  if (performance.now() < audioStatusUntil) {
    status.textContent = audioStatusMessage;
  } else if (performance.now() < waveNoticeUntil) {
    status.textContent = waveNoticeMessage;
  } else if (performance.now() < windNoticeUntil) {
    status.textContent = windNoticeMessage;
  } else if (missionDirector.statusMessage) {
    status.textContent = missionDirector.statusMessage;
  }
  renderer.render(scene, camera);
}

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();
