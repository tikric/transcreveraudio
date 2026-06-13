/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Segment {
  timestamp: string; // e.g. "0:05"
  seconds: number;   // e.g. 5
  text: string;      // The transcribed text
  speaker?: string;  // e.g. "Palestrante 1" or "Joe"
}

export interface Topic {
  id: string;
  title: string;       // e.g. "Abertura e Introdução"
  description: string; // Short summary of what is discussed
  segments: Segment[];
}

export interface Transcript {
  id: string;
  title: string;       // Dynamic or user-defined title
  fileName: string;    // Original file name
  createdAt: string;   // ISO string / Date
  duration: string;    // e.g. "4m 50s"
  durationSeconds: number;
  language: string;    // e.g. "pt-BR"
  accuracyMode: 'accuracy' | 'speed' | 'default';
  status: 'completed' | 'processing' | 'failed';
  topics: Topic[];
  summary?: string;    // Overall AI summary
  audioUrl?: string;   // Optional base64 or source audio playback URL
  ownerId?: string;
  isPublic?: boolean;
  isSimulated?: boolean;
  errorMessage?: string;
}

export type ViewType = 'transcribe' | 'history' | 'support' | 'settings';

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português (Brasil)' },
  { code: 'en-US', name: 'English', flag: '🇺🇸', nativeName: 'English (US)' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
];
