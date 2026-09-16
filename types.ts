import type { BannerColors } from './services/bannerColors';

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type { BannerColors };

export interface OverlayStats {
  carNumber: string;
  carBrand: string;
  classCategory: string; // "PRO", "SILVER", "GOLD", "AM", "PRO-AM", "GT3", ...
  teamName?: string;
  countryCode?: string;
  brandDomain?: string;
  showCarNumber?: boolean;
}

export interface StreamAsset {
  id: string;
  driverName?: string;
  /** Name baked into the last generated banner (for dirty/save). */
  generatedName?: string;
  carBrand?: string;
  generatedUrl?: string;
  status: GenerationStatus;
  errorMessage?: string;
  stats: OverlayStats;
  teamName?: string;
  csvRow?: string[];
}

export interface GeneratorConfig {
  showCarNumber: boolean;
  colors: BannerColors;
}

export interface CsvColumnMap {
  nameCols: number[];
  numCol: number;
  brandCol: number;
  classCol: number;
  nameHeaders: string[];
  numHeader: string;
  brandHeader: string;
  classHeader: string | null;
  headers: string[];
}
