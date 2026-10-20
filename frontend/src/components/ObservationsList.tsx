import { Info, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Observation } from '../types';

interface Props {
  observations: Observation[];
  periodLabel?: string;
  loading?: boolean;
}

const toneMap = {
  info: {
    icon: Info,
    cls: 'border-sky-100 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
  },
  positive: {
    icon: TrendingUp,
    cls: 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  },
  warning: {
    icon: AlertTriangle,
    cls: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
};

/** Converts a kebab-case observation id ("no-records") to the camelCase i18n key ("noRecords"). */
function i18nKey(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function ObservationsList({ observations, periodLabel, loading }: Props) {
  const { t, i18n } = useTranslation();

  const localize = (obs: Observation, field: 'text' | 'basis'): string => {
    const key = `observations.${i18nKey(obs.id)}.${field}`;
    const translated = obs.params
      ? t(key, obs.params as Record<string, string | number>)
      : t(key, { defaultValue: '' });
    // Fall back to the backend-provided English string when no translation exists.
    if (!translated || translated === key) return field === 'text' ? obs.text : obs.basis;
    return translated;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('observations.title')}</CardTitle>
        <span className="text-xs text-muted-foreground">{t('observations.subtitle')}</span>
      </CardHeader>
      <div className="px-4 pb-4">
        <p className="mb-3 text-xs text-muted-foreground">{t('observations.disclaimer')}</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('observations.checking')}</p>
        ) : observations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('observations.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {observations.map((obs) => {
              const tone = toneMap[obs.tone];
              const Icon = tone.icon;
              return (
                <li key={`${obs.id}-${i18n.language}`} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${tone.cls}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {localize(obs, 'text')}
                      {periodLabel ? (
                        <span className="ml-2 text-xs opacity-70">[{periodLabel}]</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      <strong>{t('observations.basedOn')}</strong> {localize(obs, 'basis')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
