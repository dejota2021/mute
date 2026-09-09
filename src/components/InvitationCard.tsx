import React, { useState, useRef } from 'react';
import { GuestRegistration } from '../types';
import { use3DTilt } from '../hooks/use3DTilt';
import { Calendar, Share2, Check, ArrowDownToLine, RefreshCw, Printer } from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface InvitationCardProps {
  guest: GuestRegistration | null;
  onReset?: () => void;
  className?: string;
  isExpanded?: boolean;
  enableTilt?: boolean;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  guest,
  onReset,
  className = '',
  isExpanded = true,
  enableTilt = true,
}) => {
  const { elementRef, tilt } = use3DTilt({ maxTilt: 18, disabled: !enableTilt });
  const [copied, setCopied] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const cardSheetRef = useRef<HTMLDivElement>(null);

  const guestName = guest?.name ? guest.name.toUpperCase() : 'DEJOTA';
  const ticketCode = guest?.ticketCode || 'MUTE-2026';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MUTE DEJOTA - Invitación Exclusiva',
          text: `Invitación exclusiva para el lanzamiento del álbum MUTE de DEJOTA.`,
          url: window.location.href,
        });
      } catch (e) {
        // Dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveJpg = async () => {
    if (!cardSheetRef.current || isExportingJpg) return;
    setIsExportingJpg(true);
    try {
      // Generate clean high-resolution JPG image (2.5x pixel ratio for crisp print & mobile sharing)
      const dataUrl = await toJpeg(cardSheetRef.current, {
        quality: 0.96,
        pixelRatio: 2.5,
        backgroundColor: '#f8f5ee',
        style: {
          transform: 'none',
          boxShadow: 'none',
        },
        filter: (node) => {
          // Omit glare overlay during JPG export so the parchment is clean and readable
          if (node instanceof HTMLElement && node.classList.contains('mix-blend-overlay')) {
            return false;
          }
          return true;
        },
      });

      const sanitizedName = (guestName || 'dejota')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-');

      const filename = `invitacion-mute-${sanitizedName || 'dejota'}.jpg`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Error saving JPG, falling back to print dialog:', err);
      window.print();
    } finally {
      setIsExportingJpg(false);
    }
  };

  const createGoogleCalendarLink = () => {
    const title = encodeURIComponent('MUTE DEJOTA - Release Album Party');
    const details = encodeURIComponent(
      `Lanzamiento oficial del álbum MUTE de DEJOTA.\n\n"No busco ser escuchado, busco que alguien se sienta acompañado en el silencio."\n\nInvitado: ${guestName}\nLugar: SECRET LOCATION`
    );
    const location = encodeURIComponent('Secret Location, Colombia');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261024T230000Z/20261025T050000Z&details=${details}&location=${location}`;
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-md mx-auto ${className}`}>
      {/* 3D Interactive Stage Perspective Container */}
      <div
        className="w-full flex justify-center perspective-1000 py-2 cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: '1200px' }}
      >
        <div
          ref={elementRef}
          id="interactive-3d-invitation-card"
          className="relative w-full max-w-[340px] sm:max-w-[380px] preserve-3d"
          style={{
            transform: enableTilt
              ? `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translate3d(${tilt.translateX}px, ${tilt.translateY}px, ${tilt.isInteracting || tilt.isGyroActive ? tilt.translateZ : 0}px)`
              : 'none',
            transition: (tilt.isInteracting || tilt.isGyroActive)
              ? 'none'
              : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Dynamic 3D Floating Shadow */}
          <div
            className="absolute -inset-3 bg-black/60 rounded-sm blur-2xl pointer-events-none"
            style={{
              transform: `translate3d(${-tilt.rotateY * 2.2 - tilt.translateX}px, ${26 + tilt.rotateX * 1.5 - tilt.translateY}px, -40px) scale(${tilt.isInteracting || tilt.isGyroActive ? 1.05 : 0.95})`,
              opacity: tilt.isInteracting || tilt.isGyroActive ? 0.85 : 0.45,
              transition: (tilt.isInteracting || tilt.isGyroActive) ? 'none' : 'transform 0.4s ease-out, opacity 0.3s',
            }}
          />

          {/* Physical Parchment Invitation Card */}
          <div
            ref={cardSheetRef}
            id="physical-parchment-sheet"
            className="w-full relative rounded-sm border border-[#d6cebf] bg-[#f8f5ee] text-neutral-900 overflow-hidden shadow-2xl preserve-3d"
            style={{
              boxShadow: '0 20px 45px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3)',
              aspectRatio: '1 / 1.55',
            }}
          >
            {/* Subtle vintage parchment texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
              style={{
                backgroundImage: `radial-gradient(#d3cabb 1px, transparent 1px), radial-gradient(#c7bea9 1px, #f8f5ee 1px)`,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            />

            {/* Paper Grain Vignette Border */}
            <div className="absolute inset-0 border border-neutral-950/10 pointer-events-none m-2 sm:m-3" />

            {/* Dynamic Specular Lighting Sheen responding to Mouse, Touch & Gyroscope */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-150"
              style={{
                background: `radial-gradient(circle 380px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 40%, transparent 75%)`,
                opacity: tilt.isInteracting || tilt.isGyroActive ? 0.85 : 0.3,
              }}
            />

            {/* Card Content Container with 3D Parallax layers */}
            <div className="relative z-10 h-full flex flex-col justify-between items-center text-center p-6 sm:p-9 preserve-3d">
              {/* Top Section */}
              <div
                className="w-full flex flex-col items-center pt-2 preserve-3d"
                style={{ transform: 'translateZ(22px)' }}
              >
                {/* Header: MUTE in Gothic Blackletter font */}
                <h1
                  id="card-mute-header"
                  className="font-fraktur text-5xl sm:text-6xl text-[#6d1010] tracking-tight leading-none select-none font-bold"
                  style={{
                    color: '#6d1010',
                    textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.4)',
                    letterSpacing: '-0.02em',
                    transform: 'translateZ(26px)',
                  }}
                >
                  MUTE
                </h1>

                {/* Subheader: You're invited */}
                <h2
                  id="card-invited-subtitle"
                  className="font-fraktur text-2xl sm:text-3xl text-neutral-900 mt-2 sm:mt-3 font-normal"
                  style={{ transform: 'translateZ(18px)' }}
                >
                  You&apos;re invited
                </h2>

                {/* Recipient: TO: [GUEST NAME] */}
                <div
                  className="mt-4 sm:mt-5 text-[#6c1010] font-serif font-bold tracking-[0.26em] uppercase select-none"
                  style={{ fontSize: '17px', transform: 'translateZ(20px)' }}
                >
                  TO: <span className="underline underline-offset-4 decoration-[#6c1010]/50">{guestName}</span>
                </div>

                {/* Delicate hairline divider */}
                <div className="w-14 sm:w-20 h-[1px] bg-neutral-400/80 my-4 sm:my-5" />

                {/* Event Metadata */}
                <div
                  className="space-y-1.5 sm:space-y-2 font-typewriter text-neutral-800 text-[11px] sm:text-xs tracking-[0.2em] font-semibold select-none"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  <p>DATE: OCTUBRE 2026</p>
                  <p>PLACE: SECRET LOCATION</p>
                  <p className="tracking-[0.16em] text-[10px]" style={{ fontSize: '10px' }}>RELEASE ALBUM PARTY MUTE DEJOTA</p>
                </div>
              </div>

              {/* Middle Section: Poetic Manifesto Quote */}
              <div
                className="my-auto py-3 max-w-[280px] sm:max-w-xs px-2 preserve-3d"
                style={{ transform: 'translateZ(18px)' }}
              >
                <blockquote
                  id="card-manifesto-quote"
                  className="font-quote italic text-neutral-800 text-sm sm:text-base leading-relaxed tracking-wide"
                >
                  &ldquo;No busco ser escuchado,<br />
                  busco que alguien se sienta<br />
                  acompañado en el silencio.&rdquo;
                </blockquote>
              </div>

              {/* Bottom Section */}
              <div
                className="w-full flex flex-col items-center pb-1 preserve-3d"
                style={{ transform: 'translateZ(22px)' }}
              >
                {/* The Emblem: Double circle with Gothic 'M' */}
                <div
                  id="card-gothic-emblem"
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[2px] border-neutral-900 p-1 mb-3 shadow-inner"
                  style={{ transform: 'translateZ(24px)' }}
                >
                  <div className="w-full h-full rounded-full border border-neutral-900 flex items-center justify-center">
                    <span className="font-fraktur text-2xl sm:text-3xl text-neutral-950 font-bold leading-none select-none pb-0.5">
                      M
                    </span>
                  </div>
                </div>

                {/* Footer Notice */}
                <p
                  id="card-footer-notice"
                  className="font-typewriter text-[8px] tracking-[0.24em] text-neutral-700 font-semibold uppercase select-none"
                  style={{ fontSize: '8px' }}
                >
                  INVITACIÓN NO TRANSFERIBLE · SUJETA A LISTA
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Download JPG, Print, Calendar, Share, Replay) */}
      {isExpanded && (
        <div className="w-full mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {/* Save Invitation Sheet as JPG */}
          <button
            id="btn-save-invitation-jpg"
            onClick={handleSaveJpg}
            disabled={isExportingJpg}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#6c1010] hover:bg-[#851414] text-white text-xs font-mono tracking-wider border border-red-900/80 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-60"
            title="Guardar la hoja de invitación en formato JPG"
          >
            {isExportingJpg ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 text-white" />
            )}
            <span>{isExportingJpg ? 'Guardando JPG...' : 'Guardar en JPG'}</span>
          </button>

          <a
            id="btn-add-calendar"
            href={createGoogleCalendarLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-red-500" />
            <span>Calendario</span>
          </a>

          <button
            id="btn-print-invitation"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-4 h-4 text-neutral-400" />
            <span>Imprimir</span>
          </button>

          <button
            id="btn-share-invitation"
            onClick={handleShare}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-neutral-400" />}
            <span>{copied ? 'Copiado' : 'Compartir'}</span>
          </button>

          {onReset && (
            <button
              id="btn-replay-envelope"
              onClick={onReset}
              title="Guardar nuevamente en el sobre"
              className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 text-xs font-mono border border-neutral-800 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ver sobre</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
