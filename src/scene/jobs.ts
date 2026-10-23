import type { GameState, Job, Report } from '../shared/reducer.mjs';
import { desktopJob } from '../shared/jobs.mjs';
import type { State } from './constants';

interface JobHost {
  state(): State;
  visible(): boolean;
  mode(): 'stay' | 'away';
  working(): void;
  waiting(): void;
  leave(): void;
  returning(report: Report | null): void;
  clear(): void;
  claimed(report: Report): void;
  recalled(): void;
  started(job: Job): void;
}

/** Presentation only: a finished job never claims itself or changes the saved balance. */
export class JobController {
  private host: JobHost;
  constructor(host: JobHost) { this.host = host; }

  changed(prev: GameState, next: GameState) {
    const h = this.host;
    // only the job the desktop pet went along with moves it; other slots stay in the garage
    const before = desktopJob(prev);
    const after = desktopJob(next);
    if (after && after.id !== before?.id) {
      h.clear();
      h.started(after);
      this.resume(after, true);
    } else if (before && !after) {
      h.clear();
      const report = next.reports.find((r) => !r.seen && r.jobId === before.id) ?? null;
      if (h.visible() && !['leave', 'away', 'return'].includes(h.state())) {
        if (report) h.claimed(report);
        else h.recalled();
      } else h.returning(report);
    }
  }

  resume(job: Job | null, force = false, now = Date.now()) {
    if (!job) return;
    const h = this.host;
    const state = h.state();
    if (['drag', 'fall', 'return'].includes(state)) return;
    if (now >= job.end) {
      if (state === 'away' || state === 'leave') h.returning(null);
      else if (state !== 'waiting') h.waiting();
    } else if (force || state === 'idle') {
      if (h.mode() === 'away') h.leave();
      else h.working();
    }
  }
}
