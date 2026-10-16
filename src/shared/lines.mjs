// Everything the pet says, in one place so it can be reviewed and tested. Keep each line short (bubble width).

export const MAX_LINE_LENGTH = 24;

/** Part of the day for a local hour: morning 5-10, noon 11-13, afternoon 14-17, evening 18-22, night 23-4. */
export function dayPeriod(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export const GREETING = {
  morning: ['早安!今天也一起加油', '早啊,先伸個懶腰再開工', '早安~今天想挖點什麼?'],
  noon: ['午安!吃飯了嗎?', '中午了,記得休息一下', '午餐時間,我也歇一歇'],
  afternoon: ['下午好,精神不錯嘛', '下午容易犯睏,我陪你', '午後最適合慢慢挖土了'],
  evening: ['晚上好!今天辛苦了', '晚上了,慢慢來不急', '今天挖得差不多了嗎?'],
  night: ['這麼晚了,還沒睡嗎?', '夜深了,早點休息哦', '我陪你一會兒,但別太晚'],
};

// Said now and then while idle; the time-of-day pool is mixed in so the lines fit the moment.
export const IDLE = {
  general: [
    '來一勺?',
    '待命中~',
    '今天的土質不錯',
    '土已經準備好了',
    '要不要派我去工作?',
    '看看車庫裡有沒有新零件',
    '我的鏟斗亮晶晶的',
    '發呆中…',
    '在想要不要換個塗裝',
    '引擎聲還行吧?',
  ],
  morning: ['早上的空氣真好', '一日之計在於挖', '今天先從哪裡開始呢?'],
  noon: ['中午了,影子最短', '肚子…不對,油箱有點空', '午休一下也不錯'],
  afternoon: ['下午的工作節奏剛剛好', '再挖一會兒就收工吧', '午後有點想睡呢'],
  evening: ['傍晚了,收工的感覺真好', '今天的土都挖得很乖', '晚上適合慢慢整理工具'],
  night: ['夜裡好安靜', '你還在忙嗎?別太累了', '我小聲一點,不吵你'],
  worn: ['螺絲好像有點鬆了', '該保養一下了', '今天有點使不上力…', '履帶好像有怪聲'],
};

export const POKE = {
  happy: ['叭叭!', '嘿嘿~', '今天也要加油挖!', '收到,老闆!', '我最喜歡被你叫了'],
  calm: ['嗯?找我嗎', '我在這裡', '有事交給我', '收到!'],
  ticklish: ['癢癢的~', '再戳我要笑了', '哈哈,別鬧'],
  dizzy: ['轉得我頭暈了…', '好啦好啦,我聽到了', '你今天特別有精神呢'],
  woken: ['呀!醒了醒了', '嗯…怎麼了?', '來了來了'],
  broken: ['壞了…請先維修我', '動不了了,幫幫我'],
};

export const WORK = {
  start: (site) => [`出發!今天去${site}`, `${site}見!`, `開工啦,等我回來`],
  busyEarly: ['才剛開工呢', '慢慢來'],
  digDone: ['這一鏟不錯!', '挖到寶了?', '土質鬆軟,好挖', '再來一鏟'],
  recalled: ['被召回了,先收工', '好吧,下次再去'],
};

export const SLEEP = {
  sleepy: ['好睏…', '打個盹', '晚安…'],
  wake: ['睡飽了!', '嗯…天亮了嗎?', '伸個懶腰~'],
};

export const LEVEL_UP = (level) => [`升級了!Lv.${level}`, `Lv.${level}!力氣變大了`, `叮!到 Lv.${level} 了`];

export const REPAIR = ['全身舒暢!', '零件都換新了,謝謝', '保養完,力氣都回來了'];

// Said when the equipped part in a slot changes.
export const EQUIP = {
  machine: ['換了台新機器!', '新機型,我要重新適應一下', '這台看起來很不一樣呢'],
  paint: ['新衣服!好看嗎?', '換了顏色,心情也不一樣'],
  cab: ['駕駛室舒服多了'],
  boom: ['大臂換了,動作更靈活'],
  stick: ['小臂換了,手感不一樣'],
  bucket: ['新傢伙!快讓我試試', '這個用起來有點意思'],
  tracks: ['底盤換好了,走得更穩'],
  counterweight: ['配重換了,重心不一樣了'],
  accessory: ['多了個小配件,好看嗎?'],
  skin: ['這是你嗎?很像!'],
  hair: ['新髮型!', '駕駛員換髮型了呢'],
  haircolor: ['換了髮色,好潮'],
  outfit: ['衣服換了,很精神'],
  hat: ['這頂帽子很適合你', '戴帽子了,更像個工頭'],
};

// One line per small action the pet plays on its own (or from the "do an action" menu).
export const ACTION = {
  stretch: ['呼~伸個懶腰', '骨頭都鬆開了'],
  wave: ['嗨!', '你好呀~', '看這邊!'],
  tinker: ['檢查一下螺絲', '敲敲看有沒有鬆', '保養時間'],
  look: ['嗯?有什麼動靜嗎', '東張西望~', '這附近有好土嗎?'],
  hop: ['耶!', '開心得跳起來了'],
};

export const MILESTONE = {
  7: '我們認識一週了!這幾天謝謝你照顧我',
  30: '一個月了。不知不覺,我已經習慣有你在了',
  100: '第 100 天!你一直都在,我很開心',
  365: '一週年了。謝謝你陪了我整整一年',
  500: '500 天了,我們一起挖了好多土呢',
  1000: '1000 天…你是我最老的夥伴',
};
