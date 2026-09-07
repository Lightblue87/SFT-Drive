import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Diese Seite wurde nicht gefunden.</h1>
      <Link to="/tours" className="mt-6 inline-block text-sft-red underline">
        Zur Tourübersicht
      </Link>
    </div>
  )
}
