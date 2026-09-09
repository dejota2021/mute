import React, { useState, useEffect, useRef } from 'react';
import { submitRegistration } from '../utils/googleSheets';
import { GuestRegistration } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: (guest: GuestRegistration) => void;
  onOpenSheetsConfig?: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Focus tracking for input lines
  const [focusedField, setFocusedField] = useState<'name' | 'email' | null>(null);

  // Mouse coordinate tracking for dynamic lighting and tilt
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, normX: 0, normY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial center coordinates
    setMousePos({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      normX: 0,
      normY: 0,
    });

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Normalized between -1 and 1
      const normX = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const normY = (e.clientY - innerHeight / 2) / (innerHeight / 2);

      setMousePos({
        x: e.clientX,
        y: e.clientY,
        normX,
        normY,
      });
    };

    // Mobile gyroscope / device orientation fallback
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const normX = Math.max(-1, Math.min(1, e.gamma / 30));
        const normY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
        setMousePos((prev) => ({
          ...prev,
          normX,
          normY,
        }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Escribe tu nombre');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError('Escribe un correo electrónico válido');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRegistration(name, email);
      setSuccessStatus(result.message);

      // Brief delay before launching envelope opening
      setTimeout(() => {
        onSuccess(result.guest);
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError('Ocurrió un problema. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

  // Subtle 3D tilt calculation
  const tiltX = -mousePos.normY * 6; // max 6 deg
  const tiltY = mousePos.normX * 6;  // max 6 deg

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[70vh] flex flex-col items-center justify-center select-none"
    >
      {/* Main Minimalist Composition with 3D Tilt */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center px-4"
        style={{
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Header: Exactly matches user screenshot aesthetic */}
        <div className="mb-10 sm:mb-12 space-y-1 select-none">
          <p className="font-typewriter text-xs sm:text-[13px] tracking-[0.28em] text-neutral-300 uppercase leading-relaxed">
            ESCRIBE TU NOMBRE Y CORREO
          </p>
          <p className="font-typewriter text-xs sm:text-[13px] tracking-[0.28em] text-neutral-300 uppercase leading-relaxed">
            PARA REVELAR TU INVITACIÓN
          </p>
        </div>

        {/* Minimal Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-8 sm:space-y-10">
          
          {/* Field 1: Tu nombre */}
          <div className="w-full max-w-md relative group">
            <input
              id="input-guest-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              placeholder="Tu nombre"
              autoComplete="name"
              disabled={isSubmitting}
              className="w-full bg-transparent text-center font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-0 border-none pb-2 transition-all caret-white"
              style={{
                fontFamily: 'monospace',
                fontSize: '21px',
              }}
            />
            {/* Minimalist Crimson Underline Line */}
            <div
              className={`w-full h-[1px] transition-all duration-300 ${
                focusedField === 'name' || name.length > 0
                  ? 'bg-[#85161f] shadow-[0_0_12px_rgba(133,22,31,0.85)] scale-x-100'
                  : 'bg-[#5a1017] group-hover:bg-[#72151e]'
              }`}
            />
          </div>

          {/* Field 2: Tu correo */}
          <div className="w-full max-w-md relative group">
            <input
              id="input-guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="Tu correo"
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full bg-transparent text-center font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-0 border-none pb-2 transition-all caret-white"
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
              }}
            />
            {/* Minimalist Crimson Underline Line */}
            <div
              className={`w-full h-[1px] transition-all duration-300 ${
                focusedField === 'email' || email.length > 0
                  ? 'bg-[#85161f] shadow-[0_0_12px_rgba(133,22,31,0.85)] scale-x-100'
                  : 'bg-[#5a1017] group-hover:bg-[#72151e]'
              }`}
            />
          </div>

          {/* Subtle Error Feedback */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-red-400 font-typewriter text-xs tracking-wider"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button: Exact rectangle style from screenshot */}
          <div className="pt-2">
            <button
              id="btn-submit-minimal-registration"
              type="submit"
              disabled={isSubmitting}
              className="relative px-8 sm:px-10 py-3 bg-[#5a1017] hover:bg-[#72151e] active:scale-95 text-neutral-200 hover:text-white font-typewriter text-xs tracking-[0.28em] uppercase transition-all duration-200 border border-[#781721]/50 shadow-lg shadow-black/80 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>REVELANDO...</span>
                </span>
              ) : successStatus ? (
                <span className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  <span>CONFIRMADO</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>ENVIAR</span>
                  <span className="text-xs">&rarr;</span>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Minimal Bottom Notice: Matches screenshot */}
        <div className="mt-12 sm:mt-16 space-y-1 text-neutral-600 font-typewriter text-[9px] sm:text-[10px] tracking-[0.26em] uppercase select-none">
          <p>INVITACIÓN PERSONAL E INTRANSFERIBLE</p>
          <p>SUJETA A VERIFICACIÓN EN LISTA</p>
        </div>
      </motion.div>
    </div>
  );
};
