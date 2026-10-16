import Phaser from 'phaser';
import { api, type Settings } from '../api';
import { companionDays, MILESTONES, type GameState } from '../shared/reducer.mjs';
import { CHATTER_FACTOR, isQuiet } from '../shared/settings.mjs';
import { dayPeriod, IDLE, MILESTONE } from '../shared/lines.mjs';
import { popBanner } from './banner';
import { pick, type State } from './constants';
import type { SceneHost } from './host';

/** What the pet's day-to-day life needs on top of the basics. */
export interface LifeHost extends SceneHost {
  readonly state: State;
  readonly settings: Settings;
  readonly game: GameState;
  cheer(ms: number): void;
  leaveWorking(): void;
  showTip(): void;
}

/** The timers that make the pet feel alive: day milestones, onboarding tips and idle chatter. */
export class Life {
  private chatTimer = 45_000;
  private tipTimer = 25_000;
  private milestoneCheckTimer = 3000;
  private milestoneBlockedUntil = 0;

  constructor(private host: LifeHost) {}

  resetTip() {
    this.tipTimer = 25_000;
  }

  /** Marks a day of companionship. The server decides what is due and pays the gift when we acknowledge. */
  private checkMilestone() {
    const { host } = this;
    const now = Date.now();
    if (now < this.milestoneBlockedUntil || host.settings.onboarding !== 'done') return;
    if (!host.sprite?.visible || ['away', 'leave', 'return', 'drag', 'fall'].includes(host.state)) return;
    const days = companionDays(host.game);
    const due = MILESTONES.filter(([day]) => day > host.game.milestone && day <= days);
    if (due.length === 0) return;

    this.milestoneBlockedUntil = now + 10_000;
    const [day] = due[due.length - 1];
    const gift = due.reduce((n, [, coins]) => n + coins, 0);
    popBanner(host, [`陪伴第 ${day} 天!`, `紀念禮物 +${gift} 金幣`], 5000);
    host.say(MILESTONE[day] ?? `已經第 ${day} 天了,謝謝你`, 7000);
    if (host.state === 'idle' || host.state === 'walk' || host.state === 'working') {
      if (host.state === 'working') host.leaveWorking();
      host.cheer(1800);
    }
    api.dispatch({ type: 'ackMilestone' });
  }

  update(delta: number) {
    const { host } = this;
    const present = !['away', 'leave', 'return'].includes(host.state);
    if (!present) return;

    this.milestoneCheckTimer -= delta;
    if (this.milestoneCheckTimer <= 0) {
      this.milestoneCheckTimer = 5000;
      this.checkMilestone();
    }

    if (['poke', 'garage', 'job'].includes(host.settings.onboarding)) {
      this.tipTimer -= delta;
      if (this.tipTimer <= 0) {
        this.tipTimer = 25_000;
        host.showTip();
      }
    }

    if ((host.state === 'idle' || host.state === 'walk') && host.settings.onboarding === 'done') {
      this.chatTimer -= delta;
      if (this.chatTimer <= 0) {
        const factor = CHATTER_FACTOR[host.settings.chatter];
        this.chatTimer = Phaser.Math.Between(60_000, 120_000) * (factor || 1);
        if (factor > 0 && !isQuiet(host.settings)) {
          // the time-of-day lines are listed twice so they come up more often than the general ones
          const period = dayPeriod(new Date().getHours());
          const pool = [
            ...IDLE.general,
            ...IDLE[period],
            ...IDLE[period],
            ...(host.game.durability < 50 ? IDLE.worn : []),
          ];
          host.say(pick(pool), 3000);
        }
      }
    }
  }
}
