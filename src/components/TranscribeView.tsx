/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Upload, 
  Languages, 
  Cpu, 
  Volume2, 
  Play, 
  FileAudio,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Trash2
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, Transcript } from '../types';

interface TranscribeViewProps {
  onTranscriptionSuccess: (transcript: Transcript) => void;
}

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

export default function TranscribeView({ onTranscriptionSuccess }: TranscribeViewProps) {
  // Input Selection States
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return safeGetLocalStorage('fosiscribe_default_language', 'pt-BR');
  });
  const [accuracyMode, setAccuracyMode] = useState<'accuracy' | 'speed' | 'default'>('accuracy');
  
  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Audio Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // API Provider states (Gemini vs Groq)
  const [provider, setProvider] = useState<'gemini' | 'groq'>(() => {
    return (safeGetLocalStorage('fosiscribe_provider', 'gemini') as 'gemini' | 'groq');
  });
  const [groqApiKey, setGroqApiKey] = useState(() => {
    return safeGetLocalStorage('fosiscribe_groq_api_key', '');
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return safeGetLocalStorage('fosiscribe_gemini_api_key', '');
  });

  const handleProviderChange = (newProvider: 'gemini' | 'groq') => {
    setProvider(newProvider);
    safeSetLocalStorage('fosiscribe_provider', newProvider);
  };

  const handleGroqApiKeyChange = (key: string) => {
    setGroqApiKey(key);
    safeSetLocalStorage('fosiscribe_groq_api_key', key);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setGeminiApiKey(key);
    safeSetLocalStorage('fosiscribe_gemini_api_key', key);
  };

  // Status and Progress States
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [progressText, setProgressText] = useState('');
  const [errorText, setErrorText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer loop for active microphone recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      setErrorText('');
      setUploadedFile(null); // Clear uploaded file
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setRecordedUrl(url);
        
        // Stop all tracks to release mic hardware
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setErrorText(
        'Não foi possível acessar o microfone. Verifique suas permissões de áudio no painel do navegador.'
      );
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorText('');
    setRecordedBlob(null); // Clear tape
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
    } else {
      setErrorText('Por favor, envie somente arquivos de áudio válidos (mp3, wav, m4a, webm).');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorText('');
    setRecordedBlob(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
        setUploadedFile(file);
      } else {
        setErrorText('Por favor, forneça somente arquivos de áudio válidos.');
      }
    }
  };

  // Convert File/Blob to Base64 String
  const convertToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  // Trigger Transcription Trigger
  const handleTranscribe = async () => {
    setStatus('processing');
    setErrorText('');
    setProgressText('Preparando áudio...');

    try {
      let audioBase64 = '';
      let name = '';
      let durSec = 120; // fallback duration

      if (recordedBlob) {
        setProgressText('Compactando gravação do microfone...');
        audioBase64 = await convertToBase64(recordedBlob);
        name = `Gravacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}_${formatTime(recordingTime).replace(':', 's')}.mp3`;
        durSec = recordingTime;
      } else if (uploadedFile) {
        setProgressText('Fazendo upload do arquivo para processamento...');
        audioBase64 = await convertToBase64(uploadedFile);
        name = uploadedFile.name;
        // Mocking duration based on size
        durSec = Math.round(uploadedFile.size / 24000) || 90;
      } else {
        throw new Error('Nenhum áudio selecionado.');
      }

      // Proceed to send request to backend
      const startText = provider === 'groq' 
        ? 'Enviando para o Groq (Whisper: Transcrição Real)...' 
        : 'Enviando para a Inteligência Artificial da Google (Gemini)...';
      setProgressText(startText);
      
      // Smart text update
      const textInterval = setInterval(() => {
        const phrases = provider === 'groq' 
          ? [
              'Extraindo áudio de alta fidelidade com Whisper...',
              'Analisando pausas e silêncios com Whisper-v3...',
              'Estruturando tópicos inteligentes com LLaMA...',
              'Formatando rótulos de palestrantes e legendagem sincronizada...',
              'Organizando resumo profissional do material...',
              'Gravando transcrição no banco de dados...'
            ]
          : [
              'Analisando pausas de fala...',
              'Detectando silêncios maiores que 2s para corte temático...',
              'Dividindo transcrição em blocos de tópicos estruturados...',
              'Gerando legendas indexadas automáticas...',
              'Formatando ortografia e rótulos de palestrantes...',
              'Sincronizando com armazenamento na nuvem...'
            ];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        setProgressText(randomPhrase);
      }, 4000);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioBase64,
          fileName: name,
          language: selectedLanguage,
          accuracyMode: accuracyMode,
          durationSeconds: durSec,
          provider: provider,
          groqApiKey: groqApiKey,
          geminiApiKey: geminiApiKey,
          pauseThreshold: safeGetLocalStorage('fosiscribe_pause_threshold', '1.5')
        }),
      });

      clearInterval(textInterval);

      if (!response.ok) {
        let errMsg = 'Erro desconhecido ao processar o áudio no servidor.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errMsg = errorData.error || errMsg;
          } else {
            // Not JSON - might be a Cloudflare HTML error block (524 Timeout / 413 Entity Too Large)
            const textResponse = await response.text();
            if (response.status === 413 || textResponse.includes('413') || textResponse.includes('Request Entity Too Large') || textResponse.includes('Payload Too Large')) {
              errMsg = 'O arquivo de áudio enviado é muito grande e excedeu o limite máximo do servidor (máx. 50MB no Cloud Run / Cloudflare).';
            } else if (response.status === 524 || textResponse.includes('524') || textResponse.includes('timeout')) {
              errMsg = 'Tempo de resposta excedido (Timeout Gateway 524). O Cloudflare interrompeu a requisição por demorar mais de 100 segundos. Tente usar arquivos menores ou use o Groq Whisper para transcrições ultra rápidas.';
            } else {
              errMsg = `O servidor respondeu com erro (Status: ${response.status}).`;
            }
          }
        } catch (e) {
          errMsg = `Erro no processamento (Código ${response.status}).`;
        }
        throw new Error(errMsg);
      }

      let result: Transcript;
      try {
        result = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse final transcript JSON:', jsonErr);
        throw new Error('O formato da resposta do servidor é inválido. A transcrição foi interrompida ou o servidor sofreu um timeout.');
      }
      setStatus('success');
      
      // Clean up inputs
      setUploadedFile(null);
      setRecordedBlob(null);
      
      // Callback to app state
      onTranscriptionSuccess(result);
    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorText(err.message || 'Falha na conexão com o servidor de transcrição.');
    }
  };

  const isTranscribeDisabled = !uploadedFile && !recordedBlob;

  return (
    <div id="transcribe-view" className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Intro Header */}
      <div>
        <h2 className="text-2xl font-bold text-white font-sans tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">Nova Transcrição Inteligente</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          A IA analisa as oscilações de voz e pausas maiores que {safeGetLocalStorage('fosiscribe_pause_threshold', '1.5')} segundos para fatiar seus conteúdos automaticamente em tópicos descritivos e legendas editáveis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side Setup Settings */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-5 shadow-md space-y-5 relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none"></div>
            <h3 className="font-semibold text-white text-sm border-b border-white/5 pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Configurações</span>
            </h3>

            {/* Language Selector */}
            <div className="space-y-2">
              <label id="lang-label" className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                <span>Idioma do Áudio</span>
              </label>
              <select
                id="lang-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-sm rounded-xl px-3 py-2.5 text-gray-250 focus:outline-none focus:ring-2 focus:ring-indigo-650 cursor-pointer"
              >
                <option value="auto">🔍 Detectar Automaticamente (IA)</option>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>


            {/* Provider (Google vs Groq) Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Provedor de IA</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderChange('gemini')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    provider === 'gemini'
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Google Gemini</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange('groq')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    provider === 'groq'
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-400'
                  }`}
                >
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Groq (Whisper)</span>
                </button>
              </div>
            </div>

            {/* Custom Gemini API Key input if Gemini is selected */}
            {provider === 'gemini' && (
              <div className="space-y-1.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 text-left">
                <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Chave API do Gemini (Opcional)</span>
                  <span className="text-[8px] text-indigo-455 text-indigo-400 capitalize font-medium">Local</span>
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/45 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-white outline-none placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[9px] text-gray-400 leading-normal">
                  Sua chave é salva apenas neste navegador. Se deixada em branco, usará o padrão do servidor. Obtenha em <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-350 font-medium">aistudio.google.com</a>.
                </p>
              </div>
            )}

            {/* Custom Groq API Key input if Groq is selected */}
            {provider === 'groq' && (
              <div className="space-y-1.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 text-left">
                <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  Chave API do Groq (Opcional)
                </label>
                <input
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => handleGroqApiKeyChange(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-black/45 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-white outline-none placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[9px] text-gray-400 leading-normal">
                  Chave salva localmente de forma segura. Obtenha uma chave grátis em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-350">console.groq.com</a>.
                </p>
              </div>
            )}

            {/* Optimization Mode */}
            <div className="space-y-2">
              <label id="mode-label" className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Modo de Transcrição</span>
              </label>
              <div className="space-y-2">
                {[
                  { value: 'accuracy', title: 'Accuracy Mode', desc: 'Máxima fidelidade de parágrafos e pontuação por IA.' },
                  { value: 'speed', title: 'Speed Mode', desc: 'Processamento ultra-rápido para transcrição rápida.' },
                  { value: 'default', title: 'Standard', desc: 'Equilíbrio padrão de renderização e processamento.' }
                ].map((mode) => (
                  <label 
                    key={mode.value}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      accuracyMode === mode.value 
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/5' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accuracyMode"
                      value={mode.value}
                      checked={accuracyMode === mode.value}
                      onChange={() => setAccuracyMode(mode.value as any)}
                      className="mt-1 h-3.5 w-3.5 text-indigo-400 focus:ring-indigo-500 accent-indigo-500"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-white">{mode.title}</span>
                      <span className="block text-[10px] text-gray-405 text-gray-400 mt-0.5 leading-tight">{mode.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Upload/Record Action Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[350px] relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none"></div>
            
            {/* Conditional Views */}
            {status === 'processing' ? (
              /* Loading and Processing state */
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center z-10">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin" />
                  <Loader2 className="w-6 h-6 text-indigo-455 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Processando áudio com IA</h3>
                  <p className="text-sm text-gray-405 text-gray-400 mt-1 max-w-sm mx-auto">{progressText}</p>
                </div>
                <div className="w-full max-w-xs bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full animate-pulse animate-infinite" style={{ width: '70%', animationDuration: '2s' }} />
                </div>
              </div>
            ) : (
              /* Core Recording & Upload Zone */
              <div className="flex-1 flex flex-col z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  
                  {/* File Upload Column */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-505 bg-indigo-500/10' 
                        : uploadedFile 
                          ? 'border-green-500/35 bg-green-500/10' 
                          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      className="hidden" 
                      accept="audio/*" 
                    />
                    
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-405 text-green-450 mx-auto">
                          <FileAudio className="w-6 h-6" />
                        </div>
                        <div className="max-w-[180px] mx-auto">
                          <p className="text-xs font-semibold text-white truncate">{uploadedFile.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                          className="text-[10px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto mt-2 bg-transparent cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mx-auto border border-white/5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Arraste um áudio aqui</p>
                          <p className="text-[10px] text-gray-400 mt-1">ou clique para procurar no seu computador</p>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 font-mono">MP3, WAV, M4A, WEBM</span>
                      </div>
                    )}
                  </div>

                  {/* Microphone Record Column */}
                  <div className={`border rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all ${
                    isRecording 
                      ? 'border-red-500 bg-red-500/10' 
                      : recordedBlob 
                        ? 'border-green-500/30 bg-green-500/10' 
                        : 'border-white/10 hover:border-white/15'
                  }`}>
                    {isRecording ? (
                      <div className="space-y-3 w-full">
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white mx-auto animate-pulse">
                          <Square className="w-5 h-5 cursor-pointer text-white" onClick={stopRecording} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-red-400">Gravando do microfone...</p>
                          <p className="text-xl font-mono font-bold text-white mt-1">{formatTime(recordingTime)}</p>
                        </div>
                        {/* Soundwave animation dots */}
                        <div className="flex justify-center gap-1 h-4 items-center">
                          {[1, 2, 3, 4, 3, 5, 2, 4, 1, 3, 2, 4].map((h, i) => (
                            <span 
                              key={i} 
                              className="w-0.75 bg-red-500 rounded-full animate-bounce" 
                              style={{ 
                                height: `${h * 20}%`, 
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '0.8s'
                              }} 
                            />
                          ))}
                        </div>
                        <button
                          onClick={stopRecording}
                          className="px-4 py-1.5 rounded-xl bg-red-650 bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-all mx-auto cursor-pointer border-none outline-none"
                        >
                          Concluir Gravação
                        </button>
                      </div>
                    ) : recordedBlob ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mx-auto">
                          <Mic className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Gravação Concluída!</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Duração: {formatTime(recordingTime)}</p>
                        </div>
                        <div className="pt-2">
                          <audio src={recordedUrl || undefined} controls className="w-full max-w-[200px] h-8 mx-auto" />
                        </div>
                        <button 
                          onClick={deleteRecording}
                          className="text-[10px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto mt-2 bg-transparent cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir Gravação</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={startRecording}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md cursor-pointer"
                        >
                          <Mic className="w-5 h-5 text-white" />
                        </button>
                        <div>
                          <p className="text-xs font-semibold text-white">Grave com seu Microfone</p>
                          <p className="text-[10px] text-gray-400 mt-1">Grave ditados, atas de reuniões ou insights falados na hora</p>
                        </div>
                        <button
                          onClick={startRecording}
                          className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 text-gray-200 transition-all cursor-pointer"
                        >
                          Começar Gravação
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Info summary block */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>Tempo estimado de resposta: ~20s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error messaging fallback */}
            {errorText && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-00 text-red-400">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-400" />
                <p>{errorText}</p>
              </div>
            )}

            {/* Submit Action Block */}
            {status !== 'processing' && (
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                <button
                  id="start-transcription-btn"
                  onClick={handleTranscribe}
                  disabled={isTranscribeDisabled}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isTranscribeDisabled 
                      ? 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Iniciar Transcrição Gratuita</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
