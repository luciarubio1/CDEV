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
const { createCharacter, characterRig, animateCharacter, animateCharacters, setCharacterCarrier, setCharacterGesture } = await import('../src/game/npc/character-model.ts');
const { createFireTruck, FIRE_TRUCK_RELOAD_RADIUS } = await import('../src/game/world/fire-truck.ts');
const { TRUCK_ANCHORS, truckAnchorWorld, registerTruckCollision } = await import('../src/game/world/truck-model.ts');
const { CARRIER_CARRY_POSE } = await import('../src/game/world/animal-carrier.ts');
const { PreparationSequence, PREPARATION_TASKS } = await import('../src/game/narrative/preparation-sequence.ts');
const { createSierraBackdrop } = await import('../src/game/world/sierra-backdrop.ts');
const { createTerrain, TERRAIN_SEGMENTS } = await import('../src/game/world/terrain.ts');
const { createSierraTree, styleSierraBush } = await import('../src/game/world/sierra-vegetation.ts');
const { LandscapeDecoration, decorativePlacements, isLandscapeReserved } = await import('../src/game/world/landscape-decoration.ts');
const { TREE_PLACEMENTS, BUSH_PLACEMENTS, ROCK_PLACEMENTS, LANDSCAPE_SETTINGS } = await import('../src/game/world/landscape-config.ts');
const { VegetationStateSystem } = await import('../src/game/world/vegetation-state.ts');
const { FireSource } = await import('../src/game/fire/fire-source.ts');
const { FIRE_VISUAL } = await import('../src/game/fire/fire-visual-config.ts');

test('llamas sin halos: una malla cruzada, paleta cálida y una luz por foco, con buffers reutilizados', () => {
  for(const kind of ['common','critical']) {
    const source=new FireSource({position:new THREE.Vector3(),kind}),mesh=source.object.getObjectByName('flame-tongues');
    const geometry=mesh.geometry,positions=geometry.attributes.position.array,strength=geometry.attributes.strength.array,material=mesh.material;
    assert.equal(material.blending,THREE.NormalBlending);assert.equal(material.depthWrite,false);assert.equal(material.side,THREE.DoubleSide);
    assert.equal(source.object.children.filter((child)=>child.isPointLight).length,1);
    assert.ok(material.uniforms.yellow.value.b<.2);
    assert.equal(source.object.children.filter((child)=>child.isSprite&&child.name.includes('flame')).length,0);
    const tongues=kind==='critical'?FIRE_VISUAL.criticalTongues:FIRE_VISUAL.commonTongues;
    assert.equal(geometry.attributes.position.count,tongues*FIRE_VISUAL.crossedPlanes*(FIRE_VISUAL.heightSegments+1)*3);
    for(let i=0;i<120;i++)source.update(1/60,{direction:new THREE.Vector3(1,0,0),intensity:.65});
    assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(geometry.attributes.position.array,positions);assert.equal(geometry.attributes.strength.array,strength);
    const index=geometry.index.array,point=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(60,1,.1,100);
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
      camera.position.set(Math.cos(angle)*5,2.2,Math.sin(angle)*5);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
      let area=0;
      for(let i=0;i<index.length;i+=3){
        const projected=[];
        for(let j=0;j<3;j++){point.fromBufferAttribute(geometry.attributes.position,index[i+j]).project(camera);projected.push([point.x,point.y]);}
        const [a,b,c]=projected;area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
      }
      assert.ok(area>.05,'las hojas cruzadas conservan superficie proyectada desde varios lados');
    }
  }
});

test('base del fuego sigue el relieve y evita una roca sin mover el foco lógico ni su alcance', () => {
  const origin=new THREE.Vector3(2,0,1);origin.y=getTerrainHeight(origin.x,origin.z);
  const fire=new FireSystem(),collision=new CollisionSystem();collision.addCircle(origin,.6);
  fire.setVisualSurface({terrainHeight:getTerrainHeight,canBurnAt:(x,z,r)=>collision.canOccupyXZ(x,z,r)});
  const source=fire.addSource({position:origin,kind:'critical'}),mesh=source.object.getObjectByName('flame-tongues'),rig=source.flames;
  assert.deepEqual(source.object.position.toArray(),origin.toArray());assert.ok(rig.anchors.some((anchor)=>anchor.valid));
  for(let step=0;step<3;step++){
    source.update(.1,{direction:new THREE.Vector3(1,0,-1),intensity:.7});
    for(let tongue=0;tongue<rig.anchors.length;tongue++){
      if(!rig.anchors[tongue].valid)continue;
      assert.ok(Math.hypot(rig.anchors[tongue].x,rig.anchors[tongue].z)<=FIRE_VISUAL.maxVisualOffset+1e-6);
      for(let plane=0;plane<FIRE_VISUAL.crossedPlanes;plane++)for(let col=0;col<3;col++){
        const n=((tongue*FIRE_VISUAL.crossedPlanes+plane)*(FIRE_VISUAL.heightSegments+1))*3+col;
        const attr=mesh.geometry.attributes.position,x=origin.x+attr.getX(n),z=origin.z+attr.getZ(n),y=origin.y+attr.getY(n);
        assert.ok(Math.abs(y-getTerrainHeight(x,z)-FIRE_VISUAL.baseClearance)<1e-6);
        assert.ok(Math.hypot(x-origin.x,z-origin.z)>.6);
      }
    }
  }
  assert.ok(fire.getNearestActivePosition(origin,4).distanceTo(origin)<1e-8);
});

test('agua reduce altura, cantidad y luz; el apagado conserva una cola visual sin daño ni recuento extra', () => {
  const fire=new FireSystem();fire.setPropagationEnabled(false);
  const source=fire.addSource({position:new THREE.Vector3(),kind:'critical'}),mesh=source.object.getObjectByName('flame-tongues');
  const maxHeight=()=>{const positions=mesh.geometry.attributes.position;let y=0;for(let i=0;i<positions.count;i++)y=Math.max(y,positions.getY(i));return y;};
  source.update(.1);const height=maxHeight(),count=source.flames.visibleTongueCount,light=source.object.getObjectByName('fire-light').intensity;
  source.applyWaterImpact();source.extinguish(GAME_BALANCE.fire.waterResistance.critical*.6);source.update(.3);
  assert.ok(maxHeight()<height*.85);assert.ok(source.flames.visibleTongueCount<count);assert.ok(source.object.getObjectByName('fire-light').intensity<light*.5);
  assert.ok(source.object.children.some((child)=>child.name==='water-mist'&&child.visible));
  const before=source.flames.displayFraction;fire.extinguishNearest(new THREE.Vector3(),4,100);
  assert.equal(source.isActive,false);assert.equal(source.object.getObjectByName('fire-light').intensity,0);
  assert.equal(source.object.visible,true);source.update(.05);assert.ok(source.flames.displayFraction<before);
  assert.equal(fire.activeCount,0);assert.equal(fire.extinguishedCount,1);
  source.update(FIRE_VISUAL.finishTailSeconds);assert.equal(source.object.visible,false);
  assert.equal(fire.extinguishNearest(new THREE.Vector3(),4,100).hit,false);assert.equal(fire.extinguishedCount,1);
});

test('humo y chispas responden al viento; la misión conserva sus referencias sin cono ni columna', () => {
  const random=Math.random;let calm,windy;
  try{Math.random=()=>.5;calm=new FireSource({position:new THREE.Vector3()});windy=new FireSource({position:new THREE.Vector3()});}finally{Math.random=random;}
  calm.update(.1);windy.update(.1,{direction:new THREE.Vector3(1,0,0),intensity:1});
  assert.ok(windy.object.getObjectByName('fire-smoke').position.x>calm.object.getObjectByName('fire-smoke').position.x);
  assert.ok(windy.object.getObjectByName('fire-embers').geometry.attributes.position.getX(0)>calm.object.getObjectByName('fire-embers').geometry.attributes.position.getX(0));
  assert.equal(windy.object.getObjectByName('fire-embers').material.size,FIRE_VISUAL.emberSize);
  const fire=new FireSystem(),director=new MissionDirector(fire,context.fireTruckPosition,()=>0);director.startAfterPreparation();
  assert.equal(director.object.children.length,1,'solo se conserva la radio, sin grupos de marcadores');
  assert.equal(director.accessFire,fire.sources[0]);
  assert.ok(director.getNavigationTarget(context.playerPosition,context.housePosition).position.distanceTo(fire.sources[0].object.position)<1e-8);
  const result=fire.extinguishNearest(fire.sources[0].object.position,1,100);assert.equal(result.extinguished,true);
  director.update(.1,context,0);assert.equal(director.currentStage,'radio');
  assert.equal(director.requestReinforcements(director.radioPosition),true);assert.equal(director.currentStage,'house');assert.equal(director.criticalFires[0],fire.sources[1]);
});

test('los focos reales de misión mantienen todas sus llamas junto a los obstáculos actuales', () => {
  const collision=new CollisionSystem();collision.addRectangle(context.housePosition,5,4);
  registerTruckCollision(createFireTruck(),collision);
  for(const [x,z] of TREE_PLACEMENTS)if(!isReinforcementArea(x,z)&&!isFaunaArea(x,z))collision.addCircle(new THREE.Vector3(x,0,z),LANDSCAPE_SETTINGS.treeTrunkRadius);
  for(const [x,z] of BUSH_PLACEMENTS)if(!isReinforcementArea(x,z)&&!isFaunaArea(x,z))collision.addCircle(new THREE.Vector3(x,0,z),.62);
  for(const [x,z,scale] of ROCK_PLACEMENTS)if(!isReinforcementArea(x,z)&&!isFaunaArea(x,z))collision.addCircle(new THREE.Vector3(x,0,z),scale*.8);
  const fire=new FireSystem();fire.setPropagationEnabled(false);fire.setVisualSurface({terrainHeight:getTerrainHeight,canBurnAt:(x,z,r)=>collision.canOccupyXZ(x,z,r)});
  const director=new MissionDirector(fire,context.fireTruckPosition,getTerrainHeight);director.startAfterPreparation();
  const check=()=>{const source=fire.sources.at(-1);assert.equal(source.flames.visibleTongueCount,source.flames.anchors.length);assert.ok(source.flames.anchors.every((anchor)=>anchor.valid));};
  check();fire.extinguishNearest(director.accessFire.object.position,1,10);director.update(.1,context,0);director.requestReinforcements(director.radioPosition);check();
  fire.extinguishNearest(director.criticalFires[0].object.position,1,10);director.update(.1,context,0);
  for(const source of director.criticalFires){assert.equal(source.flames.visibleTongueCount,FIRE_VISUAL.criticalTongues);assert.ok(source.flames.anchors.every((anchor)=>anchor.valid));}
});

const context = { playerPosition: new THREE.Vector3(), fireTruckPosition: new THREE.Vector3(-16, 0, 16), housePosition: new THREE.Vector3(10, 0, 10) };
const terrain = (x, z) => Math.sin(x) * 0.1 + Math.cos(z) * 0.2;

test('preparación recuperada: equipo reconocible antes de habilitar F, recogida y conexión únicas', () => {
  const truck=createFireTruck(), sequence=new PreparationSequence(truck);
  sequence.setAvailable(false);
  assert.equal(sequence.object.visible,true);
  assert.ok(sequence.tasks[0].object.getObjectByName('jacket'));
  assert.ok(sequence.tasks[0].object.getObjectByName('boot'));
  assert.equal(sequence.tasks[0].object.getObjectByName('stored-suit').visible,true);
  assert.equal(truck.getObjectByName('stored-hose').visible,true);
  assert.equal(truck.getObjectByName('connected-hose').visible,false);
  assert.equal(sequence.completeCurrentTask(sequence.tasks[0].interactionPosition),null);
  sequence.setAvailable(true);
  const player=(index)=>sequence.tasks[index].interactionPosition.clone().add(new THREE.Vector3(0,1.7,0));
  assert.equal(sequence.completeCurrentTask(player(2)),null);
  assert.equal(sequence.completeCurrentTask(player(0)).id,'suit');
  assert.equal(sequence.tasks[0].object.getObjectByName('stored-suit').visible,false);
  assert.equal(sequence.tasks[0].object.getObjectByName('stand-post').visible,true);
  assert.equal(sequence.getInteractionMessage(player(1)),'Presioná F para retirar la manguera');
  assert.equal(sequence.completeCurrentTask(player(1)).id,'hose');
  assert.equal(truck.getObjectByName('stored-hose').visible,false);
  assert.equal(sequence.isComplete,false);
  assert.equal(sequence.completeCurrentTask(player(2)).id,'connection');
  assert.equal(truck.getObjectByName('connection-cap').visible,false);
  assert.equal(truck.getObjectByName('connected-hose').visible,true);
  assert.equal(sequence.isComplete,true);
  assert.equal(sequence.completeCurrentTask(player(2)),null);
});

test('los tres puntos se alcanzan rodeando la carrocería, con los colliders de equipo presentes', () => {
  const truck=createFireTruck(), collision=new CollisionSystem();registerTruckCollision(truck,collision);
  const preparation=new PreparationSequence(truck,collision), step=.25, limit=20;
  const world=(ix,iz)=>truck.localToWorld(new THREE.Vector3(ix*step,0,iz*step));
  const clear=(ix,iz)=>{
    const x=ix*step,z=iz*step;
    if(Math.abs(x)<1.65&&z>-3.29&&z<3.05)return false;
    return collision.canOccupy(world(ix,iz));
  };
  const queue=[[-16,-16]], reached=new Set(['-16,-16']);
  for(let q=0;q<queue.length;q++) {
    const [x,z]=queue[q];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(Math.abs(nx)>limit||Math.abs(nz)>limit||reached.has(key)||!clear(nx,nz))continue;
      reached.add(key);queue.push([nx,nz]);
    }
  }
  for(const point of preparation.tasks) assert.ok(queue.some(([x,z])=>{
    const position=world(x,z);position.y=point.task.position.y+1.7;
    return preparation.getNearbyTask(position)?.id===point.task.id;
  }),`no se alcanza ${point.task.id}`);
});

test('sierras conectadas y deterministas fuera del mapa; continuación del suelo sin hueco en el borde', () => {
  const a=createSierraBackdrop(),b=createSierraBackdrop();
  assert.equal(a.children.length,6);
  a.children.forEach((mesh,index)=>{
    const positions=mesh.geometry.attributes.position;
    assert.deepEqual(positions.array,b.children[index].geometry.attributes.position.array);
    if(mesh.name==='non-walkable-apron') {
      for(let i=0;i<TERRAIN_SEGMENTS*4;i++) assert.ok(Math.abs(positions.getY(i)-getTerrainHeight(positions.getX(i),positions.getZ(i)))<1e-6);
      return;
    }
    assert.equal(positions.count,(LANDSCAPE_SETTINGS.ridgeSegments+1)*(LANDSCAPE_SETTINGS.ridgeDepthSegments+1));
    assert.equal(mesh.geometry.index.count,LANDSCAPE_SETTINGS.ridgeSegments*LANDSCAPE_SETTINGS.ridgeDepthSegments*6);
    for(let i=0;i<positions.count;i++) assert.ok(Math.abs(positions.getX(i))>=30||Math.abs(positions.getZ(i))>=30);
  });
  const ground=createTerrain(), vertices=ground.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++) assert.ok(Math.abs(vertices.getY(i)-getTerrainHeight(vertices.getX(i),vertices.getZ(i)))<1e-6);
  assert.equal(ground.geometry.attributes.color.count,vertices.count);
});

test('decoración instanciada repetible, apoyada y despejada; no modifica combustible ni métricas', () => {
  assert.deepEqual(decorativePlacements(),decorativePlacements());
  const decoration=new LandscapeDecoration(getTerrainHeight), empty=new LandscapeDecoration(getTerrainHeight,0);
  assert.ok(decoration.grass.count>0);assert.equal(empty.grass.count,0);
  assert.equal(decoration.object.children.length,3);
  for(const mesh of decoration.object.children){assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.castShadow,false);}
  for(const p of decoration.grassPositions){assert.equal(isLandscapeReserved(p.x,p.z,0),false);assert.ok(Math.abs(p.y-getTerrainHeight(p.x,p.z)-.006)<1e-8);}
  const fire=new FireSystem(), vegetation=new VegetationStateSystem();
  TREE_PLACEMENTS.forEach(([x,z],index)=>{
    if(isReinforcementArea(x,z)||isFaunaArea(x,z))return;
    const tree=createSierraTree(5.5+(index%4)*.8,index),position=new THREE.Vector3(x,getTerrainHeight(x,z),z);
    vegetation.register(tree,position,5);fire.trackCombustible({position,ignitionDistance:5.5,ignitionTime:10+(index%4)*3});
  });
  assert.equal(fire.combustibleCount,15);assert.equal(vegetation.count,15);
  const before=decoration.grass.instanceColor.array.slice();
  decoration.updateBurning(decoration.grassPositions);
  assert.notDeepEqual(decoration.grass.instanceColor.array,before);
  assert.equal(fire.combustibleCount,15);assert.equal(vegetation.count,15);assert.equal(vegetation.affectedCount,0);
});

test('copas nuevas mantienen quemado persistente y aislado; arbusto local conserva textura y collider', () => {
  const first=createSierraTree(6,0),second=createSierraTree(6,0);
  const state=new VegetationStateSystem();state.register(first,new THREE.Vector3(),5);state.register(second,new THREE.Vector3(15,0,0),5);
  const leaf=first.children.find((node)=>node.isMesh&&node.geometry.type==='IcosahedronGeometry');
  const other=second.children.find((node)=>node.isMesh&&node.geometry.type==='IcosahedronGeometry');
  const original=other.material.color.clone();state.update(3,[new THREE.Vector3()]);state.update(1,[]);
  assert.equal(state.burnedCount,1);assert.equal(state.affectedSurfaceArea,5);
  assert.notDeepEqual(leaf.material.color.toArray(),original.toArray());assert.deepEqual(other.material.color.toArray(),original.toArray());
  const bush=new THREE.Mesh(new THREE.BoxGeometry(3,1,3),new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
  const texture=bush.material.map;styleSierraBush(bush,2,.62);
  const size=new THREE.Box3().setFromObject(bush).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x/2-.62)<1e-6);assert.equal(bush.material.map,texture);
});

test('personajes articulados: variantes identificables, geometría compartida y raíz lógica estable', () => {
  for (const role of ['brigadista', 'salud', 'fauna']) {
    const actor = createCharacter(role);
    const rig = characterRig(actor);
    assert.equal(rig.visual.parent, actor);
    for (const limb of [...rig.arms,...rig.legs]) {
      assert.equal(limb.joint.parent, limb.pivot);
      assert.equal(limb.end.parent, limb.joint);
    }
    if (role !== 'brigadista') {
      assert.ok(actor.getObjectByName(`label-${role.toUpperCase()}`));
      assert.ok(actor.getObjectByName('work-kit'));
    }
    const position = actor.position.clone(), rotation = actor.quaternion.clone();
    setCharacterGesture(actor,.8);
    animateCharacter(actor,.1,new THREE.Vector3(3,1.7,2),true);
    assert.deepEqual(actor.position.toArray(),position.toArray());
    assert.deepEqual(actor.quaternion.toArray(),rotation.toArray());
    assert.ok(rig.arms[0].joint.rotation.x < -.1);
  }
  const a = createCharacter(), b = createCharacter();
  assert.equal(a.getObjectByName('boot').geometry,b.getObjectByName('boot').geometry);
  assert.equal(a.getObjectByName('boot').material,b.getObjectByName('boot').material);
});

test('caminata responde a distancia real, termina en reposo y no desplaza raíz ni cámara', () => {
  const actor = createCharacter(), rig = characterRig(actor), camera = new THREE.PerspectiveCamera();
  const cameraPosition = camera.position.clone();
  animateCharacter(actor,1/60);
  for (let i=0;i<40;i++) { actor.position.z += 2.5/60; animateCharacter(actor,1/60); }
  assert.ok(rig.blend > .9);
  assert.ok(rig.legs[0].pivot.rotation.x * rig.legs[1].pivot.rotation.x < 0);
  assert.ok(Math.abs(rig.arms[0].pivot.rotation.x) > .01);
  const phase = rig.phase;
  for (let i=0;i<180;i++) animateCharacter(actor,1/60);
  assert.equal(rig.phase,phase); assert.ok(rig.blend < 1e-8);
  assert.ok(Math.abs(rig.legs[0].pivot.rotation.x) < 1e-8);
  assert.deepEqual(camera.position.toArray(),cameraPosition.toArray());
  assert.ok(Math.abs(actor.position.z - 40*2.5/60) < 1e-9);
});

test('ambas manos del veterinario alcanzan los agarres al llevar la caja, también con giro y paso', () => {
  const actor = createCharacter('fauna'), rig = characterRig(actor), carrier = createAnimalCarrier();
  carrier.position.set(0,CARRIER_CARRY_POSE.height,CARRIER_CARRY_POSE.forward); actor.add(carrier);
  setCharacterCarrier(actor,carrier);
  const world = new THREE.Scene(); world.add(actor);
  for (let i=0;i<120;i++) {
    actor.position.z += .03; actor.rotation.y += .01;
    animateCharacter(actor,1/60); world.updateMatrixWorld(true);
    rig.arms.forEach((arm,index) => {
      const hand = arm.end.getWorldPosition(new THREE.Vector3());
      const grip = carrier.getObjectByName(index === 0 ? 'carrier-grip-left' : 'carrier-grip-right').getWorldPosition(new THREE.Vector3());
      assert.ok(hand.distanceTo(grip) < 1e-6, `mano ${index}: ${hand.distanceTo(grip)}`);
    });
  }
  setCharacterCarrier(actor,null);
  animateCharacter(actor,.1); assert.equal(rig.carrier,null);
});

test('camión compartido mantiene envolvente y anclajes; preparación y radio siguen accesibles', () => {
  const truck = createFireTruck(), other = createFireTruck();
  truck.position.set(0,0,0); truck.rotation.set(0,0,0); truck.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(truck);
  assert.ok(bounds.min.x >= -1.22 && bounds.max.x <= 1.4,`envolvente con acople: ${bounds.min.x}/${bounds.max.x}`);
  assert.ok(bounds.min.z >= -2.841 && bounds.max.z <= 2.601);
  assert.ok(truck.getObjectByName('windshield'));
  assert.ok(truck.getObjectByName('equipment-compartment'));
  assert.ok(truck.getObjectByName('label-BOMBEROS'));
  assert.equal(truck.getObjectByName('tire').geometry,other.getObjectByName('tire').geometry);
  for (const name of Object.keys(TRUCK_ANCHORS)) assert.ok(truck.getObjectByName(`truck-${name}`));
  const initial = createFireTruck();
  const preparation = new PreparationSequence(initial);
  const positions = PREPARATION_TASKS.map((task)=>task.position.toArray());
  const visuals = preparation.tasks.map((point)=>point.object.position.clone());
  preparation.update(1);
  preparation.tasks.forEach((point,index)=>assert.ok(point.object.position.distanceTo(visuals[index]) < 1e-9));
  assert.deepEqual(PREPARATION_TASKS.map((task)=>task.position.toArray()),positions);
  for (const point of preparation.tasks) {
    const player = point.task.position.clone(); player.y += 1.7;
    assert.equal(preparation.getNearbyTask(player)?.id,point.task.id);
  }
  assert.equal(FIRE_TRUCK_RELOAD_RADIUS,3.5);
  const target = truckAnchorWorld(initial,'hose-rack',new THREE.Vector3());
  assert.ok(preparation.tasks[1].object.position.distanceTo(target) < 1e-9);
  const director = new MissionDirector(new FireSystem(),context.fireTruckPosition,()=>0);
  assert.deepEqual(director.radioPosition.toArray(),[-12.6,0,15]);
});

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
      assert.equal(source.isActive,false);
      assert.equal(source.object.getObjectByName('fire-light').intensity,0);
      source.update(FIRE_VISUAL.finishTailSeconds+.1);
      assert.equal(source.object.visible,false);
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
  assert.ok(Math.abs(source.object.children.find((child) => child.isPointLight).intensity - FIRE_VISUAL.lightIntensity*.525) < 1e-8);
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
  after(...nodes) { this.nodes.push(...nodes); }
  append(...nodes) { this.nodes.push(...nodes); }
  replaceChildren(...nodes) { this.nodes = [...nodes]; }
  listeners = new Map();
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  focus() {}
  setAttribute(name, value) { this[name] = value; }
}

const { NPC_MOVEMENT, FollowDistanceGate } = await import('../src/game/narrative/npc-movement.ts');
const { RESCUE_CAMERA } = await import('../src/game/narrative/rescue-camera.ts');
const { MainMenu } = await import('../src/ui/menus/main-menu.ts');
const { configureAwarenessEnding } = await import('../src/ui/ending-panel.ts');

test('cierre de concientización presenta tres ideas y acciones sin consumir métricas', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: (tag) => new DialogElement(tag) };
  try {
    const root = new DialogElement();
    configureAwarenessEnding(root); configureAwarenessEnding(root);
    assert.equal(root.querySelector('h1').textContent, 'Las llamas se apagaron. El cuidado continúa.');
    const list = root.querySelector('.awareness-ideas');
    assert.equal(list.hidden, false); assert.equal(list.nodes.length, 3);
    assert.deepEqual(list.nodes.map((node) => node.nodes[0].textContent), ['Prevenir', 'Comprender', 'Cuidar']);
    assert.equal(root.querySelector('.defeat-actions__retry').textContent, 'Volver a recorrer');
    assert.equal(root.querySelector('.ending-credits').hidden, false);
    assert.equal(root.querySelector('.defeat-actions__menu').hidden, true);
    assert.equal(root.querySelector('.impact-message').hidden, true);
    assert.ok(!/[0-9%]/.test(root.querySelector('.defeat-reflection').textContent));
  } finally { globalThis.document = previous; }
});

test('acompañamiento con histéresis: no alterna en el umbral y retoma al acercarse', () => {
  const gate = new FollowDistanceGate();
  assert.equal(gate.update(2), true);
  assert.equal(gate.update(NPC_MOVEMENT.stopDistance + .1), false);
  for (const distance of [5.4, 5.6, 4.5, 4, 3.6]) assert.equal(gate.update(distance), false);
  assert.equal(gate.update(NPC_MOVEMENT.resumeDistance), true);
  assert.equal(gate.update(4.5), true);
  assert.ok(NPC_MOVEMENT.companionSpeed < GAME_BALANCE.movement.speed);
  assert.equal(RESCUE_CONFIG.loadingSeconds, 9);
  assert.equal(RESCUE_CONFIG.placementSeconds, 4);
  assert.equal(FAUNA_CONFIG.evaluationSeconds, 2.5);
});

test('traslado acelera y frena sin cortar esquinas, y la pausa detiene la posición', () => {
  const route = [new THREE.Vector3(), new THREE.Vector3(4,0,0), new THREE.Vector3(4,0,4)];
  const walker = new WaypointWalker(route, NPC_MOVEMENT.companionSpeed, getTerrainHeight);
  walker.update(.05);
  assert.ok(walker.position.x > 0 && walker.position.x < NPC_MOVEMENT.companionSpeed * .05);
  const paused = walker.position.clone();
  walker.update(10, false);
  assert.deepEqual(walker.position.toArray(), paused.toArray());
  let previous = walker.position.clone(), maximumStep = 0, lastStep = 0;
  for (let i = 0; i < 1000 && !walker.finished; i++) {
    walker.update(.05);
    lastStep = Math.hypot(walker.position.x - previous.x, walker.position.z - previous.z);
    maximumStep = Math.max(maximumStep, lastStep);
    assert.ok(walker.position.x <= 4);
    if (walker.position.z > 0) assert.equal(walker.position.x, 4);
    assert.equal(walker.position.y, getTerrainHeight(walker.position.x, walker.position.z));
    previous.copy(walker.position);
  }
  assert.equal(walker.finished, true);
  assert.ok(lastStep < maximumStep * .5);
});

test('cámara de rescate externa al inicio/medio/final; completo y omitido restauran el mismo estado', () => {
  function run(skipAt, terrainHeight = terrain) {
    const f = rescueFixture(terrainHeight);
    const visibleRig = new THREE.Group(), hiddenRig = new THREE.Group();
    hiddenRig.visible = false; f.camera.add(visibleRig, hiddenRig);
    const parent = f.camera.parent;
    const originalTruck = createFireTruck();
    originalTruck.position.y = terrainHeight(originalTruck.position.x,originalTruck.position.z);
    const truckBounds = [new THREE.Box3().setFromObject(originalTruck),new THREE.Box3().setFromObject(f.companion.truck)];
    f.tour.rescue.interact(f.tour.carrier.position.clone());
    f.tour.rescue.interact(f.tour.veterinarian.object.position);
    f.tour.rescue.continueDialogue();
    assert.equal(visibleRig.visible, false);
    let frames = 0;
    const sampled = new Set();
    while (f.flow.currentStage !== 'rescue-arrival' && frames < 5000) {
      if (skipAt === f.flow.currentStage) { f.tour.rescue.skip(); break; }
      if (f.flow.currentStage === 'rescue-ready') f.tour.rescue.continueDialogue();
      f.tour.rescue.update(1/60, f.camera.position, false);
      animateCharacters(f.world,1/60,f.camera.position,false);
      f.world.updateMatrixWorld(true);
      if (f.tour.rescue.cameraLocked) {
        sampled.add(f.flow.currentStage);
        const box = new THREE.Box3().setFromObject(f.tour.carrier).expandByScalar(.15);
        assert.equal(box.containsPoint(f.camera.position), false, 'la cámara queda fuera de la caja');
        assert.ok(f.camera.position.distanceTo(f.tour.veterinarian.object.position) > 2);
        assert.ok(f.collisions.canOccupy(f.camera.position, RESCUE_CAMERA.clearance));
        assert.ok(f.camera.position.y >= terrainHeight(f.camera.position.x, f.camera.position.z) + RESCUE_CAMERA.groundClearance - .01);
        assert.equal(f.camera.parent, parent);
        for (const truckBox of truckBounds) assert.equal(truckBox.containsPoint(f.camera.position),false,'la cámara queda fuera de ambos camiones');
        assert.equal(new THREE.Box3().setFromObject(f.tour.veterinarian.object).containsPoint(f.camera.position),false);
        if (f.flow.currentStage === 'rescue-walk') {
          const rig = characterRig(f.tour.veterinarian.object);
          rig.arms.forEach((arm,index)=>{
            const grip=f.tour.carrier.getObjectByName(index===0?'carrier-grip-left':'carrier-grip-right').getWorldPosition(new THREE.Vector3());
            assert.ok(arm.end.getWorldPosition(new THREE.Vector3()).distanceTo(grip)<1e-6);
          });
        }
      }
      frames++;
    }
    assert.equal(f.flow.currentStage, 'rescue-arrival');
    assert.equal(f.tour.rescue.cameraLocked, false);
    assert.equal(visibleRig.visible, true);
    assert.equal(hiddenRig.visible, false);
    assert.ok(f.collisions.canOccupy(f.camera.position));
    assert.equal(f.tour.carrier.parent, f.tour.rescue.view.station.socket);
    assert.equal(f.tour.animals.fox.parent, f.tour.carrier);
    f.tour.rescue.continueDialogue(); f.tour.rescue.continueDialogue(); f.tour.rescue.skip();
    assert.equal(f.completed, 1);
    return { position: f.camera.position.toArray(), quaternion: f.camera.quaternion.toArray(), stage: f.flow.currentStage, sampled };
  }
  for (const terrainHeight of [terrain, getTerrainHeight]) {
    const full = run(null, terrainHeight);
    for (const stage of ['rescue-loading', 'rescue-walk', 'rescue-placing']) {
      assert.ok(full.sampled.has(stage));
      const skipped = run(stage, terrainHeight);
      assert.deepEqual(skipped.position, full.position);
      assert.deepEqual(skipped.quaternion, full.quaternion);
      assert.equal(skipped.stage, full.stage);
    }
  }
});

test('créditos del cierre reutilizan el menú y vuelven al panel sin iniciar otra partida', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: (tag) => new DialogElement(tag) };
  try {
    let starts = 0, resumes = 0, returns = 0;
    const menu = new MainMenu(new DialogElement(), { onStart: () => starts++, onResume: () => resumes++ });
    menu.hide(); menu.showCredits(() => returns++);
    assert.equal(menu.creditsPanel.hidden, false);
    assert.equal(menu.mainPanel.hidden, true);
    assert.equal(menu.root.classList.contains('hidden'), false);
    menu.creditsPanel.nodes[0].nodes.at(-1).listeners.get('click')();
    assert.equal(returns, 1);
    assert.equal(starts, 0); assert.equal(resumes, 0);
    assert.equal(menu.root.classList.contains('hidden'), true);
  } finally { globalThis.document = previous; }
});

const { InvestigationTour } = await import('../src/game/narrative/investigation-tour.ts');
const { InvestigationProgress, INVESTIGATION_STATIONS, INVESTIGATION_RETURN_ROUTE, INVESTIGATION_SETTINGS } = await import('../src/game/narrative/investigation-data.ts');
const { DiscoverableSystem } = await import('../src/game/narrative/discoverables.ts');

test('investigación: las ocho combinaciones avanzan sin penalizar y conservan tres respuestas únicas', () => {
  for (let mask = 0; mask < 8; mask++) {
    const progress = new InvestigationProgress();
    assert.equal(progress.answer(1, 0), false);
    assert.equal(progress.answer(0, 2), false);
    for (let i = 0; i < 3; i++) {
      const option = (mask >> i) & 1;
      assert.equal(progress.answer(i, option), true);
      assert.equal(progress.answer(i, option), false);
      assert.equal(progress.answers[i].answer, INVESTIGATION_STATIONS[i].options[option]);
    }
    assert.equal(progress.count, 3);
  }
});

function investigationFixture() {
  const companion = new ReinforcementView(getTerrainHeight);
  companion.moveCompanion(INVESTIGATION_STATIONS[0].route[0]);
  const camera = new THREE.PerspectiveCamera(60, 16/9, .1, 100);
  camera.position.copy(companion.companionPosition).add(new THREE.Vector3(1,1.7,0));
  const notes = new Map();
  let question, completed = 0;
  const dialogues = [];
  const tour = new InvestigationTour(companion, camera, getTerrainHeight, {
    showQuestion: (...args) => { question = args; },
    unlockEntry: (note) => notes.set(note.id, note),
  }, (text) => dialogues.push(text), () => {}, () => {}, () => completed++);
  return { tour, companion, camera, notes, dialogues, get question() { return question; }, get completed() { return completed; } };
}

function completeInvestigation(fixture, mask = 0) {
  const { tour, companion, camera } = fixture;
  assert.equal(tour.interact(camera.position), true);
  assert.match(fixture.dialogues[0], /Encontraron algunos indicios/);
  tour.continueDialogue();
  for (let i = 0; i < 3; i++) {
    assert.equal(tour.navigationTarget.label, INVESTIGATION_STATIONS[i].title);
    for (let step = 0; step < 200; step++) tour.update(.1, companion.companionPosition, false, false);
    camera.position.copy(INVESTIGATION_STATIONS[i].position).add(new THREE.Vector3(.8, 1.7, .8));
    assert.equal(tour.interact(camera.position), true);
    const original = camera.quaternion.clone();
    tour.update(INVESTIGATION_SETTINGS.inspectionSeconds / 2, camera.position, true, false);
    assert.ok(camera.quaternion.angleTo(original) > .01);
    tour.update(INVESTIGATION_SETTINGS.inspectionSeconds, camera.position, true, false);
    assert.equal(tour.stage, 'question');
    const [, , options, answer, done] = fixture.question;
    assert.equal(options.length, 2);
    const feedback = answer((mask >> i) & 1);
    assert.ok(feedback.length > 20);
    done();
  }
  assert.equal(tour.stage, 'conclusion');
  assert.match(fixture.dialogues.at(-1), /Contener el fuego fue una parte/);
  assert.equal(fixture.notes.size, 3);
  for (const note of fixture.notes.values()) assert.equal(note.sources.length, 2);
  tour.continueDialogue();
  assert.match(tour.objective, /Regresá al puesto/);
  for (let step = 0; step < 200; step++) tour.update(.1, companion.companionPosition, false, false);
  camera.position.copy(companion.companionPosition).add(new THREE.Vector3(1, 1.7, 0));
  assert.equal(tour.interact(camera.position), true);
  assert.equal(tour.stage, 'closing');
  assert.equal(fixture.completed, 0);
}

test('recorrido real, notas, brújula y cierre completo/omitido dejan el mismo estado y cámara', () => {
  const full = investigationFixture(), skipped = investigationFixture();
  completeInvestigation(full);
  completeInvestigation(skipped, 7);
  full.tour.update(INVESTIGATION_SETTINGS.closingSeconds / 2, full.camera.position, true, false);
  assert.equal(full.completed, 0);
  full.tour.update(INVESTIGATION_SETTINGS.closingSeconds, full.camera.position, true, false);
  skipped.tour.finish();
  assert.equal(full.tour.stage, 'complete');
  assert.equal(skipped.tour.stage, 'complete');
  assert.equal(full.completed, 1);
  assert.equal(skipped.completed, 1);
  full.tour.finish(); skipped.tour.finish();
  assert.equal(full.completed, 1);
  assert.ok(full.camera.position.distanceTo(skipped.camera.position) < 1e-8);
  assert.ok(full.camera.quaternion.angleTo(skipped.camera.quaternion) < 1e-7);
  assert.equal(new InvestigationProgress().count, 0);
  assert.equal(investigationFixture().tour.view.object.visible, false);
});

test('las ocho combinaciones completan también el controlador y el cierre nunca se repite', () => {
  for (let mask = 0; mask < 8; mask++) {
    const fixture = investigationFixture();
    completeInvestigation(fixture, mask);
    fixture.tour.finish(); fixture.tour.finish();
    assert.equal(fixture.completed, 1);
    assert.equal(fixture.tour.progress.count, 3);
  }
});

test('sesión: victoria solo después del rescate y de iniciar el cierre; reinicio sin estado heredado', () => {
  const session = new GameSession();
  session.beginContainment(); session.beginCompanionDialogue(); session.beginEpilogue();
  const flow = session.postFire;
  flow.meetCompanion(); flow.requestAssistance(); flow.startCare(); flow.finishCare(); flow.closeCare(); flow.meetForFauna();
  for (const stage of ['fauna-walk-a','fauna-refuge','fauna-dialogue-a','fauna-walk-b','fauna-dialogue-b','fauna-radio','vet-arriving','vet-evaluating','vet-dialogue','carrier','carrier-carrying','rescue-identification','rescue-loading','rescue-ready','rescue-walk','rescue-placing','rescue-arrival','rescue-complete','investigation-meeting']) assert.equal(flow.advanceFauna(stage), true);
  session.win(); assert.equal(session.isOver, false);
  session.beginClosing(); assert.equal(session.isClosing, true);
  assert.equal(session.isOver, false);
  session.win(); session.win();
  assert.equal(session.isVictory, true);
  assert.equal(session.currentPhase, 'results');
  const restarted = new GameSession();
  assert.equal(restarted.currentPhase, 'mission');
  assert.equal(restarted.postFire.rescueCompleted, false);
  assert.equal(restarted.isOver, false);
});

test('compañero espera y paneles/foco de ventana pausan recorrido e inspección', () => {
  const { tour, companion, camera } = investigationFixture();
  tour.interact(camera.position); tour.continueDialogue();
  const position = companion.companionPosition.clone();
  tour.update(5, new THREE.Vector3(30,0,30), false, false);
  assert.equal(tour.isWaiting, true);
  assert.deepEqual(companion.companionPosition.toArray(), position.toArray());
  tour.update(5, camera.position, true, false);
  assert.deepEqual(companion.companionPosition.toArray(), position.toArray());
  tour.update(20, camera.position, false, false);
  camera.position.copy(INVESTIGATION_STATIONS[0].position).add(new THREE.Vector3(1,1.7,0));
  tour.interact(camera.position);
  const rotation = camera.quaternion.clone();
  tour.update(20, camera.position, true, true);
  assert.equal(tour.stage, 'observing');
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
});

test('estaciones y recorridos son transitables con terreno, camiones, puestos y veterinario', () => {
  const collision = new CollisionSystem();
  collision.addCircle(context.fireTruckPosition, 2);
  collision.addCircle(REINFORCEMENT_LAYOUT.truckStop, 2.9);
  new AssistanceView(getTerrainHeight).show(collision);
  collision.addRectangle(RESCUE_CONFIG.station, 1.9, 1.2);
  collision.addCircle(new THREE.Vector3(-9.3,0,10), .4);
  for (const route of [...INVESTIGATION_STATIONS.map((station) => station.route), INVESTIGATION_RETURN_ROUTE]) {
    const walker = new WaypointWalker(route, 1, getTerrainHeight);
    while (!walker.finished) {
      assert.equal(collision.canOccupy(walker.position, .45), true, `bloqueado en ${walker.position.toArray()}`);
      walker.update(.05);
      assert.equal(walker.position.y, getTerrainHeight(walker.position.x, walker.position.z));
    }
  }
  for (const station of INVESTIGATION_STATIONS) assert.equal(collision.canOccupy(station.position, .45), true);
});

test('las estaciones no cambian los cinco hallazgos opcionales; no hay resultados al entrar a la recorrida', () => {
  const discoveries = new DiscoverableSystem(() => 0);
  assert.equal(discoveries.totalCount, 5);
  discoveries.discover('drought');
  assert.equal(discoveries.foundCount, 0);
  const session = new GameSession();
  session.win(); assert.equal(session.isOver, false);
  session.beginContainment(); session.beginCompanionDialogue(); session.beginEpilogue();
  session.win(); assert.equal(session.isOver, false);
  session.beginClosing(); assert.equal(session.isClosing, false);
});

test('tarjeta real exige una respuesta y una confirmación; desbloquea notas una sola vez', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: (tag) => new DialogElement(tag) };
  try {
    let closes = 0, finishes = 0;
    const log = new Bitacora(new DialogElement(), () => closes++);
    const station = INVESTIGATION_STATIONS[0];
    log.showQuestion(station, station.question, station.options, () => 'Devolución', () => finishes++);
    log.close(); assert.equal(closes, 0);
    assert.equal(log.requiresAnswer, true);
    log.choices.nodes[1].listeners.get('click')();
    assert.equal(log.requiresAnswer, false);
    assert.equal(finishes, 0);
    log.close(); log.close();
    assert.equal(finishes, 1); assert.equal(closes, 1);
    log.unlockEntry(station); log.unlockEntry(station);
    assert.equal(log.unlockedEntries.length, 1);
  } finally { globalThis.document = previous; }
});

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

function rescueFixture(terrainHeight = terrain) {
  const terrain = terrainHeight;
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

test('rescate completo: entrega única, zorro dentro, traslado externo y animal visible al cierre', (t) => {
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
  tour.rescue.update(5, new THREE.Vector3(60,0,60), true);
  assert.equal(tour.rescue.cameraLocked, true);
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
      const aboveStation = Math.abs(corner.x-station.object.position.x) < 0.95 + .07 && Math.abs(corner.z-station.object.position.z) < 0.6 + .07 && corner.y >= station.object.position.y + RESCUE_CONFIG.stationTop;
      if (!aboveStation) assert.ok(f.collisions.canOccupy(corner,0.07), `la caja transportada evita obstáculos durante los giros suaves: ${corner.toArray()} vet ${tour.veterinarian.object.position.toArray()} yaw ${tour.veterinarian.object.rotation.y}`);
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
