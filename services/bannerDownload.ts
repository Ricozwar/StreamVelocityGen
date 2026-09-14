import { GenerationStatus, type StreamAsset } from '../types';

const INVALID_FILENAME = /[\\/:*?"<>|]/g;

export function bannerFilename(driverName: string | undefined, fallbackId: string): string {
  const raw = (driverName ?? '').trim().replace(INVALID_FILENAME, ' ').replace(/\s+/g, ' ');
  return raw || `banner-${fallbackId.slice(0, 8)}`;
}

export function uniqueBannerFilenames(assets: StreamAsset[]): Map<string, string> {
  const used = new Map<string, number>();
  const result = new Map<string, string>();
  for (const asset of assets) {
    const base = bannerFilename(asset.driverName, asset.id);
    const count = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), count + 1);
    const name = count === 0 ? `${base}.png` : `${base} (${count + 1}).png`;
    result.set(asset.id, name);
  }
  return result;
}

export function cropBannerToPngBlob(generatedUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Nie udało się utworzyć canvas.'));
        return;
      }
      const sourceX = (img.width - 1000) / 2;
      const sourceY = (img.height - 100) / 2;
      ctx.drawImage(img, sourceX, sourceY, 1000, 100, 0, 0, 1000, 100);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Nie udało się zapisać PNG.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Nie udało się wczytać banera.'));
    img.src = generatedUrl;
  });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      file.data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return new Blob([concat([...locals, centralDir, eocd])], { type: 'application/zip' });
}

export async function downloadAllBanners(assets: StreamAsset[]): Promise<void> {
  const ready = assets.filter((a) => a.status === GenerationStatus.SUCCESS && a.generatedUrl);
  if (ready.length === 0) return;

  const names = uniqueBannerFilenames(ready);
  const files: { name: string; data: Uint8Array }[] = [];

  for (const asset of ready) {
    const blob = await cropBannerToPngBlob(asset.generatedUrl!);
    const data = new Uint8Array(await blob.arrayBuffer());
    files.push({ name: names.get(asset.id) ?? `${asset.id}.png`, data });
  }

  const zip = zipStore(files);
  triggerDownload(zip, 'banery-kierowcow.zip');
}
