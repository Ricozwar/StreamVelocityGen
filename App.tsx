import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CsvDropzone } from './components/CsvDropzone';
import { GalleryItem } from './components/GalleryItem';
import {
  StreamAsset,
  GenerationStatus,
  GeneratorConfig,
  OverlayStats,
  CsvColumnMap,
} from './types';
import type { ParsedCSV } from './services/csvParser';
import { parseCSV, getCsvColumnIndices, brandFromCarName, composeDriverName } from './services/csvParser';
import type { JsonDriver } from './services/jsonParser';
import { parseEntrylistJson, jsonDriversToTable, applyJsonNamesToCsv } from './services/jsonParser';
import { generateRacingOverlayFromStats } from './services/bannerService';
import { downloadAllBanners } from './services/bannerDownload';
import { DEFAULT_BANNER_COLORS, type BannerColors } from './services/bannerColors';
import {
  loadLogoCatalog,
  saveUploadedLogo,
  findLogoBrand,
  brandLabel,
  normalizeBrandKey,
  type LogoBrand,
} from './services/logoCatalog';
import { Palette, Wand2, Trash2, Scissors, FileSpreadsheet, Download, Car } from 'lucide-react';
import { BannerColorPicker } from './components/BannerColorPicker';
import { ManualBannerForm, type ManualBannerEntry } from './components/ManualBannerForm';

const isAssetDirty = (a: StreamAsset): boolean => {
  if (a.status === GenerationStatus.IDLE || a.status === GenerationStatus.ERROR) return true;
  if (a.status !== GenerationStatus.SUCCESS) return false;
  const nameDirty = (a.driverName ?? '').trim() !== (a.generatedName ?? '').trim();
  const teamDirty = (a.teamName ?? '').trim() !== (a.generatedTeam ?? '').trim();
  return nameDirty || teamDirty;
};

const App: React.FC = () => {
  const [assets, setAssets] = useState<StreamAsset[]>([]);
  const [config, setConfig] = useState<GeneratorConfig>({
    showCarNumber: false,
    colors: DEFAULT_BANNER_COLORS,
  });
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [csvMap, setCsvMap] = useState<CsvColumnMap | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const assetsRef = useRef<StreamAsset[]>([]);
  const csvParsedRef = useRef<ParsedCSV | null>(null);
  const jsonDriversRef = useRef<JsonDriver[] | null>(null);
  const [logoBrands, setLogoBrands] = useState<LogoBrand[]>([]);
  const logoBrandsRef = useRef<LogoBrand[]>([]);
  const configRef = useRef(config);
  const regenTimerRef = useRef<number | null>(null);
  assetsRef.current = assets;
  logoBrandsRef.current = logoBrands;
  configRef.current = config;

  useEffect(() => {
    void loadLogoCatalog().then(setLogoBrands);
  }, []);

  const rebuildAssets = useCallback(() => {
    const csv = csvParsedRef.current;
    const json = jsonDriversRef.current;
    let table: ParsedCSV | null = null;
    if (csv && json) table = applyJsonNamesToCsv(csv, json);
    else if (csv) table = csv;
    else if (json) table = jsonDriversToTable(json);

    if (!table || table.rows.length === 0 || table.headers.length === 0) {
      setAssets((prev) => prev.filter((a) => a.source === 'manual'));
      setCsvMap(null);
      return;
    }

    const columns = getCsvColumnIndices(table.headers);
    const headersNorm = table.headers.map((h) => h.toLowerCase());
    const fallbackNameCols = [
      headersNorm.findIndex((c) => c.includes('real name')),
      headersNorm.findIndex((c) => c === 'username'),
    ].filter((i) => i >= 0);
    const newAssets: StreamAsset[] = table.rows.map((row) => {
      const driverName =
        composeDriverName(row, columns.nameCols) || composeDriverName(row, fallbackNameCols);
      const carNumber =
        columns.numCol >= 0 ? (row[columns.numCol] ?? '').trim() || '0' : '0';
      const carNameCell = (row[columns.brandCol] ?? '').trim();
      const carBrand = carNameCell ? brandFromCarName(carNameCell) : 'RACING';
      const classRaw = columns.classCol >= 0 ? (row[columns.classCol] ?? '').trim() : '';
      const classCategory = (classRaw || 'PRO').toUpperCase();
      const stats: OverlayStats = { carNumber, carBrand, classCategory };
      return {
        id: crypto.randomUUID(),
        status: GenerationStatus.IDLE,
        source: 'csv',
        driverName: driverName || undefined,
        carBrand: carBrand !== 'RACING' ? carBrand : undefined,
        stats,
        csvRow: row,
      };
    });
    setCsvMap(columns);
    setAssets((prev) => [...prev.filter((a) => a.source === 'manual'), ...newAssets]);
  }, []);

  const loadFiles = useCallback(
    async (files: File[]) => {
      try {
        for (const file of files) {
          const lower = file.name.toLowerCase();
          if (lower.endsWith('.json')) {
            jsonDriversRef.current = await parseEntrylistJson(file);
            setJsonFileName(file.name);
          } else if (lower.endsWith('.csv')) {
            const parsed = await parseCSV(file);
            if (parsed.rows.length === 0 || parsed.headers.length === 0) {
              alert('CSV jest pusty lub nie ma nagłówków.');
              continue;
            }
            csvParsedRef.current = parsed;
            setCsvFileName(file.name);
          }
        }
        rebuildAssets();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Błąd odczytu pliku.');
      }
    },
    [rebuildAssets]
  );

  const handleNameColsChange = useCallback((colIndex: number, checked: boolean) => {
    setCsvMap((prev) => {
      if (!prev) return prev;
      if (!checked && prev.nameCols.length <= 1 && prev.nameCols.includes(colIndex)) {
        return prev;
      }
      let nameCols = checked
        ? [...prev.nameCols, colIndex]
        : prev.nameCols.filter((i) => i !== colIndex);
      nameCols = [...new Set(nameCols)].sort((a, b) => a - b);
      const nameHeaders = nameCols.map((i) => prev.headers[i] ?? `Kolumna ${i + 1}`);
      const next = { ...prev, nameCols, nameHeaders };
      setAssets((assetsPrev) =>
        assetsPrev.map((a) => {
          if (!a.csvRow) return a;
          const driverName = composeDriverName(a.csvRow, nameCols) || undefined;
          const wasGenerated = a.status === GenerationStatus.SUCCESS;
          return {
            ...a,
            driverName,
            ...(wasGenerated
              ? {}
              : { status: GenerationStatus.IDLE, generatedUrl: undefined, generatedName: undefined, generatedTeam: undefined }),
          };
        })
      );
      return next;
    });
  }, []);

  const handleUpdateName = useCallback((id: string, name: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, driverName: name } : a)));
  }, []);

  const handleUpdateBrand = useCallback((id: string, brand: string) => {
    const nextBrand = normalizeBrandKey(brand);
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const carBrand = nextBrand || undefined;
        const wasGenerated = a.status === GenerationStatus.SUCCESS;
        return {
          ...a,
          carBrand,
          stats: { ...a.stats, carBrand: nextBrand || a.stats.carBrand || 'RACING' },
          ...(wasGenerated
            ? { status: GenerationStatus.IDLE, generatedUrl: undefined, generatedName: undefined, generatedTeam: undefined }
            : {}),
        };
      })
    );
  }, []);

  const handleUploadLogo = useCallback(async (brand: string, file: File) => {
    const saved = await saveUploadedLogo(brand, file);
    const catalog = await loadLogoCatalog();
    setLogoBrands(catalog);
    const key = saved.value;
    setAssets((prev) =>
      prev.map((a) => {
        if (normalizeBrandKey(a.carBrand || a.stats.carBrand || '') !== key) return a;
        if (a.status !== GenerationStatus.SUCCESS) return a;
        return {
          ...a,
          status: GenerationStatus.IDLE,
          generatedUrl: undefined,
          generatedName: undefined,
          generatedTeam: undefined,
        };
      })
    );
  }, []);

  const handleUpdateTeam = useCallback((id: string, teamName: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, teamName } : a)));
  }, []);

  const handleResetAsset = useCallback((id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: GenerationStatus.IDLE, generatedUrl: undefined, generatedName: undefined, generatedTeam: undefined, errorMessage: undefined }
          : a
      )
    );
  }, []);

  const handleGenerate = useCallback(
    async (assetToProcess: StreamAsset) => {
      setAssets((prev) => {
        const exists = prev.some((a) => a.id === assetToProcess.id);
        if (!exists) {
          return [
            { ...assetToProcess, status: GenerationStatus.LOADING, errorMessage: undefined },
            ...prev,
          ];
        }
        return prev.map((a) =>
          a.id === assetToProcess.id
            ? { ...a, status: GenerationStatus.LOADING, errorMessage: undefined }
            : a
        );
      });

      try {
        const latest = assetsRef.current.find((a) => a.id === assetToProcess.id) ?? assetToProcess;
        const stats = { ...latest.stats };
        if (latest.carBrand?.trim()) {
          stats.carBrand = latest.carBrand.trim().toUpperCase();
        }
        const teamName = latest.teamName?.trim();
        if (teamName) {
          stats.teamName = teamName;
        } else {
          delete stats.teamName;
        }
        const carNumber = (stats.carNumber ?? '').trim();
        stats.showCarNumber =
          configRef.current.showCarNumber ||
          (latest.source === 'manual' && carNumber.length > 0);
        const nameToRender = (latest.driverName ?? '').trim() || 'Kierowca';
        const generatedImage = await generateRacingOverlayFromStats(
          stats,
          nameToRender,
          configRef.current.colors,
          logoBrandsRef.current
        );

        setAssets((prev) =>
          prev.map((a) =>
            a.id === assetToProcess.id
              ? {
                  ...a,
                  status: GenerationStatus.SUCCESS,
                  generatedUrl: generatedImage,
                  generatedName: nameToRender,
                  generatedTeam: teamName || undefined,
                }
              : a
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAssets((prev) =>
          prev.map((a) =>
            a.id === assetToProcess.id
              ? { ...a, status: GenerationStatus.ERROR, errorMessage }
              : a
          )
        );
      }
    },
    []
  );

  const handleAddManualBanner = useCallback(
    (entry: ManualBannerEntry) => {
      const brand = normalizeBrandKey(entry.carBrand);
      const asset: StreamAsset = {
        id: crypto.randomUUID(),
        status: GenerationStatus.IDLE,
        source: 'manual',
        driverName: entry.driverName,
        carBrand: brand || undefined,
        teamName: entry.teamName || undefined,
        stats: {
          carNumber: entry.carNumber,
          carBrand: brand || 'RACING',
          classCategory: entry.classCategory,
        },
      };
      void handleGenerate(asset);
    },
    [handleGenerate]
  );

  const handleRegenerate = useCallback(
    async (id: string) => {
      const current = assetsRef.current.find((a) => a.id === id);
      if (current) await handleGenerate(current);
    },
    [handleGenerate]
  );

  const regenerateDrawnBanners = useCallback(async () => {
    const list = assetsRef.current.filter(
      (a) =>
        a.status === GenerationStatus.SUCCESS ||
        a.status === GenerationStatus.ERROR ||
        Boolean(a.generatedUrl)
    );
    if (list.length === 0) return;
    setIsProcessingQueue(true);
    const BATCH_SIZE = 4;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      await Promise.all(list.slice(i, i + BATCH_SIZE).map((asset) => handleGenerate(asset)));
    }
    setIsProcessingQueue(false);
  }, [handleGenerate]);

  const applyBannerColors = useCallback(
    (colors: BannerColors, immediate: boolean) => {
      const next = { ...configRef.current, colors };
      configRef.current = next;
      setConfig(next);
      if (regenTimerRef.current != null) {
        window.clearTimeout(regenTimerRef.current);
        regenTimerRef.current = null;
      }
      if (immediate) {
        void regenerateDrawnBanners();
        return;
      }
      regenTimerRef.current = window.setTimeout(() => {
        regenTimerRef.current = null;
        void regenerateDrawnBanners();
      }, 280);
    },
    [regenerateDrawnBanners]
  );

  const handleGenerateAll = useCallback(async () => {
    setIsProcessingQueue(true);
    const idleAssets = assets.filter(isAssetDirty);

    const BATCH_SIZE = 4;

    for (let i = 0; i < idleAssets.length; i += BATCH_SIZE) {
      const batch = idleAssets.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((asset) => handleGenerate(asset)));
    }

    setIsProcessingQueue(false);
  }, [assets, handleGenerate]);

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAll = () => {
    csvParsedRef.current = null;
    jsonDriversRef.current = null;
    setAssets([]);
    setCsvFileName(null);
    setJsonFileName(null);
    setCsvMap(null);
  };

  const readyCount = assets.filter(isAssetDirty).length;
  const generatedCount = assets.filter(
    (a) => a.status === GenerationStatus.SUCCESS && a.generatedUrl
  ).length;
  const uniqueCars = useMemo(() => {
    const keys = new Set<string>();
    for (const asset of assets) {
      const key = normalizeBrandKey(asset.carBrand || asset.stats.carBrand || '');
      if (key && key !== 'RACING') keys.add(key);
    }
    return [...keys].sort((a, b) => a.localeCompare(b, 'pl'));
  }, [assets]);

  const handleDownloadAll = useCallback(async () => {
    if (generatedCount === 0 || isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      await downloadAllBanners(assets);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie udało się pobrać banerów.');
    } finally {
      setIsDownloadingAll(false);
    }
  }, [assets, generatedCount, isDownloadingAll]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <CsvDropzone
              onFiles={loadFiles}
              disabled={isProcessingQueue}
              fileName={[csvFileName, jsonFileName].filter(Boolean).join(' + ') || null}
              rowCount={assets.filter((a) => a.source !== 'manual').length}
              hint={
                jsonFileName && !csvFileName
                  ? 'Wgraj też CSV z SimGrid, żeby dostać samochód i klasę.'
                  : csvFileName && !jsonFileName
                    ? 'Wgraj też JSON (Entrylist), żeby dostać prawdziwe imię i nazwisko.'
                    : csvFileName && jsonFileName
                      ? 'Połączono CSV (auto/klasa) z JSON (imię i nazwisko).'
                      : null
              }
            />

            <ManualBannerForm
              brands={logoBrands}
              disabled={isDownloadingAll}
              onUploadLogo={handleUploadLogo}
              onAdd={handleAddManualBanner}
            />

            {csvMap && (
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 text-xs text-gray-400 space-y-1">
                <p className="text-gray-300 font-medium mb-1">Rozpoznane kolumny</p>
                <p>
                  Numer: <span className="text-white">{csvMap.numHeader}</span>
                </p>
                <p>
                  Samochód: <span className="text-white">{csvMap.brandHeader}</span>
                </p>
                <p>
                  Klasa:{' '}
                  <span className="text-white">{csvMap.classHeader ?? 'brak — użyto PRO'}</span>
                </p>
              </div>
            )}

            {uniqueCars.length > 0 && (
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 space-y-3">
                <p className="text-gray-300 font-medium text-xs uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-twitch-400" />
                  Auta na liście
                </p>
                <p className="text-xs text-gray-500">
                  Wybierz markę z logo albo wgraj brakujące — zapisze się jako PNG w{' '}
                  <span className="text-gray-300">public/logos</span>.
                </p>
                <div className="space-y-2">
                  {uniqueCars.map((key) => {
                    const known = findLogoBrand(logoBrands, key);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-8 h-8 shrink-0 rounded bg-white flex items-center justify-center overflow-hidden">
                          {known?.src ? (
                            <img src={known.src} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                          ) : (
                            <Car className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                        <span className="text-sm text-white truncate flex-1">{known?.label || brandLabel(key)}</span>
                        {known?.src ? null : (
                          <label className="text-[10px] uppercase tracking-wide text-twitch-300 cursor-pointer hover:text-white shrink-0">
                            Wgraj logo
                            <input
                              type="file"
                              accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif,.png,.svg,.jpg,.jpeg,.webp"
                              className="hidden"
                              disabled={isProcessingQueue}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) void handleUploadLogo(key, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.showCarNumber}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const next = { ...configRef.current, showCarNumber: checked };
                  configRef.current = next;
                  setConfig(next);
                  void regenerateDrawnBanners();
                }}
                disabled={isProcessingQueue}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-twitch-500 focus:ring-twitch-500"
              />
              <span className="text-sm text-gray-400">Pokaż numer startowy na banerze</span>
            </label>
            <p className="text-xs text-gray-500">
              W SimGrid gra często nadaje numery sama — bez tej opcji czerwone pole z numerem nie jest rysowane.
            </p>
          </div>

          <div className="lg:col-span-7 xl:col-span-8 bg-gray-900/50 rounded-xl border border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-twitch-400" />
                Konfiguracja banera
              </h2>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Pola na imię i nazwisko
                  </label>
                  {csvMap ? (
                    <>
                      <p className="text-xs text-gray-500">
                        {csvMap.headers.some((h) => /^firstName$/i.test(h) || /^lastName$/i.test(h)) ? (
                          <>
                            Domyślnie <span className="text-twitch-300">firstName</span> +{' '}
                            <span className="text-twitch-300">lastName</span> z JSON.
                          </>
                        ) : (
                          <>
                            Domyślnie zaznaczone jest <span className="text-twitch-300">real name</span>.
                          </>
                        )}{' '}
                        Możesz wybrać kilka pól — złożą się w jedną nazwę na banerze.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-lg border border-gray-700 bg-gray-950 p-3">
                        {csvMap.headers.map((header, index) => {
                          const label = header.trim() || `Kolumna ${index + 1}`;
                          const checked = csvMap.nameCols.includes(index);
                          return (
                            <label
                              key={`${index}-${label}`}
                              className={`flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1.5 text-sm ${
                                checked ? 'bg-twitch-900/40 text-white' : 'text-gray-300 hover:bg-gray-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => handleNameColsChange(index, e.target.checked)}
                                disabled={isProcessingQueue}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-twitch-500 focus:ring-twitch-500"
                              />
                              <span className="truncate" title={label}>
                                {label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/50 px-4 py-3 text-sm text-gray-500">
                      Wgraj CSV/JSON po lewej, żeby wybrać pola nazwiska — albo dodaj kierowcę ręcznie.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Kolorystyka
                  </label>
                  <BannerColorPicker
                    colors={config.colors}
                    showNumber={
                      config.showCarNumber ||
                      assets.some((a) => a.source === 'manual' && Boolean(a.stats.carNumber?.trim()))
                    }
                    disabled={isProcessingQueue || isDownloadingAll}
                    onChange={(colors) => applyBannerColors(colors, false)}
                    onPreset={(colors) => applyBannerColors(colors, true)}
                  />
                </div>

                <div className="bg-gray-950/50 border border-gray-700/50 rounded-lg p-4 flex items-start gap-4">
                  <div className="bg-twitch-900/50 p-2 rounded-md">
                    <FileSpreadsheet className="w-5 h-5 text-twitch-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">CSV / JSON → PNG 1000×100</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      Banery rysowane lokalnie (Canvas). JSON z SimGrid daje{' '}
                      <span className="text-twitch-300">firstName / lastName</span>, CSV —{' '}
                      <span className="text-twitch-300">car name</span> i{' '}
                      <span className="text-twitch-300">car class</span>.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded w-fit">
                      <Scissors className="w-3 h-3" />
                      <span>PNG 1000×100, nazwa pliku = imię i nazwisko kierowcy.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-800">
              <div className="text-sm text-gray-500">
                {assets.length} kierowców • {readyCount} do wygenerowania
                {generatedCount > 0 ? ` • ${generatedCount} gotowych` : ''}
              </div>
              <div className="flex gap-3">
                {assets.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-red-900/20 hover:text-red-400 text-gray-400 transition-colors flex items-center gap-2 text-sm font-medium"
                    disabled={isProcessingQueue || isDownloadingAll}
                  >
                    <Trash2 className="w-4 h-4" />
                    Wyczyść
                  </button>
                )}
                {generatedCount > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloadingAll || isProcessingQueue}
                    className={`
                      px-4 py-3 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all
                      ${
                        isDownloadingAll || isProcessingQueue
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 hover:bg-gray-700 text-white border border-twitch-500/40'
                      }
                    `}
                  >
                    <Download className="w-5 h-5" />
                    {isDownloadingAll
                      ? 'Pakowanie...'
                      : `Pobierz wszystkie (${generatedCount})`}
                  </button>
                )}
                <button
                  onClick={handleGenerateAll}
                  disabled={isProcessingQueue || readyCount === 0}
                  className={`
                    px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all
                    ${
                      isProcessingQueue || readyCount === 0
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-twitch-600 hover:bg-twitch-500 text-white hover:shadow-[0_0_20px_rgba(145,70,255,0.4)] hover:-translate-y-0.5'
                    }
                  `}
                >
                  <Wand2 className="w-5 h-5" />
                  {isProcessingQueue ? 'Generowanie...' : 'Generate Banners'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {assets.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-white">Kierowcy</h3>
              <div className="h-px bg-gray-800 flex-grow ml-4"></div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="h-full">
                <GalleryItem
                  asset={asset}
                  logoBrands={logoBrands}
                  showCarNumber={config.showCarNumber}
                  onRetry={() => handleRegenerate(asset.id)}
                  onReset={handleResetAsset}
                  onRemove={removeAsset}
                  onUpdateName={handleUpdateName}
                  onUpdateBrand={handleUpdateBrand}
                  onUploadLogo={handleUploadLogo}
                  onUpdateTeam={handleUpdateTeam}
                  onSaveName={() => handleRegenerate(asset.id)}
                />
              </div>
            ))}
          </div>

          {assets.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <div className="inline-block p-6 rounded-full bg-gray-900 mb-4">
                <FileSpreadsheet className="w-12 h-12 text-gray-600" />
              </div>
              <p className="text-xl text-gray-500">Brak listy kierowców.</p>
              <p className="text-sm text-gray-600">
                Dodaj kierowcę ręcznie po lewej albo wgraj CSV i/lub JSON z SimGrid.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
