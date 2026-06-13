/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON body parsing limits to accommodate audio uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSCRIPTS_FILE = path.join(DATA_DIR, 'transcripts.json');

// Local in-memory fallback for read-only environments (like Cloudflare workers / serverless hosts)
let inMemoryTranscripts: any[] = [];

// Ensure database directory and file exist with safe fallback
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TRANSCRIPTS_FILE) || fs.statSync(TRANSCRIPTS_FILE).size === 0) {
    fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('Filesystem is read-only or not writable. Storing transcripts in in-memory state instead:', e);
}

// Read/Write database helpers
function formatSecondsToTimestamp(sec: number): string {
  if (typeof sec !== 'number' || isNaN(sec) || sec < 0) return '0:00';
  const roundedSec = Math.round(sec);
  const h = Math.floor(roundedSec / 3600);
  const m = Math.floor((roundedSec % 3600) / 60);
  const s = roundedSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sanitizeTranscript(t: any): any {
  if (!t || !Array.isArray(t.topics)) return t;
  let maxSeconds = 0;
  t.topics.forEach((topic: any) => {
    if (Array.isArray(topic.segments)) {
      topic.segments.forEach((seg: any) => {
        let sec = typeof seg.seconds === 'number' ? seg.seconds : parseInt(seg.seconds);
        if (isNaN(sec)) {
          if (seg.timestamp && typeof seg.timestamp === 'string') {
            const parts = seg.timestamp.split(':').map(Number);
            if (parts.length === 2) {
              sec = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else {
              sec = 0;
            }
          } else {
            sec = 0;
          }
        }
        seg.seconds = sec;
        seg.timestamp = formatSecondsToTimestamp(sec);
        if (sec > maxSeconds) {
          maxSeconds = sec;
        }
      });
    }
  });
  if (maxSeconds > 0) {
    t.durationSeconds = maxSeconds;
    const m = Math.floor(maxSeconds / 60);
    const s = Math.round(maxSeconds % 60);
    t.duration = m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  return t;
}

function getTranscripts(): any[] {
  try {
    if (!fs.existsSync(TRANSCRIPTS_FILE)) {
      return inMemoryTranscripts.map(sanitizeTranscript);
    }
    const data = fs.readFileSync(TRANSCRIPTS_FILE, 'utf-8');
    if (!data.trim()) {
      saveTranscripts([]);
      return inMemoryTranscripts.map(sanitizeTranscript);
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      inMemoryTranscripts = parsed.map(sanitizeTranscript);
    }
    return inMemoryTranscripts;
  } catch (err) {
    console.warn('Error reading transcripts file, falling back to in-memory store:', err);
    return inMemoryTranscripts.map(sanitizeTranscript);
  }
}

function saveTranscripts(transcripts: any[]) {
  const sanitized = Array.isArray(transcripts) ? transcripts.map(sanitizeTranscript) : transcripts;
  inMemoryTranscripts = sanitized;
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Error saving transcripts file (persisted in memories only):', err);
  }
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini Client:', err);
  }
} else {
  console.warn('GEMINI_API_KEY environment variable is missing.');
}

// Mock transcription helper in case AI fails or is not configured
function generateMockTranscript(fileName: string, language: string, options: any): any {
  const isPt = language.startsWith('pt');
  
  const topics = [
    {
      id: "topic-1",
      title: isPt ? "1. Introdução e Alinhamento de Metas" : "1. Introduction and Goal Alignment",
      description: isPt ? "Apresentação dos participantes e as primeiras expectativas sobre o novo sistema de transcrição." : "Introductions of participants and first expectations for the new transcription system.",
      segments: [
        {
          timestamp: "0:00",
          seconds: 0,
          speaker: isPt ? "Alice Santos" : "Alice Smith",
          text: isPt 
            ? "Olá a todos! Bem-vindos à nossa reunião de alinhamento para o FoziScribe. Hoje vamos discutir como a inteligência artificial vai otimizar nossa geração de legendas automáticas."
            : "Hello everyone! Welcome to our alignment meeting for FoziScribe. Today we are going to discuss how artificial intelligence will optimize our automatic subtitles generation."
        },
        {
          timestamp: "0:15",
          seconds: 15,
          speaker: isPt ? "Bruno Lima" : "Bruno Lima",
          text: isPt
            ? "Excelente, Alice. Uma das principais preocupações é a precisão durante as pausas, e como nós estruturamos isso em tópicos."
            : "Excellent, Alice. One of the main concerns is precision during pauses, and how we structure that into distinct topics."
        }
      ]
    },
    {
      id: "topic-2",
      title: isPt ? "2. Divisão por Pausas em Tempo Real" : "2. Real-time Pause Intersections",
      description: isPt ? "Análise técnica de como silêncios longos dividem as falas em parágrafos temáticos." : "Technical analysis of how long silences group speech segments into thematic paragraphs.",
      segments: [
        {
          timestamp: "1:10",
          seconds: 70,
          speaker: isPt ? "Alice Santos" : "Alice Smith",
          text: isPt
            ? "Perfeito. O algoritmo detecta silêncios maiores que dois segundos e analisa o contexto semântico. Assim, ele separa os tópicos de forma inteligente nas pausas."
            : "Perfect. The algorithm detects silences longer than two seconds and analyzes semantic context. This is how it smartly splits topics during audio pauses."
        },
        {
          timestamp: "1:42",
          seconds: 102,
          speaker: isPt ? "Bruno Lima" : "Bruno Lima",
          text: isPt
            ? "Além disso, a exportação editável facilita muito para o usuário corrigir pequenos jargões de área."
            : "Additionally, editable exports make it very easy for users to correct small domain-specific jargon."
        }
      ]
    },
    {
      id: "topic-3",
      title: isPt ? "3. Armazenamento Seguro e Conclusão" : "3. Secure Cloud Sync & Conclusion",
      description: isPt ? "Detalhamento da sincronização automática e encerramento da discussão de requisitos." : "Details about automatic synchronization and wrap-up of the system requirements.",
      segments: [
        {
          timestamp: "2:20",
          seconds: 140,
          speaker: isPt ? "Alice Santos" : "Alice Smith",
          text: isPt
            ? "Exato. Todo histórico é sincronizado em nuvem de forma privada, gerando links rápidos e arquivos SRT e VTT para download imediato."
            : "Exactly. All history is synced securely to the cloud, generating quick sharing links and interactive SRT and VTT formats for immediate download."
        },
        {
          timestamp: "2:48",
          seconds: 168,
          speaker: isPt ? "Bruno Lima" : "Bruno Lima",
          text: isPt
            ? "Sensacional! Acho que temos um roteiro fechado. Vou começar os testes práticos com arquivos pequenos."
            : "Sensational! I think we have a solid roadmap. I'll start testing with small audio clips."
        }
      ]
    }
  ];

  return {
    id: 't_' + Math.random().toString(36).substring(2, 11),
    title: fileName.replace(/\.[^/.]+$/, "") + (isPt ? " (Transcrito por IA)" : " (AI Transcribed)"),
    fileName,
    createdAt: new Date().toISOString(),
    duration: "2m 50s",
    durationSeconds: 170,
    language,
    accuracyMode: options.accuracyMode || 'default',
    status: 'completed',
    topics,
    summary: isPt 
      ? "Alinhamento focado nas principais características do FoziScribe, incluindo a separação inteligente de tópicos em pausas maiores que 2 segundos, legendas automatizadas integradas, exportação de arquivos editáveis e sincronização segura com a nuvem."
      : "Alignment focused on the core features of FoziScribe, including smart topic splits on pauses wider than 2 seconds, integrated automated subtitles, editable file exports, and secure cloud synchronization."
  };
}

// REST API Endpoints

// Get all transcripts
app.get('/api/transcripts', (req: Request, res: Response) => {
  try {
    const transcripts = getTranscripts();
    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

// Get a single transcript (support shared/public links as well)
app.get('/api/transcripts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transcripts = getTranscripts();
    const transcript = transcripts.find((t: any) => t.id === id);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// Create/Save transcript manually
app.post('/api/transcripts', (req: Request, res: Response) => {
  try {
    const newTranscript = req.body;
    if (!newTranscript.id) {
      newTranscript.id = 't_' + Math.random().toString(36).substring(2, 11);
    }
    if (!newTranscript.createdAt) {
      newTranscript.createdAt = new Date().toISOString();
    }
    const transcripts = getTranscripts();
    const existingIndex = transcripts.findIndex((t: any) => t.id === newTranscript.id);
    if (existingIndex !== -1) {
      transcripts[existingIndex] = { ...transcripts[existingIndex], ...newTranscript };
    } else {
      transcripts.unshift(newTranscript);
    }
    saveTranscripts(transcripts);
    res.status(201).json(newTranscript);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Update an existing transcript (enables editable text saving!)
app.put('/api/transcripts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const transcripts = getTranscripts();
    const index = transcripts.findIndex((t: any) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    transcripts[index] = { ...transcripts[index], ...updatedData };
    saveTranscripts(transcripts);
    res.json(transcripts[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transcript' });
  }
});

// Delete transcript
app.delete('/api/transcripts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transcripts = getTranscripts();
    const filtered = transcripts.filter((t: any) => t.id !== id);
    if (transcripts.length === filtered.length) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    saveTranscripts(filtered);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transcript' });
  }
});

// Core Groq Whisper + LLaMA Structuring Helper
async function runGroqTranscription(
  base64Bytes: string,
  fileName: string,
  language: string,
  apiKey: string,
  pauseThreshold: string
) {
  try {
    const audioBuffer = Buffer.from(base64Bytes, 'base64');
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const formData = new FormData();
    formData.append('file', blob, fileName || 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');

    const cleanLang = language ? language.split('-')[0] : 'pt';
    formData.append('language', cleanLang);

    console.log(`Sending to Groq Whisper Speech-To-Text... Language: ${cleanLang}`);
    
    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData as any,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}
      throw new Error(`Erro na API Groq Whisper (${whisperRes.status}): ${parsedErr?.error?.message || errText}`);
    }

    const whisperData: any = await whisperRes.json();
    const transcribedText = whisperData.text || '';
    const inputSegments = whisperData.segments || [];

    console.log(`Groq Whisper completed. Transcribed text length: ${transcribedText.length}, segments: ${inputSegments.length}`);

    // Standardize input segments to reduce template size for LLaMA context window
    const segmentsForPrompt = inputSegments.map((s: any) => ({
      start: Math.round(s.start || 0),
      end: Math.round(s.end || 0),
      text: (s.text || '').trim()
    }));

    if (segmentsForPrompt.length === 0 && transcribedText) {
      segmentsForPrompt.push({
        start: 0,
        end: 10,
        text: transcribedText
      });
    }

    console.log('Sending text to Groq LLaMA for automatic topic segmentation & speaker labels...');

    const prompt = `You are a professional audio segmentation assistant named FoziScribe.
Analyze the provided transcript segments with start/end timing and group them chronologically into structured Topics/Chapters.

Required Language of Output fields: ${language || 'pt-BR'}

Strict Requirements:
1. NO SEGMENT LOSS (GUARANTEED TRANSCRIPTION): You MUST preserve 100% of the input text or segments. Every spoken sentence and word must be fully represented.
2. MICRO-SEGMENT DIVISION (3 TO 5 SECONDS AVERAGE):
   - The user requested segments/narration blocks to average between 3 to 5 seconds of active speech.
   - If any input segment spans more than 5 seconds, or contains multiple sentences or long clauses, you MUST split/subdivide it into multiple smaller sequential segments in your JSON output.
   - Assign reasonable intermediate "seconds" values and "timestamp" formats (e.g. if an input segment starts at 10 and ends at 20, split it into two segments starting at 10 and 15 respectively).
   - Each resulting segment field "text" should contain only 3 to 5 seconds worth of narrative words (usually 4 to 10 words). NEVER output a segment containing long sentences or spanning more than 5 seconds as it defaults to low-resolution mappings.
3. PAUSE-BASED TOPIC SPLITTING: Since the user set a pause threshold of ${pauseThreshold} seconds, whenever a quiet gap of at least ${pauseThreshold} seconds occurs between consecutive segments (meaning: next.start - current.end >= ${pauseThreshold}), or when there is a change of active speaker, or a transition in subject, you MUST start a NEW Topic/Chapter.
4. Every Topic MUST include:
   - "id": a unique string (e.g. "topic-1", "topic-2")
   - "title": a short, catchy section title (in requested language)
   - "description": a concise explanation of what the participants talk about in that section (in requested language)
   - "segments": list of segment entries from the input inside this topic.
4. Each segment in the list MUST include:
   - "timestamp": text format "M:SS" or "H:MM:SS" calculated from its start seconds.
   - "seconds": the original integer start seconds.
   - "speaker": a human-like identifier guessed from the conversation context (e.g. "Alice Santos" or "Bruno Lima" based on names mentioned, or "Palestrante 1" / "Palestrante 2" if not clear). Keep names consistent across topics.
   - "text": the original text provided in the input segment. Do NOT summarize or clip the original text; preserve every single word exactly as given.
5. Provide a fitting "title" for the entire conversation file, and a concise "summary" of the whole meeting/recording.

Format the response ONLY as a valid, parsable JSON matching this schema:
{
  "title": "Main title of the recording",
  "summary": "Overall synthesis of what was discussed",
  "topics": [
    {
      "id": "topic-1",
      "title": "Topic title",
      "description": "Topic summary description",
      "segments": [
        {
          "timestamp": "0:00",
          "seconds": 0,
          "speaker": "Speaker Name",
          "text": "The spoken words..."
        }
      ]
    }
  ]
}

Input segments with timing:
${JSON.stringify(segmentsForPrompt, null, 2)}

Do NOT wrap the output in markdown code blocks like \`\`\`json. Output raw JSON ONLY.`;

    const candidateLlamas = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'llama-3.1-8b-instant'];
    let llamaResText = '';
    let lastLlamaError: any = null;

    for (const model of candidateLlamas) {
      try {
        console.log(`Attempting structuring with Groq model: ${model}`);
        const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
        });

        if (chatRes.ok) {
          const chatData: any = await chatRes.json();
          llamaResText = chatData.choices?.[0]?.message?.content || '';
          if (llamaResText.trim()) {
            break;
          }
        } else {
          console.warn(`Llama model ${model} failed with status ${chatRes.status}`);
        }
      } catch (err) {
        lastLlamaError = err;
        console.warn(`Llama model ${model} threw error:`, err);
      }
    }

    if (!llamaResText) {
      throw lastLlamaError || new Error('Não foi possível estruturar a transcrição com os modelos LLaMA do Groq.');
    }

    let cleanJson = llamaResText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(cleanJson);
    return result;
  } catch (err: any) {
    console.error('Error in runGroqTranscription:', err);
    throw err;
  }
}

// Core AI Transcription endpoint
app.post('/api/transcribe', async (req: Request, res: Response) => {
  const { 
    audioData, 
    fileName, 
    language, 
    accuracyMode, 
    size, 
    durationSeconds, 
    provider, 
    groqApiKey, 
    geminiApiKey,
    pauseThreshold 
  } = req.body;

  if (!audioData) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const cleanLang = language || 'pt-BR';
  const cleanMime = 'audio/mp3'; // Standard default mime context
  const selectedProvider = provider || 'gemini';
  const activeGroqKey = groqApiKey || process.env.GROQ_API_KEY || '';
  const rawThreshold = parseFloat(pauseThreshold);
  const cleanPauseThreshold = isNaN(rawThreshold) ? '1.5' : rawThreshold.toFixed(1);

  // Instantiate request-specific Gemini client if key is sent, or fallback to server-wide client
  let requestAi = ai;
  const activeGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
  if (activeGeminiKey) {
    try {
      requestAi = new GoogleGenAI({
        apiKey: activeGeminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Error instantiating localized Gemini Client:', err);
    }
  }

  // If the user selected Groq OR if Gemini is not configured but a Groq key is available:
  if (selectedProvider === 'groq' || (!requestAi && activeGroqKey)) {
    if (!activeGroqKey) {
      return res.status(400).json({ 
        error: 'Chave de API do Groq não configurada. Por favor, forneça sua chave Groq nas Configurações ou defina GROQ_API_KEY no servidor.' 
      });
    }

    try {
      const base64Bytes = audioData.split(',')[1] || audioData;
      const aiResult = await runGroqTranscription(base64Bytes, fileName, cleanLang, activeGroqKey, cleanPauseThreshold);

      const finalTranscript = {
        id: 't_' + Math.random().toString(36).substring(2, 11),
        title: aiResult.title || fileName.replace(/\.[^/.]+$/, "") + " (Transcrito)",
        fileName: fileName || 'audio.mp3',
        createdAt: new Date().toISOString(),
        duration: durationSeconds ? `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s` : '1m 20s',
        durationSeconds: durationSeconds || 80,
        language: cleanLang,
        accuracyMode: accuracyMode || 'default',
        status: 'completed',
        topics: aiResult.topics || [],
        summary: aiResult.summary || '',
        isSimulated: false,
      };

      const transcripts = getTranscripts();
      transcripts.unshift(finalTranscript);
      saveTranscripts(transcripts);

      return res.json(finalTranscript);
    } catch (error: any) {
      console.error('Groq pipeline error:', error);
      return res.status(500).json({ error: error.message || 'Erro inesperante durante a transcrição com a API Groq.' });
    }
  }

  // Otherwise, default to Gemini path
  if (!requestAi) {
    console.error('Core transcription failed: GEMINI_API_KEY or geminiApiKey is missing.');
    return res.status(400).json({ 
      error: 'A API Key do Gemini não está configurada. Por favor, configure sua chave de API do Gemini nas Configurações ou defina GEMINI_API_KEY no servidor.' 
    });
  }

  try {
    // Call Gemini API with the audio base64 bytes
    const base64Bytes = audioData.split(',')[1] || audioData;
    
    const formattedPrompt = `You are a professional audio transcription system named FoziScribe.
Analyze the provided audio file and transcribe it accurately with high verbal fidelity.

Requested Language: ${cleanLang}

Strict Requirements:
1. COMPLETE DIALOGUE TRANSCRIPTION (Ipsissimis Verbis / Verbatim): You MUST transcribe 100% of the spoken words from second 0 to the very last second. Do not stop transcribing early, do not omit any speaker dialogue or sentences, do not summarize, and do not truncate the segments. Every sentence and spoken thought must be fully rendered in the "text" fields.
2. HIGH-DENSITY MICRO-SEGMENTATION (3 TO 5 SECONDS AVERAGE):
   - The user requested that each segment (narration block) must be very short—on average 3 to 5 seconds of active speech.
   - You MUST divide the transcribed speech so that each segment represents strictly 3 to 5 seconds of spoken voice (approx. 4 to 10 words per segment, or split at every slight breath/pause).
   - NEVER output a segment that contains more than 5 seconds of spoken voice or long paragraphs under a single timestamp.
   - Additionally, whenever a pause or silence of at least ${cleanPauseThreshold} second(s) occurs, you MUST break the segment right there.
3. CHRONOLOGICAL CONTINUITY: Map the timeline completely from 0:00 to the end. Since narration is dense and continuous, there must be no timing gaps longer than 5 seconds between segments unless there is absolute flat silence in the audio recording. If a speaker is talking continuously, the end of one segment (calculated) should match the start of the next segment.
4. Topics & Chapters: Break down the dense stream of segments chronologically into logical Topics/Chapters. Every Topic MUST include a short title, a detailed concise description, and its list of segment entries.
5. Segment Fields: Each Segment entry MUST include:
   - "timestamp": String representing mathematically accurate timing from the start (e.g. divide the seconds by 60 for minutes, and remainder is seconds. Thus, 113 seconds MUST format to "1:53" and 218 seconds MUST format to "3:38". Double-check you do not write "2:10" for 218!).
   - "seconds": Number of seconds from the beginning (integer value).
   - "speaker": A human-like identifier (e.g., Speaker 1 / Speaker 2, or precise names if they introduce themselves).
   - "text": The literal spoken dialogue verbatim.
6. Provide a global summary capturing the main ideas.
7. Return the response STRICTLY as a valid JSON document conforming to this exact structural schema:

{
  "title": "A short, fitting title for the transcription file",
  "summary": "Brief structured summary of the transcribed conversation",
  "topics": [
    {
      "id": "topic-unique-1",
      "title": "Topic title",
      "description": "Short explanation of discussion points",
      "segments": [
        {
          "timestamp": "0:00",
          "seconds": 0,
          "speaker": "Speaker Name",
          "text": "Transcription content..."
        }
      ]
    }
  ]
}

DO NOT output any markdown blocks (like \`\`\`json), comments, or text intro/outro. Just output the clean JSON object.`;

    let response = null;
    let successfulModel = '';
    const candidateModels = ['gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Sending request to Gemini model: ${modelName}`);
        const result = await requestAi.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Bytes,
              },
            },
            {
              text: formattedPrompt,
            }
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (result && result.text) {
          response = result;
          successfulModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} attempt failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error('All candidate Gemini models returned empty or failed.');
    }

    const textOutput = response.text || '';
    console.log(`Gemini raw response fetched successfully via model: ${successfulModel}`);
    
    // Clean potential raw markdown wrapping
    let cleanJson = textOutput.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const aiResult = JSON.parse(cleanJson);

    // Build the finalized transcript object
    const finalTranscript = {
      id: 't_' + Math.random().toString(36).substring(2, 11),
      title: aiResult.title || fileName.replace(/\.[^/.]+$/, "") + " (Transcrito)",
      fileName: fileName || 'audio.mp3',
      createdAt: new Date().toISOString(),
      duration: durationSeconds ? `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s` : '1m 20s',
      durationSeconds: durationSeconds || 80,
      language: cleanLang,
      accuracyMode: accuracyMode || 'default',
      status: 'completed',
      topics: aiResult.topics || [],
      summary: aiResult.summary || '',
      isSimulated: false,
    };

    const transcripts = getTranscripts();
    transcripts.unshift(finalTranscript);
    saveTranscripts(transcripts);

    res.json(finalTranscript);
  } catch (error: any) {
    console.error('Gemini transcription error:', error);
    let errorMessage = 'Erro inesperado ao falar com o Gemini.';
    if (error && error.message) {
      errorMessage = error.message;
    } else if (error) {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = error.toString();
      }
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Setup Vite Dev server or Production assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Allow routing for any deep URL paths (e.g. for sharing links /share/:id)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FoziScribe server successfully running on http://localhost:${PORT}`);
  });
}

startServer();
