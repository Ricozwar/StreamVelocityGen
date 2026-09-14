import React from 'react';
import { StreamAsset, GenerationStatus } from '../types';
import { Loader2, AlertCircle, Scissors, Pencil, RotateCcw, Car, Users } from 'lucide-react';
import {
  bannerFilename,
  cropBannerToPngBlob,
  triggerDownload,
} from '../services/bannerDownload';

interface GalleryItemProps {
  asset: StreamAsset;
  availableLogoBrands: { value: string; label: string }[];
  showTeamInput?: boolean;
  onRetry: (id: string) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateBrand: (id: string, brand: string) => void;
  onUpdateTeam?: (id: string, teamName: string) => void;
}

export const GalleryItem: React.FC<GalleryItemProps> = ({
  asset,
  availableLogoBrands,
  showTeamInput,
  onRetry,
  onReset,
  onRemove,
  onUpdateName,
  onUpdateBrand,
  onUpdateTeam,
}) => {
  const isGenerating = asset.status === GenerationStatus.LOADING;
  const isSuccess = asset.status === GenerationStatus.SUCCESS;
  const isError = asset.status === GenerationStatus.ERROR;
  const isIdle = asset.status === GenerationStatus.IDLE || asset.status === GenerationStatus.ERROR;

  const handleDownloadBanner = async () => {
    if (!asset.generatedUrl) return;
    const blob = await cropBannerToPngBlob(asset.generatedUrl);
    triggerDownload(blob, `${bannerFilename(asset.driverName, asset.id)}.png`);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl flex flex-col h-full group/card transition-all hover:border-gray-700">
      <div className="relative aspect-video bg-black">
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-twitch-500 animate-spin mb-3" />
            <span className="text-twitch-400 text-sm font-semibold animate-pulse">
              Rysowanie banera...
            </span>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 z-20">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <span className="text-red-400 text-sm text-center px-4">
              {asset.errorMessage || 'Generation Failed'}
            </span>
            <button
              onClick={() => onRetry(asset.id)}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="absolute inset-0 flex">
          <div
            className={`relative transition-all duration-500 ease-in-out ${isSuccess ? 'w-1/3 border-r border-gray-800' : 'w-full'}`}
          >
            <div className="w-full h-full bg-gray-800/80 flex flex-col items-center justify-center gap-1 p-4 text-center">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">CSV</span>
              <span className="text-sm text-white font-medium truncate w-full">
                {asset.driverName || 'Kierowca'}
              </span>
              <span className="text-xs text-gray-400">
                #{asset.stats.carNumber} · {asset.stats.carBrand} · {asset.stats.classCategory}
              </span>
            </div>
          </div>

          {isSuccess && asset.generatedUrl && (
            <div className="w-2/3 relative animate-in fade-in duration-700 group">
              <img src={asset.generatedUrl} alt="Generated" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-twitch-600 px-2 py-0.5 rounded text-[10px] text-white uppercase tracking-wider font-bold shadow-lg">
                1000×100
              </div>
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-1/2 left-0 right-0 h-[20%] -translate-y-1/2 border-y border-twitch-400/50 bg-twitch-400/10"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 pb-2 bg-gray-950 space-y-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Pencil className="h-3 w-3 text-gray-500" />
          </div>
          <input
            type="text"
            value={asset.driverName || ''}
            onChange={(e) => onUpdateName(asset.id, e.target.value)}
            disabled={!isIdle}
            placeholder="Imię i nazwisko kierowcy"
            className={`
                    w-full bg-gray-900 text-sm text-white border border-gray-800 rounded-md py-2 pl-9 pr-8
                    focus:outline-none focus:ring-1 focus:ring-twitch-500 focus:border-twitch-500
                    placeholder-gray-600 transition-colors
                    ${!isIdle ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-700'}
                `}
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Car className="h-3 w-3 text-gray-500" />
          </div>
          <select
            value={asset.carBrand || ''}
            onChange={(e) => onUpdateBrand(asset.id, e.target.value)}
            disabled={!isIdle}
            className={`
                    w-full bg-gray-900 text-sm text-white border border-gray-800 rounded-md py-2 pl-9 pr-8
                    focus:outline-none focus:ring-1 focus:ring-twitch-500 focus:border-twitch-500
                    transition-colors appearance-none cursor-pointer
                    ${!isIdle ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-700'}
                `}
          >
            <option value="">Wybierz markę (logo)</option>
            {[
              ...(asset.carBrand && !availableLogoBrands.some((b) => b.value === asset.carBrand)
                ? [{ value: asset.carBrand, label: asset.carBrand.replace(/_/g, ' ') }]
                : []),
              ...availableLogoBrands,
            ].map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {showTeamInput && onUpdateTeam && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-3 w-3 text-gray-500" />
            </div>
            <input
              type="text"
              value={asset.teamName ?? ''}
              onChange={(e) => onUpdateTeam(asset.id, e.target.value)}
              disabled={!isIdle}
              placeholder="Nazwa teamu"
              className="w-full bg-gray-900 text-sm text-white border border-gray-800 rounded-md py-2 pl-9 pr-2 focus:outline-none focus:ring-1 focus:ring-twitch-500 focus:border-twitch-500 placeholder-gray-600 hover:border-gray-700"
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-950 border-t border-gray-800/0 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-500' : isGenerating ? 'bg-yellow-500' : isError ? 'bg-red-500' : 'bg-gray-500'}`}
          />
          <span
            className="text-xs text-gray-400 font-medium truncate max-w-[100px]"
            title={asset.driverName || 'CSV'}
          >
            {asset.driverName || 'CSV'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSuccess && (
            <>
              <button
                onClick={() => onReset(asset.id)}
                className="p-2 hover:bg-gray-800 text-gray-500 hover:text-white rounded-lg transition-colors"
                title="Reset to Edit"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadBanner}
                className="flex items-center gap-2 px-3 py-2 bg-twitch-600 hover:bg-twitch-500 text-white rounded-lg transition-colors font-semibold text-xs"
                    title="Pobierz 1000x100 — nazwa = kierowca"
              >
                <Scissors className="w-3 h-3" />
                <span>Download</span>
              </button>
            </>
          )}
          <button
            onClick={() => onRemove(asset.id)}
            className="p-2 hover:bg-gray-800 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
            title="Remove"
          >
            <div className="text-xl leading-none">&times;</div>
          </button>
        </div>
      </div>
    </div>
  );
};
