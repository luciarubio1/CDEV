# Créditos · Primera Línea

Presentación: [README](README.md). Desarrollo y pruebas: [INSTRUCCIONES](INSTRUCCIONES.md).

## Grupo 8

| Integrante | Rol |
| --- | --- |
| Paula Chudnosky | Lead Programmer / Gameplay Programmer |
| Lucia Rubio | Audio Director / AI Programmer |
| Ignacio Salto | World Builder / Narrative Director |
| Juan Cruz Rodríguez Villafañe | Creative Director / Technical Director |
| Belén Tapia | Art Director / Sound Designer |
| Federico Wedemeyer | Game Designer / Level Designer |
| Facundo de la Fuente | Producer / UX Designer |

Los mismos integrantes y roles se presentan en `src/ui/menus/main-menu.ts`.

## Tecnologías y recursos

Three.js para representación 3D, TypeScript y Vite para desarrollo/compilación. Las licencias de dependencias se conservan en sus paquetes y el lockfile.

Recursos locales existentes: `src/assets/TreeHigh001.glb`, `Rock001.glb`, `Grass001.glb`, `Bush001 (1).glb`; audio `src/audio/ambience-wind.mp3`, `fire-loop.mp3`, `water-spray.mp3`, `truck-refill.mp3`, `siren.mp3`, `defeat.mp3`. No se encontraron autorías, URLs de origen o licencias explícitas para esos archivos en la documentación revisada; no se les atribuye una licencia inventada. El equipo debe completar ese registro antes de redistribuirlos.

Los personajes, vehículos provisionales, puestos, indicios y varios efectos se construyen mediante geometrías/código del proyecto. Este pulido no descarga nuevos recursos ni agrega dependencias.

## Fuentes educativas conservadas

| Fuente | Relación con el contenido |
| --- | --- |
| [SINAGIR · Incendio forestal](https://www.argentina.gob.ar/sinagir/incendio-forestal) | Condiciones ambientales y propagación; posibles fuentes humanas de ignición. Vegetación seca y contexto de investigación. |
| [SNMF · Prevención de incendios forestales](https://www.argentina.gob.ar/servicio-nacional-de-manejo-del-fuego/recomendaciones-para-prevenir-incendios-forestales) | Riesgo de brasas que conservan calor y colillas encendidas; estaciones de asado y colilla. |
| [BioCórdoba · Convivir](https://biocordoba.cordoba.gob.ar/con-la-campana-convivir-ayudanos-a-cuidar-la-fauna-silvestre-de-la-ciudad-de-cordoba/) | Presencia provincial del zorro gris pampeano, convivencia con fauna y atención especializada. |
| [SIB · Parques Nacionales · Lycalopex gymnocercus](https://sib.gob.ar/especies/lycalopex-gymnocercus) | Identificación, origen autóctono, descripción y hábitos del zorro; ficha de bitácora. |
| [Parques Nacionales · Quebrada del Condorito](https://www.argentina.gob.ar/parquesnacionales/centro/parque-nacional-quebrada-del-condorito/ficha-del-area-protegida) | Cóndor andino y lagarto verde de Achala, solo como lecturas opcionales. |

Estas referencias provienen de las etapas educativas existentes y se mantienen también en `fauna-education.ts` e `investigation-data.ts`. No permiten diagnosticar al animal representado ni atribuir responsabilidades o una causa confirmada al incendio ficticio. No se introdujeron datos meteorológicos ni referencias nuevas en este pulido.
