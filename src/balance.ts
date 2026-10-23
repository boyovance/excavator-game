import { MACHINES, comparison, scenario, simulateTrip, seededRandom } from './shared/balance.mjs';
import { economySites, economySite, departureDurability } from './shared/economy.mjs';
import { normalize, reduce, levelInfo, repairCost, partName, type GameState } from './shared/reducer.mjs';
import { canVisitSite, siteLevel, GROWTH_STAGES } from './shared/growth.mjs';
import { siteOpenTo } from './shared/parts.mjs';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const select = (id: string) => $<HTMLSelectElement>(id);
const button = (id: string) => $<HTMLButtonElement>(id);
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (n: number) => n.toFixed(1);
const options = () => ({ machine: select('balance-machine').value, loadout: select('balance-loadout').value, collection: select('balance-collection').value });
select('balance-machine').replaceChildren(...MACHINES.map((m) => new Option(m.name, m.id)));
let state: GameState;
let version = 2;
let minutes = 0;
let random = seededRandom();
let history: string[] = [];
let report = '完成一趟後，這裡會顯示真實規則計算的拆帳。';
let applied = '';
let computing = false;

function recompute() {
  if (computing) return;
  computing = true; button('balance-run').disabled = true;
  $('comparison-status').textContent = '正在以相同種子計算兩組方案…';
  setTimeout(() => {
    try {
      const [original, candidate] = comparison({ ...options(), samples: 3000 });
      $('balance-rows').innerHTML = original.map((a, i) => {
        const b = candidate[i];
        return `<tr data-compare-site="${a.siteId}"><td><b>${a.name}</b><br><small>${a.minutes} 分鐘</small></td><td>${fmt(a.hourly.net)}</td><td class="candidate">${fmt(b.hourly.net)}</td><td>${fmt(a.hourly.xp)} → ${fmt(b.hourly.xp)}</td><td>${fmt(b.hourly.parts)}</td><td>${fmt(b.hourly.newParts)}</td></tr>`;
      }).join('');
      $('comparison-status').textContent = `比較完成 · ${original.length} 個適用工地 · 派遣倍率 ×${original[0].multiplier.toFixed(2)} · 種子 20261016`;
    } catch { $('comparison-status').textContent = '計算失敗，請重新選擇條件。'; }
    finally { computing = false; button('balance-run').disabled = false; }
  }, 30);
}
function reset() {
  version = Number(select('trial-version').value);
  const preset = select('trial-preset').value;
  const o = options();
  const mature = scenario(o.machine, o.loadout, o.collection);
  state = preset === 'new' ? normalize(null) : { ...mature, coins: preset === 'repair' ? 0 : 150,
    durability: preset === 'repair' ? 1 : 100, growthClaimed: GROWTH_STAGES.map((g) => g.id) };
  applied = preset === 'new' ? '新玩家標準機標配，工地依等級開放。' : `已套用：${partName(state.equipped.machine)}／${select('balance-loadout').selectedOptions[0].text}／${select('balance-collection').selectedOptions[0].text}。Lv.6 與收藏僅為比較用起點。`;
  minutes = 0; random = seededRandom(); history = [];
  report = '尚未完成派遣。收益會按所選方案結算，維修與購買由你決定。';
  $('trial-message').textContent = '試玩已重設；正式存檔完全不受影響。';
  select('trial-site').replaceChildren(...economySites(version).map((s) => new Option(s.name, s.id)));
  render();
}
function render() {
  $('trial-description').textContent = `${version === 2 ? '候選 A' : '原版'} · ${applied} 目前機型：${partName(state.equipped.machine)}`;
  $('trial-coins').textContent = String(state.coins);
  $('trial-durability').textContent = String(state.durability);
  $('trial-level').textContent = `Lv.${levelInfo(state.xp).level}`;
  $('trial-time').textContent = fmt(minutes);
  for (const opt of select('trial-site').options) {
    const site = economySite(opt.value, version)!;
    opt.disabled = !canVisitSite(state, site);
    opt.text = `${site.name} · ${site.minutes} 分鐘${!canVisitSite(state, site) ? !siteOpenTo(site, state.equipped.machine) ? ' · 機型不符' : ` · Lv.${siteLevel(site.id)} 解鎖` : ''}`;
  }
  if (select('trial-site').selectedOptions[0]?.disabled) select('trial-site').value = 'yard';
  const site = economySite(select('trial-site').value, version)!;
  const required = departureDurability(site, version);
  button('trial-trip').disabled = !canVisitSite(state, site) || state.durability < required;
  button('trial-trip').textContent = `模擬完成一趟（+${site.minutes} 分鐘）`;
  $('trial-condition').textContent = `基礎 ${site.coins.join('～')} 金幣 · 經驗 +${site.xp} · 磨損 ${site.wear} · 出發至少 ${required} 耐久${state.durability < required ? '；目前耐久不足，請維修或休息後先跑短工地。' : ''}`;
  const cost = repairCost(state.durability);
  button('trial-repair').textContent = `維修至滿 · ${cost} 金幣`;
  button('trial-repair').disabled = cost <= 0 || state.coins < cost;
  button('trial-rest').disabled = state.durability >= 15;
  button('trial-rest').textContent = state.durability < 15 ? `免費休息至 15 · 模擬 ${(15 - state.durability) * 2.5} 秒` : '耐久 ≥15，無需休息';
  button('trial-buy').disabled = state.owned.includes('m_mini') || state.coins < 150;
  button('trial-buy').textContent = state.owned.includes('m_mini') ? '已擁有微型機' : '購買並裝備微型機 · 150 金幣';
  $('trial-growth').innerHTML = GROWTH_STAGES.filter((g) => g.level <= levelInfo(state.xp).level && !state.growthClaimed.includes(g.id))
    .map((g) => `<button data-trial-growth="${g.id}">領 Lv.${g.level} 階段獎勵 · ${g.coins} 金幣</button>`).join('');
  $('trial-report').textContent = report;
  $('trial-history').innerHTML = history.slice(-10).reverse().map((h) => `<li>${esc(h)}</li>`).join('');
}
function log(message: string) { history.push(message); $('trial-message').textContent = message; render(); }
button('trial-trip').addEventListener('click', () => {
  if (button('trial-trip').disabled) return;
  const result = simulateTrip(state, select('trial-site').value, version, random, 1000 + minutes * 60000, `trial-${history.length}`);
  if (!result.accepted) { log('出發條件不足，未變更進度。'); return; }
  state = result.state; minutes += result.minutes;
  const r = state.reports[0]; const b = r.breakdown!;
  report = `本趟已入帳 ${r.coins} 金幣＝基礎 ${b.base}＋大豐收 ${b.jackpotBonus}＋裝備 ${b.equipmentBonus}＋重複折現 ${b.duplicates}。經驗 +${b.xp}，實際磨損 ${b.wear}。${r.drops.map((d) => `${partName(d.id)}（${d.dup ? '重複折現' : '新收藏'}）`).join('、') || '本趟沒有零件'}。維修尚未扣款。`;
  log(`完成 ${economySite(r.site, version)!.name}，收入 ${r.coins} 金幣；可繼續派遣或自行維修。`);
});
button('trial-repair').addEventListener('click', () => { if (button('trial-repair').disabled) return; const cost = repairCost(state.durability); state = reduce(state, { type: 'repair' }); log(`維修支出 ${cost} 金幣，耐久恢復 100。`); });
button('trial-rest').addEventListener('click', () => {
  if (button('trial-rest').disabled) return;
  const count = 15 - state.durability;
  for (let i = 0; i < count; i++) state = reduce(state, { type: 'rest', amount: 1 });
  minutes += count * 2.5 / 60; log('免費休息至 15 耐久，可先跑廢料場累積維修費。');
});
button('trial-buy').addEventListener('click', () => { if (button('trial-buy').disabled) return; state = reduce(state, { type: 'buy', id: 'm_mini' }); log('已支付 150 金幣並裝備微型機，可依等級挑戰窄巷。'); });
$('trial-growth').addEventListener('click', (e) => { const target = (e.target as HTMLElement).closest<HTMLElement>('[data-trial-growth]'); if (!target) return; state = reduce(state, { type: 'claimGrowth', id: target.dataset.trialGrowth! }); log('階段獎勵已領取，重複操作不再付款。'); });
for (const id of ['balance-machine', 'balance-loadout', 'balance-collection']) select(id).addEventListener('change', recompute);
button('balance-run').addEventListener('click', recompute);
for (const id of ['trial-version', 'trial-preset']) select(id).addEventListener('change', reset);
select('trial-site').addEventListener('change', render);
button('trial-reset').addEventListener('click', reset);
reset(); recompute();
