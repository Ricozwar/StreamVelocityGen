import type { CsvColumnMap } from '../types';

/**
 * Parse a single CSV line respecting double-quoted fields (commas inside quotes).
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

const diacritics: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => diacritics[c] || c)
    .trim();
}

/** Map CSV headers to driver name, car number, car name, and optional class. */
export function getCsvColumnIndices(headers: string[]): CsvColumnMap {
  const h = headers.map(normalizeHeader);
  const find = (...keywords: string[]) =>
    h.findIndex((cell) => keywords.some((k) => cell.includes(k)));

  let nameCol = h.findIndex((c) => c.includes('real name'));
  if (nameCol < 0) nameCol = find('imie', 'nazwisko', 'kierowca', 'driver');
  if (nameCol < 0) nameCol = 0;

  let numCol = h.findIndex((c) => c.includes('car number'));
  if (numCol < 0) numCol = find('numer', 'number', 'nr');
  if (numCol < 0) numCol = Math.min(1, headers.length - 1);

  let brandCol = h.findIndex((c) => c.includes('car name'));
  if (brandCol < 0) brandCol = find('marka', 'brand', 'samochod', 'auto');
  if (brandCol < 0) brandCol = Math.min(2, headers.length - 1);

  let classCol = h.findIndex((c) => c.includes('car class'));
  if (classCol < 0) classCol = find('klasa', 'class', 'kategoria');

  return {
    nameCol,
    numCol,
    brandCol,
    classCol,
    nameHeader: headers[nameCol] ?? '—',
    numHeader: headers[numCol] ?? '—',
    brandHeader: headers[brandCol] ?? '—',
    classHeader: classCol >= 0 ? (headers[classCol] ?? null) : null,
  };
}

/** First token of car name, e.g. "Lamborghini Huracan GT3 Evo2" -> "LAMBORGHINI". */
export function brandFromCarName(carName: string): string {
  const t = carName.trim();
  if (!t) return 'RACING';
  const first = t.split(/\s+/)[0] ?? t;
  return first.toUpperCase();
}

/**
 * Parse CSV file: first line = headers, rest = data rows.
 * Handles quoted fields (e.g. "Name, Team" as one column). Expects UTF-8.
 */
export async function parseCSV(file: File): Promise<ParsedCSV> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i]));
  }
  return { headers, rows };
}
