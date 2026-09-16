import React from 'react';
import { Flag, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-twitch-500 p-2 rounded-lg shadow-[0_0_15px_rgba(145,70,255,0.5)]">
            <Flag className="w-6 h-6 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              StreamVelocity <span className="text-twitch-400">Gen</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Banery kierowców z CSV / JSON</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <div className="hidden md:flex px-3 py-1 rounded-full bg-racing-red/10 border border-racing-red/20 text-racing-red text-xs font-bold uppercase tracking-wider items-center gap-1">
                <Zap className="w-3 h-3" /> Live Generation
            </div>
        </div>
      </div>
    </header>
  );
};