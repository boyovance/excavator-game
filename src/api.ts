import { normalize, reduce, stamp, type Action, type ClientAction, type GameState } from './shared/reducer.mjs';
import { mergeSettings, normalizeSettings, type Settings, type SettingsPatch } from './shared/settings.mjs';

export type { Settings, SettingsPatch };

/** A downloaded, verified style pack served from the local cache. */
export interface PackInfo {
  id: string;
  name: string;
  pixelArt: boolean;
  dirt: string[];
  frames: Record<string, string>;
  base: string;
}

/** Small actions the pet can play; also offered in the "do an action" menu. */
export type ActionName = 'stretch' | 'wave' | 'tinker' | 'look' | 'hop';

export interface DisplayInfo {
  id: string;
  label: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface ExcavatorApi {
  exportSave(): Promise<ActionResult>;
  importSave(): Promise<ActionResult>;
  resetSave(): Promise<ActionResult>;
  openFolder(kind: 'logs' | 'backups' | 'data'): void;
  getDisplays(): Promise<DisplayInfo[]>;
  onDisplays(cb: (list: DisplayInfo[]) => void): void;
  reportError(message: string): void;
  getPacks(): Promise<PackInfo[]>;
  onPacks(cb: (packs: PackInfo[]) => void): void;
  getSettings(): Promise<Settings>;
  setSettings(patch: SettingsPatch): void;
  onSettings(cb: (s: Settings) => void): void;
  getState(): Promise<GameState>;
  dispatch(action: ClientAction): void;
  onState(cb: (s: GameState) => void): void;
  registerSkins(list: { id: string; name: string }[]): void;
  setInteractive(v: boolean): void;
  showMenu(): void;
  openGarage(tab?: 'garage' | 'settings' | 'welcome'): void;
  onGarageTab(cb: (tab: 'garage' | 'settings' | 'welcome') => void): void;
  onDigNow(cb: () => void): void;
  onPlayAction(cb: (name: ActionName) => void): void;
}

const STATE_KEY = 'excavator-state';
const SETTINGS_KEY = 'excavator-settings';

/** Browser-only stand-in so the pages can be developed without Electron. */
function createMock(): ExcavatorApi {
  const readState = (): GameState => {
    try {
      return normalize(JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null'));
    } catch {
      return normalize(null);
    }
  };
  const readSettings = (): Settings => {
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
    } catch {
      return normalizeSettings(null);
    }
  };
  let state = readState();
  let settings = readSettings();
  const stateCbs: ((s: GameState) => void)[] = [];
  const settingsCbs: ((s: Settings) => void)[] = [];
  const emitState = () => stateCbs.forEach((cb) => cb(state));
  const emitSettings = () => settingsCbs.forEach((cb) => cb(settings));

  window.addEventListener('storage', (e) => {
    if (e.key === STATE_KEY) {
      state = readState();
      emitState();
    } else if (e.key === SETTINGS_KEY) {
      settings = readSettings();
      emitSettings();
    }
  });

  const desktopOnly = async (): Promise<ActionResult> => ({ ok: false, message: '這個功能只在桌面版可用' });
  return {
    exportSave: desktopOnly,
    importSave: desktopOnly,
    resetSave: desktopOnly,
    openFolder() {},
    getDisplays: async () => [{ id: 'primary', label: '主螢幕' }],
    onDisplays() {},
    reportError() {},
    getPacks: async () => [],
    onPacks() {},
    getSettings: async () => settings,
    setSettings(patch) {
      settings = mergeSettings(settings, patch);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      emitSettings();
    },
    onSettings: (cb) => void settingsCbs.push(cb),
    getState: async () => state,
    dispatch(action) {
      const now = Date.now();
      const internal = (
        action.type === 'wear' || action.type === 'rest' ? { ...action, amount: 1 } : action
      ) as Action;
      const next = reduce(reduce(state, { type: 'tick', now }), stamp(internal, now));
      if (next === state) return;
      state = next;
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      emitState();
    },
    onState: (cb) => void stateCbs.push(cb),
    registerSkins() {},
    setInteractive() {},
    showMenu() {},
    openGarage(tab = 'garage') {
      window.open(`garage.html#${tab}`, 'garage', 'width=560,height=760');
    },
    onGarageTab() {},
    onDigNow() {},
    onPlayAction() {},
  };
}

export const hasNative = !!window.api;
export const api: ExcavatorApi = window.api ?? createMock();

if (hasNative) {
  window.addEventListener('error', (e) => api.reportError(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) =>
    api.reportError(String((e.reason as Error | undefined)?.stack ?? e.reason)),
  );
}
