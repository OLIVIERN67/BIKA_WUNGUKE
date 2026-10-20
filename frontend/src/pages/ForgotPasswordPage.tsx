import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';
import * as authService from '../services/auth.service';
import { getErrorMessage } from '../services/api';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const GENERIC_RESET_MESSAGE =
  'We have received your request. If an account exists with that email address, ' +
  'you will receive a password-reset link shortly. Please check your inbox and spam folder.';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError(t('forgot.emailRequired'));
      return;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setError(t('forgot.emailInvalid'));
      return;
    }
    setError(undefined);

    setLoading(true);
    try {
      await authService.forgotPassword(value);
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="form-card">
        <CardBody className="p-6 sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
            <MailCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('forgot.sentTitle')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('forgot.sentBody')}</p>
          <div className="mt-6 space-y-3">
            <Link to="/login" className="btn-primary w-full">
              {t('forgot.backToSignIn')}
            </Link>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="btn-ghost w-full"
            >
              {t('forgot.useDifferentEmail')}
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="form-card">
      <CardBody className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            BIKA WUNGUKE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t('forgot.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('forgot.intro')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('forgot.email')}
            required
            type="email"
            autoComplete="email"
            placeholder={t('forgot.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" fullWidth loading={loading}>
            <Send className="h-4 w-4" /> {t('forgot.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" /> {t('forgot.backToSignIn')}
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
