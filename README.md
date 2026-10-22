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

- Hacer clic sobre la escena: activar el control de primera persona.
- `W`, `A`, `S`, `D`: moverse.
- Mouse: mirar alrededor.
- `E` mantenida: utilizar la manguera y reducir gradualmente el foco más cercano.
- `R` cerca del camión de bomberos: recargar el tanque de agua al 100%.
- `ESC`: liberar el cursor.

La manguera solo funciona dentro del radio de interacción de un foco activo y consume agua únicamente mientras está apagándolo. El jugador comienza con 100 unidades de agua; al agotarse, el chorro deja de apagar fuego y el HUD indica que hay que recargar.

El camión de bomberos provisional se encuentra en la zona segura del noroeste del mapa. Al entrar en su radio de recarga aparece el mensaje `Presioná R para recargar agua`. La interacción elegida es una pulsación de `R`: recarga instantáneamente el tanque completo y muestra una confirmación en pantalla.

La barra vertical del lado derecho representa el agua disponible. La velocidad de consumo se puede ajustar en `src/game/player/water-tank.ts`, modificando la constante `WATER_DRAIN_PER_SECOND`: un número menor hace que el agua dure más y uno mayor, menos.

## Funcionalidades actuales

- Escena 3D con Three.js y Vite.
- Movimiento en primera persona.
- Mapa abierto de prueba de aproximadamente 50 x 50 metros.
- Vegetación con modelos `.glb`:
  - Árboles.
  - Rocas.
  - Arbustos.
  - Pasto.
- Casa provisional creada con geometría de Three.js.
- Dos frentes de incendio.
- Llamas, humo, brasas y luz dinámica.
- Propagación gradual hacia vegetación combustible.
- Manguera visible en primera persona.
- Chorro de agua provisional.
- Tanque de agua de 100 unidades y barra vertical de estado.
- Extinción continua mientras se mantiene `E`, solo cuando hay agua y un foco dentro del radio.
- Camión de bomberos provisional con recarga por `R`.
- Límites de movimiento que impiden salir del terreno de 50 x 50 metros.
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
│   ├── game/
│   │   ├── fire/
│   │   │   ├── fire-source.ts
│   │   │   └── fire-system.ts
│   │   └── player/
│   │       └── hose-view.ts
│   ├── ui/
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
- Todavía no se implementó el umbral final de afectación.
- El camión de bomberos es una representación provisional creada con geometrías simples de Three.js.
- La casa es actualmente un elemento de referencia visual.
- El agua es limitada y se recarga en el camión de bomberos.

La condición final y sus umbrales se definirán antes de incorporarlos al código.

## Próximos pasos previstos

1. Mejorar la distribución y el realismo del mapa.
2. Reemplazar la casa provisional por un modelo con licencia compatible.
3. Mejorar el fuego, el humo y el impacto visual sobre el entorno.
4. Separar la lógica del mundo, el HUD y el estado del juego en módulos propios.
5. Mejorar el modelo y la señalización del camión de bomberos.
6. Ajustar el balance de consumo y recarga de agua después de las pruebas de juego.
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
