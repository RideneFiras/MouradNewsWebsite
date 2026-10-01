/** RFC 4180 CSV with a UTF-8 BOM so Excel opens Arabic text correctly. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
