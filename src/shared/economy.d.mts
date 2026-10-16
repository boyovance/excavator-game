import type { Site } from './parts.mjs';
export const ECONOMY_VERSIONS: number[];
export function economyVersion(version: unknown): number;
export function economySites(version?: number): Site[];
export function economySite(id: string, version?: number): Site | undefined;
export function departureDurability(site: Site, version?: number): number;
export function duplicateRefund(id: string, version?: number): number;
