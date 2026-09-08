import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 72
const MAX_PULL = 110

/**
 * Pull-to-Refresh für die gesamte App (PWA im Standalone-Modus besitzt keine
 * native Browser-Ziehgeste). Reagiert nur, wenn ganz oben gescrollt wurde,
 * und lädt die Seite bei Überschreiten der Schwelle komplett neu — einfacher
 * und robuster als ein selektives Daten-Reload pro Seite.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) {
        startYRef.current = null
        return
      }
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullingRef.current || startYRef.current === null) return
      const delta = e.touches[0].clientY - startYRef.current

      if (delta <= 0) {
        setPull(0)
        return
      }

      if (window.scrollY > 0) {
        pullingRef.current = false
        setPull(0)
        return
      }

      e.preventDefault()
      setPull(Math.min(MAX_PULL, delta * 0.55))
    }

    function onTouchEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      startYRef.current = null

      if (pull >= THRESHOLD) {
        setRefreshing(true)
        setPull(THRESHOLD)
        window.location.reload()
      } else {
        setPull(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [pull, refreshing])

  if (pull === 0 && !refreshing) return null

  const progress = Math.min(1, pull / THRESHOLD)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-[#131316]/95 backdrop-blur-md"
        style={{
          opacity: progress,
          transform: `translateY(${Math.min(pull, THRESHOLD)}px) scale(${0.6 + progress * 0.4})`,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={refreshing ? 'animate-spin' : ''}
          style={refreshing ? undefined : { transform: `rotate(${progress * 300}deg)` }}
        >
          <path
            d="M20 12a8 8 0 1 1-2.34-5.66"
            stroke={progress >= 1 ? '#f01a12' : '#c9c9ce'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M20 4v5h-5" stroke={progress >= 1 ? '#f01a12' : '#c9c9ce'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
