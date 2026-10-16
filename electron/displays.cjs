const { screen } = require('electron');
const ctx = require('./context.cjs');

// The chosen display, or the primary one when it is gone (unplugged monitor, remote session).
function targetDisplay() {
  const wanted = ctx.settings?.display ?? 'primary';
  return (
    screen.getAllDisplays().find((d) => String(d.id) === wanted) ?? screen.getPrimaryDisplay()
  );
}

function listDisplays() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: String(d.id),
    label: `螢幕 ${i + 1}(${d.size.width}×${d.size.height})${d.id === primaryId ? ',主螢幕' : ''}`,
  }));
}

// The window covers the whole work area and ignores the mouse except over the pet. It never changes size:
// resizing a transparent window briefly shows the old picture in the wrong place, which looked like the pet
// flying to the top of the screen when it was picked up.
function placeWindow() {
  if (!ctx.win) return;
  const wa = targetDisplay().workArea;
  ctx.win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
}

module.exports = { targetDisplay, listDisplays, placeWindow };
