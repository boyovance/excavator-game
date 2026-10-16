export const HEX_COLOR = /^#[0-9a-f]{6}$/;
export const NAME_MAX = 12;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

// Mood never goes below "calm": ignoring the pet must not make it sulk. Interaction lifts it, and it
// then settles back to the baseline on its own.
export const MOOD_FLOOR = 40;

export const withMood = (state, delta) => ({ ...state, mood: clamp(state.mood + delta, MOOD_FLOOR, 100) });
