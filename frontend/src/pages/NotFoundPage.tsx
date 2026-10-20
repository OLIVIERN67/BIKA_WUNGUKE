import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
        <Compass className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('notFound.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('notFound.desc')}</p>
      </div>
      <Link to="/dashboard" className="btn-primary">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
