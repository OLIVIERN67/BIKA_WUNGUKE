import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Globe, KeyRound, Save, User as UserIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/auth.service';
import { getErrorMessage } from '../services/api';
import { BUSINESS_CATEGORIES, CURRENCIES, LANGUAGES, PASSWORD_MAX, PASSWORD_MIN } from '../utils/constants';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    business_name: user?.business_name ?? '',
    business_type: user?.business_type ?? '',
    business_location: user?.business_location ?? '',
    business_description: user?.business_description ?? '',
    currency: user?.currency ?? 'RWF',
    locale: user?.locale ?? 'rw',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authService.updateProfile({
        full_name: profile.full_name.trim(),
        email: profile.email.trim(),
        business_name: profile.business_name.trim(),
        business_type: profile.business_type.trim(),
        business_location: profile.business_location.trim(),
        business_description: profile.business_description.trim(),
        currency: profile.currency,
        locale: profile.locale,
      });
      updateUser(updated);
      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwords.new_password.length < PASSWORD_MIN) {
      toast.error(t('password.min', { min: PASSWORD_MIN }));
      return;
    }
    if (passwords.new_password.length > PASSWORD_MAX) {
      toast.error(t('password.max', { max: PASSWORD_MAX }));
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      // Changing the password invalidates every outstanding session (token_version).
      toast.success(t('settings.passwordChanged'));
      logout();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Card className="form-card">
        <CardHeader>
          <div>
            <CardTitle>{t('settings.preferencesTitle')}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.preferencesDesc')}</p>
          </div>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher variant="header" />
            <ThemeToggle />
          </div>
        </CardBody>
      </Card>

      <Card className="form-card">
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardBody>
          <form onSubmit={handleProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('settings.fullName')}
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
              <Input
                label={t('settings.phone')}
                value={user?.phone ?? ''}
                disabled
                hint={t('settings.phoneHint')}
              />
              <Input
                label={t('settings.email')}
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
              <Input
                label={t('settings.businessName')}
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              />
              <Select
                label={t('settings.businessCategory')}
                value={profile.business_type}
                onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
              >
                <option value="">{t('common.select')}</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                label={t('settings.businessLocation')}
                placeholder={t('settings.businessLocationPlaceholder')}
                value={profile.business_location}
                onChange={(e) => setProfile({ ...profile, business_location: e.target.value })}
              />
              <Select
                label={t('register.preferredLanguage')}
                value={profile.locale}
                onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
              <Select
                label={t('settings.currency')}
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              label={t('settings.businessDescription')}
              rows={2}
              placeholder={t('settings.businessDescriptionPlaceholder')}
              value={profile.business_description}
              onChange={(e) => setProfile({ ...profile, business_description: e.target.value })}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                <Save className="h-4 w-4" /> {t('settings.saveProfile')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="form-card">
        <CardHeader>
          <CardTitle>{t('settings.changePassword')}</CardTitle>
          <KeyRound className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardBody>
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <PasswordInput
                label={t('settings.currentPassword')}
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                required
              />
              <PasswordInput
                label={t('settings.newPassword')}
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                required
              />
              <PasswordInput
                label={t('settings.confirmPassword')}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                <KeyRound className="h-4 w-4" /> {t('settings.updatePassword')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
