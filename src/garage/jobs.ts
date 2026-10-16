import { api } from '../api';
import { SITES, fitsMachine, partById, siteOpenTo } from '../shared/parts.mjs';
import { partName, siteName } from '../shared/reducer.mjs';
import { jobsEl, reportEl } from './dom';
import { ui } from './store';

const fmtMinutes = (m: number) => (m >= 60 ? `${m / 60} 小時` : `${m} 分鐘`);

export function renderJobs() {
  const state = ui.state;
  const r = state.report;
  reportEl.innerHTML = r
    ? `<div class="report">上次成果:${siteName(r.site)}　${r.jackpot ? '大豐收!' : ''}+${r.coins} 金幣${r.drops
        .map((d) => (d.dup ? `　重複「${partName(d.id)}」已折算金幣` : `　${partById(d.id)?.slot === 'machine' ? '新機型' : '新零件'} ${partName(d.id)}`))
        .join('')}</div>`
    : '';

  const job = state.job;
  if (job) {
    jobsEl.innerHTML = `<div class="working"><b>${siteName(job.site)} 工作中</b>
      <div class="bar"><i id="job-bar"></i></div>
      <span id="job-left"></span>　<button data-job="cancel">召回</button></div>`;
    tickJob();
    return;
  }
  const machineId = state.equipped.machine;
  const ordered = [...SITES].sort((a, b) => Number(siteOpenTo(b, machineId)) - Number(siteOpenTo(a, machineId)));
  jobsEl.innerHTML = ordered.map((s) => {
    const open = siteOpenTo(s, machineId);
    const usable = s.loot.filter(([id]) => fitsMachine(partById(id), machineId));
    const loot = (usable.length ? usable : s.loot).map(([id]) => partName(id)).join('、');
    const need = open ? '' : `<small class="fits">需要這些機型:${s.machines!.map((id) => partName(id)).join('、')}</small>`;
    return `<div class="site"><div class="info"><b>${s.name}</b>　${fmtMinutes(s.minutes)}
      <small>金幣 ${s.coins[0]}~${s.coins[1]}　最多掉 ${s.drops.length} 件零件　大豐收 ${Math.round(s.jackpot * 100)}%　磨損 ${s.wear}</small>
      ${open ? `<small>可能掉落:${loot}</small>` : ''}${need}</div>
      <button class="primary" data-job="start" data-site="${s.id}" ${
        state.durability <= 0 || !open ? 'disabled' : ''
      }>${open ? '派遣' : '機型不符'}</button></div>`;
  }).join('');
}

export function tickJob() {
  const job = ui.state.job;
  const bar = document.getElementById('job-bar');
  const left = document.getElementById('job-left');
  if (!job || !bar || !left) return;
  const total = job.end - job.start;
  const remain = Math.max(0, job.end - Date.now());
  bar.style.width = `${Math.min(100, ((total - remain) / total) * 100)}%`;
  const sec = Math.ceil(remain / 1000);
  left.textContent =
    remain <= 0 ? '即將回來…' : `剩餘 ${Math.floor(sec / 3600) ? `${Math.floor(sec / 3600)}:` : ''}${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export function bindJobs() {
  jobsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-job]');
    if (!btn) return;
    if (btn.dataset.job === 'start') api.dispatch({ type: 'startJob', site: btn.dataset.site! });
    else if (confirm('召回會放棄這次的收穫,確定嗎?')) api.dispatch({ type: 'cancelJob' });
  });
}
