import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Card, CardBody } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import * as authService from '../services/auth.service';
import { getErrorMessage } from '../services/api';
import { PASSWORD_MAX, PASSWORD_MIN } from '../utils/constants';

type TokenStatus = 'checking' | 'valid' | 'invalid';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? 'checking' : 'invalid');
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }
    let stale = false;
    setTokenStatus('checking');
    authService
      .validateResetToken(token)
      .then(() => {
        if (stale) return;
        setCheckFailed(false);
        setTokenStatus('valid');
      })
      .catch((error) => {
        if (stale) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        // No response (offline, DNS, timeout) or a server failure means we
        // could not check the link - show a retry card instead of falsely
        // claiming the link is invalid.
        const unreachable = status === undefined || status >= 500;
        setCheckFailed(unreachable);
        setTokenStatus('invalid');
      });
    return () => {
      stale = true;
    };
  }, [token, attempt]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!newPassword) {
      next.newPassword = t('reset.required');
    } else if (newPassword.length < PASSWORD_MIN) {
      next.newPassword = t('password.min', { min: PASSWORD_MIN });
    } else if (newPassword.length > PASSWORD_MAX) {
      next.newPassword = t('password.max', { max: PASSWORD_MAX });
    }
    if (!confirmPassword) {
      next.confirmPassword = t('reset.confirmRequired');
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = t('reset.mismatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || tokenStatus !== 'valid') return;
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword, confirmPassword });
      toast.success(t('reset.success'));
      navigate('/login', { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      if (message.toLowerCase().includes('reset link')) {
        setTokenStatus('invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenStatus === 'checking') {
    return (
      <Card className="form-card">
        <CardBody className="p-8">
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Spinner className="h-7 w-7" />
            <p className="text-sm">{t('reset.checking')}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (tokenStatus === 'invalid' && checkFailed) {
    return (
      <Card className="form-card">
        <CardBody className="p-6 sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('reset.checkFailedTitle')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('reset.checkFailedBody')}
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="btn-primary w-full"
            >
              {t('common.tryAgain')}
            </button>
            <Link to="/login" className="btn-ghost w-full">
              {t('forgot.backToSignIn')}
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <Card className="form-card">
        <CardBody className="p-6 sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('reset.invalidTitle')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {token ? t('reset.invalidBody') : t('reset.missingTokenBody')}
          </p>
          <div className="mt-6 space-y-3">
            <Link to="/forgot-password" className="btn-primary w-full">
              {t('reset.requestNew')}
            </Link>
            <Link to="/login" className="btn-ghost w-full">
              {t('forgot.backToSignIn')}
            </Link>
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
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t('reset.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t('reset.intro', { min: PASSWORD_MIN })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-surface space-y-4" noValidate>
          <PasswordInput
            label={t('reset.newPassword')}
            required
            autoComplete="new-password"
            placeholder={t('register.passwordPlaceholder', { min: PASSWORD_MIN })}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            hint={t('reset.newPasswordHint', { min: PASSWORD_MIN })}
          />
          <PasswordInput
            label={t('reset.confirm')}
            required
            autoComplete="new-password"
            placeholder={t('reset.confirmPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          <Button type="submit" fullWidth loading={loading} disabled={tokenStatus !== 'valid'}>
            <KeyRound className="h-4 w-4" /> {t('reset.submit')}
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
