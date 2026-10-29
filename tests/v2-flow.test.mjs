import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';

// Ejecuta los módulos reales de TypeScript sin sumar dependencias ni generar archivos.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    };
    return next(url, context);
  },
});

// Solo se sustituye el canvas de texturas; fuego, misión, cámara y escena son reales.
globalThis.document = {
  createElement: () => ({ width: 128, height: 128, getContext: () => ({
    createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
  }) }),
};

const { FireSystem } = await import('../src/game/fire/fire-system.ts');
const { MissionDirector } = await import('../src/game/narrative/mission-director.ts');
const { GameSession } = await import('../src/game/game-session.ts');
const { PlayerHealth } = await import('../src/game/player/player-health.ts');
const { HouseRisk, HOUSE_EXPOSURE_TO_IGNITE } = await import('../src/game/world/house-risk.ts');
const { ReinforcementSequence, REINFORCEMENT_TIMING } = await import('../src/game/narrative/reinforcement-sequence.ts');
const { ReinforcementView, REINFORCEMENT_LAYOUT, isReinforcementArea } = await import('../src/game/world/reinforcement-view.ts');
const { CollisionSystem } = await import('../src/game/world/collision-system.ts');
const { BurnedGroundSystem } = await import('../src/game/world/burned-ground.ts');
const { GAME_BALANCE } = await import('../src/game/balance-config.ts');
const { WaterTank } = await import('../src/game/player/water-tank.ts');
const { PostFireProgression } = await import('../src/game/narrative/post-fire-progression.ts');
const { CareSequence } = await import('../src/game/narrative/care-sequence.ts');
const { AssistanceView, ASSISTANCE_LAYOUT } = await import('../src/game/world/assistance-view.ts');
const { AssistanceScene } = await import('../src/game/narrative/assistance-scene.ts');
const { FaunaTour } = await import('../src/game/narrative/fauna-tour.ts');
const { FAUNA_CONFIG, isFaunaArea } = await import('../src/game/narrative/fauna-config.ts');
const { WaypointWalker } = await import('../src/game/narrative/waypoint-walker.ts');
const { RESCUE_CONFIG } = await import('../src/game/narrative/wildlife-rescue-config.ts');
const { CarrierCarryView } = await import('../src/game/player/carrier-carry-view.ts');
const { createAnimalCarrier, CARRIER_SIZE } = await import('../src/game/world/animal-carrier.ts');
const { FOX_NOTE, OTHER_FAUNA_NOTES, FAUNA_SOURCES } = await import('../src/game/narrative/fauna-education.ts');
const { Bitacora } = await import('../src/ui/bitacora.ts');
const { getTerrainHeight } = await import('../src/game/world/terrain.ts');

const context = { playerPosition: new THREE.Vector3(), fireTruckPosition: new THREE.Vector3(-16, 0, 16), housePosition: new THREE.Vector3(10, 0, 10) };
const terrain = (x, z) => Math.sin(x) * 0.1 + Math.cos(z) * 0.2;

test('recorrido único: acceso → radio → vivienda → bosque; no hay incidentes futuros ni espera final', () => {
  const fire = new FireSystem();
  const director = new MissionDirector(fire, context.fireTruckPosition, () => 0);
  director.startAfterPreparation();
  assert.equal(director.currentStage, 'access');
  assert.equal(fire.count, 1);
  fire.extinguishNearest(new THREE.Vector3(-7, 0, -9), 1, 10);
  director.update(0.1, context, 0);
  assert.equal(director.currentStage, 'radio');
  assert.equal(fire.activeCount, 0);
  assert.equal(director.requestReinforcements(new THREE.Vector3()), false);
  assert.equal(director.requestReinforcements(director.radioPosition), true);
  assert.equal(director.currentStage, 'house');
  assert.equal(fire.count, 2);
  assert.match(director.getNavigationTarget(context.playerPosition, context.housePosition).label, /vivienda/);
  fire.extinguishNearest(new THREE.Vector3(5.5, 0, 8), 1, 10);
  director.update(0.1, context, 0.2);
  assert.equal(director.currentStage, 'forest');
  assert.equal(fire.count, 4);
  assert.match(director.getNavigationTarget(context.playerPosition, context.housePosition).label, /bosque/);
  assert.equal(director.update(200, context, 0).failure, null);
  fire.extinguishNearest(new THREE.Vector3(-13, 0, -10), 1, 10);
  fire.extinguishNearest(new THREE.Vector3(-10, 0, -13), 1, 10);
  assert.equal(director.update(0.1, context, 0).victory, true);
  assert.equal(director.update(0.1, context, 0).victory, false);
  assert.equal(fire.extinguishedCount, 4);
});

test('llegada completa y omitida producen el mismo estado visual, cámara y focos', () => {
  function run(skip) {
    const sequence = new ReinforcementSequence();
    const view = new ReinforcementView(terrain);
    const camera = new THREE.PerspectiveCamera();
    const fire = new FireSystem();
    const ground = new BurnedGroundSystem(terrain);
    const source = fire.addSource({ position: new THREE.Vector3(), intensity: 1.2 });
    let marked = 0;
    const contain = (delta) => {
      fire.containByReinforcements(GAME_BALANCE.reinforcements.visualExtinguishPerSecond * delta);
      fire.update(delta, context);
      fire.consumeExtinguishedSources().forEach((entry) => { marked++; ground.addExtinguishedFire(entry); });
      ground.update(delta);
    };
    fire.setPropagationEnabled(false);
    sequence.start();
    assert.equal(sequence.frame.crewVisible, false);
    if (!skip) {
      for (let i = 0; i < REINFORCEMENT_TIMING.duration * 60; i++) {
        const frame = sequence.update(1 / 60);
        view.render(frame);
        view.setCamera(camera);
        sequence.advanceContainment(contain);
      }
    }
    const final = sequence.finish();
    view.render(final);
    view.restorePlayer(camera);
    sequence.advanceContainment(contain);
    assert.equal(fire.extinguishedCount, 0);
    assert.equal(fire.activeCount, 0);
    assert.equal(marked, 1);
    assert.equal(fire.consumeExtinguishedSources().length, 0);
    assert.equal(view.companion.visible, true);
    assert.equal(view.sectorCrew.visible, true);
    return {
      final, area: ground.affectedSurfaceArea, duration: source.activeDuration,
      ground: ground.object.children.map((child) => ({ position: child.position.toArray(), opacity: child.material.opacity, vertices: Array.from(child.geometry.attributes.position.array) })),
      truck: view.truck.position.toArray(), companion: view.companion.position.toArray(),
      crew: view.sectorCrew.position.toArray(), camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
    };
  }
  assert.deepEqual(run(false), run(true));
});

test('la llegada mueve camión y equipo por etapas; recrear la escena limpia el apoyo', () => {
  const sequence = new ReinforcementSequence();
  const view = new ReinforcementView(terrain);
  assert.equal(view.object.visible, false);
  sequence.start();
  view.render(sequence.update(3));
  assert.ok(view.truck.position.x < REINFORCEMENT_LAYOUT.truckStart.x);
  assert.ok(view.truck.position.x > REINFORCEMENT_LAYOUT.truckStop.x);
  assert.equal(view.companion.visible, false);
  view.render(sequence.update(5));
  assert.equal(view.truck.position.x, REINFORCEMENT_LAYOUT.truckStop.x);
  assert.equal(view.companion.visible, true);
  const doorPosition = view.companion.position.clone();
  view.render(sequence.update(3));
  assert.ok(view.companion.position.distanceTo(doorPosition) > 0.5);
  sequence.finish();
  sequence.start();
  assert.equal(sequence.frame.elapsed, 0);
  assert.equal(sequence.frame.crewVisible, false);
  assert.equal(sequence.frame.complete, false);
  assert.equal(new ReinforcementView(terrain).object.visible, false);
  assert.equal(new GameSession().currentPhase, 'mission');
});

test('cierre de intervención no finaliza experiencia; las derrotas solo se aceptan durante combate', () => {
  for (const reason of ['player', 'house']) {
    const lost = new GameSession();
    lost.end(reason);
    assert.equal(lost.isOver, true);
    assert.equal(lost.defeatReason, reason);
  }
  const session = new GameSession();
  session.beginContainment();
  assert.equal(session.interventionClosed, true);
  assert.equal(session.isOver, false);
  session.end('player');
  assert.equal(session.isContainment, true);
  session.beginCompanionDialogue();
  assert.equal(session.isCompanionDialogue, true);
  session.beginEpilogue();
  assert.equal(session.isEpilogue, true);
  assert.equal(session.isOver, false);
  session.end('house');
  assert.equal(session.isOver, false);
});

test('salud y casa siguen permitiendo derrotas durante combate', () => {
  const health = new PlayerHealth();
  health.updateFromFirePositions(new THREE.Vector3(), [new THREE.Vector3()], 30);
  assert.equal(health.isDepleted, true);
  const house = new HouseRisk();
  house.update(context.housePosition, [context.housePosition], HOUSE_EXPOSURE_TO_IGNITE - 1);
  assert.equal(house.isBurned, false);
  house.update(context.housePosition, [context.housePosition], 1);
  assert.equal(house.isBurned, true);
});

test('regreso transitable, sin superposición con camiones y con compañero alcanzable', () => {
  const view = new ReinforcementView(terrain);
  const sequence = new ReinforcementSequence();
  view.render(sequence.finish());
  const collision = new CollisionSystem();
  collision.addCircle(context.fireTruckPosition, 2);
  collision.addCircle(REINFORCEMENT_LAYOUT.truckStop, 2.9);
  collision.addCircle(view.companionPosition, 0.4);
  const start = REINFORCEMENT_LAYOUT.playerReturn.clone();
  assert.equal(isReinforcementArea(start.x, start.z), true);
  const destination = start.clone().lerp(view.companionPosition, 0.6);
  const resolved = collision.resolveMovement(start, destination);
  assert.ok(resolved.distanceTo(destination) < 0.001);
  assert.ok(Math.hypot(resolved.x - view.companionPosition.x, resolved.z - view.companionPosition.z) < 2.6);
});

test('extinción medida por simulación: común 2.5 s / 10 agua; crítico 4.5 s / 18 agua', (t) => {
  for (const kind of ['common', 'critical']) {
    for (const frameTime of [1 / 60, 1 / 30, 0.1]) {
      const fire = new FireSystem();
      fire.setPropagationEnabled(false);
      const source = fire.addSource({ position: new THREE.Vector3(), intensity: kind === 'critical' ? 0.82 : 1, kind });
      const tank = new WaterTank();
      let time = 0;
      while (source.isActive && time < 10) {
        const remaining = fire.getRemainingImpactTime(new THREE.Vector3(), 4, GAME_BALANCE.hose.extinguishPerSecond);
        const actual = tank.consume(Math.min(frameTime, remaining));
        fire.extinguishNearest(new THREE.Vector3(), 4, actual * GAME_BALANCE.hose.extinguishPerSecond);
        time += actual;
      }
      const expectedTime = kind === 'common' ? 2.5 : 4.5;
      assert.ok(Math.abs(time - expectedTime) < 1e-7);
      assert.ok(Math.abs(tank.totalConsumed - expectedTime * 4) < 1e-7);
      assert.ok(Math.abs(tank.amount + tank.totalConsumed - 100) < 1e-7);
      assert.equal(fire.extinguishedCount, 1);
      assert.equal(source.extinguishProgress, 1);
      assert.equal(source.intensityValue, 0);
      assert.equal(source.object.visible, false);
      assert.equal(fire.extinguishNearest(new THREE.Vector3(), 4, 10).hit, false);
      assert.equal(fire.extinguishedCount, 1);
      assert.equal(fire.consumeExtinguishedSources().length, 1);
      assert.equal(fire.consumeExtinguishedSources().length, 0);
      if (frameTime === 1 / 60) t.diagnostic(`${kind}: ${time.toFixed(3)} segundos de impacto, ${tank.totalConsumed.toFixed(3)} agua (simulación, sin partida jugada)`);
    }
  }
});

test('resistencia independiente de intensidad y sin consumo disponible fuera de alcance', () => {
  const fire = new FireSystem();
  const source = fire.addSource({ position: new THREE.Vector3(), intensity: 1.05, kind: 'critical' });
  assert.equal(fire.getRemainingImpactTime(new THREE.Vector3(20, 0, 0), 4, 0.4), 0);
  source.extinguish(GAME_BALANCE.fire.waterResistance.critical / 2);
  assert.equal(source.extinguishProgress, 0.5);
  assert.ok(Math.abs(source.intensityValue - 0.525) < 1e-8);
  assert.ok(Math.abs(source.object.children.find((child) => child.isPointLight).intensity - 3.15) < 1e-8);
  const tank = new WaterTank();
  tank.consume(24.99);
  const remainder = tank.consume(1);
  assert.ok(remainder < 0.011);
  assert.ok(Math.abs(tank.totalConsumed - 100) < 1e-8);
  assert.equal(tank.consume(1), 0);
});

test('progresión de asistencia y fauna: no puede saltarse ni completarse dos veces', () => {
  const flow = new PostFireProgression();
  assert.equal(flow.requestAssistance(), false);
  flow.activate();
  assert.equal(flow.meetForFauna(), false);
  assert.equal(flow.meetCompanion(), true);
  assert.match(flow.objective, /puesto de asistencia/);
  assert.equal(flow.requestAssistance(), true);
  assert.equal(flow.requestAssistance(), false);
  assert.equal(flow.startCare(), true);
  assert.equal(flow.startCare(), false);
  assert.equal(flow.finishCare(), true);
  assert.equal(flow.finishCare(), false);
  assert.equal(flow.assistanceCompleted, true);
  assert.equal(flow.closeCare(), true);
  assert.match(flow.objective, /fauna/);
  assert.equal(flow.meetForFauna(), true);
  assert.equal(flow.meetForFauna(), false);
  assert.equal(flow.requestAssistance(), false);
  assert.equal(new PostFireProgression().assistanceCompleted, false);
});

// DOM mínimo para verificar la escena y sus callbacks sin navegador.
class DialogElement {
  constructor(tagName = '') { this.tagName = tagName; }
  nodes = [];
  hidden = false;
  textContent = '';
  children = new Map();
  classes = new Set();
  classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name), contains: (name) => this.classes.has(name) };
  querySelector(name) { if (!this.children.has(name)) this.children.set(name, new DialogElement()); return this.children.get(name); }
  appendChild() {}
  append(...nodes) { this.nodes.push(...nodes); }
  replaceChildren(...nodes) { this.nodes = [...nodes]; }
  addEventListener() {}
  focus() {}
}

for (const injured of [true, false]) {
  test(`escena real de asistencia con salud ${injured ? 'reducida' : 'completa'}: cámara, recuperación, salida y recompensa única`, () => {
    const originalDocument = globalThis.document;
    globalThis.document = { createElement: (tag) => tag === 'section' ? new DialogElement() : originalDocument.createElement(tag) };
    try {
      const health = new PlayerHealth();
      if (injured) health.updateFromFirePositions(new THREE.Vector3(), [new THREE.Vector3()], 10);
      const initial = health.amount;
      const flow = new PostFireProgression();
      flow.activate(); flow.meetCompanion(); flow.requestAssistance();
      const view = new AssistanceView(terrain);
      const camera = new THREE.PerspectiveCamera();
      let locks = 0, releases = 0, completions = 0;
      const scene = new AssistanceScene(new DialogElement(), camera, health, flow, view,
        () => locks++, () => releases++, () => completions++);
      scene.open();
      assert.equal(health.amount, initial);
      scene.confirm();
      scene.confirm();
      assert.equal(flow.currentStage, 'care');
      const duration = injured ? 7 : 2.5;
      scene.update(duration / 2);
      assert.equal(health.amount, injured ? (initial + 100) / 2 : 100);
      const cameraAtHalf = camera.position.clone();
      const orientationAtHalf = camera.quaternion.clone();
      scene.update(duration / 2);
      assert.ok(camera.position.distanceTo(cameraAtHalf) < 1e-8);
      assert.ok(camera.quaternion.angleTo(orientationAtHalf) < 1e-7);
      assert.equal(health.amount, 100);
      assert.equal(flow.currentStage, 'care-outro');
      assert.equal(completions, 1);
      scene.update(60);
      assert.equal(completions, 1);
      scene.confirm();
      scene.confirm();
      assert.equal(locks, 1);
      assert.equal(releases, 1);
      assert.equal(flow.currentStage, 'fauna-companion');
      assert.equal(camera.position.x, ASSISTANCE_LAYOUT.playerReturn.x);
      assert.equal(camera.position.z, ASSISTANCE_LAYOUT.playerReturn.z);
      assert.equal(flow.requestAssistance(), false);
      const sequence = new CareSequence();
      sequence.start(initial);
      assert.equal(sequence.duration, duration);
      assert.equal(sequence.needsTreatment, injured);
    } finally { globalThis.document = originalDocument; }
  });
}

test('puesto apoyado en terreno, regreso y sanitario accesibles, collider del compañero trasladable', () => {
  const collision = new CollisionSystem();
  const view = new AssistanceView(terrain);
  view.show(collision);
  view.show(collision);
  assert.equal(view.medicPosition.y, terrain(view.medicPosition.x, view.medicPosition.z));
  const returnPosition = ASSISTANCE_LAYOUT.playerReturn.clone();
  const approach = new THREE.Vector3(-6.1, 0, 9.2);
  assert.ok(collision.resolveMovement(returnPosition, approach).distanceTo(approach) < 1e-8);
  assert.ok(Math.hypot(approach.x - view.medicPosition.x, approach.z - view.medicPosition.z) < GAME_BALANCE.assistance.interactionRadius);
  const handle = collision.addCircle(REINFORCEMENT_LAYOUT.companion, 0.4);
  handle.copy(ASSISTANCE_LAYOUT.faunaCompanion);
  assert.ok(collision.resolveMovement(returnPosition, REINFORCEMENT_LAYOUT.companion).distanceTo(REINFORCEMENT_LAYOUT.companion) < 1e-8);
});

test('vendaje en cámara real: dos brazos, venda hija del antebrazo, encuadre y near clipping', () => {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  const world = new THREE.Scene(); world.add(camera);
  const view = new AssistanceView(terrain);
  world.add(view.object);
  view.renderCare(0, true); view.setCamera(camera);
  const initialDirection = camera.getWorldDirection(new THREE.Vector3());
  view.renderCare(0.75, true); view.setCamera(camera);
  world.updateMatrixWorld(true);
  assert.equal(view.arms.object.parent, camera);
  assert.equal(view.arms.forearms.length, 2);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).y < initialDirection.y);
  assert.equal(camera.position.x, ASSISTANCE_LAYOUT.seat.x);
  for (const arm of view.arms.forearms) {
    const projection = arm.getWorldPosition(new THREE.Vector3()).project(camera);
    assert.ok(Math.abs(projection.x) < 1 && projection.y > -1 && projection.y < 0);
    assert.ok(projection.z > -1 && projection.z < 1);
  }
  for (const bandage of view.arms.bandages) {
    assert.equal(bandage.parent, view.arms.forearms[0]);
    assert.equal(bandage.visible, true);
    assert.equal(bandage.scale.x, 1);
  }
  view.arms.object.traverse((node) => {
    if (!node.isMesh) return;
    const vertices = node.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(node.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      assert.ok(-point.z > camera.near, 'la geometría debe quedar delante del near plane');
    }
  });
  view.renderCare(0.75, false);
  assert.ok(view.arms.bandages.every((part) => !part.visible));
  view.renderCare(0.96, true);
  assert.ok(view.arms.object.position.y < 0);
  view.restorePlayer(camera);
  assert.equal(view.arms.object.visible, false);
  assert.equal(view.object.children.some((child) => child.name === 'attached-bandage'), false);
});

function faunaFixture() {
  const session = new GameSession();
  session.beginContainment(); session.beginCompanionDialogue(); session.beginEpilogue();
  const flow = session.postFire;
  flow.meetCompanion(); flow.requestAssistance(); flow.startCare(); flow.finishCare(); flow.closeCare(); flow.meetForFauna();
  const companion = new ReinforcementView(terrain);
  companion.render(new ReinforcementSequence().finish());
  companion.moveCompanion(FAUNA_CONFIG.routeA[0]);
  const dialogues = [];
  const tour = new FaunaTour(flow, companion, new CollisionSystem(), terrain, (title, text) => dialogues.push({ title, text }));
  tour.start();
  return { session, flow, companion, tour, dialogues };
}

test('recorrido espera, retoma sin saltos y se pausa con los diálogos', () => {
  const { tour, companion } = faunaFixture();
  const start = companion.companionPosition.clone();
  tour.update(10, new THREE.Vector3(50, 0, 50), false);
  assert.equal(tour.isWaiting, true);
  assert.equal(companion.companionPosition.distanceTo(start), 0);
  assert.match(tour.interactionMessage(new THREE.Vector3()), /espera/);
  tour.update(10, start, true);
  assert.equal(companion.companionPosition.distanceTo(start), 0);
  tour.update(0.1, start, false);
  assert.equal(tour.isWaiting, false);
  assert.ok(companion.companionPosition.distanceTo(start) < 0.1);
  assert.ok(companion.companionPosition.distanceTo(start) > 0);
  assert.equal(companion.companionPosition.y, terrain(companion.companionPosition.x, companion.companionPosition.z));
});

test('fauna, radio y veterinario ocurren una vez; brújula habilita la recogida del transportín', (t) => {
  const { session, flow, companion, tour, dialogues } = faunaFixture();
  let seconds = 0;
  function until(stage) {
    for (let i = 0; i < 2000 && flow.currentStage !== stage; i++) {
      tour.update(0.1, companion.companionPosition.clone(), false); seconds += 0.1;
    }
    assert.equal(flow.currentStage, stage);
  }
  until('fauna-dialogue-a');
  assert.equal(tour.animals.smallAnimal.visible, false);
  const refugePosition = tour.animals.smallAnimal.position.clone();
  tour.update(5, companion.companionPosition, true);
  assert.equal(tour.animals.smallAnimal.position.distanceTo(refugePosition), 0);
  assert.equal(dialogues.length, 1);
  tour.continueDialogue(); tour.continueDialogue();
  until('fauna-dialogue-b');
  assert.equal(tour.animals.fox.visible, true);
  assert.equal(dialogues.length, 2);
  tour.continueDialogue();
  assert.equal(tour.interact(new THREE.Vector3(-20, 0, -20)), false);
  assert.match(tour.interactionMessage(FAUNA_CONFIG.fox), /F para avisar/);
  assert.equal(tour.interact(FAUNA_CONFIG.fox), true);
  assert.equal(tour.interact(FAUNA_CONFIG.fox), false);
  assert.equal(tour.noticeSent, true);
  assert.ok(tour.veterinarian.object.position.distanceTo(tour.animals.fox.position) > 8);
  const vetStart = tour.veterinarian.object.position.clone();
  tour.update(10, FAUNA_CONFIG.fox, true);
  assert.equal(tour.veterinarian.object.position.distanceTo(vetStart), 0);
  tour.update(0.1, FAUNA_CONFIG.fox, false);
  assert.ok(tour.veterinarian.object.position.distanceTo(vetStart) > 0);
  assert.ok(tour.veterinarian.object.position.distanceTo(vetStart) < 0.2);
  until('vet-dialogue');
  assert.equal(dialogues.filter((entry) => entry.title === 'Radio').length, 1);
  assert.equal(dialogues.filter((entry) => entry.title === 'Veterinario').length, 1);
  assert.equal(tour.carrier.visible, false);
  tour.continueDialogue(); tour.continueDialogue();
  assert.equal(flow.currentStage, 'carrier');
  assert.match(flow.objective, /transportín/);
  assert.match(tour.navigationTarget.label, /Transportín/);
  assert.equal(tour.navigationTarget.position, tour.carrier.position);
  assert.equal(tour.carrier.visible, true);
  tour.interact(tour.carrier.position);
  assert.equal(flow.currentStage, 'carrier-carrying');
  assert.equal(session.isOver, false);
  session.end('player');
  assert.equal(session.isOver, false);
  assert.ok(tour.veterinarian.object.position.distanceTo(companion.companionPosition) > 1);
  const clean = new FaunaTour(new PostFireProgression(), new ReinforcementView(terrain), new CollisionSystem(), terrain, () => {});
  assert.equal(clean.object.visible, false);
  assert.equal(clean.carrier.visible, false);
  assert.equal(clean.veterinarian.object.visible, false);
  assert.equal(clean.noticeSent, false);
  t.diagnostic(`Recorrida simulada sin pausas de lectura ni esperas del jugador: ${seconds.toFixed(1)} s`);
});

test('rutas del compañero y veterinario libres de construcciones y vegetación reservada', () => {
  const collision = new CollisionSystem();
  collision.addRectangle(context.housePosition, 5, 4);
  collision.addCircle(context.fireTruckPosition, 2);
  collision.addCircle(REINFORCEMENT_LAYOUT.truckStop, 2.9);
  new AssistanceView(terrain).show(collision);
  const assets = [[-15,-12],[-12,-14],[-9,-12],[-5,-15],[2,-14],[6,-12],[13,-11],[16,-8],[-17,-4],[-14,-6],[-11,-4],[-8,-7],[14,-1],[17,3],[15,6],[-11,9],[-7,-3],[3,-5],[11,2],[-4,8],[4,9],[14,-8],[-15,-9],[-11,-10],[-12,-1],[0,-9],[7,-11],[-15,9],[1,15],[12,11]];
  for (const [x,z] of assets) {
    if (!isReinforcementArea(x,z) && !isFaunaArea(x,z)) collision.addCircle(new THREE.Vector3(x,0,z), 1.15);
  }
  for (const route of [FAUNA_CONFIG.routeA, FAUNA_CONFIG.routeB, FAUNA_CONFIG.veterinarianRoute]) {
    const walker = new WaypointWalker(route, 1, terrain);
    for (let i = 0; i < 1000 && !walker.finished; i++) {
      assert.equal(collision.canOccupy(walker.position, 0.45), true, `ruta bloqueada en ${walker.position.toArray()}`);
      walker.update(0.1);
    }
    assert.equal(walker.finished, true);
  }
  assert.equal(collision.canOccupy(FAUNA_CONFIG.carrier.clone().add(new THREE.Vector3(1.3,0,0))), true);
});

function rescueFixture() {
  const session = new GameSession();
  session.beginContainment(); session.beginCompanionDialogue(); session.beginEpilogue();
  const flow = session.postFire;
  flow.meetCompanion(); flow.requestAssistance(); flow.startCare(); flow.finishCare(); flow.closeCare(); flow.meetForFauna();
  for (const stage of ['fauna-walk-a','fauna-refuge','fauna-dialogue-a','fauna-walk-b','fauna-dialogue-b','fauna-radio','vet-arriving','vet-evaluating','vet-dialogue','carrier']) flow.advanceFauna(stage);
  const companion = new ReinforcementView(terrain);
  companion.render(new ReinforcementSequence().finish());
  companion.moveCompanion(FAUNA_CONFIG.routeB.at(-1));
  const collisions = new CollisionSystem();
  collisions.addCircle(context.fireTruckPosition, 2);
  collisions.addCircle(REINFORCEMENT_LAYOUT.truckStop, 2.9);
  new AssistanceView(terrain).show(collisions);
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60,16/9,0.1,100);
  world.add(camera, companion.object);
  const dialogues = [];
  let completed = 0;
  const tour = new FaunaTour(flow, companion, collisions, terrain, (title,text) => dialogues.push({title,text}), { camera, onRescueCompleted: () => completed++ });
  world.add(tour.object);
  tour.object.visible = true;
  tour.animals.object.visible = true;
  tour.veterinarian.object.visible = true;
  tour.veterinarian.object.position.copy(FAUNA_CONFIG.veterinarianRoute.at(-1));
  tour.veterinarian.object.position.y = terrain(tour.veterinarian.object.position.x, tour.veterinarian.object.position.z);
  tour.carrier.visible = true;
  tour.rescue.activate();
  return {session, flow, companion, collisions, world, camera, tour, dialogues, get completed() { return completed; }};
}

test('recogida única: el objeto original pasa a las manos, sin collider fantasma ni near clipping', () => {
  const f = rescueFixture();
  const original = f.tour.carrier.position.clone();
  assert.equal(f.collisions.canOccupy(original, 0.01), false);
  assert.match(f.tour.rescue.interactionMessage(original), /F para recoger/);
  assert.equal(f.tour.rescue.interact(original), true);
  assert.equal(f.flow.currentStage, 'carrier-carrying');
  assert.equal(f.tour.carrier.parent, f.tour.rescue.view.carrying.object);
  assert.equal(f.collisions.canOccupy(original, 0.01), true);
  assert.equal(f.tour.rescue.interact(original), false);
  assert.match(f.flow.objective, /Llevá el transportín/);
  f.world.updateMatrixWorld(true);
  let carrierCount = 0;
  f.world.traverse((node) => { if (node.name === 'transportin') carrierCount++; });
  assert.equal(carrierCount, 1);
  for (const hand of f.tour.rescue.view.carrying.hands) {
    assert.equal(hand.parent, f.tour.carrier);
    const ndc = hand.getWorldPosition(new THREE.Vector3()).project(f.camera);
    assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1);
  }
  f.tour.carrier.traverse((node) => {
    if (!node.isMesh) return;
    const positions = node.geometry.attributes.position;
    for (let i=0; i<positions.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld).applyMatrix4(f.camera.matrixWorldInverse);
      assert.ok(-vertex.z > f.camera.near);
    }
  });
});

test('rescate completo: entrega única, zorro dentro, veterinario espera/retoma y animal visible al cierre', (t) => {
  const f = rescueFixture();
  const { tour, flow, camera } = f;
  tour.rescue.interact(tour.carrier.position.clone());
  assert.match(tour.rescue.interactionMessage(tour.veterinarian.object.position), /F para entregar/);
  assert.equal(tour.rescue.interact(tour.veterinarian.object.position), true);
  assert.equal(tour.rescue.interact(tour.veterinarian.object.position), false);
  assert.equal(flow.currentStage, 'rescue-identification');
  assert.match(f.dialogues.at(-1).text, /Lycalopex gymnocercus/);
  camera.updateWorldMatrix(true,true);
  const heldWorld = tour.carrier.getWorldPosition(new THREE.Vector3());
  tour.rescue.continueDialogue();
  assert.ok(tour.carrier.getWorldPosition(new THREE.Vector3()).distanceTo(heldWorld) < 1e-8);
  const start = tour.carrier.position.clone();
  tour.rescue.update(10, camera.position, true);
  assert.equal(tour.carrier.position.distanceTo(start), 0);
  for (let i=0;i<91 && flow.currentStage==='rescue-loading';i++) tour.rescue.update(0.1, camera.position, false);
  assert.equal(flow.currentStage, 'rescue-ready');
  assert.ok(tour.animals.fox.parent === tour.carrier);
  assert.ok(tour.carrier.parent === tour.veterinarian.object);
  assert.ok(Math.abs(tour.animals.fox.scale.x - RESCUE_CONFIG.foxScale) < 1e-8);
  // El zorro cabe en el espacio interior, manteniendo su escala durante todo el traslado.
  tour.animals.fox.updateMatrix();
  const inverse = tour.carrier.matrixWorld.clone().invert();
  f.world.updateMatrixWorld(true);
  inverse.copy(tour.carrier.matrixWorld).invert();
  const foxBox = new THREE.Box3();
  tour.animals.fox.traverse((node) => {
    if (!node.isMesh) return;
    const attr = node.geometry.attributes.position;
    for(let i=0;i<attr.count;i++) foxBox.expandByPoint(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(node.matrixWorld).applyMatrix4(inverse));
  });
  assert.ok(foxBox.min.x > -CARRIER_SIZE.width/2 && foxBox.max.x < CARRIER_SIZE.width/2);
  assert.ok(foxBox.max.y < CARRIER_SIZE.height);
  assert.ok(foxBox.min.z > -CARRIER_SIZE.depth/2 && foxBox.max.z < CARRIER_SIZE.depth/2);
  tour.rescue.continueDialogue();
  assert.equal(flow.currentStage, 'rescue-walk');
  const vetStart = tour.veterinarian.object.position.clone();
  tour.rescue.update(5, new THREE.Vector3(60,0,60), false);
  assert.equal(tour.rescue.isWaiting, true);
  assert.equal(tour.veterinarian.object.position.distanceTo(vetStart), 0);
  let walkSeconds = 0;
  for(let i=0;i<1000 && flow.currentStage==='rescue-walk';i++) {
    const player = tour.veterinarian.object.position.clone();
    tour.rescue.update(0.1, player, false); walkSeconds += 0.1;
    f.world.updateMatrixWorld(true);
    assert.ok(f.collisions.canOccupy(tour.veterinarian.object.position,0.38), 'el veterinario debe evitar los objetos del puesto');
    assert.ok(tour.veterinarian.object.position.distanceTo(f.companion.companionPosition) > 0.75, 'los personajes mantienen espacio entre sí');
    for (const x of [-CARRIER_SIZE.width/2, CARRIER_SIZE.width/2]) for (const z of [-CARRIER_SIZE.depth/2,CARRIER_SIZE.depth/2]) {
      const corner = tour.carrier.localToWorld(new THREE.Vector3(x,0,z));
      const station = tour.rescue.view.station;
      const aboveStation = Math.abs(corner.x-station.object.position.x) < 0.95 && Math.abs(corner.z-station.object.position.z) < 0.6 && corner.y >= station.object.position.y + RESCUE_CONFIG.stationTop;
      if (!aboveStation) assert.ok(f.collisions.canOccupy(corner,0.07), 'la caja transportada evita obstáculos durante los giros suaves');
    }
    assert.ok(tour.animals.fox.parent === tour.carrier);
    if (flow.currentStage === 'rescue-walk') assert.ok(tour.carrier.parent === tour.veterinarian.object);
    else assert.ok(tour.carrier.parent === tour.rescue.view.object);
  }
  assert.equal(flow.currentStage, 'rescue-placing');
  for(let i=0;i<41 && flow.currentStage==='rescue-placing';i++) tour.rescue.update(0.1, camera.position, false);
  assert.equal(flow.currentStage, 'rescue-arrival');
  assert.ok(tour.carrier.parent === tour.rescue.view.station.socket);
  assert.equal(tour.animals.fox.visible, true);
  assert.equal(tour.carrier.visible, true);
  assert.match(f.dialogues.at(-1).text, /Queda al cuidado del equipo/);
  tour.rescue.continueDialogue();
  assert.equal(f.completed, 1);
  assert.equal(flow.rescueCompletionCount, 1);
  assert.match(f.dialogues.at(-1).text, /indicios/);
  tour.rescue.continueDialogue(); tour.rescue.continueDialogue();
  assert.equal(flow.currentStage, 'investigation-meeting');
  assert.match(tour.navigationTarget.label, /Encuentro/);
  assert.equal(f.completed, 1);
  assert.equal(flow.rescueCompletionCount, 1);
  assert.equal(f.session.isOver, false);
  assert.equal(tour.rescue.interact(tour.carrier.getWorldPosition(new THREE.Vector3())), false);
  t.diagnostic(`Animaciones y traslado simulado: ${(walkSeconds + RESCUE_CONFIG.loadingSeconds + RESCUE_CONFIG.placementSeconds).toFixed(1)} s; no incluye ida/vuelta del jugador ni lectura.`);
});

test('ficha automática única y dos especies opcionales con enlaces oficiales en la bitácora', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: (tag) => new DialogElement(tag) };
  try {
    const log = new Bitacora(new DialogElement(), () => {});
    for(let i=0;i<2;i++) {
      log.unlockEntry(FOX_NOTE);
      OTHER_FAUNA_NOTES.forEach((note) => log.unlockEntry(note));
    }
    assert.equal(log.unlockedEntries.length, 3);
    assert.match(FOX_NOTE.text, /Lycalopex gymnocercus/);
    assert.ok(FOX_NOTE.sources.some((source) => source.url === FAUNA_SOURCES.fox));
    assert.equal(OTHER_FAUNA_NOTES.length, 2);
    log.showLog([]);
    assert.equal(log.isOpen, true);
    const details = log.logContent.nodes.find((node) => node.tagName === 'details');
    assert.equal(details.nodes[0].textContent, 'Otros habitantes de Córdoba');
    assert.equal(details.nodes.filter((node) => node.tagName === 'article').length, 2);
    assert.equal(new Bitacora(new DialogElement(), () => {}).unlockedEntries.length, 0);
  } finally { globalThis.document = originalDocument; }
});

test('recorridos de traslado y acompañante evitan construcciones con el transportín', () => {
  const collision = new CollisionSystem();
  collision.addCircle(context.fireTruckPosition, 2);
  collision.addCircle(REINFORCEMENT_LAYOUT.truckStop, 2.9);
  collision.addRectangle(context.housePosition,5,4);
  new AssistanceView(terrain).show(collision);
  for(const route of [RESCUE_CONFIG.transportRoute, RESCUE_CONFIG.companionRoute]) {
    const walker = new WaypointWalker(route, 1, terrain);
    for(let i=0;i<1000 && !walker.finished;i++) {
      assert.equal(collision.canOccupy(walker.position,0.4), true, `personaje en obstáculo: ${walker.position.toArray()}`);
      if(route === RESCUE_CONFIG.transportRoute) {
        const angle = Math.atan2(walker.direction.x,walker.direction.z);
        for(const x of [-0.7,0.7]) for(const z of [0.85-0.375,0.85+0.375]) {
          const corner = new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(walker.position);
          assert.equal(collision.canOccupy(corner,0.07),true, `transportín en obstáculo: ${corner.toArray()}`);
        }
      }
      walker.update(0.05);
    }
    assert.equal(walker.finished,true);
  }
  assert.equal(collision.canOccupy(RESCUE_CONFIG.meeting,0.45),true);
});

test('las colisiones del transportín limitan el movimiento sin atravesar una pared', () => {
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60,16/9,0.1,100);
  world.add(camera);
  const crate = createAnimalCarrier();
  const carry = new CarrierCarryView();
  carry.hold(camera, crate);
  const collisions = new CollisionSystem();
  collisions.addRectangle(new THREE.Vector3(0,0,-3),4,0.5);
  const previous = new THREE.Vector3(0,1.7,0);
  const desired = new THREE.Vector3(0,1.7,-1);
  camera.position.copy(desired);
  const resolved = carry.constrainMovement(camera, crate, previous, desired, collisions);
  assert.equal(resolved.z, previous.z);
  assert.ok(collisions.resolveMovement(previous,desired).distanceTo(desired) < 1e-8, 'el control adicional considera la caja antes que el cuerpo');
});

test('la caja del veterinario llega por encima de la mesa con el relieve real', () => {
  const walker = new WaypointWalker(RESCUE_CONFIG.transportRoute, 1, getTerrainHeight);
  const stationTop = getTerrainHeight(RESCUE_CONFIG.station.x,RESCUE_CONFIG.station.z) + RESCUE_CONFIG.stationTop;
  while (!walker.finished) {
    walker.update(0.05);
    const yaw = Math.atan2(walker.direction.x,walker.direction.z);
    for (const x of [-0.7,0.7]) for (const z of [0.85-0.375,0.85+0.375]) {
      const corner = new THREE.Vector3(x,1.05,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(walker.position);
      const overTable = Math.abs(corner.x - RESCUE_CONFIG.station.x) < 0.95 && Math.abs(corner.z-RESCUE_CONFIG.station.z) < 0.6;
      if (overTable) assert.ok(corner.y >= stationTop, 'la base transportada no debe atravesar la mesa');
    }
  }
});
