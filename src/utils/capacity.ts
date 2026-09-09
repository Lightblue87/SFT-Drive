/**
 * Freie Fahrzeugplätze als Badge-Text, mit korrektem Singular
 * (siehe CLAUDE.md §13.13: "1 Platz frei", nicht "1 Plätze frei").
 * Die Zahl selbst wird ausschließlich serverseitig berechnet (§13.13, §8.10).
 */
export function freeSlotsLabel(freeSlots: number, isFull: boolean): string {
  if (isFull) return 'AUSGEBUCHT'
  return freeSlots === 1 ? '1 PLATZ FREI' : `${freeSlots} PLÄTZE FREI`
}
