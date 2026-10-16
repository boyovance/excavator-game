export type Chatter = 'off' | 'low' | 'normal' | 'high';
export type OnboardingStep = 'welcome' | 'poke' | 'garage' | 'job' | 'done';

export const ONBOARDING_STEPS: OnboardingStep[];

export interface Quiet {
  enabled: boolean;
  /** "HH:MM" */
  from: string;
  to: string;
}

export interface Settings {
  skin: string;
  scale: number;
  autoStart: boolean;
  chatter: Chatter;
  notify: boolean;
  petVisible: boolean;
  /** while on a job: "stay" keeps the pet working on the desktop, "away" walks it off screen */
  jobMode: 'stay' | 'away';
  /** first-run guide progress: welcome window, then desktop tips, then done */
  onboarding: OnboardingStep;
  /** "primary" or a numeric display id */
  display: string;
  quiet: Quiet;
  /** read-only, set by the app: launch-at-login only works in an installed build */
  autoStartSupported?: boolean;
}

export type SettingsPatch = Partial<Omit<Settings, 'quiet' | 'autoStartSupported'>> & {
  quiet?: Partial<Quiet>;
};

export const DEFAULT_SETTINGS: Settings;
export const CHATTER_FACTOR: Record<Chatter, number>;
export function sanitizePatch(patch: unknown): SettingsPatch;
export function mergeSettings(current: Settings, patch: unknown): Settings;
export function normalizeSettings(raw: unknown): Settings;
export function isQuiet(settings: Settings, date?: Date): boolean;
