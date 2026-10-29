# Primera Línea

Experiencia narrativa en primera persona sobre incendios forestales en las Sierras de Córdoba, creada para una demostración académica.

## Propósito educativo

Invita a comprender la prevención, el impacto sobre comunidades y hábitats, y el cuidado de fauna a cargo de especialistas. Distingue condiciones de propagación de posibles fuentes de ignición, sin atribuir una causa definitiva al incendio representado. No constituye entrenamiento de respuesta a emergencias.

## Recorrido

Llegada y preparación → contención de acceso, vivienda y bosque → refuerzos → asistencia → recorrida de fauna y rescate del zorro → investigación de tres indicios → regreso al puesto y cierre de concientización.

El recorrido es el mismo en todas las partidas. Después del combate no hay daño ni cuenta regresiva. Una partida anterior a este pulido duró aproximadamente **4 min 19 s**, según la prueba comunicada por el equipo; la duración con los ajustes de movimiento requiere una nueva medición.

## Tecnologías y requisitos

Three.js, TypeScript y Vite, con modelos GLB, audio local y geometrías procedurales. Sin servidor de aplicación.

- Node.js **22.15 o superior** para ejecutar también las pruebas; npm incluido con Node.
- Navegador de escritorio con WebGL y controles de mouse/teclado.

## Instalar, ejecutar y compilar

Desde la raíz del repositorio:

```sh
npm ci
npm run dev
npm run build
```

Abrir la dirección que indique Vite. Elegir **Iniciar experiencia** y hacer clic en la escena para capturar el mouse.

## Controles

| Entrada | Acción |
| --- | --- |
| WASD / mouse | Moverse / mirar |
| F | Hablar, preparar equipo, recoger, entregar u observar |
| E mantenida | Usar la manguera durante combate |
| R junto al camión | Recargar agua |
| Enter / botón | Continuar diálogos y confirmar tarjetas |
| B | Abrir bitácora |
| Q | Alternar guía de hallazgos opcionales |
| M | Silenciar / activar audio durante el juego y escenas |
| Espacio / Omitir | Omitir introducción, refuerzos, traslado del rescate o cierre |
| Esc | Liberar el cursor |
| Menú | Pausar, consultar controles/créditos o reiniciar |

## Equipo y documentación

**Grupo 8**. Integrantes, roles, recursos y fuentes educativas: [CREDITOS.md](CREDITOS.md).

Arquitectura, configuración, edición de escenas, procedimientos de prueba y limitaciones: [INSTRUCCIONES.md](INSTRUCCIONES.md).
