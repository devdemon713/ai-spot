/**
 * portalSounds.js — Web Audio API sound effects for the WCE Spot Round Portal.
 * 
 * No external audio files needed. All sounds are synthesized programmatically.
 * 
 * BROWSER REQUIREMENT: AudioContext must be created/resumed after a user gesture.
 * We attach a one-time click/touch listener to pre-warm the context so that
 * subsequent programmatic calls (e.g., from socket events) work immediately.
 */

let audioCtx = null;
let warmed = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Pre-warm the AudioContext on the first user interaction.
 * This must run once so that later calls from socket events succeed.
 */
function warmUp() {
  if (warmed) return;
  warmed = true;
  try {
    const ctx = getAudioContext();
    // Play a silent buffer to fully unlock audio on iOS/Safari
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) {
    // Ignore — audio just won't work in this browser
  }
}

// Attach warm-up listeners globally (runs once, removes itself)
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    warmUp();
    events.forEach(e => window.removeEventListener(e, handler, true));
  };
  events.forEach(e => window.addEventListener(e, handler, { capture: true, passive: true }));
}

/**
 * Play a single tone.
 */
function playTone(ctx, frequency, startTime, duration, volume = 0.15, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Break Bell — A pleasant, warm bell chime sequence (~10 seconds).
 * Sounds like a school/college bell: three ascending chimes, 
 * then a gentle repeating pattern that fades out.
 */
export function playBreakBell() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Initial attention chimes — three ascending bell strikes
    const bellFreqs = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
    bellFreqs.forEach((freq, i) => {
      playTone(ctx, freq, now + i * 0.4, 1.2, 0.18, 'sine');
      // Add harmonic overtone for bell character
      playTone(ctx, freq * 2, now + i * 0.4, 0.8, 0.06, 'sine');
      playTone(ctx, freq * 3, now + i * 0.4, 0.5, 0.03, 'sine');
    });

    // Gentle repeating pattern (fading) — school bell feel
    const patternFreqs = [783.99, 659.25, 523.25, 659.25]; // G5, E5, C5, E5
    for (let rep = 0; rep < 3; rep++) {
      const repStart = now + 2.0 + rep * 2.5;
      const fadeVolume = 0.14 * (1 - rep * 0.3); // Gradually quieter

      patternFreqs.forEach((freq, i) => {
        playTone(ctx, freq, repStart + i * 0.35, 0.9, fadeVolume, 'sine');
        playTone(ctx, freq * 2, repStart + i * 0.35, 0.5, fadeVolume * 0.3, 'sine');
      });
    }

    // Final sustained chord (warm fade)
    const chordStart = now + 9.0;
    [523.25, 659.25, 783.99].forEach((freq) => {
      playTone(ctx, freq, chordStart, 1.5, 0.08, 'sine');
    });

  } catch (e) {
    console.warn('Break bell sound failed:', e);
  }
}

/**
 * Notification Ping — A short, clear attention sound (~0.5s).
 * Two-tone ascending ping, professional and non-annoying.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First tone — warm base
    playTone(ctx, 587.33, now, 0.25, 0.2, 'sine');         // D5
    playTone(ctx, 587.33 * 2, now, 0.15, 0.06, 'sine');    // D6 overtone

    // Second tone — bright resolve (higher)
    playTone(ctx, 880, now + 0.15, 0.35, 0.22, 'sine');    // A5
    playTone(ctx, 880 * 2, now + 0.15, 0.2, 0.05, 'sine'); // A6 overtone

    // Subtle third — adds depth
    playTone(ctx, 1174.66, now + 0.25, 0.3, 0.08, 'sine'); // D6

  } catch (e) {
    console.warn('Notification sound failed:', e);
  }
}

/**
 * Urgent Notification Sound — Slightly more assertive (~0.7s).
 * Three quick ascending tones.
 */
export function playUrgentSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Three quick ascending tones
    playTone(ctx, 523.25, now, 0.15, 0.2, 'triangle');       // C5
    playTone(ctx, 659.25, now + 0.12, 0.15, 0.22, 'triangle'); // E5
    playTone(ctx, 880, now + 0.24, 0.4, 0.25, 'sine');        // A5
    playTone(ctx, 880 * 2, now + 0.24, 0.25, 0.08, 'sine');   // A6

  } catch (e) {
    console.warn('Urgent sound failed:', e);
  }
}
