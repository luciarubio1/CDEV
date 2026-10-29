import { Vector3 } from 'three';
import { NPC_MOVEMENT } from './npc-movement';

export const INVESTIGATION_SETTINGS = { speed: NPC_MOVEMENT.companionSpeed, followRadius: NPC_MOVEMENT.stopDistance, interactionRadius: 2.4, inspectionSeconds: 1.5, closingSeconds: 10 };
/** X, height above terrain, Z. Adjacent endpoints are shared for smooth shots. */
export const INVESTIGATION_CLOSING_SHOTS = {
  positions: [[-7, 3.8, 18], [-7, 2.3, 11.5], [1, 5, 16], [3, 5.5, 14]],
  targets: [[-12, 1, 14], [-10.6, 0.95, 8.5], [10, 1, 10], [10, 1, 5]],
} as const;
const sources = [
  { title: 'SINAGIR · Incendio forestal', url: 'https://www.argentina.gob.ar/sinagir/incendio-forestal' },
  { title: 'SNMF · Prevención de incendios forestales', url: 'https://www.argentina.gob.ar/servicio-nacional-de-manejo-del-fuego/recomendaciones-para-prevenir-incendios-forestales' },
];
export const INVESTIGATION_STATIONS = [
  {
    id: 'investigation-drought', title: 'Sequía y vegetación seca', position: new Vector3(-12, 0, 7.4),
    text: 'Condición de propagación: la falta de lluvias seca la vegetación y facilita que el fuego se extienda. La sequía no enciende por sí sola un incendio. Este sector no permite identificar su origen.',
    question: '¿Qué nos indica este sector?',
    options: ['Condiciones que pueden favorecer la propagación', 'La causa confirmada del incendio'],
    feedback: 'La vegetación seca favorece la propagación. Identificar una causa requiere investigar una fuente de ignición y otras evidencias.', sources,
    route: [new Vector3(-12, 0, 10.8), new Vector3(-12.8, 0, 9.5), new Vector3(-13.2, 0, 7.5)],
  },
  {
    id: 'investigation-embers', title: 'Restos de un asado', position: new Vector3(-8.8, 0, 7),
    text: 'Posible fuente de ignición: las brasas que conservan calor pueden encender vegetación seca. Aquí solo observamos restos fríos. No prueban quién inició el incendio ni confirman su causa.',
    question: '¿Qué encontramos acá?',
    options: ['Una posible fuente de ignición', 'Una prueba definitiva de quién inició el incendio'],
    feedback: 'Son un indicio de una posible fuente de ignición; no una prueba definitiva de responsabilidad ni de origen.', sources,
    route: [new Vector3(-13.2, 0, 7.5), new Vector3(-11.5, 0, 6.8), new Vector3(-9.6, 0, 6.8)],
  },
  {
    id: 'investigation-cigarette', title: 'Una colilla junto al sendero', position: new Vector3(-6.6, 0, 7.6),
    text: 'Posible fuente de ignición: una colilla encendida puede iniciar un foco si las condiciones lo permiten. No todas provocan incendios. Esta colilla está apagada; encontrarla no confirma que haya iniciado este fuego.',
    question: '¿Qué podemos concluir?',
    options: ['Es otro posible origen que debe investigarse', 'Todos los elementos encontrados iniciaron el mismo incendio'],
    feedback: 'Es otro posible origen que debe investigarse. Encontrar varios indicios no demuestra que todos hayan iniciado el mismo incendio.', sources,
    route: [new Vector3(-9.6, 0, 6.8), new Vector3(-7.8, 0, 6.8), new Vector3(-6, 0, 7)],
  },
] as const;
export const INVESTIGATION_RETURN_ROUTE = [new Vector3(-6, 0, 7), new Vector3(-6, 0, 9), new Vector3(-7.5, 0, 10.8)];

/** Independent of the five optional discoveries; answers are descriptive, never a gate. */
export class InvestigationProgress {
  readonly answers: { station: string; answer: string; distinguishesIgnition: boolean }[] = [];
  get count(): number { return this.answers.length; }
  answer(index: number, option: number): boolean {
    if (index !== this.count || index >= INVESTIGATION_STATIONS.length || (option !== 0 && option !== 1)) return false;
    const station = INVESTIGATION_STATIONS[index];
    this.answers.push({ station: station.title, answer: station.options[option], distinguishesIgnition: option === 0 });
    return true;
  }
}
