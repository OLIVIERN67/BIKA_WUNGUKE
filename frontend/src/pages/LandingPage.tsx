import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Coins,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Receipt,
    titleKey: 'landing.f1Title',
    textKey: 'landing.f1Text',
  },
  {
    icon: PiggyBank,
    titleKey: 'landing.f2Title',
    textKey: 'landing.f2Text',
  },
  {
    icon: BarChart3,
    titleKey: 'landing.f3Title',
    textKey: 'landing.f3Text',
  },
  {
    icon: Smartphone,
    titleKey: 'landing.f4Title',
    textKey: 'landing.f4Text',
  },
  {
    icon: ShieldCheck,
    titleKey: 'landing.f5Title',
    textKey: 'landing.f5Text',
  },
  {
    icon: Coins,
    titleKey: 'landing.f6Title',
    textKey: 'landing.f6Text',
  },
];

const TRUST_KEYS = ['landing.trust1', 'landing.trust2', 'landing.trust3'];

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="safe-x min-h-dvh bg-card">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-foreground">BIKA WUNGUKE</span>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          <Link to="/login" className="btn-ghost">
            {t('landing.signIn')}
          </Link>
          <Link to="/register" className="btn-primary">
            {t('landing.getStarted')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {t('landing.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
            {t('common.tagline')}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t('landing.heroText')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">
              {t('landing.createFree')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn-secondary">
              {t('landing.haveAccount')}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {TRUST_KEYS.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-500" /> {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="card overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('landing.previewMonth')}
                </p>
                <p className="text-2xl font-bold text-foreground">RWF 184,500</p>
              </div>
              <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                +12%
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {t('landing.previewIncome')}
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  RWF 240,000
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950">
                <p className="text-xs text-red-600 dark:text-red-400">{t('landing.previewExpenses')}</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">RWF 55,500</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {[80, 55, 35, 65, 45, 90].map((h, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${h}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t('landing.previewNote')}</p>
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t('landing.featuresTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            {t('landing.featuresSubtitle')}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, titleKey, textKey }) => (
              <div key={titleKey} className="card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(textKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t('landing.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t('landing.ctaText')}</p>
        <Link to="/register" className="btn-primary mt-6">
          {t('landing.ctaButton')} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="safe-b border-t border-border py-6 text-center text-xs text-muted-foreground">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
