import { useTranslation } from 'react-i18next';
import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { ThemePreference } from '../context/ThemeContext';
import { classNames } from '../utils/format';

const OPTIONS: Array<{ value: ThemePreference; icon: typeof Sun; labelKey: string }> = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
];

interface ThemeToggleProps {
  /** Render light-on-dark colors for use on the auth gradient. */
  onDark?: boolean;
  className?: string;
}

export function ThemeToggle({ onDark = false, className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const CurrentIcon = OPTIONS.find((option) => option.value === preference)?.icon ?? Monitor;

  return (
    <div className={classNames('relative flex items-center', className)}>
      <CurrentIcon
        className={classNames(
          'pointer-events-none absolute left-3 h-3.5 w-3.5',
          onDark ? 'text-white/70' : 'text-slate-400 dark:text-slate-500',
        )}
        aria-hidden
      />
      <select
        value={preference}
        onChange={(event) => setPreference(event.target.value as ThemePreference)}
        aria-label={t('theme.toggle')}
        className={classNames(
          'toggle-select',
          onDark
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-border bg-card text-foreground hover:bg-muted',
        )}
      >
        {OPTIONS.map(({ value, labelKey }) => (
          <option key={value} value={value} className="bg-card text-foreground">
            {t(labelKey)}
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
