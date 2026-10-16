import { AMPH, DEMO, MICRO, MINI, MINING, RAIL, REACH, SPIDER, STD, WHEELED } from './groups.mjs';

// Paint is cosmetic and always buyable. Accessories are mostly shared; a few belong to one kind of work.
export const PAINTS = [
  { id: 'paint_yellow', slot: 'paint', name: '工程黃', price: 0, colors: ['#f5b800', '#b07d00'] },
  { id: 'paint_orange', slot: 'paint', name: '活力橙', price: 30, colors: ['#ff8a3d', '#d9622b'] },
  { id: 'paint_blue', slot: 'paint', name: '海洋藍', price: 30, colors: ['#4a90e2', '#2a5ea8'] },
  { id: 'paint_green', slot: 'paint', name: '森林綠', price: 30, colors: ['#5bb85d', '#357a38'] },
  { id: 'paint_red', slot: 'paint', name: '烈焰紅', price: 40, colors: ['#e5493a', '#a82a1f'] },
  { id: 'paint_white', slot: 'paint', name: '純淨白', price: 40, colors: ['#eceff1', '#a7b3ba'] },

  { id: 'paint_purple', slot: 'paint', name: '夢幻紫', price: 40, colors: ['#9b59d0', '#6a3a94'] },
  { id: 'paint_black', slot: 'paint', name: '暗夜黑', price: 40, colors: ['#4a4f57', '#23262b'] },
  { id: 'paint_gold', slot: 'paint', name: '香檳金', price: 80, colors: ['#ffd84a', '#c9971a'] },
];

export const ACCESSORIES = [
  { id: 'acc_none', slot: 'accessory', name: '無', price: 0 },
  { id: 'acc_beacon', slot: 'accessory', name: '警示燈', price: 50, desc: '車頂的紅色警示燈' },
  { id: 'acc_flag', slot: 'accessory', name: '小旗子', price: 40, desc: '插在車頂的紅旗' },
  { id: 'acc_antenna', slot: 'accessory', name: '天線', price: 40, desc: '對講機天線' },
  { id: 'acc_blade', slot: 'accessory', name: '推土鏟', price: 90, desc: '裝在底盤前面,整平地面、把土推回坑裡。微型機和輪式機大多標配', fits: [STD, MINI, WHEELED] },
  { id: 'acc_gps', slot: 'accessory', name: '3D 導引天線', price: null, desc: '衛星定位的機械導引系統,按設計圖自動控制挖到幾公分,整套價格不低。工作產出', fits: [STD, MINI, WHEELED, REACH, AMPH, MINING, RAIL] },
  { id: 'acc_worklight', slot: 'accessory', name: '工作燈', price: 45, desc: '裝在大臂上,天黑了也能開工' },
  { id: 'acc_coupler', slot: 'accessory', name: '快速連接器', price: 60, desc: '換屬具不用敲銷子,一個按鈕就換好', fits: [STD, MINI, WHEELED, SPIDER, REACH, AMPH, RAIL] },
  { id: 'acc_platform', slot: 'accessory', name: '平台欄杆', price: 60, desc: '駕駛室旁的作業平台,帶欄杆,水上維修用', fits: [AMPH] },
  { id: 'acc_dredgepump', slot: 'accessory', name: '疏浚泵', price: null, desc: '把挖起的淤泥直接泵走,不用駁船裝運。工作產出', fits: [AMPH] },
  { id: 'acc_dust', slot: 'accessory', name: '噴霧降塵炮', price: 90, workOnly: true, desc: '拆樓時對著粉塵噴水霧,減少揚塵', fits: [DEMO] },
  { id: 'acc_radius', slot: 'accessory', name: '半徑限位器', price: 80, workOnly: true, desc: '電子限位,超過安全半徑就自動停,高臂和長臂不會翻', fits: [DEMO, REACH] },
  { id: 'acc_battery', slot: 'accessory', name: '電池包', price: 60, desc: '電池驅動,幾乎不出聲也不冒煙,室內作業也不怕', fits: [MICRO, MINI] },
  { id: 'acc_ladder', slot: 'accessory', name: '登機梯', price: 70, desc: '礦用機太高,要靠梯子爬上去', fits: [MINING] },
];

// Driver: basic looks are always free so a player's avatar is never paywalled.
export const DRIVER = [
  { id: 'skin_1', slot: 'skin', name: '淺膚', price: 0, colors: ['#ffdbb4'] },
  { id: 'skin_2', slot: 'skin', name: '小麥', price: 0, colors: ['#e8b88a'] },
  { id: 'skin_3', slot: 'skin', name: '棕膚', price: 0, colors: ['#b97d56'] },
  { id: 'skin_4', slot: 'skin', name: '深棕', price: 0, colors: ['#7a4b2f'] },

  { id: 'hair_short', slot: 'hair', name: '短髮', price: 0 },
  { id: 'hair_long', slot: 'hair', name: '長髮', price: 0 },
  { id: 'hair_spiky', slot: 'hair', name: '刺蝟頭', price: 0 },
  { id: 'hair_bun', slot: 'hair', name: '丸子頭', price: 0 },
  { id: 'hair_bald', slot: 'hair', name: '光頭', price: 0 },

  { id: 'hc_black', slot: 'haircolor', name: '墨黑', price: 0, colors: ['#2b2420'] },
  { id: 'hc_brown', slot: 'haircolor', name: '栗棕', price: 0, colors: ['#7b4a28'] },
  { id: 'hc_blond', slot: 'haircolor', name: '亞麻金', price: 0, colors: ['#e8c15a'] },
  { id: 'hc_red', slot: 'haircolor', name: '赤紅', price: 0, colors: ['#c4432f'] },
  { id: 'hc_blue', slot: 'haircolor', name: '天藍', price: 0, colors: ['#4a90e2'] },

  { id: 'fit_red', slot: 'outfit', name: '紅色工裝', price: 0, colors: ['#e5493a'] },
  { id: 'fit_blue', slot: 'outfit', name: '藍色工裝', price: 0, colors: ['#3b6fc4'] },
  { id: 'fit_green', slot: 'outfit', name: '綠色工裝', price: 0, colors: ['#4caf50'] },
  { id: 'fit_white', slot: 'outfit', name: '白色襯衫', price: 0, colors: ['#eceff1'] },
  { id: 'fit_black', slot: 'outfit', name: '黑色外套', price: 0, colors: ['#3a3f47'] },

  { id: 'hat_none', slot: 'hat', name: '不戴', price: 0 },
  { id: 'hat_helmet', slot: 'hat', name: '安全帽', price: 0, desc: '工地必備' },
  { id: 'hat_cap', slot: 'hat', name: '鴨舌帽', price: 30 },
  { id: 'hat_crown', slot: 'hat', name: '小皇冠', price: 120, desc: '今天的王' },
];
