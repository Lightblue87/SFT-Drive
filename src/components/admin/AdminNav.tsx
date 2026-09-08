import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex-none rounded-[10px] border px-[13px] py-2.5 font-sans text-xs font-medium ${
    isActive ? 'border-sft-red bg-sft-red text-white' : 'border-white/12 bg-transparent text-[#c9c9ce]'
  }`

/**
 * Admin-Unternavigation, auf allen /admin/*-Seiten sichtbar (nicht nur auf
 * dem Dashboard), damit zwischen den Verwaltungsbereichen ohne Umweg über
 * das Dashboard gewechselt werden kann.
 *
 * Bewusst OHNE das sonst übliche "-mx-4 ... px-4"-Bleed-Muster, das den
 * Scroll-Container bis an den Bildschirmrand ziehen würde: negative Margins
 * kombiniert mit overflow-x-auto sind in manchen WebKit-Versionen eine
 * bekannt unzuverlässige Kombination (siehe Untersuchung zum
 * Rahmen-Überlauf-Bug im Tourformular). Der Container bleibt stattdessen
 * innerhalb des normalen Seiten-Paddings.
 */
export function AdminNav() {
  return (
    <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none]">
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
