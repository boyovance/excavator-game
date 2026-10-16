const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ctx = require('./context.cjs');
const { logLine } = require('./log.cjs');
const { userFile } = require('./paths.cjs');
const { call } = require('./server.cjs');

// ---- save management: export, import, reset (always back up first) ----

const BACKUP_KEEP = 5;
const MAX_SAVE_BYTES = 64 * 1024;
const result = (ok, message) => ({ ok, message });

function backupCurrentSave() {
  try {
    const dir = userFile('backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(dir, `save-${stamp}.json`), JSON.stringify(ctx.gameState, null, 2));
    const old = fs.readdirSync(dir).filter((f) => f.startsWith('save-')).sort();
    for (const f of old.slice(0, Math.max(0, old.length - BACKUP_KEEP))) fs.rmSync(path.join(dir, f), { force: true });
  } catch (err) {
    logLine('backup-failed', err);
    throw err;
  }
}

async function replaceSave(nextState) {
  backupCurrentSave();
  const res = await call('/admin/replace', { method: 'POST', body: JSON.stringify({ state: nextState }) });
  if (!res.ok) throw new Error(`server answered ${res.status}`);
  ctx.gameState = await res.json();
}

const dialogParent = () => ctx.garageWin ?? undefined;

async function exportSave() {
  const picked = await dialog.showSaveDialog(dialogParent(), {
    title: '匯出存檔',
    defaultPath: `excavator-save-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (picked.canceled || !picked.filePath) return result(false, '已取消');
  fs.writeFileSync(picked.filePath, JSON.stringify({ app: 'excavator', version: 1, state: ctx.gameState }, null, 2));
  return result(true, '存檔已匯出');
}

async function importSave() {
  const picked = await dialog.showOpenDialog(dialogParent(), {
    title: '匯入存檔',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (picked.canceled || !picked.filePaths[0]) return result(false, '已取消');
  const file = picked.filePaths[0];
  if (fs.statSync(file).size > MAX_SAVE_BYTES) return result(false, '檔案太大,不像是存檔');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return result(false, '這不是有效的存檔檔案');
  }
  const incoming = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed;
  if (!incoming || typeof incoming !== 'object' || !('coins' in incoming)) return result(false, '這不是有效的存檔檔案');
  const sure = await dialog.showMessageBox(dialogParent(), {
    type: 'warning',
    buttons: ['取消', '匯入並覆蓋'],
    defaultId: 0,
    cancelId: 0,
    message: '匯入會覆蓋目前的進度',
    detail: '目前的進度會先自動備份,之後可以在資料夾裡找回。',
  });
  if (sure.response !== 1) return result(false, '已取消');
  await replaceSave(incoming);
  return result(true, '存檔已匯入');
}

async function resetSave() {
  const sure = await dialog.showMessageBox(dialogParent(), {
    type: 'warning',
    buttons: ['取消', '重置進度'],
    defaultId: 0,
    cancelId: 0,
    message: '要重置所有進度嗎?',
    detail: '金幣、零件、等級都會回到初始狀態。目前的進度會先自動備份。',
  });
  if (sure.response !== 1) return result(false, '已取消');
  await replaceSave(null);
  return result(true, '進度已重置');
}

const guarded = (fn) => async () => {
  try {
    return await fn();
  } catch (err) {
    logLine('save-management', err);
    return result(false, '操作失敗,詳情見日誌');
  }
};

module.exports = {
  exportSave: guarded(exportSave),
  importSave: guarded(importSave),
  resetSave: guarded(resetSave),
};
