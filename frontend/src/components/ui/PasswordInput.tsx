import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Field, InputProps } from './Input';
import { classNames } from '../../utils/format';

export type PasswordInputProps = Omit<InputProps, 'type'>;

/**
 * Password field with a show/hide toggle button.
 * The entered value is never trimmed or otherwise modified.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, hint, required, id, className, ...rest }, ref) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={fieldId}>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            className={classNames('input pr-11', error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : '', className)}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('password.hide') : t('password.show')}
            aria-pressed={visible}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
    );
  },
);
