// Mutable state shared by the main-process modules. Always read it through this object, never copy the values.
module.exports = {
  win: null,
  garageWin: null,
  tray: null,
  skins: [],
  prefs: null, // shared settings module (ESM): validation and quiet hours
  settings: null,
  rules: null, // shared rules module (ESM), used for labels only; the server decides outcomes
  gameState: null,
  embedded: null,
  serverUrl: '',
  serverToken: '',
  quitting: false,
  packs: [],
};
