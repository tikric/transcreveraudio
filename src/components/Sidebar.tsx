/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FileAudio, 
  History as HistoryIcon, 
  HelpCircle, 
  Settings as SettingsIcon, 
  Volume2
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType | 'share';
  onViewChange: (view: ViewType) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'transcribe' as ViewType, label: 'Transcribe', icon: FileAudio },
    { id: 'history' as ViewType, label: 'History', icon: HistoryIcon },
    { id: 'support' as ViewType, label: 'Support', icon: HelpCircle },
    { id: 'settings' as ViewType, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside 
      id="sidebar-container" 
      className="w-64 bg-gray-950/45 border-r border-white/5 flex flex-col justify-between p-4 h-screen sticky top-0 font-sans shadow-lg text-white backdrop-blur-md"
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-2 mb-6 select-none">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Fozi<span className="text-indigo-400 font-medium">Scribe</span>
          </h1>
          <span className="text-[10px] uppercase tracking-widest font-mono text-gray-500">AI Transcription</span>
        </div>
      </div>

      {/* Primary Navigation Links */}
      <nav id="nav-menu" className="flex-1 space-y-1 animate-fade-in">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => currentView !== 'share' && onViewChange(item.id)}
              disabled={currentView === 'share'}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-205 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              } ${currentView === 'share' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div id="sidebar-footer" className="mt-auto pt-3 border-t border-white/5">
        <div className="text-center select-none font-mono text-[9px] text-gray-500">
          v1.3.0 • Immersive UI Theme
        </div>
      </div>
    </aside>
  );
}
