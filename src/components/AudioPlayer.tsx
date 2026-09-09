import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Upload } from 'lucide-react';

interface AudioPlayerProps {
  defaultTrackUrl?: string;
}

export function AudioPlayer({ defaultTrackUrl = '/mute-track.mp3' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [trackName, setTrackName] = useState('MUTE • DEJOTA');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize audio on mount and attempt autoplay
  useEffect(() => {
    // Check if custom audio was saved previously
    const savedCustomAudio = localStorage.getItem('mute_custom_audio_url');
    const sourceUrl = savedCustomAudio || defaultTrackUrl;

    const audio = new Audio();
    audio.src = sourceUrl;
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Attempt autoplay immediately
    const attemptPlay = () => {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setHasUserInteracted(true);
        })
        .catch(() => {
          // Autoplay was blocked by browser security policy.
          // Listen for first user gesture anywhere on the window.
          setIsPlaying(false);
          const handleFirstInteraction = () => {
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  setHasUserInteracted(true);
                })
                .catch(() => {});
            }
            window.removeEventListener('pointerdown', handleFirstInteraction);
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
          };

          window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
          window.addEventListener('click', handleFirstInteraction, { once: true });
          window.addEventListener('touchstart', handleFirstInteraction, { once: true });
          window.addEventListener('keydown', handleFirstInteraction, { once: true });
        });
    };

    attemptPlay();

    const handleEnded = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [defaultTrackUrl]);

  // Handle play / pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = fileUrl;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setHasUserInteracted(true);
          setTrackName(file.name.replace(/\.[^/.]+$/, '').toUpperCase());
        })
        .catch(() => {});
    }
  };

  return (
    <div
      id="ambient-audio-player"
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
            <span className="text-[8px] font-mono tracking-wider text-neutral-400 leading-none mt-0.5 hidden sm:inline">
              MUTE • DEJOTA
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

        {/* Change MP3 button */}
        <button
          id="btn-load-custom-mp3"
          onClick={() => fileInputRef.current?.click()}
          className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
          title="Cargar archivo MP3 propio"
          aria-label="Cargar MP3"
        >
          <Upload className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Prompt if browser blocked initial autoplay until first click */}
      {!hasUserInteracted && !isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute right-0 -bottom-9 whitespace-nowrap px-2.5 py-1 rounded bg-[#1a0505] border border-[#6c1010]/80 text-[10px] font-mono tracking-wide text-red-200 shadow-lg cursor-pointer animate-pulse z-50 flex items-center gap-1.5"
        >
          <Music className="w-2.5 h-2.5 text-red-400" />
          <span>Toca aquí o la pantalla para escuchar</span>
        </div>
      )}
    </div>
  );
}
