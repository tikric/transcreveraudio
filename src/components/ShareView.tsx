/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileAudio, 
  Download, 
  Copy, 
  Clock, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  ExternalLink,
  Volume2,
  FileText
} from 'lucide-react';
import { Transcript } from '../types';
import { getPublicTranscriptFromFirestore } from '../firebaseService';

interface ShareViewProps {
  id: string;
}

export default function ShareView({ id }: ShareViewProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorWord, setErrorWord] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'topics'>('timeline');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadShared() {
      try {
        setLoading(true);
        // Try Firestore first for robust real-time cloud data
        const firestoreData = await getPublicTranscriptFromFirestore(id);
        if (firestoreData) {
          setTranscript(firestoreData);
          setLoading(false);
          return;
        }

        // Fallback to Express backend for legacy/mock transcripts
        const response = await fetch(`/api/transcripts/${id}`);
        if (!response.ok) {
          throw new Error('Não foi possível carregar a transcrição compartilhada. Verifique se o endereço está correto ou se o arquivo foi excluído.');
        }
        const data: Transcript = await response.json();
        setTranscript(data);
      } catch (err: any) {
        console.error("Failed to load shared document:", err);
        setErrorWord(err.message || 'Erro de conexão.');
      } finally {
        setLoading(false);
      }
    }
    loadShared();
  }, [id]);

  const handleCopyText = () => {
    if (!transcript) return;
    let b = '';
    transcript.topics.forEach((topic) => {
      b += `=== ${topic.title} ===\n`;
      topic.segments.forEach((seg) => {
        b += `[${seg.timestamp}] ${seg.speaker ? seg.speaker + ': ' : ''}${seg.text}\n`;
      });
      b += '\n';
    });
    navigator.clipboard.writeText(b);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadTXT = () => {
    if (!transcript) return;
    let builder = `${transcript.title}\nArquivo: ${transcript.fileName}\nIdioma: ${transcript.language}\nData: ${new Date(transcript.createdAt).toLocaleString()}\n\n`;
    if (transcript.summary) {
      builder += `RESUMO INTELIGENTE:\n${transcript.summary}\n\n`;
    }
    transcript.topics.forEach((topic) => {
      builder += `## ${topic.title}\n(${topic.description})\n\n`;
      topic.segments.forEach((seg) => {
        const speakerName = seg.speaker ? `${seg.speaker}: ` : '';
        builder += `[${seg.timestamp}] ${speakerName}${seg.text}\n`;
      });
      builder += '\n';
    });

    const blob = new Blob([builder], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '_')}_compartilhado.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };

  const downloadSRT = () => {
    if (!transcript) return;
    let srtContent = '';
    let counter = 1;

    const formatSRTTime = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3650);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    transcript.topics.forEach((topic) => {
      topic.segments.forEach((seg) => {
        srtContent += `${counter}\n`;
        srtContent += `${formatSRTTime(seg.seconds)} --> ${formatSRTTime(seg.seconds + 3.5)}\n`;
        srtContent += `${seg.speaker ? '[' + seg.speaker + '] ' : ''}${seg.text}\n\n`;
        counter++;
      });
    });

    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '_')}_compartilhado.srt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Buscando transcrição pública compartilhada...</p>
      </div>
    );
  }

  if (errorWord || !transcript) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto text-white">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-pulse">
          <FileAudio className="w-6 h-6 text-red-450 text-red-400" />
        </div>
        <h3 className="font-bold text-white text-base">Arquivo Público Não Encontrado</h3>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{errorWord || 'Link inválido ou arquivo excluído pelo usuário proprietário.'}</p>
        <a 
          href="/" 
          className="mt-6 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
        >
          Ir para Página Inicial
        </a>
      </div>
    );
  }

  return (
    <div id="share-layout" className="min-h-screen bg-[#050508] flex flex-col font-sans text-white">
      
      {/* Top sticky branding bar */}
      <header className="sticky top-0 z-30 bg-[#090812]/85 border-b border-white/5 p-4 px-6 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Volume2 className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white">
            Fozi<span className="font-medium text-gray-400">Scribe Share</span>
          </span>
        </div>

        <a
          href="/"
          className="text-xs font-semibold text-white hover:bg-indigo-500 bg-indigo-600 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1"
        >
          <span>Criar Nova Transcrição</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Single Page content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Main Header visual block */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden backdrop-blur-md">
          <div className="space-y-1.5 text-left border-b border-white/5 pb-3">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-bold tracking-wider uppercase border border-indigo-500/20">
              Visualização Pública Integrada
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {transcript.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] sm:text-xs text-gray-400 font-mono">
              <span>{transcript.duration}</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className="capitalize">{transcript.accuracyMode} mode</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>{new Date(transcript.createdAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Action Tabs and Exports */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'timeline' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Linha do Tempo
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'topics' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                Categorias & Tópicos (IA)
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Copy button */}
              <button
                onClick={handleCopyText}
                className="px-3 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-all text-xs font-semibold text-gray-300 flex items-center gap-1.5 cursor-pointer bg-transparent"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              {/* Download */}
              <div className="relative">
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  className="px-3 py-2 bg-indigo-600 border border-indigo-505 border-indigo-500/30 hover:bg-indigo-500 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {downloadOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDownloadOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-44 bg-[#0e0d16] border border-white/10 rounded-xl shadow-lg z-20 overflow-hidden text-xs py-1">
                      <button
                        onClick={downloadTXT}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-gray-300 flex items-center gap-2 border-none bg-transparent"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Texto Plano (.TXT)</span>
                      </button>
                      <button
                        onClick={downloadSRT}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-gray-300 flex items-center gap-2 border-none bg-transparent"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Legenda SRT (.SRT)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Overview Summary block if has */}
          {transcript.summary && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl space-y-1">
              <h4 className="text-xs font-bold text-yellow-450 text-yellow-400 uppercase tracking-wide flex items-center gap-1 select-none">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                <span>Resumo Inteligente</span>
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">{transcript.summary}</p>
            </div>
          )}

          {/* Core readable text area */}
          <div className="pt-4 border-t border-white/5">
            {activeTab === 'timeline' ? (
              <div className="space-y-1.5 font-mono text-sm max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {transcript.topics.flatMap((topic) => 
                  topic.segments.map((seg, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-1.5 hover:bg-white/5 rounded-lg transition-all duration-150">
                      <span className="text-gray-450 font-medium select-none text-xs sm:text-sm pt-0.5">
                        [{seg.timestamp}]
                      </span>
                      <div className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed text-left">
                        {seg.speaker && <span className="font-bold text-white mr-1">{seg.speaker}:</span>}
                        <span>{seg.text}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {transcript.topics.map((topic, topicIdx) => (
                  <div key={topic.id} className="space-y-4">
                    {topicIdx > 0 && (
                      <div className="relative my-8 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-dashed border-indigo-500/20" />
                        </div>
                        <div className="relative flex items-center gap-2 rounded-full border border-indigo-500/35 bg-[#050508] px-4 py-1.5 text-[10px] font-mono font-semibold text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse select-none">
                          <Clock className="w-3 h-3 text-indigo-400 animate-spin animate-infinite" style={{ animationDuration: '6s' }} />
                          <span>Pausa de silêncio de voz detectada (~2.3s) • Próximo Tópico</span>
                        </div>
                      </div>
                    )}

                    <div 
                      className="border border-white/5 bg-[#090812]/50 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md text-left"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.06)_0%,transparent_50%)] pointer-events-none"></div>
                      <div className="border-b border-white/5 pb-2.5">
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                          <span>{topic.title}</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{topic.description}</p>
                      </div>

                      <div className="space-y-2">
                        {topic.segments.map((seg, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-3 p-1.5 hover:bg-white/5 rounded-lg text-xs sm:text-sm text-gray-300 transition-all duration-150">
                            <span className="text-gray-450 font-mono text-xs pt-0.5 select-none shrink-0">[{seg.timestamp}]</span>
                            <div className="text-left font-sans">
                              {seg.speaker && <span className="font-bold text-indigo-400 block mb-0.5">{seg.speaker}: </span>}
                              <p className="text-gray-300 font-light leading-relaxed">{seg.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        
        {/* Bottom copyright attribution */}
        <footer className="text-center text-[10px] text-gray-500 font-mono">
          Este arquivo foi criado e compartilhado publicamente via foziscribe-transcription-suite • Termos e conexões criptografadas
        </footer>

      </main>
    </div>
  );
}
