import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="safe-x flex min-h-dvh flex-col bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 lg:flex-row">
      <div className="flex shrink-0 flex-col justify-center gap-4 px-5 py-6 text-white sm:gap-6 sm:px-8 sm:py-10 lg:w-1/2 lg:px-16 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="truncate text-lg font-extrabold tracking-tight sm:text-xl">BIKA WUNGUKE</span>
          </div>
          <div className="flex w-full flex-col items-start gap-2 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:items-center">
            <LanguageSwitcher variant="header" onDark />
            <ThemeToggle onDark />
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
            {t('common.tagline')}
          </h1>
          <p className="mt-4 hidden text-white/85 sm:block">{t('authLayout.pitch')}</p>
        </div>
        <ul className="mt-1 hidden space-y-2 text-sm text-white/85 lg:block">
          <li>• {t('authLayout.bullet1')}</li>
          <li>• {t('authLayout.bullet2')}</li>
          <li>• {t('authLayout.bullet3')}</li>
        </ul>
      </div>

      <div className="auth-form-shell flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="w-full max-w-md">
          <div className="auth-form-container">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
