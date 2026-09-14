export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum RacingStyle {
  GTWC_BROADCAST = 'GT World Challenge TV',
  NEON_STREET = 'Neon Street',
  FORMULA_TECH = 'Formula Tech',
  RALLY_DIRT = 'Rally Dirt',
  RETRO_WAVE = 'Retro Synthwave',
  CYBERPUNK = 'Cyberpunk Racing'
}

export interface OverlayStats {
  carNumber: string;
  carBrand: string;
  classCategory: string; // "PRO", "SILVER", "GOLD", "AM", "PRO-AM", "GT3", ...
  teamName?: string;
  countryCode?: string;
  brandDomain?: string;
}

export interface StreamAsset {
  id: string;
  driverName?: string;
  carBrand?: string;
  generatedUrl?: string;
  status: GenerationStatus;
  errorMessage?: string;
  stats: OverlayStats;
  teamName?: string;
}

export interface GeneratorConfig {
  style: RacingStyle;
}

export interface CsvColumnMap {
  nameCol: number;
  numCol: number;
  brandCol: number;
  classCol: number;
  nameHeader: string;
  numHeader: string;
  brandHeader: string;
  classHeader: string | null;
}
