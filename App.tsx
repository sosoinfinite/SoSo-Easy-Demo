
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, CallSummary, FloatAnimation } from './types';
import { Waveform, FloatingParticle } from './components/Animations';
import SummaryModal from './components/SummaryModal';

/**
 * SO SO EASY - DISPATCHER MVP
 * Developer Note: This frontend is designed to be backed by:
 * 1. ElevenLabs Conversational AI (Voice Interface)
 * 2. Twilio SMS API (Summary Dispatch)
 * 
 * The current implementation uses Gemini Live API for the real-time voice demo.
 */

// Audio Processing Utilities
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<CallSummary>({ name: '', vehicle: '', location: '' });
  const [particles, setParticles] = useState<FloatAnimation[]>([]);
  
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  // Particle Burst Engine
  const triggerBurst = (type: 'money' | 'zzz', count: number = 10) => {
    const newParticles: FloatAnimation[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `p-${Date.now()}-${Math.random()}-${i}`,
        x: Math.floor(Math.random() * 80) + 10,
        type
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const removeParticle = (id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  };

  const startSession = async () => {
    if (isConnecting || isActive) return;
    setIsConnecting(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            // INTENSE ENTRY BURST
            triggerBurst('money', 20);
            triggerBurst('zzz', 20);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => {
                try { s.sendRealtimeInput({ media: pcmBlob }); } catch (err) {}
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Process AI Audio
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              const nextTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextTime);
              nextStartTimeRef.current = nextTime + buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Process Transcriptions
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                triggerBurst('money', 3);
                return [...prev, { id: Date.now().toString(), role: 'assistant', text, timestamp: Date.now() }];
              });
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                triggerBurst('zzz', 2);
                return [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }];
              });
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: "You are the SoSo Easy AI Dispatcher, powered by ElevenLabs. Your mission is to collect Name, Vehicle details, and Pickup Location for towing services. Be professional, comforting, and fast. You work for the Sleep Money Machine.",
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      try { inputAudioCtxRef.current.close(); } catch(e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      try { outputAudioCtxRef.current.close(); } catch(e) {}
      outputAudioCtxRef.current = null;
    }

    if (messages.length > 0) {
      // Mock parsing for the summary - in production, this would use a structured LLM output
      setIsSummaryOpen(true);
    }
  };

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-200 overflow-hidden relative">
      {/* 3D NEON HEADER */}
      <header className="pt-12 pb-4 px-6 text-center select-none z-10 animate-neon-intense">
        <div className="machine-text flex flex-col items-center">
          <h2 className="text-3xl font-black text-slate-500 mb-[-10px] tracking-[0.3em] italic opacity-50">THE</h2>
          <h1 className="text-7xl font-black flex flex-col items-center gap-1">
            <span className="text-3d-glow">SO SO</span>
            <span className="text-3d-glow scale-125 my-4">EASY</span>
            <span className="text-3d-glow">DISPATCHER</span>
          </h1>
        </div>
      </header>

      {/* PARTICLE BURST LAYER */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        <AnimatePresence>
          {particles.map(p => (
            <FloatingParticle key={p.id} id={p.id} x={p.x} type={p.type} onComplete={() => removeParticle(p.id)} />
          ))}
        </AnimatePresence>
      </div>

      <main className="flex-1 flex flex-col items-center justify-start p-6 z-30 gap-10">
        
        {/* ELITE DARK POWER BUTTON */}
        <div className="w-full max-w-xs relative flex justify-center">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`w-48 h-48 rounded-full flex flex-col items-center justify-center relative transition-all duration-300 outline-none border-8 ${
              isActive 
                ? 'bg-slate-900 border-sky-400 animate-neon-intense' 
                : 'bg-slate-900 border-slate-700'
            } ${isConnecting ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
            style={{ 
              boxShadow: isActive 
                ? '0 0 80px rgba(56, 189, 248, 0.9), inset 0 8px 30px rgba(0,0,0,0.9)' 
                : 'inset 0 8px 30px rgba(0,0,0,0.9), 0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            {isConnecting ? (
              <div className="w-16 h-16 border-8 border-sky-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className={`text-[12px] font-black uppercase tracking-[0.3em] mb-2 ${isActive ? 'text-sky-300' : 'text-slate-600'}`}>
                  {isActive ? 'UNIT ACTIVE' : 'POWER'}
                </span>
                <span className={`text-6xl font-black uppercase tracking-tighter ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {isActive ? 'ON' : 'OFF'}
                </span>
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -bottom-8 bg-sky-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl border-2 border-sky-300 z-50 animate-bounce"
                  >
                    ELITE OPS ENGAGED
                  </motion.div>
                )}
              </>
            )}
          </motion.button>
        </div>

        <Waveform active={isActive} />

        {/* HIGH-CONTRAST FEED */}
        <div className="w-full max-w-md flex-1 flex flex-col mb-4">
          <div className="flex items-center justify-between mb-4 px-6">
            <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest">LIVE COMM FEED</span>
            {isActive && (
              <div className="flex items-center gap-2 bg-red-600 px-4 py-1 rounded-full shadow-lg border-2 border-red-400">
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span className="text-[11px] font-black text-white uppercase italic">ELITE OPS MONITORING</span>
              </div>
            )}
          </div>
          
          <div 
            ref={transcriptRef}
            className="flex-1 glass-card-heavy rounded-[3.5rem] p-10 overflow-y-auto no-scrollbar space-y-10 max-h-[38vh]"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6 opacity-60">
                <div className="p-6 bg-slate-200 rounded-full shadow-inner border-4 border-slate-300">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                </div>
                <p className="text-[15px] font-black uppercase tracking-[0.3em] text-center max-w-[200px]">System Standing By for Client Link</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}
                >
                  <div 
                    className={`max-w-[90%] px-8 py-6 rounded-[2.5rem] text-[18px] font-black leading-tight shadow-2xl ${
                      msg.role === 'assistant' 
                        ? 'bg-slate-900 text-sky-400 rounded-bl-none border-l-8 border-sky-400 bubble-shadow-ai' 
                        : 'bg-sky-600 text-white rounded-br-none bubble-shadow-user border-r-8 border-sky-300'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[12px] font-black mt-4 uppercase tracking-[0.2em] italic ${msg.role === 'assistant' ? 'text-slate-600' : 'text-sky-800'}`}>
                    {msg.role === 'assistant' ? '>>> AI DISPATCH (11L)' : '<<< CLIENT INBOUND'}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      <SummaryModal 
        isOpen={isSummaryOpen} 
        summary={summary} 
        onClose={() => setIsSummaryOpen(false)} 
      />

      <footer className="h-12 flex items-center justify-center bg-slate-300/30">
        <div className="w-32 h-2.5 bg-slate-400 rounded-full opacity-40" />
      </footer>
    </div>
  );
};

export default App;
