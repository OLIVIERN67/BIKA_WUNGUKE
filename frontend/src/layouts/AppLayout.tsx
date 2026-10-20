import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  PieChart,
  Receipt,
  Settings,
  Tags,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { classNames, initials } from '../utils/format';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';

const navigation = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transactions', labelKey: 'nav.transactions', icon: Receipt },
  { to: '/summaries', labelKey: 'nav.summaries', icon: PieChart },
  { to: '/savings', labelKey: 'nav.savings', icon: PiggyBank },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/financial-record', labelKey: 'nav.financialRecord', icon: FileText },
  { to: '/categories', labelKey: 'nav.categories', icon: Tags },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Wallet className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-extrabold tracking-tight text-foreground">BIKA WUNGUKE</p>
        <p className="text-[10px] text-muted-foreground">Bika neza. Cunga neza.</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-1 flex-col gap-1">
      {navigation.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            classNames(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-5 lg:flex">
        <BrandMark />
        <div className="mt-6 flex-1">
          <NavItems />
        </div>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {initials(user?.full_name ?? 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{user?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.business_name ?? user?.phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" /> {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card px-4 py-5">
            <div className="flex items-center justify-between">
              <BrandMark />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t('nav.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" /> {t('nav.signOut')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mr-auto lg:hidden">
            <BrandMark />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="header" />
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label={t('nav.openMenu')}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-border bg-card px-4 py-4 text-center text-xs text-muted-foreground">
          <Coins className="mr-1 inline h-3.5 w-3.5" />
          {t('footer.text')}
        </footer>
      </div>
    </div>
  );
}





