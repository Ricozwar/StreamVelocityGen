export interface LogoBrand {
  value: string;
  label: string;
  src: string | null;
}

const STORAGE_KEY = 'streamvelocity-custom-logos';

const BRAND_ALIASES: Record<string, string> = {
  AMR: 'ASTON MARTIN',
  'AUDI SPORT': 'AUDI',
  CORVETTE: 'CHEVROLET',
  'SCUDERIA FERRARI': 'FERRARI',
  MUSTANG: 'FORD',
  'MERCEDES-AMG': 'MERCEDES',
  AMG: 'MERCEDES',
  NISMO: 'NISSAN',
};

const assetUrl = (pathFromPublic: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  const rel = pathFromPublic.replace(/^\//, '');
  return `${base}${rel}`;
};

export function normalizeBrandKey(name: string): string {
  return name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

export function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function brandLabel(name: string): string {
  const key = normalizeBrandKey(name);
  if (!key) return '';
  if (key.length <= 4) return key;
  return key
    .split(' ')
    .map((part) => (part.length <= 3 ? part : part.charAt(0) + part.slice(1).toLowerCase()))
    .join(' ');
}

function readCustomLogos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCustomLogos(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });

const logoPathVariants = (basePath: string): string[] => {
  const match = basePath.match(/^(.*\/)?([^/]+)\.(png|svg|webp|jpe?g)$/i);
  if (!match) return [basePath];
  const prefix = match[1] ?? '';
  const name = match[2];
  const ext = match[3];
  const lower = name.toLowerCase();
  const variants = [basePath, `${prefix}${lower}.${ext}`];
  const titleCase = lower.charAt(0).toUpperCase() + lower.slice(1);
  variants.push(`${prefix}${titleCase}.${ext}`);
  if (lower.includes('_')) {
    const segmentTitle = lower
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('_');
    variants.push(`${prefix}${segmentTitle}.${ext}`);
  }
  if (name.length >= 2 && name.length <= 4) variants.push(`${prefix}${lower.toUpperCase()}.${ext}`);
  return [...new Set(variants)];
};

async function loadLogoWithVariants(basePath: string): Promise<HTMLImageElement | null> {
  for (const src of logoPathVariants(basePath)) {
    try {
      const img = await loadImage(src);
      if (img.naturalWidth > 0) return img;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function imageFileToPngDataUrl(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|svg|webp|gif)$/i.test(file.name)) {
    throw new Error('Wybierz plik graficzny (PNG, SVG, JPG, WebP).');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Nie udało się przetworzyć obrazu.');
    const ratio = img.naturalWidth / img.naturalHeight || 1;
    let drawW = size;
    let drawH = size;
    if (ratio > 1) {
      drawH = size / ratio;
    } else {
      drawW = size * ratio;
    }
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, dx, dy, drawW, drawH);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface ManifestResponse {
  brands?: Array<{ key: string; file: string; label: string }>;
}

async function fetchJson(url: string): Promise<ManifestResponse | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as ManifestResponse;
  } catch {
    return null;
  }
}

export async function loadLogoCatalog(): Promise<LogoBrand[]> {
  const disk =
    (await fetchJson('/api/logos')) ?? (await fetchJson(assetUrl('logos/manifest.json'))) ?? { brands: [] };
  const custom = readCustomLogos();
  const byValue = new Map<string, LogoBrand>();

  for (const entry of disk.brands ?? []) {
    const value = normalizeBrandKey(entry.key);
    byValue.set(value, {
      value,
      label: entry.label || brandLabel(value),
      src: assetUrl(entry.file),
    });
  }

  for (const [rawKey, dataUrl] of Object.entries(custom)) {
    const value = normalizeBrandKey(rawKey);
    byValue.set(value, {
      value,
      label: brandLabel(value),
      src: dataUrl,
    });
  }

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label, 'pl'));
}

export function findLogoBrand(brands: LogoBrand[], name: string | undefined): LogoBrand | undefined {
  if (!name) return undefined;
  const key = normalizeBrandKey(name);
  const direct = brands.find((b) => b.value === key);
  if (direct) return direct;
  const alias = BRAND_ALIASES[key];
  if (alias) return brands.find((b) => b.value === alias);
  return undefined;
}

export async function saveUploadedLogo(brand: string, file: File): Promise<LogoBrand> {
  const key = normalizeBrandKey(brand);
  if (!key) throw new Error('Podaj nazwę marki.');
  const pngBase64 = await imageFileToPngDataUrl(file);
  const custom = readCustomLogos();
  custom[key] = pngBase64;
  writeCustomLogos(custom);

  try {
    const res = await fetch('/api/logos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: key, pngBase64 }),
    });
    if (res.ok) {
      const data = (await res.json()) as { brand?: { key: string; file: string; label: string } };
      if (data.brand) {
        return {
          value: normalizeBrandKey(data.brand.key),
          label: data.brand.label || brandLabel(key),
          src: assetUrl(data.brand.file),
        };
      }
    }
  } catch {
    /* GitHub Pages / no local API — keep browser copy */
  }

  return { value: key, label: brandLabel(key), src: pngBase64 };
}

export async function loadBrandLogoImage(brand: string, catalog: LogoBrand[]): Promise<HTMLImageElement | null> {
  const match = findLogoBrand(catalog, brand);
  if (match?.src) {
    try {
      const img = await loadImage(match.src);
      if (img.naturalWidth > 0) return img;
    } catch {
      /* fall through to path variants */
    }
  }
  const slug = brandSlug(normalizeBrandKey(brand) || brand);
  if (!slug) return null;
  return loadLogoWithVariants(assetUrl(`logos/${slug}.png`));
}
