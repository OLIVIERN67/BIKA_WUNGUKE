import { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '../../utils/format';

type Tone = 'green' | 'red' | 'blue' | 'amber' | 'slate' | 'violet';

const toneMap: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = 'slate', className, children, ...rest }: BadgeProps) {
  return (
    <span className={classNames('badge', toneMap[tone], className)} {...rest}>
      {children}
    </span>
  );
}
