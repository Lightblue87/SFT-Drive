/**
 * Native Teilen-Funktion mit Zwischenablage-Fallback (siehe CLAUDE.md §35.1).
 * SFT Drive integriert dafür keine E-Mail-/WhatsApp-/iMessage-API — das
 * Betriebssystem bzw. der Browser übergibt den Text an die vom Nutzer
 * gewählte App.
 */
export async function shareOrCopyText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch {
      // Abgebrochen oder fehlgeschlagen — Zwischenablage als Fallback versuchen.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
