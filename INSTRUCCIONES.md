# Instrucciones de desarrollo · Primera Línea

Presentación e instalación mínima: [README](README.md). Equipo, atribuciones y fuentes educativas: [CREDITOS](CREDITOS.md).

## Arquitectura y estructura

```text
src/
  app/          main.ts (integración, entrada y bucle), styles.css
  game/
    narrative/  progresión, recorridos, escenas, textos y configuraciones
    player/     manguera, agua, salud, brazos y transporte en primera persona
    fire/       fuentes, extinción, propagación y partículas
    npc/        guía y modelo humano provisional
    world/      terreno, colisiones, vehículos, fauna, puestos y efectos
    game-session.ts   fase global y condiciones de finalización
    game-stats.ts     registro interno conservado; no se presenta como rendimiento final
    balance-config.ts balance de combate y del jugador
  ui/           bitácora, brújula, HUD y menú/créditos
  audio/        gestor y archivos MP3 locales
  assets/       vegetación y rocas GLB locales
  dev/          bancos de prueba aislados
tests/          v2-flow.test.mjs y páginas de previsualización
```

Los controladores narrativos separan el orden de las etapas de sus objetos visuales. `WaypointWalker` recorre polilíneas sin recortar esquinas; `getTerrainHeight(x,z)` apoya personajes y jugador en el relieve. Las colisiones se resuelven en X/Z. Los actores usan corredores preparados, no navegación automática por obstáculos.

## Misiones y estados

`GameSession`: `mission → reinforcements → companion-dialogue → review → closing → results`. Las derrotas (`player`, `house` y la condición forestal heredada) solo se aceptan en combate; V2 no usa el umbral de la antigua ruta bosque. `interventionClosed` no significa `isOver`: las escenas posteriores deben seguir actualizándose.

`MissionDirector` conserva el orden acceso → radio → vivienda → bosque. Cada incidente aparece al habilitarse su objetivo. Oleadas libres y propagación están desactivadas en V2; no activar las opciones heredadas para ajustar el ritmo de NPC.

`PostFireProgression` valida asistencia, fauna, recogida/entrega y rescate. La asistencia se completa una vez. En salud reducida hay recuperación gradual; con salud completa se usa una revisión breve sin lesión. No se incorpora selección de tratamientos ni instrucciones médicas.

`FaunaTour` coordina compañero, refugio y aviso único al veterinario. `WildlifeRescue` controla identificación → carga → diálogo de partida → traslado → colocación → llegada → encuentro de investigación. Durante el traslado cinematográfico el jugador observa desde fuera: no conduce al veterinario mediante su distancia a la cámara. Fuera de escenas, el acompañamiento conserva espera por distancia.

`InvestigationTour`: introducción → caminata/observación/pregunta por estación → conclusión → regreso → cierre → completado. El orden fijo es sequía, restos de asado y colilla. Las dos respuestas permiten avanzar después de una devolución; se conservan internamente sin puntajes. Las fichas usan la bitácora existente y fuentes oficiales. Los cinco hallazgos opcionales tienen un contador independiente.

No abrir el cierre final desde el fin del combate ni desde el rescate: el panel aparece tras terminar u omitir la cinemática final. El éxito presenta un mensaje de concientización y los botones **Volver a recorrer** y **Créditos**; las derrotas explican lo ocurrido y permiten reintentar. No se muestran tablas, tiempos ni métricas de rendimiento. `GameStats`, agua, riesgo, salud y los estados narrativos se conservan para no alterar la lógica existente. Se retiraron únicamente el compositor y formateadores de estadísticas finales sin consumidores.

## Parámetros de movimiento

Centralizados en `src/game/narrative/npc-movement.ts`, objeto `NPC_MOVEMENT`:

| Parámetro | Valor | Uso |
| --- | --- | --- |
| `companionSpeed` | 2.5 m/s | Compañero en fauna, rescate e investigación |
| `veterinarianSpeed` | 2.5 m/s | Llegada del veterinario |
| `loadedVeterinarianSpeed` | 2.2 m/s | Traslado del transportín con el animal |
| `stopDistance` | 5.5 m | Detener acompañamiento por distancia |
| `resumeDistance` | 3.5 m | Retomar; debe ser menor que el anterior |
| `acceleration` | 4.5 m/s² | Arranque y frenada al terminar una ruta |
| `turnResponse` | 6 | Interpolación exponencial del giro |
| `crewTravelSeconds` | 3.8 s | Traslado de bomberos desde las puertas |

El jugador conserva 3.2 m/s (`GAME_BALANCE.movement.speed`). Los NPC caminan algo más despacio para poder alcanzarlos. `FollowDistanceGate` mantiene la espera entre ambos umbrales; reduce el ritmo al acercarse al límite. Los paneles bloqueantes congelan posición y reloj de recorrido, sin desplazamiento residual. Al cambiar rutas, volver a verificar objetos y actores, también el volumen del transportín durante giros.

La llegada de apoyo conserva 15 s totales: el camión se detiene a los 7 s, el equipo aparece a los 8 s y completa su traslado a los 11.8 s. `ReinforcementView` conserva curvas suaves de movimiento y un final determinista. No se aceleran carga (9 s), colocación (4 s), evaluación (2.5 s), asistencia (7 s) ni revisión sana (2.5 s).

## Cámara y secuencia de rescate

`src/game/narrative/rescue-camera.ts` contiene `RESCUE_CAMERA`:

- `offset = (3.2, 2.6, -2)`: desplazamiento externo en coordenadas del mundo respecto del veterinario, al costado y por detrás del avance general hacia el oeste. Es estable y no depende de los giros de la caja.
- `lookHeight = 1.1`: altura del punto observado sobre el veterinario.
- `response = 5`: suavidad exponencial de cámara y orientación.
- `clearance = 0.3`: separación respecto de obstáculos/caja.
- `groundClearance = 1.8`: altura mínima sobre terreno.
- `returnPosition = (-7.8, 0, 10.4)`: salida transitable; la altura se calcula con terreno + 1.7 y la mirada se orienta al veterinario.

La cámara conserva su padre original; nunca se agrega al transportín. El controlador oculta temporalmente los hijos de primera persona y restaura sus visibilidades anteriores. Comprueba colliders, caja y terreno; busca alternativas externas si el desplazamiento preferido está ocupado. También muestrea el tramo interpolado. Si la vista de entrega ya está dentro de un objeto, sale directamente a una posición segura antes de continuar interpolando.

El bloqueo comienza al confirmar la identificación y termina al apoyar el transportín en el puesto. El comentario de partida sigue siendo un diálogo bloqueante. `Espacio` o **Omitir** ejecutan la misma secuencia en pasos fijos hasta la llegada, sin duplicar recompensas ni dejar el animal en otro padre. El diálogo de llegada continúa normalmente y después se devuelve el control; la posición final no depende de haber omitido. No se reproducen sonidos nuevos ni se cambia el estado de silencio.

## Escenas, personajes y textos

### Primera pasada de dirección artística

Los tres roles usan `src/game/npc/character-model.ts`. `createCharacter('brigadista' | 'salud' | 'fauna')` devuelve una raíz lógica estable, con un hijo `character-visual` y articulaciones explícitas de hombro, codo, cadera y rodilla. El torso tiene hombros y cintura diferenciados; cuello, rostro mínimo, casco con borde, bolsillos, botas y bandas completan la silueta. SALUD/FAUNA se identifican mediante texto delante/detrás, chaleco y equipo; el sanitario lleva un botiquín. Se retiraron las cruces del sanitario y del botiquín del puesto. No se incorporan emblemas institucionales.

Dónde ajustar el aspecto:

- `CHARACTER_STYLE`: altura de cadera/hombros, ancho de hombros, longitudes de brazo/antebrazo/muslo/pantorrilla, amplitud y frecuencia espacial de caminata, flexión y mirada. Las proporciones del torso, rostro y casco están junto a sus geometrías en `createCharacter`; al cambiar longitudes revisar también las prendas y el agarre.
- `src/game/world/visual-style.ts`: `VISUAL_PALETTE`, materiales compartidos (pintura, tela, goma, metal, vidrio), primitivas reutilizadas y rótulos locales de canvas. Los rótulos se almacenan por texto y no se regeneran por frame.
- `characterRig`, `setCharacterGesture` y `setCharacterCarrier`: acceso explícito a articulaciones y poses. Asistencia/veterinario ya no buscan brazos por coordenadas ni agregan chalecos sobre otro torso.
- `animateCharacters`: se llama después de las reglas de movimiento y antes de renderizar. La fase de pasos avanza por distancia horizontal real; `strideLength = 1.45` controla la cadencia, `legSwing = .42`, `armSwing = .32`, `kneeFlex = .48` controlan amplitudes. En reposo se vuelve a una postura neutra. Los tobillos compensan el ángulo de pierna para mantener las botas horizontales. Es una caminata estilizada, sin bloqueo físico exacto de pies sobre cada pendiente.

La animación modifica únicamente hijos visuales: no mueve la raíz de misión, colliders ni cámara. La cabeza gira suavemente hacia el punto de vista durante diálogos/atención, limitada por `headTurn`. Se omiten como pasos los desplazamientos de reinicio/teletransporte. Las animaciones no modifican tiempos de atención, carga, evaluación, refuerzos ni recorrido.

El transportín tiene sockets `carrier-grip-left/right` y `carrier-player-grip-left/right`. La pose del veterinario usa una solución de dos segmentos para colocar ambas manos sobre los agarres durante el traslado y los giros. `CARRIER_CARRY_POSE` en `world/animal-carrier.ts` fija altura **1.18** y avance **.85**; la altura evita el roce con la mesa sin cambiar la ruta. Al terminar de colocar la caja se libera la pose. La recogida en primera persona conserva sus posiciones y usa sus sockets propios. Revisar visualmente el gesto de carga/colocación al modificar proporciones; el alcance de los brazos es finito.

`src/game/world/truck-model.ts` construye la base común de ambos camiones: cabina, ventanas azul oscuro, puertas/manijas/espejos, guardabarros, llantas/neumáticos, parrilla/faros/paragolpes, persianas de compartimientos, conexiones, manguera, escalera y bandas. `BOMBEROS` es texto local, sin insignias. `TRUCK_STYLE`, las dimensiones de las piezas y la paleta permiten ajustar proporciones/materiales. La carrocería conserva ancho 2.4 y extremos longitudinales -2.84 / +2.6; el acople conectado sobresale ligeramente del lateral. El camión inicial usa tres círculos de colisión alineados con el vehículo (`registerTruckCollision`), en lugar del antiguo círculo central. El apoyo conserva su collider y sus puntos de llegada.

`TRUCK_ANCHORS` ofrece puertas, conexiones, equipo, manguera y techo. `truckAnchorWorld` obtiene posiciones de montaje. Los dos focos de baliza existentes se montan en sockets del techo, sin una tercera baliza ni luces nuevas por detalle. Las salidas de personajes y el rodeo mantienen sus coordenadas en `REINFORCEMENT_LAYOUT.companionDoor`, `sectorDoor`, `crewAroundTruck`; son puntos de staging junto a las puertas, no nuevas rutas.

`PreparationSequence(fireTruck, collisionSystem)` mantiene el orden traje → manguera → conexión. El equipo completo cuelga de un soporte junto al camión; la manguera ocupa un compartimiento lateral abierto, y el acople se identifica con AGUA. Las posiciones de referencia de `PREPARATION_TASKS` se conservan; la cercanía y los mensajes se calculan sobre `interactionPosition`, la proyección al suelo del objeto montado. La radio permanece en su punto original y con apoyo hasta el suelo. Recarga y encuentros no cambian. Si se altera la envolvente del vehículo, revisar colliders, sockets y accesibilidad de estas tareas.

La luz hemisférica en `src/app/main.ts` pasa a intensidad **1.5** y relleno inferior **0x56605a** para conservar detalle en tela y goma en sombra. Niebla, luz principal y atmósfera mantienen sus valores. No se añaden luces dinámicas de detalle.

Banco visual nuevo: con Vite, abrir **`/tests/art-preview.html`**. Permite orbitar, comparar frente/lateral/atrás de ambos camiones y ver personajes quietos, caminando, con gesto de atención o con transportín. Los bancos `/tests/assistance-preview.html` y `/tests/rescue-preview.html` también actualizan las articulaciones para comprobar las escenas reales.

Verificación de esta pasada: pruebas de jerarquía/raíz estable, materiales/geometrías compartidos, cadencia/reposo, contacto de ambas manos en movimiento, envolvente y sockets del camión, montaje fijo de preparación y conservación de posiciones/radio. Las comprobaciones del rescate animan los nuevos modelos y verifican matemáticamente cámara fuera de ambos camiones/caja/personaje, manos en agarres y recorrido completo/omitido. Esto no confirma calidad visual: no había navegador conectado. Queda revisar manualmente NPC quieto/caminando/atendiendo/cargando, ambos camiones en tres vistas, sombras, lectura de rótulos, preparación/recarga y refuerzos/rescate en producción.

| Edición | Archivo y parámetros |
| --- | --- |
| Introducción y cielo/luces | `src/app/main.ts`: `cinematicShots`, niebla y luces; `intro-cinematic.ts` para su reloj |
| Refuerzos | `reinforcement-sequence.ts`: tiempos; `world/reinforcement-view.ts`: `REINFORCEMENT_LAYOUT`, puertas y rodeo del camión |
| Asistencia y cámara sentada | `world/assistance-view.ts`: `ASSISTANCE_LAYOUT`, `CARE_VIEW_SETTINGS`; `assistance-scene.ts`, `care-sequence.ts` |
| Brazos y venda | `player/care-arms-view.ts`: geometría y revelado; venda hija del antebrazo |
| Sendero y refugio | `fauna-config.ts`: `routeA`, `routeB`, `refugeRoute`, `veterinarianRoute` |
| Rescate | `wildlife-rescue-config.ts`: rutas, puntos, escala del zorro y duraciones; `world/wildlife-rescue-view.ts`: carga/colocación |
| Modelos procedurales | `world/fauna-animals.ts`, `veterinarian-view.ts`, `animal-carrier.ts`, `wildlife-station.ts`, `npc/guide-npc.ts` |
| Textos y fuentes de fauna | `fauna-education.ts`: `RESCUE_TEXT`, `FOX_NOTE`, `OTHER_FAUNA_NOTES` |
| Estaciones, preguntas y cierre | `investigation-data.ts`: `INVESTIGATION_STATIONS`, `INVESTIGATION_RETURN_ROUTE`, `INVESTIGATION_SETTINGS`, `INVESTIGATION_CLOSING_SHOTS` |
| Geometrías de indicios | `world/investigation-view.ts`; ampliación de colilla en bitácora/estilos |
| Hallazgos opcionales | `discoverables.ts`: `DISCOVERABLES`; no habilitar los placeholders del epílogo antiguo |
| Brújula, tarjetas y menú | `src/ui/hud/objective-compass.ts`, `bitacora.ts`, `menus/main-menu.ts` |
| Panel final | `src/ui/ending-panel.ts`: contenido; `src/app/main.ts`: plantilla y `finishExperience`; `styles.css`: `.awareness-ending`, `.awareness-ideas` |

Las rutas están en `src/game/narrative/`, salvo donde se indica otro directorio. Reservar los nuevos corredores en `isFaunaArea`/`isReinforcementArea` si se mueven escenas; actualizar colliders y probar también carga tardía de modelos GLB. Las rutas actuales evitan casa, camiones y puestos.

`INVESTIGATION_SETTINGS.inspectionSeconds = 1.5`; `closingSeconds = 10`. No hay una duración total forzada ni cuenta regresiva. La referencia de 4:19 corresponde a la partida anterior comunicada por el equipo; hay que cronometrar otra con estos ajustes. No se amplió el recorrido ni se añadieron misiones.

## Combate, agua y efectos

`src/game/balance-config.ts` es la configuración principal. La extinción conserva el cálculo resistencia / potencia. Común: 1 / 0.4 = **2.5 s**, 10 unidades de agua; crítico: 1.8 / 0.4 = **4.5 s**, 18 unidades. Consumo: 4 unidades/s, solo con impacto válido. Un tanque contiene 100. No se consume sin alcance/puntería válida; el último frame se limita al agua y trabajo restantes. Los refuerzos no suman focos al jugador. Estos valores están comprobados por simulación, no por una medición visual.

- `hose.interactionRadius = 4`: alcance de intervención; `water.drainPerSecond`: consumo.
- `player.damagePerSecond = 5`, `player.dangerRadius = 4`: exposición del jugador.
- `house.exposureToIgnite = 60`, `exposureDecayPerSecond = 2.5`: riesgo de vivienda.
- `player/hose-view.ts`: `HOSE_SPRAY_RANGE = 5.2`, `HOSE_SPRAY_SPREAD = 0.22`, `HOSE_SPRAY_PARTICLE_COUNT = 22` (solo aspecto visual).
- `fire/fire-source.ts`: `FIRE_WATER_SPLASH_PARTICLE_COUNT = 14`, `FIRE_WATER_SMOKE_DURATION = 0.75`; pools reutilizados.

### Fuego estilizado y señalización

La columna y el cono invertido provenían de `MissionDirector.createMarker`: un cilindro de 3.2 de alto y un cono girado atravesaban cada foco. Se eliminó esa representación 3D. Las referencias `accessFire`/`criticalFires`, posiciones lógicas, progresión y navegación de la brújula permanecen. No se añadieron nuevas etiquetas flotantes: brújula y texto de objetivo distinguen el destino. La radio no cambia en esta pasada.

Los círculos blancos eran siete sprites por foco, con textura radial de centro casi blanco (`255,245,175`) y mezcla aditiva. Al superponerse saturaban el color; además flotaban entre 0.65 y más de 2 unidades de altura. Una luz de intensidad base 6 y alcance 8 reforzaba el resplandor. No había una silueta de lengua de fuego.

`src/game/fire/flame-view.ts` reemplaza esos sprites por una única malla por foco, con varias lenguas distribuidas alrededor de la base. Cada lengua tiene tres hojas cruzadas de doble cara, perfil irregular ancho/estrecho y punta que se cierra. Los vértices se deforman con ondas ascendentes; altura, ancho, velocidad y fase varían entre lenguas y posiciones del mundo. El material usa un shader sencillo naranja/rojo con interior amarillo cálido, transparencia normal, profundidad de escritura desactivada, bordes suavizados y niebla. No hay mezcla aditiva en las llamas ni bloom global. La introducción reutiliza esta misma representación para su fuego distante, conservando su cámara, reloj y audio.

`src/game/fire/fire-source.ts` conserva resistencia, intensidad lógica, impactos y partículas. Humo gris con entrada/salida de opacidad suave y chispas pequeñas siguen respondiendo al viento. Las chispas usan textura con borde transparente y descarte alfa, evitando cuadrados grandes. Las texturas procedurales se almacenan y comparten; salpicaduras y vapor reutilizan sus pools.

Configurar `FireSystem.setVisualSurface` **antes** de crear focos: recibe `terrainHeight` y `canBurnAt`. En producción usa el terreno real y `CollisionSystem.canOccupyXZ`. Se muestrean una vez las bases de cada hoja y, si un punto coincide con un sólido, se busca un punto de combustión libre dentro del desplazamiento visual máximo. No se mueve `source.object.position`: alcance de agua, misión, riesgo y daño siguen usando la referencia original. Una lengua sin sitio libre no se dibuja; no aumentar ese desplazamiento sin revisar alcance/obstáculos. Los cuatro focos actuales se verificaron con sus colliders y conservan todas sus lenguas.

Parámetros en **`src/game/fire/fire-visual-config.ts`**, objeto `FIRE_VISUAL`:

| Grupo | Valores iniciales | Ajuste |
| --- | --- | --- |
| Cantidad | `commonTongues: 9`, `criticalTongues: 12` | Densidad de lenguas; usar enteros positivos |
| Geometría | `crossedPlanes: 3`, `heightSegments: 7` | Vistas cruzadas y resolución; reducir para menor costo |
| Tamaño | `height: 1.85`, `width: .42`, `spread: .7`, `criticalScale: 1.12` | Altura, anchura, dispersión y escala crítica |
| Perfil | `widthProfile` | Anchos desde la base hasta la punta; conservar la punta en 0 |
| Movimiento | `sway: .13`, `animationSpeed: 2.4`, `windLean: .16` | Ondulación, velocidad y respuesta al viento |
| Color/opacidad | `red`, `orange`, `yellow`, `opacity: .86` | Paleta y transparencia; mantener el núcleo cálido sin blanco |
| Apoyo | `baseClearance: .025`, `obstacleMargin: .26`, `maxVisualOffset: 1.8` | Separación del suelo y búsqueda junto a sólidos; el margen también considera el ancho real de la lengua |
| Humo | `smokeCount: 5`, `smokeStartHeight: 1.35`, `smokeRise: 2.1`, `smokeOpacity: .3` | Cantidad, nacimiento, ascenso y opacidad |
| Apariencia de humo | `smokeBaseSize`, `smokeGrowth`, `smokeDark`, `smokeLight` | Tamaño, crecimiento y variación gris |
| Chispas | `emberCount: 18`, `emberSize: .035`, `emberColor`, `emberRiseSpeed: .55` | Buffer de partículas, tamaño, color y velocidad |
| Luz | `lightIntensity: 1.9`, `lightDistance: 6`, `lightHeight: 1`, `lightColor` | Una luz puntual cálida por foco, sin sombras dinámicas nuevas |
| Extinción visual | `response: 18`, `finishTailSeconds: 1.1` | Suavidad al reducir altura/cantidad/opacidad y duración final; mantener la cola suficiente para el vapor de .75 s |

El trabajo de extinción y el consumo siguen en `GAME_BALANCE`: común 2.5 s/10 unidades y crítico 4.5 s/18 unidades por impacto continuo, comprobados por simulación. La altura, número de lenguas visibles y luz disminuyen conforme baja la resistencia. Al llegar a cero, `isActive` e intensidad lógica pasan inmediatamente a falso/cero y la luz se apaga. El grupo visual puede permanecer hasta 1.1 s para acabar llamas, vapor y salpicaduras: no causa daño, no consume agua y no duplica focos ni eventos. `activeDuration` no incluye esa cola. Las cicatrices y humo residual de `BurnedGroundSystem` permanecen independientes.

Cada foco tiene un material de llama y un buffer reutilizado de posiciones/fuerza, no una geometría/material/luz por lengua ni nuevas asignaciones visuales por frame. Las normales no se recalculan porque el shader es sin iluminación; la luz puntual ilumina únicamente el entorno. La malla conserva límites amplios para no recortar puntas al ondular.

Verificación realizada: build y suite automatizada. Se comprobaron proyecciones geométricas desde ocho ángulos, reutilización de buffers/material, apoyo por vértice en relieve, separación de una roca sin mover el foco lógico, focos de misión con obstáculos reales, reducción parcial/final, viento, eventos únicos, consumo/tiempos y refuerzos completos/omitidos. Esas comprobaciones no renderizan WebGL ni miden FPS.

Banco manual: con `npm run dev`, abrir **`/tests/fire-preview.html`**. Presenta cuatro focos simultáneos (comunes/críticos y uno junto a una roca), órbita libre, distancias cercana/lejana, agua mantenida con E y contención de refuerzos. El agua de ese banco se dirige automáticamente al foco seleccionado; la puntería real y la brújula se prueban en la partida.

No hubo navegador conectado en esta entrega. Quedan pendientes la compilación del shader en GPU y la revisión visual: reconocimiento como fuego sin marcadores, silueta desde varios lados, capas transparentes con varios focos, transición durante extinción, humo/chispas y lectura a distancia. Revisar también la introducción, acceso → radio → vivienda → bosque, victoria/derrotas y contención por apoyo en producción. No se modifican animales ni estaciones educativas; el README permanece breve.

`terrain.ts`: `TERRAIN_MAP_HALF_SIZE`, `TERRAIN_SEGMENTS`, `TERRAIN_HEIGHT_AMPLITUDE`, `FLAT_AREAS`, `TERRAIN_COLORS`. El camino se integra en colores de vértices; `environment.ts` reúne fondo serrano y formaciones de referencia. Los árboles usan geometría procedural; arbustos, pasto jugable y rocas conservan GLB locales en `main.ts`. `vegetation-state.ts` oscurece la vegetación y `burned-ground.ts` conserva cicatrices/humo residual. No restaurar el paisaje al terminar el combate. Los límites de marcas/humo y sus duraciones se editan en esos módulos.

## Paisaje serrano y recuperación de preparación

### Causa y corrección de la regresión

La rama de `createPointVisual` usada con el camión nuevo retornaba solamente un aro de señalización, eliminando las representaciones anteriores. El equipo pasó a ser una pieza plana sobre una persiana y la manguera se colocó atrás; además, los mensajes seguían usando puntos de suelo distintos de esos objetos. No era un fallo de las tareas ni de su orden, sino de su representación y montaje.

- `world/preparation-equipment.ts`: `createSuitStand` construye soporte, chaqueta, mangas, reflectantes, pantalón, botas y casco. El soporte sigue visible después de equiparse; desaparece el hijo `stored-suit`. Su anclaje `truck-preparation-suit` se calcula desde la posición de referencia al estacionar el vehículo.
- `world/truck-model.ts`: `hose-rack` ahora está en el lateral izquierdo, dentro de un compartimiento abierto. `stored-hose` contiene las vueltas de manguera y se oculta al recogerla. `connection-cap` desaparece al conectar y aparece `connected-hose`, con un tramo corto y rótulo CONECTADA. No se simula toda la manguera.
- `narrative/preparation-sequence.ts`: mantiene el radio 2.4, valida orden y proximidad y registra la finalización una sola vez. Los modelos físicos se ven antes de hablar con la guía; `setAvailable(false)` bloquea F y oculta indicadores, no el equipo. La manguera en primera persona sigue habilitándose después de la conexión, como antes.
- El soporte y el compartimiento tienen colliders pequeños. Los círculos del camión inicial siguen su eje longitudinal y dejan accesibles los laterales. No se desplazan radio, recarga ni los encuentros narrativos.

### Organización y ajustes del paisaje

`src/game/world/landscape-config.ts` concentra:

| Parámetro | Valor inicial | Efecto |
| --- | --- | --- |
| `ridgeSegments` / `ridgeDepthSegments` | 76 / 12 | Resolución de cada cadena; reducir ambos para menor calidad |
| `ridgeHeight` | 1 | Multiplicador de altura de fondo; no altera el suelo jugable |
| `apronRings` | 8 | Resolución radial de la continuación no transitable del suelo |
| `detailDensity` | 1 | Densidad decorativa; 0 elimina esos detalles y no cambia combustible |
| `maxDetailClusters` | 90 | Presupuesto de candidatos antes de descartar zonas reservadas |
| `grassPerCluster` | 5 | Briznas agrupadas por candidato aceptado |
| `treeTrunkRadius` | .32 | Tronco y collider; la copa no bloquea al jugador |
| `canopyScale` | 1 | Tamaño de los grupos de copa |
| `sky`, `fogNear`, `fogFar`, `cameraFar` | 0xb9bbaa, 48, 125, 150 | Separación del fondo y visibilidad |

`LANDSCAPE_COLORS` concentra tierra, ocre, gris, verde seco, follaje, corteza, camino y capas serranas. `TREE_PLACEMENTS`, `BUSH_PLACEMENTS` y `ROCK_PLACEMENTS` conservan las ubicaciones anteriores; no cambiarlas para aumentar densidad decorativa.

- **Fondo:** `sierra-backdrop.ts` genera cinco cadenas de relieve conectadas con varios picos, perfiles cruzados y extremos descendentes. `RIDGE_LAYERS` fija orientación, extensión, semilla y capa cercana/lejana. Todas quedan fuera del área jugable. Una continuación del suelo se une a los vértices exactos del perímetro existente y cubre el vacío hasta el fondo; no tiene colisiones y los límites del jugador no cambian. Ya no se usan conos aislados como montañas.
- **Suelo y camino:** `terrain.ts` conserva exactamente `getTerrainHeight`; solo cambia los colores por vértice y combina variaciones de tierra/ocre/gris/verde seco. `road-layout.ts` contiene los mismos puntos del camino y su ancho; la distancia al eje suaviza la transición con la tierra. Se retiran las antiguas láminas planas superpuestas para evitar flotación/intersecciones en las lomas. Las manchas quemadas iniciales siguen en el color del suelo y las cicatrices de extinción siguen en `burned-ground.ts`.
- **Árboles:** `sierra-vegetation.ts` crea tres variantes de tronco, ramas y copas agrupadas irregulares, con geometrías y materiales compartidos. Mantienen posición, altura de referencia, orden e índices del combustible anterior. Los colliders se reducen al tronco. `VegetationStateSystem` sigue registrando cada árbol; al registrar, comparte clones de material dentro de un árbol pero los aísla entre plantas, conservando quemado individual.
- **Recursos revisados:** se inspeccionaron mallas, materiales, texturas y límites de los GLB locales. `TreeHigh001.glb` usa 36 vértices y una silueta muy estrecha/alta; queda conservado como recurso, pero ya no representa los árboles del mapa. `Bush001 (1).glb` (34 vértices) se reutiliza, ajustando altura, cuerpo al collider y tinte determinístico con `styleSierraBush`. `Rock001.glb` y `Grass001.glb` también se mantienen. Esa inspección de datos no es una revisión visual renderizada.
- **Detalle:** `landscape-decoration.ts` genera grupos seleccionados de pasto, piedras y ramas en tres lotes `InstancedMesh`, con semillas fijas y apoyo según relieve. No proyectan sombras individuales. `decorativePlacements` fija los grupos y `isLandscapeReserved` protege camino, zona segura, asistencia/fauna/refuerzos, estaciones, hallazgos y focos. Cambiar esas reservas al mover objetivos; las briznas no deben tapar huellas, colilla ni grietas.

La decoración no se registra en `FireSystem` ni en `VegetationStateSystem`: no agrega combustible, daño, superficie ni métricas. Su pasto sí puede oscurecerse de forma persistente por exposición visual al fuego. Los 15 árboles combustibles conservan `ignitionDistance = 5.5`, `ignitionTime = 10 + (índice % 4) * 3`; arbustos y pasto jugable mantienen sus registros visuales previos. No se habilitan propagación ni oleadas ni se alteran misiones/duraciones.

### Comprobaciones y revisión visual

Pruebas automatizadas: estados de traje/manguera/conexión, disponibilidad antes de la consigna, orden y repetición, accesibilidad de los tres puntos rodeando la carrocería, relieve conectado fuera del mapa, costura exacta del suelo, alturas jugables sin cambios, repetibilidad de decoración, reservas, instancing sin sombras individuales, combustible intacto y quemado persistente/aislado. Siguen pasando refuerzos completos/omitidos, asistencia, recorridos NPC y cámara/traslado del zorro. Se ejecutaron build y la suite de pruebas; no son mediciones de FPS ni pruebas visuales.

Con `npm run dev`, abrir `/tests/landscape-preview.html`: permite orbitar, enfocar cada paso, completarlo, ver la manguera en primera persona al conectar y generar marcas de fuego. El banco muestra árboles procedurales y decoración; los GLB restantes y las reglas completas se revisan en producción.

No había navegador conectado para esta entrega. Queda revisar visualmente preparación antes/después, lectura de sus mensajes, sierras desde las cinemáticas y el sendero, integración del camino, variantes de árboles/arbustos, quemado y legibilidad de indicios. Recorrer en producción las tres tareas y recarga, asistencia, fauna/investigación y rescate completo/omitido; comprobar sombra, terreno, obstáculos y rendimiento en el equipo de demostración. El README se mantiene breve.

`world/wind-system.ts`: `WIND_CHANGE_INTERVAL`, `WIND_TRANSITION_SECONDS`, `WIND_PRESETS`. El viento mueve humo/brasas; sus multiplicadores de propagación quedan inactivos en el flujo V2. `ambient-ash.ts`, `ambient-wildlife.ts` y `fire-truck.ts` controlan partículas ambientales, aves y balizas, con buffers reutilizados.

## Sonidos y recursos

`src/audio/audio-manager.ts` administra audio local y silencio global; `AUDIO_VOLUMES` y `FIRE_AUDIO_FALLOFF_DISTANCE` ajustan mezcla/distancia. El navegador exige un gesto para iniciar audio. Se reutilizan viento, fuego, agua, recarga, sirena y derrota. No agregar una segunda sirena al apoyo. Los diálogos actuales son textuales.

Los GLB de `src/assets` contienen árboles, arbustos, pasto y rocas. Al agregar recursos, registrar procedencia/licencia en [CREDITOS](CREDITOS.md), cargar y normalizar tamaño, apoyar con `getTerrainHeight`, reservar corredores y registrar sus colisiones. No incluir `node_modules/` ni `dist/` en control de versiones.

## Pruebas

```sh
npm run test:v2
npm run build
git diff --check
```

Las pruebas de Node usan módulos reales TypeScript/Three.js, sustituyendo canvas de texturas y DOM. No renderizan WebGL. Cubren combate y derrotas, tiempo/agua, refuerzos completos/omitidos, ambas asistencias, fauna, recogida/entrega, caja/zorro, rutas, investigación y cierre. Las nuevas verificaciones cubren histéresis, velocidad/frenada, cámara externa y equivalencia del rescate omitido.

Prueba manual completa:

1. Preparar equipo y comprobar radio → vivienda → bosque. Provocar una derrota por salud y otra por casa; verificar explicación sin métricas y reintento limpio.
2. Ver y omitir refuerzos en partidas distintas. Comprobar bomberos sobre terreno, rodeo del camión y ausencia de sirenas duplicadas.
3. Probar asistencia con salud reducida y completa. Confirmar que 7/2.5 s y vendaje siguen iguales.
4. Seguir al compañero; alejarse más de 5.5 m, volver a unos 4.5 m (debe esperar) y acercarse a menos de 3.5 m (retoma). Abrir bitácora o diálogo mientras camina: no debe avanzar. Revisar giros y llegada a puntos.
5. Recoger y entregar la caja. Revisar cámara de rescate al inicio, mitad y final: veterinario, caja y camino visibles; sin atravesar cuerpo, caja, suelo ni puestos. Revisar también desde distintas posiciones de entrega.
6. Repetir omitiendo durante carga, caminata y colocación. Confirmar misma caja sobre mesa, zorro dentro, manos/manguera según visibilidad previa, orientación al puesto y control después del diálogo de llegada. Mantener F/Enter/Espacio para detectar saltos múltiples.
7. Completar las tres estaciones con ambas respuestas en partidas distintas; revisar notas y contador independiente. Regresar, ver y omitir el cierre de 10 s.
8. Leer el panel final en ventana grande y pequeña: sin métricas ni contenido oculto tras clics. Abrir Créditos, volver al panel y usar Volver a recorrer. Comprobar que se recrean todos los estados y modelos.
9. Repetir con audio silenciado, alternar ventana/pestaña y cronometrar una partida para medir el nuevo ritmo.

Bancos aislados en desarrollo: `/tests/assistance-preview.html` y `/tests/rescue-preview.html` (con `npm run dev`). Sirven para inspección, no reemplazan el flujo de producción.

## Limitaciones conocidas

- NPC, vivienda, vehículos y fauna son representaciones provisionales; las colisiones son 2D y no hay pathfinding.
- La cámara evita colliders registrados y la caja; decoraciones sin collider requieren revisión visual. La búsqueda de posiciones alternativas presupone el corredor preparado.
- El fuego no es una simulación física ni el rescate una instrucción de manipulación de fauna.
- Las pruebas automatizadas no verifican composición, legibilidad, sonido ni sensación del movimiento. Sin navegador conectado no se puede afirmar una revisión visual.
- Vite avisa que el bundle supera 500 kB; la compilación finaliza correctamente.
- Las fuentes educativas se conservan en CREDITOS y en fichas; no prueban la causa del incendio ficticio. Las procedencias/licencias de GLB y MP3 no estaban registradas en los archivos revisados.
