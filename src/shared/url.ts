export function normalizeHost(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\.$/, '');
  try {
    const host = trimmed.includes('://') ? new URL(trimmed).hostname : new URL(`https://${trimmed}`).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^www\./, '').replace(/:\d+$/, '');
  }
}

export function hostFromUrl(url: string): string {
  return normalizeHost(new URL(url).hostname);
}

export function isWhitelistedHost(host: string, whitelist: Record<string, unknown>): boolean {
  const normalized = normalizeHost(host);
  return Object.hasOwn(whitelist, normalized);
}
