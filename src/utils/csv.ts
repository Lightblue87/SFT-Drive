/** Minimaler CSV-Export für Admin-Datenexporte (siehe CLAUDE.md §35.1). */
function escapeCsvField(value: string | number): string {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  // BOM voranstellen, damit Excel unter Windows UTF-8 (Umlaute) korrekt erkennt.
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
