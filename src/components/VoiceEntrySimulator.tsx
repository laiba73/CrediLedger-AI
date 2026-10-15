import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, AlertCircle, Type, Check, Play, Pause, Trash2, Clock } from 'lucide-react';

interface VoiceEntrySimulatorProps {
  onTranscript: (text: string) => void;
}

type Status = 'idle' | 'listening' | 'done' | 'error' | 'unsupported';

const BAR_COUNT = 40;

export default function VoiceEntrySimulator({ onTranscript }: VoiceEntrySimulatorProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualText, setManualText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(BAR_COUNT).fill(0));

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopAudioAnalysis = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardownAudio = useCallback(() => {
    stopAudioAnalysis();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, [stopAudioAnalysis]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onstart = null;
      try {
        recognitionRef.current.abort();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
    teardownAudio();
  }, [teardownAudio]);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels: number[] = [];
        const step = Math.floor(dataArray.length / BAR_COUNT) || 1;
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(i * step, dataArray.length - 1);
          levels.push(dataArray[idx] / 255);
        }
        setAudioLevels(levels);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // Record actual audio
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      recorder.start();

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // already stopped
      }
    }
    stopAudioAnalysis();
    teardownAudio();
  }, [stopAudioAnalysis, teardownAudio]);

  const startRecording = useCallback(async () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    if (!isSupported) {
      setStatus('unsupported');
      setErrorMsg('Your browser does not support voice recognition. You can type the entry manually below.');
      setShowManualFallback(true);
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setStatus('unsupported');
      setShowManualFallback(true);
      return;
    }

    // Start real microphone access + audio analysis + recording
    const audioOk = await startAudioAnalysis();
    if (!audioOk) {
      setStatus('error');
      setErrorMsg('Microphone access was denied or is unavailable. Please allow microphone permission, or type the entry manually below.');
      setShowManualFallback(true);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = '';
    setAudioLevels(new Array(BAR_COUNT).fill(0));

    recognition.onstart = () => {
      setStatus('listening');
      setLiveTranscript('');
      setErrorMsg('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + final).trim();
      }
      const combined = (finalTranscriptRef.current + ' ' + interim).trim();
      setLiveTranscript(combined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMsg('Microphone access was denied. Please allow microphone permission in your browser settings, or type the entry manually below.');
      } else if (event.error === 'no-speech') {
        return; // keep listening — onend will handle finalization
      } else if (event.error === 'network') {
        setErrorMsg('A network error occurred during speech recognition. Please check your connection, or type the entry manually below.');
      } else {
        setErrorMsg(`Speech recognition error: ${event.error}. You can type the entry manually below.`);
      }
      stopRecording();
      setStatus('error');
      setShowManualFallback(true);
    };

    recognition.onend = () => {
      const finalText = finalTranscriptRef.current.trim();
      stopRecording();
      if (finalText) {
        setStatus('done');
        setLiveTranscript(finalText);
        onTranscriptRef.current(finalText);
      } else if (status !== 'error') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      cleanup();
      setStatus('error');
      setErrorMsg('Could not start voice recognition. Please try again or type manually below.');
      setShowManualFallback(true);
    }
  }, [isSupported, startAudioAnalysis, stopRecording, cleanup, status, audioUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    if (!audioElRef.current) {
      audioElRef.current = new Audio(audioUrl);
      audioElRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioElRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const discardRecording = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    setStatus('idle');
    setLiveTranscript('');
  }, [audioUrl]);

  const handleManualSubmit = useCallback(() => {
    const text = manualText.trim();
    if (text) {
      setStatus('done');
      setLiveTranscript(text);
      onTranscriptRef.current(text);
      setManualText('');
      setShowManualFallback(false);
      setTimeout(() => {
        setStatus('idle');
        setLiveTranscript('');
      }, 2000);
    }
  }, [manualText]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isActive = status === 'listening' || status === 'done';

  return (
    <div className="flex flex-col items-center w-full">
      <motion.button
        onClick={isActive && status === 'listening' ? stopRecording : startRecording}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`relative flex flex-col items-center gap-3 px-8 py-6 rounded-2xl font-semibold transition-all duration-300 ${
          status === 'listening'
            ? 'bg-red-500/20 border-2 border-red-500/50'
            : status === 'done'
            ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
            : 'bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/40 shadow-xl shadow-emerald-500/20'
        }`}
      >
        <div
          className={`relative flex items-center gap-3 ${
            status === 'listening' ? 'text-red-400' : status === 'done' ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {status === 'listening' && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -inset-4 rounded-full bg-red-500/20"
            />
          )}
          {status === 'done' ? (
            <Check className="w-7 h-7" />
          ) : status === 'listening' ? (
            <Square className="w-7 h-7 fill-current" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
          <span className="text-lg">
            {status === 'idle' && 'Tap to Record (Voice Entry)'}
            {status === 'listening' && 'Listening... Tap to Stop'}
            {status === 'done' && 'Voice Captured!'}
            {status === 'error' && 'Try Again'}
            {status === 'unsupported' && 'Voice Not Supported'}
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 w-full"
          >
            {/* Real-time audio waveform driven by actual mic input */}
            <div className="flex items-center justify-center gap-[3px] h-20 px-4">
              {audioLevels.map((level, i) => {
                const height = status === 'listening'
                  ? Math.max(4, level * 64)
                  : 4;
                return (
                  <div
                    key={i}
                    style={{ height: `${height}px` }}
                    className={`w-[4px] rounded-full transition-all duration-75 ${
                      status === 'listening'
                        ? level > 0.6
                          ? 'bg-red-400'
                          : level > 0.3
                          ? 'bg-emerald-400'
                          : 'bg-emerald-500/60'
                        : 'bg-emerald-500/30'
                    }`}
                  />
                );
              })}
            </div>

            {status === 'listening' && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <motion.span
                    key={elapsed}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-sm font-mono font-semibold text-red-400"
                  >
                    {formatTime(elapsed)}
                  </motion.span>
                  <span className="text-xs text-slate-500">recording</span>
                </div>
                <p className="text-sm text-slate-400 mb-2">Speak now — your voice is being transcribed live</p>
                {liveTranscript && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-emerald-300 font-medium italic px-4 py-3 rounded-lg bg-slate-800/50 max-w-lg mx-auto text-left"
                  >
                    <span className="text-xs text-slate-500 not-italic block mb-1">Live transcript:</span>
                    "{liveTranscript}"
                  </motion.div>
                )}
              </div>
            )}

            {status === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-sm text-emerald-400 font-medium mb-2">Voice captured successfully!</p>
                {liveTranscript && (
                  <p className="text-sm text-slate-300 italic px-4 py-3 rounded-lg bg-slate-800/50 max-w-lg mx-auto mb-3">
                    "{liveTranscript}"
                  </p>
                )}
                {audioUrl && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      onClick={togglePlayback}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Play Recording'}
                    </button>
                    <button
                      onClick={discardRecording}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Discard
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(status === 'error' || status === 'unsupported') && errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 w-full"
          >
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 max-w-lg mx-auto">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManualFallback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 w-full max-w-lg mx-auto"
          >
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">Type entry manually</label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
                placeholder="e.g. Fatima bought 3kg oil for $30"
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                className="px-4 py-2.5 rounded-lg font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowManualFallback((s) => !s)}
        className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
      >
        <Type className="w-3.5 h-3.5" />
        {showManualFallback ? 'Hide manual entry' : 'Or type manually instead'}
      </button>
    </div>
  );
}
