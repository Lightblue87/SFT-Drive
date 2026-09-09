import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Wiederverwendbares Bottom-Sheet für mobile Formulare (PWA-Muster, siehe CLAUDE.md §22).
 *
 * Legt beim Öffnen einen eigenen History-Eintrag an: ohne das schließt Androids
 * System-Zurück/Zurück-Geste das Sheet nicht, sondern verlässt direkt die
 * zugrunde liegende Seite bzw. die installierte PWA (siehe CLAUDE.md §16
 * "Android-Chrome-Eigenheiten", vormals als offener Punkt dokumentiert).
 */
export function BottomSheet({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    // Bestehenden history.state (u. a. von React Router) beim Pushen nicht
    // überschreiben, sondern nur um das Sheet-Flag ergänzen — sonst geht bei
    // Browser-Vorwärts-Navigation Router-eigener State verloren (PR-Review).
    const previousState = (window.history.state as Record<string, unknown> | null) ?? {}
    window.history.pushState({ ...previousState, sftSheet: true }, '')

    function onPopState() {
      onClose()
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
      // Wurde das Sheet über Button/Backdrop statt über Zurück geschlossen, den
      // zuvor gepushten Eintrag wieder entfernen — sonst führt der nächste
      // Zurück-Tap ins Leere statt zur eigentlich erwarteten vorherigen Seite.
      if ((window.history.state as { sftSheet?: boolean } | null)?.sftSheet) {
        window.history.back()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-30">
      <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-[2px]" />
      <div
        // data-pull-to-refresh-ignore: das globale PullToRefresh soll hier nie
        // auslösen, auch wenn der Sheet-Inhalt kurz und (noch) gar nicht selbst
        // scrollbar ist (§16 "Android-Chrome-Eigenheiten", PR-Review) — sonst
        // kann ein Herunterwischen im Sheet versehentlich die App neu laden und
        // eine unabgeschickte Eingabe verwerfen.
        data-pull-to-refresh-ignore
        className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl border-t border-white/12 bg-[#111114] shadow-[0_-20px_50px_-20px_#000]"
      >
        <div className="sticky top-0 border-b border-white/7 bg-[#111114] px-[18px] pb-3.5 pt-3">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/18" />
          <div className="flex items-center justify-between">
            <div className="text-[19px] font-semibold">{title}</div>
            <button onClick={onClose} className="font-mono text-xs text-sft-gray">
              SCHLIESSEN
            </button>
          </div>
          {subtitle && <div className="mt-2 font-mono text-xs text-sft-gray-dim">{subtitle}</div>}
        </div>
        <div
          className="px-[18px] pt-4"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
