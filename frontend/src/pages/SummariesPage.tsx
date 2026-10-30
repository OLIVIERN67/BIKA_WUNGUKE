import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  FileSpreadsheet,
  Info,
  Receipt,
  Scale,
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import { StatCard } from '../components/StatCard';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { ObservationsList } from '../components/ObservationsList';
import { useAuth } from '../context/AuthContext';
import { classNames, formatMoney } from '../utils/format';
import { firstOfMonthISO, formatDate, startOfWeekISO, todayISO } from '../utils/date';
import * as summaryService from '../services/summary.service';
import { getErrorMessage } from '../services/api';
import { Observation, PeriodSummary } from '../types';

type Period = 'week' | 'month' | 'custom';

function pctText(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function SummariesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currency = user?.currency ?? 'RWF';

  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(firstOfMonthISO());
  const [customTo, setCustomTo] = useState(todayISO());

  const PERIODS = useMemo(
    () => [
      { value: 'week' as Period, label: t('period.week') },
      { value: 'month' as Period, label: t('period.month') },
      { value: 'custom' as Period, label: t('period.custom') },
    ],
    [t],
  );

  const range = useMemo(() => {
    if (period === 'week') return { from: startOfWeekISO(), to: todayISO() };
    if (period === 'month') return { from: firstOfMonthISO(), to: todayISO() };
    return { from: customFrom, to: customTo };
  }, [period, customFrom, customTo]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, obs] = await Promise.all([
        summaryService.getPeriodSummary(range),
        summaryService.getObservations(range),
      ]);
      setSummary(sum);
      setObservations(obs);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = summary?.totals;
  const prev = summary?.previous;
  const hasRecords = (totals?.totalCount ?? 0) > 0;
  const periodLabel = summary
    ? `${formatDate(summary.period.from)} – ${formatDate(summary.period.to)}`
    : '';

  const categoryTable = (
    title: string,
    rows: PeriodSummary['categories']['income'],
    tone: 'green' | 'red',
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge tone={tone}>{rows.length}</Badge>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <EmptyState title={t('summaries.noCategories')} description={t('summaries.noCategoriesDesc')} />
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[16rem]">
              <thead className="bg-background">
                <tr>
                  <th className="table-th">{t('summaries.category')}</th>
                  <th className="table-th text-right">{t('summaries.records')}</th>
                  <th className="table-th text-right">{t('summaries.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={`${row.category_id}-${row.category_name}`}>
                    <td className="table-td">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="truncate">{row.category_name}</span>
                      </span>
                    </td>
                    <td className="table-td text-right">{row.count}</td>
                    <td
                      className={classNames(
                        'table-td whitespace-nowrap text-right font-semibold',
                        tone === 'green'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {formatMoney(row.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">{t('summaries.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('summaries.subtitle')}</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <FileSpreadsheet className="h-4 w-4" /> {t('summaries.print')}
        </Button>
      </div>

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
                    'flex min-h-10 items-center rounded-lg px-3.5 py-2 text-sm font-medium transition',
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
        <FullPageSpinner label={t('summaries.loading')} />
      ) : (
        <>
          {/* Selected period label */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-700 dark:bg-brand-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200">
              <FileSpreadsheet className="h-4 w-4" />
              {t('period.selected', { label: periodLabel })}
            </div>
            <span className="text-xs text-brand-700/70 dark:text-brand-300/70">
              {t('period.days', { days: summary?.period.days ?? 0 })}
            </span>
          </div>

          {!hasRecords ? (
            <Card>
              <EmptyState
                title={t('summaries.noRecordsTitle')}
                description={t('summaries.noRecordsDesc', { label: periodLabel })}
                icon={<Receipt className="h-6 w-6" />}
              />
            </Card>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t('summaries.totalIncome')}
              value={formatMoney(totals?.income ?? 0, currency)}
              icon={<ArrowUpCircle className="h-5 w-5" />}
              tone="green"
              hint={t('summaries.incomeTxns', { count: totals?.incomeCount ?? 0 })}
            />
            <StatCard
              label={t('summaries.totalExpenses')}
              value={formatMoney(totals?.expense ?? 0, currency)}
              icon={<ArrowDownCircle className="h-5 w-5" />}
              tone="red"
              hint={t('summaries.expenseTxns', { count: totals?.expenseCount ?? 0 })}
            />
            <StatCard
              label={t('summaries.netCashFlow')}
              value={formatMoney(totals?.net ?? 0, currency)}
              icon={<Scale className="h-5 w-5" />}
              tone={(totals?.net ?? 0) >= 0 ? 'blue' : 'red'}
              hint={t('summaries.netHint')}
            />
            <StatCard
              label={t('summaries.transactions')}
              value={String(totals?.totalCount ?? 0)}
              icon={<BarChart3 className="h-5 w-5" />}
              tone="violet"
              hint={t('summaries.recordsPeriod')}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('summaries.infoText', { count: totals?.totalCount ?? 0 })}</p>
          </div>

          {/* Previous period comparison */}
          {prev && prev.hasData && (
            <Card>
              <CardHeader>
                <CardTitle>{t('summaries.compareTitle')}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {formatDate(prev.period.from)} – {formatDate(prev.period.to)}
                </span>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('summaries.income')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {formatMoney(prev.income, currency)}
                    </p>
                    <p
                      className={classNames(
                        'text-xs font-medium',
                        (prev.deltaIncomePct ?? 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {t('summaries.vsCurrent', {
                        pct: pctText(prev.deltaIncomePct),
                        amount: formatMoney(totals?.income ?? 0, currency),
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('summaries.expenses')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {formatMoney(prev.expense, currency)}
                    </p>
                    <p
                      className={classNames(
                        'text-xs font-medium',
                        (prev.deltaExpensePct ?? 0) <= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {t('summaries.vsCurrent', {
                        pct: pctText(prev.deltaExpensePct),
                        amount: formatMoney(totals?.expense ?? 0, currency),
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('summaries.netCashFlow')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {formatMoney(prev.net, currency)}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('summaries.vsCurrent', {
                        pct: pctText(prev.deltaNetPct),
                        amount: formatMoney(totals?.net ?? 0, currency),
                      })}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('summaries.pctNote', {
                    income: prev.incomeCount,
                    expense: prev.expenseCount,
                  })}
                </p>
              </CardBody>
            </Card>
          )}

          {/* Trend + most frequent expense category */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('summaries.trendTitle')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('summaries.trendSub')}</span>
              </CardHeader>
              <CardBody>
                {hasRecords ? (
                  <IncomeExpenseChart data={summary?.trend ?? []} currency={currency} />
                ) : (
                  <EmptyState
                    title={t('summaries.noTrendTitle')}
                    description={t('summaries.noTrendDesc')}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('summaries.frequentTitle')}</CardTitle>
                <span className="text-xs text-muted-foreground">{t('summaries.frequentSub')}</span>
              </CardHeader>
              <CardBody>
                {summary?.categories.expense.length ? (
                  <div className="space-y-3">
                    {[...summary.categories.expense]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((row) => (
                        <div key={`${row.category_id}-${row.category_name}`} className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="truncate">{row.category_name}</span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {row.count} × {formatMoney(row.total, currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title={t('summaries.noExpenses')}
                    description={t('summaries.noExpensesDesc')}
                  />
                )}
              </CardBody>
            </Card>
          </div>

          {/* Category breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {categoryTable(t('summaries.incomeByCategory'), summary?.categories.income ?? [], 'green')}
            {categoryTable(t('summaries.expensesByCategory'), summary?.categories.expense ?? [], 'red')}
          </div>

          {/* Observations (section 12) */}
          <ObservationsList
            observations={observations}
            periodLabel={periodLabel}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
