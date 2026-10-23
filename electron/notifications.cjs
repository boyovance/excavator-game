const { Notification } = require('electron');
const ctx = require('./context.cjs');

// One timer per job still out; a job is announced once.
const timers = new Map();
const notified = new Set();

// A reminder only: completing a job does not pay it out.
function notifyReturn(_prev, next) {
  const jobs = next.jobs ?? [];
  const live = new Set(jobs.map((j) => j.id));
  for (const [id, timer] of timers) if (!live.has(id)) { clearTimeout(timer); timers.delete(id); }
  for (const job of jobs) if (!timers.has(job.id) && !notified.has(job.id)) schedule(job);
}

function schedule(job) {
  const arm = (ms) => { const timer = setTimeout(check, ms); timer.unref(); timers.set(job.id, timer); };
  const check = () => {
    if (!ctx.gameState?.jobs?.some((j) => j.id === job.id)) { timers.delete(job.id); return; }
    const left = job.end - Date.now();
    if (left > 0) { arm(Math.min(left, 60_000)); return; }
    timers.delete(job.id);
    notified.add(job.id);
    require('./tray.cjs').refreshMenus();
    if (!ctx.settings.notify || ctx.prefs.isQuiet(ctx.settings) || !Notification.isSupported()) return;
    const notice = new Notification({ title: '工作完成，收穫待領取',
      body: `${ctx.rules.partName(job.machineId)}在${ctx.rules.siteName(job.site)}已收工，點此打開車庫領取收穫。` });
    notice.on('click', () => require('./windows.cjs').openGarage('garage'));
    notice.show();
  };
  arm(Math.max(0, Math.min(job.end - Date.now(), 60_000)));
}

module.exports = { notifyReturn };
