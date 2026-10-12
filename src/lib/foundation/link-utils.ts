export class UiLinkUtils {

  static normalizeHttpUrl(value: string | null | undefined): string {
    const raw = `${value ?? ''}`.trim();
    if (!raw) {
      return '';
    }
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return '';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.hostname.trim() ? parsed.toString() : '';
  }

  static openExternalUrl(url: string, target = '_blank'): void {
    const normalized = `${url ?? ''}`.trim();
    if (!normalized || typeof window === 'undefined') {
      return;
    }
    window.open(normalized, target, 'noopener,noreferrer');
  }
}
