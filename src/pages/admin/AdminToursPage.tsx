import { Link } from 'react-router-dom'

export function AdminToursPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tourenverwaltung</h1>
        <Link to="/admin/tours/new" className="rounded-md bg-sft-red px-3 py-1.5 text-sm">
          Neue Tour
        </Link>
      </div>
      <p className="mt-4 text-sm text-sft-gray">Noch keine Touren vorhanden.</p>
    </div>
  )
}
