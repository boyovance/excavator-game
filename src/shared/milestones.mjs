export const DAY_MS = 86_400_000;

// [day, coins]: on these days of companionship the pet marks the occasion and gives a small gift.
export const MILESTONES = [
  [7, 30],
  [30, 100],
  [100, 300],
  [365, 1000],
  [500, 1000],
  [1000, 3000],
];

export const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const pad = (n) => String(n).padStart(2, '0');
export const localDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Days you have spent together: every different day the pet was running counts once.
 * Jumping the clock forward still adds only one, and moving it back adds nothing.
 */
export const companionDays = (state) => Math.max(1, Math.floor(state?.together ?? 0));
