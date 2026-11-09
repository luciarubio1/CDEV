/** Appearance only; station positions, educational content and progression are unchanged. */
export const INVESTIGATION_STYLE = {
  drought: { tufts: 17, bladesPerTuft: 4, radius: .95, bladeMinHeight: .18, bladeMaxHeight: .38, leaves: 11 },
  camp: { stones: 11, radius: .5, grateHeight: .26, barRadius: .007, frameRadius: .011 },
  cigarette: { filterLength: .024, paperLength: .017, consumedLength: .006, radius: .004, stainRadius: .13 },
  colors: {
    straw: [0xb8a675,0xa58c5b,0x8e754f], soil: 0x9b865f, crack: 0x6c5945,
    stone: [0x8b897a,0x777d75,0xa09b89], metal: 0x65757b, charcoal: 0x303431,
    ash: 0x999b8f, wood: 0x705a43, charredWood: 0x454138,
    paper: 0xe6e2ce, filter: 0xc79b5a, consumed: 0x514b40,
  },
} as const;

export const INSPECTION_FRAMES = [
  { fov: 44, direction: [.35,1.1,1.1], fitMargin: 1.18, minDistance: 1.1, near: .035, groundClearance: .12 },
  { fov: 42, direction: [.75,1.25,1], fitMargin: 1.16, minDistance: 1, near: .025, groundClearance: .12 },
  { fov: 38, direction: [.3,1.1,.9], fitMargin: 1.3, minDistance: .085, near: .003, groundClearance: .04 },
] as const;
export type InspectionFrame = typeof INSPECTION_FRAMES[number];
