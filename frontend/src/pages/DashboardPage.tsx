import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
  PiggyBank,
  Plus,
  Receipt,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../components/StatCard';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { useAuth } from '../context/AuthContext';
import { formatMoney, classNames } from '../utils/format';
import { firstOfMonthISO, formatDate, startOfWeekISO, todayISO } from '../utils/date';
import * as dashboardService from '../services/dashboard.service';
import * as savingsService from '../services/savings.service';
import { listCategories } from '../services/category.service';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import {
  Category,
  CategoryBreakdown,
  DashboardSummary,
  SavingsGoalProgress,
  Transaction,
  TrendPoint,
} from '../types';

type Period = 'week' | 'month' | 'custom';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currency = user?.currency ?? 'RWF';

  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(firstOfMonthISO());
  const [customTo, setCustomTo] = useState(todayISO());

  const PERIODS = useMemo<Array<{ value: Period; label: string }>>(
    () => [
      { value: 'week', label: t('period.week') },
      { value: 'month', label: t('period.month') },
      { value: 'custom', label: t('period.custom') },
    ],
    [t],
  );

  const range = useMemo(() => {
    if (period === 'week') return { from: startOfWeekISO(), to: todayISO() };
    if (period === 'month') return { from: firstOfMonthISO(), to: todayISO() };
    return { from: customFrom, to: customTo };
  }, [period, customFrom, customTo]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoalProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, trendData, breakdownData, recentData, goalsData] = await Promise.all([
        dashboardService.getSummary(range),
        dashboardService.getTrend(30, range),
        dashboardService.getCategoryBreakdown('expense', range),
        dashboardService.getRecent(5),
        savingsService.listGoals(),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setBreakdown(breakdownData);
      setRecent(recentData);
      setGoals(goalsData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let stale = false;
    listCategories()
      .then((items) => {
        if (!stale) setCategories(items);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
    return () => {
      stale = true;
    };
  }, []);

  const netPositive = (summary?.netCashFlow ?? 0) >= 0;
  const hasRecords = (summary?.transactionCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('dashboard.greeting', { name: user?.full_name?.split(' ')[0] ?? '' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.business_name
              ? t('dashboard.subtitleWithBusiness', { business: user.business_name })
              : t('dashboard.subtitle')}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> {t('dashboard.addRecord')}
        </Button>
      </div>

      {/* Period filter */}
      <Card>
        <CardBody className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label mb-1.5">{t('period.label')}</p>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={classNames(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition',
                    period === p.value
                      ? 'bg-card text-brand-700 shadow-sm dark:text-brand-300'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Input label={t('period.from')} type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input label={t('period.to')} type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <FullPageSpinner label={t('dashboard.loading')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t('dashboard.totalIncome')}
              value={formatMoney(summary?.totalIncome ?? 0, currency)}
              icon={<ArrowUpCircle className="h-5 w-5" />}
              tone="green"
              hint={t('dashboard.totalIncomeHint')}
            />
            <StatCard
              label={t('dashboard.totalExpenses')}
              value={formatMoney(summary?.totalExpense ?? 0, currency)}
              icon={<ArrowDownCircle className="h-5 w-5" />}
              tone="red"
              hint={t('dashboard.totalExpensesHint')}
            />
            <StatCard
              label={t('dashboard.netCashFlow')}
              value={formatMoney(summary?.netCashFlow ?? 0, currency)}
              icon={<Scale className="h-5 w-5" />}
              tone={netPositive ? 'blue' : 'red'}
              hint={t('dashboard.netHint')}
            />
            <StatCard
              label={t('dashboard.savingsBalance')}
              value={formatMoney(summary?.savings.balance ?? 0, currency)}
              icon={<PiggyBank className="h-5 w-5" />}
              tone="violet"
              hint={t('dashboard.savingsHint')}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>{t('dashboard.noteStrong')}</strong> {t('dashboard.noteRest')}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('dashboard.cashFlow')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('dashboard.cashFlowSub')}</span>
              </CardHeader>
              <CardBody>
                {trend.some((p) => p.income > 0 || p.expense > 0) ? (
                  <IncomeExpenseChart data={trend} currency={currency} />
                ) : (
                  <EmptyState
                    title={t('dashboard.noRecordsTitle')}
                    description={t('dashboard.noRecordsDesc')}
                    icon={<Receipt className="h-6 w-6" />}
                    action={
                      <Button size="sm" onClick={() => setFormOpen(true)}>
                        <Plus className="h-4 w-4" /> {t('dashboard.addFirst')}
                      </Button>
                    }
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('dashboard.thisPeriod')}</span>
              </CardHeader>
              <CardBody>
                {breakdown.length > 0 ? (
                  <CategoryPieChart data={breakdown} currency={currency} />
                ) : (
                  <EmptyState title={t('dashboard.nothingToShow')} description={t('dashboard.recordedExpensesHere')} />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.savingsGoals')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('dashboard.keptSeparate')}</span>
              </CardHeader>
              <CardBody>
                {goals.length === 0 ? (
                  <EmptyState
                    title={t('dashboard.noSavingsTitle')}
                    description={t('dashboard.noSavingsDesc')}
                    icon={<PiggyBank className="h-6 w-6" />}
                  />
                ) : (
                  <div className="space-y-4">
                    {goals.map((g) => (
                      <div key={g.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{g.name}</span>
                          <span className="font-semibold text-brand-700 dark:text-brand-300">{g.progress}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-brand-500"
                            style={{ width: `${Math.min(100, g.progress)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('dashboard.setAside', {
                            amount: formatMoney(g.contributed, currency),
                            target: formatMoney(g.target_amount, currency),
                          })}
                          {g.remaining !== null
                            ? ` • ${t('dashboard.left', { amount: formatMoney(g.remaining, currency) })}`
                            : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('dashboard.latest5')}</span>
              </CardHeader>
              <CardBody className="p-0">
                {recent.length === 0 ? (
                  <EmptyState
                    title={t('dashboard.noTransactionsTitle')}
                    description={t('dashboard.noTransactionsDesc')}
                    icon={<Receipt className="h-6 w-6" />}
                    action={
                      <Button size="sm" onClick={() => setFormOpen(true)}>
                        <Plus className="h-4 w-4" /> {t('dashboard.addARecord')}
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {recent.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {txn.type === 'income' ? (
                              <Badge tone="green">
                                <TrendingUp className="h-3 w-3" /> {t('types.income')}
                              </Badge>
                            ) : (
                              <Badge tone="red">{t('types.expense')}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{formatDate(txn.txn_date)}</span>
                          </div>
                          <p className="mt-1 truncate text-sm text-foreground">
                            {txn.description || txn.category_name || t('common.record')}
                          </p>
                        </div>
                        <p
                          className={classNames(
                            'shrink-0 text-sm font-semibold',
                            txn.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {txn.type === 'income' ? '+' : '-'} {formatMoney(txn.amount, currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {!hasRecords && (
            <Card>
              <CardBody>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{t('dashboard.gettingStarted')}</h3>
                    <p className="text-sm text-muted-foreground">{t('dashboard.gettingStartedDesc')}</p>
                  </div>
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" /> {t('dashboard.addRecord')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <TransactionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        categories={categories}
      />
    </div>
  );
}
