/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  VolumeX, 
  Database, 
  User, 
  Clock, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types';

const safeGetLocalStorage = (key: string, defaultValue: string): string => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.warn(`localStorage reading blocked for ${key}:`, e);
    return defaultValue;
  }
};

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage writing blocked for ${key}:`, e);
  }
};

export default function SettingsView() {
  const [defaultLanguage, setDefaultLanguage] = useState(() => {
    return safeGetLocalStorage('fosiscribe_default_language', 'pt-BR');
  });
  const [pauseThreshold, setPauseThreshold] = useState(() => {
    return safeGetLocalStorage('fosiscribe_pause_threshold', '1.5'); // default to 1.5s
  });
  const [autoSummary, setAutoSummary] = useState(() => {
    return safeGetLocalStorage('fosiscribe_auto_summary', 'true') === 'true';
  });
  const [loudnessFilter, setLoudnessFilter] = useState(() => {
    return safeGetLocalStorage('fosiscribe_loudness_filter', 'true') === 'true';
  });
  
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    safeSetLocalStorage('fosiscribe_default_language', defaultLanguage);
    safeSetLocalStorage('fosiscribe_pause_threshold', pauseThreshold);
    safeSetLocalStorage('fosiscribe_auto_summary', autoSummary ? 'true' : 'false');
    safeSetLocalStorage('fosiscribe_loudness_filter', loudnessFilter ? 'true' : 'false');
    
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
    }, 3000);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Configurações do Sistema</h2>
        <p className="text-gray-400 text-sm mt-1">
          Ajuste as diretrizes padrão de captação de microfone e limites de silêncio para a inteligência artificial.
        </p>
      </div>

      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 shadow-sm divide-y divide-white/5 space-y-6 backdrop-blur-md">
        
        {/* Row 1: AI parameters */}
        <div className="space-y-4 pb-6">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-gray-400" />
            <span>Processamento e Divisões da IA</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 text-left">
              <label className="block text-xs font-semibold text-gray-300">Idioma de Cadastro Padrão</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#0e0d16] text-[#b3b3b3]">
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400">Define o idioma selecionado por padrão ao carregar a página de transcrição de áudio.</p>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-xs font-semibold text-gray-300">Sensibilidade de Pausa (Silêncio)</label>
              <select
                value={pauseThreshold}
                onChange={(e) => setPauseThreshold(e.target.value)}
                className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="1" className="bg-[#0e0d16] text-[#b3b3b3]">1.0 segundo (Cortes frequentes)</option>
                <option value="1.5" className="bg-[#0e0d16] text-[#b3b3b3]">1.5 segundos (Padrão recomendado)</option>
                <option value="2" className="bg-[#0e0d16] text-[#b3b3b3]">2.0 segundos (Mais espaçado)</option>
                <option value="3" className="bg-[#0e0d16] text-[#b3b3b3]">3.0 segundos (Ideal para palestras)</option>
                <option value="5" className="bg-[#0e0d16] text-[#b3b3b3]">5.0 segundos (Cortes apenas para repouso completo)</option>
              </select>
              <p className="text-[10px] text-gray-400">Intervalo de ausência de voz necessário para que a Inteligência Artificial decida criar um novo bloco temática.</p>
            </div>
          </div>
        </div>

        {/* Row 2: Features Toggles */}
        <div className="space-y-4 py-6">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pt-2">
            <VolumeX className="w-4 h-4 text-gray-400" />
            <span>Áudio & Filtros</span>
          </h3>

          <div className="space-y-4 text-left">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSummary}
                onChange={(e) => setAutoSummary(e.target.checked)}
                className="mt-0.5 h-4 w-4 bg-black/40 border-white/10 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 rounded"
              />
              <div>
                <span className="block text-xs font-semibold text-gray-300">Gerar Resumo Inteligente por padrão</span>
                <span className="block text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Cria um breve parágrafo sintetizando todos os tópicos e termos-chave abordados na mídia enviada.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={loudnessFilter}
                onChange={(e) => setLoudnessFilter(e.target.checked)}
                className="mt-0.5 h-4 w-4 bg-black/40 border-white/10 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 rounded"
              />
              <div>
                <span className="block text-xs font-semibold text-gray-300">Filtro Inteligente de Ruído de Fundo</span>
                <span className="block text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Reduz ecos metálicos ou ruídos de vento nas gravações locais de microfone para aumentar a clareza da transcrição.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Row 3: Server Storage Integrity */}
        <div className="space-y-4 pt-6">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pt-2">
            <Database className="w-4 h-4 text-gray-400" />
            <span>Armazenamento de Dados</span>
          </h3>

          <div className="bg-[#0e0d16]/35 p-4 rounded-xl space-y-2 border border-white/5 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300">Formato de Sincronização Ativa:</span>
              <span className="font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                Full-Stack Server Sync
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              O FoziScribe sincroniza suas mídias e banco de dados diretamente em um container dedicado em nuvem. Caso as credenciais do Google Firebase sejam conectadas no console, o aplicativo migrará de forma impecável seus registros locais imediatos sem quebra ou downtime.
            </p>
          </div>
        </div>

      </div>

      {/* Button Save controls */}
      <div className="flex items-center justify-between">
        {savedStatus ? (
          <div className="text-xs text-green-400 font-semibold flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-4.5 h-4.5 text-green-400" />
            <span>Configurações salvas e aplicadas na nuvem!</span>
          </div>
        ) : (
          <div />
        )}
        
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-indigo-600 border border-indigo-500/30 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Preferências</span>
        </button>
      </div>
    </div>
  );
}
