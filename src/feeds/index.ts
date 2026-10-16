import { checkLink, SOURCES, type Source } from '../shared/links.mjs';

export interface FeedItem {
  title: string;
  url: string;
}

export interface SafeItem extends FeedItem {
  source: Source;
}

/** A provider supplies raw items (RSS, a licensed API, ...). It is never trusted. */
export interface FeedProvider {
  id: string;
  fetch(): Promise<FeedItem[]>;
}

/** Every item must pass through here before it can be shown or opened. */
export function acceptItems(items: FeedItem[], sources: Source[] = SOURCES): SafeItem[] {
  const seen = new Set<string>();
  const out: SafeItem[] = [];
  for (const item of items) {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const check = checkLink(item.url, sources);
    if (!title || !check.ok || seen.has(check.url)) continue;
    seen.add(check.url);
    out.push({ title, url: check.url, source: check.source });
  }
  return out;
}
