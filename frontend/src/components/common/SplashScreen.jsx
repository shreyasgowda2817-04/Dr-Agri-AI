import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSelector } from 'react-redux';

/**
 * Dr Agri AI - Premium Animated Startup Splash Screen
 * 
 * Visual Architecture:
 * - Palette: Deep Forest Green (#09291F), Emerald Green (#10B981), Warm Harvest Gold (#F59E0B)
 * - Refined agriculture emblem featuring golden wheat stalk and emerald leaves
 * - Brand Typography: "Dr Agri" + "AI" emerald accent badge
 * - Tagline: "Smarter Farming. Healthier Harvests."
 * - Coordinated with Redux session restoration (1.0s - 1.4s visual intro)
 * - Zero white-flash transition into the application
 * - Full reduced-motion accessibility support
 */

const SplashScreen = ({ onComplete }) => {
  const shouldReduceMotion = useReducedMotion();
  const { isInitializing, authLoading } = useSelector((state) => state.auth || {});

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const minDelay = isTestEnv ? 50 : 1100;
  const safetyDelay = isTestEnv ? 100 : 1600;

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Enforce an optimal 1.1s minimum visual intro for brand impact
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDelay);

    return () => clearTimeout(timer);
  }, [minDelay]);

  // Hard safety timeout (1.6s max) to guarantee the splash screen NEVER traps the user,
  // even under slow 2G/3G connections or sleeping backend servers.
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsVisible(false);
    }, safetyDelay);

    return () => clearTimeout(safetyTimer);
  }, [safetyDelay]);

  // Dismiss splash as soon as minimum aesthetic time has elapsed AND session check settled
  useEffect(() => {
    const isAuthSettled = !isInitializing && !authLoading;
    if (minTimeElapsed && (isAuthSettled || isTestEnv)) {
      setIsVisible(false);
    }
  }, [minTimeElapsed, isInitializing, authLoading, isTestEnv]);

  // Spring physics for logo
  const emblemVariants = {
    hidden: { 
      opacity: 0, 
      scale: shouldReduceMotion ? 1 : 0.84,
      y: shouldReduceMotion ? 0 : 8
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.3 : 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.45,
        ease: 'easeOut',
        delay: shouldReduceMotion ? 0.1 : 0.22
      }
    }
  };

  const taglineVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 6 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.45,
        ease: 'easeOut',
        delay: shouldReduceMotion ? 0.15 : 0.4
      }
    }
  };

  const progressVariants = {
    hidden: { width: '0%', opacity: 0 },
    visible: { 
      width: '100%', 
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.3 : 0.85,
        ease: 'easeInOut',
        delay: shouldReduceMotion ? 0.05 : 0.15
      }
    }
  };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="dr-agri-splash"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: shouldReduceMotion ? 1 : 1.015,
            transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] }
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{
            backgroundColor: '#09291F',
            backgroundImage: `
              radial-gradient(circle at 50% 38%, rgba(16, 185, 129, 0.20) 0%, rgba(9, 41, 31, 0.90) 55%, #04150F 100%),
              radial-gradient(circle at 50% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)
            `
          }}
          role="status"
          aria-live="polite"
          aria-label="Loading Dr Agri AI"
          data-testid="splash-screen"
        >
          {/* Subtle ambient animated backdrop shimmer */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 max-w-sm text-center">
            {/* ── 1. REFINED AGRICULTURE EMBLEM ── */}
            <motion.div
              variants={emblemVariants}
              initial="hidden"
              animate="visible"
              className="relative mb-6"
            >
              {/* Outer soft golden/emerald aura */}
              <div className="absolute -inset-2.5 rounded-[32px] bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-green-400/10 blur-xl opacity-75" />

              {/* Emblem Container */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] p-0.5 bg-gradient-to-b from-amber-400/40 via-emerald-500/30 to-emerald-950/80 shadow-2xl shadow-emerald-950/80">
                <div className="w-full h-full rounded-[26px] bg-gradient-to-b from-[#1E2E28] via-[#0E231C] to-[#081813] flex items-center justify-center p-3.5 border border-emerald-500/20 backdrop-blur-md">
                  {/* High-Resolution Agriculture Vector */}
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.25)]"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="splashWheat" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FEF08A" />
                        <stop offset="35%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                      <linearGradient id="splashLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ADE80" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="splashFurrow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#B45309" stopOpacity="0.4" />
                      </linearGradient>
                      <filter id="splashGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.35" />
                      </filter>
                    </defs>

                    <g filter="url(#splashGlow)">
                      {/* Central Golden Wheat Stalk */}
                      <path
                        d="M50 70 C 48 52 44 34 58 18"
                        stroke="url(#splashWheat)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                      {/* Wheat Grains / Kernels */}
                      <path d="M48 24 C 44 22 43 28 47 30 C 51 28 52 22 48 24 Z" fill="url(#splashWheat)" />
                      <path d="M56 26 C 60 24 61 30 57 32 C 53 30 52 24 56 26 Z" fill="url(#splashWheat)" />
                      <path d="M46 32 C 40 30 40 36 45 38 C 50 36 50 30 46 32 Z" fill="url(#splashWheat)" />
                      <path d="M54 35 C 60 33 60 39 55 41 C 50 39 49 33 54 35 Z" fill="url(#splashWheat)" />
                      <path d="M44 42 C 38 40 38 46 43 48 C 48 46 48 40 44 42 Z" fill="url(#splashWheat)" />
                      <path d="M52 45 C 58 43 58 49 53 51 C 48 49 47 43 52 45 Z" fill="url(#splashWheat)" />

                      {/* Lush Emerald Green Leaf Embracing Canopy */}
                      <path
                        d="M48 70 C 54 54 68 44 74 34 C 77 28 72 24 64 26 C 54 28 50 40 48 56 Z"
                        fill="url(#splashLeaf)"
                      />
                      <path
                        d="M48 70 C 40 58 30 50 26 38 C 24 30 32 26 38 30 C 44 36 46 50 48 70 Z"
                        fill="url(#splashLeaf)"
                        opacity="0.92"
                      />

                      {/* Fertile Soil Furrow Lines */}
                      <path
                        d="M24 70 C 34 78 46 80 50 80 C 54 80 66 78 76 70"
                        stroke="url(#splashFurrow)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M28 76 C 36 84 46 86 50 86 C 54 86 64 84 72 76"
                        stroke="url(#splashFurrow)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* ── 2. BRAND NAME WITH AI ACCENT ── */}
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-center gap-2 mb-2"
            >
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
                Dr Agri
              </h1>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-green-500 text-[#09291F] shadow-sm shadow-emerald-500/30">
                AI
              </span>
            </motion.div>

            {/* ── 3. TAGLINE ── */}
            <motion.p
              variants={taglineVariants}
              initial="hidden"
              animate="visible"
              className="text-xs sm:text-sm font-medium tracking-wide text-emerald-200/80 mb-7"
            >
              Smarter Farming. Healthier Harvests.
            </motion.p>

            {/* ── 4. SUBTLE SLENDER PROGRESS INDICATOR ── */}
            <div className="w-36 sm:w-44 h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
              <motion.div
                variants={progressVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-300 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              />
            </div>
          </div>

          {/* Bottom subtle ecosystem tag */}
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-widest text-emerald-400/40 font-bold">
              Agritech Intelligence Platform
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
