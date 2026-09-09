/**
 * Extrahiert sicher die Video-ID aus einer YouTube-URL (siehe CLAUDE.md
 * "Entwicklungsphase 20"). Nur bekannte URL-Formen werden akzeptiert; alles
 * andere liefert `null` und fällt damit im UI auf eine reine Link-Anzeige
 * zurück, statt einen unsicheren Wert in ein iframe-`src` einzusetzen.
 *
 * Unterstützt:
 *   https://www.youtube.com/watch?v=<id>
 *   https://youtu.be/<id>
 *   https://www.youtube.com/embed/<id>
 *   https://www.youtube.com/shorts/<id>
 */
export function extractYouTubeId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const idPattern = /^[a-zA-Z0-9_-]{6,15}$/

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return idPattern.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id && idPattern.test(id) ? id : null
    }
    const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/)
    if (embedMatch) return idPattern.test(embedMatch[1]) ? embedMatch[1] : null
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/)
    if (shortsMatch) return idPattern.test(shortsMatch[1]) ? shortsMatch[1] : null
  }

  return null
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null
}
