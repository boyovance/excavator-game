import Phaser from 'phaser';
import { api, type ActionName, type Settings } from './api';
import { POSES, type PoseName } from './poses';
import { drawPose } from './render';
import { getSkin } from './skins';
import { H, W, type Build, type Skin } from './skins/types';
import { actionSteps, chooseAction } from './scene/actions';
import { popBanner, reportLines } from './scene/banner';
import {
  DIG_FRAME_MS,
  DIG_SEQ,
  workMotion,
  pick,
  RECOVER_AT,
  SLOW_BELOW,
  WALK_FRAME_MS,
  WALK_WEAR_PER_SEC,
  type PlayStep,
  type State,
} from './scene/constants';
import { Effects } from './scene/effects';
import { Life, type LifeHost } from './scene/life';
import { Loot } from './scene/loot';
import { Progress } from './scene/progress';
import { JobController } from './scene/jobs';
import { Scenery } from './scene/scenery';
import { Speech } from './scene/speech';
import { busyLine, tipText } from './scene/tips';
import { partById } from './shared/parts.mjs';
import { desktopJob } from './shared/jobs.mjs';
import {
  digCoins,
  levelInfo,
  siteName,
  type GameState,
  type Report,
} from './shared/reducer.mjs';
import { CHATTER_FACTOR, isQuiet } from './shared/settings.mjs';
import {
  ACTION,
  dayPeriod,
  EQUIP,
  GREETING,
  LEVEL_UP,
  POKE,
  REPAIR,
  SLEEP,
  WORK,
} from './shared/lines.mjs';

export class ExcavatorScene extends Phaser.Scene {
  private sprite?: Phaser.GameObjects.Image;
  private skin: Skin;
  private wantedSkin: string;
  private settings: Settings;
  /** pixels per logical unit: the chosen size, times how big this machine type is */
  private get scalePx() {
    return this.settings.scale * (partById(this.visualEquipment.machine)?.machine?.size ?? 1);
  }
  private game_: GameState;
  private current: State = 'idle';
  private trace: string[] = [];

  private get state(): State {
    return this.current;
  }

  private set state(next: State) {
    if (next !== this.current) {
      this.trace.push(`${Math.round(performance.now())}:${this.current}>${next}`);
      if (this.trace.length > 40) this.trace.shift();
    }
    this.current = next;
  }
  private pose: PoseName | '' = '';
  private timer = 800;
  private frameTimer = 0;
  private targetX = 0;
  private digIdx = 0;
  private vy = 0;
  private dragging = false;
  private walkWear = 0;
  private zTimer = 0;
  private restTimer = 0;
  private jobs: JobController;
  private pokeBlockedUntil = 0;
  private lastTapAt = 0;
  private pokeTimes: number[] = [];
  private lastSaid = '';
  private playSteps: PlayStep[] = [];
  private playIdx = 0;
  private playDone?: () => void;
  private edgeDir = 1;
  private pendingReport: Report | null = null;
  private host: LifeHost;
  private life: Life;
  private effects: Effects;
  private loot: Loot;
  private speech: Speech;
  private progress: Progress;
  private scenery: Scenery;

  constructor(settings: Settings, gameState: GameState) {
    super('excavator');
    this.skin = getSkin(settings.skin);
    this.wantedSkin = this.skin.id;
    this.settings = settings;
    this.game_ = gameState;

    const self = this;
    this.host = {
      scene: this,
      get sprite() {
        return self.sprite;
      },
      get scalePx() {
        return self.scalePx;
      },
      get ground() {
        return self.ground;
      },
      get skin() {
        return self.skin;
      },
      get build() {
        return self.build;
      },
      get pose() {
        return self.pose;
      },
      get working() {
        return self.state === 'working';
      },
      get state() {
        return self.state;
      },
      get settings() {
        return self.settings;
      },
      get game() {
        return self.game_;
      },
      cheer: (ms) => this.enterCheer(ms),
      leaveWorking: () => this.leaveWorking(),
      showTip: () => this.showTip(),
      say: (text, ms) => this.say(text, ms),
    };
    this.effects = new Effects(this.host);
    this.loot = new Loot(this.host, this.effects);
    this.speech = new Speech(this.host);
    this.progress = new Progress(this.host);
    this.scenery = new Scenery(this.host);
    this.life = new Life(this.host);
    this.jobs = new JobController({
      state: () => this.state,
      visible: () => !!this.sprite?.visible,
      mode: () => this.settings.jobMode,
      working: () => this.enterWorking(),
      waiting: () => this.enterWaiting(),
      leave: () => this.startLeaving(),
      returning: (report) => this.startReturning(report),
      clear: () => this.leaveWorking(),
      claimed: (report) => {
        this.showReport(report);
        api.dispatch({ type: 'ackReport' });
        if (!['drag', 'fall'].includes(this.state)) this.enterCheer(1600);
      },
      recalled: () => {
        this.say(pick(WORK.recalled));
        if (!['drag', 'fall'].includes(this.state)) this.enterIdle(800);
      },
      started: (job) => {
        if (['poke', 'garage', 'job'].includes(this.settings.onboarding)) {
          this.advanceTip('done', '出發！收工後到車庫領取收穫吧');
        } else if (this.settings.onboarding === 'done') this.say(pick(WORK.start(siteName(job.site))), 3000);
      },
    });
  }

  create() {
    this.buildTextures();
    this.sprite = this.add.image(this.scale.width * 0.3, this.ground, 'exc-idle').setOrigin(0.5, 1);
    this.applyScale();
    this.show('idle');

    this.sprite.setInteractive({ draggable: true, useHandCursor: true });
    // a plain click must not count as a drag, or the window would grow and shrink on every click
    this.input.dragDistanceThreshold = 6;
    this.input.mouse?.disableContextMenu();
    this.sprite.on('dragstart', (p: Phaser.Input.Pointer) => {
      this.trace.push(
        `${Math.round(performance.now())}:dragstart thr=${this.input.dragDistanceThreshold} ` +
          `ptr=(${Math.round(p.x)},${Math.round(p.y)}) down=(${Math.round(p.downX)},${Math.round(p.downY)})`,
      );
      if (p.rightButtonDown()) return;
      if (this.state === 'working' || this.state === 'waiting') this.leaveWorking();
      this.state = 'drag';
      this.dragging = true;
      this.vy = 0;
      this.show('lift');
    });
    this.sprite.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.state !== 'drag' || !this.sprite) return;
      const halfW = (W * this.scalePx) / 2;
      this.sprite.x = Phaser.Math.Clamp(dragX, halfW, this.scale.width - halfW);
      this.sprite.y = Phaser.Math.Clamp(dragY, H * this.scalePx, this.ground);
    });
    this.sprite.on('dragend', () => {
      if (this.state !== 'drag') return;
      this.dragging = false;
      this.state = 'fall';
    });
    this.sprite.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 || p.getDistance() > 6 || p.getDuration() > 400) return;
      this.onPoke();
    });

    if (this.deskJob) {
      if (Date.now() >= this.deskJob.end) {
        this.enterWaiting();
      } else if (this.settings.jobMode === 'stay') {
        this.enterWorking();
      } else {
        this.state = 'away';
        this.sprite.setVisible(false);
      }
    } else if (this.unseenDesktopReport) {
      this.startReturning(this.unseenDesktopReport);
    } else if (['poke', 'garage', 'job'].includes(this.settings.onboarding)) {
      this.time.delayedCall(1500, () => this.showTip());
    } else if (this.settings.onboarding === 'done') {
      // hold the first random action back so nothing starts before the greeting
      this.timer = 6500;
      this.time.delayedCall(1500, () => this.greet());
    }

    // the window only resizes when the screen layout changes; keep the pet standing on the new floor
    this.scale.on('resize', () => {
      this.scale.updateBounds();
      if (!this.sprite) return;
      if (this.state !== 'drag' && this.state !== 'fall') this.sprite.y = this.ground;
      const halfW = (W * this.scalePx) / 2;
      this.sprite.x = Phaser.Math.Clamp(this.sprite.x, halfW, Math.max(halfW, this.scale.width - halfW));
    });
  }

  private showTip() {
    const text = tipText(this.settings.onboarding, this.game_.name);
    if (text) this.say(text, 7000);
  }

  private advanceTip(next: Settings['onboarding'], message?: string) {
    // update locally right away: a double click can pass two steps before the setting round-trips
    this.settings = { ...this.settings, onboarding: next };
    api.setSettings({ onboarding: next });
    this.life.resetTip();
    if (message) this.say(message, 5000);
    else if (next !== 'done') this.time.delayedCall(1800, () => this.showTip());
  }

  private get ground() {
    return this.scale.height;
  }

  private get deskJob() {
    return desktopJob(this.game_);
  }

  private get unseenDesktopReport() {
    return this.game_.reports.find((r) => r.desktop && !r.seen) ?? null;
  }

  private get visualEquipment() {
    return this.deskJob?.equippedSnapshot ?? this.game_.equipped;
  }

  private get build(): Build {
    return { ...this.visualEquipment, tint: this.game_.tint } as unknown as Build;
  }

  /** how the machine moves while it works a job, which depends on the tool it carries */
  private get motion() {
    return workMotion(partById(this.build.bucket)?.shape?.tool);
  }

  private get speedMult() {
    const tracks = partById(this.build.tracks)?.stats?.speed ?? 1;
    return tracks * (this.game_.durability < SLOW_BELOW ? 0.6 : 1);
  }

  isDragging() {
    return this.dragging;
  }

  hitTest(x: number, y: number) {
    const inside = (o: Phaser.GameObjects.Image) => {
      const b = o.getBounds();
      return x >= b.x - 4 && x <= b.right + 4 && y >= b.y - 4 && y <= b.bottom + 4;
    };
    if (this.loot.cards.some(inside)) return true;
    if (!this.sprite || !this.sprite.visible) return false;
    return inside(this.sprite);
  }

  applySettings(s: Settings) {
    const previousMode = this.settings.jobMode;
    const previousStep = this.settings.onboarding;
    this.settings = s;
    if (s.onboarding !== previousStep && ['poke', 'garage', 'job'].includes(s.onboarding)) {
      this.life.resetTip();
      this.time.delayedCall(900, () => this.showTip());
    }
    this.wantedSkin = s.skin;
    this.applyScale();
    if (this.deskJob && Date.now() < this.deskJob.end && this.sprite && previousMode !== s.jobMode) {
      if (s.jobMode === 'away' && this.state === 'working') {
        this.leaveWorking();
        this.startLeaving();
      } else if (s.jobMode === 'stay' && (this.state === 'away' || this.state === 'leave')) {
        this.startReturning(null);
      }
    }
    if (this.skin.id === s.skin) return;
    const next = getSkin(s.skin);
    void (next.ready?.() ?? Promise.resolve()).then(() => {
      if (this.wantedSkin !== next.id || !this.sprite) return;
      this.skin = next;
      this.refreshTextures();
      this.applyScale();
    });
  }

  /** Comment on a part being swapped or the machine being repaired. */
  private reactToChanges(prev: GameState, next: GameState) {
    if (this.settings.onboarding === 'welcome') return;
    const changed = Object.keys(next.equipped).filter((k) => next.equipped[k] !== prev.equipped[k]);
    let line: string | undefined;
    // an import or reset changes many slots at once; that deserves no remark
    if (changed.length >= 1 && changed.length <= 3) line = pick(EQUIP[changed[0]] ?? ['']) || undefined;
    else if (next.durability - prev.durability >= 20) line = pick(REPAIR);
    if (!line) return;
    this.say(line, 2800);
    if (this.state === 'idle' || this.state === 'walk') this.enterCheer(900);
  }

  applyState(next: GameState) {
    const prev = this.game_;
    const buildChanged =
      JSON.stringify(desktopJob(next)?.equippedSnapshot ?? next.equipped) !== JSON.stringify(desktopJob(prev)?.equippedSnapshot ?? prev.equipped) ||
      JSON.stringify(next.tint) !== JSON.stringify(prev.tint);
    this.game_ = next;
    if (buildChanged && this.sprite) this.refreshTextures();
    if (!this.sprite) return;
    this.reactToChanges(prev, next);

    this.jobs.changed(prev, next);

    const before = levelInfo(prev.xp).level;
    const after = levelInfo(next.xp).level;
    if (after > before) {
      this.say(pick(LEVEL_UP(after)), 3200);
      if (this.state === 'idle' || this.state === 'walk') this.enterCheer(1600);
    }
  }

  /** Speech bubble above the pet. The news feature will reuse this to broadcast. */
  say(text: string, ms = 2600) {
    if (!this.sprite || !this.sprite.visible) return;
    this.lastSaid = text;
    this.trace.push(`${Math.round(performance.now())}:say "${text}"`);
    this.speech.show(text, ms);
  }

  digNow() {
    if (this.state === 'idle' || this.state === 'walk') this.enterDig();
  }

  private onPoke() {
    this.trace.push(`${Math.round(performance.now())}:onPoke state=${this.state}`);
    if (['drag', 'fall', 'leave', 'away', 'return'].includes(this.state)) return;
    const now = Date.now();
    if (now - this.lastTapAt < 350) {
      this.lastTapAt = 0;
      api.openGarage();
      if (this.settings.onboarding === 'garage') this.advanceTip('job');
      return;
    }
    this.lastTapAt = now;
    if (this.state === 'waiting') {
      this.say('收工了！雙擊打開車庫，領取這次收穫', 3500);
      return;
    }
    if (this.settings.onboarding === 'poke') this.advanceTip('garage');
    const counts = now >= this.pokeBlockedUntil;
    this.pokeBlockedUntil = now + 1500;

    // a flurry of clicks gets a playful answer instead of the same line again
    this.pokeTimes = [...this.pokeTimes.filter((t) => now - t < 6000), now];
    const flurry = this.pokeTimes.length;

    if (this.state === 'broken') {
      this.say(pick(POKE.broken));
      return;
    }
    if (this.state === 'working') {
      // a quick cheer so the click clearly registered, then straight back to the job
      this.leaveWorking();
      this.enterCheer(900);
      this.say(busyLine(this.deskJob), 3000);
      if (counts) api.dispatch({ type: 'poke' });
      return;
    }
    if (this.state === 'sleep') {
      this.enterIdle(1200);
      this.say(pick(POKE.woken));
    } else {
      this.enterCheer(1200);
      const pool =
        flurry >= 6 ? POKE.dizzy : flurry >= 3 ? POKE.ticklish : this.game_.mood >= 70 ? POKE.happy : POKE.calm;
      this.say(pick(pool));
    }
    if (counts) api.dispatch({ type: 'poke' });
  }

  private enterPlay(steps: PlayStep[], done?: () => void) {
    this.state = 'play';
    this.playSteps = steps;
    this.playIdx = 0;
    this.playDone = done;
    this.frameTimer = 0;
    if (this.sprite) this.sprite.angle = 0;
  }

  /** Public so the "do an action" menu can trigger it. */
  playAction(name: ActionName) {
    if (this.state !== 'idle' && this.state !== 'walk') return;
    this.say(pick(ACTION[name]), 2400);
    this.enterPlay(actionSteps(name, this.sprite?.flipX ?? false));
  }

  /** Say goodnight, nod off a couple of times, then really fall asleep. */
  private nodOff() {
    this.say(pick(SLEEP.sleepy), 2400);
    this.enterPlay(
      [
        { pose: 'idle', ms: 900 },
        { pose: 'sleep', ms: 700 },
        { pose: 'idle', ms: 700 },
        { pose: 'sleep', ms: 900 },
      ],
      () => this.enterSleep(),
    );
  }

  /** A friendly hello on start-up, unless the pet has been told to stay quiet. */
  private greet() {
    if (CHATTER_FACTOR[this.settings.chatter] === 0 || isQuiet(this.settings)) return;
    if (this.state !== 'idle' && this.state !== 'walk') return;
    this.say(pick(GREETING[dayPeriod(new Date().getHours())]), 4500);
    this.enterPlay(actionSteps('wave', this.sprite?.flipX ?? false));
  }

  /** Test hook: which poses draw something on the edge of the picture (so the machine is cut off there). */
  debugEdges() {
    const out: Record<string, string> = {};
    for (const name of Object.keys(POSES)) {
      const src = this.textures.get(`exc-${name}`).getSourceImage() as HTMLCanvasElement;
      const ctx = src.getContext('2d')!;
      const w = src.width;
      const h = src.height;
      const touches = (x: number, y: number, cw: number, ch: number) => ctx.getImageData(x, y, cw, ch).data.some((v, i) => i % 4 === 3 && v > 40);
      const sides = [touches(w - 1, 0, 1, h) ? 'right' : '', touches(0, 0, w, 1) ? 'top' : '', touches(0, 0, 1, h) ? 'left' : ''].filter(Boolean);
      if (sides.length) out[name] = sides.join('+');
    }
    return out;
  }

  /** Test hook, only reachable when the page is opened with ?debug. */
  debugState() {
    return {
      state: this.state,
      pose: this.pose,
      flip: this.sprite?.flipX ?? false,
      y: this.sprite?.y ?? 0,
      said: this.lastSaid,
      trace: this.trace.slice(-14),
      now: Math.round(performance.now()),
    };
  }

  private refreshTextures() {
    this.buildTextures();
    this.applyScale();
    this.pose = '';
    this.show(this.poseForState());
  }

  private poseForState(): PoseName {
    switch (this.state) {
      case 'drag':
      case 'fall':
        return 'lift';
      case 'broken':
        return 'broken';
      case 'sleep':
        return 'sleep';
      case 'cheer':
        return 'cheer0';
      case 'play':
        return this.playSteps[Math.max(0, this.playIdx - 1)]?.pose ?? 'idle';
      case 'dig':
        return DIG_SEQ[Math.max(0, this.digIdx - 1)];
      case 'walk':
      case 'leave':
      case 'return':
        return 'walk0';
      case 'working':
        return this.motion.seq[Math.max(0, this.digIdx - 1)] ?? 'idle';
      default:
        return 'idle';
    }
  }

  private buildTextures() {
    const { res, smooth } = this.skin;
    for (const name of Object.keys(POSES) as PoseName[]) {
      const key = `exc-${name}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, Math.ceil(W * res), Math.ceil(H * res));
      if (!tex) continue;
      drawPose(tex.getContext(), this.skin, POSES[name], this.build, name);
      tex.refresh();
      tex.setFilter(smooth ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    }
  }

  private applyScale() {
    this.sprite?.setScale(this.scalePx / this.skin.res);
  }

  private show(name: PoseName) {
    if (!this.sprite || this.pose === name) return;
    this.pose = name;
    this.sprite.setTexture(`exc-${name}`);
  }

  private enterIdle(ms: number) {
    this.state = 'idle';
    this.timer = ms;
    if (this.sprite) this.sprite.angle = 0;
    this.show('idle');
  }

  private enterDig() {
    this.state = 'dig';
    this.digIdx = 0;
    this.frameTimer = 0;
  }

  private enterBroken() {
    this.leaveWorking();
    this.state = 'broken';
    this.restTimer = 0;
    this.show('broken');
  }

  private enterSleep() {
    this.state = 'sleep';
    this.timer = Phaser.Math.Between(20_000, 40_000);
    this.zTimer = 0;
    this.show('sleep');
  }

  private enterCheer(ms: number) {
    this.state = 'cheer';
    this.timer = ms;
    this.frameTimer = 0;
    this.show('cheer0');
  }

  private enterWorking() {
    const s = this.sprite!;
    this.state = 'working';
    this.digIdx = 0;
    this.frameTimer = 0;
    s.setVisible(true);
    s.angle = 0;
    this.progress.enter();
    if (this.deskJob) this.scenery.show(this.deskJob.site);
  }

  private leaveWorking() {
    this.progress.leave();
    this.scenery.hide();
  }

  private enterWaiting() {
    this.leaveWorking();
    this.state = 'waiting';
    this.sprite!.setVisible(true).setAngle(0);
    this.show('idle');
    this.progress.enter();
    this.say('收工了！到車庫領取收穫吧', 3500);
  }

  private startWalk() {
    if (!this.sprite) return;
    const halfW = (W * this.scalePx) / 2;
    const max = Math.max(halfW + 1, this.scale.width - halfW);
    this.targetX = Phaser.Math.Between(halfW, max);
    if (Math.abs(this.targetX - this.sprite.x) < 80) {
      this.enterIdle(Phaser.Math.Between(800, 1600));
      return;
    }
    this.state = 'walk';
    this.frameTimer = 0;
  }

  private chooseNext() {
    chooseAction(this.game_.mood, this.game_.durability, {
      walk: () => this.startWalk(),
      dig: () => this.enterDig(),
      idle: (ms) => this.enterIdle(ms),
      nodOff: () => this.nodOff(),
      cheer: (ms) => this.enterCheer(ms),
      act: (name) => this.playAction(name),
    });
  }

  private startLeaving() {
    const s = this.sprite!;
    this.dragging = false;
    this.state = 'leave';
    this.edgeDir = s.x < this.scale.width / 2 ? -1 : 1;
    s.angle = 0;
    s.y = this.ground;
    this.frameTimer = 0;
  }

  private startReturning(report: Report | null) {
    const s = this.sprite!;
    const halfW = (W * this.scalePx) / 2;
    const side = Math.random() < 0.5 ? -1 : 1;
    s.setVisible(true);
    s.angle = 0;
    s.y = this.ground;
    s.x = side < 0 ? -halfW : this.scale.width + halfW;
    this.targetX = Phaser.Math.Between(this.scale.width * 0.25, this.scale.width * 0.75);
    this.pendingReport = report;
    this.state = 'return';
    this.frameTimer = 0;
  }

  private showReport(r: Report) {
    popBanner(this.host, reportLines(r), r.jackpot ? 5000 : 3500);
    this.loot.spawn(r);
  }

  private stepWalk(dir: number, delta: number, dt: number) {
    const s = this.sprite!;
    s.setFlipX(dir < 0);
    s.x += dir * 14 * this.scalePx * this.speedMult * dt;
    this.frameTimer -= delta;
    if (this.frameTimer <= 0) {
      this.frameTimer = WALK_FRAME_MS / this.speedMult;
      this.show(this.pose === 'walk0' ? 'walk1' : 'walk0');
    }
  }

  private finishDig() {
    this.effects.popCoins(digCoins(this.game_.equipped));
    if (Math.random() < 0.2) this.say(pick(WORK.digDone), 1800);
    api.dispatch({ type: 'dig' });
  }

  update(time: number, rawDelta: number) {
    const s = this.sprite;
    if (!s) return;
    // After sleep or a long stall the frame gap is huge; cap it so nothing teleports or times out at once.
    const delta = Math.min(rawDelta, 100);
    const dt = delta / 1000;
    this.effects.updateParticles(dt);
    this.effects.updateSmoke(delta, this.game_.durability, this.state);
    this.life.update(delta);
    this.speech.place();

    this.jobs.resume(this.deskJob);

    const busy = ['broken', 'drag', 'fall', 'leave', 'away', 'return', 'waiting'].includes(this.state);
    if (this.game_.durability <= 0 && !busy) this.enterBroken();

    switch (this.state) {
      case 'idle':
        if (this.deskJob && this.settings.jobMode === 'stay') {
          this.enterWorking();
          break;
        }
        this.timer -= delta;
        if (this.timer <= 0) this.chooseNext();
        break;

      case 'working':
        this.frameTimer -= delta;
        if (this.frameTimer <= 0) {
          const motion = this.motion;
          if (this.digIdx >= motion.seq.length) {
            this.digIdx = 0;
            this.show('idle');
            this.frameTimer = Phaser.Math.Between(500, 1200);
          } else {
            const name = motion.seq[this.digIdx++];
            this.show(name);
            this.frameTimer = motion.frameMs;
            if (motion.dirt && name === 'dig2') this.effects.spawnDirt('dig2', 4, [80, 180], [10, 70]);
            if (motion.dirt && name === 'dump1') this.effects.spawnDirt('dump1', 5, [0, 60], [5, 40]);
          }
        }
        this.progress.draw(this.deskJob);
        this.scenery.update();
        break;

      case 'waiting':
        this.progress.draw(this.deskJob);
        break;

      case 'walk': {
        const dir = Math.sign(this.targetX - s.x) || 1;
        this.stepWalk(dir, delta, dt);
        this.walkWear += WALK_WEAR_PER_SEC * dt;
        if (this.walkWear >= 1) {
          api.dispatch({ type: 'wear' });
          this.walkWear -= 1;
        }
        if (Math.abs(this.targetX - s.x) < 3) this.enterIdle(Phaser.Math.Between(600, 1800));
        break;
      }

      case 'dig':
        this.frameTimer -= delta;
        if (this.frameTimer <= 0) {
          if (this.digIdx >= DIG_SEQ.length) {
            this.finishDig();
            this.enterIdle(Phaser.Math.Between(900, 2000));
            break;
          }
          const name = DIG_SEQ[this.digIdx++];
          this.show(name);
          this.frameTimer = DIG_FRAME_MS;
          if (name === 'dig2') this.effects.spawnDirt('dig2', 4, [80, 180], [10, 70]);
          if (name === 'dump1') this.effects.spawnDirt('dump1', 5, [0, 60], [5, 40]);
        }
        break;

      case 'sleep':
        this.timer -= delta;
        this.zTimer -= delta;
        if (this.zTimer <= 0) {
          this.zTimer = 1500;
          this.effects.spawnZ();
        }
        if (this.timer <= 0) {
          this.enterIdle(800);
          this.say(pick(SLEEP.wake));
        }
        break;

      case 'play':
        this.frameTimer -= delta;
        if (this.frameTimer <= 0) {
          if (this.playIdx >= this.playSteps.length) {
            const done = this.playDone;
            this.playDone = undefined;
            this.enterIdle(Phaser.Math.Between(800, 1800));
            done?.();
            break;
          }
          const step = this.playSteps[this.playIdx++];
          this.show(step.pose);
          if (step.flip !== undefined) s.setFlipX(step.flip);
          this.frameTimer = step.ms;
          if (step.hop) {
            this.tweens.add({ targets: s, y: s.y - this.scalePx * 6, duration: 170, yoyo: true, ease: 'Quad.easeOut' });
          }
        }
        break;

      case 'cheer':
        this.timer -= delta;
        this.frameTimer -= delta;
        if (this.frameTimer <= 0) {
          this.frameTimer = 220;
          this.show(this.pose === 'cheer0' ? 'cheer1' : 'cheer0');
        }
        if (this.timer <= 0) this.enterIdle(1000);
        break;

      case 'drag':
        s.angle = Math.sin(time / 140) * 5;
        break;

      case 'fall':
        this.vy += 2000 * dt;
        s.y += this.vy * dt;
        s.angle = Math.sin(time / 90) * 3;
        if (s.y >= this.ground) {
          s.y = this.ground;
          this.vy = 0;
          this.enterIdle(600);
        }
        break;

      case 'broken':
        this.restTimer += delta;
        if (this.restTimer >= 3000) {
          this.restTimer = 0;
          api.dispatch({ type: 'rest' });
        }
        if (this.game_.durability >= RECOVER_AT) this.enterIdle(800);
        break;

      case 'leave': {
        this.stepWalk(this.edgeDir, delta, dt);
        const halfW = (W * this.scalePx) / 2;
        if (s.x < -halfW || s.x > this.scale.width + halfW) {
          this.state = 'away';
          s.setVisible(false);
        }
        break;
      }

      case 'away':
        break;

      case 'return': {
        const dir = Math.sign(this.targetX - s.x) || 1;
        this.stepWalk(dir, delta, dt);
        if (Math.abs(this.targetX - s.x) < 4) {
          const report = this.pendingReport;
          this.pendingReport = null;
          if (report) {
            this.showReport(report);
            api.dispatch({ type: 'ackReport' });
          }
          this.enterIdle(1500);
          this.jobs.resume(this.deskJob);
        }
        break;
      }
    }
  }
}
