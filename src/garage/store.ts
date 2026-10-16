import type { Settings } from '../api';
import { SLOTS } from '../shared/parts.mjs';
import type { GameState } from '../shared/reducer.mjs';

/** Mutable garage window state shared by the panels (set once by boot before anything renders). */
export const ui = {
  state: undefined as unknown as GameState,
  settings: undefined as unknown as Settings,
  slot: SLOTS[0].id as string,
  tryOn: null as { slot: string; id: string } | null,
  frame: 0,
  // colours being dragged in a picker: shown in the preview at once, saved only when the picker is released
  liveTint: {} as Record<string, string>,
  // first-run welcome: parts picked so far for the driver
  welcomePick: {} as Record<string, string>,
};
