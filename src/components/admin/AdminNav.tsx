import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
    isActive ? 'bg-sft-red text-sft-white' : 'border border-sft-surface2 text-sft-white'
  }`

/**
 * Admin-Unternavigation, auf allen /admin/*-Seiten sichtbar (nicht nur auf
 * dem Dashboard), damit zwischen den Verwaltungsbereichen ohne Umweg über
 * das Dashboard gewechselt werden kann.
 */
export function AdminNav() {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-sft-surface2 px-4 py-3">
      <NavLink to="/admin" end className={linkClass}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/tours" className={linkClass}>
        Tourenverwaltung
      </NavLink>
      <NavLink to="/admin/notifications" className={linkClass}>
        Mitteilungen
      </NavLink>
      <NavLink to="/admin/users" className={linkClass}>
        Nutzer
      </NavLink>
      <NavLink to="/admin/settings" className={linkClass}>
        Impressum &amp; Datenschutz
      </NavLink>
    </div>
  )
}
