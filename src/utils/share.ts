/**
 * Native Teilen-Funktion mit Zwischenablage-Fallback (siehe CLAUDE.md §35.1).
 * SFT Drive integriert dafür keine E-Mail-/WhatsApp-/iMessage-API — das
 * Betriebssystem bzw. der Browser übergibt den Text an die vom Nutzer
 * gewählte App.
 *
 * `url` ist optional und wird, wenn gesetzt, der Web-Share-API als eigenes
 * Feld mitgegeben (statt nur in `text` eingebettet) — viele Zielapps (z. B.
 * Messages) stellen einen separaten `url`-Wert als anklickbaren Link dar.
 * Ohne Web-Share-API (Zwischenablage-Fallback) wird die URL an den Text
 * angehängt, da die Zwischenablage kein eigenes Link-Feld kennt.
 *
 * `navigator.share()` lehnt bei einem vom Nutzer abgebrochenen Share-Dialog
 * (z. B. Wischen/Schließen des Sheets) mit einer `AbortError`-DOMException
 * ab — das ist keine fehlende Fähigkeit, sondern eine bewusste Nutzerwahl,
 * und darf deshalb nicht in den Zwischenablage-Fallback laufen (sonst würde
 * ein abgebrochener Share den Link trotzdem unbemerkt kopieren bzw. als
 * "Teilen nicht möglich." missverstanden, Codex-Review auf PR #33).
 */
export async function shareOrCopyText(
  title: string,
  text: string,
  url?: string,
): Promise<'shared' | 'cancelled' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share(url ? { title, text, url } : { title, text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      // Anderer Fehler (z. B. API nicht wirklich unterstützt) — Zwischenablage
      // als Fallback versuchen.
    }
  }

  const clipboardText = url ? (text ? `${text}\n${url}` : url) : text

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(clipboardText)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
