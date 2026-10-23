# Entorno virtual de incendios

Prototipo web 3D para una experiencia de concientización sobre la propagación de incendios. El proyecto utiliza Three.js para representar un mapa abierto con vegetación, una casa, focos de incendio y una herramienta de extinción.

## Requisitos

- Node.js 20 o superior.
- npm, incluido con Node.js.
- Un navegador moderno con soporte para WebGL, por ejemplo Chrome, Edge o Firefox.

No es necesario instalar Three.js manualmente. Las dependencias se instalan con `npm install`.

## Instalación

Desde la carpeta raíz del proyecto:

```powershell
cd C:\Users\Lucia\Downloads\Facultad\CDEV\Proyecto\CDEV
npm install
```

## Ejecutar en desarrollo

```powershell
npm run dev
```

Vite mostrará una dirección local, normalmente:

```text
http://localhost:5173
```

Para detener el servidor, presioná `Ctrl + C` en la terminal.

## Validar la compilación

```powershell
npm run build
```

Este comando ejecuta el chequeo de TypeScript y genera la versión de producción en `dist/`.

## Controles actuales

- En el menú inicial: seleccionar `Iniciar experiencia` y luego hacer clic sobre la escena para activar el control de primera persona.
- `W`, `A`, `S`, `D`: moverse.
- Mouse: mirar alrededor.
- `F` cerca de la guía: hablar y recibir la consigna inicial.
- `F` cerca de un punto de preparación: completar la tarea indicada, después de hablar con la guía.
- `E` mantenida: utilizar la manguera y reducir gradualmente el foco más cercano.
- `R` cerca del camión de bomberos: recargar el tanque de agua al 100%.
- `M`: silenciar o activar todos los sonidos.
- `ESC`: liberar el cursor.

El flujo inicial es: hablar con la guía junto a la zona segura → preparar el equipo en el camión → combatir el incendio. Al acercarse a la guía aparece `Presioná F para hablar`. El cuadro de diálogo se cierra con `Entendido` o `Enter`; hasta entonces no se muestran ni funcionan las tareas de preparación.

## Menú inicial

Antes de comenzar se muestra el menú de **PRIMERA LÍNEA**, con accesos a `Iniciar experiencia`, `Controles` y `Créditos`. La simulación y el audio permanecen detenidos hasta elegir `Iniciar experiencia`; después se requiere el clic habitual sobre la escena para bloquear el cursor e iniciar la experiencia.

Durante la partida, el botón `Menú` de la esquina inferior izquierda abre este mismo menú como pausa. `Continuar experiencia` reanuda la simulación sin reiniciar el progreso.

El panel de créditos presenta los integrantes y roles del Grupo 8. Estos textos se pueden modificar en `src/ui/menus/main-menu.ts`, dentro de `PROJECT_CREDITS` y `TEAM_MEMBERS`.

Después de la consigna hay que completar, en este orden y junto al camión, tres tareas de preparación: equiparse el traje, retirar la manguera y conectarla al camión. Los puntos son visibles en la escena y el checklist indica el progreso. Hasta completar la tercera tarea, `E` no funciona, la manguera permanece oculta, `R` no recarga y no se actualizan daño, riesgo de la casa, propagación ni oleadas.

Al conectar la manguera aparece el mensaje `Equipo listo. Contené el incendio.` y se habilitan todas las mecánicas de combate. La manguera solo funciona dentro del radio de interacción de un foco activo y consume agua únicamente mientras está apagándolo. El jugador comienza con 100 unidades de agua; al agotarse, el chorro deja de apagar fuego y el HUD indica que hay que recargar. La primera tarea de misión es apagar el foco inicial: recién entonces se habilitan las oleadas.

El camión de bomberos provisional se encuentra en la zona segura del noroeste del mapa. Al entrar en su radio de recarga aparece el mensaje `Presioná R para recargar agua`. La interacción elegida es una pulsación de `R`: recarga instantáneamente el tanque completo y muestra una confirmación en pantalla.

La barra vertical del lado derecho representa el agua disponible. La velocidad de consumo se puede ajustar en `src/game/player/water-tank.ts`, modificando la constante `WATER_DRAIN_PER_SECOND`: un número menor hace que el agua dure más y uno mayor, menos.

## MisiÃ³n principal y victoria

La experiencia tiene un objetivo finito: el brigadista en entrenamiento debe proteger la vivienda rural hasta que lleguen los refuerzos.

1. HablÃ¡ con la guÃ­a y completÃ¡ traje, manguera y conexiÃ³n al camiÃ³n.
2. Se activa el **Objetivo 1**, un foco de acceso con marcador naranja, lejos de la casa y el camiÃ³n. Apagalo por completo.
3. SeguÃ­ el **Objetivo 2** hasta la radio celeste junto al camiÃ³n y presionÃ¡ `F` para solicitar refuerzos.
4. Se activa el **Objetivo 3**, un foco crÃ­tico de marcador rojo cerca de la vivienda. Apagalo y esperÃ¡ a que el riesgo de la casa baje de 25%.
5. Comienza una cuenta regresiva de 30 segundos. Durante ella pueden aparecer hasta dos focos moderados con marcadores celestes y fuera de las zonas protegidas. Si jugador y vivienda siguen a salvo, la pantalla final muestra `La vivienda fue protegida`.

`MissionDirector` (`src/game/narrative/mission-director.ts`) centraliza estados, radio, focos narrativos y cuenta regresiva. Para balancear, ajustÃ¡ en ese archivo `ACCESS_FIRE_POSITION`, `CRITICAL_FIRE_POSITION`, `FINAL_HOLD_DURATION`, `FINAL_MAX_MODERATE_FIRES`, `FINAL_FIRE_POSITIONS` y `FINAL_FIRE_TIMES`.

## Vida ambiental y señales de emergencia

La atmósfera incorpora ceniza ambiental, aves estilizadas y balizas del camión, todos creados únicamente con geometrías de Three.js. La ceniza usa un único `THREE.Points` y un buffer reutilizado: se mueve con el viento y una fracción se concentra cerca de focos activos. Las aves son siluetas en V que vuelan lentamente y se alejan cuando un foco entra dentro de su radio de huida.

Las balizas roja y ámbar del camión permanecen apagadas durante el menú, la cinemática y el diálogo inicial. Se activan al completar la preparación, alternan con luces puntuales suaves y dan un destello discreto ante focos críticos u oleadas, sin volver a reproducir la sirena.

Constantes ajustables:

- `AMBIENT_ASH_PARTICLE_COUNT`, `AMBIENT_ASH_SPEED` y `AMBIENT_ASH_NEAR_FIRE_RATIO` en `src/game/world/ambient-ash.ts`.
- `AMBIENT_BIRD_COUNT`, `AMBIENT_BIRD_SPEED` y `AMBIENT_BIRD_FLEE_RADIUS` en `src/game/world/ambient-wildlife.ts`.
- `TRUCK_BEACON_FLASH_FREQUENCY` y `TRUCK_EMERGENCY_FLASH_SECONDS` en `src/game/world/fire-truck.ts`.

Para verificarlo, completá la preparación y activá un foco: observá la ceniza cerca del incendio, las aves cambiando de rumbo si están próximas y las balizas alternadas sobre el camión. Al terminar con victoria o derrota, los sistemas dejan de actualizarse y las balizas se apagan; reiniciar crea una partida y buffers nuevos.

## Viento y humo dinámico

El HUD muestra `Viento: flecha Dirección · Intensidad`. La flecha indica hacia dónde se desplazan el humo y las brasas. El patrón es determinístico: cambia de dirección lentamente cada cierto intervalo y, cuando ocurre, aparece una alerta breve indicando hacia dónde puede avanzar el fuego.

`src/game/world/wind-system.ts` concentra el balance: `WIND_CHANGE_INTERVAL` define la frecuencia de cambios, `WIND_TRANSITION_SECONDS` su suavidad y los preajustes `WIND_PRESETS` definen dirección e intensidad. En `src/game/fire/fire-system.ts`, `WIND_PROPAGATION_MIN_MULTIPLIER` y `WIND_PROPAGATION_MAX_MULTIPLIER` limitan el efecto sobre la exposición: el combustible a favor del viento recibe hasta un 10% más, el que está en contra hasta un 10% menos y el lateral queda cerca del valor normal.

El humo y las brasas de cada foco se desplazan gradualmente con la misma dirección. El ambiente agrega solo doce partículas ligeras, por lo que el efecto permanece visible sin un costo relevante. La bitácora incorpora una nota sobre el viento después de iniciar el flujo normal, y el cierre registra la última dirección predominante y la cantidad de cambios.

Para probarlo, completá el diálogo y observá el indicador durante la partida; esperá `WIND_CHANGE_INTERVAL` segundos para ver la alerta. Creá o mantené un foco activo para apreciar con mayor claridad el desplazamiento de humo y brasas.

## Cinemática inicial

El flujo de inicio es: **menú → cinemática → diálogo con la guía → preparación → misión**. Al seleccionar `Iniciar experiencia`, una cinemática de 12,5 segundos recorre las sierras, la zona segura, la vivienda y el foco lejano antes de abrir automáticamente el diálogo de la guía. El ambiente de viento acompaña la secuencia y la sirena suena una sola vez.

Se puede omitir en cualquier momento con `Espacio` o el botón `Omitir`. Esta es la opción reducida: lleva directamente al diálogo, conserva el estado de partida limpio y no activa incendios, daño ni misión antes de completar la preparación. `M` sigue silenciando o reactivando el audio durante la cinemática.

`src/game/narrative/intro-cinematic.ts` reúne `INTRO_CINEMATIC_DURATION` y la interpolación de cámara. Los planos, sus posiciones, objetivos y textos se definen como `cinematicShots` en `src/app/main.ts`; allí se pueden ajustar duración, encuadres y frases sin cambiar la lógica de la misión.

## Hallazgos educativos opcionales

El mapa incluye cinco descubribles opcionales: un cartel de prevención, una mochila junto al sendero, referencias de fauna en el bosque nativo, un árbol quemado y un punto de observación serrano. Al acercarse aparece `Presioná F para investigar`; el texto se abre en una tarjeta breve y el descubrible se registra una sola vez.

La tarjeta detiene únicamente el movimiento del jugador para poder leerla. La simulación, la misión y los incendios continúan, por lo que los hallazgos nunca son requisito para ganar. `B` abre la **bitácora** con los textos ya descubiertos y el HUD muestra `Hallazgos: X/5`. El resumen final también conserva este dato opcional.

Los textos, tipos visuales y posiciones se editan en `src/game/narrative/discoverables.ts`, dentro de `DISCOVERABLES`. Para sumar un sexto, agregá una definición con un `id` único, título, texto, posición X/Z y uno de los tipos visuales disponibles; el contador y la bitácora se actualizan automáticamente. La interfaz de tarjetas y bitácora está en `src/ui/bitacora.ts`.

La prioridad de `F` es: diálogo/preparación/radio de misión y luego el descubrible más cercano. Así los hallazgos no interrumpen objetivos obligatorios.

## Decisión de misión: vivienda o bosque nativo

Esta sección reemplaza el paso único de Objetivo 3 documentado arriba: desde esta versión, la prioridad se decide después de la radio.

Después de apagar el foco de acceso y usar la radio junto al camión, aparece una decisión obligatoria. Se puede elegir con el mouse o mediante `1` / `H` para **Priorizar la vivienda**, y `2` / `B` para **Priorizar el bosque nativo**. El panel no se puede cerrar sin elegir y pausa la partida mientras está visible.

- **Ruta vivienda:** activa un foco crítico señalado en rojo cerca de la casa. Hay que apagarlo, mantener el riesgo de la vivienda por debajo de 25% y resistir la espera de refuerzos.
- **Ruta bosque nativo:** señala en verde un sector de bosque alejado de la vivienda con dos focos críticos. Hay que extinguir ambos antes de llegar al umbral de vegetación afectada. La vivienda continúa siendo vulnerable, por lo que también puede causar derrota si se la descuida.

La ruta aparece junto al objetivo en el HUD y queda registrada en el resumen final, junto con las métricas ambientales. Las dos rutas son una ficción educativa: ante un incendio real se debe avisar a los servicios de emergencia y seguir las indicaciones de las autoridades.

La configuración de ambas ramas está centralizada en `src/game/narrative/mission-branch.ts`: `criticalFirePositions`, `criticalIntensity`, `finalHoldDuration`, `finalMaxModerateFires`, `finalFirePositions`, `finalFireTimes` y, para el bosque, `forestAffectedLimit` y `forestZone`. `mission-director.ts` reutiliza esa configuración para crear los focos, marcadores, espera final y victoria.

Para probarlas, completá la preparación, apagá el foco de acceso y usá la radio. Elegí una rama, extinguí sus focos señalizados y mantené con vida al jugador y a la vivienda durante la cuenta regresiva. La pantalla final informa la ruta elegida; la rama de bosque también puede terminar si se supera su límite de vegetación afectada.

## Escenario serrano procedural

El suelo se genera sin assets externos en `src/game/world/terrain.ts`. Usa un `PlaneGeometry` subdividido, una función determinística `getTerrainHeight(x, z)` y colores por vértice para formar lomas secas, sectores ocres y manchas de suelo carbonizado. La misma función apoya al jugador, la casa, el camión, NPC, preparación, radio, focos y vegetación sobre el relieve.

Los valores de apariencia se concentran en esos módulos:

- `TERRAIN_MAP_HALF_SIZE`, `TERRAIN_SEGMENTS` y `TERRAIN_HEIGHT_AMPLITUDE` en `terrain.ts` controlan extensión, detalle y altura de las lomas. `FLAT_AREAS` protege las superficies de casa y camión.
- `TERRAIN_COLORS` ajusta la paleta de suelo seco, ocre, verde apagado y ceniza.
- `environment.ts` crea el camino entre camión y casa, zona segura, parches quemados, formaciones rocosas y sierras lejanas. Sus colores están en `ENVIRONMENT_COLORS`.
- El cielo, la niebla de humo y las luces se ajustan al inicio de `src/app/main.ts` mediante `scene.background`, `scene.fog`, `ambientLight` y `directionalLight`.

Para verificar el terreno y las colisiones: recorré las lomas con `WASD`, comprobá que la cámara conserva una altura estable sobre el suelo y probá deslizarte contra casa, camión, árboles y rocas. Las colisiones siguen resolviéndose en X/Z en `collision-system.ts`, por lo que la elevación del terreno no altera sus radios ni bloquea las interacciones.

## Daño ambiental persistente

Cada foco extinguido deja una cicatriz circular irregular sobre el relieve y humo gris residual. El suelo usa `getTerrainHeight` para quedar separado del terreno sin parpadeos. Los árboles, arbustos y pasto cercanos se oscurecen de forma progresiva mientras hay fuego; tras la exposición quedan quemados y no recuperan su color al apagar las llamas.

`VegetationStateSystem` en `src/game/world/vegetation-state.ts` registra cada modelo vegetal, aplica estados `dry`, `burning` y `burned`, y calcula la cantidad de elementos dañados. `BurnedGroundSystem` en `src/game/world/burned-ground.ts` recibe los eventos de extinción del `FireSystem`, genera las marcas y acumula la superficie aproximada afectada. Ambas métricas aparecen en el HUD y en el resumen final.

Constantes de rendimiento y aspecto:

- `VEGETATION_FIRE_RADIUS`, `VEGETATION_IGNITION_SECONDS` y `VEGETATION_COLORS` controlan alcance, velocidad de daño y colores de la vegetación.
- `BURNED_GROUND_BASE_RADIUS` ajusta el tamaño de las cicatrices; la intensidad y duración del foco las amplían moderadamente.
- `RESIDUAL_SMOKE_DURATION`, `RESIDUAL_SMOKE_MAX_SOURCES` y `BURNED_GROUND_MAX_MARKS` limitan el humo y las marcas visibles.

Para probarlo, iniciá la misión, mantené la manguera sobre un foco hasta extinguirlo y observá la marca oscura y el humo tenue. Los elementos vegetales dentro del radio del foco cambian de tono y quedan carbonizados cuando ya no hay llamas cercanas.

## Audio

El audio se inicia después del primer clic sobre la escena, respetando las restricciones del navegador. Los sonidos locales de `src/audio/` se controlan desde `src/audio/audio-manager.ts`:

- `ambience-wind.mp3`: ambiente en loop y volumen bajo.
- `fire-loop.mp3`: loop que aumenta al acercarse a focos activos, habilitado al terminar la preparación, y se detiene sin focos o al terminar la partida.
- `water-spray.mp3`: loop solo mientras la manguera está extinguiendo realmente un foco.
- `truck-refill.mp3`: efecto único al recargar junto al camión.
- `siren.mp3`: loop de la sirena del camión durante la introducción y la preparación; se corta al conectar la manguera.
- `defeat.mp3`: efecto único ante cualquier derrota.

La constante `AUDIO_VOLUMES` en `src/audio/audio-manager.ts` reúne los volúmenes de todos los sonidos. `FIRE_AUDIO_FALLOFF_DISTANCE` controla a qué distancia el fuego alcanza su volumen mínimo.

## Salud y condiciones de derrota

El clic sobre la escena habilita el movimiento para acercarse a la guía. La simulación de incendio comienza al terminar el diálogo y la preparación. El jugador comienza con 100 puntos de salud. Cuando se acerca demasiado a un foco activo, pierde salud de forma gradual: la barra vertical junto al indicador de agua, en la esquina inferior derecha, cambia de verde a amarillo y rojo, mientras un viñeteado rojo aparece en los bordes de la pantalla. El efecto disminuye progresivamente al alejarse del fuego.

La partida termina si la salud llega a cero, con el mensaje `El fuego te superó`. También termina si un foco activo permanece cerca de la casa el tiempo suficiente: la exposición se acumula, disminuye lentamente al alejar o apagar el fuego y, al llegar al máximo, muestra `La casa fue alcanzada por el incendio`. En ese momento la casa se oscurece y muestra llamas y humo provisionales.

Al finalizar se presenta un **Resumen de la intervención** con el tiempo de supervivencia, focos apagados por completo, máximo de focos activos, oleadas iniciadas, máximo riesgo de la casa y agua total utilizada. El mensaje de reflexión cambia según el motivo de derrota. `Reintentar` y `Volver al menú` recargan una partida limpia; el segundo vuelve al menú inicial.

Tras cualquier derrota se detienen el movimiento, el consumo de agua, la extinción, el daño y la propagación. El botón `Reiniciar experiencia` recarga la página para iniciar una partida limpia.

Constantes de balance ajustables:

- `PLAYER_FIRE_DANGER_RADIUS` y `PLAYER_FIRE_DAMAGE_PER_SECOND` en `src/game/player/player-health.ts` controlan el radio peligroso y el daño recibido por segundo.
- `HOUSE_FIRE_DANGER_RADIUS`, `HOUSE_EXPOSURE_TO_IGNITE` y `HOUSE_EXPOSURE_DECAY_PER_SECOND` en `src/game/world/house-risk.ts` controlan el radio, tiempo de exposición y recuperación de la casa.
- `PREPARATION_TASKS` y `PREPARATION_INTERACTION_RADIUS` en `src/game/narrative/preparation-sequence.ts` definen las posiciones, orden y radio de los tres puntos de preparación junto al camión.
- `GUIDE_NPC_POSITION` y `GUIDE_NPC_INTERACTION_RADIUS` en `src/game/npc/guide-npc.ts` ajustan la ubicación y radio de interacción de la guía. El texto inicial y el mensaje posterior están en `src/game/narrative/intro-dialogue.ts`.
- `AUDIO_VOLUMES` y `FIRE_AUDIO_FALLOFF_DISTANCE` en `src/audio/audio-manager.ts` controlan los niveles y el alcance del sonido de incendio.
- `GameStats` en `src/game/game-stats.ts` centraliza las métricas mostradas en el cierre de la experiencia.
- `FIRE_SPAWN_INTERVAL` en `src/game/fire/fire-system.ts` define el intervalo entre oleadas de focos; está configurado en 18 segundos.
- `MAX_ACTIVE_FIRES_BEFORE_SPAWN` limita a tres los focos activos, incluidos los propagados. Las zonas de exclusión junto al jugador, camión y casa se configuran en el mismo archivo.

## Funcionalidades actuales

### Colisiones y ritmo de oleadas

El movimiento en primera persona usa `CollisionSystem` (`src/game/world/collision-system.ts`), un sistema 2D liviano sobre el plano X/Z. La casa usa una zona rectangular, mientras que el camión, los árboles grandes y las rocas usan zonas circulares. Si el jugador intenta atravesar un objeto, el sistema conserva el eje que sigue libre para permitir deslizarse por el borde.

El escenario arranca con un único foco para reducir la presión inicial. Las oleadas no avanzan durante la preparación ni al terminarla inmediatamente: se habilitan al apagar ese primer foco. Cada oleada válida muestra brevemente `Nuevo foco detectado`; no hay avisos cuando el límite de focos o una zona protegida bloquean una aparición.

Valores principales para ajustar el balance:

- `PLAYER_COLLISION_RADIUS` en `src/game/world/collision-system.ts`: radio personal del jugador frente a todos los obstáculos.
- `FIRE_SPAWN_INTERVAL` en `src/game/fire/fire-system.ts`: segundos entre oleadas (valor actual: `18`).
- `MAX_ACTIVE_FIRES_BEFORE_SPAWN` en el mismo archivo: cantidad máxima de focos activos, incluso los propagados (valor actual: `3`).
- `FIRE_SPAWN_EXCLUSION_PLAYER_RADIUS`, `FIRE_SPAWN_EXCLUSION_TRUCK_RADIUS` y `FIRE_SPAWN_EXCLUSION_HOUSE_RADIUS`: separaciones mínimas de seguridad para crear un foco.

- Escena 3D con Three.js y Vite.
- Movimiento en primera persona.
- Mapa abierto de prueba de aproximadamente 50 x 50 metros.
- Vegetación con modelos `.glb`:
  - Árboles.
  - Rocas.
  - Arbustos.
  - Pasto.
- Casa provisional creada con geometría de Three.js.
- Un foco inicial para introducir el combate antes de habilitar las oleadas.
- Llamas, humo, brasas y luz dinámica.
- Propagación gradual hacia vegetación combustible.
- Oleadas de focos: aparece uno cada 18 segundos después de apagar el foco inicial, con zonas de exclusión y un límite de tres focos activos.
- Manguera visible en primera persona.
- NPC guía provisional con diálogo inicial y mensaje de orientación posterior.
- Secuencia de preparación obligatoria con traje, manguera y conexión al camión, habilitada por la guía.
- Chorro de agua provisional.
- Tanque de agua de 100 unidades y barra vertical de estado.
- Extinción continua mientras se mantiene `E`, solo cuando hay agua y un foco dentro del radio.
- Camión de bomberos provisional con recarga por `R`.
- Límites de movimiento que impiden salir del terreno de 50 x 50 metros.
- Salud del jugador con daño por cercanía al fuego y viñeteado de alerta.
- Derrota por agotamiento de salud o por incendio acumulado de la casa.
- Pantalla de derrota con reinicio fiable de la experiencia.
- Ambiente, fuego, manguera, recarga, sirena y derrota con audio contextual; `M` silencia o activa el conjunto.
- HUD ambiental con:
  - Cantidad de focos activos.
  - Vegetación afectada.
  - Estado de expansión.
  - Riesgo aproximado para la casa.

## Estructura principal

```text
CDEV/
├── index.html
├── package.json
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── main.ts
│   │   └── styles.css
│   ├── assets/
│   │   └── *.glb
│   ├── audio/
│   │   ├── audio-manager.ts
│   │   └── *.mp3
│   ├── game/
│   │   ├── fire/
│   │   │   ├── fire-source.ts
│   │   │   └── fire-system.ts
│   │   ├── player/
│   │   │   ├── hose-view.ts
│   │   │   ├── player-health.ts
│   │   │   └── water-tank.ts
│   │   ├── narrative/
│   │   │   ├── intro-dialogue.ts
│   │   │   └── preparation-sequence.ts
│   │   ├── npc/
│   │   │   └── guide-npc.ts
│   │   ├── world/
│   │   │   ├── fire-truck.ts
│   │   │   ├── house-risk.ts
│   │   │   └── house.ts
│   │   └── game-session.ts
│   │   └── game-stats.ts
│   ├── ui/
│   │   └── menus/
│   │       └── main-menu.ts
│   └── world/
└── README.md
```

Las carpetas de `ui/` y `world/` ya están preparadas para separar la interfaz y el escenario a medida que el prototipo crezca.

## Modelos 3D

Los modelos actuales se encuentran en:

```text
src/assets/
```

Se utilizan archivos `.glb` porque pueden incluir el modelo, materiales y texturas en un único archivo. Para agregar un modelo nuevo:

1. Copiar el archivo `.glb` dentro de `src/assets/`.
2. Referenciarlo desde `src/app/main.ts` o desde el módulo correspondiente.
3. Ejecutar `npm run build`.
4. Probarlo con `npm run dev`.

Los recursos 3D deben tener una licencia compatible con un proyecto público. Guardar, cuando sea posible, la información de licencia y atribución junto con el recurso.

## Decisiones actuales del MVP

El proyecto busca representar la propagación de un incendio como una experiencia de concientización. El usuario puede intervenir y retrasar el avance del fuego, pero el incendio está pensado como un fenómeno que, a largo plazo, resulta inevitable.

La experiencia no tendrá una victoria tradicional. El usuario podrá:

- Recorrer el mapa abierto.
- Observar cómo el fuego avanza por distintos sectores.
- Apagar focos puntuales.
- Retrasar la propagación.
- Proteger temporalmente algunas zonas.

Sin embargo, la intervención no detendrá indefinidamente el incendio. La experiencia terminará cuando se alcance un umbral definido de afectación, por ejemplo:

- Una cantidad determinada de vegetación incendiada.
- Una cantidad de focos activos.
- La afectación de la casa.
- Un porcentaje crítico del mapa comprometido.
- El agotamiento de los recursos disponibles, en una versión posterior.

Por lo tanto, el usuario finalmente pierde, pero sus acciones pueden modificar cuánto tarda en llegar ese final y qué parte del entorno queda afectada. El objetivo es transmitir que controlar un incendio puede retrasar sus consecuencias, pero que una respuesta tardía o insuficiente puede volver inevitable la pérdida del entorno.

En el estado actual del prototipo:

- El mapa es abierto.
- El fuego puede propagarse en distintos sectores.
- Apagar un foco evita que ese foco siga activo.
- La experiencia termina si el jugador pierde toda la salud o si la casa acumula exposición crítica al incendio.
- El camión de bomberos es una representación provisional creada con geometrías simples de Three.js.
- La casa es actualmente un elemento de referencia visual.
- El agua es limitada y se recarga en el camión de bomberos.
- El combate contra incendios se habilita tras hablar con la guía y completar la preparación obligatoria junto al camión.

La condición final y sus umbrales se definirán antes de incorporarlos al código.

## Próximos pasos previstos

1. Mejorar la distribución y el realismo del mapa.
2. Reemplazar la casa provisional por un modelo con licencia compatible.
3. Mejorar el fuego, el humo y el impacto visual sobre el entorno.
4. Separar la lógica del mundo, el HUD y el estado del juego en módulos propios.
5. Mejorar el modelo y la señalización del camión de bomberos.
6. Ajustar el balance de agua, salud y exposición de la casa después de las pruebas de juego.
7. Agregar audio ambiental y sonidos del incendio.
8. Optimizar vegetación, sombras, modelos y carga de recursos.

## Problemas conocidos

- La manguera y el chorro de agua son representaciones provisionales.
- La casa todavía no usa un modelo 3D externo.
- La colisión con árboles, rocas y la casa todavía es básica.
- El fuego actualmente se propaga usando posiciones registradas, no una simulación física.
- Vite puede mostrar una advertencia sobre el tamaño del bundle; no impide la compilación.

## Flujo recomendado para trabajar en equipo

Antes de comenzar:

```powershell
npm install
```

Después de modificar el código:

```powershell
npm run build
npm run dev
```

No subir al repositorio:

- `node_modules/`
- `dist/`

Estas carpetas ya están excluidas mediante `.gitignore`.
