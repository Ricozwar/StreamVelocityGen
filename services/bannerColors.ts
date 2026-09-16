export interface BannerColors {
  barColor: string;
  nameColor: string;
  numberColor: string;
}

export interface BannerPreset {
  id: string;
  label: string;
  colors: BannerColors;
}

export const DEFAULT_BANNER_COLORS: BannerColors = {
  barColor: '#141414',
  nameColor: '#ffffff',
  numberColor: '#cc0000',
};

export const BANNER_PRESETS: BannerPreset[] = [
  { id: 'tv', label: 'TV', colors: DEFAULT_BANNER_COLORS },
  {
    id: 'jasny',
    label: 'Jasny',
    colors: { barColor: '#f0f0f0', nameColor: '#111111', numberColor: '#cc0000' },
  },
  {
    id: 'fiolet',
    label: 'Fiolet',
    colors: { barColor: '#2a1248', nameColor: '#ffffff', numberColor: '#9146ff' },
  },
  {
    id: 'cyan',
    label: 'Cyan',
    colors: { barColor: '#062a2e', nameColor: '#9ffff8', numberColor: '#00e5ff' },
  },
  {
    id: 'pomarancz',
    label: 'Pomarańcz',
    colors: { barColor: '#2a1408', nameColor: '#ffe8c8', numberColor: '#ff6f00' },
  },
  {
    id: 'magenta',
    label: 'Magenta',
    colors: { barColor: '#2a0820', nameColor: '#ffd6f5', numberColor: '#ff00aa' },
  },
  {
    id: 'lime',
    label: 'Lime',
    colors: { barColor: '#0d1f0a', nameColor: '#d4ff8f', numberColor: '#7cfc00' },
  },
  {
    id: 'niebieski',
    label: 'Niebieski',
    colors: { barColor: '#0a1628', nameColor: '#d6e8ff', numberColor: '#1e90ff' },
  },
];

export const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6);
  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ];
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const mixTowardBlack = (hex: string, amount: number): string => {
  const [r, g, b] = parseHex(hex);
  const t = Math.min(1, Math.max(0, amount));
  const m = (v: number) => Math.round(v * (1 - t));
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export const isLightHex = (hex: string): boolean => {
  const [r, g, b] = parseHex(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

export const sameBannerColors = (a: BannerColors, b: BannerColors): boolean =>
  a.barColor.toLowerCase() === b.barColor.toLowerCase() &&
  a.nameColor.toLowerCase() === b.nameColor.toLowerCase() &&
  a.numberColor.toLowerCase() === b.numberColor.toLowerCase();
