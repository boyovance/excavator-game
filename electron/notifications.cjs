const { Notification } = require('electron');
const ctx = require('./context.cjs');

// Tells the player the excavator is back, unless they turned notifications off or it is quiet time.
function notifyReturn(prev, next) {
  const returned = !!next.report && next.report.at !== prev?.report?.at;
  const mayNotify = ctx.settings.notify && !ctx.prefs.isQuiet(ctx.settings);
  if (returned && !next.report.seen && mayNotify && Notification.isSupported()) {
    const names = next.report.drops.map((d) => `「${ctx.rules.partName(d.id)}」`).join('');
    const drop = names ? `,帶回零件${names}` : '';
    new Notification({ title: '挖掘機回來了', body: `收工!賺了 ${next.report.coins} 金幣${drop}` }).show();
  }
}

module.exports = { notifyReturn };
