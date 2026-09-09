import { useSiteSettings } from '@/lib/useSiteSettings'
import { PageLoading } from '@/components/PageLoading'

/**
 * Generische, aber auf die tatsächliche Datenverarbeitung von SFT Drive
 * zugeschnittene Vorlage (siehe CLAUDE.md §7). Ersetzt keine individuelle
 * Rechtsberatung — vor Live-Betrieb durch eine fachkundige Stelle prüfen
 * lassen.
 */
export function DatenschutzPage() {
  const { settings, loading, isComplete } = useSiteSettings()

  if (loading) return <PageLoading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>

      <p className="mt-4 rounded-2xl border border-white/9 bg-sft-card p-3.5 text-sft-gray">
        Hinweis: Dies ist eine Vorlage auf Basis der tatsächlich in SFT Drive verarbeiteten Daten.
        Sie ersetzt keine individuelle Rechtsberatung.
      </p>

      <h2 className="mt-6 font-medium">1. Verantwortlicher</h2>
      {!isComplete ? (
        <p className="mt-2 text-sft-gray">Angaben zum Verantwortlichen folgen in Kürze.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-0.5">
          {settings?.organization_name && <p>{settings.organization_name}</p>}
          <p>{settings?.responsible_name}</p>
          <p>{settings?.street}</p>
          <p>
            {settings?.postal_code} {settings?.city}
          </p>
          {settings?.contact_email && <p>E-Mail: {settings.contact_email}</p>}
        </div>
      )}

      <h2 className="mt-6 font-medium">2. Welche Daten wir verarbeiten</h2>
      <ul className="mt-2 list-disc pl-5 text-sft-gray">
        <li>Bei Registrierung: E-Mail-Adresse, Username, Vor- und Nachname</li>
        <li>Optional: Geburtsdatum, sofern eine Tour eine Mindestaltersanforderung hat</li>
        <li>
          Bei Touranmeldung: Fahrzeughersteller, -modell, Leistung in PS, optional Kennzeichen,
          Anzahl Beifahrer
        </li>
        <li>
          In deiner Fahrzeuggarage gespeicherte Fahrzeuge (Hersteller, Modell, Leistung, optional
          Kennzeichen)
        </li>
        <li>Freundschaftsanfragen und bestehende Freundschaften zu anderen Nutzern</li>
        <li>Zeitpunkt deines Check-ins am Treffpunkt, sofern eine Tour Check-in nutzt</li>
        <li>Essensvorbestellungen zu Restaurant-Stopps inklusive deiner Anmerkungen</li>
        <li>Bestätigungen, dass du deine Übernachtung für eine Tournacht organisiert hast</li>
        <li>
          Deine Benachrichtigungseinstellungen (abonnierte Regionen) sowie – falls du Push
          aktivierst – die technischen Zugangsdaten deiner Geräte-Push-Verbindung
        </li>
        <li>Mitteilungen, die dir in der App zugestellt wurden</li>
        <li>Von dir hochgeladene Tour-Coverbilder (nur durch Admins)</li>
      </ul>

      <h2 className="mt-6 font-medium">3. Wozu wir diese Daten verwenden</h2>
      <p className="mt-2 text-sft-gray">
        Ausschließlich zur Organisation und Durchführung gemeinsamer Ausfahrten: Anmeldung zu
        Touren, Kapazitätsverwaltung, Wartelisten, Kommunikation vor/während der Fahrt sowie
        organisatorische Planung (z. B. Restaurantreservierungen anhand der Personenzahl,
        Übernachtungsplanung bei Mehrtagestouren) sowie Mitteilungen zu deinen Ausfahrten. Keine
        Weitergabe zu Werbezwecken.
      </p>

      <h2 className="mt-6 font-medium">4. Sichtbarkeit deiner Daten für andere Nutzer</h2>
      <p className="mt-2 text-sft-gray">
        Dein Vor- und Nachname sind für andere Teilnehmer standardmäßig nicht sichtbar. Bestätigte
        Mitfahrer einer Tour sehen von dir ausschließlich deinen Username sowie Fahrzeughersteller,
        -modell und Leistung. Nimmst du eine Freundschaftsanfrage eines anderen Nutzers an, geben
        sich beide Seiten damit gegenseitig ihren Vor- und Nachnamen frei; das lässt sich jederzeit
        durch Beenden der Freundschaft rückgängig machen. Kennzeichen und Personenzahl sind für
        andere Teilnehmer immer unsichtbar, unabhängig von einer Freundschaft. Deine
        Essensvorbestellung, dein Check-in-Zeitpunkt und deine Übernachtungsbestätigungen sind nur
        für dich selbst und die Tourleitung sichtbar.
      </p>

      <h2 className="mt-6 font-medium">5. Auftragsverarbeiter / Hosting</h2>
      <ul className="mt-2 list-disc pl-5 text-sft-gray">
        <li>Supabase (Datenbank, Authentifizierung, Dateispeicher), Rechenzentrumsstandort EU (Irland)</li>
        <li>Cloudflare Pages (Auslieferung der Web-App)</li>
      </ul>
      <p className="mt-2 text-sft-gray">
        Keine Tracking- oder Marketing-Cookies, keine Analytics-Plattform.
      </p>

      <h2 className="mt-6 font-medium">6. Speicherdauer</h2>
      <p className="mt-2 text-sft-gray">
        Daten zu vergangenen, bestätigten Touranmeldungen bleiben als historischer Nachweis in
        deinem persönlichen Tourenarchiv erhalten, bis du dein Konto löschst.
      </p>

      <h2 className="mt-6 font-medium">7. Deine Rechte</h2>
      <p className="mt-2 text-sft-gray">
        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
        deiner Daten sowie ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Dein Konto
        kannst du jederzeit selbst in deinem Profil löschen.
      </p>

      <h2 className="mt-6 font-medium">8. Kontakt</h2>
      {settings?.contact_email ? (
        <p className="mt-2 text-sft-gray">Bei Fragen zum Datenschutz: {settings.contact_email}</p>
      ) : (
        <p className="mt-2 text-sft-gray">Kontaktangaben folgen in Kürze.</p>
      )}
    </div>
  )
}
