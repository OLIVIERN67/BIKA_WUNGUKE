import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MailCheck, RotateCw, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import * as authService from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

const OTP_LENGTH = 6;
const CODE_TTL_SECONDS = 5 * 60;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

interface VerifyLocationState {
  email?: string;
  phone?: string;
  otpSent?: boolean;
  maskedEmail?: string | null;
}

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VerifyLocationState | null) ?? {};

  // The account is identified by the email registered (registration flow) or
  // the phone number entered at sign-in. Only when neither is known do we ask
  // the user for an email.
  const knownEmail = state.email ? state.email.trim().toLowerCase() : '';
  const knownPhone = state.phone ? state.phone.trim() : '';
  const [email, setEmail] = useState(knownEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const needsContact = !knownEmail && !knownPhone;
  const maskedEmail = state.maskedEmail ?? (knownEmail ? maskEmail(knownEmail) : undefined);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(state.otpSent === false ? 0 : 60);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = window.setTimeout(() => setExpiresIn((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [expiresIn]);

  const code = digits.join('');

  /** Returns the identity payload, or null if we still need an email. */
  const resolveIdentity = (): { email?: string; phone?: string } | null => {
    if (needsContact) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        setEmailError(t('register.emailInvalid'));
        return null;
      }
      setEmailError(undefined);
      setEmail(trimmed);
      return { email: trimmed };
    }
    return knownEmail ? { email: knownEmail } : { phone: knownPhone };
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    setDigit(index, e.target.value);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const identity = resolveIdentity();
    if (!identity) return;
    if (code.length !== OTP_LENGTH) {
      setError(t('verify.enterAll'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      // A successful verify authenticates the account (the backend returns a
      // session token); the context stores it so the user is now signed in.
      await verifyEmail({ ...identity, otp: code });
      toast.success(t('verify.success'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const identity = resolveIdentity();
    if (!identity) return;
    setResending(true);
    setError(undefined);
    try {
      await authService.resendOtp(identity);
      toast.success(t('verify.resent'));
      setDigits(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
      setExpiresIn(CODE_TTL_SECONDS);
      inputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const expiresLabel =
    expiresIn > 0
      ? t('verify.expiresIn', { minutes: Math.floor(expiresIn / 60), seconds: expiresIn % 60 })
      : t('verify.expired');

  return (
    <Card className="form-card">
      <CardBody className="p-6 sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
          <MailCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('verify.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('verify.intro')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {maskedEmail
            ? t('verify.sentTo', { email: maskedEmail })
            : t('verify.sentToGeneric')}
        </p>

        {state.otpSent === false && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {t('verify.sendFailed')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-surface mt-6 space-y-5" noValidate>
          {needsContact && (
            <Input
              label={t('register.email')}
              required
              type="email"
              autoComplete="email"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              hint={t('verify.enterEmailHint')}
            />
          )}

          <div className="flex justify-between gap-1.5 min-[380px]:gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={t('verify.digitLabel', { index: index + 1 })}
                className="h-14 w-full rounded-xl border border-input bg-card text-center text-2xl font-bold text-foreground shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:bg-background"
              />
            ))}
          </div>

          {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

          {state.otpSent !== false && (
            <p className={`text-xs ${expiresIn > 0 ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
              {expiresLabel}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading} disabled={code.length !== OTP_LENGTH}>
            <ShieldCheck className="h-4 w-4" /> {t('verify.submit')}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={resending}
            disabled={cooldown > 0}
            onClick={handleResend}
          >
            <RotateCw className="h-4 w-4" />
            {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
          </Button>

          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" /> {t('verify.backToSignIn')}
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
