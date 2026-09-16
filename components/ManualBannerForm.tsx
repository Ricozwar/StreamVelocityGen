import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { BrandPicker } from './BrandPicker';
import type { LogoBrand } from '../services/logoCatalog';

export const BANNER_CLASS_OPTIONS = [
  'PRO',
  'PRO-AM',
  'GOLD',
  'SILVER',
  'BRONZE',
  'AM',
  'GT3',
  'GT4',
  'GT2',
  'TCR',
  'CUP',
  'ST',
];

export interface ManualBannerEntry {
  driverName: string;
  carNumber: string;
  teamName: string;
  carBrand: string;
  classCategory: string;
}

interface ManualBannerFormProps {
  brands: LogoBrand[];
  disabled?: boolean;
  onUploadLogo: (brand: string, file: File) => Promise<void>;
  onAdd: (entry: ManualBannerEntry) => void;
}

const emptyDraft = {
  driverName: '',
  carNumber: '',
  teamName: '',
  carBrand: '',
  classCategory: 'GT4',
};

export const ManualBannerForm: React.FC<ManualBannerFormProps> = ({
  brands,
  disabled,
  onUploadLogo,
  onAdd,
}) => {
  const [draft, setDraft] = useState(emptyDraft);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const driverName = draft.driverName.trim();
    const carBrand = draft.carBrand.trim();
    if (!driverName) {
      alert('Podaj imię i nazwisko.');
      return;
    }
    if (!carBrand) {
      alert('Wybierz markę auta.');
      return;
    }
    onAdd({
      driverName,
      carNumber: draft.carNumber.replace(/^#/, '').trim(),
      teamName: draft.teamName.trim(),
      carBrand,
      classCategory: (draft.classCategory.trim() || 'PRO').toUpperCase(),
    });
    setDraft((prev) => ({
      ...emptyDraft,
      carBrand: prev.carBrand,
      classCategory: prev.classCategory,
    }));
  };

  const fieldClass =
    'w-full bg-gray-900 text-sm text-white border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-twitch-500 focus:border-twitch-500 placeholder-gray-600 hover:border-gray-700 disabled:opacity-50';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 space-y-3 overflow-visible"
    >
      <p className="text-gray-300 font-medium text-xs uppercase tracking-wider">Dodaj ręcznie</p>
      <p className="text-xs text-gray-500">
        Bez CSV/JSON — wpisz dane, wybierz auto i klasę, baner od razu trafia na listę.
      </p>

      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-1 space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-gray-500">Numer</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.carNumber}
            disabled={disabled}
            onChange={(e) => setDraft((prev) => ({ ...prev, carNumber: e.target.value }))}
            placeholder="23"
            className={fieldClass}
          />
        </label>
        <label className="col-span-2 space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-gray-500">Imię i nazwisko</span>
          <input
            type="text"
            value={draft.driverName}
            disabled={disabled}
            onChange={(e) => setDraft((prev) => ({ ...prev, driverName: e.target.value }))}
            placeholder="Jan Kowalski"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500">Team (opcjonalnie)</span>
        <input
          type="text"
          value={draft.teamName}
          disabled={disabled}
          onChange={(e) => setDraft((prev) => ({ ...prev, teamName: e.target.value }))}
          placeholder="Nazwa teamu"
          className={fieldClass}
        />
      </label>

      <div className="space-y-1">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500">Marka auta</span>
        <BrandPicker
          value={draft.carBrand || undefined}
          brands={brands}
          disabled={disabled}
          onChange={(carBrand) => setDraft((prev) => ({ ...prev, carBrand }))}
          onUploadLogo={onUploadLogo}
        />
      </div>

      <label className="block space-y-1">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500">Klasa</span>
        <input
          type="text"
          list="banner-class-options"
          value={draft.classCategory}
          disabled={disabled}
          onChange={(e) => setDraft((prev) => ({ ...prev, classCategory: e.target.value }))}
          placeholder="GT4"
          className={fieldClass}
        />
        <datalist id="banner-class-options">
          {BANNER_CLASS_OPTIONS.map((cls) => (
            <option key={cls} value={cls} />
          ))}
        </datalist>
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold bg-twitch-600 hover:bg-twitch-500 text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        Dodaj i generuj
      </button>
    </form>
  );
};
