import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/** Wiederverwendbares Bottom-Sheet für mobile Formulare (PWA-Muster, siehe CLAUDE.md §22). */
export function BottomSheet({ title, subtitle, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-30">
      <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-[2px]" />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl border-t border-white/12 bg-[#111114] shadow-[0_-20px_50px_-20px_#000]">
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
        <div className="px-[18px] pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
