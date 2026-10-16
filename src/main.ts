import Phaser from 'phaser';
import { api, hasNative } from './api';
import { ExcavatorScene } from './ExcavatorScene';
import { getSkin, setRemoteSkins, SKINS } from './skins';

const registerSkins = () => api.registerSkins(SKINS.map((s) => ({ id: s.id, name: s.name })));

async function boot() {
  setRemoteSkins(await api.getPacks());
  registerSkins();
  let settings = await api.getSettings();
  const state = await api.getState();
  await getSkin(settings.skin).ready?.();
  if (!hasNative) document.body.classList.add('web');

  const scene = new ExcavatorScene(settings, state);
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game',
    transparent: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    render: { roundPixels: true },
    scene,
  });

  api.onSettings((s) => {
    settings = s;
    scene.applySettings(s);
  });
  api.onPacks((packs) => {
    setRemoteSkins(packs);
    registerSkins();
    scene.applySettings(settings);
  });
  api.onState((s) => scene.applyState(s));
  api.onDigNow(() => scene.digNow());
  api.onPlayAction((name) => scene.playAction(name));
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __excavator: ExcavatorScene }).__excavator = scene;
  }

  if (hasNative) {
    let interactive = false;
    const setInteractive = (v: boolean) => {
      if (v === interactive) return;
      interactive = v;
      api.setInteractive(v);
    };
    window.addEventListener('mousemove', (e) => {
      setInteractive(scene.isDragging() || scene.hitTest(e.clientX, e.clientY));
    });
    document.addEventListener('mouseleave', () => {
      if (!scene.isDragging()) setInteractive(false);
    });
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (scene.hitTest(e.clientX, e.clientY)) api.showMenu();
    });
  } else {
    window.addEventListener('keydown', (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < SKINS.length) api.setSettings({ skin: SKINS[i].id });
      else if (e.key.toLowerCase() === 'd') scene.digNow();
      else if (e.key.toLowerCase() === 'g') api.openGarage();
    });
  }
}

boot();
