import { api } from '../api';
import { MACHINE_SLOTS, PARTS, fitsMachine, partById, siteById, siteOpenTo } from '../shared/parts.mjs';
import { economySites, economySite, departureDurability, refundRule } from '../shared/economy.mjs';
import { SLOT_PRICE, MAX_SLOTS, jobMultiplier, machineBusy, reservedWear, siteBusy } from '../shared/jobs.mjs';
import { siteLevel, siteUnlocked } from '../shared/growth.mjs';
import { PITY_FROM_VERSION, pityLimit, pityProgress } from '../shared/pity.mjs';
import { previewEquipment } from '../shared/catalog.mjs';
import { partName, siteName, type ClientAction, type GameState, type Job, type Report } from '../shared/reducer.mjs';
import { jobsEl, reportEl } from './dom';
import { ui } from './store';
import { showDispatchResult } from './dispatch-result';

const fmtMinutes = (m: number) => m >= 60 ? `${m / 60} 小時` : `${m} 分鐘`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const timeText = (ms: number) => new Date(ms).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
const equipmentList = (equipped: Record<string, string>) => MACHINE_SLOTS.map((slot) => partName(equipped[slot])).map(esc).join(' · ');
let busy = false;
let message = '';
let failed = false;
let selected: string | null = null;
/** machine picked for the next departure; falls back to the desktop machine, then any free one */
let chosenMachine: string | null = null;
let renderAll: () => void;
let shownReady = '';
const refundText = (siteId: string) => { const r = refundRule(siteId); return `重複零件按標價 ${Math.round(r.rate * 100)}% 折現（${r.min}～${r.max} 金幣）`; };
const pityText = (p: { count: number; limit: number; guaranteed?: boolean }) =>
  `<p class="pity-note ${p.guaranteed ? 'pity-due' : ''}">新機型保底 ${p.count}／${p.limit}${p.guaranteed ? ' · 本趟必得新機型' : ''}</p>`;
const dialog = () => document.getElementById('job-confirm') as HTMLDialogElement;

const freeMachines = (state: GameState) => PARTS.filter((p) => p.slot === 'machine' && state.owned.includes(p.id) && !machineBusy(state, p.id)).map((p) => p.id);
function departureMachine(state: GameState) {
  const free = freeMachines(state);
  if (chosenMachine && free.includes(chosenMachine)) return chosenMachine;
  return free.includes(state.equipped.machine) ? state.equipped.machine : free[0] ?? null;
}
const loadoutOf = (state: GameState, machine: string) => previewEquipment(state, machine) ?? state.equipped;
const readyKey = (state: GameState) => state.jobs.filter((j) => Date.now() >= j.end).map((j) => j.id).join();

function reportHtml(r: Report, open: boolean) {
  return `<details class="job-report" ${open ? 'open' : ''}>
    <summary><span>已領取 · ${esc(siteName(r.site))}</span><strong>+${r.coins} 金幣</strong></summary>
    ${r.machineId ? `<p class="hint">出發機型：${esc(partName(r.machineId))} · ${timeText(r.at)}</p>` : ''}
    ${r.breakdown ? `<dl class="reward-grid">
      <div><dt>基礎收益</dt><dd>${r.breakdown.base}</dd></div><div><dt>大豐收加成</dt><dd>+${r.breakdown.jackpotBonus}</dd></div>
      <div><dt>裝備加成</dt><dd>${r.breakdown.equipmentBonus >= 0 ? '+' : ''}${r.breakdown.equipmentBonus}</dd></div><div><dt>重複折現</dt><dd>+${r.breakdown.duplicates}</dd></div>
    </dl><p class="reward-extra">經驗 +${r.breakdown.xp}　·　耐久 -${r.breakdown.wear}${r.jackpot ? '　·　大豐收！' : ''}</p>` : ''}
    <div class="drop-list">${r.drops.length ? r.drops.map((d) => `<span class="drop-chip ${d.dup ? '' : 'new-drop'}">${d.dup ? d.coins == null ? '重複 → 已折現' : `重複 → +${d.coins} 金幣` : partById(d.id)?.slot === 'machine' ? d.pity ? '新機型 · 保底' : '新機型' : '新零件'}<b>${esc(partName(d.id))}</b></span>`).join('') : '<p class="hint">本次沒有帶回零件，再試另一趟吧。</p>'}</div>
    ${r.pity ? pityText({ ...r.pity, guaranteed: r.pity.count + 1 >= r.pity.limit }) : ''}
  </details>`;
}

function jobHtml(state: GameState, job: Job) {
  const ready = Date.now() >= job.end;
  return `<article class="mission-card ${ready ? 'mission-ready' : ''}">
    <div class="mission-heading"><span class="mission-tag">${ready ? '工作完成 · 待領取' : '派遣進行中'}</span><span class="hint">${job.desktop ? '桌面同行' : '車庫外派'}</span></div>
    <h3>${esc(siteName(job.site))}</h3><p class="mission-machine">${esc(partName(job.machineId))}</p>
    ${job.rulesVersion === 1 ? '<p class="hint">升級前派遣：保留原版收益與耐久規則結算。</p>' : job.rulesVersion < PITY_FROM_VERSION && pityLimit(siteById(job.site)) ? '<p class="hint">升級前派遣：按出發時規則結算，不計入新機型保底。</p>' : refundRule(job.site).recycling && !refundRule(job.site, job.rulesVersion).recycling ? '<p class="hint">升級前派遣：按出發時規則結算，不享回收專長。</p>' : ''}
    ${job.rulesVersion >= PITY_FROM_VERSION && pityProgress(state, job.site) ? pityText({ count: job.pity ?? 0, limit: pityLimit(siteById(job.site)), guaranteed: (job.pity ?? 0) + 1 >= pityLimit(siteById(job.site)) }) : ''}
    <div class="bar mission-bar"><i data-bar="${esc(job.id)}"></i></div>
    <div class="mission-timing"><strong data-left="${esc(job.id)}"></strong><span>預計 ${timeText(job.end)} 完成</span></div>
    <details class="loadout"><summary>查看出發配置 · 收益 ×${jobMultiplier(job.equippedSnapshot).toFixed(2)}</summary><p>${equipmentList(job.equippedSnapshot)}</p><p class="hint">車庫換裝不影響這次派遣；所有機型共用耐久。</p></details>
    <p class="hint">${ready ? '收穫已準備好，領取後金幣與零件才會入庫。' : '關閉程式也繼續計時，回來後可領取一次收穫。'}</p>
    <button class="${ready ? 'primary claim-button' : 'recall-button'}" data-job="${ready ? 'claim' : 'cancel'}" data-id="${esc(job.id)}" ${busy ? 'disabled' : ''}>${busy ? '處理中…' : ready ? '領取收穫' : '召回（放棄收穫）'}</button>
  </article>`;
}

function slotHtml(state: GameState) {
  if (state.jobSlots >= MAX_SLOTS) return '';
  return `<article class="slot-offer"><div><b>解鎖第 2 派遣槽</b><p class="hint">可同時派出另一台機型到另一個工地；耐久共用，出發時會預留進行中工作的磨損。</p></div>
    <button data-slot-buy ${busy || state.coins < SLOT_PRICE ? 'disabled' : ''}>${state.coins < SLOT_PRICE ? `需要 ${SLOT_PRICE} 金幣` : `花 ${SLOT_PRICE} 金幣解鎖`}</button></article>`;
}

function siteGridHtml(state: GameState, machineId: string) {
  const available = state.durability - reservedWear(state);
  const ordered = [...economySites()].sort((a, b) => Number(siteUnlocked(state, b.id) && siteOpenTo(b, machineId)) - Number(siteUnlocked(state, a.id) && siteOpenTo(a, machineId)));
  return '<div class="site-grid">' + ordered.map((s) => {
    const fits = siteOpenTo(s, machineId);
    const unlocked = siteUnlocked(state, s.id);
    const taken = siteBusy(state, s.id);
    const open = fits && unlocked && !taken;
    const required = departureDurability(s);
    const usable = s.loot.filter(([id]) => fitsMachine(partById(id), machineId));
    const loot = (usable.length ? usable : s.loot).map(([id]) => partName(id)).join('、');
    const short = open && available < required;
    return `<article class="site-card ${open ? '' : 'site-locked'}"><div class="site-heading"><h3>${esc(s.name)}</h3><span class="duration-chip">${fmtMinutes(s.minutes)}</span></div>
      <p class="site-reward">${s.coins[0]}–${s.coins[1]} <small>基礎金幣</small></p>
      <p class="site-stats">經驗 +${s.xp}　·　磨損 ${s.wear}　·　大豐收 ${Math.round(s.jackpot * 100)}%</p>
      ${refundRule(s.id).recycling ? `<p class="pity-note pity-due">回收專長：${refundText(s.id)}</p>` : ''}
      ${open && pityProgress(state, s.id) ? pityText(pityProgress(state, s.id)!) : ''}
      <p class="hint">${unlocked ? state.legacySites.includes(s.id) ? '已開放 · 舊存檔保留權限' : `已開放 · Lv.${siteLevel(s.id)}` : `Lv.${siteLevel(s.id)} 解鎖 · 前往成長面板查看目標`}</p>
      ${fits ? `<details class="site-loot"><summary>可能掉落 · 最多 ${s.drops.length} 件零件</summary><p>${esc(loot)}</p></details>` : `<p class="fits">適用機型：${s.machines!.map((id) => esc(partName(id))).join('、')}</p>`}
      <p class="hint">出發至少 ${required} 耐久${reservedWear(state) ? `（另已預留進行中工作 ${reservedWear(state)}）` : ''}；維修不自動扣款。${short ? '耐久不足，請到上方維修或免費休息後先跑短工地。' : ''}</p>
      <button class="${open ? 'primary' : ''}" data-job="start" data-site="${s.id}" ${busy || short || !open ? 'disabled' : ''}>${!unlocked ? `Lv.${siteLevel(s.id)} 解鎖` : taken ? '已有工作進行中' : !fits ? '機型不符' : short ? `需要 ${required} 耐久` : '查看並派遣'}</button></article>`;
  }).join('') + '</div>';
}

export function renderJobs() {
  const { state } = ui;
  // with several slots a job is usually still out, so the newest result must not hide behind it
  reportEl.innerHTML = state.reports.map((r, i) => reportHtml(r, i === 0)).join('');
  shownReady = readyKey(state);
  const status = `<p id="job-message" class="job-message ${failed ? 'error' : ''}" role="status">${esc(message)}</p>`;
  const cards = state.jobs.map((job) => jobHtml(state, job)).join('');
  const machine = departureMachine(state);
  let depart: string;
  if (state.jobs.length >= state.jobSlots) {
    depart = state.jobSlots >= MAX_SLOTS ? '<p class="hint">所有工作槽都在使用中，領取或召回後即可再派遣。</p>' : '';
  } else if (!machine) {
    depart = '<p class="hint">所有機型都在工作中，領取或召回後即可再派遣。</p>';
  } else {
    const options = freeMachines(state).map((id) => `<option value="${id}" ${id === machine ? 'selected' : ''}>${esc(partName(id))}${id === state.equipped.machine ? '（桌面）' : ''}</option>`).join('');
    depart = `<div class="dispatch-intro"><span>準備出發 · 工作槽 ${state.jobs.length + 1}／${state.jobSlots}</span>
      <label>派出機型 <select id="job-machine" ${busy ? 'disabled' : ''}>${options}</select></label></div>${siteGridHtml(state, machine)}`;
  }
  jobsEl.innerHTML = `${cards}${status}${slotHtml(state)}${depart}`;
  updateClock();
}

function updateClock() {
  for (const job of ui.state.jobs) {
    const bar = jobsEl.querySelector<HTMLElement>(`[data-bar="${CSS.escape(job.id)}"]`);
    const left = jobsEl.querySelector<HTMLElement>(`[data-left="${CSS.escape(job.id)}"]`);
    if (!bar || !left) continue;
    const total = Math.max(1, job.end - job.start);
    const remain = Math.max(0, job.end - Date.now());
    bar.style.width = `${Math.max(0, Math.min(100, (1 - remain / total) * 100))}%`;
    const sec = Math.ceil(remain / 1000);
    left.textContent = remain <= 0 ? '收工了，等你領取' : `剩餘 ${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor(sec % 3600 / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
}

export function tickJob() {
  if (readyKey(ui.state) !== shownReady) { message = ''; renderJobs(); }
  else updateClock();
}

function showConfirmation(siteId: string) {
  const { state } = ui;
  const site = economySite(siteId);
  const machine = departureMachine(state);
  if (!site || !machine || state.jobs.length >= state.jobSlots || siteBusy(state, site.id) || !siteUnlocked(state, site.id) || !siteOpenTo(site, machine)) return;
  if (state.durability - reservedWear(state) < departureDurability(site)) return;
  selected = siteId;
  const loadout = loadoutOf(state, machine);
  dialog().dataset.loadout = JSON.stringify(loadout);
  dialog().dataset.machine = machine;
  const multiplier = jobMultiplier(loadout);
  document.getElementById('job-confirm-body')!.innerHTML = `<span class="mission-tag">出發確認</span><h2>${esc(site.name)}</h2>
    <p class="confirm-machine">${esc(partName(machine))}${machine === state.equipped.machine ? '' : '（不影響桌面機型）'}</p>
    <dl class="confirm-grid"><div><dt>工作時間</dt><dd>${fmtMinutes(site.minutes)}</dd></div><div><dt>預計完成</dt><dd>${timeText(Date.now() + site.minutes * 60_000)}</dd></div>
    <div><dt>裝備收益倍率</dt><dd>×${multiplier.toFixed(2)}</dd></div><div><dt>預計磨損</dt><dd>${site.wear} 耐久</dd></div></dl>
    ${pityProgress(state, site.id) ? pityText(pityProgress(state, site.id)!) + `<p class="hint">連續 ${pityLimit(site)} 趟沒帶回新機型時，第 ${pityLimit(site)} 趟必定帶回一台未擁有機型（按原權重挑選）。</p>` : ''}
    <p>一般收益約 <b>${Math.round(site.coins[0] * multiplier)}–${Math.round(site.coins[1] * multiplier)}</b> 金幣，另有大豐收與掉落機會。</p>
    ${refundRule(site.id).recycling ? '<p class="pity-note pity-due">回收專長：重複零件折現提高</p>' : ''}
    <p class="hint">出發至少 ${departureDurability(site)} 耐久${reservedWear(state) ? `，另已預留進行中工作的 ${reservedWear(state)} 耐久` : ''}；${refundText(site.id)}，維修由你自行決定。</p>
    <details class="loadout"><summary>本次帶上的配件</summary><p>${equipmentList(loadout)}</p></details>
    <p class="hint">出發後固定此配置。期間可繼續換裝，所有機型共用耐久；完成後需手動領取。</p>`;
  document.getElementById('job-confirm-error')!.textContent = '';
  if (!dialog().open) dialog().showModal();
}

async function run(action: Extract<ClientAction, { type: 'startJob' | 'claim' | 'cancelJob' | 'buySlot' }>) {
  if (busy) return;
  const before = ui.state;
  let claimedState: typeof before | undefined;
  busy = true; message = ''; failed = false;
  const confirmButton = document.getElementById('job-depart') as HTMLButtonElement;
  confirmButton.disabled = true;
  renderJobs();
  try {
    const result = await api.requestAction(action);
    failed = !result.ok;
    message = !result.ok ? result.message : action.type === 'startJob' ? '已出發！配置已固定。' : action.type === 'claim' ? '收穫已入庫，上方可查看明細。'
      : action.type === 'buySlot' ? '已解鎖第 2 派遣槽，可以再派出另一台機型。' : '已召回，本次沒有收穫。';
    if (result.state) ui.state = result.state;
    if (result.ok && action.type === 'claim') claimedState = result.state;
    if (result.ok) { dialog().close(); selected = null; }
    else document.getElementById('job-confirm-error')!.textContent = result.message;
  } catch {
    failed = true; message = '暫時無法確認結果，請稍後重試。';
    document.getElementById('job-confirm-error')!.textContent = message;
  } finally {
    busy = false; confirmButton.disabled = false; renderAll();
    if (claimedState && action.type === 'claim') {
      reportEl.scrollIntoView({ block: 'start' });
      showDispatchResult(before, claimedState, action.jobId);
    }
  }
}

export function bindJobs(render: () => void) {
  renderAll = render;
  jobsEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot-buy]')) {
      if (!busy && confirm(`花 ${SLOT_PRICE} 金幣解鎖第 2 派遣槽？`)) void run({ type: 'buySlot' });
      return;
    }
    const btn = target.closest<HTMLButtonElement>('[data-job]');
    if (!btn || btn.disabled || busy) return;
    if (btn.dataset.job === 'start') showConfirmation(btn.dataset.site!);
    else if (btn.dataset.job === 'claim') void run({ type: 'claim', jobId: btn.dataset.id! });
    else if (confirm('召回會放棄這次收穫，確定嗎？')) void run({ type: 'cancelJob', jobId: btn.dataset.id! });
  });
  jobsEl.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    if (select.id !== 'job-machine') return;
    chosenMachine = select.value;
    renderJobs();
  });
  document.getElementById('job-back')!.addEventListener('click', () => { if (!busy) dialog().close(); });
  dialog().addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
  document.getElementById('job-depart')!.addEventListener('click', () => {
    if (!selected || busy) return;
    const { state } = ui;
    const site = economySite(selected);
    const machine = dialog().dataset.machine!;
    if (!site || state.durability - reservedWear(state) < departureDurability(site)) {
      document.getElementById('job-confirm-error')!.textContent = '耐久已不足，請返回維修或免費休息後再派遣。';
      return;
    }
    // re-confirm if the machine became busy or its parts changed while the dialog was open
    if (departureMachine(state) !== machine || dialog().dataset.loadout !== JSON.stringify(loadoutOf(state, machine))) { showConfirmation(selected); return; }
    void run({ type: 'startJob', site: selected, machine });
  });
  dialog().addEventListener('close', () => { selected = null; });
}
