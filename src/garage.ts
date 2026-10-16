import { api } from './api';
import { getSkin, setRemoteSkins, SKINS } from './skins';
import { $, skinEl } from './garage/dom';
import { bindJobs, renderJobs, tickJob } from './garage/jobs';
import { bindParts, renderParts } from './garage/parts';
import { bindPet, renderStatus } from './garage/pet';
import { bindGrowth, renderGrowth } from './garage/growth';
import { drawPreview } from './garage/preview';
import { bindSettings, renderDisplays, renderSettings, showView, viewFromHash } from './garage/settings';
import { ui } from './garage/store';

function render() {
  renderStatus();
  renderGrowth();
  renderJobs();
  renderParts();
}

bindParts(render);
bindJobs(render);
bindGrowth(render);
bindPet();
skinEl.addEventListener('change', () => api.setSettings({ skin: skinEl.value }));

function renderSkinOptions() {
  skinEl.replaceChildren(...SKINS.map((s) => new Option(s.name, s.id)));
  skinEl.value = ui.settings.skin;
}

async function boot() {
  setRemoteSkins(await api.getPacks());
  [ui.state, ui.settings] = await Promise.all([api.getState(), api.getSettings()]);
  renderSkinOptions();
  api.onPacks((packs) => {
    setRemoteSkins(packs);
    renderSkinOptions();
    void getSkin(ui.settings.skin).ready?.().then(drawPreview);
  });
  api.onState((s) => {
    ui.state = s;
    render();
    drawPreview();
  });
  api.onSettings((s) => {
    ui.settings = s;
    skinEl.value = s.skin;
    renderSettings();
    void getSkin(s.skin).ready?.().then(drawPreview);
  });
  bindSettings();
  renderSettings();
  void renderDisplays();
  showView(viewFromHash());
  api.onGarageTab(showView);
  await getSkin(ui.settings.skin).ready?.();
  render();
  drawPreview();
  setInterval(() => {
    ui.frame++;
    drawPreview();
  }, 300);
  setInterval(tickJob, 1000);
}

boot();
