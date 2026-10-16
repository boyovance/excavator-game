import fs from 'node:fs';
import path from 'node:path';
import { MACHINES, sampleSite, firstPurchase, machineWait, targetMachineTime, dominance, maintenanceRun } from '../src/shared/balance.mjs';
import { economySites } from '../src/shared/economy.mjs';
import { siteOpenTo, partById } from '../src/shared/parts.mjs';

const samples = Number(process.env.BALANCE_SAMPLES ?? 3000);
const seed = 20261016;
const rows = [];
const dominated = [];
for (const machine of MACHINES) for (const loadout of ['stock', 'shop', 'all']) for (const collection of ['starter', 'half', 'full']) {
  for (const version of [1, 2]) {
    const group = economySites(version).filter((s) => siteOpenTo(s, machine.id)).map((site) =>
      sampleSite({ machine: machine.id, loadout, collection, version, siteId: site.id, samples, seed }));
    rows.push(...group);
    for (const pair of dominance(group)) dominated.push({ machine: machine.id, loadout, collection, version, ...pair });
  }
  console.log(`Measured ${machine.id} / ${loadout} / ${collection}`);
}
const purchases = [1, 2].map((version) => firstPurchase({ version, samples: 2000, seed }));
const targets = [
  ['yard', 'm_std', 'm_micro'], ['yard', 'm_std', 'm_rail'], ['alley', 'm_mini', 'm_spider'],
  ['quarry', 'm_std', 'm_demo'], ['scrap', 'm_std', 'm_handler'], ['river', 'm_std', 'm_amph'], ['mine', 'm_std', 'm_mining'],
].map(([siteId, machine, target]) => targetMachineTime({ siteId, machine, target, samples: 2000, seed }));
const waits = MACHINES.flatMap((m) => economySites().map((s) => machineWait(s.id, m.id)).filter(Boolean));
const baseline = rows.filter((r) => r.machine === 'm_std' && r.loadout === 'stock');
const report = { seed, samples, rowCount: rows.length, assumptions: {
  instantReassign: true, repairAfterEveryTrip: true, snapshotCollectionReset: true,
  firstPurchase: 'yard only, stock standard machine, start 20 coins / XP 0, repair each trip, claim growth rewards, buy mini at 150',
  targets: 'specific target, stock compatible machine, level 6 access, accumulating ownership, repair each trip; no time for prior unlocks',
}, purchases, targets, waits, maintenance: [1, 2].map((v) => maintenanceRun(v)), dominated, rows };
const f = (n) => n == null ? '觀測窗內未達' : Number(n).toFixed(1);
const names = (id) => partById(id)?.name ?? economySites().find((s) => s.id === id)?.name ?? id;
const table = (headers, entries) => `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${entries.map((cells) => `<tr>${cells.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const compare = (collection) => table(['工地', '原版淨幣/h', '候選淨幣/h', '候選經驗/h', '零件/h', '新零件/h', '候選折現/趟'], baseline.filter((r) => r.version === 1 && r.collection === collection).map((a) => {
  const b = baseline.find((r) => r.version === 2 && r.collection === collection && r.siteId === a.siteId);
  return [a.name, f(a.hourly.net), f(b.hourly.net), f(b.hourly.xp), f(b.hourly.parts), f(b.hourly.newParts), f(b.mean.duplicates)];
}));
const scalarPairs = dominated.filter((p) => p.machine === 'm_std' && p.loadout === 'stock' && p.collection === 'full');
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>經濟平衡驗收報告</title>
<style>body{font:16px/1.7 "Microsoft YaHei",sans-serif;background:#f6f3ea;color:#292b28;margin:0}main{max-width:1100px;margin:auto;padding:28px}h1{margin-bottom:4px}h2{margin-top:32px}section{background:white;border:1px solid #e4dfd0;border-radius:14px;padding:24px;margin:16px 0}.notice{border-left:5px solid #e4aa00;padding:16px;background:#fff4c7}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;text-align:left;border-bottom:1px solid #e4dfd0;white-space:nowrap}th{background:#f6f3ea}small{color:#69675e}summary{cursor:pointer;font-weight:bold}@media(prefers-color-scheme:dark){body{background:#1f1e1a;color:#eee}section{background:#2a2823;border-color:#555}th{background:#37342b}.notice{background:#473c1b}small{color:#c3bfae}}</style><main>
<h1>經濟平衡 · 候選 A 驗收報告</h1><p>固定種子 ${seed} · 每情境 ${samples} 趟 · ${rows.length} 個情境 · 無正式存檔讀寫</p>
<p class="notice">正式數值尚未改動。候選 A 只在獨立沙盒中試玩，確認後才安排套用。所有「每小時」是假設立即領取並續派的派遣工時，不是關機後自動連派收益。</p>
<section><h2>結論與取捨</h2><ul><li>原版可在 1 點耐久持續派遣；候選要求出發耐久足夠支付磨損。從滿耐久只跑廢料場、不維修：原版測試 20 趟仍可繼續，候選完成 12 趟後剩 4 耐久，需維修或免費休息。</li>
<li>候選提高短工地基礎收入、收窄長工地現金優勢，降低重複零件折現：新玩家不是因為已有全收藏才有可用收入。</li><li>標準機標配、起始收藏的候選淨收入約 ${f(Math.min(...baseline.filter((r) => r.version === 2 && r.collection === 'starter').map((r) => r.hourly.net)))}～${f(Math.max(...baseline.filter((r) => r.version === 2 && r.collection === 'starter').map((r) => r.hourly.net)))} 金幣/h。不同裝備倍率另表列出，不能混用此區間。</li>
<li>首台微型機節奏接近原版，暫不調高商店價格。掉落限定機型仍有長尾，尤其深層礦坑；本輪不擅自新增保底或技能系統。</li>
<li>不存在一個工地在所有玩法、收藏來源與操作負擔上都最好；但成熟收藏的部分工地仍在純速率上被壓過（下列公開）。候選是可比較提案，並非已證明最終平衡。</li></ul></section>
<section><h2>標準機／標配：起始收藏快照</h2><p>已解鎖全部等級；收藏只含免費與目前配置。每趟重新從同一收藏起點抽樣，不是玩家長期一直有新零件。</p>${compare('starter')}<h2>標準機／標配：全收藏快照</h2><p>所有零件重複折現，新零件及新機型率均為 0。這是成熟收藏壓力測試。</p>${compare('full')}</section>
<section><h2>新手購買節奏</h2><p>2000 條動態路線：從 20 金幣、0 經驗起步，只跑廢料場；每趟維修至滿、及時領成長獎勵；收藏與重複折現會累積。不含桌面挖掘、停頓或其他購買。</p>${table(['方案','P50 分鐘','P90 分鐘','成功路線/樣本'],purchases.map((p)=>[p.version===1?'原版':'候選 A',f(p.p50Minutes),f(p.p90Minutes),`${p.completed}/${p.samples}`]))}<p>目標 20～35 分鐘（P50）是待驗收的節奏提案，不是保證每個玩家相同。</p></section>
<section><h2>指定掉落機型的長尾</h2><p>每目標 2000 條動態路線；從能進入工地開始計算，保留其他先掉落機型並依正式規則移出池。兩方案的掉落表與概率完全相同。P90 意味仍約有 10% 更久，不是最晚時間。</p>${table(['目標機型','工地','使用機型','P50 小時','P90 小時','超過觀測窗'],targets.map((t)=>[names(t.target),names(t.siteId),names(t.machine),f(t.p50Hours),f(t.p90Hours),t.censored]))}</section>
<section><h2>純速率支配與保留差異</h2><p>同配置比較淨金幣、經驗、零件數、新機型的每小時速率；全部不低且至少一項高逾 2% 才列出。未計算獨有零件、單趟收入、少操作等偏好，不把抽樣相近值視為統計顯著。</p>${table(['方案','較優工地','被壓過工地'],scalarPairs.map((p)=>[p.version===1?'原版':'候選 A',names(p.better),names(p.worse)]))}<p>全收藏失去獨有掉落的目標價值後，短途頻繁操作仍可能更賺；長途保留較少操作與高單趟收入。若希望「全收藏也每個工地都等價」，需要另訂目標，而不是宣稱本輪已達成。</p></section>
<section><h2>方法、限制與重建</h2><ul><li>實際 reducer 決定出發、固定亂數結算、獎勵、維修和購買；原版與候選使用同一亂數序列配對比較。</li><li>配置：標配、商店可取得的最高派遣倍率、全收藏最高派遣倍率。只最佳化 jobCoin，不聲稱是所有玩法最佳配裝。</li><li>每趟從滿耐久開始，維修費用為 ceil(磨損 × 0.3)。按批次維修可節省少量取整成本；免費休息會額外花時間，本表不把它當付費維修。</li><li>金幣淨值＝基礎＋大豐收＋裝備加成＋重複折現－維修。新零件、新機型無虛構售價；購買支出不混入每小時派遣收益。</li><li>有限樣本有誤差；本輪未涵蓋真人回訪間隔、數週養成、桌面挖掘與派遣混合策略。桌面挖掘收入可加速購買，不應將純派遣節奏當全玩法節奏。</li></ul><p>重建：<code>npm run balance:report</code>；完整資料 <a href="report.json">report.json</a>（含拆帳、所有情境、支配對及種子）。</p></section>
<section><details><summary>所有機型與搭配：${rows.length} 個情境明細</summary>${table(['版本','機型','配置','收藏','工地','倍率','淨幣/h','XP/h','新零件/h','零件/h','新機型/h','最低單趟淨幣'],rows.map((r)=>[r.version,names(r.machine),r.loadout,r.collection,r.name,f(r.multiplier),f(r.hourly.net),f(r.hourly.xp),f(r.hourly.newParts),f(r.hourly.parts),r.hourly.machines.toFixed(3),r.minNet]))}</details></section></main></html>`;
const output = path.resolve('artifacts/balance');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(output, 'report.html'), html);
console.log(JSON.stringify({ output, rows: rows.length, purchases, targets, maintenance: report.maintenance, scalarPairs }, null, 2));
