// How the attachment tools look, as a few chunky shapes shared by every style and by the loot-card icons.
// Each shape is in the tool's own frame: `d` runs along the tool away from the stick, `s` runs across it.
//   ['bar', d0, s0, d1, s1, width, colour]   a thick line
//   ['disc', d, s, radius, colour]            a round blob
// Colours: steel, dark, light, yellow, red. The base of the tool (the stick-end block) is drawn by the style itself.

const mirror = (prims) => prims.flatMap((p) => (p[0] === 'bar' ? [p, ['bar', p[1], -p[2], p[3], -p[4], p[5], p[6]]] : [p, ['disc', p[1], -p[2], p[3], p[4]]]));

export const TOOL_PRIMS = {
  // five or four curved tines that close like peel segments
  peel: [
    ['disc', 0, 0, 2.2, 'dark'],
    ...mirror([['bar', 0, 1, 3.5, 5, 2.2, 'yellow'], ['bar', 3.5, 5, 7.5, 2.5, 2.2, 'yellow']]),
    ['bar', 0, 0, 7, 0, 1.8, 'yellow'],
  ],
  magnet: [['bar', 0, 0, 2.5, 0, 1.2, 'steel'], ['bar', 3, -5.5, 3, 5.5, 5, 'yellow'], ['bar', 5.8, -5, 5.8, 5, 1.6, 'dark']],
  log: [
    ['disc', 0, 0, 1.8, 'dark'],
    ...mirror([['bar', 0, 1.2, 6.5, 5.5, 2, 'steel'], ['bar', 6.5, 5.5, 9, 3, 1.6, 'steel']]),
    ['bar', 2, -3, 2, 3, 1.6, 'dark'],
  ],
  shear: [
    ['bar', 0, 0, 3, 0, 5, 'dark'],
    ['bar', 2, 1.5, 8, 2, 2.6, 'dark'],
    ['bar', 8, 2, 9, 0.2, 1.8, 'dark'],
    ['bar', 2, -1.5, 7, -2.5, 2.4, 'light'],
    ['bar', 1, 3.6, 5.5, 3.8, 1.6, 'yellow'],
  ],
  pulverizer: [
    ['bar', 0, 0, 2, 0, 5, 'dark'],
    ['bar', 2, 1.5, 8, 2.5, 3, 'steel'],
    ['bar', 2, -1.5, 8, -2.5, 3, 'steel'],
    ['disc', 8, 2.5, 1.2, 'light'],
    ['disc', 8, -2.5, 1.2, 'light'],
    ['disc', 6, 2.2, 1, 'light'],
    ['disc', 6, -2.2, 1, 'light'],
    ['bar', 1, 4, 5, 4, 1.6, 'yellow'],
  ],
  processor: [
    ['bar', 0, 0, 2, 0, 5, 'dark'],
    ['bar', 2, 1.5, 8, 2.5, 3, 'steel'],
    ['bar', 2, -1.5, 8, -2.5, 3, 'steel'],
    ['disc', 8, 2.5, 1.2, 'light'],
    ['disc', 8, -2.5, 1.2, 'light'],
    ['bar', 3, -4, 3, 4, 1.4, 'yellow'],
    ['bar', 1, 4.8, 5, 4.8, 1.6, 'yellow'],
  ],
  // two fat shells hinged at the top that close into a rounded bucket
  clamshell: [
    ['bar', 0, 0, 1.4, 0, 6, 'dark'],
    ...mirror([['bar', 1.6, 3.2, 6.4, 3.2, 6, 'yellow'], ['disc', 6.4, 3.2, 3, 'yellow']]),
    ['bar', 1.4, 0, 8, 0, 0.9, 'dark'],
  ],
  cutterhead: [
    ['bar', 0, 0, 7, 0, 2, 'dark'],
    ...mirror([['disc', 1.5, 2.2, 1.3, 'light'], ['disc', 3.5, 3, 1.3, 'light'], ['disc', 5.5, 2.2, 1.3, 'light']]),
    ['disc', 7.5, 0, 1.3, 'light'],
  ],
  mulcher: [
    ['bar', 0, 0, 1.5, 0, 3, 'dark'],
    ['bar', 2.5, -5.5, 2.5, 5.5, 4.5, 'dark'],
    ['disc', 2.5, -5, 1, 'light'],
    ['disc', 2.5, -2.5, 1, 'light'],
    ['disc', 2.5, 0, 1, 'light'],
    ['disc', 2.5, 2.5, 1, 'light'],
    ['disc', 2.5, 5, 1, 'light'],
    ['bar', 5, -5.5, 5, 5.5, 1.2, 'steel'],
  ],
  treesaw: [['bar', 0, 0, 5, 0, 3, 'dark'], ['disc', 6, 0, 3.6, 'steel'], ['disc', 6, 0, 2.2, 'light'], ['disc', 6, 0, 0.8, 'dark']],
  mower: [['bar', 0, 0, 1, 0, 3, 'dark'], ['bar', 2, -6, 2, 6, 4, 'steel'], ['bar', 4.2, -6, 4.2, 6, 1.2, 'light'], ['disc', 4.2, -6, 0.8, 'light'], ['disc', 4.2, 6, 0.8, 'light']],
  rake: [
    ['bar', 0, -6, 0, 6, 2, 'steel'],
    ...[-5, -2.5, 0, 2.5, 5].map((s) => ['bar', 0, s, 6, s, 1.2, 'light']),
  ],
  face: [
    ['bar', 0, 0, 1, 0, 3, 'dark'],
    ['bar', 1, -5, 1, 5, 3, 'dark'],
    ['bar', 1, -5, 7, -5, 2, 'dark'],
    ['bar', 1, 5, 7, 5, 2, 'dark'],
    ['bar', 3, -4.5, 3, 4.5, 3.5, 'yellow'],
    ['bar', 7, -5, 7, 5, 2, 'dark'],
    ['disc', 7.6, -3, 1.1, 'light'],
    ['disc', 7.6, 0, 1.1, 'light'],
    ['disc', 7.6, 3, 1.1, 'light'],
  ],
  screen: [
    ['bar', 1, -4, 6, -4, 1.2, 'light'],
    ['bar', 1, 0, 6, 0, 1.2, 'light'],
    ['bar', 1, 4, 6, 4, 1.2, 'light'],
    ['bar', 6, -4, 6, 4, 1.2, 'light'],
    ['bar', 1, -4, 1, 4, 1.2, 'light'],
  ],
  ripper: [['bar', 0, 0, 3, 0, 3, 'dark'], ['bar', 3, 0, 8.5, 0, 2, 'steel'], ['disc', 9, 0, 1.4, 'light']],
  compactor: [['bar', 0, 0, 3, 0, 2, 'steel'], ['bar', 3.2, -5, 3.2, 5, 3, 'dark'], ['bar', 5, -4, 5, 4, 1, 'light']],
  // drawn on top of a normal bucket
  thumb: [['bar', 0.5, -0.5, 5, -4, 2, 'light'], ['disc', 0.5, -0.5, 1.2, 'dark']],
};
