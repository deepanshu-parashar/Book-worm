/** Returns a checksum-valid ISBN-13 (converting ISBN-10), or undefined. */
export function normalizeIsbn(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.toUpperCase().replace(/[^0-9X]/g, '');
  if (s.length === 13 && /^\d{13}$/.test(s)) return check13(s) ? s : undefined;
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
    if (!check10(s)) return undefined;
    const body = '978' + s.slice(0, 9);
    return body + digit13(body);
  }
  return undefined;
}

function digit13(body12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}
const check13 = (s: string) => digit13(s.slice(0, 12)) === s[12];

function check10(s: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}
