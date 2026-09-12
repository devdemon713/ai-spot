import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import gsap from 'gsap';
import SteamEffect from './SteamEffect';

/**
 * LunchBreakOverlay — Cinematic lunch break with tiffin/plate animation.
 *
 * Props:
 *   isActive  — whether the break is currently active
 *   countdown — optional string like "30:00"
 */
export default function LunchBreakOverlay({ isActive, countdown }) {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const containerRef = useRef(null);
  const lidRef = useRef(null);
  const food1Ref = useRef(null);
  const food2Ref = useRef(null);
  const food3Ref = useRef(null);
  const spoonRef = useRef(null);
  const statusRef = useRef(null);
  const masterTl = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const entryTimeout = setTimeout(() => {
      if (prefersReduced) {
        [containerRef, lidRef, food1Ref, food2Ref, food3Ref, spoonRef].forEach(ref => {
          if (ref.current) gsap.set(ref.current, { opacity: 1, y: 0, scale: 1, rotation: 0 });
        });
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

      // Container arrival
      if (containerRef.current) {
        tl.fromTo(containerRef.current,
          { y: 100, scale: 0.9, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' },
          0.3
        );
      }

      // Lid opens (rotates up from bottom pivot)
      if (lidRef.current) {
        tl.fromTo(lidRef.current,
          { rotation: 0, transformOrigin: '50% 100%' },
          { rotation: -35, duration: 0.7, ease: 'power2.inOut' },
          0.9
        );
        tl.to(lidRef.current,
          { opacity: 0.3, y: -20, duration: 0.4, ease: 'power1.in' },
          '>-0.1'
        );
      }

      // Food items stagger
      const foods = [food1Ref, food2Ref, food3Ref].filter(r => r.current);
      foods.forEach((ref, i) => {
        tl.fromTo(ref.current,
          { scale: 0, opacity: 0, y: 15 },
          { scale: 1.06, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.7)' },
          1.3 + i * 0.18
        );
        tl.to(ref.current, { scale: 1, duration: 0.2, ease: 'power1.inOut' }, '>');
      });

      // Spoon entry
      if (spoonRef.current) {
        tl.fromTo(spoonRef.current,
          { rotation: -25, opacity: 0, x: 30 },
          { rotation: 0, opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
          1.8
        );
      }

      // Title stagger
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.break-title__char');
        tl.fromTo(chars,
          { opacity: 0, y: 20, filter: 'blur(4px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.04, ease: 'power2.out' },
          2.0
        );
      }

      // Subtitle
      if (subtitleRef.current) {
        tl.fromTo(subtitleRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          2.4
        );
      }

      // Status
      if (statusRef.current) {
        tl.fromTo(statusRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          2.6
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

  const titleChars = 'LUNCH BREAK'.split('').map((char, i) => (
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
          {/* Backdrop */}
          <motion.div
            className="break-overlay__backdrop break-overlay__backdrop--lunch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Particles */}
          <div className="break-particles">
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
            {/* Lunch Container */}
            <div className="lunch-container-wrapper">
              {/* Steam - fewer and lighter than tea */}
              <SteamEffect count={3} originY="65%" intensity={0.7} active={isActive} />

              <svg viewBox="0 0 200 180" fill="none" style={{ position: 'relative', zIndex: 2 }}>
                {/* Plate / Base */}
                <g ref={containerRef} style={{ opacity: 0 }}>
                  {/* Plate shadow */}
                  <ellipse cx="100" cy="155" rx="80" ry="8" fill="rgba(0,0,0,0.15)" />
                  {/* Plate */}
                  <ellipse cx="100" cy="140" rx="78" ry="14" fill="#E8E0D4" />
                  <ellipse cx="100" cy="138" rx="74" ry="12" fill="#F5F0E8" />
                  {/* Bowl */}
                  <path d="M35 90 C35 90, 30 140, 55 145 L145 145 C170 140, 165 90, 165 90 Z" fill="url(#bowlGrad)" />
                  <ellipse cx="100" cy="90" rx="66" ry="10" fill="#F5F0E8" />
                  <ellipse cx="100" cy="90" rx="62" ry="8" fill="#FFFAF0" />

                  {/* Food items */}
                  {/* Rice */}
                  <g ref={food1Ref} style={{ opacity: 0 }}>
                    <ellipse cx="75" cy="88" rx="22" ry="8" fill="#FEFCE8" />
                    <text x="75" y="92" textAnchor="middle" fontSize="16">🍚</text>
                  </g>

                  {/* Curry */}
                  <g ref={food2Ref} style={{ opacity: 0 }}>
                    <ellipse cx="125" cy="88" rx="20" ry="8" fill="#FEF3C7" />
                    <text x="125" y="92" textAnchor="middle" fontSize="16">🍛</text>
                  </g>

                  {/* Salad */}
                  <g ref={food3Ref} style={{ opacity: 0 }}>
                    <ellipse cx="100" cy="78" rx="16" ry="6" fill="#ECFCCB" />
                    <text x="100" y="82" textAnchor="middle" fontSize="14">🥗</text>
                  </g>
                </g>

                {/* Lid */}
                <g ref={lidRef} style={{ transformOrigin: '100px 90px' }}>
                  <path d="M38 90 C38 55, 70 35, 100 30 C130 35, 162 55, 162 90 Z" fill="url(#lidGrad)" />
                  <ellipse cx="100" cy="90" rx="63" ry="9" fill="#C8B896" />
                  {/* Lid knob */}
                  <ellipse cx="100" cy="30" rx="8" ry="4" fill="#B8A070" />
                  <ellipse cx="100" cy="28" rx="6" ry="3" fill="#D4BC8A" />
                  {/* Lid highlight */}
                  <path d="M55 70 C65 50, 85 38, 100 35" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>

                {/* Spoon */}
                <g ref={spoonRef} style={{ opacity: 0 }}>
                  <line x1="160" y1="70" x2="185" y2="45" stroke="#C8B896" strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="185" cy="42" rx="6" ry="8" fill="#D4C4A8" transform="rotate(-30 185 42)" />
                </g>

                <defs>
                  <linearGradient id="bowlGrad" x1="35" y1="90" x2="165" y2="145" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5F0E8" />
                    <stop offset="100%" stopColor="#DDD4C4" />
                  </linearGradient>
                  <linearGradient id="lidGrad" x1="38" y1="30" x2="162" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E8DCC8" />
                    <stop offset="100%" stopColor="#C8B896" />
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
              Refuel. Relax. Come back ready.
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
