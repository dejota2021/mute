import React, { useState, useRef } from 'react';
import { GuestRegistration } from '../types';
import { use3DTilt } from '../hooks/use3DTilt';
import { Calendar, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { GOOGLE_FONTS_EMBED_CSS } from '../utils/fontEmbed';

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
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [calendarToast, setCalendarToast] = useState<string | null>(null);
  const cardSheetRef = useRef<HTMLDivElement>(null);
  const exportSheetRef = useRef<HTMLDivElement>(null);

  const guestName = guest?.name ? guest.name.toUpperCase() : 'DEJOTA';

  const generateIcsContent = (name: string) => {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DEJOTA//MUTE ALBUM RELEASE//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:mute-dejota-20261001T180000@dejotamusic.com',
      'DTSTAMP:20260909T000000Z',
      'DTSTART:20261001T230000Z',
      'DTEND:20261002T050000Z',
      'SUMMARY:MUTE DEJOTA - Release Album Party',
      `DESCRIPTION:Lanzamiento oficial del álbum "MUTE" de DEJOTA.\\n\\n- Release album party “MUTE” DEJOTA -\\n“Una colección de sonidos nacidos en el silencio”\\n\\nInvitado: ${name}\\nDate: 1ro de octubre\\nHour: 6:00pm\\nLocation: Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia\\nDress code: Oscuro`,
      'LOCATION:Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio: Lanzamiento "MUTE" DEJOTA hoy 6:00 PM',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  };

  const openIcsFile = (name: string) => {
    const icsContent = generateIcsContent(name);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const sanitizedName = (name || 'dejota')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invitacion-mute-${sanitizedName || 'dejota'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2500);
  };

  const handleAddToCalendar = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid || /Mobi|Android/i.test(ua) || (window.innerWidth <= 768);

    const title = encodeURIComponent('MUTE DEJOTA - Release Album Party');
    const details = encodeURIComponent(
      `Lanzamiento oficial del álbum "MUTE" de DEJOTA.\n\n- Release album party “MUTE” DEJOTA -\n“Una colección de sonidos nacidos en el silencio”\n\nInvitado: ${guestName}\nDate: 1ro de octubre\nHour: 6:00pm\nLocation: Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia\nDress code: Oscuro`
    );
    const location = encodeURIComponent('Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia');

    if (isAndroid) {
      // 1. Android: Trigger system Calendar Intent to launch native installed Calendar app outside the browser
      // 1 Oct 2026 6:00 PM Colombia (UTC-5) -> 23:00 UTC = 1790895600000 ms
      const startTime = 1790895600000;
      const endTime = 1790917200000;
      const androidIntent = `intent://#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;title=${title};description=${details};eventLocation=${location};beginTime=${startTime};endTime=${endTime};end`;

      setCalendarToast('Abriendo app de calendario en tu celular...');
      setTimeout(() => setCalendarToast(null), 3500);

      try {
        window.location.href = androidIntent;
        // Fallback to .ics download if browser or in-app webview intercepts intent
        setTimeout(() => {
          openIcsFile(guestName);
        }, 1500);
      } catch {
        openIcsFile(guestName);
      }
      return;
    }

    if (isIOS) {
      // 2. iOS: Trigger native Apple Calendar event modal outside the browser via .ICS
      setCalendarToast('Abriendo app de calendario en tu iPhone...');
      setTimeout(() => setCalendarToast(null), 3500);
      openIcsFile(guestName);
      return;
    }

    if (isMobile) {
      setCalendarToast('Abriendo app de calendario...');
      setTimeout(() => setCalendarToast(null), 3500);
      openIcsFile(guestName);
      return;
    }

    // 3. Desktop: Open Google Calendar in new browser tab
    window.open(createGoogleCalendarLink(), '_blank', 'noopener,noreferrer');
  };

  const handleSaveJpg = async () => {
    if (!exportSheetRef.current || isExportingJpg) return;
    setIsExportingJpg(true);
    try {
      // Ensure all web fonts are completely loaded before rasterizing
      if (document.fonts) {
        await document.fonts.ready;
      }
      // Small pause for layout stabilization
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Generate ultra-crisp high-resolution vertical JPG (720x1150 @ 2x = 1440x2300)
      const dataUrl = await toJpeg(exportSheetRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        width: 720,
        height: 1150,
        backgroundColor: '#f8f5ee',
        cacheBust: true,
        fontEmbedCSS: GOOGLE_FONTS_EMBED_CSS,
        style: {
          transform: 'none',
          margin: '0',
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
      console.warn('Error saving JPG:', err);
    } finally {
      setIsExportingJpg(false);
    }
  };

  const createGoogleCalendarLink = () => {
    const title = encodeURIComponent('MUTE DEJOTA - Release Album Party');
    const details = encodeURIComponent(
      `Lanzamiento oficial del álbum "MUTE" de DEJOTA.\n\n- Release album party “MUTE” DEJOTA -\n“Una colección de sonidos nacidos en el silencio”\n\nInvitado: ${guestName}\nDate: 1ro de octubre\nHour: 6:00pm\nLocation: Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia\nDress code: Oscuro`
    );
    const location = encodeURIComponent('Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia');
    // 1 Oct 2026 6:00 PM Colombia (UTC-5) is 23:00 UTC to 05:00 UTC next day
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261001T230000Z/20261002T050000Z&ctz=America/Bogota&details=${details}&location=${location}`;
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
              aspectRatio: '1 / 1.62',
              minHeight: '570px',
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
            <div className="relative z-10 h-full flex flex-col justify-between items-center text-center p-5 sm:p-7 preserve-3d">
              {/* Top Section */}
              <div
                className="w-full flex flex-col items-center pt-1 preserve-3d"
                style={{ transform: 'translateZ(20px)' }}
              >
                {/* Header: MUTE in Gothic Blackletter font */}
                <h1
                  id="card-mute-header"
                  className="font-fraktur text-5xl sm:text-6xl text-[#6d1010] tracking-tight leading-none select-none font-bold"
                  style={{
                    color: '#6d1010',
                    textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.4)',
                    letterSpacing: '-0.02em',
                    transform: 'translateZ(24px)',
                  }}
                >
                  MUTE
                </h1>

                {/* Subheader: You're invited */}
                <h2
                  id="card-invited-subtitle"
                  className="font-fraktur text-2xl sm:text-3xl text-neutral-900 mt-1.5 sm:mt-2 font-normal leading-tight whitespace-nowrap"
                  style={{ transform: 'translateZ(18px)' }}
                >
                  You&apos;re invited
                </h2>

                {/* Recipient: TO: [GUEST NAME] */}
                <div
                  className="mt-3 sm:mt-3.5 text-[#6c1010] font-cinzel font-bold tracking-[0.24em] uppercase select-none text-[15px] sm:text-[16px] whitespace-nowrap"
                  style={{ transform: 'translateZ(20px)' }}
                >
                  TO: <span className="underline underline-offset-4 decoration-[#6c1010]/50">{guestName}</span>
                </div>

                {/* Delicate hairline divider */}
                <div className="w-14 sm:w-20 h-[1px] bg-neutral-400/80 my-3 sm:my-3.5" />

                {/* Event Metadata */}
                <div
                  className="space-y-0.5 sm:space-y-1 font-typewriter text-neutral-800 text-[10px] sm:text-xs tracking-[0.16em] font-semibold select-none text-center"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  <p className="font-bold text-neutral-900 tracking-[0.18em]">Date: 1ro de octubre</p>
                  <p className="font-bold text-neutral-900 tracking-[0.18em]">Hour: 6:00pm</p>
                  <p className="tracking-[0.14em] text-[9px] sm:text-[9.5px] text-neutral-700 max-w-[270px] mx-auto leading-tight">
                    Location: Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia
                  </p>
                  <p className="text-[9px] sm:text-[9.5px] tracking-[0.18em] text-neutral-700 font-medium pt-1">
                    Dress code: Oscuro
                  </p>
                </div>
              </div>

              {/* Middle Section: Release Album Party Announcement & Subtitle */}
              <div
                className="mt-4 mb-auto sm:mt-5 sm:mb-auto py-1.5 max-w-[290px] sm:max-w-xs px-2 text-center preserve-3d"
                style={{ transform: 'translateZ(16px)' }}
              >
                <p
                  id="card-release-album-party-title"
                  className="font-cinzel text-xs sm:text-[13px] tracking-[0.18em] sm:tracking-[0.22em] text-[#6c1010] font-bold select-none text-center leading-relaxed"
                >
                  - Release album party &ldquo;MUTE&rdquo; DEJOTA -
                </p>
                <p
                  id="card-collection-quote"
                  className="font-quote italic text-neutral-800 text-[13px] sm:text-base leading-snug tracking-wide mt-2 sm:mt-2.5 select-none"
                >
                  &ldquo;Una colección de sonidos nacidos en el silencio&rdquo;
                </p>
              </div>

              {/* Bottom Section */}
              <div
                className="w-full flex flex-col items-center pb-1 preserve-3d"
                style={{ transform: 'translateZ(20px)' }}
              >
                {/* The Emblem: Double circle with Gothic 'M' */}
                <div
                  id="card-gothic-emblem"
                  className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center border-[2px] border-neutral-900 p-1 mb-2 shadow-inner"
                  style={{ transform: 'translateZ(22px)' }}
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

      {/* Hidden Master JPG Deliverable Template (Pristine Vertical Luxury Poster: 720 x 1150) */}
      <div
        style={{
          position: 'fixed',
          top: '-15000px',
          left: '0px',
          width: '720px',
          height: '1150px',
          zIndex: -9999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          ref={exportSheetRef}
          id="master-jpg-deliverable"
          style={{
            width: '720px',
            height: '1150px',
            backgroundColor: '#f8f5ee',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '58px 56px 46px 56px',
            color: '#171717',
            overflow: 'hidden',
          }}
        >
          {/* Subtle vintage parchment texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.35,
              backgroundImage: `radial-gradient(#d3cabb 1.2px, transparent 1.2px), radial-gradient(#c7bea9 1.2px, #f8f5ee 1.2px)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }}
          />

          {/* Outer hairline border frame */}
          <div
            style={{
              position: 'absolute',
              inset: '16px',
              border: '1.5px solid rgba(23, 23, 23, 0.22)',
              pointerEvents: 'none',
            }}
          />

          {/* Inner fine accent border */}
          <div
            style={{
              position: 'absolute',
              inset: '22px',
              border: '1px solid rgba(109, 16, 16, 0.16)',
              pointerEvents: 'none',
            }}
          />

          {/* TOP SECTION: Header, Subtitle, TO, Divider, Metadata */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Header: MUTE in Gothic Fraktur */}
            <h1
              style={{
                fontFamily: "'Pirata One', 'UnifrakturMaguntia', serif",
                fontSize: '70px',
                lineHeight: 1,
                color: '#6d1010',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '0 0 16px 0',
                padding: 0,
                textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              MUTE
            </h1>

            {/* Subtitle: You're invited */}
            <h2
              style={{
                fontFamily: "'Pirata One', 'UnifrakturMaguntia', serif",
                fontSize: '32px',
                lineHeight: 1.2,
                color: '#171717',
                fontWeight: 400,
                margin: '0 0 24px 0',
                padding: 0,
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              You&apos;re invited
            </h2>

            {/* Recipient: TO: [GUEST] */}
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '19px',
                lineHeight: 1.3,
                fontWeight: 700,
                letterSpacing: '0.24em',
                color: '#6c1010',
                textTransform: 'uppercase',
                margin: '0 0 26px 0',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              TO: <span style={{ textDecoration: 'underline', textUnderlineOffset: '6px' }}>{guestName}</span>
            </div>

            {/* Hairline Divider */}
            <div
              style={{
                width: '84px',
                height: '1px',
                backgroundColor: 'rgba(23, 23, 23, 0.35)',
                margin: '0 auto 26px auto',
              }}
            />

            {/* Event Details */}
            <div
              style={{
                fontFamily: "'Courier Prime', Courier, monospace",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: '#171717',
                  lineHeight: 1.3,
                }}
              >
                Date: 1ro de octubre
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: '#171717',
                  lineHeight: 1.3,
                }}
              >
                Hour: 6:00pm
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  color: '#333333',
                  lineHeight: 1.35,
                  maxWidth: '440px',
                }}
              >
                Location: Elevate Cl. 7 #15-40, El Poblado, Medellín, Antioquia
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  color: '#383838',
                  marginTop: '6px',
                  lineHeight: 1.3,
                }}
              >
                Dress code: Oscuro
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: Release Album Party Announcement & Subtitle */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: '520px',
              textAlign: 'center',
              margin: '26px auto 24px auto',
              padding: '0 16px',
            }}
          >
            <p
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: '#6c1010',
                margin: '0 0 8px 0',
                lineHeight: 1.4,
              }}
            >
              - Release album party &ldquo;MUTE&rdquo; DEJOTA -
            </p>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', Garamond, Georgia, serif",
                fontSize: '20px',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                color: '#262626',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              &ldquo;Una colección de sonidos nacidos en el silencio&rdquo;
            </p>
          </div>

          {/* BOTTOM SECTION: Gothic M Emblem & Notice */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Gothic M Emblem */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid #171717',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '1px solid #171717',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Pirata One', 'UnifrakturMaguntia', serif",
                    fontSize: '34px',
                    lineHeight: 1,
                    color: '#0a0a0a',
                    fontWeight: 'bold',
                    paddingBottom: '2px',
                  }}
                >
                  M
                </span>
              </div>
            </div>

            {/* Footer Notice */}
            <p
              style={{
                fontFamily: "'Courier Prime', Courier, monospace",
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.24em',
                color: '#525252',
                textTransform: 'uppercase',
                margin: 0,
                padding: 0,
              }}
            >
              INVITACIÓN NO TRANSFERIBLE · SUJETA A LISTA
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar (Download JPG, Calendar, Replay) */}
      {isExpanded && (
        <div className="w-full mt-5 flex flex-wrap items-center justify-center gap-3">
          {/* Save Invitation Sheet as JPG */}
          <button
            id="btn-save-invitation-jpg"
            onClick={handleSaveJpg}
            disabled={isExportingJpg}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#6c1010] hover:bg-[#851414] text-white text-xs font-mono tracking-wider border border-red-900/80 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-60"
            title="Guardar la hoja de invitación en formato JPG"
          >
            {isExportingJpg ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 text-white" />
            )}
            <span>{isExportingJpg ? 'Guardando JPG...' : 'Guardar en JPG'}</span>
          </button>

          {/* Add to Native Calendar App (or Google Calendar on Desktop) */}
          <button
            id="btn-add-calendar"
            onClick={handleAddToCalendar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono tracking-wider border border-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Abrir en la app de calendario de tu celular o agendar evento"
          >
            <Calendar className="w-4 h-4 text-red-500" />
            <span>Agendar (Calendario)</span>
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

          {/* Toast Notification when opening mobile calendar */}
          {calendarToast && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-md text-emerald-400 text-xs font-mono tracking-wider shadow-lg animate-fade-in mt-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{calendarToast}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
