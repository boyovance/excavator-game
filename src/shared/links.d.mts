export interface Source {
  id: string;
  name: string;
  host: string;
  subdomains?: boolean;
}

export type LinkCheck =
  | { ok: true; url: string; source: Source }
  | { ok: false; reason: 'invalid' | 'not-https' | 'credentials' | 'port' | 'not-allowed' };

export const SOURCES: Source[];
export function checkLink(rawUrl: unknown, sources?: Source[]): LinkCheck;
