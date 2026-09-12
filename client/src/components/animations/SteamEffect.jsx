import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * SteamEffect — Reusable GSAP-driven steam wisps.
 * 
 * Props:
 *   count     — number of wisps (default 4)
 *   originY   — CSS bottom offset for wisp origin (default '55%')
 *   intensity — multiplier for scale/opacity (default 1)
 *   active    — whether steam is visible (default true)
 */
export default function SteamEffect({ count = 4, originY = '55%', intensity = 1, active = true }) {
  const containerRef = useRef(null);
  const tlRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Check reduced motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const wisps = containerRef.current.querySelectorAll('.steam-wisp');
    if (!wisps.length) return;

    const tl = gsap.timeline();

    wisps.forEach((wisp, i) => {
      const delay = i * 0.6 + Math.random() * 0.4;
      const duration = 2.5 + Math.random() * 1.5;
      const xDrift = (Math.random() - 0.5) * 30;
      const xDrift2 = (Math.random() - 0.5) * 15;
      const maxOpacity = (0.25 + Math.random() * 0.2) * intensity;
      const scaleEnd = (0.3 + Math.random() * 0.4) * intensity;

      tl.to(wisp, {
        y: -(60 + Math.random() * 40),
        x: xDrift,
        opacity: maxOpacity,
        scale: 0.8,
        duration: duration * 0.4,
        ease: 'power1.out',
        delay: delay,
      }, 0);

      tl.to(wisp, {
        y: -(120 + Math.random() * 60),
        x: xDrift + xDrift2,
        opacity: 0,
        scale: scaleEnd,
        duration: duration * 0.6,
        ease: 'power1.in',
      }, `>${-duration * 0.05}`);
    });

    // Make timeline repeat infinitely
    tl.repeat(-1);
    tl.repeatDelay(0.3);
    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, [active, count, intensity]);

  if (!active) return null;

  const wisps = [];
  for (let i = 0; i < count; i++) {
    const left = 40 + (Math.random() * 20);
    const size = 8 + Math.random() * 8;
    wisps.push(
      <div
        key={i}
        className="steam-wisp"
        style={{
          left: `${left}%`,
          bottom: 0,
          width: `${size}px`,
          height: `${size * 1.6}px`,
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="steam-container"
      style={{
        bottom: originY,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100px',
        height: '120px',
      }}
    >
      {wisps}
    </div>
  );
}
