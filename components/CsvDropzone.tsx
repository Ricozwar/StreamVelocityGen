import React, { useRef } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';

interface CsvDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  fileName?: string | null;
  rowCount?: number;
}

export const CsvDropzone: React.FC<CsvDropzoneProps> = ({
  onFile,
  disabled,
  fileName,
  rowCount,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) => {
    if (!file || disabled) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Wybierz plik CSV.');
      return;
    }
    onFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    e.target.value = '';
  };

  return (
    <div
      onClick={!disabled ? () => inputRef.current?.click() : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative group border-2 border-dashed rounded-xl p-10 transition-all duration-300 text-center cursor-pointer
        ${
          disabled
            ? 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
            : 'border-gray-700 bg-gray-900/30 hover:border-twitch-500 hover:bg-gray-900/80 hover:shadow-[0_0_30px_rgba(145,70,255,0.1)]'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        <div
          className={`p-4 rounded-full transition-colors duration-300 ${
            disabled ? 'bg-gray-800' : 'bg-gray-800 group-hover:bg-twitch-500/20'
          }`}
        >
          <Upload
            className={`w-8 h-8 ${disabled ? 'text-gray-600' : 'text-gray-400 group-hover:text-twitch-400'}`}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Upuść plik CSV tutaj</h3>
          <p className="text-sm text-gray-400">albo kliknij, żeby wybrać entry list</p>
        </div>
        {fileName ? (
          <div className="flex items-center gap-2 text-xs text-twitch-300 bg-twitch-900/30 px-3 py-1 rounded-full">
            <FileSpreadsheet className="w-3 h-3" />
            <span>
              {fileName}
              {typeof rowCount === 'number' ? ` · ${rowCount} kierowców` : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-black/20 px-3 py-1 rounded-full">
            <FileSpreadsheet className="w-3 h-3" />
            <span>real name, car number, car name, car class</span>
          </div>
        )}
      </div>
    </div>
  );
};
