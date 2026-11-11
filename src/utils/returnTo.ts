/**
 * `returnTo` kommt auf `/login` und `/register` direkt aus einem Query-Param
 * und ist damit von jedem frei wählbar, der den Link teilt — nicht nur von
 * den eigenen `RequireAuth`/`RequireAdmin`-Redirects, die stets einen
 * `location.pathname`-Wert erzeugen (§21.11 "keine vertraulichen Daten in
 * Query-Parametern speichern" gilt sinngemäß auch für die Herkunft dieses
 * Werts: er ist nicht vertrauenswürdig).
 *
 * `RegisterPage` reicht den Wert zusätzlich als `emailRedirectTo` an
 * Supabase durch (`${window.location.origin}${returnTo}`) — eine echte
 * absolute URL im Bestätigungslink der Registrierungs-E-Mail. Ein
 * protocol-relativer Pfad wie `//evil.com` oder ein von manchen Browsern als
 * `//` normalisierter `/\evil.com` würde daraus einen Link auf eine fremde
 * Domain machen (klassischer Open-Redirect/Phishing-Baustein), auch wenn
 * `navigate()` in `LoginPage` das aktuell nicht ausnutzbar macht.
 *
 * Ein reiner String-Präfix-Check (`//`, `/\`) reicht dafür nicht: ein Wert
 * wie `/\t/evil.com` (ein echtes ASCII-Tab direkt nach dem führenden `/` —
 * `URLSearchParams.get()` hat `%09` an dieser Stelle bereits dekodiert)
 * beginnt weder mit `//` noch mit `/\`, wird aber von jedem
 * WHATWG-konformen URL-Parser (Browser, `new URL()`, letztlich auch der
 * Supabase-Bestätigungslink) als erster Schritt von führenden/eingebetteten
 * Tabs und Zeilenumbrüchen befreit und danach exakt wie `//evil.com`
 * behandelt (Codex-Review zu PR #32). Deshalb wird hier dieselbe
 * URL-Parsing-Logik verwendet statt sie nachzubilden: `value` wird gegen
 * einen festen Dummy-Origin aufgelöst und nur akzeptiert, wenn dabei
 * tatsächlich derselbe Origin herauskommt — genau das, was auch beim
 * späteren Zusammensetzen mit `window.location.origin` passieren würde.
 *
 * Erlaubt deshalb ausschließlich App-interne, relative Pfade: genau ein
 * führender `/`, und die Auflösung gegen den Dummy-Origin darf keinen
 * anderen Origin ergeben. Alles andere fällt auf `/` zurück.
 */
export function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/'

  const dummyOrigin = 'https://sft-drive-returnto.invalid'
  let resolved: URL
  try {
    resolved = new URL(value, dummyOrigin)
  } catch {
    return '/'
  }

  if (resolved.origin !== dummyOrigin) return '/'

  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
