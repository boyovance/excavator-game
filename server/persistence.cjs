const fs = require('node:fs');

// Keep the last valid file as a backup; never promote corrupt JSON into that backup.
function writeJsonAtomic(file, value, backup) {
  const bytes = JSON.stringify(value, null, 2);
  fs.writeFileSync(`${file}.tmp`, bytes, { flush: true });
  if (backup && fs.existsSync(file)) {
    let valid = false;
    try { JSON.parse(fs.readFileSync(file, 'utf8')); valid = true; } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
    }
    if (valid) {
      fs.copyFileSync(file, `${backup}.tmp`);
      fs.renameSync(`${backup}.tmp`, backup);
    }
  }
  fs.renameSync(`${file}.tmp`, file);
}

function createJsonWriter({ file, backup, delayMs = 300, retryMs = 2000, onError = console.error }) {
  let pending;
  let dirty = false;
  let timer = null;
  let stopped = false;
  const clear = () => { clearTimeout(timer); timer = null; };
  const arm = (ms) => {
    if (!stopped && !timer) timer = setTimeout(flush, ms);
  };
  // Explicit replacement is transactional: failed writes leave the prior pending value intact.
  function commit(value) {
    try {
      writeJsonAtomic(file, value, backup);
      clear();
      dirty = false;
      pending = undefined;
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }
  function flush() {
    clear();
    if (!dirty) return true;
    if (commit(pending)) return true;
    arm(retryMs);
    return false;
  }
  return {
    schedule(value) { pending = value; dirty = true; arm(delayMs); },
    commit,
    flush,
    close() { stopped = true; return flush(); },
  };
}

module.exports = { writeJsonAtomic, createJsonWriter };
