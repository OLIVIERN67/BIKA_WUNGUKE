import toast from 'react-hot-toast';
import i18n from '../i18n';

const DEDUPE_MS = 3000;
let lastMessage = '';
let lastAt = 0;

/** Shows an error toast, collapsing repeats that arrive within a few seconds. */
function report(message: string): void {
  const now = Date.now();
  if (message === lastMessage && now - lastAt < DEDUPE_MS) return;
  lastMessage = message;
  lastAt = now;
  toast.error(message);
}

function messageFromRejection(reason: unknown): string {
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return i18n.t('errors.unexpected');
}

/**
 * Safety net for anything that escapes component-level handling: unhandled
 * promise rejections and uncaught runtime errors surface as a user-visible
 * toast instead of failing silently in the console.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    console.error('[global] unhandled promise rejection', event.reason);
    report(messageFromRejection(event.reason));
  });

  window.addEventListener('error', (event) => {
    // Resource load errors (img/script/css) bubble here with a non-window target
    // and no useful message - only report real runtime errors.
    if (event.target && event.target !== window && 'tagName' in event.target) return;
    if (!event.message) return;
    console.error('[global] uncaught error', event.error ?? event.message);
    report(event.message || i18n.t('errors.unexpected'));
  });
}
