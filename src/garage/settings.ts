import { api, type Settings } from '../api';
import { $ } from './dom';
import { ui } from './store';
import { bindWelcome, startWelcome } from './welcome';

export type View = 'garage' | 'settings' | 'welcome';

export function showView(view: View) {
  $('view-garage').hidden = view !== 'garage';
  $('view-settings').hidden = view !== 'settings';
  $('view-welcome').hidden = view !== 'welcome';
  $('nav').hidden = view === 'welcome';
  document.querySelectorAll<HTMLElement>('#nav button').forEach((b) => {
    b.classList.toggle('on', b.dataset.view === view);
  });
  if (view === 'welcome') startWelcome();
}

export const viewFromHash = (): View =>
  location.hash === '#settings' ? 'settings' : location.hash === '#welcome' ? 'welcome' : 'garage';

export function renderSettings() {
  const settings = ui.settings;
  const set = <T extends HTMLInputElement | HTMLSelectElement>(id: string, apply: (el: T) => void) => {
    const el = $<T>(id);
    if (document.activeElement !== el) apply(el);
  };
  set<HTMLInputElement>('set-visible', (el) => (el.checked = settings.petVisible));
  set<HTMLInputElement>('set-autostart', (el) => {
    el.checked = settings.autoStart;
    el.disabled = settings.autoStartSupported === false;
  });
  $('autostart-note').hidden = settings.autoStartSupported !== false;
  set<HTMLSelectElement>('set-jobmode', (el) => (el.value = settings.jobMode));
  set<HTMLSelectElement>('set-scale', (el) => (el.value = String(settings.scale)));
  set<HTMLSelectElement>('set-chatter', (el) => (el.value = settings.chatter));
  set<HTMLInputElement>('set-notify', (el) => (el.checked = settings.notify));
  set<HTMLInputElement>('set-quiet', (el) => (el.checked = settings.quiet.enabled));
  set<HTMLInputElement>('set-quiet-from', (el) => (el.value = settings.quiet.from));
  set<HTMLInputElement>('set-quiet-to', (el) => (el.value = settings.quiet.to));
}

export async function renderDisplays() {
  const list = await api.getDisplays();
  const el = $<HTMLSelectElement>('set-display');
  const options = [{ id: 'primary', label: '主螢幕(自動)' }, ...list];
  el.innerHTML = options.map((d) => `<option value="${d.id}">${d.label}</option>`).join('');
  el.value = options.some((d) => d.id === ui.settings.display) ? ui.settings.display : 'primary';
}

function bindData() {
  const msg = $('save-msg');
  const run = (id: string, action: () => Promise<{ ok: boolean; message: string }>) =>
    $<HTMLButtonElement>(id).addEventListener('click', async () => {
      msg.textContent = '處理中…';
      const r = await action();
      msg.textContent = r.message;
    });
  run('save-export', () => api.exportSave());
  run('save-import', () => api.importSave());
  run('save-reset', () => api.resetSave());
  $('open-backups').addEventListener('click', () => api.openFolder('backups'));
  $('open-data').addEventListener('click', () => api.openFolder('data'));
  $('open-logs').addEventListener('click', () => api.openFolder('logs'));
}

export function bindSettings() {
  bindData();
  bindWelcome();
  $('replay-guide').addEventListener('click', () => api.setSettings({ onboarding: 'welcome' }));
  $<HTMLSelectElement>('set-display').addEventListener('change', (e) =>
    api.setSettings({ display: (e.target as HTMLSelectElement).value }),
  );
  api.onDisplays(() => void renderDisplays());
  $('nav').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-view]');
    if (btn) showView(btn.dataset.view as View);
  });
  const check = (id: string, key: 'petVisible' | 'autoStart' | 'notify') =>
    $<HTMLInputElement>(id).addEventListener('change', (e) =>
      api.setSettings({ [key]: (e.target as HTMLInputElement).checked }),
    );
  check('set-visible', 'petVisible');
  check('set-autostart', 'autoStart');
  check('set-notify', 'notify');
  $<HTMLSelectElement>('set-jobmode').addEventListener('change', (e) =>
    api.setSettings({ jobMode: (e.target as HTMLSelectElement).value as Settings['jobMode'] }),
  );
  $<HTMLSelectElement>('set-scale').addEventListener('change', (e) =>
    api.setSettings({ scale: Number((e.target as HTMLSelectElement).value) }),
  );
  $<HTMLSelectElement>('set-chatter').addEventListener('change', (e) =>
    api.setSettings({ chatter: (e.target as HTMLSelectElement).value as Settings['chatter'] }),
  );
  $<HTMLInputElement>('set-quiet').addEventListener('change', (e) =>
    api.setSettings({ quiet: { enabled: (e.target as HTMLInputElement).checked } }),
  );
  $<HTMLInputElement>('set-quiet-from').addEventListener('change', (e) =>
    api.setSettings({ quiet: { from: (e.target as HTMLInputElement).value } }),
  );
  $<HTMLInputElement>('set-quiet-to').addEventListener('change', (e) =>
    api.setSettings({ quiet: { to: (e.target as HTMLInputElement).value } }),
  );
}
