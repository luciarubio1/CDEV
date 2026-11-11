/** Fuentes oficiales consultadas antes de redactar. Sin diagnóstico del ejemplar. */
export const FAUNA_SOURCES = {
  convivir: 'https://biocordoba.cordoba.gob.ar/con-la-campana-convivir-ayudanos-a-cuidar-la-fauna-silvestre-de-la-ciudad-de-cordoba/',
  fox: 'https://sib.gob.ar/especies/lycalopex-gymnocercus',
  cordoba: 'https://www.argentina.gob.ar/parquesnacionales/centro/parque-nacional-quebrada-del-condorito/ficha-del-area-protegida',
};
export const RESCUE_TEXT = {
  identification: 'Es un zorro gris pampeano, un animal nativo de Córdoba. Su nombre científico es Lycalopex gymnocercus y el equipo debe revisarlo.',
  departure: 'Acompañanos al puesto y dejá espacio para que el equipo de especialistas trabaje.',
  arrival: 'El equipo queda a cargo del zorro. Ayudar también es avisar y dejar espacio.',
  companion: 'El equipo ya está trabajando. Ahora busquemos indicios para entender qué pasó.',
};
export const FOX_NOTE = {
  id: 'cordoba-fox',
  title: 'Fauna de Córdoba: zorro gris pampeano',
  text: 'Nombre científico: Lycalopex gymnocercus. Es fauna silvestre nativa de Córdoba y puede vivir incluso cerca de espacios verdes urbanos. Habita ambientes abiertos; consume pequeños animales, frutos y otros vegetales. Usa cuevas y otras oquedades como refugio. Cuidar el hábitat ayuda a conservar sus refugios y fuentes de alimento. En esta experiencia, el ejemplar queda en evaluación: no se establece un diagnóstico ni se muestra toda su recuperación.',
  sources: [{ title: 'SIB · Parques Nacionales', url: FAUNA_SOURCES.fox }, { title: 'BioCórdoba · Convivir', url: FAUNA_SOURCES.convivir }],
};
export const OTHER_FAUNA_NOTES = [
  {
    id: 'cordoba-condor', title: 'Cóndor andino · Vultur gryphus', optional: true,
    text: 'En Córdoba, el Parque Nacional Quebrada del Condorito resguarda sitios donde el cóndor descansa y nidifica. Usa corrientes de aire para planear. Conservar esos ambientes protege parte de su ciclo de vida.',
    sources: [{ title: 'Parques Nacionales · Quebrada del Condorito', url: FAUNA_SOURCES.cordoba }],
  },
  {
    id: 'cordoba-achala', title: 'Lagarto verde de Achala · Pristidactylus achalensis', optional: true,
    text: 'Es endémico de la Pampa de Achala y el Cerro Champaquí, en Córdoba. Se alimenta principalmente de insectos y también incorpora vegetales. La protección de su ambiente es parte de su conservación.',
    sources: [{ title: 'Parques Nacionales · Quebrada del Condorito', url: FAUNA_SOURCES.cordoba }],
  },
];
