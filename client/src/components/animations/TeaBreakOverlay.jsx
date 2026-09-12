import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import gsap from 'gsap';
import SteamEffect from './SteamEffect';

/**
 * TeaBreakOverlay — Cinematic tea break experience.
 *
 * Props:
 *   isActive  — whether the break is currently active
 *   countdown — optional string like "05:00" from parent
 */
export default function TeaBreakOverlay({ isActive, countdown }) {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const cupRef = useRef(null);
  const saucerRef = useRef(null);
  const statusRef = useRef(null);
  const masterTl = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Short delay to allow DOM mount
    const entryTimeout = setTimeout(() => {
      if (prefersReduced) {
        // Instant reveal for reduced motion
        if (cupRef.current) gsap.set(cupRef.current, { y: 0, rotation: 0, scale: 1, opacity: 1 });
        if (saucerRef.current) gsap.set(saucerRef.current, { y: 0, opacity: 1 });
        if (titleRef.current) {
          titleRef.current.querySelectorAll('.break-title__char').forEach(c => {
            gsap.set(c, { opacity: 1, y: 0 });
          });
        }
        if (subtitleRef.current) gsap.set(subtitleRef.current, { opacity: 1, y: 0 });
        if (statusRef.current) gsap.set(statusRef.current, { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Phase 2: Cup arrival
      if (cupRef.current) {
        tl.fromTo(cupRef.current,
          { y: 120, rotation: -8, scale: 0.85, opacity: 0 },
          { y: 0, rotation: 0, scale: 1.04, opacity: 1, duration: 0.9, ease: 'power2.out' },
          0.3
        );
        tl.to(cupRef.current, { scale: 1, duration: 0.35, ease: 'power2.inOut' }, '>-0.1');
      }

      // Phase 2b: Saucer independent settle
      if (saucerRef.current) {
        tl.fromTo(saucerRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
          0.5
        );
      }

      // Phase 5: Title character stagger
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.break-title__char');
        tl.fromTo(chars,
          { opacity: 0, y: 20, filter: 'blur(4px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.04, ease: 'power2.out' },
          1.0
        );
      }

      // Phase 5b: Subtitle
      if (subtitleRef.current) {
        tl.fromTo(subtitleRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          1.4
        );
      }

      // Phase 6: Status indicator
      if (statusRef.current) {
        tl.fromTo(statusRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          1.6
        );
      }

      masterTl.current = tl;
    }, 50);

    return () => {
      clearTimeout(entryTimeout);
      if (masterTl.current) {
        masterTl.current.kill();
        masterTl.current = null;
      }
    };
  }, [isActive]);

  const titleChars = 'TEA BREAK'.split('').map((char, i) => (
    <span key={i} className="break-title__char">
      {char === ' ' ? '\u00A0\u00A0' : char}
    </span>
  ));

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="break-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Phase 1: Backdrop */}
          <motion.div
            className="break-overlay__backdrop break-overlay__backdrop--tea"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Warm particles */}
          <div className="break-particles">
            <div className="break-particle" />
            <div className="break-particle" />
            <div className="break-particle" />
            <div className="break-particle" />
            <div className="break-particle" />
          </div>

          {/* Content */}
          <motion.div
            className="break-overlay__content"
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          >
            {/* Tea Cup */}
            <div className="tea-cup-wrapper">
              {/* Steam */}
              <SteamEffect count={4} originY="72%" intensity={1} active={isActive} />

              {/* Saucer */}
              <svg ref={saucerRef} style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: '70%', opacity: 0 }} viewBox="0 0 140 20" fill="none">
                <ellipse cx="70" cy="10" rx="68" ry="9" fill="#C9A96E" />
                <ellipse cx="70" cy="8" rx="64" ry="7" fill="#DFC089" />
                <ellipse cx="70" cy="7" rx="58" ry="5" fill="#E8D4A8" />
              </svg>

              {/* Cup */}
              <svg ref={cupRef} style={{ opacity: 0, position: 'relative', zIndex: 2 }} viewBox="0 0 160 140" fill="none">
                {/* Cup body */}
                <path d="M30 30 C30 30, 25 120, 50 125 L110 125 C135 120, 130 30, 130 30 Z" fill="#E8E0D4" />
                <path d="M30 30 C30 30, 25 120, 50 125 L110 125 C135 120, 130 30, 130 30 Z" fill="url(#cupGrad)" />
                {/* Cup rim */}
                <ellipse cx="80" cy="30" rx="52" ry="8" fill="#F5F0E8" />
                <ellipse cx="80" cy="30" rx="48" ry="6" fill="#D4A043" />
                {/* Tea surface */}
                <ellipse className="tea-ripple" cx="80" cy="34" rx="44" ry="4.5" fill="#B8721A" opacity="0.8" />
                {/* Handle */}
                <path d="M130 50 C155 50, 155 90, 130 90" stroke="#D4C4A8" strokeWidth="6" fill="none" strokeLinecap="round" />
                {/* Cup highlight */}
                <path d="M40 40 C40 40, 38 80, 45 100" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" fill="none" />
                <defs>
                  <linearGradient id="cupGrad" x1="30" y1="30" x2="130" y2="125" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5F0E8" />
                    <stop offset="100%" stopColor="#D4C4A8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Title */}
            <div ref={titleRef} className="break-title">
              {titleChars}
            </div>

            {/* Subtitle */}
            <div ref={subtitleRef} className="break-subtitle" style={{ opacity: 0 }}>
              Take a moment. Recharge. We'll be right here.
            </div>

            {/* Status */}
            <div ref={statusRef} className="break-status" style={{ opacity: 0 }}>
              <span className="break-status__dot" />
              BREAK IN PROGRESS
            </div>

            {/* Countdown */}
            {countdown && (
              <div className="break-countdown">
                {countdown}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
