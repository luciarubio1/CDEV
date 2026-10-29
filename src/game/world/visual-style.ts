import * as THREE from 'three';

/** Shared low-poly palette; no materials or textures are rebuilt during animation. */
export const VISUAL_PALETTE = {
  orange: 0xe87832, red: 0xc34b3f, navy: 0x354751, rubber: 0x293439,
  silver: 0xb5c4c5, glass: 0x315e76, reflector: 0xe6df9a,
  skin: 0xbd8c6b, helmet: 0xe9bd58, health: 0xe6e6d5, fauna: 0x76958a,
} as const;
const materials = new Map<string, THREE.MeshStandardMaterial>();
export function visualMaterial(color: number, metalness = 0, roughness = .8): THREE.MeshStandardMaterial {
  const key = `${color}/${metalness}/${roughness}`;
  let material = materials.get(key);
  if (!material) { material = new THREE.MeshStandardMaterial({ color, metalness, roughness, flatShading: true }); materials.set(key, material); }
  return material;
}
export const SHARED_GEOMETRY = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
};
export function visualBox(parent: THREE.Object3D, name: string, size: readonly number[], position: readonly number[], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(SHARED_GEOMETRY.box, material);
  mesh.name = name; mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
const labels = new Map<string, THREE.MeshBasicMaterial>();
/** Local canvas lettering, without emblems or external assets. Front is local +Z. */
export function createLabel(text: string, width: number, height: number): THREE.Mesh {
  let material = labels.get(text);
  if (!material) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear la identificación del equipo.');
    context.fillStyle = '#24383d'; context.fillRect(0, 0, 512, 128);
    context.font = 'bold 70px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#f4f0d9';
    context.fillText?.(text, 256, 68, 490);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshBasicMaterial({ map: texture }); labels.set(text, material);
  }
  const mesh = new THREE.Mesh(SHARED_GEOMETRY.box, material);
  mesh.name = `label-${text}`; mesh.scale.set(width, height, .008); return mesh;
}
