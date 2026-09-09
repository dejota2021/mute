import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WaxSealProps {
  onClick?: (e?: React.MouseEvent) => void;
  isBroken?: boolean;
  size?: number;
  className?: string;
  disabled?: boolean;
  color?: 'black' | 'crimson';
}

export const WaxSeal: React.FC<WaxSealProps> = ({
  onClick,
  isBroken = false,
  size = 80,
  className = '',
  disabled = false,
  color = 'black',
}) => {
  const isBlack = color === 'black';

  return (
    <button
      id="wax-seal-button"
      type="button"
      onClick={onClick}
      disabled={disabled || isBroken}
      aria-label="Romper sello de cera y abrir sobre"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative cursor-pointer select-none focus:outline-none transition-transform duration-200 ${
        disabled ? 'cursor-default' : 'hover:scale-105 active:scale-95'
      } ${className}`}
    >
      {/* Outer Glow / Soft Shadow */}
      <div
        className={`absolute inset-0 rounded-full blur-md pointer-events-none transform translate-y-1.5 transition-opacity ${
          isBlack ? 'bg-black/90' : 'bg-red-950/70'
        } ${isBroken ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Floating fracture wax fragments when broken */}
      <AnimatePresence>
        {isBroken && (
          <div className="absolute inset-0 pointer-events-none z-50">
            {/* Shard 1: Top Left */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{ x: -28, y: -22, scale: 0.7, opacity: 0, rotate: -45 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute top-2 left-2 w-3.5 h-3.5 rounded-sm bg-[#222227] shadow-md border border-neutral-700/50"
            />
            {/* Shard 2: Top Right */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{ x: 30, y: -18, scale: 0.6, opacity: 0, rotate: 35 }}
              transition={{ duration: 0.52, ease: 'easeOut' }}
              className="absolute top-2 right-2 w-3 h-3 rounded-sm bg-[#1a1a1e] shadow-md border border-neutral-700/50"
            />
            {/* Shard 3: Bottom Left */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{ x: -24, y: 26, scale: 0.5, opacity: 0, rotate: -60 }}
              transition={{ duration: 0.58, ease: 'easeOut' }}
              className="absolute bottom-2 left-3 w-2.5 h-2.5 rounded-sm bg-[#161619] shadow-md"
            />
            {/* Shard 4: Bottom Right */}
            <motion.div
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{ x: 26, y: 24, scale: 0.65, opacity: 0, rotate: 50 }}
              transition={{ duration: 0.54, ease: 'easeOut' }}
              className="absolute bottom-2 right-3 w-3 h-3 rounded-sm bg-[#28282e] shadow-md border border-neutral-700/50"
            />
          </div>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full h-full"
        animate={
          isBroken
            ? {
                scale: [1, 1.08, 0.85],
                opacity: [1, 1, 0],
                filter: 'blur(1px)',
              }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-2xl"
        >
          <defs>
            {/* Black Obsidian Wax Gradients */}
            <radialGradient id="blackWaxGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#36363c" />
              <stop offset="35%" stopColor="#222227" />
              <stop offset="70%" stopColor="#141416" />
              <stop offset="100%" stopColor="#08080a" />
            </radialGradient>
            <radialGradient id="blackWaxRim" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="90%" stopColor="#111114" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#050506" stopOpacity="0.95" />
            </radialGradient>

            {/* Crimson Wax Gradients */}
            <radialGradient id="crimsonWaxGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#c52828" />
              <stop offset="35%" stopColor="#9e1b1b" />
              <stop offset="70%" stopColor="#751111" />
              <stop offset="100%" stopColor="#450808" />
            </radialGradient>
            <radialGradient id="crimsonWaxRim" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="transparent" />
              <stop offset="95%" stopColor="#3d0707" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1a0202" stopOpacity="0.9" />
            </radialGradient>

            {/* Realistic High-Relief Filter */}
            <filter id="sealEmboss" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
              <feOffset in="blur" dx="-1" dy="-1" result="offsetLight" />
              <feOffset in="blur" dx="1.2" dy="1.4" result="offsetDark" />
              <feSpecularLighting
                in="blur"
                surfaceScale="2.5"
                specularConstant="1.1"
                specularExponent="24"
                lightingColor="#ffffff"
                result="spec"
              >
                <fePointLight x="28" y="20" z="35" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="specOut" />
              </feMerge>
            </filter>
          </defs>

          {/* Organic irregular molten wax puddle edge */}
          <path
            d="M 50,5
               C 66,4 80,13 88,24
               C 96,35 98,49 95,64
               C 91,79 79,91 65,95
               C 51,99 36,97 24,89
               C 12,81 5,67 5,53
               C 4,38 12,25 24,15
               C 35,5 42,6 50,5 Z"
            fill={isBlack ? 'url(#blackWaxGrad)' : 'url(#crimsonWaxGrad)'}
            stroke={isBlack ? '#2d2d34' : '#550909'}
            strokeWidth="0.8"
          />

          {/* Wax lip & rim texture */}
          <path
            d="M 50,5
               C 66,4 80,13 88,24
               C 96,35 98,49 95,64
               C 91,79 79,91 65,95
               C 51,99 36,97 24,89
               C 12,81 5,67 5,53
               C 4,38 12,25 24,15
               C 35,5 42,6 50,5 Z"
            fill={isBlack ? 'url(#blackWaxRim)' : 'url(#crimsonWaxRim)'}
          />

          {/* Inner depressed stamp circle */}
          <circle
            cx="50"
            cy="50"
            r="33"
            fill={isBlack ? '#161619' : '#7a1212'}
            stroke={isBlack ? '#0a0a0c' : '#480808'}
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke={isBlack ? '#3a3a42' : '#aa2626'}
            strokeWidth="0.8"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Ornate Embossed Gothic Crest "M" with Victorian laurels matching reference photo */}
          <g filter="url(#sealEmboss)">
            {/* Circular laurel / rope border */}
            <circle
              cx="50"
              cy="50"
              r="26"
              fill="none"
              stroke={isBlack ? '#35353d' : '#bb2b2b'}
              strokeWidth="0.7"
            />

            {/* Letter M in heavy gothic blackletter font */}
            <text
              x="50"
              y="59"
              textAnchor="middle"
              fontFamily="'UnifrakturMaguntia', 'Pirata One', 'Times New Roman', serif"
              fontSize="30"
              fontWeight="bold"
              fill={isBlack ? '#484852' : '#dd3d3d'}
              stroke={isBlack ? '#1c1c20' : '#400707'}
              strokeWidth="0.5"
              letterSpacing="-1"
            >
              M
            </text>

            {/* Top ornamental crown/flourish */}
            <path
              d="M 43,29 Q 50,26 57,29 Q 50,31 43,29 Z"
              fill={isBlack ? '#45454f' : '#dd3d3d'}
            />

            {/* Side leaf flourishes */}
            <path
              d="M 28,50 C 26,45 28,40 32,42 C 30,46 31,49 28,50 Z"
              fill={isBlack ? '#3d3d45' : '#c52828'}
            />
            <path
              d="M 72,50 C 74,45 72,40 68,42 C 70,46 69,49 72,50 Z"
              fill={isBlack ? '#3d3d45' : '#c52828'}
            />
          </g>

          {/* Glossy specular wax highlight reflection */}
          <ellipse
            cx="38"
            cy="20"
            rx="12"
            ry="4"
            fill="#ffffff"
            opacity={isBlack ? 0.28 : 0.35}
            transform="rotate(-25 38 20)"
          />
          <ellipse
            cx="68"
            cy="74"
            rx="8"
            ry="2.5"
            fill="#ffffff"
            opacity={isBlack ? 0.12 : 0.18}
            transform="rotate(25 68 74)"
          />

          {/* Fissure Crack Line across center when broken */}
          {isBroken && (
            <path
              d="M 49,5 L 52,24 L 46,38 L 54,54 L 48,72 L 51,95"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.9"
            />
          )}
        </svg>
      </motion.div>
    </button>
  );
};
