import { useEffect, useRef, useState } from 'react'

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
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  // React setzt das `muted`-Attribut auf <video> nicht immer zuverlässig
  // rechtzeitig auf die tatsächliche DOM-Property, bevor der Browser Autoplay
  // bewertet — Safari lehnt Autoplay dann als "nicht stumm" ab und zeigt
  // stattdessen nur das Poster-Bild mit Play-Button. `muted` deshalb explizit
  // per Ref setzen und `play()` selbst anstoßen, statt nur auf das
  // `autoPlay`-Attribut zu vertrauen.
  useEffect(() => {
    if (reducedMotion) return
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().catch(() => {
      // Autoplay wurde dennoch verweigert (z. B. Low-Power-Mode) — das
      // statische Posterbild bleibt dann sichtbar, kein Absturz nötig.
    })
  }, [reducedMotion])

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
          ref={videoRef}
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
