/**
 * Corper Wee: Client Error & Crash Reporter
 * Captures uncaught runtime errors and unhandled promise rejections
 * and forwards sanitized telemetry to /api/v1/telemetry/client-error.
 */

let initialized = false;
let lastReportAt = 0;

export function reportClientError(
  message: string,
  extra?: { name?: string; stack?: string }
): void {
  const now = Date.now();
  if (now - lastReportAt < 2000) return; // client-side debounce
  lastReportAt = now;

  const payload = {
    message: String(message || 'Unknown client error').slice(0, 500),
    name: extra?.name?.slice(0, 80) || 'ClientError',
    stack: extra?.stack?.slice(0, 1500),
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    platform:
      typeof navigator !== 'undefined'
        ? `${navigator.platform || 'web'}|${window.innerWidth}x${window.innerHeight}`
        : 'unknown',
  };

  fetch('/api/v1/telemetry/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Do not throw recursively on network failure
  });
}

export function initClientErrorReporting(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    if (!event.message) return;
    reportClientError(event.message, {
      name: event.error?.name || 'WindowError',
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection');
    reportClientError(msg, {
      name: reason instanceof Error ? reason.name : 'UnhandledRejection',
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
