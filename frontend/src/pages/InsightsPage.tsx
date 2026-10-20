import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BrainCircuit, Calendar, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { StatCard } from '../components/StatCard';
import * as insightsService from '../services/insights.service';
import { formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';

function getFirstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function InsightsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [from, setFrom] = useState(getFirstOfMonth());
  const [to, setTo] = useState(getToday());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<insightsService.FinancialInsights | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await insightsService.getSummary(from, to);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currency = user?.currency || 'RWF';

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-semibold text-foreground">{t('nav.insights', 'Financial Insights')}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('insights.subtitle', 'Rule-based insights from your recorded transactions. Educational only — not a guarantee of loan approval.')}
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('period.from', 'From')}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('period.to', 'To')}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={load} disabled={loading}>
            <Calendar className="mr-2 h-4 w-4" />
            {t('common.apply', 'Apply')}
          </Button>
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {error && (
        <Card className="border-red-200 p-4 text-sm text-red-600">
          {error}
        </Card>
      )}

      {!loading && !data && !error && (
        <EmptyState title="No insights yet" description="Add some transactions to see insights." />
      )}

      {data && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dashboard.totalIncome', 'Total Income')} value={formatMoney(summary.totalIncome, currency)} icon={<TrendingUp className='h-5 w-5' />} tone='green' />
            <StatCard label={t('dashboard.totalExpense', 'Total Expenses')} value={formatMoney(summary.totalExpense, currency)} icon={<TrendingDown className='h-5 w-5' />} tone='red' />
            <StatCard label={t('dashboard.netCashFlow', 'Net Cash Flow')} value={formatMoney(summary.netCashFlow, currency)} icon={<Wallet className='h-5 w-5' />} tone={summary.netCashFlow >= 0 ? 'green' : 'red'} />
            <StatCard label={t('insights.transactions', 'Transactions')} value={String(summary.transactionCount)} icon={<Calendar className='h-5 w-5' />} tone='blue' />
          </div>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-foreground">{t('insights.periodSummary', 'Period Summary')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Period: {data.period.from} to {data.period.to}. Figures are based on recorded transactions only.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Avg daily income</p>
                <p className="mt-1 text-sm font-semibold">{formatMoney(summary.avgDailyIncome, currency)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Avg daily expenses</p>
                <p className="mt-1 text-sm font-semibold">{formatMoney(summary.avgDailyExpense, currency)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-foreground">{t('insights.expenseInsights', 'Expense Insights')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Top categories by recorded spending.</p>
            <div className="mt-4 space-y-2">
              {data.expenseInsights.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expense records in this period.</p>
              ) : (
                data.expenseInsights.topCategories.map((cat) => (
                  <div key={cat.category_name} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{cat.category_name}</p>
                      <p className="text-xs text-muted-foreground">{cat.count} transaction(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatMoney(cat.total, currency)}</p>
                      <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <PiggyBank className="h-4 w-4" />
              {t('insights.savings', 'Savings')}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total deposits</p>
                <p className="mt-1 text-sm font-semibold">{formatMoney(data.savingsInsights.totalDeposits, currency)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total withdrawals</p>
                <p className="mt-1 text-sm font-semibold">{formatMoney(data.savingsInsights.totalWithdrawals, currency)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="mt-1 text-sm font-semibold">{formatMoney(data.savingsInsights.balance, currency)}</p>
              </div>
            </div>
            {data.savingsInsights.goals.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Goals</p>
                {data.savingsInsights.goals.map((g) => (
                  <div key={g.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.progress.toFixed(1)}%</p>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, g.progress)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contributed {formatMoney(g.contributed, currency)} / {formatMoney(g.target_amount, currency)}
                      {g.remaining !== null ? ` • Remaining ${formatMoney(g.remaining, currency)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <AlertCircle className="h-4 w-4" />
              {t('insights.warnings', 'Warnings & Guidance')}
            </h2>
            <div className="mt-3 space-y-2">
              {data.warnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific warnings for this period.</p>
              ) : (
                data.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 ${
                      w.severity === 'danger'
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'
                        : w.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400'
                          : 'border-border bg-muted/40 text-foreground'
                    }`}
                  >
                    <p className="text-sm font-medium">{w.title}</p>
                    <p className="mt-1 text-xs opacity-90">{w.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-foreground">{t('insights.loanReadiness', 'Loan Readiness Assessment')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{data.loanReadiness.disclaimer}</p>
            <div className="mt-4 space-y-2">
              {data.loanReadiness.indicators.map((ind, idx) => (
                <div key={idx} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{ind.name}</p>
                    <span className="text-xs text-muted-foreground">{ind.status.replace('-', ' ')}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ind.description}</p>
                </div>
              ))}
            </div>
            {data.loanReadiness.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">Practical steps</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {data.loanReadiness.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}




