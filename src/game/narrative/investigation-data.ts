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
    text: 'El pasto seco que se ve acá funciona como combustible y puede ayudar a que el fuego se extienda. No alcanza, por sí solo, para decir qué lo inició.',
    question: '¿Qué distingue mejor este pasto seco?',
    options: ['Favorece la propagación; no identifica la ignición', 'Es la causa confirmada del incendio'],
    feedback: 'La vegetación seca favorece la propagación. Para hablar de ignición hacen falta una fuente y más evidencias.',
    feedbackByOption: ['Exacto: el pasto seco que vemos puede ayudar a extender las llamas, pero no las enciende por sí solo.', 'El pasto seco está a la vista, pero describe una condición de propagación; no prueba cuál fue la chispa inicial.'], sources,
    route: [new Vector3(-12, 0, 10.8), new Vector3(-12.8, 0, 9.5), new Vector3(-13.2, 0, 7.5)],
  },
  {
    id: 'investigation-embers', title: 'Restos de un asado', position: new Vector3(-8.8, 0, 7),
    text: 'Vemos ceniza y carbón fríos en un fogón. Si antes hubiera quedado calor, una brasa podría encender vegetación seca; lo observado ahora no confirma que lo hubiera.',
    question: '¿Qué dato faltaría para evaluar una posible fuente de ignición?',
    options: ['Saber si quedaron brasas o calor antes de encontrarlo frío', 'Dar por hecho que estos restos fríos iniciaron el incendio'],
    feedback: 'Los restos fríos no alcanzan para atribuir un origen. La presencia previa de calor o brasas sería un dato a investigar.',
    feedbackByOption: ['Sí: habría que saber si quedaron brasas o calor antes. Lo que vemos ahora es un fogón frío.', 'El fogón frío es una observación, no una prueba. Haría falta investigar si antes quedaron brasas o calor.'], sources,
    route: [new Vector3(-13.2, 0, 7.5), new Vector3(-11.5, 0, 6.8), new Vector3(-9.6, 0, 6.8)],
  },
  {
    id: 'investigation-match', title: 'Un fósforo junto al sendero', position: new Vector3(-6.6, 0, 7.6),
    text: 'El fósforo está apagado al encontrarlo. Un fósforo encendido puede iniciar un foco en condiciones favorables, pero este objeto no alcanza para explicar el origen del incendio.',
    question: '¿Qué separa la observación de una hipótesis?',
    options: ['Observamos un fósforo apagado; su vínculo con el origen debe investigarse', 'El fósforo demuestra que inició este incendio'],
    feedback: 'La medida preventiva es concreta: apagá por completo los fósforos y no los arrojes en zonas rurales o protegidas.',
    feedbackByOption: ['Bien: observamos un fósforo apagado y cualquier relación con el origen sigue siendo una hipótesis. Nunca arrojes fósforos encendidos.', 'El fósforo observado no demuestra el origen. Como prevención, apagá por completo los fósforos antes de desecharlos.'], sources,
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
