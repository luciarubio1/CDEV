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

Al conectar la manguera aparece el mensaje `Equipo listo. Contené el incendio.` y se habilitan todas las mecánicas de combate. Al mantener `E`, la manguera muestra un chorro de gotas celestes alineado con la cámara; solo consume agua y daña un foco cuando está dentro del radio de intervención y se lo está apuntando. Si no alcanza un foco, el chorro sigue visible pero no genera salpicaduras ni daño. Al impactar, aparecen salpicaduras y humo claro temporal, las llamas y su luz disminuyen con la intensidad, y al apagarlo por completo se muestra `Foco contenido`. El jugador comienza con 100 unidades de agua; al agotarse, el chorro se detiene y el HUD indica que hay que recargar. La primera tarea es apagar el foco de acceso; en V2 los siguientes incidentes dependen de objetivos, sin oleadas libres.

El camión de bomberos provisional se encuentra en la zona segura del noroeste del mapa. Al entrar en su radio de recarga aparece el mensaje `Presioná R para recargar agua`. La interacción elegida es una pulsación de `R`: recarga instantáneamente el tanque completo y muestra una confirmación en pantalla.

La barra vertical del lado derecho representa el agua disponible. La velocidad de consumo se puede ajustar en `src/game/balance-config.ts`, modificando `water.drainPerSecond`: un número menor hace que el agua dure más y uno mayor, menos.

### Ajuste del chorro y del impacto

Las constantes visuales de la manguera están en `src/game/player/hose-view.ts`:

- `HOSE_SPRAY_RANGE` (`5.2`): alcance visual máximo del agua. Para que llegue más lejos, aumentalo; el alcance de daño sigue siendo el radio usado por `extinguishNearest` en `main.ts`.
- `HOSE_SPRAY_SPREAD` (`0.22`): dispersión lateral al final del chorro. Un valor menor concentra el agua; uno mayor la abre.
- `HOSE_SPRAY_PARTICLE_COUNT` (`22`): cantidad de gotas reutilizadas. Aumentarlo hace el chorro más denso con un costo visual moderado.

En `src/game/fire/fire-source.ts`, `FIRE_WATER_SPLASH_PARTICLE_COUNT` (`14`) controla el pool de salpicaduras y `FIRE_WATER_SMOKE_DURATION` (`0.75`) la persistencia del humo claro. Para que el agua sea más potente sin cambiar su aspecto, ajustá `hose.extinguishPerSecond` en `src/game/balance-config.ts`; para que dure más, reducí `water.drainPerSecond`.

## Primera Línea V2: recorrido único y llegada de apoyo

El objetivo global de la V2 es una demostración narrativa de aproximadamente diez minutos. **Esta entrega incluye recogida, entrega, rescate acompañado y traslado al puesto de fauna.** Termina con el zorro al cuidado del equipo y un punto de encuentro para continuar con el compañero. La investigación de indicios y el cierre final quedan para las siguientes etapas.

El recorrido obligatorio es:

1. Llegada, diálogo con la guía y preparación del equipo.
2. Foco de acceso (naranja).
3. Solicitud de refuerzos por radio con `F`, junto al camión.
4. Foco de la vivienda (rojo).
5. Dos focos del bosque (verde).
6. Llegada automática de la unidad de apoyo, de 15 segundos.
7. Diálogo del compañero y devolución del control.
8. Objetivo **Reunite con tu compañero junto al camión**, señalado por la brújula. Con `F` asigna **Acercate al puesto de asistencia**.
9. Puesto con mesa, botiquín, asiento y sanitario. La brújula apunta al sanitario; cerca aparece **Presioná F para recibir asistencia**.
10. Atención: con salud reducida, 7 s de recuperación gradual y representación sencilla de vendaje; con 100 de salud, control breve de 2,5 s sin lesión ni pérdida de salud.
11. Objetivo **Reunite con tu compañero para revisar la fauna**. El compañero se ubica junto al inicio del sendero. `F` abre “Vamos a revisar el sendero. Algunos animales pudieron quedar desorientados.” Al cerrar ese diálogo comienza **Acompañá a tu compañero por el sendero**.
12. El compañero camina cerca del jugador y espera si se aleja. Un animal pequeño llega al refugio; después encuentran un zorro quieto que necesita evaluación.
13. Cerca del zorro, `F` avisa una sola vez al equipo de fauna. Tras la comunicación textual, se ve al veterinario recorrer el camino desde el puesto.
14. Después de evaluar al zorro, el veterinario pide el transportín. La brújula señala **Buscá el transportín junto al vehículo**.
15. `F` recoge el objeto original y lo une a las manos en primera persona. Objetivo: **Llevá el transportín al veterinario**. Cerca del equipo, `F` realiza una única entrega.
16. El veterinario identifica al zorro gris pampeano y realiza la colocación preparada en el transportín. Antes de partir explica el papel del equipo especializado.
17. Objetivo: **Acompañá al veterinario al puesto de fauna**. El veterinario lleva la caja con el zorro; espera si el jugador se aleja. El compañero acompaña por el corredor libre.
18. En el puesto se deposita el transportín y el zorro permanece visible, descansando y respirando. Se registra **Rescate acompañado completado** y se desbloquea su ficha en la bitácora.
19. El compañero propone revisar los indicios. La brújula señala el punto de encuentro cercano; esta entrega termina allí sin activar estaciones ni resultados.

Se reutilizan los sectores y focos de `mission-branch.ts`, pero no hay elección de ruta. El incidente de vivienda se crea al usar la radio; los del bosque se crean solo después de contener la vivienda. En la demostración se deshabilitan oleadas y propagación libre para conservar ese orden. No se usa el umbral de daño forestal ni la espera final heredados. Salud y riesgo de la casa pueden causar derrota durante el combate.

### Estados, tiempos y continuidad

`GameSession` distingue `mission → reinforcements → companion-dialogue → review`. Al cerrar la intervención, `interventionClosed` pasa a verdadero, se guarda `interventionSnapshot` con sus estadísticas y se congela su registro. `isOver` sigue en falso: las escenas posteriores continúan funcionando. El tiempo de recorrida se registra por separado en `explorationSeconds`. No se llama a `win()` ni se abre un resultado exitoso en esta entrega.

La llegada usa una cámara temporal fija, un camión que frena suavemente y dos bomberos procedurales que salen junto a las puertas. Uno se dirige al sector y el otro hacia la posición de regreso del jugador. El mensaje de radio aparece como subtítulo: “Unidad de apoyo ingresando por el camino. Te tenemos a la vista.” Se reutilizan balizas y recursos locales, sin nueva sirena ni reproducción de voz. `M` conserva el control de silencio.

`Espacio` o `Omitir` ejecutan el mismo finalizador que la reproducción completa. La contención ambiental avanza en pasos fijos también al omitir, de modo que se conservan posiciones finales, cámara, focos, superficies carbonizadas y humo residual. Los focos apagados por apoyo no incrementan el contador del jugador. Después de la secuencia se abre el diálogo del compañero; si falta salud, añade la propuesta de pasar por asistencia. Se cierra con botón o `Enter`.

En la recorrida posterior no se aplican daño, riesgo, incendios nuevos ni cuenta regresiva. Se ocultan manguera y alertas de combate. Los cinco hallazgos originales y la bitácora se preservan; las tres estaciones del epílogo anterior permanecen ocultas. No hay botón de resultados en este recorrido. El menú incluye `Reiniciar experiencia`, que recarga la página y recrea estado, personajes, vehículos y buffers.

### Dónde ajustar la llegada

- `src/game/narrative/reinforcement-sequence.ts`: `REINFORCEMENT_TIMING` fija duración total (`15` s), detención del camión (`7`), aparición del equipo (`8`) y llegada de bomberos (`14`). Mantener ese orden y una duración total de 12–18 s.
- `src/game/world/reinforcement-view.ts`: `REINFORCEMENT_LAYOUT` fija inicio/detención del camión, compañero, bombero del sector, cámara y regreso del jugador. `firstDoor`, `secondDoor` y `crewAroundTruck` ajustan las salidas y el rodeo del vehículo.
- `isReinforcementArea` reserva la franja del camino al cargar árboles, rocas, arbustos y pasto. Si se mueve la secuencia, ajustar también esa reserva y los colliders finales.
- `src/game/narrative/mission-director.ts`: `ACCESS_FIRE_POSITION`, radio y orden de etapas.
- `src/game/narrative/mission-branch.ts`: solo se consumen posiciones, intensidades y colores de los sectores existentes. Las propiedades heredadas de rutas/esperas se conservan para el trabajo del equipo, pero no participan de V2.

### Extinción: tiempos, consumo y valores ajustables

La intensidad inicial sigue controlando llamas, luz y exposición de combustible. La resistencia al agua es independiente y común a focos normales y de misión. Los de acceso usan `kind: 'common'`; vivienda y bosque usan `kind: 'critical'`. Una intensidad visual de 0,82 o 1,05 no cambia por sí sola el tiempo de extinción.

El cálculo real es:

```text
tiempo de impacto = resistencia al agua / hose.extinguishPerSecond
agua por foco = tiempo de impacto × water.drainPerSecond
intensidad restante = intensidad inicial × resistencia restante / resistencia inicial
```

En `src/game/balance-config.ts`:

| Parámetro | Valor | Efecto |
| --- | --- | --- |
| `hose.extinguishPerSecond` | 0.4 | Trabajo de extinción por segundo de impacto |
| `fire.waterResistance.common` | 1 | Foco común: 2,5 s y 10 unidades de agua |
| `fire.waterResistance.critical` | 1.8 | Foco crítico: 4,5 s y 18 unidades de agua |
| `water.drainPerSecond` | 4 (sin cambio) | Solo durante impacto válido, ~25 s por tanque |
| `hose.interactionRadius` | 4 m | Alcance de intervención |
| `movement.speed` | 3.2 m/s | Movimiento, sin cambio |
| `player.damagePerSecond` | 5 | Daño máximo por proximidad, sin cambio |
| `house.exposureToIgnite` | 60 s | Riesgo de vivienda, sin cambio |

No se aplica un descuento adicional al consumo. El último frame se limita al tiempo que necesita el foco y al agua disponible; las estadísticas reciben lo realmente consumido. Sin alcance o puntería válida, o al soltar `E`, se conserva el comportamiento existente de consumo y audio. Cada foco apagado se contabiliza una sola vez; los refuerzos no suman al jugador.

Los cuatro focos del recorrido (un común y tres críticos) requieren **16 s de impacto y 64 unidades de agua** si todos se apagan desde su resistencia inicial. No se modificaron propagación, daño ni riesgo para lograr esa reducción. La duración total de combate queda por medir jugando: el antiguo objetivo de tres minutos no se presenta como un tiempo observado tras este cambio.

Las pruebas ejecutaron los sistemas reales con pasos de 1/60, 1/30 y 0,1 s. Se observaron por simulación **2,500 s / 10,000 unidades** para un común y **4,500 s / 18,000 unidades** para un crítico. Son resultados de simulación programática, no mediciones de una partida jugada.

### Puesto de asistencia y progresión posterior

`GameSession.postFire` contiene un `PostFireProgression`: `companion → assistance → care-intro → care → care-outro → fauna-companion → fauna-briefed`. Los métodos validan el orden y rechazan repetir la recompensa. La asistencia se marca completada una sola vez; no finaliza la experiencia ni altera las estadísticas congeladas de intervención.

- `src/game/narrative/post-fire-progression.ts`: etapas y objetivos.
- `src/game/narrative/care-sequence.ts`: reloj y curva lineal de recuperación.
- `src/game/narrative/assistance-scene.ts`: diálogos, cámara, confirmación y conexión con salud.
- `src/game/world/assistance-view.ts`: objetos del puesto, sanitario, representación de atención y posiciones en `ASSISTANCE_LAYOUT`.
- `assistance.treatmentSeconds: 7`, `assistance.checkupSeconds: 2.5` y `assistance.interactionRadius: 2.4` en la configuración central.

El puesto aparece al hablar con el compañero después de los refuerzos. Está dentro de la franja reservada y despejada del escenario, apoyado con `getTerrainHeight`; mesa, asiento y sanitario tienen colisiones. Al completar la atención, se mueve también el collider del compañero junto a su modelo: no queda un bloqueo invisible en su posición anterior.

Con salud reducida se muestra “Ya estás en una zona segura. Sentate un momento, vamos a revisarte.” Tras confirmar con botón o `Enter`, el sanitario se acerca, aparece una representación de vendaje y la barra de salud sube gradualmente hasta 100. Termina con “Listo. Tu compañero te espera para revisar la zona.” Con salud completa, la variante usa “Estás bien. Terminamos la revisión; podés acompañar al equipo en la recorrida.” y no muestra vendaje ni resta salud.

La escena bloquea movimiento, menú, descubribles e interacciones ajenas, pero `M` sigue funcionando. No incorpora sonidos nuevos, medicamentos ni instrucciones médicas. `F` y `Enter` requieren una pulsación nueva: mantenerlas no encadena etapas. Al cerrar el diálogo final se devuelve el control en una posición libre de obstáculos y se orienta la cámara hacia el siguiente encuentro. La exploración, hallazgos originales y bitácora siguen disponibles fuera de la atención; no se activan daño, nuevos focos ni resultados automáticos.

### Vendaje en primera persona

Se eliminó el cilindro independiente del escenario y la cámara externa. La cámara se sitúa a la altura de los ojos del jugador sentado, anclada al asiento, y baja suavemente la mirada. El rig `CareArmsView` es hijo de esa cámara: incluye regazo, dos antebrazos, mangas, puños, manos y pulgares estilizados. Las cinco tiras de venda son hijas del antebrazo izquierdo; se revelan progresivamente sin cambiar de escala ni separarse de él. El sanitario se aproxima y hace un gesto breve con los brazos.

Las piezas entran suavemente por la parte inferior y se retiran durante el último 15% de la atención. La variante sana muestra los brazos sin vendaje. La manguera ya permanece oculta desde la llegada de refuerzos. Al cerrar la atención se oculta el rig y se recuperan la cámara y controles de recorrida.

Ajustes:

- `src/game/player/care-arms-view.ts`: jerarquía, posiciones locales y tamaño de antebrazos/manos/venda; entrada 0–12%, revelado 35–63%, retirada 85–100%.
- `CARE_VIEW_SETTINGS` en `src/game/world/assistance-view.ts`: altura de ojos `1.35`, desplazamiento vertical de mirada `0.43` y final de inclinación al 20% de la escena. El anclaje es `ASSISTANCE_LAYOUT.seat`.
- `assistance.treatmentSeconds` y `checkupSeconds` conservan 7 s y 2,5 s.

Se comprobó por cálculo de proyección desde la cámara real de atención que los centros de ambos antebrazos quedan en el encuadre inferior y sus vértices delante del near plane. **No es una inspección visual:** no hubo navegador disponible en esta sesión para observar el render. El banco `tests/assistance-preview.html` ahora incorpora la cámara a la escena para renderizar su rig de brazos y permite revisar ambas variantes.

### Fauna y veterinario

`FaunaTour` coordina estos pasos después de la conversación inicial:

```text
fauna-walk-a → fauna-refuge → fauna-dialogue-a → fauna-walk-b
→ fauna-dialogue-b → fauna-radio → vet-arriving → vet-evaluating
→ vet-dialogue → carrier
```

El animal pequeño, estilizado como un conejo, está junto a vegetación conservada y se aleja por un trayecto preparado hasta el refugio. Su recorrido no es un objetivo de persecución. El zorro tiene cuerpo, cabeza, hocico, orejas, patas, cola y respiración suave; no presenta sangre ni heridas. No se modifica salud ni se habilita fuego durante estos encuentros.

El aviso requiere una pulsación nueva de `F` cerca del zorro, después del comentario del compañero. La comunicación de radio es textual y queda registrada una sola vez. El veterinario aparece en su punto de salida junto al puesto, a distancia del animal, y se aproxima a pie; después realiza un gesto de evaluación de 2,5 s y pide el transportín. Este tiene base, techo, paredes ventiladas, puerta de barras y asa. La interacción cercana habilita su recogida para continuar el rescate acompañado.

Posiciones y ritmo:

- `src/game/narrative/fauna-config.ts`: `FAUNA_CONFIG.routeA`, `routeB`, `refugeRoute`, `veterinarianRoute`, `fox` y `carrier`.
- Compañero: `companionSpeed: 0.8` m/s y `followRadius: 5` m. Al superar ese radio se detiene y aparece **Tu compañero te espera**; al volver, continúa desde el mismo punto.
- Animal pequeño: `refugeSpeed: 1.2` m/s; veterinario: `veterinarianSpeed: 1.4` m/s; evaluación: `evaluationSeconds: 2.5`.
- `isFaunaArea` reserva el corredor de vegetación/rocas nuevas al cargar el mapa. Si se mueven recorridos, ajustar la reserva y volver a comprobar colisiones.
- `src/game/narrative/waypoint-walker.ts`: controlador compartido por compañero, animal y veterinario; avanza en metros y apoya cada posición con `getTerrainHeight`.
- `src/game/world/fauna-animals.ts`, `veterinarian-view.ts` y `animal-carrier.ts`: representación visual separada del flujo.
- `src/game/narrative/fauna-tour.ts`: encuentros, mensajes, aviso único y destino final de brújula.

La simulación recorrió los tramos y evaluación en **32,4 s**, sin lectura ni pausas por distancia. El objetivo de alrededor de un minuto contempla los diálogos y acompañamiento; no se midió jugando. Se conserva el movimiento del jugador durante los trayectos, y se pausa el avance de todos los personajes al abrir diálogo, bitácora, tarjetas o menú. Se reutilizan `F`, `Enter`, la brújula y los diálogos existentes, sin teclas nuevas ni audio adicional. Reiniciar recarga todos los modelos y estados de fauna, aviso, veterinario y transportín.

### Transportín, rescate acompañado y puesto de fauna

El transportín es **un solo objeto**: al recogerlo cambia de padre y pasa de su posición junto al vehículo al rig de la cámara. Las dos manos con mangas son hijas de la caja y sujetan sus laterales; la escala se mantiene. La manguera sigue oculta. Su collider original se retira para evitar un bloqueo invisible, y el movimiento comprueba tanto el cuerpo del jugador como la huella de la caja.

Al entregar con `F`, el veterinario comenta brevemente la identificación del animal. El jugador no captura ni manipula al zorro. Al confirmar, el veterinario se aproxima por el lateral, prepara la caja, levanta su puerta, realiza un gesto de evaluación y el zorro se desplaza suavemente hasta su interior. Se cierra la puerta y el equipo eleva la caja. Durante el traslado el animal es hijo del transportín y este es hijo del veterinario, por lo que no se separan ni se duplican.

El zorro se representa a escala fija de 0,65 respecto del modelo estilizado anterior para que quepa en una caja de 1,4 × 0,75 × 0,8 m. Se ajustó su pelaje hacia gris, con cara ocre y extremo oscuro de cola, de acuerdo con la descripción del SIB. No hay sangre, diagnóstico confirmado, alimentación, medicación ni minijuego.

Se conserva la libertad de caminar durante la secuencia; diálogos, bitácora, menú y pérdida de foco pausan el avance de personajes y las animaciones preparadas. El veterinario espera si el jugador queda a más de 5,5 m. El compañero sigue por puntos sin ocupar el espacio de trabajo; la caja evita el radio de colisión del camión en el trayecto de regreso.

El nuevo puesto está separado del sanitario: mesa verde, símbolo de fauna, suministros cerrados y espacio para el transportín. La colocación final es suave y mantiene al animal visible y respirando. La frase de cierre deja su evaluación a cargo del equipo, sin liberación inmediata ni promesa de recuperación. El registro de completado y la ficha son únicos; reiniciar recrea todos los estados y objetos.

### Textos educativos y bitácora

Se consultaron estas fuentes oficiales antes de redactar los datos:

- [BioCórdoba · campaña Convivir](https://biocordoba.cordoba.gob.ar/con-la-campana-convivir-ayudanos-a-cuidar-la-fauna-silvestre-de-la-ciudad-de-cordoba/): presencia del zorro gris pampeano en Córdoba y convivencia con fauna silvestre; atención a cargo de especialistas.
- [SIB de Parques Nacionales · Lycalopex gymnocercus](https://sib.gob.ar/especies/lycalopex-gymnocercus): nombre, origen autóctono, descripción y hábitos.
- [Parques Nacionales · ficha de Quebrada del Condorito](https://www.argentina.gob.ar/parquesnacionales/centro/parque-nacional-quebrada-del-condorito/ficha-del-area-protegida): cóndor andino (`Vultur gryphus`) y lagarto verde de Achala (`Pristidactylus achalensis`), incluidos solo como lectura opcional.

Las intervenciones se distribuyen entre identificación del zorro, preparación del traslado y conservación de refugios/alimento/hábitat al llegar. Las fuentes no se usan para diagnosticar al ejemplar de la escena. Al cerrar el rescate, `B` incorpora automáticamente **Fauna de Córdoba: zorro gris pampeano**, con nombre común/científico, presencia provincial, hábitos, hábitat y enlaces. **Otros habitantes de Córdoba** aparece como sección desplegable opcional con dos fichas de texto; no agrega animales al mapa ni alarga el recorrido obligatorio.

Los textos y referencias se centralizan en `src/game/narrative/fauna-education.ts`. Los enlaces se muestran en la bitácora y la ficha no se abre automáticamente.

### Dónde ajustar el rescate

- `src/game/narrative/wildlife-rescue-config.ts`: puntos, velocidades, radio de acompañamiento y duraciones. Carga/manipulación: `loadingSeconds = 9`; colocación final: `placementSeconds = 4`; traslado: `veterinarianSpeed = 0.7` m/s.
- `transportRoute`: recorrido del veterinario; `companionRoute`: acompañamiento; `station` y `stationTop`: puesto y altura de apoyo; `meeting`: encuentro posterior.
- `src/game/narrative/wildlife-rescue.ts`: transiciones e interacciones, espera/reanudación y evento único.
- `src/game/world/wildlife-rescue-view.ts`: aproximación, apertura de puerta, colocación, elevación y apoyo en mesa.
- `src/game/player/carrier-carry-view.ts`: posición de la caja en cámara, manos y comprobación adicional de colisión al caminar.
- `src/game/world/animal-carrier.ts`: medidas, geometría y puerta; `wildlife-station.ts`: objetos y apoyo del puesto.
- `src/game/narrative/post-fire-progression.ts`: etapas hasta `investigation-meeting`, `rescueCompleted` y contador único. `GameStats` guarda `accompaniedRescueCompleted` sin modificar la fotografía de estadísticas de combate.

Objetivo de ritmo: **60–90 segundos**, incluyendo búsqueda/retorno con la caja y lectura manual. La simulación midió **36,8 s** para animaciones y traslado, excluyendo ida/vuelta del jugador, lectura y espera por distancia. No es una duración medida jugando.

### Verificación y recorrido manual

Comprobaciones automáticas:

```powershell
npm run build
npm run test:v2
git diff --check
```

Las veintidós pruebas usan los módulos reales de misión, fuego, salud, riesgo, progresión, escena de asistencia, cámara y objetos Three.js. Sustituyen el canvas de texturas y el DOM de los diálogos. Verifican objetivos, refuerzos completos/omitidos, derrotas, tiempo/agua por foco, recuperación con salud reducida y completa, recompensa única, proyección del rig de brazos desde la cámara, espera/reanudación de recorridos, pausa de personajes, encuentros/aviso únicos, llegada gradual del veterinario, rutas libres, recogida/entrega únicas, manos/near clipping, eliminación del collider original, animal dentro de la caja, traslado, altura sobre la mesa con el terreno real, cierre único, ficha automática y encuentro final. Requiere Node 22.15+ por `registerHooks` (se ejecutó con Node 24.11.1). No reemplaza una partida con renderizado y controles reales.

Para comprobar a mano con `npm run dev`:

1. Completar preparación; apagar acceso, usar radio, apagar vivienda y después bosque. Revisar que la brújula cambie en ese orden y no aparezca elección.
2. Abrir/cerrar diálogo, tarjetas y `B` durante combate; confirmar pausa sin daño acumulado al volver. Verificar también `ESC`, cambio de ventana y teclas mantenidas.
3. Ver los 15 s completos: camión por el camino, balizas, dos bomberos y cámara estable. Repetir usando `Espacio` y usando el botón `Omitir`.
4. Comprobar el diálogo con salud completa y reducida; cerrar con `Enter` y con botón. Caminar hasta el compañero guiándose por la brújula y pulsar `F`.
5. Confirmar que no aparece resultado final ni investigación, que la recorrida no causa daño y que `M` sigue silenciando el audio.
6. Tras hablar con el compañero, seguir la brújula al sanitario y pulsar `F`. Confirmar atención y observar recuperación con cámara estable. Mantener `F` y `Enter` para comprobar que no encadenan etapas.
7. Cerrar la atención, seguir al compañero junto al sendero y hablar con `F`. Al cerrar el comentario, acompañarlo. Alejarse más de 5 m y volver: debe esperar y retomar sin saltar. Abrir `B` o una tarjeta durante un trayecto y comprobar que los personajes se detienen.
8. Observar el animal dirigirse al refugio y cerrar el comentario. Seguir al compañero hasta el zorro, leer el comentario y pulsar `F` para avisar. Repetir `F` no debe duplicar el aviso. Ver llegar al veterinario desde el puesto, cerrar su diálogo y comprobar brújula y transportín junto al vehículo. Ahora recoger con `F`, volver al veterinario y entregar con una pulsación nueva. Comprobar que no hay duplicados, que el zorro queda dentro y que el veterinario espera y retoma al alejarse/volver. Ver la colocación en el puesto, cerrar los dos comentarios finales y comprobar el nuevo punto de encuentro. Abrir `B` y revisar ficha, enlaces y sección opcional. No debe liberarse al animal ni abrirse resultados.
9. Probar derrotas durante combate (salud o casa); reiniciar desde menú y verificar que desaparecen apoyo, puesto y progreso de asistencia.

Para revisar **ambas variantes visuales sin repetir el combate**, hay un banco de prueba aislado que usa la escena real. Con `npm run dev`, abrir:

- `http://localhost:5173/tests/assistance-preview.html?health=reduced`: inicia con 50 de salud.
- `http://localhost:5173/tests/assistance-preview.html?health=full`: inicia con 100.

Pulsar `Recibir asistencia`, confirmar con botón o `Enter` y observar el resultado. Los enlaces permiten recrear la prueba limpia. Este banco no modifica la partida principal ni se incluye como entrada de la compilación de producción.

El build y las veintidós pruebas automáticas se ejecutaron. El inventario de herramientas no ofreció navegador en esta sesión: **no se inspeccionaron visualmente las manos y el transportín**, ni la colocación/traslado renderizados. Quedan pendientes controles reales, encuadres, transición del zorro, interacción de modelos y medición jugada de ritmo. Las pruebas geométricas y de estado no sustituyen esa revisión.

Para comprobar directamente esta entrega sin repetir el combate, con `npm run dev` abrir `http://localhost:5173/tests/rescue-preview.html`. Usa los objetos y controlador reales, comienza junto al vehículo con el transportín disponible y permite `WASD`, mouse, `F`, `Enter`, `B` y `Esc`. La página es un banco local separado de la entrada de producción. Su enlace de reinicio recrea la prueba limpia.

### Contenido educativo conservado para etapas posteriores

Las estaciones anteriores distinguen posibles fuentes de ignición (brasas y colilla) de condiciones que favorecen la propagación (sequía y vegetación seca); no afirman la causa de la partida. Sus referencias se conservan: [recomendaciones del SNMF](https://www.argentina.gob.ar/servicio-nacional-de-manejo-del-fuego/recomendaciones-para-prevenir-incendios-forestales) y [causas y propagación en SINAGIR](https://www.argentina.gob.ar/sinagir/incendio-forestal).

## Vida ambiental y señales de emergencia

La atmósfera incorpora ceniza ambiental, aves estilizadas y balizas del camión, todos creados únicamente con geometrías de Three.js. La ceniza usa un único `THREE.Points` y un buffer reutilizado: se mueve con el viento y una fracción se concentra cerca de focos activos. Las aves son siluetas en V que vuelan lentamente y se alejan cuando un foco entra dentro de su radio de huida.

Las balizas roja y ámbar del camión permanecen apagadas durante el menú, la cinemática y el diálogo inicial. Se activan al completar la preparación, alternan con luces puntuales suaves y dan un destello discreto ante focos críticos u oleadas, sin volver a reproducir la sirena.

Constantes ajustables:

- `AMBIENT_ASH_PARTICLE_COUNT`, `AMBIENT_ASH_SPEED` y `AMBIENT_ASH_NEAR_FIRE_RATIO` en `src/game/world/ambient-ash.ts`.
- `AMBIENT_BIRD_COUNT`, `AMBIENT_BIRD_SPEED` y `AMBIENT_BIRD_FLEE_RADIUS` en `src/game/world/ambient-wildlife.ts`.
- `TRUCK_BEACON_FLASH_FREQUENCY` y `TRUCK_EMERGENCY_FLASH_SECONDS` en `src/game/world/fire-truck.ts`.

Para verificarlo, completá la preparación y activá un foco: observá la ceniza cerca del incendio, las aves cambiando de rumbo si están próximas y las balizas alternadas sobre el camión. Al terminar con victoria o derrota, los sistemas dejan de actualizarse y las balizas se apagan; reiniciar crea una partida y buffers nuevos.

## Viento y humo dinámico

En V2 el viento conserva su representación visual. Los multiplicadores de propagación siguientes solo se usan si se vuelve a habilitar explícitamente esa mecánica.

El HUD muestra `Viento: flecha Dirección · Intensidad`. La flecha indica hacia dónde se desplazan el humo y las brasas. El patrón es determinístico: cambia de dirección lentamente cada cierto intervalo y, cuando ocurre, aparece una alerta breve indicando hacia dónde puede avanzar el fuego.

`src/game/world/wind-system.ts` concentra el balance: `WIND_CHANGE_INTERVAL` define la frecuencia de cambios, `WIND_TRANSITION_SECONDS` su suavidad y los preajustes `WIND_PRESETS` definen dirección e intensidad. En `src/game/fire/fire-system.ts`, `WIND_PROPAGATION_MIN_MULTIPLIER` y `WIND_PROPAGATION_MAX_MULTIPLIER` limitan el efecto sobre la exposición: el combustible a favor del viento recibe hasta un 10% más, el que está en contra hasta un 10% menos y el lateral queda cerca del valor normal.

El humo y las brasas de cada foco se desplazan gradualmente con la misma dirección. El ambiente agrega solo doce partículas ligeras, por lo que el efecto permanece visible sin un costo relevante. La bitácora incorpora una nota sobre el viento después de iniciar el flujo normal, y el cierre registra la última dirección predominante y la cantidad de cambios.

Para probarlo, completá el diálogo y observá el indicador durante la partida; esperá `WIND_CHANGE_INTERVAL` segundos para ver la alerta. Creá o mantené un foco activo para apreciar con mayor claridad el desplazamiento de humo y brasas.

## Cinemática inicial

El flujo de inicio es: **menú → cinemática → diálogo con la guía → preparación → misión**. Al seleccionar `Iniciar experiencia`, una cinemática de 12,5 segundos recorre las sierras, la zona segura, la vivienda y el foco lejano antes de abrir automáticamente el diálogo de la guía. El ambiente de viento acompaña la secuencia y la sirena suena una sola vez.

Se puede omitir en cualquier momento con `Espacio` o el botón `Omitir`. Esta es la opción reducida: lleva directamente al diálogo, conserva el estado de partida limpio y no activa incendios, daño ni misión antes de completar la preparación. `M` sigue silenciando o reactivando el audio durante la cinemática.

`src/game/narrative/intro-cinematic.ts` reúne `INTRO_CINEMATIC_DURATION` y la interpolación de cámara. Los planos, sus posiciones, objetivos y textos se definen como `cinematicShots` en `src/app/main.ts`; allí se pueden ajustar duración, encuadres y frases sin cambiar la lógica de la misión.

## Hallazgos educativos opcionales

El mapa incluye cinco descubribles opcionales: un cartel de prevención, una mochila junto al sendero, referencias de fauna en el bosque nativo, un árbol quemado y un punto de observación serrano. Los círculos e indicadores celestes señalan estos **hallazgos educativos**; una pequeña placa flotante los hace identificables desde media distancia. Al acercarse aparece `Hallazgo educativo: [título]` y, dentro del radio de interacción, `Presioná F para investigar: [título]`.

La tarjeta pausa las reglas jugables para poder leerla. Los hallazgos originales siguen siendo opcionales durante la intervención. `B` abre la **bitácora** con los textos ya descubiertos y el HUD permanente muestra `Exploración opcional · Hallazgos: X/5 · B: Bitácora`. El resumen final también conserva este dato opcional.

Los textos, tipos visuales y posiciones se editan en `src/game/narrative/discoverables.ts`, dentro de `DISCOVERABLES`. Para sumar un sexto, agregá una definición con un `id` único, título, texto, posición X/Z y uno de los tipos visuales disponibles; el contador y la bitácora se actualizan automáticamente. La interfaz de tarjetas y bitácora está en `src/ui/bitacora.ts`.

La prioridad de `F` es: diálogo/preparación/radio de misión y luego el descubrible más cercano. Así los hallazgos no interrumpen objetivos obligatorios.

## Brújula y guía de objetivos

Una brújula discreta en el centro superior desplaza los puntos cardinales `N`, `E`, `S` y `O` según la dirección de la cámara. Debajo muestra el próximo objetivo principal, una flecha direccional y la distancia horizontal aproximada en metros. El destino cambia automáticamente entre acceso, radio, vivienda y bosque; tras la llegada de refuerzos apunta al compañero junto al camión. Se oculta durante menús, cinemática, diálogos bloqueantes, bitácora y pantallas finales.

`Q` activa o desactiva una guía independiente al hallazgo educativo no descubierto más cercano. Cuando está activa, aparece debajo del objetivo principal en celeste como `Hallazgo opcional: [título] · Xm`; no reemplaza ni modifica la prioridad de la misión.

La lógica visual está en `src/ui/hud/objective-compass.ts`. La posición visual se ajusta desde `.objective-compass` en `src/app/styles.css` (`top`, `left`, `width` y `transform`). Los destinos principales se resuelven en `MissionDirector.getNavigationTarget`; para agregar un tipo nuevo, devolvé un objeto con `position`, `label` y `priority` para el estado de misión correspondiente.

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
- `FIRE_SPAWN_INTERVAL` en `src/game/fire/fire-system.ts` define el intervalo entre oleadas de focos; conserva un valor de 24 segundos; no está habilitado en el recorrido V2.
- `MAX_ACTIVE_FIRES_BEFORE_SPAWN` limita a tres los focos activos, incluidos los propagados. Las zonas de exclusión junto al jugador, camión y casa se configuran en el mismo archivo.

## Sistemas del prototipo y configuración heredada

### Colisiones y ritmo de oleadas

El movimiento en primera persona usa `CollisionSystem` (`src/game/world/collision-system.ts`), un sistema 2D liviano sobre el plano X/Z. La casa usa una zona rectangular, mientras que el camión, los árboles grandes y las rocas usan zonas circulares. Si el jugador intenta atravesar un objeto, el sistema conserva el eje que sigue libre para permitir deslizarse por el borde.

En V2 cada foco se crea al entrar a su objetivo; las oleadas libres y la propagación están desactivadas. El sistema de oleadas se conserva como recurso del prototipo. Cada oleada válida muestra brevemente `Nuevo foco detectado`; no hay avisos cuando el límite de focos o una zona protegida bloquean una aparición.

Valores principales para ajustar el balance:

- `PLAYER_COLLISION_RADIUS` en `src/game/world/collision-system.ts`: radio personal del jugador frente a todos los obstáculos.
- `BUSH_COLLISION_RADIUS` en `src/game/world/collision-system.ts`: radio circular de cada arbusto (`0.62`); se registra al cargar el modelo en su posición final sobre el terreno. El pasto pequeño no tiene collider.
- `FIRE_SPAWN_INTERVAL` en `src/game/fire/fire-system.ts`: segundos entre oleadas (valor heredado: `24`, inactivo en V2).
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

## Antecedentes del MVP (histórico, reemplazado por el flujo V2)

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
