import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { isVerificationRequired } from '../types';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!phone.trim()) next.phone = t('login.phoneRequired');
    if (!password) next.password = t('login.passwordRequired');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const result = await login(phone.trim(), password);
      // Unverified account: the backend already emailed a fresh OTP. Move the
      // user to the verification screen without starting a session.
      if (isVerificationRequired(result)) {
        toast.success(
          result.otpSent ? t('verify.codeSent') : t('verify.sendFailed'),
        );
        navigate('/verify-email', {
          replace: true,
          state: {
            phone: phone.trim(),
            maskedEmail: result.maskedEmail,
            otpSent: result.otpSent,
          },
        });
        return;
      }
      toast.success(t('login.welcomeBack'));
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="form-card">
      <CardBody className="p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-surface space-y-4">
          <Input
            label={t('login.phone')}
            required
            type="tel"
            autoComplete="username"
            placeholder={t('login.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
          <Input
            label={t('login.password')}
            required
            type="password"
            autoComplete="current-password"
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <div className="-mt-1 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              {t('login.forgot')}
            </Link>
          </div>
          <Button type="submit" fullWidth loading={loading}>
            <LogIn className="h-4 w-4" /> {t('login.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {t('login.createOne')}
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
