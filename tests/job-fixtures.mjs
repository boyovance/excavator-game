import { reduce } from '../src/shared/reducer.mjs';

// Test-only injection into the saved job; client claim actions no longer supply dice.
export const claimWithRolls = (state, action) => reduce({
  ...state,
  jobs: [{ ...state.jobs[0], rolls: Array.from({ length: 11 }, (_, i) => Math.min(action.rolls[i] ?? 0.999999, 0.999999)) }, ...state.jobs.slice(1)],
}, { type: 'claim', now: action.now, jobId: state.jobs[0].id });
