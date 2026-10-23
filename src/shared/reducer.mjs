import { TINT_SLOTS, fitsMachine, partById, siteOpenTo } from './parts.mjs';
import { grantsOf, switchMachine } from './machine.mjs';
import { DAY_MS, MILESTONES, companionDays, localDate, startOfDay } from './milestones.mjs';
import { DEFAULT_STATE, normalize } from './normalize.mjs';
import { repairCost } from './info.mjs';
import { claimJob, digCoins } from './rewards.mjs';
import { HEX_COLOR, MOOD_FLOOR, NAME_MAX, clamp, num, withMood } from './util.mjs';
import { MAX_SLOTS, SLOT_PRICE, machineBusy, normalizeJob, reservedWear, siteBusy } from './jobs.mjs';
import { claimGrowth, siteUnlocked } from './growth.mjs';
import { economySite, economyVersion, departureDurability, CURRENT_ECONOMY_VERSION } from './economy.mjs';
import { PITY_FROM_VERSION, pityProgress } from './pity.mjs';

export { MILESTONES, companionDays } from './milestones.mjs';
export { DEFAULT_STATE, normalize } from './normalize.mjs';
export { levelInfo, moodLabel, partName, repairCost, siteName } from './info.mjs';
export { digCoins, stamp } from './rewards.mjs';

const DIG_WEAR = 3;
const MOOD_STEP_MS = 90_000;
const MOOD_DECAY_CAP_STEPS = 20;
const MOOD_BASELINE = 55;

export function reduce(state, action, previewVersion = CURRENT_ECONOMY_VERSION) {
  switch (action.type) {
    case 'claimGrowth':
      return claimGrowth(state, action.id);
    case 'dig':
      if (state.durability <= 0) return state;
      return {
        ...state,
        coins: state.coins + digCoins(state.equipped),
        durability: clamp(state.durability - DIG_WEAR, 0, 100),
        xp: state.xp + 2,
      };

    case 'tick': {
      const now = num(action.now);
      // the day you met is recorded the first time the clock runs
      let met = state.since ? state : { ...state, since: now };
      const today = localDate(now);
      if (!met.together || !met.lastDay) {
        // first run, or a save from before this counter: carry over the calendar days since you met
        const carried = Math.round((startOfDay(now) - startOfDay(met.since)) / DAY_MS) + 1;
        met = { ...met, together: Math.max(1, met.together || carried), lastDay: today };
      } else if (today > met.lastDay) {
        met = { ...met, together: met.together + 1, lastDay: today };
      }
      if (!met.moodAt || now < met.moodAt) return { ...met, moodAt: now };
      const elapsed = Math.floor((now - met.moodAt) / MOOD_STEP_MS);
      if (elapsed <= 0) return met;
      const steps = Math.min(MOOD_DECAY_CAP_STEPS, elapsed);
      // drift one point per step towards the baseline from either side, and stop there
      const toward = Math.sign(MOOD_BASELINE - met.mood) * Math.min(steps, Math.abs(MOOD_BASELINE - met.mood));
      return {
        ...withMood(met, toward),
        moodAt: elapsed > MOOD_DECAY_CAP_STEPS ? now : met.moodAt + steps * MOOD_STEP_MS,
      };
    }

    // The client only says "I saw it"; which milestones are due and the gift are decided here from the day count.
    case 'ackMilestone': {
      const days = companionDays(state);
      let gift = 0;
      let top = state.milestone;
      for (const [day, coins] of MILESTONES) {
        if (day > state.milestone && day <= days) {
          gift += coins;
          top = day;
        }
      }
      if (top === state.milestone) return state;
      return withMood({ ...state, coins: state.coins + gift, milestone: top }, 5);
    }

    case 'wear':
      return { ...state, durability: clamp(state.durability - Math.max(0, num(action.amount)), 0, 100) };

    case 'rest':
      return { ...state, durability: clamp(state.durability + Math.max(0, num(action.amount)), 0, 100) };

    case 'mood':
      return withMood(state, num(action.amount));

    case 'poke':
      return { ...withMood(state, 3), xp: state.xp + 1 };

    // Colours are free. slot "*" with no colour clears them all.
    case 'tint': {
      if (action.slot === '*') return Object.keys(state.tint).length ? { ...state, tint: {} } : state;
      if (!TINT_SLOTS.some((s) => s.id === action.slot)) return state;
      const next = { ...state.tint };
      if (action.color == null) delete next[action.slot];
      else {
        const c = typeof action.color === 'string' ? action.color.toLowerCase() : '';
        if (!HEX_COLOR.test(c)) return state;
        next[action.slot] = c;
      }
      return JSON.stringify(next) === JSON.stringify(state.tint) ? state : { ...state, tint: next };
    }

    case 'rename': {
      const name = String(action.name ?? '').trim().slice(0, NAME_MAX);
      return name && name !== state.name ? { ...state, name } : state;
    }

    case 'buy': {
      const part = partById(action.id);
      if (!part || part.price == null || part.workOnly || state.owned.includes(part.id) || state.coins < part.price) return state;
      if (part.slot === 'machine') {
        const owned = [...new Set([...state.owned, part.id, ...grantsOf(part.id)])];
        return withMood(switchMachine({ ...state, coins: state.coins - part.price, owned }, part.id), 5);
      }
      if (!fitsMachine(part, state.equipped.machine)) return state;
      return withMood(
        {
          ...state,
          coins: state.coins - part.price,
          owned: [...state.owned, part.id],
          equipped: { ...state.equipped, [part.slot]: part.id },
        },
        5,
      );
    }

    case 'equip': {
      const part = partById(action.id);
      if (!part || !state.owned.includes(part.id) || state.equipped[part.slot] === part.id) return state;
      if (part.slot === 'machine') return withMood(switchMachine(state, part.id), 2);
      if (!fitsMachine(part, state.equipped.machine)) return state;
      return withMood({ ...state, equipped: { ...state.equipped, [part.slot]: part.id } }, 2);
    }

    case 'repair': {
      const cost = repairCost(state.durability);
      if (cost <= 0 || state.coins < cost) return state;
      return withMood({ ...state, coins: state.coins - cost, durability: 100 }, 10);
    }

    case 'startJob': {
      const version = economyVersion(previewVersion);
      const site = economySite(action.site, version);
      // any owned machine that is not already out; the desktop machine when none is named
      const machine = action.machine ?? state.equipped.machine;
      if (!site || partById(machine)?.slot !== 'machine' || !state.owned.includes(machine)) return state;
      if (state.jobs.length >= state.jobSlots || machineBusy(state, machine) || siteBusy(state, site.id)) return state;
      if (!siteUnlocked(state, site.id) || !siteOpenTo(site, machine)) return state;
      // durability is shared, so wear already promised to jobs still out is set aside first
      if (state.durability - reservedWear(state) < departureDurability(site, version)) return state;
      const now = num(action.now);
      const loadout = machine === state.equipped.machine ? state.equipped : switchMachine(state, machine).equipped;
      // the desktop pet goes along only with the machine it shows, and only one job at a time
      const desktop = machine === state.equipped.machine && !state.jobs.some((j) => j.desktop);
      const job = normalizeJob({ id: action.id, site: site.id, rulesVersion: version, start: now, end: now + site.minutes * 60000,
        equippedSnapshot: { ...loadout }, rolls: action.rolls, desktop,
        ...(version >= PITY_FROM_VERSION ? { pity: pityProgress(state, site.id)?.count ?? 0 } : {}) }, state.equipped, state.owned);
      return job && !state.jobs.some((j) => j.id === job.id) ? { ...state, jobs: [...state.jobs, job] } : state;
    }

    case 'cancelJob': {
      const job = action.jobId ? state.jobs.find((j) => j.id === action.jobId) : state.jobs[0];
      return job && num(action.now) < job.end ? { ...state, jobs: state.jobs.filter((j) => j !== job) } : state;
    }

    case 'buySlot':
      if (state.jobSlots >= MAX_SLOTS || state.coins < SLOT_PRICE) return state;
      return withMood({ ...state, coins: state.coins - SLOT_PRICE, jobSlots: state.jobSlots + 1 }, 5);

    case 'claim':
      return claimJob(state, action);

    case 'ackReport':
      return state.reports.some((r) => !r.seen) ? { ...state, reports: state.reports.map((r) => (r.seen ? r : { ...r, seen: true })) } : state;

    default:
      return state;
  }
}
