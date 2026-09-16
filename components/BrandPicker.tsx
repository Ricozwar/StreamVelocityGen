import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Car, ChevronDown, ImagePlus, Search } from 'lucide-react';
import type { LogoBrand } from '../services/logoCatalog';
import { brandLabel, findLogoBrand, normalizeBrandKey } from '../services/logoCatalog';

interface BrandPickerProps {
  value?: string;
  brands: LogoBrand[];
  disabled?: boolean;
  onChange: (brand: string) => void;
  onUploadLogo: (brand: string, file: File) => Promise<void>;
}

export const BrandPicker: React.FC<BrandPickerProps> = ({
  value,
  brands,
  disabled,
  onChange,
  onUploadLogo,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = findLogoBrand(brands, value);
  const currentLabel = selected?.label || (value ? brandLabel(value) : 'Wybierz auto');
  const currentSrc = selected?.src ?? null;
  const currentKey = value ? normalizeBrandKey(value) : '';

  const options = useMemo(() => {
    const list = [...brands];
    if (value && !findLogoBrand(list, value)) {
      list.unshift({
        value: normalizeBrandKey(value),
        label: brandLabel(value),
        src: null,
      });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) => b.label.toLowerCase().includes(q) || b.value.toLowerCase().includes(q)
    );
  }, [brands, value, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleFiles = async (file: File | undefined) => {
    if (!file) return;
    const brand = currentKey || window.prompt('Nazwa marki (np. Mazda)') || '';
    if (!normalizeBrandKey(brand)) return;
    setUploading(true);
    try {
      await onUploadLogo(brand, file);
      onChange(normalizeBrandKey(brand));
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie udało się wgrać logo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center gap-2 bg-gray-900 text-sm text-white border border-gray-800 rounded-md py-2 pl-3 pr-8 text-left
          focus:outline-none focus:ring-1 focus:ring-twitch-500 focus:border-twitch-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-700 cursor-pointer'}
        `}
      >
        <span className="w-8 h-8 shrink-0 rounded bg-white flex items-center justify-center overflow-hidden">
          {currentSrc ? (
            <img src={currentSrc} alt="" className="max-w-full max-h-full object-contain p-0.5" />
          ) : (
            <Car className="w-4 h-4 text-gray-400" />
          )}
        </span>
        <span className="truncate flex-1">{currentLabel}</span>
        {!currentSrc && value ? (
          <span className="text-[10px] uppercase tracking-wide text-amber-400 shrink-0">brak logo</span>
        ) : null}
        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2" />
      </button>

      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj marki…"
                className="w-full bg-gray-900 border border-gray-800 rounded-md py-1.5 pl-7 pr-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-twitch-500"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-500">Brak marek do wyświetlenia.</p>
            ) : (
              options.map((brand) => {
                const active = normalizeBrandKey(brand.value) === currentKey;
                return (
                  <button
                    type="button"
                    key={brand.value}
                    onClick={() => {
                      onChange(brand.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm ${
                      active ? 'bg-twitch-900/40 text-white' : 'text-gray-200 hover:bg-gray-900'
                    }`}
                  >
                    <span className="w-8 h-8 shrink-0 rounded bg-white flex items-center justify-center overflow-hidden">
                      {brand.src ? (
                        <img src={brand.src} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                      ) : (
                        <Car className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                    <span className="truncate">{brand.label}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-gray-800 p-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif,.png,.svg,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-md text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-twitch-300 border border-gray-800"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {uploading
                ? 'Zapisywanie…'
                : currentKey
                  ? `Wgraj logo (${currentLabel})`
                  : 'Wgraj logo nowej marki'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
