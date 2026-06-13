/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Download, 
  Share2, 
  Trash2, 
  Edit3, 
  Check, 
  FileText, 
  FileSpreadsheet, 
  Search,
  Volume2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Transcript, Topic, Segment } from '../types';

interface HistoryViewProps {
  transcripts: Transcript[];
  loading: boolean;
  onRefresh: () => void;
  onUpdate: (transcript: Transcript) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function HistoryView({ transcripts, loading, onRefresh, onUpdate, onDelete }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'topics'>('timeline');
  const [editingSegment, setEditingSegment] = useState<{ topicIdx: number; segIdx: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Custom notifications
  const [notification, setNotification] = useState<{ id: string; text: string } | null>(null);
  
  // Download dropdown toggle state per transcript
  const [downloadOpenId, setDownloadOpenId] = useState<string | null>(null);

  useEffect(() => {
    onRefresh();
  }, []);

  // Expand the first item automatically if there are transcripts
  useEffect(() => {
    if (transcripts.length > 0 && !expandedId) {
      setExpandedId(transcripts[0].id);
    }
  }, [transcripts]);

  const showNotification = (text: string) => {
    setNotification({ id: Math.random().toString(), text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setEditingSegment(null);
  };

  const handleCopyText = (transcript: Transcript) => {
    // Generate clean text with timestamps
    let builder = '';
    transcript.topics.forEach((topic) => {
      builder += `=== ${topic.title} ===\n`;
      topic.segments.forEach((seg) => {
        const speakerTag = seg.speaker ? ` ${seg.speaker}:` : '';
        builder += `[${seg.timestamp}]${speakerTag} ${seg.text}\n`;
      });
      builder += '\n';
    });

    navigator.clipboard.writeText(builder);
    showNotification('Texto copiado com sucesso para a área de transferência!');
  };

  const handleCopyShareLink = (transcript: Transcript) => {
    // Base sharing URL using origin
    const shareUrl = `${window.location.origin}/share/${transcript.id}`;
    navigator.clipboard.writeText(shareUrl);
    showNotification(`Link público gerado e copiado! Qualquer pessoa poderá visualizar esta transcrição.`);
  };

  // Inline editing actions
  const startEditSegment = (topicIdx: number, segIdx: number, currentText: string) => {
    setEditingSegment({ topicIdx, segIdx });
    setEditValue(currentText);
  };

  const saveEditSegment = async (transcript: Transcript) => {
    if (!editingSegment) return;
    
    const { topicIdx, segIdx } = editingSegment;
    // Deep Clone transcript to edit
    const clone = JSON.parse(JSON.stringify(transcript)) as Transcript;
    clone.topics[topicIdx].segments[segIdx].text = editValue;
    
    try {
      await onUpdate(clone);
      setEditingSegment(null);
      showNotification('Segmento editado e salvo com sucesso na nuvem!');
    } catch (err) {
      showNotification('Erro ao salvar alterações na nuvem.');
    }
  };

  // Convert seconds to SRT Time tag: "HH:MM:SS,mmm"
  const formatSRTTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3650);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // Exporters
  const downloadTXT = (transcript: Transcript) => {
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
    a.download = `${transcript.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpenId(null);
  };

  const downloadSRT = (transcript: Transcript) => {
    let srtContent = '';
    let counter = 1;

    transcript.topics.forEach((topic) => {
      topic.segments.forEach((seg) => {
        const startSec = seg.seconds;
        const endSec = seg.seconds + 3.5; // Estimated duration per segment capsule 
        
        srtContent += `${counter}\n`;
        srtContent += `${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n`;
        const speakerHeader = seg.speaker ? `[${seg.speaker}] ` : '';
        srtContent += `${speakerHeader}${seg.text}\n\n`;
        counter++;
      });
    });

    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '_')}_legendas.srt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpenId(null);
  };

  const downloadVTT = (transcript: Transcript) => {
    let vttContent = 'WEBVTT\n\n';
    let counter = 1;

    transcript.topics.forEach((topic) => {
      topic.segments.forEach((seg) => {
        const startSec = seg.seconds;
        const endSec = seg.seconds + 3.5;
        
        vttContent += `${counter}\n`;
        // WebVTT uses dot for milliseconds
        const srtStart = formatSRTTime(startSec).replace(',', '.');
        const srtEnd = formatSRTTime(endSec).replace(',', '.');
        
        vttContent += `${srtStart} --> ${srtEnd}\n`;
        const speakerHeader = seg.speaker ? `<v ${seg.speaker}>` : '';
        vttContent += `${speakerHeader}${seg.text}\n\n`;
        counter++;
      });
    });

    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '_')}_legendas.vtt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpenId(null);
  };

  const downloadJSON = (transcript: Transcript) => {
    const blob = new Blob([JSON.stringify(transcript, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpenId(null);
  };

  const filteredTranscripts = transcripts.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.summary && t.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return 'Agora mesmo';
    if (mins < 60) return `Há ${mins} minuto${mins > 1 ? 's' : ''}`;
    if (hrs < 24) return `Há ${hrs} hora${hrs > 1 ? 's' : ''}`;
    if (days === 1) return 'Ontem';
    return `Há ${days} dias`;
  };

  return (
    <div id="history-view" className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white text-xs font-medium px-5 py-3.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 animate-slide-in">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Histórico</h2>
          <p className="text-gray-400 text-sm mt-1">Sua plataforma inteligente de arquivos em nuvem.</p>
        </div>
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar transcrições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900/40 border border-white/10 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 backdrop-blur-md"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-gray-350 text-gray-300 disabled:opacity-50 cursor-pointer"
            title="Atualizar Banco de Dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && transcripts.length === 0 ? (
        /* Skeletons */
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-900/40 border border-white/5 rounded-2xl h-18 animate-pulse" />
          ))}
        </div>
      ) : filteredTranscripts.length === 0 ? (
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-12 text-center max-w-md mx-auto backdrop-blur-md">
          <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h3 className="font-semibold text-white text-sm">Nenhuma transcrição encontrada</h3>
          <p className="text-xs text-gray-400 mt-1">Grave ou envie um novo áudio na aba "Transcribe" para começar.</p>
        </div>
      ) : (
        /* Collapsible Transcripts lists */
        <div className="space-y-4">
          {filteredTranscripts.map((transcript) => {
            const isExpanded = expandedId === transcript.id;
            const isDownloadDropdownOpen = downloadOpenId === transcript.id;
            
            // Format nice human credits calculation
            const creditsSim = Math.round(transcript.durationSeconds * 2.1) + 's';
            
            return (
              <div 
                key={transcript.id}
                id={`transcript-card-${transcript.id}`}
                className={`bg-gray-900/40 border transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                  isExpanded ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                {/* Header Block bar */}
                <div 
                  onClick={() => toggleExpand(transcript.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1 w-full max-w-3xl">
                    <h3 className="font-semibold text-white text-sm sm:text-base leading-snug truncate">
                      {transcript.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-gray-405 text-gray-450 text-gray-400 font-mono">
                      <span>{transcript.duration}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="capitalize">{transcript.accuracyMode} mode</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>{creditsSim} credits used</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>{new Date(transcript.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(transcript.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-gray-405 text-indigo-400 font-bold">{calculateRelativeTime(transcript.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja excluir esta transcrição permanente na nuvem?')) {
                          onDelete(transcript.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer bg-transparent"
                      title="Excluir Transcrição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Sub-body content section when expanded */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-4 sm:p-6 space-y-6">
                    
                    {/* Upper Actions panel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                      
                      {/* View Tab selector (Timeline as requested vs Smart topics breakdown) */}
                      <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5">
                        <button
                          onClick={() => { setActiveTab('timeline'); setEditingSegment(null); }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            activeTab === 'timeline'
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                              : 'text-gray-450 hover:text-white'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          Linha do Tempo
                        </button>
                        <button
                          onClick={() => { setActiveTab('topics'); setEditingSegment(null); }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            activeTab === 'topics'
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                              : 'text-gray-455 hover:text-white'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 inline mr-1" />
                          Categorias & Pausas (IA)
                        </button>
                      </div>

                      {/* Right Control exporters buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        
                        {/* Share link button */}
                        <button
                          onClick={() => handleCopyShareLink(transcript)}
                          className="px-3 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-all text-xs font-semibold text-gray-305 text-gray-300 flex items-center gap-1.5 cursor-pointer"
                          title="Gerar link público para compartilhar"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Partilhar</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(transcript)}
                          className="px-3 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-all text-xs font-semibold text-gray-305 text-gray-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>

                        {/* Download Multi-Format Dropdown container */}
                        <div className="relative">
                          <button
                            onClick={() => setDownloadOpenId(isDownloadDropdownOpen ? null : transcript.id)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-550 hover:bg-indigo-500 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-indigo-500/30 shadow-md shadow-indigo-600/10"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          
                          {isDownloadDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setDownloadOpenId(null)}
                              />
                              <div className="absolute right-0 mt-1.5 w-44 bg-[#0e0d16] border border-white/10 rounded-xl shadow-lg z-20 overflow-hidden font-sans py-1">
                                <button
                                  onClick={() => downloadTXT(transcript)}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Texto Plano (.TXT)</span>
                                </button>
                                <button
                                  onClick={() => downloadSRT(transcript)}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2"
                                  title="Formato SubRip de legenda"
                                >
                                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Legendas SRT (.SRT)</span>
                                </button>
                                <button
                                  onClick={() => downloadVTT(transcript)}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2"
                                  title="Formato WebVTT de navegador"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Web Legendas (.VTT)</span>
                                </button>
                                <button
                                  onClick={() => downloadJSON(transcript)}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                                  <span>Dados JSON (.JSON)</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Overall Intelligent AI Overview Summary if exists */}
                    {transcript.summary && (
                      <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl space-y-1 mb-2">
                        <h4 className="text-xs font-bold text-yellow-505 text-yellow-450 text-yellow-405 text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Resumo Inteligente FoziScribe</span>
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{transcript.summary}</p>
                      </div>
                    )}

                    {/* Timeline plain viewer as shown in target image */}
                    {activeTab === 'timeline' ? (
                      <div className="space-y-1.5 font-mono text-sm max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {transcript.topics.flatMap((topic, topicIdx) => 
                          topic.segments.map((seg, segIdx) => {
                            const isBeingEdited = editingSegment?.topicIdx === topicIdx && editingSegment?.segIdx === segIdx;
                            
                            return (
                              <div 
                                key={`${topicIdx}-${segIdx}`}
                                className="group flex items-start gap-2 hover:bg-white/5 p-2 rounded-lg transition-all duration-150"
                              >
                                <span className="text-gray-450 text-gray-400 font-medium select-none text-xs sm:text-sm pt-0.5 shrink-0">
                                  [{seg.timestamp}]
                                </span>
                                
                                <div className="flex-1 font-sans text-xs sm:text-sm">
                                  {seg.speaker && (
                                    <span className="font-bold text-white mr-1 shrink-0">{seg.speaker}:</span>
                                  )}
                                  
                                  {isBeingEdited ? (
                                    <div className="flex items-center gap-2 mt-1 w-full">
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="flex-1 text-xs bg-black/40 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-505 focus:border-indigo-505"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => saveEditSegment(transcript)}
                                        className="p-1 px-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Ok</span>
                                      </button>
                                      <button
                                        onClick={() => setEditingSegment(null)}
                                        className="p-1 px-2.5 border border-white/10 hover:bg-white/5 rounded-lg text-gray-300 text-xs font-semibold cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 leading-relaxed break-words">{seg.text}</span>
                                  )}
                                </div>

                                {!isBeingEdited && (
                                  <button
                                    onClick={() => startEditSegment(topicIdx, segIdx, seg.text)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-all shrink-0 cursor-pointer bg-transparent"
                                    title="Editar segmento de texto"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      /* Category structured pause block topic dividers with glowing barriers */
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
                              className="border border-white/5 bg-[#090812]/50 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md"
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
                                {topic.segments.map((seg, segIdx) => {
                                  const isBeingEdited = editingSegment?.topicIdx === topicIdx && editingSegment?.segIdx === segIdx;
                                  
                                  return (
                                    <div 
                                      key={segIdx}
                                      className="group flex items-start gap-3 hover:bg-white/5 p-2 rounded-lg text-xs sm:text-sm font-sans transition-all duration-150"
                                    >
                                      <span className="text-gray-400 font-mono text-xs pt-0.5 shrink-0 select-none">
                                        [{seg.timestamp}]
                                      </span>
                                      
                                      <div className="flex-1">
                                        {seg.speaker && (
                                          <span className="font-bold text-indigo-400 block mb-0.5">{seg.speaker}:</span>
                                        )}
                                        
                                        {isBeingEdited ? (
                                          <div className="flex items-center gap-2 mt-1.5">
                                            <input
                                              type="text"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              className="flex-1 text-xs bg-black/40 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => saveEditSegment(transcript)}
                                              className="p-1 px-2.5 bg-green-600 rounded text-white font-medium text-xs cursor-pointer border-none"
                                            >
                                              Salvar
                                            </button>
                                            <button
                                              onClick={() => setEditingSegment(null)}
                                              className="p-1 px-2.5 border border-white/10 rounded-lg text-xs text-gray-300 cursor-pointer hover:bg-white/5"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-gray-300 font-light leading-relaxed">{seg.text}</p>
                                        )}
                                      </div>

                                      {!isBeingEdited && (
                                        <button
                                          onClick={() => startEditSegment(topicIdx, segIdx, seg.text)}
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded text-gray-450 hover:text-white cursor-pointer transition-all duration-155 bg-transparent border-none"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
