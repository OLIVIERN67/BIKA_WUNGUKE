import i18n from '../i18n';

function currentIntlLocale(): string {
  const lang = i18n.language;
  switch (lang) {
    case 'fr':
      return 'fr-FR';
    case 'rw':
      return 'rw-RW';
    default:
      return 'en-GB';
  }
}

/** Formats a Date as YYYY-MM-DD in the user's local timezone. */
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function firstOfMonthISO(): string {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as first day
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return localISO(monday);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localISO(d);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(currentIntlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(currentIntlLocale(), { day: '2-digit', month: 'short' });
}

export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(currentIntlLocale(), { month: 'short', year: '2-digit' });
}

export function gregorianToReadable(value: string): string {
  return formatDate(value);
}
