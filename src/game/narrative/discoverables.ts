import * as THREE from 'three';

export const DISCOVERABLE_INTERACTION_RADIUS = 2.25;

export interface DiscoverableDefinition {
  id: 'prevention' | 'preparation' | 'fauna' | 'soil' | 'community';
  title: string;
  text: string;
  position: THREE.Vector3;
  kind: 'sign' | 'backpack' | 'fauna' | 'burned-tree' | 'lookout';
}

/** Textos y posiciones editables de los hallazgos opcionales. */
export const DISCOVERABLES: readonly DiscoverableDefinition[] = [
  {
    id: 'prevention',
    title: 'Prevención',
    text: 'Una chispa puede iniciar un incendio en vegetación seca. Evitar quemas, no arrojar colillas y respetar las indicaciones locales reduce riesgos.',
    position: new THREE.Vector3(-10.5, 0, 16.5),
    kind: 'sign',
  },
  {
    id: 'preparation',
    title: 'Preparación',
    text: 'Ante una emergencia, la información clara y la comunicación temprana ayudan a coordinar una respuesta segura.',
    position: new THREE.Vector3(-2, 0, 7),
    kind: 'backpack',
  },
  {
    id: 'fauna',
    title: 'Fauna',
    text: 'El fuego destruye refugios, alimento y rutas de desplazamiento de muchas especies. El impacto continúa cuando las llamas se apagan.',
    position: new THREE.Vector3(-17, 0, -9),
    kind: 'fauna',
  },
  {
    id: 'soil',
    title: 'Suelo',
    text: 'La vegetación y el suelo pueden tardar años en recuperarse. Las zonas quemadas quedan más expuestas a erosión y pérdida de biodiversidad.',
    position: new THREE.Vector3(-5, 0, -5),
    kind: 'burned-tree',
  },
  {
    id: 'community',
    title: 'Comunidad',
    text: 'La prevención es colectiva. Ante un incendio real, alejate de la zona, avisá a los servicios de emergencia y seguí las indicaciones de las autoridades.',
    position: new THREE.Vector3(15, 0, 14),
    kind: 'lookout',
  },
];

interface DiscoverableEntry {
  definition: DiscoverableDefinition;
  object: THREE.Group;
  marker: THREE.Mesh;
  found: boolean;
}

function material(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
}

function createVisual(definition: DiscoverableDefinition): { object: THREE.Group; marker: THREE.Mesh } {
  const object = new THREE.Group();
  const wood = material(0x6d4c31);
  const fabric = material(0x6b7d55);
  const ash = material(0x332d27);
  const brass = material(0xc79a45);

  if (definition.kind === 'sign') {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), wood);
    post.position.y = 0.6;
    object.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.08), material(0xc8a75c));
    board.position.y = 1.22;
    object.add(board);
  } else if (definition.kind === 'backpack') {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.64, 0.32), fabric);
    bag.position.y = 0.36;
    object.add(bag);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.54, 12), material(0xb69c6c));
    roll.position.set(0, 0.76, 0);
    roll.rotation.z = Math.PI / 2;
    object.add(roll);
  } else if (definition.kind === 'fauna') {
    [-0.28, 0, 0.28].forEach((x, index) => {
      const print = new THREE.Mesh(new THREE.CircleGeometry(index === 1 ? 0.16 : 0.12, 12), ash);
      print.rotation.x = -Math.PI / 2;
      print.position.set(x, 0.035, index % 2 === 0 ? 0.12 : -0.08);
      object.add(print);
    });
  } else if (definition.kind === 'burned-tree') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.27, 2.1, 10), ash);
    trunk.position.y = 1.05;
    trunk.rotation.z = -0.14;
    object.add(trunk);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 8), ash);
    branch.position.set(0.2, 1.65, 0);
    branch.rotation.z = Math.PI / 2.7;
    object.add(branch);
  } else {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.22, 12), wood);
    base.position.y = 0.11;
    object.add(base);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 12), brass);
    scope.position.y = 1.02;
    scope.rotation.z = Math.PI / 2;
    object.add(scope);
  }

  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.045, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x8ed1c0, emissive: 0x1c6a58, emissiveIntensity: 0.7 }),
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = definition.kind === 'fauna' ? 0.06 : 0.14;
  object.add(marker);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return { object, marker };
}

/** Objetos educativos opcionales y su estado de descubrimiento. */
export class DiscoverableSystem {
  readonly object = new THREE.Group();
  private readonly entries: DiscoverableEntry[];
  private elapsed = 0;

  constructor(getTerrainHeight: (x: number, z: number) => number) {
    this.entries = DISCOVERABLES.map((definition) => {
      const visual = createVisual(definition);
      visual.object.position.set(
        definition.position.x,
        getTerrainHeight(definition.position.x, definition.position.z),
        definition.position.z,
      );
      this.object.add(visual.object);
      return { definition, ...visual, found: false };
    });
  }

  get foundCount(): number { return this.entries.filter((entry) => entry.found).length; }
  get totalCount(): number { return this.entries.length; }
  get discovered(): readonly DiscoverableDefinition[] {
    return this.entries.filter((entry) => entry.found).map((entry) => entry.definition);
  }

  findNearby(position: THREE.Vector3): DiscoverableDefinition | null {
    const entry = this.entries
      .filter((candidate) => !candidate.found)
      .sort((first, second) =>
        position.distanceTo(first.object.position) - position.distanceTo(second.object.position),
      )
      .find((candidate) => position.distanceTo(candidate.object.position) <= DISCOVERABLE_INTERACTION_RADIUS);
    return entry?.definition ?? null;
  }

  discover(id: DiscoverableDefinition['id']): DiscoverableDefinition | null {
    const entry = this.entries.find((candidate) => candidate.definition.id === id && !candidate.found);
    if (!entry) return null;
    entry.found = true;
    entry.marker.visible = false;
    return entry.definition;
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.entries.filter((entry) => !entry.found).forEach((entry, index) => {
      entry.marker.rotation.z += delta * 0.8;
      entry.marker.position.y = (entry.definition.kind === 'fauna' ? 0.06 : 0.14) + Math.sin(this.elapsed * 2 + index) * 0.025;
    });
  }
}
