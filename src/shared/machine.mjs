import { MACHINE_SLOTS, fitsMachine, machineDefaults, partById } from './parts.mjs';

/** The parts a machine type comes with: owning the machine means owning these. */
export const grantsOf = (machineId) => Object.values(machineDefaults(machineId));

/**
 * What a machine type wears: each machine-specific slot keeps the saved part when it is owned and
 * fits this machine, otherwise falls back to the part the machine comes with.
 */
export function loadoutFor(machineId, owned, saved) {
  const defaults = machineDefaults(machineId);
  const out = {};
  for (const slot of MACHINE_SLOTS) {
    const p = partById(saved?.[slot]);
    out[slot] = p && p.slot === slot && owned.includes(p.id) && fitsMachine(p, machineId) ? p.id : defaults[slot];
  }
  return out;
}

/** Change the machine type; the old one's parts are remembered for when you switch back. */
export function switchMachine(state, machineId) {
  const current = state.equipped.machine;
  const left = {};
  for (const slot of MACHINE_SLOTS) left[slot] = state.equipped[slot];
  const loadouts = { ...state.loadouts, [current]: left };
  return {
    ...state,
    loadouts,
    equipped: { ...state.equipped, machine: machineId, ...loadoutFor(machineId, state.owned, loadouts[machineId]) },
  };
}
