import type { ParsedCSV } from './csvParser';

export interface JsonDriver {
  firstName: string;
  lastName: string;
  shortName: string;
  playerID: string;
  raceNumber: string;
}

function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/^"+|"+$/g, '')
    .replace(/&quot;/g, '"')
    .trim();
}

export function idTokens(playerID: string): string[] {
  const raw = clean(playerID);
  if (!raw) return [];
  const tokens = new Set<string>([raw.toLowerCase()]);
  const withoutPrefix = raw.replace(/^[A-Za-z]+/, '');
  if (withoutPrefix) {
    tokens.add(withoutPrefix.toLowerCase());
    const noLeadingZeros = withoutPrefix.replace(/^0+/, '');
    if (noLeadingZeros) tokens.add(noLeadingZeros.toLowerCase());
  }
  return [...tokens].filter((t) => t.length >= 4);
}

function collectCsvIds(row: string[], headers: string[]): Set<string> {
  const ids = new Set<string>();
  headers.forEach((header, i) => {
    const h = header.toLowerCase();
    const cell = clean(row[i]);
    if (!cell) return;
    const looksLikeId =
      h.includes('id') ||
      h.includes('steam') ||
      h.includes('psn') ||
      h.includes('xbox') ||
      h.includes('player');
    if (looksLikeId || /^\d{6,}$/.test(cell)) {
      ids.add(cell.toLowerCase());
      ids.add(cell.replace(/^0+/, '').toLowerCase());
    }
  });
  return ids;
}

/**
 * SimGrid / ACC entrylist.json: { entries: [ { drivers: [ { firstName, lastName, playerID } ] } ] }
 */
export function parseEntrylistJsonText(text: string): JsonDriver[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Plik JSON jest uszkodzony.');
  }

  const root = data as { entries?: unknown[] } | unknown[];
  const entries = Array.isArray(root) ? root : Array.isArray(root.entries) ? root.entries : null;
  if (!entries) {
    throw new Error('To nie jest entrylist JSON z SimGrid (brak tablicy entries).');
  }

  const drivers: JsonDriver[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const rec = entry as {
      raceNumber?: unknown;
      carNumber?: unknown;
      drivers?: Array<Record<string, unknown>>;
    };
    const raceNumber = clean(rec.raceNumber ?? rec.carNumber);
    for (const driver of rec.drivers ?? []) {
      const firstName = clean(driver.firstName);
      const lastName = clean(driver.lastName);
      const shortName = clean(driver.shortName);
      const playerID = clean(driver.playerID);
      if (!firstName && !lastName) continue;
      const key = `${playerID}|${firstName}|${lastName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      drivers.push({ firstName, lastName, shortName, playerID, raceNumber });
    }
  }

  if (drivers.length === 0) {
    throw new Error('JSON nie zawiera kierowców z imieniem i nazwiskiem.');
  }
  return drivers;
}

export async function parseEntrylistJson(file: File): Promise<JsonDriver[]> {
  return parseEntrylistJsonText(await file.text());
}

export function jsonDriversToTable(drivers: JsonDriver[]): ParsedCSV {
  return {
    headers: ['firstName', 'lastName', 'shortName', 'playerID', 'raceNumber', 'car name', 'car class'],
    rows: drivers.map((d) => [d.firstName, d.lastName, d.shortName, d.playerID, d.raceNumber, '', '']),
  };
}

function colIndex(headers: string[], name: string): number {
  return headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
}

/** Append / fill firstName, lastName, shortName on CSV rows by matching SimGrid player IDs. */
export function applyJsonNamesToCsv(csv: ParsedCSV, drivers: JsonDriver[]): ParsedCSV {
  const extra = ['firstName', 'lastName', 'shortName'];
  if (drivers.some((d) => d.raceNumber)) extra.push('raceNumber');
  const headers = [...csv.headers];
  for (const name of extra) {
    if (colIndex(headers, name) < 0) headers.push(name);
  }
  const idx = {
    firstName: colIndex(headers, 'firstName'),
    lastName: colIndex(headers, 'lastName'),
    shortName: colIndex(headers, 'shortName'),
    raceNumber: colIndex(headers, 'raceNumber'),
  };

  const used = new Set<number>();
  const rows = csv.rows.map((row) => {
    const next = [...row];
    while (next.length < headers.length) next.push('');
    const csvIds = collectCsvIds(row, csv.headers);
    const matchIndex = drivers.findIndex(
      (d, i) => !used.has(i) && idTokens(d.playerID).some((t) => csvIds.has(t))
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      const match = drivers[matchIndex];
      if (idx.firstName >= 0) next[idx.firstName] = match.firstName;
      if (idx.lastName >= 0) next[idx.lastName] = match.lastName;
      if (idx.shortName >= 0) next[idx.shortName] = match.shortName;
      if (idx.raceNumber >= 0 && match.raceNumber) next[idx.raceNumber] = match.raceNumber;
    }
    return next;
  });

  for (let i = 0; i < drivers.length; i++) {
    if (used.has(i)) continue;
    const d = drivers[i];
    const next = Array(headers.length).fill('');
    if (idx.firstName >= 0) next[idx.firstName] = d.firstName;
    if (idx.lastName >= 0) next[idx.lastName] = d.lastName;
    if (idx.shortName >= 0) next[idx.shortName] = d.shortName;
    if (idx.raceNumber >= 0) next[idx.raceNumber] = d.raceNumber;
    rows.push(next);
  }

  return { headers, rows };
}
