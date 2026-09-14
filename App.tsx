import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { CsvDropzone } from './components/CsvDropzone';
import { GalleryItem } from './components/GalleryItem';
import {
  StreamAsset,
  GenerationStatus,
  RacingStyle,
  GeneratorConfig,
  OverlayStats,
  CsvColumnMap,
} from './types';
import type { ParsedCSV } from './services/csvParser';
import { parseCSV, getCsvColumnIndices, brandFromCarName } from './services/csvParser';
import { generateRacingOverlayFromStats, getAvailableLogoBrands } from './services/bannerService';
import { downloadAllBanners } from './services/bannerDownload';
import { Palette, Wand2, Trash2, Scissors, FileSpreadsheet, Download } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<StreamAsset[]>([]);
  const [config, setConfig] = useState<GeneratorConfig>({
    style: RacingStyle.GTWC_BROADCAST,
  });
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [includeTeamNameFromCsv, setIncludeTeamNameFromCsv] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvMap, setCsvMap] = useState<CsvColumnMap | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const loadCsvFile = useCallback(async (file: File) => {
    try {
      const parsed: ParsedCSV = await parseCSV(file);
      if (parsed.rows.length === 0 || parsed.headers.length === 0) {
        alert('CSV jest pusty lub nie ma nagłówków.');
        return;
      }
      const columns = getCsvColumnIndices(parsed.headers);
      const newAssets: StreamAsset[] = parsed.rows.map((row) => {
        const driverName = (row[columns.nameCol] ?? '').trim();
        const carNumber = (row[columns.numCol] ?? '').trim() || '0';
        const carNameCell = (row[columns.brandCol] ?? '').trim();
        const carBrand = carNameCell ? brandFromCarName(carNameCell) : 'RACING';
        const classRaw =
          columns.classCol >= 0 ? (row[columns.classCol] ?? '').trim() : '';
        const classCategory = (classRaw || 'PRO').toUpperCase();
        const stats: OverlayStats = { carNumber, carBrand, classCategory };
        return {
          id: crypto.randomUUID(),
          status: GenerationStatus.IDLE,
          driverName: driverName || undefined,
          carBrand: carBrand !== 'RACING' ? carBrand : undefined,
          stats,
        };
      });
      setCsvFileName(file.name);
      setCsvMap(columns);
      setAssets(newAssets);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd odczytu CSV.');
    }
  }, []);

  const handleUpdateName = useCallback((id: string, name: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, driverName: name } : a)));
  }, []);

  const handleUpdateBrand = useCallback((id: string, brand: string) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const carBrand = brand || undefined;
        return {
          ...a,
          carBrand,
          stats: { ...a.stats, carBrand: (brand || a.stats.carBrand || 'RACING').toUpperCase() },
        };
      })
    );
  }, []);

  const handleUpdateTeam = useCallback((id: string, teamName: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, teamName: teamName.trim() || undefined } : a))
    );
  }, []);

  const handleResetAsset = useCallback((id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: GenerationStatus.IDLE, generatedUrl: undefined, errorMessage: undefined }
          : a
      )
    );
  }, []);

  const handleGenerate = useCallback(
    async (assetToProcess: StreamAsset) => {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetToProcess.id
            ? { ...a, status: GenerationStatus.LOADING, errorMessage: undefined }
            : a
        )
      );

      try {
        const stats = { ...assetToProcess.stats };
        if (assetToProcess.carBrand?.trim()) {
          stats.carBrand = assetToProcess.carBrand.trim().toUpperCase();
        }
        if (includeTeamNameFromCsv && assetToProcess.teamName?.trim()) {
          stats.teamName = assetToProcess.teamName.trim();
        } else {
          delete stats.teamName;
        }
        const generatedImage = await generateRacingOverlayFromStats(
          stats,
          assetToProcess.driverName ?? 'Kierowca',
          config.style
        );

        setAssets((prev) =>
          prev.map((a) =>
            a.id === assetToProcess.id
              ? { ...a, status: GenerationStatus.SUCCESS, generatedUrl: generatedImage }
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
    [config, includeTeamNameFromCsv]
  );

  const handleGenerateAll = useCallback(async () => {
    setIsProcessingQueue(true);
    const idleAssets = assets.filter(
      (a) => a.status === GenerationStatus.IDLE || a.status === GenerationStatus.ERROR
    );

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
    setAssets([]);
    setCsvFileName(null);
    setCsvMap(null);
  };

  const readyCount = assets.filter(
    (a) => a.status === GenerationStatus.IDLE || a.status === GenerationStatus.ERROR
  ).length;
  const generatedCount = assets.filter(
    (a) => a.status === GenerationStatus.SUCCESS && a.generatedUrl
  ).length;
  const availableLogoBrands = getAvailableLogoBrands();

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
              onFile={loadCsvFile}
              disabled={isProcessingQueue}
              fileName={csvFileName}
              rowCount={assets.length}
            />

            {csvMap && (
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 text-xs text-gray-400 space-y-1">
                <p className="text-gray-300 font-medium mb-2">Rozpoznane kolumny</p>
                <p>
                  Kierowca: <span className="text-white">{csvMap.nameHeader}</span>
                </p>
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

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTeamNameFromCsv}
                onChange={(e) => setIncludeTeamNameFromCsv(e.target.checked)}
                disabled={isProcessingQueue}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-twitch-500 focus:ring-twitch-500"
              />
              <span className="text-sm text-gray-400">Uwzględnij nazwę teamu na banerze</span>
            </label>
            <p className="text-xs text-gray-500">
              Nazwę teamu wpisujesz ręcznie w karcie kierowcy (w CSV jej zwykle nie ma).
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
                    Styl
                  </label>
                  <select
                    value={config.style}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, style: e.target.value as RacingStyle }))
                    }
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-twitch-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer hover:border-gray-600"
                    disabled={isProcessingQueue || isDownloadingAll}
                  >
                    {Object.values(RacingStyle).map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-950/50 border border-gray-700/50 rounded-lg p-4 flex items-start gap-4">
                  <div className="bg-twitch-900/50 p-2 rounded-md">
                    <FileSpreadsheet className="w-5 h-5 text-twitch-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">CSV → PNG 1000×100</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      Banery rysowane lokalnie (Canvas). Dane biorą się z kolumn{' '}
                      <span className="text-twitch-300">real name, car number, car name, car class</span>.
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
                  availableLogoBrands={availableLogoBrands}
                  showTeamInput={includeTeamNameFromCsv}
                  onRetry={() => handleGenerate(asset)}
                  onReset={handleResetAsset}
                  onRemove={removeAsset}
                  onUpdateName={handleUpdateName}
                  onUpdateBrand={handleUpdateBrand}
                  onUpdateTeam={handleUpdateTeam}
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
              <p className="text-sm text-gray-600">Wgraj CSV z entry list, żeby wygenerować banery.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
