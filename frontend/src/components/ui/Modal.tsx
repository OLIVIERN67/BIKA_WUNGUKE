import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { classNames } from '../../utils/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay safe-x fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className={classNames(
          'modal-panel safe-b w-full overflow-hidden rounded-t-2xl border border-border text-card-foreground sm:rounded-2xl',
          sizeMap[size],
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <h2 className="min-w-0 break-words text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="icon-btn -mr-2 shrink-0 hover:bg-muted hover:text-foreground"
              aria-label={t('modal.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[72dvh] overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[75vh] sm:px-5">
          {children}
        </div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
