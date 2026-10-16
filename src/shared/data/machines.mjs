// Machine types. Each one comes with its own parts in every machine-specific slot.
export const MACHINES = [
  {
    id: 'm_std', slot: 'machine', name: '標準履帶挖掘機', price: 0,
    desc: '最常見的挖掘機,履帶行走,什麼活都能幹。大約 10 到 45 噸,零件選擇最多。',
    machine: {
      size: 1, fit: 1, drive: '履帶', use: '通用土方',
      defaults: { cab: 'cab_std', boom: 'boom_std', stick: 'stick_std', bucket: 'bucket_std', tracks: 'tracks_std', counterweight: 'cw_std', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_mini', slot: 'machine', name: '微型挖掘機', price: 150, stats: { coin: 0.8 },
    desc: '約 1 到 8 噸,臂根有擺動座能左右偏置挖溝,標配推土鏟,橡膠履帶,小巧能進窄處。收益 ×0.8',
    machine: {
      size: 0.78, fit: 1, drive: '橡膠履帶', use: '窄處與室內施工',
      defaults: { cab: 'cab_canopy', boom: 'boom_mini', stick: 'stick_mini', bucket: 'bucket_mini', tracks: 'tracks_mini', counterweight: 'cw_mini_zts', accessory: 'acc_blade' },
    },
  },
  {
    id: 'm_wheeled', slot: 'machine', name: '輪式挖掘機', price: 260,
    desc: '輪胎行走,英國人叫它「橡皮鴨」,能自己開上馬路轉場,標配推土鏟。適合市政和道路維修。',
    machine: {
      size: 1, fit: 1, drive: '輪式', use: '市政與道路維修',
      defaults: { cab: 'cab_road', boom: 'boom_road', stick: 'stick_road', bucket: 'bucket_wheeled', tracks: 'tracks_wheels', counterweight: 'cw_road', accessory: 'acc_blade' },
    },
  },
  {
    id: 'm_spider', slot: 'machine', name: '蜘蛛挖掘機', price: 500, workOnly: true, stats: { coin: 0.85 },
    desc: '四條可獨立伸縮的步行支腿,腿端帶輪子,能爬陡坡、進濕地和山地,還能用大臂幫忙跨過溝坎。收益 ×0.85',
    machine: {
      size: 0.8, fit: 1, drive: '步行支腿', use: '陡坡、濕地與林業',
      defaults: { cab: 'cab_canopy', boom: 'boom_spider', stick: 'stick_spider', bucket: 'bucket_spider', tracks: 'tracks_spider', counterweight: 'cw_spider', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_reach', slot: 'machine', name: '長臂挖掘機', price: 420, stats: { coin: 1.1 },
    desc: '加長的大臂和小臂,能搆到很遠很深的地方,清河道、挖深坑、修邊坡都靠它。不適合承受拆房工具的側向力。收益 ×1.1',
    machine: {
      size: 1.15, fit: 0.84, drive: '履帶', use: '清淤與深挖',
      defaults: { cab: 'cab_reach', boom: 'boom_reach', stick: 'stick_xlong', bucket: 'bucket_clean', tracks: 'tracks_wide', counterweight: 'cw_reach', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_amph', slot: 'machine', name: '水陸兩用挖掘機', price: 650, workOnly: true, stats: { coin: 1.1 },
    desc: '底下是浮箱或超寬履帶,接地壓力很低,能浮在水面和爛泥上作業,專門清理河道、湖泊和沼澤。收益 ×1.1',
    machine: {
      size: 1.1, fit: 0.86, drive: '浮箱', use: '河道與沼澤清淤',
      defaults: { cab: 'cab_amph', boom: 'boom_amph', stick: 'stick_amph', bucket: 'bucket_dredge', tracks: 'tracks_float', counterweight: 'cw_amph', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_demo', slot: 'machine', name: '拆房挖掘機', price: 600, workOnly: true, stats: { coin: 1.2 },
    desc: '駕駛室能升高,多節高臂,頭上帶粉碎鉗、液壓剪或破碎錘,從高處把樓一層層拆下來,已經取代了拆樓用的大鐵球。收益 ×1.2',
    machine: {
      size: 1.15, fit: 0.84, drive: '履帶', use: '建築拆除',
      defaults: { cab: 'cab_raised', boom: 'boom_demo', stick: 'stick_demo', bucket: 'bucket_pulverizer', tracks: 'tracks_demo', counterweight: 'cw_demo', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_handler', slot: 'machine', name: '物料搬運機', price: 700, workOnly: true,
    desc: '駕駛室升得很高,看得清貨堆,前面裝多瓣抓斗或電磁吸盤,在廢鋼場和碼頭裝卸廢鐵、木材和散貨。',
    machine: {
      size: 1.1, fit: 0.84, drive: '輪式', use: '廢鋼與碼頭裝卸',
      defaults: { cab: 'cab_hdl', boom: 'boom_hdl', stick: 'stick_hdl', bucket: 'bucket_peel', tracks: 'tracks_hdl_wheel', counterweight: 'cw_hdl', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_mining', slot: 'machine', name: '礦用挖掘機', price: 2500, workOnly: true, stats: { coin: 2 },
    desc: '幾百噸的巨型機器,一斗能挖幾十噸礦石,只在大型露天礦場工作。收益 ×2.0',
    machine: {
      size: 1.6, fit: 1, drive: '履帶', use: '大型露天礦',
      defaults: { cab: 'cab_mining', boom: 'boom_mining', stick: 'stick_mining', bucket: 'bucket_mining', tracks: 'tracks_mining', counterweight: 'cw_mining', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_micro', slot: 'machine', name: '超微型挖掘機', price: 200, workOnly: true, stats: { coin: 0.6 },
    desc: '不到 1 噸,窄到能擠進一扇門,有的是電池驅動、履帶能液壓伸縮。幾乎不吵,可以在室內作業。收益 ×0.6',
    machine: {
      size: 0.62, fit: 1, drive: '伸縮橡膠履帶', use: '室內與極窄處施工',
      defaults: { cab: 'cab_micro', boom: 'boom_micro', stick: 'stick_micro', bucket: 'bucket_micro', tracks: 'tracks_micro', counterweight: 'cw_micro', accessory: 'acc_none' },
    },
  },
  {
    id: 'm_rail', slot: 'machine', name: '公鐵兩用挖掘機', price: 550, workOnly: true, stats: { coin: 1.1 },
    desc: '輪胎能上路,放下導向輪就能開上鐵軌,用來清道碴、除草、維修鐵路邊坡,不用另外調火車。收益 ×1.1',
    machine: {
      size: 1.05, fit: 0.92, drive: '公鐵兩用輪', use: '鐵路養護',
      defaults: { cab: 'cab_rail', boom: 'boom_rail', stick: 'stick_rail', bucket: 'bucket_rail', tracks: 'tracks_rail', counterweight: 'cw_rail', accessory: 'acc_none' },
    },
  },
];
