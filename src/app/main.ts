import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FireSystem } from '../game/fire/fire-system';
import { HoseView } from '../game/player/hose-view';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación.');
}

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
  <span data-metric="house">Riesgo para la casa: evaluando</span>
`;
app.appendChild(environmentPanel);

const interaction = document.createElement('aside');
interaction.className = 'interaction hidden';
interaction.textContent = 'Presioná E para usar la manguera';
app.appendChild(interaction);

controls.addEventListener('lock', () => {
  instructions.classList.add('hidden');
});

controls.addEventListener('unlock', () => {
  instructions.classList.remove('hidden');
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
  new THREE.PlaneGeometry(50, 50),
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

const hoseView = new HoseView(camera, scene);

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
    status.textContent = 'Incendio activo · Focos: 1';
  } catch (error) {
    status.textContent = 'Error al cargar un modelo del escenario';
    console.error('No se pudo cargar el entorno 3D.', error);
  }
}

void loadEnvironment();

function addHouse(): void {
  const house = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2.8, 4),
    new THREE.MeshStandardMaterial({ color: 0x9b7653, roughness: 0.9 }),
  );
  walls.position.y = 1.4;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 2.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x4b3832, roughness: 0.85 }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.9;
  roof.castShadow = true;
  house.add(roof);
  house.position.copy(housePosition);
  scene.add(house);
}

addHouse();

const expansionMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="expansion"]');
const vegetationMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="vegetation"]');
const houseMetric =
  environmentPanel.querySelector<HTMLElement>('[data-metric="house"]');

function updateEnvironmentPanel(): void {
  const affectedPercentage =
    fireSystem.combustibleCount === 0
      ? 0
      : Math.round(
          (fireSystem.combustiblesIgnited / fireSystem.combustibleCount) * 100,
        );
  const nearestHouseDistance = fireSystem.activePositions.reduce(
    (nearest, position) =>
      Math.min(nearest, position.distanceTo(housePosition)),
    Number.POSITIVE_INFINITY,
  );
  const houseRisk =
    nearestHouseDistance <= 7
      ? 'Alto'
      : nearestHouseDistance <= 14
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
    houseMetric.textContent = `Riesgo para la casa: ${houseRisk}`;
    houseMetric.dataset.risk = houseRisk.toLowerCase();
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

window.addEventListener('keydown', (event) => {
  keys.add(event.code);

  if (event.code === 'KeyE' && controls.isLocked) {
    hoseView.setWatering(true);
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  if (event.code === 'KeyE') {
    hoseView.setWatering(false);
  }
});

renderer.domElement.addEventListener('click', () => {
  controls.lock();
});

function updateMovement(delta: number): void {
  if (!controls.isLocked) {
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

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -23, 23);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -23, 23);
  camera.position.y = 1.7;
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  updateMovement(delta);
  fireSystem.update(delta);
  const nearestFire = fireSystem.getNearestActivePosition(camera.position, 4);
  hoseView.update(nearestFire);

  if (keys.has('KeyE') && controls.isLocked) {
    const extinguished = fireSystem.extinguishNearest(
      camera.position,
      4,
      delta * 0.9,
    );
    status.textContent = extinguished
      ? `Manguera activa · Focos: ${fireSystem.activeCount}`
      : `Acercate al fuego · Focos: ${fireSystem.activeCount}`;
  } else {
    status.textContent =
      `Incendio en expansión · Focos: ${fireSystem.activeCount} · ` +
      `Vegetación afectada: ${fireSystem.combustiblesIgnited}/` +
      `${fireSystem.combustibleCount}`;
  }

  interaction.classList.toggle(
    'hidden',
    !controls.isLocked || fireSystem.activeCount === 0,
  );
  updateEnvironmentPanel();
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
