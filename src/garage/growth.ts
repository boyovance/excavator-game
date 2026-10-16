import { api } from '../api';
import { GROWTH_STAGES, siteUnlocked, xpForLevel } from '../shared/growth.mjs';
import { levelInfo, siteName } from '../shared/reducer.mjs';
import { partById, siteById, siteOpenTo } from '../shared/parts.mjs';
import { ui } from './store';

const panel = () => document.getElementById('growth-body')!;
let busy = false;
let message = '';
let failed = false;
let previousLevel: number | null = null;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderGrowth() {
  const s = ui.state;
  const lv = levelInfo(s.xp);
  const next = GROWTH_STAGES.find((g) => g.level > lv.level);
  const ready = GROWTH_STAGES.filter((g) => g.level <= lv.level && !s.growthClaimed.includes(g.id)).length;
  if (previousLevel !== null && lv.level > previousLevel) {
    const opened = GROWTH_STAGES.filter((g) => g.level > previousLevel! && g.level <= lv.level).flatMap((g) => g.sites).map(siteName);
    message = `升級至 Lv.${lv.level}！${opened.length ? `等級條件已達成：${opened.join('、')}。` : ''}${ready ? '別忘了領取階段獎勵。' : ''}`;
    failed = false;
  }
  previousLevel = lv.level;
  document.getElementById('open-growth')!.textContent = `成長與解鎖${ready ? ` · ${ready} 份待領` : ''} ↓`;
  panel().innerHTML = `<div class="growth-summary"><div><span class="hint">目前等級</span><strong>Lv.${lv.level}</strong></div><div><b>距離 Lv.${lv.level + 1} 還差 ${lv.need - lv.into} 經驗</b><div class="bar growth-bar" role="progressbar" aria-label="升級經驗" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i style="width:${100 * lv.into / lv.need}%"></i></div><span class="hint">${lv.into} / ${lv.need} · 累計 ${s.xp} 經驗</span></div></div>
    <div class="growth-next"><span class="mission-tag">${next ? '下一個階段目標' : '本版路線已完成'}</span><h3>${next ? `Lv.${next.level} · ${next.sites.map(siteName).join('、')}` : '所有工地的等級條件已達成'}</h3><p>${next ? `再獲得 ${xpForLevel(next.level) - s.xp} 經驗，並可領取 ${next.coins} 金幣。` : '仍可繼續升級、收集零件與探索搭配；下方未領獎勵仍可領取。'}</p><p class="hint">領取派遣收穫會獲得經驗，也可在桌面挖掘與互動累積。升級自動開放工地，無須先領獎勵；仍需適配機型。</p></div>
    ${s.legacySites.length ? '<p class="growth-legacy">舊存檔保留原有工地權限，不受新增等級門檻限制。階段獎勵仍需達到對應等級。</p>' : ''}
    <p id="growth-message" role="status" class="job-message ${failed ? 'error' : ''}">${esc(message)}</p>
    <div class="growth-stages">${GROWTH_STAGES.map((g) => {
      const reached = lv.level >= g.level;
      const claimed = s.growthClaimed.includes(g.id);
      return `<article class="growth-stage ${reached ? 'growth-reached' : ''}" data-growth-stage="${g.id}"><div class="growth-stage-title"><b>Lv.${g.level}</b><span>${claimed ? '獎勵已領取' : reached ? '達成 · 獎勵待領' : `還差 ${xpForLevel(g.level) - s.xp} 經驗`}</span></div><ul>${g.sites.map((id) => {
        const site = siteById(id)!;
        const fits = siteOpenTo(site, s.equipped.machine);
        return `<li><strong>${site.name}</strong><span class="hint">${siteUnlocked(s, id) ? '已開放' : '等級未達'} · ${fits ? '目前機型適用' : `需 ${site.machines!.map((m) => partById(m)!.name).join('／')}`}</span></li>`;
      }).join('')}</ul><button data-growth-claim="${g.id}" class="${reached && !claimed ? 'primary' : ''}" ${busy || !reached || claimed ? 'disabled' : ''}>${claimed ? `已領取 ${g.coins} 金幣` : reached ? `領取 ${g.coins} 金幣` : `達標獎勵 · ${g.coins} 金幣`}</button></article>`;
    }).join('')}</div>`;
}

export function bindGrowth(render: () => void) {
  document.getElementById('open-growth')!.addEventListener('click', () => document.getElementById('growth')!.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.getElementById('jobs-to-growth')!.addEventListener('click', () => document.getElementById('growth')!.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.getElementById('growth-to-jobs')!.addEventListener('click', () => document.getElementById('jobs')!.parentElement!.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  panel().addEventListener('click', async (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-growth-claim]');
    if (!button || button.disabled || busy) return;
    busy = true; failed = false; message = '正在儲存獎勵…'; renderGrowth();
    try {
      const result = await api.requestAction({ type: 'claimGrowth', id: button.dataset.growthClaim! });
      if (result.state) ui.state = result.state;
      failed = !result.ok;
      message = result.ok ? '階段獎勵已入帳並儲存，每個階段只領取一次。' : result.message;
    } catch {
      failed = true; message = '暫時無法確認領取結果，請重試；不會重複給獎。';
    } finally { busy = false; render(); }
  });
}
