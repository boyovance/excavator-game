import { AMPH, DEMO, HANDLER, MICRO, MINI, MINING, RAIL, REACH, SPIDER, STD, WHEELED } from './groups.mjs';

// The structural parts of a machine: cab, boom, stick, undercarriage, counterweight.
// `fits` lists the machine types a part can be mounted on.

export const CABS = [
  { id: 'cab_std', slot: 'cab', name: '標準駕駛室', price: 0, desc: '基本款', look: 'closed', fits: [STD] },
  { id: 'cab_visor', slot: 'cab', name: '遮陽帽檐', price: 40, desc: '帥氣的遮陽板', look: 'closed', fits: [STD, WHEELED, REACH, AMPH] },
  { id: 'cab_cage', slot: 'cab', name: '防護網', price: 60, desc: '玻璃外加護欄,防落物', look: 'closed', fits: [STD, WHEELED, REACH, AMPH, DEMO, HANDLER, MINING] },
  { id: 'cab_canopy', slot: 'cab', name: '頂棚式駕駛室', price: 0, desc: '沒有玻璃,只有一頂護頂棚架,小型機器常見', look: 'canopy', fits: [MINI, SPIDER] },
  { id: 'cab_mini', slot: 'cab', name: '小型封閉駕駛室', price: 70, desc: '給微型機加裝的封閉小駕駛室,冬天不凍手', look: 'small', fits: [MINI] },
  { id: 'cab_road', slot: 'cab', name: '道路駕駛室', price: 0, desc: '大面積玻璃,上路時視野好', look: 'closed', fits: [WHEELED] },
  { id: 'cab_forest', slot: 'cab', name: '林業防護駕駛室', price: 90, workOnly: true, desc: '加了防護欄的駕駛室,防樹枝和落物', look: 'guarded', fits: [SPIDER] },
  { id: 'cab_reach', slot: 'cab', name: '長臂機駕駛室', price: 0, desc: '前窗帶防護,臂伸得遠也看得清', look: 'closed', fits: [REACH] },
  { id: 'cab_amph', slot: 'cab', name: '水上駕駛室', price: 0, desc: '駕駛室墊高,離開水面', look: 'closed', fits: [AMPH] },
  { id: 'cab_raised', slot: 'cab', name: '升降駕駛室', price: 0, desc: '駕駛室裝在升降立柱上,能升到很高,看得見貨堆和高處的作業面', look: 'raised', fits: [DEMO] },
  { id: 'cab_hdl', slot: 'cab', name: '搬運機升降駕駛室', price: 0, desc: '裝在高立柱上的駕駛室,能升到比拆房機更高,看得清整個貨堆', look: 'raised', fits: [HANDLER] },
  { id: 'cab_tilt', slot: 'cab', name: '傾斜升降駕駛室', price: 160, workOnly: true, desc: '升降的同時還能後仰,看高處不用一直仰著脖子', look: 'raised', fits: [DEMO] },
  { id: 'cab_micro', slot: 'cab', name: '開放式駕駛架', price: 0, desc: '只有一個座椅和護架,微型機的小駕駛位', look: 'canopy', fits: [MICRO] },
  { id: 'cab_rail', slot: 'cab', name: '公鐵駕駛室', price: 0, desc: '駕駛室裡多了鐵路信號顯示和上軌操作按鈕', look: 'closed', fits: [RAIL] },
  { id: 'cab_mining', slot: 'cab', name: '礦用駕駛室', price: 0, desc: '又大又高的駕駛室,視野開闊', look: 'closed', fits: [MINING] },
  { id: 'cab_mining_fops', slot: 'cab', name: '加強防護駕駛室', price: 220, workOnly: true, desc: '加厚的防落物護頂,礦場落石也不怕', look: 'guarded', fits: [MINING] },
];

// Boom segments are [length, bend in degrees]; every boom adds up to 17 so poses stay in frame.
export const BOOMS = [
  { id: 'boom_std', slot: 'boom', name: '單節大臂', price: 0, desc: '最常見的大臂,只能上下動', boom: { segments: [[17, 0]] }, fits: [STD] },
  { id: 'boom_tab', slot: 'boom', name: '三節可變角度臂', price: 90, desc: '大臂中間多一個關節,可以改變彎曲角度,能伸進窄處。收益 ×1.05', stats: { coin: 1.05 }, boom: { segments: [[8, 14], [9, -14]] }, fits: [STD, WHEELED] },
  { id: 'boom_mini', slot: 'boom', name: '偏置擺動臂', price: 0, desc: '臂根有擺動座,大臂能左右偏置,貼著牆、沿著地基挖溝', boom: { segments: [[17, 0]] }, fits: [MINI] },
  { id: 'boom_mini_ext', slot: 'boom', name: '伸縮臂', price: 100, workOnly: true, desc: '可以拉長的選配大臂,想搆遠一點就拉出來。派遣金幣 ×1.1', stats: { jobCoin: 1.1 }, boom: { segments: [[9, 6], [8, -6]] }, fits: [MINI] },
  { id: 'boom_road', slot: 'boom', name: '兩節臂', price: 0, desc: '輪式機常見的兩節大臂,折起來好上路', boom: { segments: [[9, 10], [8, -10]] }, fits: [WHEELED] },
  { id: 'boom_spider', slot: 'boom', name: '多節折疊臂', price: 0, desc: '能折得很低的多節大臂,移動時還能用臂撐地,幫腿跨過溝坎', boom: { segments: [[8, 12], [9, -12]] }, fits: [SPIDER] },
  { id: 'boom_reach', slot: 'boom', name: '長距離臂', price: null, desc: '拆房和清淤用的多節加長臂,能搆到很遠很深的地方。工作產出。派遣金幣 ×1.25', stats: { jobCoin: 1.25 }, boom: { segments: [[6, 10], [6, -4], [5, -6]] }, fits: [REACH] },
  { id: 'boom_amph', slot: 'boom', name: '疏浚長臂', price: 0, desc: '水陸兩用機的三節長臂,能把工具伸到水下很深的地方。派遣金幣 ×1.2', stats: { jobCoin: 1.2 }, boom: { segments: [[7, 8], [6, -2], [4, -6]] }, fits: [AMPH] },
  { id: 'boom_demo', slot: 'boom', name: '拆房高臂', price: 0, desc: '三節高臂,能把工具舉到好幾層樓高', boom: { segments: [[5, 22], [6, -6], [6, -16]] }, fits: [DEMO] },
  { id: 'boom_demo_uhd', slot: 'boom', name: '超高拆房臂', price: null, desc: '四節的超高臂(UHD),能搆到幾十公尺高,拆摩天大樓用。工作產出。派遣金幣 ×1.3', stats: { jobCoin: 1.3 }, boom: { segments: [[4, 26], [4, -4], [4, -10], [5, -14]] }, fits: [DEMO] },
  { id: 'boom_micro', slot: 'boom', name: '超微型擺動臂', price: 0, desc: '細巧的擺動大臂,能貼著牆挖', boom: { segments: [[17, 0]] }, fits: [MICRO] },
  { id: 'boom_rail', slot: 'boom', name: '公鐵兩節臂', price: 0, desc: '兩節大臂,折起來能放進鐵路限界', boom: { segments: [[9, 10], [8, -10]] }, fits: [RAIL] },
  { id: 'boom_hdl', slot: 'boom', name: '搬運臂', price: 0, desc: '多節的搬運專用臂,抓取和放下時貼近地面也夠高', boom: { segments: [[10, 4], [7, -6]] }, fits: [HANDLER] },
  { id: 'boom_mining', slot: 'boom', name: '礦用重型臂', price: 0, desc: '加粗加厚的重型大臂,撐得住幾十噸的一斗', boom: { segments: [[17, 0]] }, fits: [MINING] },
];

export const STICKS = [
  { id: 'stick_std', slot: 'stick', name: '標準小臂', price: 0, desc: '長短適中的小臂', stick: { length: 13 }, fits: [STD] },
  { id: 'stick_short', slot: 'stick', name: '短小臂', price: 50, desc: '短小臂挖掘力強。收益 ×1.1', stats: { coin: 1.1 }, stick: { length: 10 }, fits: [STD, WHEELED] },
  { id: 'stick_long', slot: 'stick', name: '長小臂', price: 70, desc: '長小臂搆得遠,派遣時能搆到更多礦。派遣金幣 ×1.15', stats: { jobCoin: 1.15 }, stick: { length: 14 }, fits: [STD, WHEELED] },
  { id: 'stick_mini', slot: 'stick', name: '小型小臂', price: 0, desc: '微型機的短小臂', stick: { length: 11 }, fits: [MINI] },
  { id: 'stick_mini_tele', slot: 'stick', name: '伸縮小臂', price: 90, workOnly: true, desc: '可以伸縮的小臂,一支頂兩支用。派遣金幣 ×1.1', stats: { jobCoin: 1.1 }, stick: { length: 14 }, fits: [MINI] },
  { id: 'stick_road', slot: 'stick', name: '輪式小臂', price: 0, desc: '輪式機的標準小臂', stick: { length: 12 }, fits: [WHEELED] },
  { id: 'stick_spider', slot: 'stick', name: '短粗小臂', price: 0, desc: '又短又粗的小臂,在斜坡上更穩', stick: { length: 10 }, fits: [SPIDER] },
  { id: 'stick_micro', slot: 'stick', name: '超微型小臂', price: 0, desc: '短小的小臂', stick: { length: 9 }, fits: [MICRO] },
  { id: 'stick_rail', slot: 'stick', name: '公鐵小臂', price: 0, desc: '長度適中,夠搆到軌道兩側的邊坡', stick: { length: 12 }, fits: [RAIL] },
  { id: 'stick_xlong', slot: 'stick', name: '超長小臂', price: 0, desc: '比長小臂還長,長臂機專用,搆得更遠', stick: { length: 18 }, fits: [REACH] },
  { id: 'stick_amph', slot: 'stick', name: '疏浚小臂', price: 0, desc: '水陸兩用機的長小臂,伸到水裡也搆得到', stick: { length: 16 }, fits: [AMPH] },
  { id: 'stick_demo', slot: 'stick', name: '拆房小臂', price: 0, desc: '短而粗的小臂,撐得住工具的側向力', stick: { length: 12 }, fits: [DEMO] },
  { id: 'stick_hdl', slot: 'stick', name: '搬運小臂', price: 0, desc: '搬運機的標準小臂', stick: { length: 13 }, fits: [HANDLER] },
  { id: 'stick_mining', slot: 'stick', name: '礦用小臂', price: 0, desc: '加強的重型小臂', stick: { length: 14 }, fits: [MINING] },
];

// `look` selects the drawing: steel plates, rubber belts, tyres, legs, pontoons ...
export const TRACKS = [
  { id: 'tracks_std', slot: 'tracks', name: '鋼板履帶', price: 0, desc: '接地面積大,軟地也不容易陷。速度 ×1.0', stats: { speed: 1 }, look: 'steel', fits: [STD] },
  { id: 'tracks_rubber', slot: 'tracks', name: '橡膠履帶', price: 70, desc: '橡膠履帶板,安靜又不傷路面。速度 ×1.15', stats: { speed: 1.15 }, look: 'rubber', fits: [STD] },
  { id: 'tracks_mini', slot: 'tracks', name: '微型橡膠履帶', price: 0, desc: '窄窄的橡膠履帶,不壓壞草地和地磚。速度 ×1.0', stats: { speed: 1 }, look: 'rubber', fits: [MINI] },
  { id: 'tracks_mini_expand', slot: 'tracks', name: '伸縮式橡膠履帶', price: 120, workOnly: true, desc: '液壓伸縮:收起來能過窄門,展開來挖掘更穩。速度 ×0.95', stats: { speed: 0.95 }, look: 'expand', fits: [MINI] },
  { id: 'tracks_wheels', slot: 'tracks', name: '輪式底盤', price: 0, desc: '輪胎底盤,英國人叫它「橡皮鴨」。速度 ×1.3', stats: { speed: 1.3 }, look: 'wheels', fits: [WHEELED] },
  { id: 'tracks_wheels_out', slot: 'tracks', name: '帶支腿輪式底盤', price: 100, workOnly: true, desc: '輪胎底盤加液壓支腿,挖掘時撐地更穩。速度 ×1.25', stats: { speed: 1.25 }, look: 'outrigger', fits: [WHEELED] },
  { id: 'tracks_spider', slot: 'tracks', name: '步行支腿', price: 0, desc: '四條能伸縮的腿,每條腿末端有支撐腳。速度 ×0.7', stats: { speed: 0.7 }, look: 'spider', fits: [SPIDER] },
  { id: 'tracks_spider_wheel', slot: 'tracks', name: '輪腿', price: 140, workOnly: true, desc: '腿的末端是獨立驅動的輪子,能滾也能走。速度 ×0.9', stats: { speed: 0.9 }, look: 'spiderwheel', fits: [SPIDER] },
  { id: 'tracks_micro', slot: 'tracks', name: '超微型伸縮履帶', price: 0, desc: '窄窄的橡膠履帶,能液壓伸縮:收起來過門,展開來穩住。速度 ×0.9', stats: { speed: 0.9 }, look: 'expand', fits: [MICRO] },
  { id: 'tracks_rail', slot: 'tracks', name: '公鐵兩用底盤', price: 0, desc: '輪胎走公路,放下導向輪就能走鐵軌。速度 ×1.2', stats: { speed: 1.2 }, look: 'rail', fits: [RAIL] },
  { id: 'tracks_wide', slot: 'tracks', name: '加寬履帶', price: 0, desc: '加寬的履帶,長臂伸出去時底盤更穩。速度 ×0.9', stats: { speed: 0.9 }, look: 'wide', fits: [REACH] },
  { id: 'tracks_float', slot: 'tracks', name: '浮箱', price: 0, desc: '兩個密閉浮箱,能浮在水面和爛泥上。速度 ×0.8', stats: { speed: 0.8 }, look: 'float', fits: [AMPH] },
  { id: 'tracks_swamp', slot: 'tracks', name: '濕地寬履帶', price: 100, workOnly: true, desc: '超寬履帶板,接地壓力很低,能走在爛泥和濕地上。速度 ×0.85', stats: { speed: 0.85 }, look: 'swamp', fits: [AMPH] },
  { id: 'tracks_demo', slot: 'tracks', name: '加固寬履帶', price: 0, desc: '加寬加固的底盤,高臂伸出去也不會翻。速度 ×0.85', stats: { speed: 0.85 }, look: 'wide', fits: [DEMO] },
  { id: 'tracks_hdl_wheel', slot: 'tracks', name: '重載輪胎底盤', price: 0, desc: '大輪胎底盤,在廢鋼場和碼頭跑得快。速度 ×1.1', stats: { speed: 1.1 }, look: 'wheels', fits: [HANDLER] },
  { id: 'tracks_hdl_crawler', slot: 'tracks', name: '履帶底盤', price: 120, workOnly: true, desc: '履帶式的搬運機底盤,在鬆軟的地面上更穩。速度 ×0.9', stats: { speed: 0.9 }, look: 'steel', fits: [HANDLER] },
  { id: 'tracks_mining', slot: 'tracks', name: '超寬重型履帶', price: 0, desc: '礦用機的超寬重型履帶,扛得住幾百噸。速度 ×0.7', stats: { speed: 0.7 }, look: 'wide', fits: [MINING] },
];

// `look` selects its size and shape: long, zts (zero tail swing), heavy, ballast, mining
export const COUNTERWEIGHTS = [
  { id: 'cw_std', slot: 'counterweight', name: '標準配重', price: 0, desc: '傳統配重,掛在機身後面', look: 'long', fits: [STD] },
  { id: 'cw_zts', slot: 'counterweight', name: '零尾擺配重', price: 60, desc: '1993 年洋馬首創,迴轉時配重不超出履帶寬度,窄處也能用', look: 'zts', fits: [STD] },
  { id: 'cw_heavy', slot: 'counterweight', name: '加重配重', price: 55, desc: '加大的配重,挖起來更穩。收益 ×1.05', stats: { coin: 1.05 }, look: 'heavy', fits: [STD, REACH, DEMO, HANDLER] },
  { id: 'cw_mini_zts', slot: 'counterweight', name: '微型零尾擺配重', price: 0, desc: '配重收在履帶寬度內,迴轉時尾巴不會掃到牆', look: 'zts', fits: [MINI] },
  { id: 'cw_mini_conv', slot: 'counterweight', name: '傳統配重', price: 50, desc: '尾巴伸出履帶外,挖得更有勁,但迴轉時要小心後面。收益 ×1.05', stats: { coin: 1.05 }, look: 'long', fits: [MINI] },
  { id: 'cw_road', slot: 'counterweight', name: '輪式配重', price: 0, desc: '輪式機的標準配重', look: 'long', fits: [WHEELED] },
  { id: 'cw_road_heavy', slot: 'counterweight', name: '輪式加重配重', price: 50, desc: '加大的配重,挖起來更穩。收益 ×1.05', stats: { coin: 1.05 }, look: 'heavy', fits: [WHEELED] },
  { id: 'cw_spider', slot: 'counterweight', name: '緊湊配重', price: 0, desc: '貼著機身的緊湊配重,在斜坡上重心更低', look: 'zts', fits: [SPIDER] },
  { id: 'cw_micro', slot: 'counterweight', name: '超微型配重', price: 0, desc: '小小的零尾擺配重', look: 'zts', fits: [MICRO] },
  { id: 'cw_rail', slot: 'counterweight', name: '公鐵配重', price: 0, desc: '上軌作業時穩住機身的配重', look: 'long', fits: [RAIL] },
  { id: 'cw_reach', slot: 'counterweight', name: '長臂平衡配重', price: 0, desc: '長臂伸出去時用來平衡的重配重', look: 'ballast', fits: [REACH] },
  { id: 'cw_amph', slot: 'counterweight', name: '浮箱平衡配重', price: 0, desc: '浮在水面時用來保持平衡的配重', look: 'ballast', fits: [AMPH] },
  { id: 'cw_demo', slot: 'counterweight', name: '拆房穩定配重', price: 0, desc: '高臂伸出去時用來穩住機身的重配重', look: 'ballast', fits: [DEMO] },
  { id: 'cw_hdl', slot: 'counterweight', name: '搬運機配重', price: 0, desc: '抓著重貨升高時用來穩住機身的配重', look: 'ballast', fits: [HANDLER] },
  { id: 'cw_mining', slot: 'counterweight', name: '礦用巨型配重', price: 0, desc: '幾十噸重的巨型配重。收益 ×1.1', stats: { coin: 1.1 }, look: 'mining', fits: [MINING] },
];
