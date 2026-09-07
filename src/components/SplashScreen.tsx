import { useEffect, useState } from 'react'

/**
 * Gebrandeter Splash-/Loading-Screen (siehe CLAUDE.md §16). Nur sichtbar,
 * solange die initiale Auth-Initialisierung tatsächlich läuft (gesteuert vom
 * Elternteil, App.tsx) — es gibt hier keine künstliche Mindestanzeigedauer,
 * die Navigation länger als nötig blockieren würde.
 *
 * `prefers-reduced-motion` wird respektiert: dann nur das statische
 * Ruhestand-Bild der Nadel statt der Videoanimation.
 */
export function SplashScreen() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sft-black">
      {reducedMotion ? (
        <img
          src="/splash/startup-poster.jpg"
          alt="SFT Drive"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <video
          src="/splash/startup.mp4"
          poster="/splash/startup-poster.jpg"
          className="max-h-full max-w-full object-contain"
          autoPlay
          muted
          playsInline
          preload="auto"
        />
      )}
    </div>
  )
}
