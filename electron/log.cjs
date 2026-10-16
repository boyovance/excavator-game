const fs = require('fs');
const path = require('path');
const { userFile } = require('./paths.cjs');

// ---- diagnostics: one rotating log file, kept small ----

const LOG_MAX_BYTES = 512 * 1024;
const logDir = () => userFile('logs');
let lastLogAt = 0;

function logLine(kind, detail) {
  try {
    const now = Date.now();
    if (now - lastLogAt < 50) return; // a runaway error loop must not flood the disk
    lastLogAt = now;
    fs.mkdirSync(logDir(), { recursive: true });
    const file = path.join(logDir(), 'app.log');
    if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX_BYTES) fs.renameSync(file, `${file}.old`);
    const text = String(detail?.stack ?? detail).slice(0, 4000);
    fs.appendFileSync(file, `${new Date(now).toISOString()} [${kind}] ${text}\n`);
  } catch {}
}

function installCrashLogging() {
  process.on('uncaughtException', (err) => logLine('main-error', err));
  process.on('unhandledRejection', (err) => logLine('main-rejection', err));
}

module.exports = { logDir, logLine, installCrashLogging };
