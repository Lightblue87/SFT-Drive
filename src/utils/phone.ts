/**
 * Telefonnummern für die Freundesfunktion (siehe CLAUDE.md §41).
 * Gespeichert wird ausschließlich E.164 (z. B. +491711234567); die
 * verbindliche Prüfung liegt als CHECK-Constraint in der Datenbank.
 */
const E164 = /^\+[1-9][0-9]{6,14}$/

/**
 * Wandelt eine frei eingegebene Nummer in E.164 um. Nummern mit führender 0
 * werden als deutsche Nummern interpretiert (0171… → +49171…), "00" als
 * internationale Vorwahl. Gibt `null` zurück, wenn keine gültige Nummer
 * entsteht.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  let normalized: string
  if (trimmed.startsWith('+')) normalized = `+${digits}`
  else if (digits.startsWith('00')) normalized = `+${digits.slice(2)}`
  else if (digits.startsWith('0')) normalized = `+49${digits.slice(1)}`
  else return null

  return E164.test(normalized) ? normalized : null
}

/** Leicht lesbare Darstellung; deutsche Mobil-/Festnetznummern mit Lücken. */
export function formatPhoneNumber(e164: string): string {
  if (e164.startsWith('+49') && e164.length > 6) {
    return `+49 ${e164.slice(3, 6)} ${e164.slice(6)}`
  }
  return e164
}

export function telUrl(e164: string): string {
  return `tel:${e164}`
}

/** Öffnet den WhatsApp-Chat — reiner Link, keine WhatsApp-API (§35.2). */
export function whatsappUrl(e164: string): string {
  return `https://wa.me/${e164.slice(1)}`
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

export interface VCardContact {
  firstName: string | null
  lastName: string | null
  username: string
  phoneNumber: string
}

export function buildVCard(contact: VCardContact): string {
  const first = contact.firstName ?? ''
  const last = contact.lastName ?? ''
  const fullName = `${first} ${last}`.trim() || contact.username
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
    `FN:${escapeVCard(fullName)}`,
    `NICKNAME:${escapeVCard(contact.username)}`,
    `TEL;TYPE=CELL:${contact.phoneNumber}`,
    'NOTE:SFT Drive',
    'END:VCARD',
    '',
  ].join('\r\n')
}

/**
 * Übergibt den Kontakt als .vcf ans Adressbuch. Bevorzugt das native
 * Teilen-Sheet (in installierten iOS-PWAs funktioniert ein Blob-Download
 * nicht zuverlässig), sonst klassischer Download.
 */
export async function saveContact(contact: VCardContact): Promise<void> {
  const filename = `${contact.username.replace(/[^\w.-]+/g, '_') || 'kontakt'}.vcf`
  const vcard = buildVCard(contact)
  const file = new File([vcard], filename, { type: 'text/vcard' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // Vom Nutzer abgebrochen -> kein Fallback-Download hinterherschieben.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
