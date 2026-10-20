import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { classNames } from '../../utils/format';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={classNames('h-5 w-5 animate-spin text-brand-600', className)} />;
}

export function FullPageSpinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}
