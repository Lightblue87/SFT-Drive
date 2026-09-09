import { useState } from 'react'
import { extractYouTubeId } from '@/utils/youtube'

/**
 * Öffentlicher Video-Bereich einer Tour (siehe CLAUDE.md "Entwicklungsphase 20").
 *
 * Datenschutz: Das Projekt vermeidet unaufgeforderte Requests an Google-
 * Infrastruktur (siehe selbst gehostete Google Fonts). Deshalb wird weder ein
 * YouTube-Thumbnail vorab geladen noch das iframe automatisch eingebettet —
 * bis zum expliziten Klick auf "Video laden" geht keine Anfrage an YouTube.
 * Im Link-Modus (`embed = false`) öffnet der Klick stattdessen direkt den
 * externen Link in einem neuen Tab.
 */
export function YouTubeVideo({ url, embed }: { url: string; embed: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const videoId = embed ? extractYouTubeId(url) : null

  if (!embed || !videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-scale mt-3.5 flex items-center justify-center gap-2 rounded-2xl border border-white/9 bg-sft-card py-3.5 text-[14px] font-medium text-sft-white"
      >
        <PlayIcon />
        Video auf YouTube ansehen
      </a>
    )
  }

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="tap-scale mt-3.5 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/9 bg-sft-card"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sft-red">
          <PlayIcon />
        </span>
        <span className="text-[13px] font-medium text-[#c9c9ce]">Video laden</span>
        <span className="text-[11px] text-sft-gray">Lädt Inhalte von YouTube</span>
      </button>
    )
  }

  return (
    <div className="mt-3.5 aspect-video w-full overflow-hidden rounded-2xl border border-white/9 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube-Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
