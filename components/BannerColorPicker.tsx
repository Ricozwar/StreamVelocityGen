import React from 'react';
import {
  BANNER_PRESETS,
  isLightHex,
  sameBannerColors,
  type BannerColors,
} from '../services/bannerColors';

interface BannerColorPickerProps {
  colors: BannerColors;
  showNumber?: boolean;
  disabled?: boolean;
  onChange: (colors: BannerColors) => void;
  onPreset: (colors: BannerColors) => void;
}

const ColorField: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, disabled, onChange }) => (
  <label className="flex items-center gap-2 min-w-0">
    <input
      type="color"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-10 shrink-0 rounded-md border border-gray-700 bg-gray-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
      title={label}
    />
    <span className="min-w-0">
      <span className="block text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="block text-xs font-mono text-gray-300 truncate">{value}</span>
    </span>
  </label>
);

export const BannerColorPicker: React.FC<BannerColorPickerProps> = ({
  colors,
  showNumber,
  disabled,
  onChange,
  onPreset,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex h-9 overflow-hidden rounded-lg border border-gray-700">
        {showNumber ? (
          <div
            className="w-10 shrink-0 flex items-center justify-center text-[10px] font-black"
            style={{
              background: colors.numberColor,
              color: isLightHex(colors.numberColor) ? '#111111' : '#ffffff',
            }}
          >
            12
          </div>
        ) : null}
        <div className="w-10 shrink-0 bg-white" />
        <div
          className="flex-1 flex items-center px-3"
          style={{ background: colors.barColor }}
        >
          <span className="text-xs font-bold tracking-wide truncate" style={{ color: colors.nameColor }}>
            NAZWISKO
          </span>
        </div>
        <div className="w-12 shrink-0 bg-neutral-700 text-white text-[10px] font-bold flex items-center justify-center">
          GT4
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {BANNER_PRESETS.map((preset) => {
          const active = sameBannerColors(preset.colors, colors);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onPreset(preset.colors)}
              title={preset.label}
              className={`h-8 w-8 rounded-full border-2 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                active ? 'border-twitch-400 ring-2 ring-twitch-500/40' : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <span className="flex h-full">
                <span className="w-1/3 bg-white" />
                <span className="flex-1" style={{ background: preset.colors.barColor }} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ColorField
          label="Belka"
          value={colors.barColor}
          disabled={disabled}
          onChange={(barColor) => onChange({ ...colors, barColor })}
        />
        <ColorField
          label="Nazwisko"
          value={colors.nameColor}
          disabled={disabled}
          onChange={(nameColor) => onChange({ ...colors, nameColor })}
        />
        <ColorField
          label="Numer"
          value={colors.numberColor}
          disabled={disabled}
          onChange={(numberColor) => onChange({ ...colors, numberColor })}
        />
      </div>
    </div>
  );
};
