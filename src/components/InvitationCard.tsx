import React, { useRef, useState } from 'react';
import { GuestRegistration } from '../types';
import { use3DTilt } from '../hooks/use3DTilt';
import { Calendar, Share2, Check, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

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
  const { elementRef, tilt } = use3DTilt({ maxTilt: 16, disabled: !enableTilt });
  const [copied, setCopied] = useState(false);

  const guestName = guest?.name ? guest.name.toUpperCase() : 'DEJOTA';
  const ticketCode = guest?.ticketCode || 'MUTE-2025';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MUTE DEJOTA - Invitación Exclusiva',
          text: `Invitación exclusiva para el lanzamiento del álbum MUTE de DEJOTA. Pase: ${ticketCode}`,
          url: window.location.href,
        });
      } catch (e) {
        // Ignored or dismissed
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

  const createGoogleCalendarLink = () => {
    const title = encodeURIComponent('MUTE DEJOTA - Release Album Party');
    const details = encodeURIComponent(
      `Lanzamiento oficial del álbum MUTE de DEJOTA.\n\n"No busco ser escuchado, busco que alguien se sienta acompañado en el silencio."\n\nInvitado: ${guestName}\nCódigo de Pase: ${ticketCode}\nLugar: SECRET LOCATION`
    );
    const location = encodeURIComponent('Secret Location, Colombia');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20251024T230000Z/20251025T050000Z&details=${details}&location=${location}`;
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
              ? `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translate3d(${tilt.translateX}px, ${tilt.translateY}px, ${tilt.isInteracting ? tilt.translateZ : 0}px)`
              : 'none',
            transition: tilt.isInteracting
              ? 'transform 0.08s ease-out'
              : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Dynamic 3D Floating Shadow */}
          <div
            className="absolute -inset-3 bg-black/60 rounded-sm blur-2xl pointer-events-none"
            style={{
              transform: `translate3d(${-tilt.rotateY * 2.2 - tilt.translateX}px, ${26 + tilt.rotateX * 1.5 - tilt.translateY}px, -40px) scale(${tilt.isInteracting ? 1.05 : 0.95})`,
              opacity: tilt.isInteracting ? 0.85 : 0.45,
              transition: tilt.isInteracting ? 'transform 0.08s ease-out, opacity 0.15s' : 'transform 0.55s ease-out, opacity 0.3s',
            }}
          />

          {/* Physical Parchment Invitation Card (Direct match to carta.png) */}
          <div
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

            {/* Dynamic Specular Lighting Sheen responding to Mouse & Gyroscope */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-150"
              style={{
                background: `radial-gradient(circle 380px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 40%, transparent 75%)`,
                opacity: tilt.isInteracting ? 0.85 : 0.3,
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

                {/* Recipient: PARA: [GUEST NAME] */}
                <div
                  className="mt-4 sm:mt-5 text-[#6c1010] font-serif font-bold tracking-[0.26em] uppercase select-none"
                  style={{ fontSize: '17px', transform: 'translateZ(20px)' }}
                >
                  PARA: <span className="underline underline-offset-4 decoration-[#6c1010]/50">{guestName}</span>
                </div>

                {/* Delicate hairline divider */}
                <div className="w-14 sm:w-20 h-[1px] bg-neutral-400/80 my-4 sm:my-5" />

                {/* Event Metadata (Monospaced / Typewriter) */}
                <div
                  className="space-y-1.5 sm:space-y-2 font-typewriter text-neutral-800 text-[11px] sm:text-xs tracking-[0.2em] font-semibold select-none"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  <p>DATE: OCTUBRE 2025</p>
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
                {/* The Emblem: Double circle with Gothic 'M' (Exact match to carta.png) */}
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
                  className="font-typewriter text-[9px] sm:text-[10px] tracking-[0.24em] text-neutral-700 font-semibold uppercase select-none"
                >
                  INVITACIÓN NO TRANSFERIBLE • SUJETA A LISTA
                </p>

                {/* Ticket Code Reference */}
                <p className="font-typewriter text-[8px] text-neutral-500 tracking-widest mt-1">
                  PASE #{ticketCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Download, Calendar, Share, Replay) */}
      {isExpanded && (
        <div className="w-full mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            id="btn-add-calendar"
            href={createGoogleCalendarLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-red-500" />
            <span>Añadir a Calendario</span>
          </a>

          <button
            id="btn-print-invitation"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4 text-neutral-400" />
            <span>Guardar / Imprimir</span>
          </button>

          <button
            id="btn-share-invitation"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-neutral-400" />}
            <span>{copied ? '¡Enlace Copiado!' : 'Compartir'}</span>
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
