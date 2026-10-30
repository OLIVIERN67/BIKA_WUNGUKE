import { HTMLAttributes } from 'react';
import { classNames } from '../../utils/format';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={classNames('min-w-0 break-words text-base font-semibold text-foreground', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}
