import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Upload } from 'lucide-react';
import { generateAtmosphericAudioUri } from '../utils/audioGenerator';

interface AudioPlayerProps {
  defaultTrackUrl?: string;
}

const DB_NAME = 'MuteDejotaAudioDB';
const STORE_NAME = 'audioStore';
const AUDIO_KEY = 'user_track';

// Helper to save audio blob into IndexedDB
function saveAudioToIndexedDB(blob: Blob, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ blob, name, updatedAt: Date.now() }, AUDIO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Helper to load audio blob from IndexedDB
function loadAudioFromIndexedDB(): Promise<{ blob: Blob; name: string } | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(AUDIO_KEY);
      getReq.onsuccess = () => {
        if (getReq.result && getReq.result.blob) {
          resolve({ blob: getReq.result.blob, name: getReq.result.name });
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

export function AudioPlayer({ defaultTrackUrl = '/mute-track.mp3' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume] = useState(0.85);
  const [trackName, setTrackName] = useState('MUTE · DEJOTA');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let currentAudio: HTMLAudioElement | null = null;
    let isDisposed = false;

    async function initAudio() {
      let finalUrl = defaultTrackUrl;
      let displayName = 'MUTE · DEJOTA';

      // 1. Check if user previously saved an audio file in IndexedDB
      try {
        const stored = await loadAudioFromIndexedDB();
        if (stored && stored.blob) {
          finalUrl = URL.createObjectURL(stored.blob);
          displayName = stored.name || 'MUTE · DEJOTA';
        } else {
          // 2. Check if /mute-track.mp3 is available on the server
          try {
            const headCheck = await fetch(defaultTrackUrl, { method: 'HEAD' });
            if (!headCheck.ok) {
              finalUrl = generateAtmosphericAudioUri();
            }
          } catch {
            finalUrl = generateAtmosphericAudioUri();
          }
        }
      } catch {
        finalUrl = generateAtmosphericAudioUri();
      }

      if (isDisposed) return;

      setTrackName(displayName);

      const audio = new Audio();
      audio.src = finalUrl;
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'auto';
      audioRef.current = audio;
      currentAudio = audio;

      // Autoplay attempt function
      const tryAutoPlay = () => {
        if (!audioRef.current) return;
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setHasUserInteracted(true);
          })
          .catch(() => {
            setIsPlaying(false);
            // Browser autoplay restrictions: trigger on next user touch or click
            const handleGesture = () => {
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setHasUserInteracted(true);
                  })
                  .catch(() => {});
              }
              window.removeEventListener('pointerdown', handleGesture);
              window.removeEventListener('click', handleGesture);
              window.removeEventListener('touchstart', handleGesture);
              window.removeEventListener('keydown', handleGesture);
            };

            window.addEventListener('pointerdown', handleGesture, { once: true });
            window.addEventListener('click', handleGesture, { once: true });
            window.addEventListener('touchstart', handleGesture, { once: true });
            window.addEventListener('keydown', handleGesture, { once: true });
          });
      };

      tryAutoPlay();
    }

    initAudio();

    return () => {
      isDisposed = true;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      audioRef.current = null;
    };
  }, [defaultTrackUrl, volume]);

  // Handle play / pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasUserInteracted(true);
        })
        .catch((err) => {
          console.warn('Playback prevented:', err);
        });
    }
  };

  // Handle mute / unmute toggle
  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Handle custom MP3 file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const cleanedName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();

    // Save to IndexedDB for persistent automatic playback across sessions
    try {
      await saveAudioToIndexedDB(file, cleanedName);
    } catch (err) {
      console.warn('Could not persist audio to IndexedDB:', err);
    }

    if (audioRef.current) {
      audioRef.current.src = fileUrl;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasUserInteracted(true);
          setTrackName(cleanedName);
        })
        .catch(() => {});
    }
  };

  return (
    <div id="ambient-audio-player" className="relative flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Atmospheric Audio Bar */}
      <div
        className={`flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          isPlaying
            ? 'bg-neutral-900/90 border-[#6c1010]/80 shadow-[0_0_15px_rgba(108,16,16,0.3)] text-neutral-200'
            : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
        }`}
      >
        {/* Play/Pause Button */}
        <button
          id="btn-toggle-audio-play"
          onClick={togglePlay}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-black/60 border border-neutral-800 hover:border-[#6c1010] text-neutral-200 hover:text-white transition-all cursor-pointer"
          title={isPlaying ? 'Pausar música de fondo' : 'Reproducir música de fondo'}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 text-red-400 fill-red-400" />
          ) : (
            <Play className="w-3 h-3 ml-0.5 text-neutral-300 fill-neutral-300" />
          )}
        </button>

        {/* Animated Equalizer Waveform Bars when playing */}
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 cursor-pointer select-none group"
          title={isPlaying ? 'Música activa - Clic para pausar' : 'Música en pausa - Clic para reproducir'}
        >
          <div className="flex items-end gap-[2px] h-3.5 w-4.5 px-0.5">
            <span
              className={`w-[2px] rounded-full bg-[#9e1b1b] transition-all duration-150 ${
                isPlaying ? 'animate-[bounce_0.8s_ease-in-out_infinite] h-3' : 'h-1 bg-neutral-600'
              }`}
              style={{ animationDelay: '0ms' }}
            />
            <span
              className={`w-[2px] rounded-full bg-red-400 transition-all duration-150 ${
                isPlaying ? 'animate-[bounce_0.6s_ease-in-out_infinite] h-3.5' : 'h-1.5 bg-neutral-600'
              }`}
              style={{ animationDelay: '150ms' }}
            />
            <span
              className={`w-[2px] rounded-full bg-[#9e1b1b] transition-all duration-150 ${
                isPlaying ? 'animate-[bounce_0.9s_ease-in-out_infinite] h-2.5' : 'h-1 bg-neutral-600'
              }`}
              style={{ animationDelay: '300ms' }}
            />
            <span
              className={`w-[2px] rounded-full bg-red-400 transition-all duration-150 ${
                isPlaying ? 'animate-[bounce_0.7s_ease-in-out_infinite] h-3.5' : 'h-2 bg-neutral-600'
              }`}
              style={{ animationDelay: '200ms' }}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-[11px] font-mono tracking-widest text-neutral-200 group-hover:text-red-300 transition-colors uppercase font-medium leading-none">
              {isPlaying ? 'SONANDO' : 'MÚSICA'}
            </span>
            <span className="text-[8px] font-mono tracking-wider text-neutral-400 leading-none mt-0.5 hidden sm:inline max-w-[120px] truncate">
              {trackName}
            </span>
          </div>
        </button>

        {/* Mute/Unmute toggle */}
        <button
          id="btn-toggle-audio-mute"
          onClick={toggleMute}
          className="w-5 h-5 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors ml-0.5 cursor-pointer"
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-neutral-300" />
          )}
        </button>

        {/* Upload custom MP3 button */}
        <button
          id="btn-load-custom-mp3"
          onClick={() => fileInputRef.current?.click()}
          className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
          title="Cargar tu canción (MP3)"
          aria-label="Cargar tu canción MP3"
        >
          <Upload className="w-3 h-3" />
        </button>
      </div>

      {/* Subtle indicator if browser autoplay requires initial touch */}
      {!hasUserInteracted && !isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute right-0 -bottom-9 whitespace-nowrap px-2.5 py-1 rounded bg-[#1a0505] border border-[#6c1010]/80 text-[10px] font-mono tracking-wide text-red-200 shadow-lg cursor-pointer animate-pulse z-50 flex items-center gap-1.5"
        >
          <Music className="w-2.5 h-2.5 text-red-400" />
          <span>Toca aquí para escuchar</span>
        </div>
      )}
    </div>
  );
}
