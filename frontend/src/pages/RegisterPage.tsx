import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Card, CardBody } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { BUSINESS_CATEGORIES, LANGUAGES, PASSWORD_MAX, PASSWORD_MIN } from '../utils/constants';

const BUSINESS_CATEGORY_KEYS: Record<string, string> = {
  'Retail and small shops': 'retail',
  'Food and beverage': 'food',
  'Market trading': 'market',
  'Clothing and footwear': 'clothing',
  'Agricultural products': 'agricultural',
  Services: 'services',
  Other: 'other',
};

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
    business_name: '',
    business_type: '',
    business_location: '',
    business_description: '',
    currency: 'RWF',
    locale: 'rw',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.full_name.trim().length < 3) next.full_name = t('register.nameRequired');
    if (!/^(\+?25)?0?7[2-9]\d{7}$/.test(form.phone.trim()))
      next.phone = t('register.phoneInvalid');
    if (!form.email.trim()) next.email = t('register.emailRequired');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      next.email = t('register.emailInvalid');
    if (form.password.length < PASSWORD_MIN)
      next.password = t('password.min', { min: PASSWORD_MIN });
    else if (form.password.length > PASSWORD_MAX)
      next.password = t('password.max', { max: PASSWORD_MAX });
    if (form.confirm_password !== form.password)
      next.confirm_password = t('register.passwordMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const result = await register({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email,
        password: form.password,
        confirm_password: form.confirm_password,
        business_name: form.business_name.trim() || undefined,
        business_type: form.business_type || undefined,
        business_location: form.business_location.trim() || undefined,
        business_description: form.business_description.trim() || undefined,
        currency: form.currency,
        locale: form.locale,
      });
      if (result.otpSent) {
        toast.success(t('register.otpSent'));
      } else {
        toast.error(t('register.otpFailed'));
      }
      // The registered email is handed to the verification screen so the user
      // never has to type it again.
      navigate('/verify-email', {
        replace: true,
        state: { email, phone: form.phone.trim(), otpSent: result.otpSent },
      });
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
          <h1 className="text-2xl font-bold text-foreground">{t('register.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-surface space-y-4">
          <Input
            label={t('register.fullName')}
            required
            placeholder={t('register.fullNamePlaceholder')}
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            error={errors.full_name}
          />
          <Input
            label={t('register.phone')}
            required
            type="tel"
            placeholder={t('register.phonePlaceholder')}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            error={errors.phone}
            hint={t('register.phoneHint')}
          />
          <Input
            label={t('register.email')}
            required
            type="email"
            autoComplete="email"
            placeholder={t('register.emailPlaceholder')}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            hint={t('register.emailHint')}
          />
          <PasswordInput
            label={t('register.password')}
            required
            autoComplete="new-password"
            placeholder={t('register.passwordPlaceholder', { min: PASSWORD_MIN })}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
          />
          <PasswordInput
            label={t('register.confirmPassword')}
            required
            autoComplete="new-password"
            placeholder={t('register.confirmPasswordPlaceholder')}
            value={form.confirm_password}
            onChange={(e) => update('confirm_password', e.target.value)}
            error={errors.confirm_password}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('register.businessName')}
              placeholder={t('register.businessNamePlaceholder')}
              value={form.business_name}
              onChange={(e) => update('business_name', e.target.value)}
            />
            <Select
              label={t('register.businessCategory')}
              value={form.business_type}
              onChange={(e) => update('business_type', e.target.value)}
            >
              <option value="">{t('common.select')}</option>
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`businessCategories.${BUSINESS_CATEGORY_KEYS[cat] ?? 'other'}`)}
                </option>
              ))}
            </Select>
            <Input
              label={t('register.businessLocation')}
              placeholder={t('register.businessLocationPlaceholder')}
              value={form.business_location}
              onChange={(e) => update('business_location', e.target.value)}
            />
            <Select
              label={t('register.preferredLanguage')}
              value={form.locale}
              onChange={(e) => update('locale', e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {t(`language.names.${l.value}`)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label={t('register.businessDescription')}
            rows={2}
            placeholder={t('register.businessDescriptionPlaceholder')}
            value={form.business_description}
            onChange={(e) => update('business_description', e.target.value)}
          />

          <Button type="submit" fullWidth loading={loading}>
            <UserPlus className="h-4 w-4" /> {t('register.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('register.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {t('register.signIn')}
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
