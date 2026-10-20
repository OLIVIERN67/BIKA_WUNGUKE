import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 lg:flex-row">
      <div className="flex flex-col justify-center gap-6 px-8 py-12 text-white lg:w-1/2 lg:px-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">BIKA WUNGUKE</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="header" onDark />
            <ThemeToggle onDark />
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            {t('common.tagline')}
          </h1>
          <p className="mt-4 text-white/85">{t('authLayout.pitch')}</p>
        </div>
        <ul className="mt-2 space-y-2 text-sm text-white/85">
          <li>• {t('authLayout.bullet1')}</li>
          <li>• {t('authLayout.bullet2')}</li>
          <li>• {t('authLayout.bullet3')}</li>
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 via-background to-slate-100 px-4 py-10 lg:px-10 dark:from-slate-950 dark:via-background dark:to-slate-900">
        <div className="w-full max-w-md">
          <div className="auth-form-container">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
