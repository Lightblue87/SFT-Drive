/**
 * Rein kosmetische Anbieter-Erkennung für Tagesrouten-Links (siehe CLAUDE.md
 * §34.4): passt nur die Button-Beschriftung an, ohne dass der Admin einen
 * Anbieter auswählen muss. Berechtigung und Speicherung hängen nicht vom
 * erkannten Anbieter ab.
 */
export function routeButtonLabel(url: string): string {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'Route öffnen'
  }

  if (host.includes('kurviger')) return 'Route in Kurviger öffnen'
  if (host.includes('google.') || host === 'goo.gl') return 'Route in Google Maps öffnen'
  if (host.includes('apple.com')) return 'Route in Apple Karten öffnen'
  return 'Route öffnen'
}
