import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * LiveNotification — Premium animated notification card.
 *
 * Props:
 *   alert     — { message, type, sentAt, sentBy } or null
 *   onDismiss — callback to clear the alert
 */

const TYPE_CONFIG = {
  info:    { icon: 'ℹ️',  label: 'Notice',  iconAnim: 'notif-icon-pulse' },
  success: { icon: '✅', label: 'Update',  iconAnim: 'notif-icon-rotate' },
  warning: { icon: '⚠️',  label: 'Warning', iconAnim: 'notif-icon-shake' },
  urgent:  { icon: '🚨', label: 'URGENT',  iconAnim: 'notif-icon-urgent-pulse' },
};

const TYPE_GLOW = {
  info:    'rgba(37, 99, 235, 0.15)',
  success: 'rgba(5, 150, 105, 0.15)',
  warning: 'rgba(217, 119, 6, 0.2)',
  urgent:  'rgba(139, 26, 26, 0.25)',
};

export default function LiveNotification({ alert, onDismiss }) {
  const [showRipple, setShowRipple] = useState(false);
  const [iconAnimClass, setIconAnimClass] = useState('');
  const entryTimerRef = useRef(null);

  useEffect(() => {
    if (alert) {
      // Show ripple briefly
      setShowRipple(true);
      const rippleTimer = setTimeout(() => setShowRipple(false), 600);

      // Icon animation with delay
      setIconAnimClass('');
      entryTimerRef.current = setTimeout(() => {
        const cfg = TYPE_CONFIG[alert.type] || TYPE_CONFIG.info;
        setIconAnimClass(cfg.iconAnim);
      }, 350);

      return () => {
        clearTimeout(rippleTimer);
        if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
      };
    }
  }, [alert]);

  const cfg = TYPE_CONFIG[alert?.type] || TYPE_CONFIG.info;
  const alertType = alert?.type || 'info';
  const glowColor = TYPE_GLOW[alertType] || TYPE_GLOW.info;

  return (
    <AnimatePresence>
      {alert && (
        <div className="live-notification-wrapper">
          {/* Screen-edge attention glow */}
          <motion.div
            style={{
              position: 'fixed',
              bottom: 0,
              right: 0,
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 9998,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          <motion.div
            className="live-notification"
            initial={{ opacity: 0, x: 80, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95, filter: 'blur(4px)' }}
            transition={{
              enter: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
              exit: { duration: 0.35, ease: [0.4, 0, 1, 1] }
            }}
          >
            {/* Ripple */}
            {showRipple && (
              <div className={`live-notification__ripple live-notification__ripple--${alertType}`} />
            )}

            {/* Accent stripe */}
            <div className={`live-notification__accent live-notification__accent--${alertType}`} />

            {/* LIVE sound badge */}
            <motion.div
              style={{
                position: 'absolute',
                top: '-8px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '10px',
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                background: alertType === 'urgent' ? '#8B1A1A' : alertType === 'warning' ? '#B45309' : alertType === 'success' ? '#059669' : '#2563EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 1,
              }}
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Sound wave bars */}
              <span style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5px', height: '10px' }}>
                <span className="notif-sound-bar" style={{ width: '2px', height: '4px', background: '#fff', borderRadius: '1px', animation: 'notif-sound-wave 0.8s ease-in-out infinite' }} />
                <span className="notif-sound-bar" style={{ width: '2px', height: '8px', background: '#fff', borderRadius: '1px', animation: 'notif-sound-wave 0.8s ease-in-out 0.15s infinite' }} />
                <span className="notif-sound-bar" style={{ width: '2px', height: '5px', background: '#fff', borderRadius: '1px', animation: 'notif-sound-wave 0.8s ease-in-out 0.3s infinite' }} />
              </span>
              LIVE
            </motion.div>

            {/* Body */}
            <div className="live-notification__body">
              {/* Icon */}
              <motion.div
                className={`live-notification__icon live-notification__icon--${alertType} ${iconAnimClass}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {cfg.icon}
              </motion.div>

              {/* Text */}
              <div className="live-notification__text">
                <motion.div
                  className="live-notification__label"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  WCE Admin · {cfg.label}
                </motion.div>
                <motion.div
                  className="live-notification__title"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  🔔 Live Announcement
                </motion.div>
                <motion.div
                  className="live-notification__message"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.35 }}
                >
                  {alert.message}
                </motion.div>
                {alert.sentAt && (
                  <motion.div
                    className="live-notification__time"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    {new Date(alert.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </motion.div>
                )}
              </div>

              {/* Close */}
              <button
                className="live-notification__close"
                onClick={onDismiss}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>

            {/* Progress bar — synced to existing 7s lifecycle */}
            <div className="live-notification__progress">
              <div className={`live-notification__progress-fill live-notification__progress-fill--${alertType}`} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
