import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type ModelName = 'Camión' | 'Bosque' | 'Zorro' | 'Conejo' | 'Pueblo';

const modelUrls = import.meta.glob('../assets/new-models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const models: Record<ModelName, { file: string; url: string }> = {
  Camión: { file: 'fire-truck.glb', url: modelUrls['../assets/new-models/fire-truck.glb'] },
  Bosque: { file: 'forest.glb', url: modelUrls['../assets/new-models/forest.glb'] },
  Zorro: { file: 'fox.glb', url: modelUrls['../assets/new-models/fox.glb'] },
  Conejo: { file: 'rabbit.glb', url: modelUrls['../assets/new-models/rabbit.glb'] },
  Pueblo: { file: 'village.glb', url: modelUrls['../assets/new-models/village.glb'] },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5a58d);
scene.add(new THREE.HemisphereLight(0xe2c9a5, 0x56605a, 1.6));
const key = new THREE.DirectionalLight(0xffe1b3, 2.4);
key.position.set(-8, 14, 8);
scene.add(key);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x807756, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(7, 5, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const loader = new GLTFLoader();
const mixers: THREE.AnimationMixer[] = [];
const clips: THREE.AnimationClip[] = [];
let current: THREE.Group | null = null;
let currentName: ModelName = 'Camión';
let animationEnabled = false;
let generation = 0;

function prepareModel(model: THREE.Group): THREE.Group {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const targetSize = currentName === 'Pueblo' || currentName === 'Bosque' ? 8 : 3;
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(targetSize / largest);
  model.position.set(-center.x * model.scale.x, -box.min.y * model.scale.y, -center.z * model.scale.z);
  return model;
}

function updateCamera(): void {
  const target = currentName === 'Pueblo' || currentName === 'Bosque'
    ? new THREE.Vector3(0, 1.8, 0)
    : new THREE.Vector3(0, 1, 0);
  controls.target.copy(target);
  camera.position.set(currentName === 'Pueblo' ? 10 : 7, currentName === 'Pueblo' ? 6 : 4.5, currentName === 'Pueblo' ? 12 : 8);
  controls.update();
}

async function showModel(name: ModelName): Promise<void> {
  currentName = name;
  const request = ++generation;
  const status = document.querySelector<HTMLElement>('#model-status')!;
  status.textContent = `Cargando ${name.toLowerCase()}...`;
  const loaded = await loader.loadAsync(models[name].url);
  if (request !== generation) return;
  mixers.splice(0).forEach((mixer) => mixer.stopAllAction());
  clips.splice(0);
  if (current) scene.remove(current);
  current = prepareModel(loaded.scene);
  scene.add(current);
  if (loaded.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(current);
    mixers.push(mixer);
    clips.push(loaded.animations[0]);
    if (animationEnabled) mixer.clipAction(clips[0]).play();
    status.textContent = `${name} · ${loaded.animations.length} animación(es)`;
  } else {
    status.textContent = `${name} · sin animaciones`;
  }
  updateCamera();
  document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach((button) => {
    button.classList.toggle('active', button.dataset.model === name);
  });
}

const buttons = document.querySelector<HTMLElement>('#model-buttons')!;
(Object.keys(models) as ModelName[]).forEach((name) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.model = name;
  button.textContent = name;
  button.addEventListener('click', () => void showModel(name));
  buttons.append(button);
});

document.querySelector<HTMLButtonElement>('#animation-toggle')!.addEventListener('click', () => {
  animationEnabled = !animationEnabled;
  const button = document.querySelector<HTMLButtonElement>('#animation-toggle')!;
  button.textContent = animationEnabled ? 'Pausar animación' : 'Reproducir animación';
  mixers.forEach((mixer) => {
    if (animationEnabled && clips[0]) mixer.clipAction(clips[0]).play();
    else mixer.stopAllAction();
  });
});

void showModel(currentName);
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  mixers.forEach((mixer) => { if (animationEnabled) mixer.update(delta); });
  controls.update();
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
