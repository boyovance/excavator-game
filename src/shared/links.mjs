// Curated source list for the future news feature. Entries look like
// { id: 'example', name: 'Example News', host: 'news.example.com', subdomains: false }.
export const SOURCES = [];

/**
 * Accept a link only if it is https, carries no credentials, uses the default port,
 * and its exact hostname is on the list. Never use substring matching on the URL.
 */
export function checkLink(rawUrl, sources = SOURCES) {
  let u;
  try {
    u = new URL(String(rawUrl));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'not-https' };
  if (u.username || u.password) return { ok: false, reason: 'credentials' };
  if (u.port && u.port !== '443') return { ok: false, reason: 'port' };

  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const source = sources.find((s) => host === s.host || (s.subdomains && host.endsWith(`.${s.host}`)));
  if (!source) return { ok: false, reason: 'not-allowed' };
  return { ok: true, url: u.href, source };
}
