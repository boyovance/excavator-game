import type { Settings } from '../api';
import type { GameState } from '../shared/reducer.mjs';
import { WORK } from '../shared/lines.mjs';
import { pick } from './constants';

/** What the pet says at each step of the desktop guide; the welcome window comes before this. */
export function tipText(onboarding: Settings['onboarding'], name: string): string | null {
  switch (onboarding) {
    case 'poke':
      return `你好!我是${name}。點我一下試試`;
    case 'garage':
      return '不錯!現在雙擊我,打開車庫看看';
    case 'job':
      return '這裡可以換零件和外觀。想讓我賺錢,就在「派遣工作」選一個工地';
    default:
      return null;
  }
}

/** An honest answer about the current job: how far along it is and how long is left. */
export function busyLine(job: GameState['job']): string {
  if (!job) return pick(WORK.busyEarly);
  const total = Math.max(1, job.end - job.start);
  const left = Math.max(0, job.end - Date.now());
  const pct = 1 - left / total;
  const minutes = Math.max(1, Math.ceil(left / 60_000));
  const t = minutes >= 60 ? `${Math.floor(minutes / 60)} 小時${minutes % 60 ? ` ${minutes % 60} 分` : ''}` : `${minutes} 分鐘`;
  if (left <= 90_000) return pick(['快好了!再等一下下', '最後一點了!']);
  if (pct < 0.3) return pick([`才剛開工呢,還要 ${t}`, `慢慢來,還要 ${t}`]);
  if (pct < 0.7) return pick([`做到一半了,還要 ${t}`, `穩穩地挖,還要 ${t}`]);
  return pick([`快了快了,還要 ${t}`, `收尾中,還要 ${t}`]);
}
