const { Notification } = require('electron');
const ctx = require('./context.cjs');

let timer;
let scheduledId;
let notifiedId;
// A reminder only: completing a job does not pay it out.
function notifyReturn(prev, next) {
  const job = next.job;
  if (job?.id === scheduledId) return;
  clearTimeout(timer);
  scheduledId = job?.id;
  if (!job || job.id === notifiedId) return;
  const check = () => {
    if (ctx.gameState?.job?.id !== job.id) return;
    const left = job.end - Date.now();
    if (left > 0) { timer = setTimeout(check, Math.min(left, 60_000)); timer.unref(); return; }
    notifiedId = job.id;
    require('./tray.cjs').refreshMenus();
    if (!ctx.settings.notify || ctx.prefs.isQuiet(ctx.settings) || !Notification.isSupported()) return;
    const notice = new Notification({ title: '工作完成，收穫待領取', body: `${ctx.rules.siteName(job.site)}已收工，點此打開車庫領取收穫。` });
    notice.on('click', () => require('./windows.cjs').openGarage('garage'));
    notice.show();
  };
  timer = setTimeout(check, Math.max(0, Math.min(job.end - Date.now(), 60_000)));
  timer.unref();
}

module.exports = { notifyReturn };
