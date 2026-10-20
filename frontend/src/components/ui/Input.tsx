import { InputHTMLAttributes, forwardRef, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { classNames } from '../../utils/format';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export function Field({ label, error, hint, required, children, htmlFor }: FieldWrapperProps) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        className={classNames('input', error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : '', className)}
        {...rest}
      />
    </Field>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, required, children, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <select ref={ref} id={id} className={classNames('input appearance-none', className)} {...rest}>
        {children}
      </select>
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <textarea ref={ref} id={id} className={classNames('input', className)} {...rest} />
    </Field>
  );
});
