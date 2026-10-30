import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import type { SupportedLanguage } from '../i18n';
import { classNames } from '../utils/format';

interface LanguageSwitcherProps {
  variant?: 'sidebar' | 'header';
  /** Render light-on-dark colors for use on the auth gradient. */
  onDark?: boolean;
  className?: string;
}

export function LanguageSwitcher({ variant = 'sidebar', onDark = false, className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className={classNames('relative flex items-center', className)}>
      <Globe
        className={classNames(
          'pointer-events-none absolute left-3 h-3.5 w-3.5',
          onDark ? 'text-white/70' : 'text-slate-400 dark:text-slate-500',
        )}
        aria-hidden
      />
      <select
        value={i18n.language}
        onChange={(event) => changeLanguage(event.target.value as SupportedLanguage)}
        aria-label={t('language.switcher')}
        className={classNames(
          'toggle-select',
          onDark
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-border bg-card text-foreground hover:bg-muted',
          variant === 'header' && 'sm:text-sm',
        )}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang} className="bg-card text-foreground">
            {t(`language.names.${lang}`)}
          </option>
        ))}
      </select>
      <ChevronDown
        className={classNames(
          'pointer-events-none absolute right-2.5 h-3.5 w-3.5',
          onDark ? 'text-white/70' : 'text-muted-foreground',
        )}
        aria-hidden
      />
    </div>
  );
}
