import i18n from '../i18n';

export function currentIntlLocale(): string {
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

export function formatMoney(amount: number | string, currency = 'RWF'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return `${currency} 0`;
  return `${currency} ${value.toLocaleString(currentIntlLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatMoneyDetailed(amount: number | string, currency = 'RWF'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return `${currency} 0.00`;
  return `${currency} ${value.toLocaleString(currentIntlLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
