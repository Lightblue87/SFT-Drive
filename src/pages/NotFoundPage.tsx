import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Diese Seite wurde nicht gefunden.</h1>
      <Link
        to="/tours"
        className="tap-scale mt-6 inline-block rounded-xl bg-gradient-to-b from-[#f01a12] to-[#c00500] px-5 py-3 text-[15px] font-semibold text-white"
      >
        Zur Tourübersicht
      </Link>
    </div>
  )
}
