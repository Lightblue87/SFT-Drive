import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

const REVEAL_WIDTH = 84

interface Props {
  onDelete: () => void
  children: ReactNode
}

/**
 * Wischt den Inhalt nach links, um einen "Löschen"-Button freizulegen (wie im
 * iOS-Postfach) — kein sofortiges Löschen bei jeder Wischbewegung, sondern
 * ein zusätzlicher Tap zur Bestätigung.
 */
export function SwipeToDelete({ onDelete, children }: Props) {
  const [translateX, setTranslateX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startTranslateRef = useRef(0)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    setDragging(true)
    startXRef.current = e.clientX
    startTranslateRef.current = translateX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const delta = e.clientX - startXRef.current
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, startTranslateRef.current + delta))
    setTranslateX(next)
  }

  function onPointerUp() {
    setDragging(false)
    setTranslateX((prev) => (prev < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0))
  }

  return (
    <div className="relative overflow-hidden rounded-md">
      <button
        onClick={() => {
          onDelete()
          setTranslateX(0)
        }}
        style={{ width: REVEAL_WIDTH }}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-sft-red text-sm font-medium text-sft-white"
      >
        Löschen
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
        }}
        className="relative bg-sft-black"
      >
        {children}
      </div>
    </div>
  )
}
