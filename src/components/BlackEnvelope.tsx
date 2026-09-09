import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WaxSeal } from './WaxSeal';
import { InvitationCard } from './InvitationCard';
import { GuestRegistration } from '../types';
import { use3DTilt } from '../hooks/use3DTilt';
import { playPaperTearSound, playPaperSlideSound } from '../utils/audioEffects';
import { Sparkles, Scissors, Smartphone } from 'lucide-react';

interface BlackEnvelopeProps {
  guest: GuestRegistration | null;
  onOpenComplete?: () => void;
  autoOpen?: boolean;
}

export const BlackEnvelope: React.FC<BlackEnvelopeProps> = ({
  guest,
  onOpenComplete,
  autoOpen = false,
}) => {
  // Stages:
  // 'sealed' -> 3D interactive black textured envelope with cords & wax seal
  // 'tearing' -> ribbon snaps, wax breaks, paper tear sound
  // 'sliding_out' -> realistic sheet of paper glides upward out of envelope
  // 'revealed' -> invitation rests in full 3D interactive tilt mode with mouse/gyro
  const [stage, setStage] = useState<'sealed' | 'tearing' | 'sliding_out' | 'revealed'>('sealed');

  // Envelope 3D tilt tracking for mouse & mobile device gyroscope
  const { elementRef: envelopeRef, tilt: envelopeTilt, requestGyroPermission } = use3DTilt({
    maxTilt: 16,
    disabled: stage === 'revealed',
  });

  useEffect(() => {
    if (autoOpen && stage === 'sealed') {
      const timer = setTimeout(() => {
        handleOpenEnvelope();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  const handleOpenEnvelope = () => {
    if (stage !== 'sealed') return;

    // Request gyro permission on user interaction if needed
    requestGyroPermission();

    // 1. Play realistic paper tear sound
    playPaperTearSound();
    setStage('tearing');

    // Smooth unsealing & tear
    setTimeout(() => {
      // 2. Flap unfolds open & paper begins sliding out upward
      playPaperSlideSound();
      setStage('sliding_out');

      // 3. Card completes ascent, floats forward into full interactive resting state
      setTimeout(() => {
        setStage('revealed');
        if (onOpenComplete) onOpenComplete();
      }, 1650);
    }, 420);
  };

  const handleReset = () => {
    setStage('sealed');
  };

  const isSealed = stage === 'sealed';
  const isTearing = stage === 'tearing';
  const isSliding = stage === 'sliding_out';
  const isRevealed = stage === 'revealed';

  // Dynamic tilt for paper during flight
  const flightTiltX = -envelopeTilt.normY * 16;
  const flightTiltY = envelopeTilt.normX * 18;

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 px-3 select-none min-h-[640px]">
      {/* Top Status & Interaction Hint */}
      <div className="h-10 mb-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isSealed && (
            <motion.div
              key="sealed-hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-neutral-400 text-xs font-mono tracking-widest uppercase bg-neutral-950/80 px-4 py-1.5 rounded-full border border-neutral-800 shadow-md backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-300 animate-pulse" />
              <span>Toca el sello para abrir</span>
              <span className="hidden sm:inline text-neutral-600">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-neutral-500">
                <Smartphone className="w-2.5 h-2.5" />
                <span>Mueve el móvil</span>
              </span>
            </motion.div>
          )}

          {(isTearing || isSliding) && (
            <motion.div
              key="tearing-hint"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-300 text-xs font-mono tracking-widest uppercase bg-[#3a080d]/60 px-4 py-1.5 rounded-full border border-red-900/60 shadow-lg backdrop-blur-sm"
            >
              <Scissors className="w-3.5 h-3.5 animate-bounce" />
              <span>{isTearing ? 'Rasgando envoltorio...' : 'Deslizando invitación...'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main 3D Stage Container */}
      <div className="relative w-full max-w-[400px] sm:max-w-[440px] flex flex-col items-center justify-center min-h-[520px]">
        {/* REVEALED INVITATION CARD (Interactive 3D tilt mode with mouse, touch & gyroscope) */}
        {isRevealed && (
          <motion.div
            id="interactive-revealed-invitation"
            className="w-full z-30"
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <InvitationCard
              guest={guest}
              onReset={handleReset}
              isExpanded={true}
              enableTilt={true}
            />
          </motion.div>
        )}

        {/* REALISTIC NATURAL PAPER EMERGENCE FLIGHT */}
        <AnimatePresence>
          {isSliding && (
            <motion.div
              id="natural-paper-flight"
              className="absolute z-40 w-full max-w-[340px] sm:max-w-[380px] pointer-events-none"
              style={{
                perspective: '1400px',
                transformStyle: 'preserve-3d',
              }}
              initial={{
                y: 80,
                rotateX: 18,
                rotateZ: -2,
                scale: 0.88,
                opacity: 0.95,
              }}
              animate={{
                y: [80, -185, 0], // Slides UPWARD high out of the envelope mouth, then settles into center
                rotateX: [18, -10, 0],
                rotateZ: [-2, 1.5, 0],
                scale: [0.88, 1.03, 1],
                opacity: 1,
              }}
              transition={{
                duration: 1.6,
                times: [0, 0.55, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Dynamic 3D Floating Shadow underneath Paper during Flight */}
              <div
                className="absolute -inset-3 bg-black/70 rounded-sm blur-2xl pointer-events-none"
                style={{
                  transform: `translate3d(${-flightTiltY * 2}px, ${26 + flightTiltX * 1.4}px, -40px)`,
                  transition: 'transform 0.05s ease-out',
                }}
              />

              {/* Natural Parchment Sheet with Dynamic Real-time Aerodynamics */}
              <div
                className="relative w-full rounded-sm border border-[#d6cebf] bg-[#f8f5ee] shadow-[0_35px_80px_rgba(0,0,0,0.85)] p-6 sm:p-9 flex flex-col items-center justify-between text-center overflow-hidden preserve-3d"
                style={{
                  aspectRatio: '1 / 1.55',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0,0,0,0.3)',
                  transform: `perspective(1200px) rotateX(${flightTiltX}deg) rotateY(${flightTiltY}deg) translateZ(12px)`,
                  transition: 'transform 0.05s ease-out',
                  willChange: 'transform',
                }}
              >
                {/* Paper Fiber Texture Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-45 mix-blend-multiply"
                  style={{
                    backgroundImage: `radial-gradient(#d3cabb 1px, transparent 1px), radial-gradient(#c7bea9 1px, #f8f5ee 1px)`,
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Dynamic Specular Sheen responding to Coordinates during flight */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle 380px at ${envelopeTilt.glareX}% ${envelopeTilt.glareY}%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 40%, transparent 75%)`,
                    opacity: 0.8,
                  }}
                />

                {/* Card Content during flight */}
                <div className="w-full flex flex-col items-center pt-2">
                  <h1
                    className="font-fraktur text-5xl sm:text-6xl text-[#6d1010] font-bold leading-none select-none"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    MUTE
                  </h1>
                  <h2 className="font-fraktur text-2xl sm:text-3xl text-neutral-900 mt-2 sm:mt-3 font-normal">
                    You&apos;re invited
                  </h2>
                  <div
                    className="mt-4 sm:mt-5 text-[#6c1010] font-serif font-bold tracking-[0.26em] uppercase select-none"
                    style={{ fontSize: '17px' }}
                  >
                    TO: <span className="underline underline-offset-4 decoration-[#6c1010]/50">{guest?.name ? guest.name.toUpperCase() : 'DEJOTA'}</span>
                  </div>
                  <div className="w-14 sm:w-20 h-[1px] bg-neutral-400/80 my-4 sm:my-5" />
                  <div className="space-y-1.5 sm:space-y-2 font-typewriter text-neutral-800 text-[11px] sm:text-xs tracking-[0.2em] font-semibold select-none">
                    <p>DATE: OCTUBRE 2026</p>
                    <p>PLACE: SECRET LOCATION</p>
                    <p className="tracking-[0.16em] text-[10px]" style={{ fontSize: '10px' }}>RELEASE ALBUM PARTY MUTE DEJOTA</p>
                  </div>
                </div>

                <div className="my-auto py-3 max-w-[280px] sm:max-w-xs px-2">
                  <p className="font-quote italic text-neutral-800 text-sm sm:text-base leading-relaxed tracking-wide">
                    &ldquo;No busco ser escuchado,<br />
                    busco que alguien se sienta<br />
                    acompañado en el silencio.&rdquo;
                  </p>
                </div>

                <div className="w-full flex flex-col items-center pb-1">
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[2px] border-neutral-900 p-1 mb-3 shadow-inner">
                    <div className="w-full h-full rounded-full border border-neutral-900 flex items-center justify-center">
                      <span className="font-fraktur text-2xl sm:text-3xl text-neutral-950 font-bold leading-none select-none pb-0.5">
                        M
                      </span>
                    </div>
                  </div>
                  <p className="font-typewriter text-[9px] sm:text-[10px] tracking-[0.24em] text-neutral-700 font-semibold uppercase select-none">
                    INVITACIÓN NO TRANSFERIBLE · SUJETA A LISTA
                  </p>
                  <p className="font-typewriter text-[8px] text-neutral-500 tracking-widest mt-1">
                    PASE #{guest?.ticketCode || 'MUTE-2026-001'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D REALISTIC BLACK PAPER ENVELOPE */}
        {!isRevealed && (
          <div
            className="w-full perspective-1000 flex justify-center py-2 select-none"
            style={{ perspective: '1200px' }}
          >
            <motion.div
              animate={
                isSliding
                  ? {
                      y: 40,
                      opacity: 0.15,
                      scale: 0.94,
                      transition: { duration: 1.5, delay: 0.15, ease: 'easeOut' },
                    }
                  : { y: 0, opacity: 1, scale: 1 }
              }
              className="w-full flex justify-center preserve-3d"
            >
              <div
                ref={envelopeRef}
                id="interactive-3d-black-envelope"
                onClick={isSealed ? handleOpenEnvelope : undefined}
                className={`relative w-full max-w-[390px] sm:max-w-[430px] h-[280px] sm:h-[305px] preserve-3d ${
                  isSealed ? 'cursor-pointer' : ''
                }`}
                style={{
                  transform: isSealed
                    ? `perspective(1200px) rotateX(${envelopeTilt.rotateX}deg) rotateY(${envelopeTilt.rotateY}deg) translate3d(${envelopeTilt.translateX}px, ${envelopeTilt.translateY}px, ${envelopeTilt.isInteracting || envelopeTilt.isGyroActive ? envelopeTilt.translateZ : 0}px)`
                    : 'none',
                  transition: envelopeTilt.isInteracting
                    ? 'transform 0.05s ease-out'
                    : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                }}
              >
                {/* Realistic Envelope Cast Shadow underneath responding to gyro/mouse */}
                <div
                  className="absolute -bottom-8 inset-x-8 h-12 bg-black/95 blur-2xl rounded-full pointer-events-none"
                  style={{
                    transform: `translate3d(${-envelopeTilt.rotateY * 2 - envelopeTilt.translateX}px, ${envelopeTilt.rotateX * 1.5 - envelopeTilt.translateY}px, -30px) scale(${envelopeTilt.isInteracting || envelopeTilt.isGyroActive ? 1.05 : 0.95})`,
                    opacity: envelopeTilt.isInteracting || envelopeTilt.isGyroActive ? 0.9 : 0.6,
                    transition: envelopeTilt.isInteracting ? 'transform 0.05s ease-out, opacity 0.2s' : 'transform 0.4s ease-out, opacity 0.3s',
                  }}
                />

                {/* Envelope Body Container with Realistic Cotton Pulp Paper Texture */}
                <div
                  className="relative w-full h-full rounded-sm overflow-hidden border border-neutral-800/80 shadow-2xl preserve-3d"
                  style={{
                    backgroundColor: '#151518',
                    backgroundImage: `
                      radial-gradient(circle at 50% 50%, #1e1e23 0%, #121215 100%)
                    `,
                  }}
                >
                  {/* Dynamic Light Sheen across Matte Paper */}
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-200"
                    style={{
                      background: `radial-gradient(circle at ${envelopeTilt.glareX}% ${envelopeTilt.glareY}%, rgba(255, 255, 255, 0.12) 0%, transparent 60%)`,
                    }}
                  />

                  {/* Envelope Interior Pocket */}
                  <div className="absolute inset-x-4 top-3 bottom-3 bg-[#0a0a0c] border-t border-neutral-800/90 rounded-sm">
                    {(isTearing || isSliding) && (
                      <div className="absolute top-2 inset-x-5 h-16 bg-[#f8f5ee] rounded-t-sm opacity-90 border-t border-neutral-300 shadow-inner" />
                    )}
                  </div>

                  {/* Envelope Creases & Triangle Folds */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    viewBox="0 0 430 305"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="leftFoldGrad" x1="0%" y1="0%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#1a1a1f" />
                        <stop offset="100%" stopColor="#131316" />
                      </linearGradient>
                      <linearGradient id="rightFoldGrad" x1="100%" y1="0%" x2="0%" y2="50%">
                        <stop offset="0%" stopColor="#19191d" />
                        <stop offset="100%" stopColor="#111114" />
                      </linearGradient>
                      <linearGradient id="bottomFoldGrad" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" stopColor="#0e0e11" />
                        <stop offset="100%" stopColor="#17171c" />
                      </linearGradient>
                    </defs>

                    {/* Left Triangle Pocket Fold */}
                    <polygon
                      points="0,0 215,168 0,305"
                      fill="url(#leftFoldGrad)"
                      stroke="#26262d"
                      strokeWidth="0.75"
                    />

                    {/* Right Triangle Pocket Fold */}
                    <polygon
                      points="430,0 215,168 430,305"
                      fill="url(#rightFoldGrad)"
                      stroke="#26262d"
                      strokeWidth="0.75"
                    />

                    {/* Bottom Triangle Pocket Fold */}
                    <polygon
                      points="0,305 215,148 430,305"
                      fill="url(#bottomFoldGrad)"
                      stroke="#2e2e36"
                      strokeWidth="1"
                    />

                    <line x1="0" y1="305" x2="215" y2="148" stroke="#363640" strokeWidth="0.5" opacity="0.6" />
                    <line x1="430" y1="305" x2="215" y2="148" stroke="#363640" strokeWidth="0.5" opacity="0.6" />
                  </svg>

                  {/* CUERDITAS VINOTINTO (Burgundy Twine & Cords) */}
                  <div className="absolute inset-0 pointer-events-none z-15">
                    {/* Left Vinotinto Cord from Top to Center Seal */}
                    <motion.div
                      className="absolute top-0 w-2 sm:w-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-x border-[#260307]"
                      style={{
                        left: '46.5%',
                        height: '154px',
                        transformOrigin: 'top center',
                        transform: 'rotate(4deg)',
                        backgroundColor: '#520c17',
                        backgroundImage: 'linear-gradient(90deg, #38050c 0%, #851627 50%, #260307 100%)',
                      }}
                      animate={
                        isTearing
                          ? {
                              opacity: 0,
                              x: -25,
                              rotate: -15,
                              transition: { duration: 0.35 },
                            }
                          : {}
                      }
                    >
                      <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.4),rgba(255,255,255,0.4)_1.5px,transparent_1.5px,transparent_4px)]" />
                    </motion.div>

                    {/* Right Vinotinto Cord from Top to Center Seal */}
                    <motion.div
                      className="absolute top-0 w-2 sm:w-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-x border-[#260307]"
                      style={{
                        left: '52.5%',
                        height: '154px',
                        transformOrigin: 'top center',
                        transform: 'rotate(-4deg)',
                        backgroundColor: '#520c17',
                        backgroundImage: 'linear-gradient(90deg, #38050c 0%, #851627 50%, #260307 100%)',
                      }}
                      animate={
                        isTearing
                          ? {
                              opacity: 0,
                              x: 25,
                              rotate: 15,
                              transition: { duration: 0.35 },
                            }
                          : {}
                      }
                    >
                      <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.4),rgba(255,255,255,0.4)_1.5px,transparent_1.5px,transparent_4px)]" />
                    </motion.div>

                    {/* Hanging Vinotinto Cord Tails hanging beneath seal */}
                    <motion.div
                      className="absolute w-2 sm:w-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.9)] border-x border-[#260307]"
                      style={{
                        left: '46%',
                        top: '150px',
                        height: '148px',
                        transform: 'rotate(6deg)',
                        backgroundColor: '#520c17',
                        backgroundImage: 'linear-gradient(90deg, #38050c 0%, #851627 50%, #260307 100%)',
                        clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
                      }}
                      animate={
                        isTearing
                          ? {
                              opacity: 0,
                              y: 20,
                              rotate: 20,
                              transition: { duration: 0.4 },
                            }
                          : {}
                      }
                    >
                      <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.4),rgba(255,255,255,0.4)_1.5px,transparent_1.5px,transparent_4px)]" />
                    </motion.div>

                    <motion.div
                      className="absolute w-2 sm:w-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.9)] border-x border-[#260307]"
                      style={{
                        left: '52%',
                        top: '150px',
                        height: '152px',
                        transform: 'rotate(-3deg)',
                        backgroundColor: '#520c17',
                        backgroundImage: 'linear-gradient(90deg, #38050c 0%, #851627 50%, #260307 100%)',
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 92%)',
                      }}
                      animate={
                        isTearing
                          ? {
                              opacity: 0,
                              y: 20,
                              rotate: -15,
                              transition: { duration: 0.4 },
                            }
                          : {}
                      }
                    >
                      <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.4),rgba(255,255,255,0.4)_1.5px,transparent_1.5px,transparent_4px)]" />
                    </motion.div>
                  </div>
                </div>

                {/* TOP FLAP OPENING UPWARD */}
                <motion.div
                  className="absolute top-0 inset-x-0 h-[170px] z-30 pointer-events-none"
                  style={{
                    transformOrigin: 'top center',
                    transformStyle: 'preserve-3d',
                  }}
                  initial={{ rotateX: 0 }}
                  animate={{
                    rotateX: isSealed ? 0 : -176,
                  }}
                  transition={{
                    duration: 0.75,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Outer Flap Surface */}
                  <div className="relative w-full h-full preserve-3d">
                    <svg
                      className="w-full h-full drop-shadow-xl backface-hidden"
                      viewBox="0 0 430 170"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="flapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#25252c" />
                          <stop offset="60%" stopColor="#18181d" />
                          <stop offset="100%" stopColor="#101013" />
                        </linearGradient>
                        <linearGradient id="flapInsideGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#1d1d23" />
                          <stop offset="100%" stopColor="#111114" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points="0,0 430,0 215,168"
                        fill="url(#flapGrad)"
                        stroke="#2e2e36"
                        strokeWidth="1"
                      />
                      <line x1="0" y1="0" x2="215" y2="168" stroke="#3d3d48" strokeWidth="0.8" opacity="0.6" />
                      <line x1="430" y1="0" x2="215" y2="168" stroke="#3d3d48" strokeWidth="0.8" opacity="0.6" />
                    </svg>

                    {/* Inside Flap Surface */}
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: 'rotateX(180deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <svg
                        className="w-full h-full drop-shadow-md"
                        viewBox="0 0 430 170"
                        preserveAspectRatio="none"
                      >
                        <polygon
                          points="0,0 430,0 215,168"
                          fill="url(#flapInsideGrad)"
                          stroke="#26262d"
                          strokeWidth="1"
                        />
                        <path
                          d="M 15,10 L 415,10 L 215,155 Z"
                          fill="#0c0c0e"
                          opacity="0.65"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* BLACK OBSIDIAN WAX SEAL */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-[124px] sm:top-[132px] z-40 transition-all duration-300 ${
                    !isSealed ? 'pointer-events-none opacity-0 scale-75' : 'pointer-events-auto'
                  }`}
                >
                  <div className="relative group">
                    <WaxSeal
                      color="black"
                      isBroken={!isSealed}
                      onClick={handleOpenEnvelope}
                      size={84}
                      className="seal-glow"
                    />
                    <div className="absolute -inset-2 rounded-full border border-white/20 animate-ping pointer-events-none opacity-60" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
