/**
 * Gebrandeter Splash-/Loading-Screen (siehe CLAUDE.md §16). Nur sichtbar,
 * solange die initiale Auth-Initialisierung tatsächlich läuft. Respektiert
 * `prefers-reduced-motion` durch eine statische Variante ohne Nadel-Rotation.
 */
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-sft-black">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#1f1f1f"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#e10600"
            strokeWidth="6"
            strokeDasharray="198 264"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            stroke="#f5f5f5"
            strokeWidth="3"
            strokeLinecap="round"
            className="origin-[50px_50px] motion-safe:animate-[needle_1.1s_ease-in-out_1]"
          />
          <circle cx="50" cy="50" r="4" fill="#f5f5f5" />
        </svg>
      </div>
      <p className="text-sm font-medium tracking-wide">
        <span className="text-sft-red">SFT</span> Drive
      </p>

      <style>{`
        @keyframes needle {
          from { transform: rotate(-140deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
