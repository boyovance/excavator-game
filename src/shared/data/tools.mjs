import { AMPH, DEMO, HANDLER, MICRO, MINI, MINING, RAIL, REACH, SPIDER, STD, WHEELED } from './groups.mjs';

// Buckets and attachments for the end of the stick. `shape` drives how every style draws the tool:
// `tool` names a drawn tool, otherwise it is a bucket of the given `thickness`, with optional teeth.
// Coin multipliers rise with price, and a machine's own tools are cheap or free.
export const TOOLS = [
  // ---- standard and wheeled machines: the general-purpose set ----
  { id: 'bucket_std', slot: 'bucket', name: '標準鏟斗', price: 0, desc: '基本款挖土鏟斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 5 }, fits: [STD] },
  { id: 'bucket_trench', slot: 'bucket', name: '溝槽鏟斗', price: 60, desc: '窄口帶齒,專門挖溝。收益 ×1.15', stats: { coin: 1.15 }, shape: { thickness: 3, teeth: true }, fits: [STD, WHEELED] },
  { id: 'bucket_wide', slot: 'bucket', name: '挖泥鏟斗', price: 80, desc: '寬口無齒,用來清理和整平軟土。收益 ×1.25', stats: { coin: 1.25 }, shape: { thickness: 7 }, fits: [STD, WHEELED, REACH] },
  { id: 'bucket_compactor', slot: 'bucket', name: '液壓夯', price: 85, desc: '夯實回填的土和碎石,修路和填溝後都要用。收益 ×1.25', stats: { coin: 1.25 }, shape: { tool: 'compactor', thickness: 3 }, fits: [STD, WHEELED, MINI] },
  { id: 'bucket_ripper', slot: 'bucket', name: '破土齒', price: 110, desc: '一根長齒,專門撕開硬土、凍土和風化岩。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'ripper', thickness: 3 }, fits: [STD, MINING] },
  { id: 'bucket_grapple', slot: 'bucket', name: '抓斗', price: 130, desc: '液壓爪,能夾起原木和碎石搬運。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'grapple', thickness: 3 }, fits: [STD, WHEELED, MINI] },
  { id: 'bucket_thumb', slot: 'bucket', name: '帶拇指鏟斗', price: 135, desc: '鏟斗旁邊多一根液壓拇指,能像手一樣夾住石塊和木頭。收益 ×1.35', stats: { coin: 1.35 }, shape: { thickness: 5, thumb: true }, fits: [STD, WHEELED, MINI] },
  { id: 'bucket_tooth', slot: 'bucket', name: '強化齒鏟斗', price: 140, desc: '通用型,硬質側刃和齒能破開硬地與岩石。收益 ×1.5', stats: { coin: 1.5 }, shape: { thickness: 5, teeth: true, dark: true }, fits: [STD, WHEELED] },
  { id: 'bucket_breaker', slot: 'bucket', name: '液壓破碎錘', price: 150, desc: '敲碎岩石和混凝土的重型氣錘,1967 年由德國克虜伯首創。收益 ×1.6', stats: { coin: 1.6 }, shape: { tool: 'breaker', thickness: 3 }, fits: [STD, WHEELED, MINING] },
  { id: 'bucket_screen', slot: 'bucket', name: '篩分鏟斗', price: 155, workOnly: true, desc: '鏟斗是格柵,挖起來就把碎石和泥土分開。收益 ×1.65', stats: { coin: 1.65 }, shape: { tool: 'screen', thickness: 3 }, fits: [STD, WHEELED, HANDLER, RAIL] },
  { id: 'bucket_crusher', slot: 'bucket', name: '破碎鬥', price: null, desc: '內建顎式破碎機,能直接壓碎建築廢料。工作產出。收益 ×1.8', stats: { coin: 1.8 }, shape: { thickness: 7, teeth: true, dark: true }, fits: [STD, MINING] },
  { id: 'bucket_auger', slot: 'bucket', name: '螺旋鑽', price: null, desc: '專門鑽孔,能鑽樁孔和爆破孔。工作產出。收益 ×1.4', stats: { coin: 1.4 }, shape: { tool: 'auger', thickness: 3 }, fits: [STD, WHEELED] },
  { id: 'bucket_tilt', slot: 'bucket', name: '傾斜旋轉鏟斗', price: null, desc: '鏟斗裝在傾斜旋轉器上,能左右傾斜 45 度、整圈旋轉,一台機器頂幾台用。價格最貴的屬具之一。工作產出。收益 ×2.2', stats: { coin: 2.2 }, shape: { thickness: 5, tilt: true }, fits: [STD, MINI, WHEELED, SPIDER] },

  // ---- micro and mini machines: small versions of the usual tools ----
  { id: 'bucket_mini', slot: 'bucket', name: '小型鏟斗', price: 0, desc: '微型機的窄鏟斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 4 }, fits: [MINI] },
  { id: 'bucket_mini_trench', slot: 'bucket', name: '小型溝槽鏟斗', price: 50, desc: '很窄的帶齒鏟斗,給電纜和水管挖細溝。收益 ×1.15', stats: { coin: 1.15 }, shape: { thickness: 3, teeth: true }, fits: [MINI] },
  { id: 'bucket_mini_auger', slot: 'bucket', name: '小型螺旋鑽', price: 90, desc: '給柵欄樁和小樹坑鑽孔。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'auger', thickness: 3 }, fits: [MINI, SPIDER] },
  { id: 'bucket_mini_breaker', slot: 'bucket', name: '小型破碎錘', price: 110, desc: '敲掉地坪和舊地基的小錘子。收益 ×1.5', stats: { coin: 1.5 }, shape: { tool: 'breaker', thickness: 3 }, fits: [MINI, SPIDER] },

  // ---- micro machines ----
  { id: 'bucket_micro', slot: 'bucket', name: '超微型鏟斗', price: 0, desc: '小到能提著走的鏟斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 3 }, fits: [MICRO] },
  { id: 'bucket_micro_trench', slot: 'bucket', name: '超微型窄溝鏟斗', price: 40, desc: '只有二十幾公分寬,給室內管線挖細溝。收益 ×1.15', stats: { coin: 1.15 }, shape: { thickness: 3, teeth: true }, fits: [MICRO] },

  // ---- rail-road machines ----
  { id: 'bucket_rail', slot: 'bucket', name: '道碴鏟斗', price: 0, desc: '挖鐵路道碴和邊坡的鏟斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 5, teeth: true }, fits: [RAIL] },

  // ---- wheeled machines ----
  { id: 'bucket_wheeled', slot: 'bucket', name: '輪式機鏟斗', price: 0, desc: '輪式機的標準挖斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 5 }, fits: [WHEELED] },

  // ---- spider machines: slopes, wetlands and forestry ----
  { id: 'bucket_spider', slot: 'bucket', name: '蜘蛛機鏟斗', price: 0, desc: '蜘蛛機的小鏟斗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 4 }, fits: [SPIDER] },
  { id: 'bucket_mower', slot: 'bucket', name: '割草鬥', price: 100, desc: '旋轉刀頭,割灌木和坡上的草。收益 ×1.2', stats: { coin: 1.2 }, shape: { tool: 'mower', thickness: 3 }, fits: [SPIDER, REACH, AMPH, RAIL] },
  { id: 'bucket_log', slot: 'bucket', name: '木材抓斗', price: 120, desc: '兩條長臂夾住原木,林場和碼頭都用。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'log', thickness: 3 }, fits: [SPIDER, HANDLER] },
  { id: 'bucket_mulcher', slot: 'bucket', name: '林業粉碎頭', price: 130, workOnly: true, desc: '旋轉滾筒帶刀齒,把灌木和樹樁直接打成碎屑。收益 ×1.4', stats: { coin: 1.4 }, shape: { tool: 'mulcher', thickness: 3 }, fits: [SPIDER] },
  { id: 'bucket_treesaw', slot: 'bucket', name: '樹木剪鋸', price: 150, workOnly: true, desc: '圓鋸片加夾臂,夾住樹幹就鋸斷。收益 ×1.45', stats: { coin: 1.45 }, shape: { tool: 'treesaw', thickness: 3 }, fits: [SPIDER, AMPH, RAIL] },

  // ---- long reach machines: dredging, ditches and slopes ----
  { id: 'bucket_clean', slot: 'bucket', name: '清溝鏟斗', price: 0, desc: '寬口無齒,刮河底和溝底的淤泥。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 7 }, fits: [REACH] },
  { id: 'bucket_slope', slot: 'bucket', name: '修坡鏟斗', price: 90, desc: '又寬又平的刃口,把邊坡刮得平整。收益 ×1.2', stats: { coin: 1.2 }, shape: { thickness: 6 }, fits: [REACH] },
  { id: 'bucket_rake', slot: 'bucket', name: '清污耙', price: 110, desc: '一排長齒,耙起水草、垃圾和漂浮物。收益 ×1.25', stats: { coin: 1.25 }, shape: { tool: 'rake', thickness: 3 }, fits: [REACH, AMPH] },
  { id: 'bucket_clamshell', slot: 'bucket', name: '蛤式抓斗', price: 160, workOnly: true, desc: '像蛤殼一樣合起來,垂直往下抓泥沙和散料。收益 ×1.5', stats: { coin: 1.5 }, shape: { tool: 'clamshell', thickness: 3 }, fits: [REACH, AMPH, HANDLER] },

  // ---- amphibious machines ----
  { id: 'bucket_dredge', slot: 'bucket', name: '疏浚鏟斗', price: 0, desc: '帶排水孔的寬鏟斗,挖起來水先漏掉。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 7 }, fits: [AMPH] },
  { id: 'bucket_sorting', slot: 'bucket', name: '分揀抓斗', price: 120, desc: '細長的指狀抓斗,把垃圾和石頭從淤泥裡挑出來。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'grapple', thickness: 3 }, fits: [AMPH, HANDLER] },
  { id: 'bucket_cutterhead', slot: 'bucket', name: '絞吸刀頭', price: null, desc: '旋轉的刀頭把河底的土絞碎再吸走,是疏浚的利器。工作產出。收益 ×2.0', stats: { coin: 2 }, shape: { tool: 'cutterhead', thickness: 3 }, fits: [AMPH] },

  // ---- demolition machines: shears, crushers and silenced breakers ----
  { id: 'bucket_pulverizer', slot: 'bucket', name: '混凝土粉碎鉗', price: 0, desc: '大口鉗夾碎混凝土,鋼筋留下來。收益 ×1.4', stats: { coin: 1.4 }, shape: { tool: 'pulverizer', thickness: 3 }, fits: [DEMO] },
  { id: 'bucket_demo_grapple', slot: 'bucket', name: '拆房抓斗', price: 130, desc: '拆樓時抓走磚石、木料和碎塊。收益 ×1.3', stats: { coin: 1.3 }, shape: { tool: 'grapple', thickness: 3 }, fits: [DEMO] },
  { id: 'bucket_shear', slot: 'bucket', name: '液壓剪', price: 180, workOnly: true, desc: '像剪刀一樣剪斷鋼樑和鋼管,能旋轉。拆房和廢鋼都用得上。收益 ×1.6', stats: { coin: 1.6 }, shape: { tool: 'shear', thickness: 3 }, fits: [DEMO, HANDLER] },
  { id: 'bucket_silent', slot: 'bucket', name: '靜音破碎錘', price: 200, workOnly: true, desc: '加了隔音罩的破碎錘,市區拆房不吵民。收益 ×1.7', stats: { coin: 1.7 }, shape: { tool: 'breaker', thickness: 3 }, fits: [DEMO] },
  { id: 'bucket_processor', slot: 'bucket', name: '多功能拆解鉗', price: null, desc: '一個鉗頭能換剪、夾碎幾種刃口,拆樓一台頂幾台。工作產出。收益 ×2.0', stats: { coin: 2 }, shape: { tool: 'processor', thickness: 3 }, fits: [DEMO] },

  // ---- material handlers: scrap, timber and bulk cargo ----
  { id: 'bucket_peel', slot: 'bucket', name: '多瓣抓斗', price: 0, desc: '四五片弧形瓣合起來像橘子皮,抓廢鋼和散貨最順手。收益 ×1.2', stats: { coin: 1.2 }, shape: { tool: 'peel', thickness: 3 }, fits: [HANDLER] },
  { id: 'bucket_magnet', slot: 'bucket', name: '電磁吸盤', price: 160, workOnly: true, desc: '通電就吸住鋼鐵,斷電就放下,不用抓。收益 ×1.5', stats: { coin: 1.5 }, shape: { tool: 'magnet', thickness: 3 }, fits: [HANDLER] },

  // ---- mining machines ----
  { id: 'bucket_mining', slot: 'bucket', name: '大型岩石鏟斗', price: 0, desc: '幾十噸容量的巨型鏟斗,齒像手指那麼粗。收益 ×1.0', stats: { coin: 1 }, shape: { thickness: 7, teeth: true, dark: true }, fits: [MINING] },
  { id: 'bucket_mining_wear', slot: 'bucket', name: '加強耐磨鏟斗', price: 400, workOnly: true, desc: '內襯耐磨板,挖硬礦石也磨不壞。收益 ×1.4', stats: { coin: 1.4 }, shape: { thickness: 7, teeth: true, dark: true }, fits: [MINING] },
  { id: 'bucket_face', slot: 'bucket', name: '正鏟鏟斗', price: 300, workOnly: true, desc: '往前推的正鏟,鏟斗底部能開門直接卸料,在採石場和大礦場裝大卡車最快。收益 ×1.6', stats: { coin: 1.6 }, shape: { tool: 'face', thickness: 3 }, fits: [MINING] },
];
