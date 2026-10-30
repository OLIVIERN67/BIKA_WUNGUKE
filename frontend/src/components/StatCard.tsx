import { ReactNode } from 'react';
import { classNames } from '../utils/format';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: 'green' | 'red' | 'blue' | 'violet' | 'amber';
}

const toneMap = {
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  blue: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
};

export function StatCard({ label, value, hint, icon, tone = 'green' }: StatCardProps) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-foreground sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 break-words text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneMap[tone])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
