import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin, ViteDevServer } from 'vite';

const MAX_PNG_BYTES = 1_500_000;

export interface LogoManifestBrand {
  key: string;
  file: string;
  label: string;
}

function logosDir(root: string): string {
  return path.join(root, 'public', 'logos');
}

function manifestPath(root: string): string {
  return path.join(logosDir(root), 'manifest.json');
}

export function brandKeyFromStem(stem: string): string {
  return stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

export function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function labelFromStem(stem: string): string {
  const spaced = stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (spaced.length <= 4 && spaced === spaced.toUpperCase()) return spaced.toUpperCase();
  return spaced
    .split(' ')
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

export function listLogoFiles(root: string): LogoManifestBrand[] {
  const dir = logosDir(root);
  if (!fs.existsSync(dir)) return [];
  const byKey = new Map<string, LogoManifestBrand>();
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(png|svg|webp|jpe?g)$/i.test(name) || name.startsWith('.')) continue;
    const stem = name.replace(/\.[^.]+$/, '');
    const key = brandKeyFromStem(stem);
    if (!key) continue;
    const entry: LogoManifestBrand = {
      key,
      file: `logos/${name}`,
      label: labelFromStem(stem),
    };
    const prev = byKey.get(key);
    if (!prev || name.toLowerCase().endsWith('.png')) byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, 'pl'));
}

export function writeLogoManifest(root: string): LogoManifestBrand[] {
  const dir = logosDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const brands = listLogoFiles(root);
  fs.writeFileSync(manifestPath(root), `${JSON.stringify({ brands }, null, 2)}\n`, 'utf8');
  return brands;
}

function sendJson(res: Connect.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_PNG_BYTES * 2) {
        reject(new Error('Plik jest za duży (max 1.5 MB).'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function attachLogoApi(server: ViteDevServer, root: string) {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (url !== '/api/logos') {
      next();
      return;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, { brands: listLogoFiles(root) });
      return;
    }

    if (req.method === 'POST') {
      try {
        const raw = await readBody(req);
        const payload = JSON.parse(raw.toString('utf8')) as { brand?: string; pngBase64?: string };
        const brand = String(payload.brand ?? '').trim();
        const pngBase64 = String(payload.pngBase64 ?? '');
        if (!brand) {
          sendJson(res, 400, { error: 'Podaj nazwę marki.' });
          return;
        }
        const match = pngBase64.match(/^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/);
        if (!match) {
          sendJson(res, 400, { error: 'Oczekiwany PNG (data URL).' });
          return;
        }
        const buf = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
        if (buf.length < 32 || buf.length > MAX_PNG_BYTES) {
          sendJson(res, 400, { error: 'Nieprawidłowy rozmiar PNG.' });
          return;
        }
        const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        if (buf.subarray(0, 8).compare(pngSig) !== 0) {
          sendJson(res, 400, { error: 'To nie jest plik PNG.' });
          return;
        }
        const slug = brandSlug(brand);
        if (!slug) {
          sendJson(res, 400, { error: 'Niepoprawna nazwa marki.' });
          return;
        }
        const dir = logosDir(root);
        fs.mkdirSync(dir, { recursive: true });
        const filename = `${slug}.png`;
        fs.writeFileSync(path.join(dir, filename), buf);
        const brands = writeLogoManifest(root);
        const key = brandKeyFromStem(slug);
        sendJson(res, 200, {
          ok: true,
          brand: { key, file: `logos/${filename}`, label: labelFromStem(slug) },
          brands,
        });
      } catch (err) {
        sendJson(res, 400, { error: err instanceof Error ? err.message : 'Nie udało się zapisać logo.' });
      }
      return;
    }

    next();
  });
}

export function logoStorePlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'logo-store',
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      writeLogoManifest(root);
    },
    configureServer(server) {
      attachLogoApi(server, root);
    },
    configurePreviewServer(server) {
      attachLogoApi(server, root);
    },
  };
}
