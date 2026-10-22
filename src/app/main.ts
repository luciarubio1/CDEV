import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioManager } from '../audio/audio-manager';
import { FireSystem } from '../game/fire/fire-system';
import { GameSession, type DefeatReason } from '../game/game-session';
import { IntroDialogue } from '../game/narrative/intro-dialogue';
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
  FIRE_TRUCK_POSITION,
  FIRE_TRUCK_RELOAD_RADIUS,
} from '../game/world/fire-truck';
import { House } from '../game/world/house';
import { HouseRisk } from '../game/world/house-risk';
import { MainMenu } from '../ui/menus/main-menu';
import './styles.css';

const MAP_HALF_SIZE = 25;
const PLAYER_MAP_MARGIN = 1;
const EXTINGUISH_RATE_PER_SECOND = 0.9;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación.');
}

const gameSession = new GameSession();
const introDialogue = new IntroDialogue();
const audioManager = new AudioManager();
let experienceSelected = false;
let experienceStarted = false;
let gameMenuOpen = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb3c7cf);
scene.fog = new THREE.Fog(0xb3c7cf, 28, 75);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.7, 7);

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
  <span data-metric="vegetation">Vegetación afectada: 0%</span>
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
  <div class="defeat-card">
    <strong>Fin de la experiencia</strong>
    <h1></h1>
    <button type="button">Reiniciar experiencia</button>
  </div>
`;
app.appendChild(defeatOverlay);

const defeatMessage = defeatOverlay.querySelector<HTMLHeadingElement>('h1');
const restartButton = defeatOverlay.querySelector<HTMLButtonElement>('button');
restartButton?.addEventListener('click', () => window.location.reload());

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
  instructions.classList.remove('hidden');
  status.textContent = 'Hacé clic sobre la escena para comenzar';
}

function openGameMenu(): void {
  if (!experienceStarted || gameSession.isOver) {
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
    !introDialogue.isOpen
  ) {
    instructions.classList.remove('hidden');
  }
});

const ambientLight = new THREE.HemisphereLight(0xd8ecff, 0x46513f, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff4df, 3);
directionalLight.position.set(-8, 14, 6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2),
  new THREE.MeshStandardMaterial({
    color: 0x53684a,
    roughness: 0.95,
    metalness: 0,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const fireSystem = new FireSystem();
fireSystem.addSource({
  position: new THREE.Vector3(0, 0, 0),
  intensity: 1,
});
fireSystem.addSource({
  position: new THREE.Vector3(8, 0, 8),
  intensity: 0.7,
});
fireSystem.trackCombustible({
  position: new THREE.Vector3(-5, 0, -3),
  ignitionDistance: 7,
  ignitionTime: 10,
});
fireSystem.trackCombustible({
  position: new THREE.Vector3(5, 0, -4),
  ignitionDistance: 8,
  ignitionTime: 14,
});
fireSystem.trackCombustible({
  position: new THREE.Vector3(-6, 0, 4),
  ignitionDistance: 8,
  ignitionTime: 16,
});
fireSystem.trackCombustible({
  position: new THREE.Vector3(6, 0, 5),
  ignitionDistance: 9,
  ignitionTime: 20,
});
scene.add(fireSystem.object);
const housePosition = new THREE.Vector3(10, 0, 10);
const house = new House(housePosition);
const houseRisk = new HouseRisk();
scene.add(house.object);

const hoseView = new HoseView(camera, scene);
const waterTank = new WaterTank();
const playerHealth = new PlayerHealth();
scene.add(createFireTruck());
const preparationSequence = new PreparationSequence();
preparationSequence.setAvailable(false);
scene.add(preparationSequence.object);
scene.add(createGuideNpc());

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
): Promise<void> {
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
}

async function loadEnvironment(): Promise<void> {
  const assets: Promise<void>[] = [];
  const vegetation = [
    [-10, -11], [-5, -14], [4, -13], [12, -10],
    [-14, -5], [-8, -7], [8, -6], [15, -2],
    [-16, 3], [-10, 6], [10, 5], [16, 7],
    [-13, 13], [-4, 11], [5, 13], [13, 14],
  ];

  vegetation.forEach(([x, z], index) => {
    const height = 5.5 + (index % 4) * 0.8;
    assets.push(
      loadModel(
        'TreeHigh001.glb',
        new THREE.Vector3(x, 0, z),
        height,
        index * 0.73,
      ),
    );
    fireSystem.trackCombustible({
      position: new THREE.Vector3(x, 0, z),
      ignitionDistance: 5.5,
      ignitionTime: 10 + (index % 4) * 3,
    });
  });

  [
    [-7, -3, 1.2], [3, -5, 0.9], [11, 2, 1.1],
    [-4, 8, 1.3], [4, 9, 0.8], [14, -8, 1],
  ].forEach(([x, z, scale], index) => {
    assets.push(
      loadModel(
        'Rock001.glb',
        new THREE.Vector3(x, 0, z),
        scale,
        index * 1.1,
      ),
    );
  });

  [
    [-12, -1], [0, -9], [7, -11], [-15, 9], [1, 15], [12, 11],
  ].forEach(([x, z], index) => {
    assets.push(
      loadModel(
        'Bush001 (1).glb',
        new THREE.Vector3(x, 0, z),
        1.1 + (index % 3) * 0.2,
        index * 0.8,
      ),
    );
  });

  for (let index = 0; index < 8; index += 1) {
    assets.push(
      loadModel(
        'Grass001.glb',
        new THREE.Vector3(-17 + index * 4.5, 0, 17 - (index % 3) * 2),
        0.7 + (index % 2) * 0.15,
        index * 0.5,
      ),
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
  const affectedPercentage =
    fireSystem.combustibleCount === 0
      ? 0
      : Math.round(
          (fireSystem.combustiblesIgnited / fireSystem.combustibleCount) * 100,
        );
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
      `Vegetación afectada: ${affectedPercentage}%`;
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

const marker = new THREE.Mesh(
  new THREE.ConeGeometry(0.6, 1.4, 16),
  new THREE.MeshStandardMaterial({ color: 0xe85d04 }),
);
marker.position.set(0, 0.7, 0);
marker.visible = false;
scene.add(marker);

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

function endGame(reason: DefeatReason): void {
  gameSession.end(reason);
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
  defeatOverlay.classList.add('visible');
}

function updateInteraction(nearFireTruck: boolean): void {
  if (!controls.isLocked || gameMenuOpen || gameSession.isOver) {
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

  if (nearFireTruck) {
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

  if (event.code === 'KeyM') {
    event.preventDefault();
    showAudioStatus(audioManager.toggleMuted());
    return;
  }

  if (gameSession.isOver) {
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
  if (experienceSelected && !gameMenuOpen && !gameSession.isOver) {
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
  if (!controls.isLocked || gameMenuOpen || gameSession.isOver) {
    return;
  }

  direction.z = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  direction.x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  direction.normalize();

  const speed = 4;
  movement.x = direction.x * speed * delta;
  movement.z = direction.z * speed * delta;
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
  camera.position.y = 1.7;
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  let extinguishing = false;
  let dangerLevel = 0;

  if (experienceStarted && !gameMenuOpen && !gameSession.isOver) {
    updateMovement(delta);

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
        fireSystem.update(delta);
        dangerLevel = playerHealth.updateFromFirePositions(
          camera.position,
          fireSystem.activePositions,
          delta,
        );
        houseRisk.update(housePosition, fireSystem.activePositions, delta);

        if (playerHealth.isDepleted) {
          endGame('player');
        } else if (houseRisk.isBurned) {
          house.ignite();
          endGame('house');
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
      !gameMenuOpen &&
      !gameSession.isOver &&
      !preparationSequence.isComplete,
  );
  if (
    experienceStarted &&
    !gameMenuOpen &&
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
  if (performance.now() < audioStatusUntil) {
    status.textContent = audioStatusMessage;
  }
  marker.rotation.y += delta * 0.8;
  renderer.render(scene, camera);
}

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();
