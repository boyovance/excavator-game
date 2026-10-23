import type { Site } from './parts.mjs';
export const CURRENT_ECONOMY_VERSION: number;
export const ECONOMY_VERSIONS: number[];
export function economyVersion(version: unknown): number;
export function economySites(version?: number): Site[];
export function economySite(id: string, version?: number): Site | undefined;
export function departureDurability(site: Site, version?: number): number;
export function refundRule(siteId: string | undefined, version?: number): { rate: number; min: number; max: number; recycling?: boolean };
export function duplicateRefund(id: string, version?: number, siteId?: string): number;
