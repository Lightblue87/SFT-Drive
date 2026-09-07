import { Link } from 'react-router-dom'

/**
 * Rechtlich erforderliche, jederzeit erreichbare Links zu Impressum und
 * Datenschutzerklärung (§5 TMG "leicht erkennbar, unmittelbar erreichbar";
 * siehe CLAUDE.md §7, §21).
 */
export function Footer() {
  return (
    <footer className="mx-auto flex max-w-2xl justify-center gap-4 px-4 py-6 text-xs text-sft-gray">
      <Link to="/impressum" className="underline">
        Impressum
      </Link>
      <Link to="/datenschutz" className="underline">
        Datenschutz
      </Link>
    </footer>
  )
}
