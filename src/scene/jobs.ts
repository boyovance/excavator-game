import type { GameState, Report } from '../shared/reducer.mjs';
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
  started(job: NonNullable<GameState['job']>): void;
}

/** Presentation only: a finished job never claims itself or changes the saved balance. */
export class JobController {
  private host: JobHost;
  constructor(host: JobHost) { this.host = host; }

  changed(prev: GameState, next: GameState) {
    const h = this.host;
    if (next.job && next.job.id !== prev.job?.id) {
      h.clear();
      h.started(next.job);
      this.resume(next.job, true);
    } else if (prev.job && !next.job) {
      h.clear();
      const report = next.report && !next.report.seen &&
        (next.report.jobId === prev.job.id || (!next.report.jobId && next.report.at !== prev.report?.at))
        ? next.report : null;
      if (h.visible() && !['leave', 'away', 'return'].includes(h.state())) {
        if (report) h.claimed(report);
        else h.recalled();
      } else h.returning(report);
    }
  }

  resume(job: GameState['job'], force = false, now = Date.now()) {
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
