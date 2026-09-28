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
 * Erlaubt deshalb ausschließlich App-interne, relative Pfade: genau ein
 * führender `/`, kein zweiter `/` bzw. `\` direkt danach. Alles andere fällt
 * auf `/` zurück.
 */
export function sanitizeReturnTo(value: string | null): string {
  if (!value) return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
