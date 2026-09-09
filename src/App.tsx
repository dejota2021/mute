import React, { useState, useEffect } from 'react';
import { RegistrationForm } from './components/RegistrationForm';
import { BlackEnvelope } from './components/BlackEnvelope';
import { InternalSheetsAdmin } from './components/InternalSheetsAdmin';
import { AudioPlayer } from './components/AudioPlayer';
import { GuestRegistration, ViewMode } from './types';
import { getCurrentGuest, setCurrentGuest } from './utils/googleSheets';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [currentGuest, setCurrentGuestState] = useState<GuestRegistration | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('registration');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Load existing guest from previous session if available, check hash for admin
  useEffect(() => {
    // Initial center position
    setMousePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const x = window.innerWidth / 2 + (e.gamma / 30) * (window.innerWidth / 3);
        const y = window.innerHeight / 2 + ((e.beta - 45) / 30) * (window.innerHeight / 3);
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    const existing = getCurrentGuest();
    if (existing) {
      setCurrentGuestState(existing);
    }

    if (window.location.hash === '#admin' || window.location.hash === '#interno') {
      setViewMode('admin');
    }

    const handleHashChange = () => {
      if (window.location.hash === '#admin' || window.location.hash === '#interno') {
        setViewMode('admin');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleRegistrationSuccess = (guest: GuestRegistration) => {
    setCurrentGuestState(guest);
    setViewMode('envelope');
  };

  const handleNewRegistration = () => {
    setCurrentGuest(null);
    setCurrentGuestState(null);
    setViewMode('registration');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col justify-between selection:bg-red-900 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Vinotinto Spotlight - Follows mouse across registration, envelope, and revealed invitation */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(109, 16, 16, 0.26), rgba(65, 8, 12, 0.10) 45%, transparent 75%)`,
        }}
      />

      {/* Ambient background lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-950/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-neutral-900/30 blur-[100px] rounded-full" />
      </div>

      {/* Top Header Bar - Restored solid bar with exact MUTE | D E J O T A branding */}
      <header
        id="app-top-header-bar"
        className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between bg-black/95 backdrop-blur-md border-b border-neutral-900/90 transition-all duration-300"
      >
        <div className="flex items-center">
          <button
            id="brand-header-mute-dejota"
            onClick={() => setViewMode(currentGuest ? 'envelope' : 'registration')}
            className="flex items-center group text-left cursor-pointer transition-opacity hover:opacity-90"
            title="MUTE DEJOTA"
          >
            {/* MUTE Gothic Blackletter */}
            <span className="font-fraktur text-2xl sm:text-3xl text-white group-hover:text-red-400 transition-colors leading-none font-bold select-none tracking-normal">
              MUTE
            </span>

            {/* Vertical Separator Bar from screenshot */}
            <span
              className="h-5 sm:h-6 w-[1px] bg-neutral-700/80 mx-3 sm:mx-4 select-none inline-block"
              aria-hidden="true"
            />

            {/* D E J O T A Typewriter Spaced */}
            <span className="font-typewriter text-xs sm:text-[13px] tracking-[0.32em] text-neutral-300 group-hover:text-white transition-colors uppercase font-semibold select-none">
              D E J O T A
            </span>
          </button>
        </div>

        {/* Right Header Navigation Actions & Audio Player */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AudioPlayer defaultTrackUrl="/mute-track.mp3" />

          {viewMode !== 'admin' ? (
            <button
              id="btn-open-google-sheets"
              onClick={() => setViewMode('admin')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
              title="Panel de Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>
          ) : (
            <button
              id="btn-exit-admin"
              onClick={() => setViewMode(currentGuest ? 'envelope' : 'registration')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
              <span>Volver a la Invitación</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
        {viewMode === 'admin' ? (
          <InternalSheetsAdmin
            onBackToApp={() => setViewMode(currentGuest ? 'envelope' : 'registration')}
          />
        ) : viewMode === 'registration' ? (
          <RegistrationForm
            onSuccess={handleRegistrationSuccess}
          />
        ) : (
          <BlackEnvelope
            guest={currentGuest}
            autoOpen={false}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className={`relative z-20 w-full py-4 px-6 text-center text-[11px] font-mono text-neutral-600 flex flex-col sm:flex-row items-center justify-between gap-2 transition-all duration-300 ${
        viewMode === 'registration'
          ? 'border-t-0 opacity-80'
          : 'border-t border-neutral-900/80'
      }`}>
        <p className="tracking-widest uppercase">
          MUTE • ALBUM RELEASE PARTY • OCTUBRE 2025
        </p>
        
        <p className="text-neutral-500 font-serif italic text-xs">
          &ldquo;Acompañado en el silencio&rdquo;
        </p>
      </footer>
    </div>
  );
}
