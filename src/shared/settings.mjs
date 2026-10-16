export const DEFAULT_SETTINGS = {
  skin: 'pixel',
  scale: 3,
  autoStart: false,
  chatter: 'normal',
  notify: true,
  petVisible: true,
  /** while on a job: "stay" keeps the pet working on the desktop, "away" walks it off screen */
  jobMode: 'stay',
  /** first-run guide progress: welcome window, then desktop tips, then done */
  onboarding: 'welcome',
  /** "primary" or a numeric display id */
  display: 'primary',
  quiet: { enabled: false, from: '23:00', to: '07:00' },
};

export const ONBOARDING_STEPS = ['welcome', 'poke', 'garage', 'job', 'done'];

// How much the idle chatter interval is stretched; 0 means never speak on its own.
export const CHATTER_FACTOR = { off: 0, low: 2, normal: 1, high: 0.5 };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Keep only well-formed fields. Anything unknown or malformed is silently dropped. */
export function sanitizePatch(patch) {
  const p = patch && typeof patch === 'object' ? patch : {};
  const out = {};
  if (typeof p.skin === 'string' && p.skin.length > 0 && p.skin.length <= 64) out.skin = p.skin;
  if ([2, 3, 4].includes(p.scale)) out.scale = p.scale;
  if (typeof p.autoStart === 'boolean') out.autoStart = p.autoStart;
  if (typeof p.chatter === 'string' && Object.hasOwn(CHATTER_FACTOR, p.chatter)) out.chatter = p.chatter;
  if (typeof p.notify === 'boolean') out.notify = p.notify;
  if (typeof p.petVisible === 'boolean') out.petVisible = p.petVisible;
  if (p.jobMode === 'stay' || p.jobMode === 'away') out.jobMode = p.jobMode;
  if (typeof p.onboarding === 'string' && ONBOARDING_STEPS.includes(p.onboarding)) out.onboarding = p.onboarding;
  if (typeof p.display === 'string' && /^(primary|\d{1,12})$/.test(p.display)) out.display = p.display;
  if (p.quiet && typeof p.quiet === 'object') {
    const q = {};
    if (typeof p.quiet.enabled === 'boolean') q.enabled = p.quiet.enabled;
    if (typeof p.quiet.from === 'string' && TIME_RE.test(p.quiet.from)) q.from = p.quiet.from;
    if (typeof p.quiet.to === 'string' && TIME_RE.test(p.quiet.to)) q.to = p.quiet.to;
    if (Object.keys(q).length) out.quiet = q;
  }
  return out;
}

export function mergeSettings(current, patch) {
  const clean = sanitizePatch(patch);
  return {
    ...current,
    ...clean,
    quiet: { ...current.quiet, ...clean.quiet },
  };
}

export function normalizeSettings(raw) {
  return mergeSettings(DEFAULT_SETTINGS, sanitizePatch(raw));
}

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** True while the do-not-disturb window is active. A window like 23:00-07:00 wraps past midnight. */
export function isQuiet(settings, date = new Date()) {
  const q = settings.quiet;
  if (!q?.enabled) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const from = minutes(q.from);
  const to = minutes(q.to);
  if (from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}
