// Work sites: the pet leaves the desktop for `minutes` of real time (offline included),
// then returns with coins and maybe parts from the loot table.
// `machines` lists who may work there (missing = every machine); drops are only drawn from parts
// the current machine can use, so every site lists plenty of each machine's own parts.
// `jackpot` is the chance of a bumper haul that doubles the coins; `drops` are the chances that
// the 1st, 2nd and 3rd part drop actually happens.
export const SITES = [
  {
    id: 'yard',
    name: '廢料場',
    minutes: 5,
    wear: 8,
    xp: 12,
    coins: [10, 30],
    jackpot: 0.05,
    drops: [0.55],
    loot: [
      ['acc_beacon', 3], ['acc_worklight', 3], ['acc_antenna', 2], ['acc_coupler', 2], ['cab_visor', 2],
      ['cab_cage', 2], ['stick_short', 2], ['bucket_trench', 2], ['cw_heavy', 2],
      ['bucket_mini_trench', 2], ['cab_mini', 1], ['stick_mini_tele', 1], ['bucket_mower', 2], ['bucket_log', 2],
      ['bucket_slope', 2], ['bucket_demo_grapple', 2], ['bucket_sorting', 1], ['acc_ladder', 2], ['acc_platform', 1],
      ['acc_dust', 1], ['acc_radius', 1], ['tracks_wide', 1],
    ],
  },
  {
    id: 'alley',
    name: '窄巷管線',
    minutes: 15,
    wear: 12,
    xp: 35,
    coins: [45, 85],
    jackpot: 0.06,
    drops: [1, 0.2],
    // trenches for pipes in narrow streets: only small and wheeled machines fit
    machines: ['m_mini', 'm_micro', 'm_spider', 'm_wheeled'],
    loot: [
      ['bucket_mini_trench', 3], ['bucket_trench', 2], ['cab_mini', 1], ['cab_visor', 2], ['boom_mini_ext', 1],
      ['stick_mini_tele', 1], ['bucket_mini_auger', 1], ['bucket_compactor', 2], ['acc_worklight', 2],
      ['acc_beacon', 2], ['tracks_mini_expand', 1], ['tracks_wheels_out', 1], ['bucket_mini_breaker', 1],
      ['boom_tab', 1], ['acc_gps', 1],
    ],
  },
  {
    id: 'quarry',
    name: '採石場',
    minutes: 30,
    wear: 18,
    xp: 70,
    coins: [80, 190],
    jackpot: 0.08,
    drops: [1, 0.35],
    // real quarries need machines with the power and size for hard rock
    machines: ['m_std', 'm_wheeled', 'm_reach', 'm_demo', 'm_mining'],
    loot: [
      ['cab_cage', 2], ['acc_beacon', 2], ['bucket_wide', 2], ['bucket_trench', 1], ['tracks_rubber', 1],
      ['tracks_wide', 1], ['tracks_wheels_out', 1], ['acc_blade', 1], ['boom_tab', 1], ['cw_zts', 1], ['cw_heavy', 2],
      ['cw_road_heavy', 1], ['bucket_grapple', 1], ['stick_long', 2], ['acc_gps', 1], ['bucket_ripper', 2],
      ['bucket_thumb', 1], ['bucket_screen', 1], ['bucket_breaker', 1], ['bucket_demo_grapple', 1],
      ['bucket_slope', 1], ['bucket_mining_wear', 1], ['acc_radius', 1], ['acc_ladder', 1],
    ],
  },
  {
    id: 'scrap',
    name: '廢鋼場',
    minutes: 30,
    wear: 18,
    xp: 70,
    coins: [85, 185],
    jackpot: 0.08,
    drops: [1, 0.35],
    // sorting and loading scrap: grapples and demolition tools
    machines: ['m_handler', 'm_demo', 'm_std', 'm_wheeled'],
    loot: [
      ['bucket_magnet', 1], ['bucket_shear', 1], ['bucket_log', 2], ['bucket_clamshell', 1], ['bucket_screen', 1],
      ['bucket_demo_grapple', 1], ['bucket_grapple', 2], ['cw_heavy', 2], ['cab_cage', 2], ['acc_beacon', 2],
      ['acc_worklight', 2], ['bucket_crusher', 1], ['bucket_breaker', 1], ['tracks_hdl_crawler', 1], ['cab_tilt', 1],
      ['acc_dust', 1], ['acc_radius', 1], ['bucket_silent', 1], ['bucket_sorting', 1],
    ],
  },
  {
    id: 'river',
    name: '河道清淤',
    minutes: 45,
    wear: 24,
    xp: 100,
    coins: [160, 250],
    jackpot: 0.09,
    drops: [1, 0.4],
    // dredging: long reach and machines that float
    machines: ['m_amph', 'm_reach', 'm_std'],
    loot: [
      ['bucket_wide', 3], ['stick_long', 1], ['cw_heavy', 2], ['acc_beacon', 2], ['acc_worklight', 2],
      ['cab_cage', 1], ['cab_visor', 1], ['boom_reach', 1], ['acc_gps', 1], ['bucket_clamshell', 1],
      ['bucket_rake', 2], ['bucket_mower', 1], ['bucket_treesaw', 1], ['tracks_swamp', 1], ['acc_platform', 1],
      ['acc_dredgepump', 1], ['bucket_cutterhead', 1], ['bucket_sorting', 1], ['bucket_slope', 1], ['acc_radius', 1],
      ['acc_coupler', 1],
    ],
  },
  {
    id: 'slope',
    name: '山坡施工',
    minutes: 60,
    wear: 28,
    xp: 150,
    coins: [190, 350],
    jackpot: 0.1,
    drops: [1, 0.5, 0.1],
    // steep ground: small machines and the walking spider
    machines: ['m_spider', 'm_mini'],
    loot: [
      ['bucket_mini_trench', 2], ['bucket_mini_breaker', 2], ['stick_mini_tele', 1], ['acc_worklight', 2],
      ['acc_beacon', 2], ['bucket_mini_auger', 1], ['cab_forest', 1], ['bucket_mulcher', 2], ['bucket_treesaw', 1],
      ['bucket_mower', 1], ['bucket_log', 1], ['tracks_spider_wheel', 1], ['tracks_mini_expand', 1],
      ['cab_mini', 1], ['boom_mini_ext', 1], ['acc_coupler', 1],
    ],
  },
  {
    id: 'rail',
    name: '鐵路養護',
    minutes: 25,
    wear: 15,
    xp: 55,
    coins: [100, 155],
    jackpot: 0.07,
    drops: [1, 0.3],
    // work beside the tracks: only machines that can run on rails (or crawl the embankment)
    machines: ['m_rail', 'm_spider'],
    loot: [
      ['bucket_rail', 2], ['bucket_screen', 2], ['bucket_mower', 2], ['bucket_treesaw', 1], ['acc_beacon', 2],
      ['acc_worklight', 2], ['acc_gps', 1], ['acc_coupler', 2], ['cab_forest', 1], ['bucket_mulcher', 1],
      ['tracks_spider_wheel', 1],
    ],
  },
  {
    id: 'mine',
    name: '深層礦坑',
    minutes: 120,
    wear: 32,
    xp: 300,
    coins: [340, 860],
    jackpot: 0.12,
    drops: [1, 0.6, 0.15],
    // deep mining needs heavy crawler machines
    machines: ['m_std', 'm_reach', 'm_demo', 'm_mining'],
    loot: [
      ['bucket_wide', 2], ['bucket_ripper', 2], ['bucket_breaker', 1], ['bucket_mining_wear', 1], ['bucket_face', 1],
      ['bucket_crusher', 1], ['bucket_auger', 1], ['bucket_tilt', 1], ['acc_gps', 1], ['boom_reach', 1],
      ['boom_demo_uhd', 1], ['bucket_processor', 1], ['bucket_shear', 1], ['bucket_silent', 1], ['cab_mining_fops', 1],
      ['cab_tilt', 1], ['tracks_wide', 1], ['cw_heavy', 1], ['stick_long', 1], ['boom_tab', 1], ['bucket_grapple', 1],
      ['bucket_thumb', 1], ['acc_ladder', 1],
    ],
  },
];

// Whole machines can drop too, from the kinds of site where that machine really works.
// Each site rolls once per job: `chance` that a machine comes back, picked from the weighted `pool`.
// A machine you already own is never picked again.
const MACHINE_DROPS = {
  yard: { chance: 0.03, pool: [['m_micro', 1], ['m_rail', 1]] },
  alley: { chance: 0.06, pool: [['m_spider', 2], ['m_micro', 2], ['m_rail', 1]] },
  slope: { chance: 0.1, pool: [['m_spider', 2], ['m_micro', 1]] },
  quarry: { chance: 0.07, pool: [['m_demo', 2], ['m_rail', 1]] },
  scrap: { chance: 0.08, pool: [['m_handler', 2], ['m_demo', 2]] },
  river: { chance: 0.1, pool: [['m_amph', 1]] },
  mine: { chance: 0.12, pool: [['m_mining', 2], ['m_demo', 1]] },
};
for (const site of SITES) if (MACHINE_DROPS[site.id]) site.machineDrop = MACHINE_DROPS[site.id];

// the micro machine's own cheap tool also turns up in the yard and the alley
SITES.find((s) => s.id === 'yard').loot.push(['bucket_micro_trench', 1]);
SITES.find((s) => s.id === 'alley').loot.push(['bucket_micro_trench', 2]);
