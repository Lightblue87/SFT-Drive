import { Outlet } from 'react-router-dom'
import { AdminNav } from '@/components/admin/AdminNav'

/** Gemeinsamer Rahmen für alle /admin/*-Seiten (siehe CLAUDE.md §21.3). */
export function AdminLayout() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
      <AdminNav />
      <Outlet />
    </div>
  )
}
