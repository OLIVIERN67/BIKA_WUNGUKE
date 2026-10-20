import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  PiggyBank,
  Scale,
  Share2,
  Wallet,
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import { StatCard } from '../components/StatCard';
import { ObservationsList } from '../components/ObservationsList';
import { useAuth } from '../context/AuthContext';
import { classNames, currentIntlLocale, formatMoney, formatMoneyDetailed } from '../utils/format';
import { firstOfMonthISO, formatDate, startOfWeekISO, todayISO } from '../utils/date';
import * as summaryService from '../services/summary.service';
import * as reportService from '../services/report.service';
import * as savingsService from '../services/savings.service';
import { getErrorMessage } from '../services/api';
import { Observation, PeriodSummary, ReportPayload, SavingsSummary } from '../types';

type Period = 'week' | 'month' | 'custom';

export function MyFinancialRecordPage() {
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
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [savings, setSavings] = useState<SavingsSummary | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const periodLabel = summary
    ? `${formatDate(summary.period.from)} – ${formatDate(summary.period.to)}`
    : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, rep, sav, obs] = await Promise.all([
        summaryService.getPeriodSummary(range),
        reportService.getReport(range),
        savingsService.getSavingsSummary(),
        summaryService.getObservations(range),
      ]);
      setSummary(sum);
      setReport(rep);
      setSavings(sav);
      setObservations(obs);
      setGeneratedAt(new Date());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (kind: 'csv' | 'pdf') => {
    setExporting(kind);
    try {
      if (kind === 'csv') await reportService.exportCsv(range);
      else await reportService.exportPdf(range);
      toast.success(
        kind === 'csv' ? t('financialRecord.csvDownloaded') : t('financialRecord.pdfDownloaded'),
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    const summaryText =
      `${t('financialRecord.shareLineRecord', {
        business: user?.business_name || t('financialRecord.myBusiness'),
      })}\n` +
      `${t('financialRecord.shareLinePeriod', { label: periodLabel })}\n` +
      `${t('financialRecord.shareLineIncome', {
        amount: formatMoney(summary?.totals.income ?? 0, currency),
      })}\n` +
      `${t('financialRecord.shareLineExpenses', {
        amount: formatMoney(summary?.totals.expense ?? 0, currency),
      })}\n` +
      `${t('financialRecord.shareLineNet', {
        amount: formatMoney(summary?.totals.net ?? 0, currency),
      })}\n` +
      `${t('financialRecord.shareLineSavings', {
        amount: formatMoney(savings?.balance ?? 0, currency),
      })}\n\n` +
      `${t('financialRecord.shareLineNote')}`;
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share) {
        const data: ShareData = { text: summaryText, title: t('financialRecord.title') };
        if (!nav.canShare || nav.canShare(data)) {
          await nav.share(data);
          toast.success(t('financialRecord.shareSheetOpened'));
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
        toast.success(t('financialRecord.copied'));
      } else {
        toast.error(t('financialRecord.notSupported'));
      }
    } catch {
      toast.error(t('financialRecord.cancelled'));
    } finally {
      setSharing(false);
      setShareOpen(false);
    }
  };

  const totals = summary?.totals;
  const hasRecords = (totals?.totalCount ?? 0) > 0;
  const rows = report?.rows ?? [];
  const generatedLabel = generatedAt.toLocaleString(currentIntlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const categoryTable = (
    title: string,
    list: PeriodSummary['categories']['income'],
    tone: 'green' | 'red',
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge tone={tone}>{list.length}</Badge>
      </CardHeader>
      <CardBody className="p-0">
        {list.length === 0 ? (
          <EmptyState title={t('financialRecord.noRecords')} description={t('financialRecord.nothingInGroup')} />
        ) : (
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="table-th">{t('financialRecord.category')}</th>
                <th className="table-th text-right">{t('financialRecord.records')}</th>
                <th className="table-th text-right">{t('financialRecord.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((row) => (
                <tr key={`${row.category_id}-${row.category_name}`}>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.category_name}
                    </span>
                  </td>
                  <td className="table-td text-right">{row.count}</td>
                  <td
                    className={classNames(
                      'table-td text-right font-semibold',
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
        )}
      </CardBody>
    </Card>
  );

  if (loading) return <FullPageSpinner label={t('reports.loading')} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('financialRecord.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('financialRecord.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <FileText className="h-4 w-4" /> {t('financialRecord.preview')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            loading={exporting === 'csv'}
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" /> {t('financialRecord.share')}
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <Trans i18nKey="financialRecord.disclaimerText" components={{ 1: <strong /> }} />
        </p>
      </div>

      {/* Period selector */}
      <Card>
        <CardBody className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label mb-1.5">{t('financialRecord.reportingPeriod')}</p>
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
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
              <CalendarDays className="h-4 w-4" />
              {t('period.selected', { label: periodLabel })}
            </p>
          </div>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Input label={t('period.from')} type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input label={t('period.to')} type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
          <div className="text-right text-xs text-muted-foreground">
            <p>{t('financialRecord.reportGenerated')}</p>
            <p className="font-semibold text-foreground">{generatedLabel}</p>
          </div>
        </CardBody>
      </Card>

      {/* Business profile */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user?.business_name || t('financialRecord.yourBusiness')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.business_type || t('financialRecord.categoryNotSet')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {user?.business_location || t('financialRecord.locationNotSet')}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              {currency}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span className="text-muted-foreground">{t('financialRecord.languageLabel')}</span>
              {(user?.locale ?? 'rw').toUpperCase()}
            </div>
          </div>
          {user?.business_description && (
            <p className="text-sm text-muted-foreground">{user.business_description}</p>
          )}
        </CardBody>
      </Card>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('financialRecord.totalIncome')}
          value={formatMoney(totals?.income ?? 0, currency)}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          tone="green"
          hint={t('financialRecord.incomeTxns', { count: totals?.incomeCount ?? 0 })}
        />
        <StatCard
          label={t('financialRecord.totalExpenses')}
          value={formatMoney(totals?.expense ?? 0, currency)}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          tone="red"
          hint={t('financialRecord.expenseTxns', { count: totals?.expenseCount ?? 0 })}
        />
        <StatCard
          label={t('financialRecord.netCashFlow')}
          value={formatMoney(totals?.net ?? 0, currency)}
          icon={<Scale className="h-5 w-5" />}
          tone={(totals?.net ?? 0) >= 0 ? 'blue' : 'red'}
          hint={t('financialRecord.netHint')}
        />
        <StatCard
          label={t('financialRecord.savingsSummary')}
          value={formatMoney(savings?.balance ?? 0, currency)}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="violet"
          hint={t('financialRecord.savingsHint', {
            dep: formatMoney(savings?.total_deposits ?? 0, currency),
            wd: formatMoney(savings?.total_withdrawals ?? 0, currency),
          })}
        />
      </div>

      {!hasRecords ? (
        <Card>
          <EmptyState
            title={t('financialRecord.noRecordsTitle')}
            description={t('financialRecord.noRecordsDesc', { label: periodLabel })}
            icon={<BarChart3 className="h-6 w-6" />}
          />
        </Card>
      ) : (
        <>
          {/* Category breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {categoryTable(t('financialRecord.incomeByCategory'), summary?.categories.income ?? [], 'green')}
            {categoryTable(t('financialRecord.expensesByCategory'), summary?.categories.expense ?? [], 'red')}
          </div>

          {/* Transaction history */}
          <Card>
            <CardHeader>
              <CardTitle>{t('financialRecord.historyTitle')}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {t('financialRecord.historySub', { count: rows.length, label: periodLabel })}
              </span>
            </CardHeader>
            <CardBody className="p-0">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background">
                    <tr>
                      <th className="table-th">{t('financialRecord.date')}</th>
                      <th className="table-th">{t('financialRecord.type')}</th>
                      <th className="table-th">{t('financialRecord.category')}</th>
                      <th className="table-th">{t('financialRecord.description')}</th>
                      <th className="table-th text-right">{t('financialRecord.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="table-td whitespace-nowrap">{formatDate(row.txn_date)}</td>
                        <td className="table-td">
                          <Badge tone={row.type === 'income' ? 'green' : 'red'}>
                            {row.type === 'income' ? t('types.income') : t('types.expense')}
                          </Badge>
                        </td>
                        <td className="table-td">{row.category_name ?? t('financialRecord.uncategorised')}</td>
                        <td className="table-td max-w-[240px] truncate">{row.description || '—'}</td>
                        <td className="table-td text-right font-medium">
                          {formatMoneyDetailed(row.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <ObservationsList
        observations={observations}
        periodLabel={periodLabel}
        loading={loading}
      />

      {/* Preview modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('financialRecord.previewTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              {t('common.close')}
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              loading={exporting === 'pdf'}
            >
              <Download className="h-4 w-4" /> {t('financialRecord.downloadPdf')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border p-4">
            <p className="font-semibold text-foreground">
              {user?.business_name || t('financialRecord.yourBusiness')}
            </p>
            <p className="text-xs text-muted-foreground">{user?.full_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('financialRecord.previewGenerated', { label: periodLabel, generated: generatedLabel })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted-foreground">{t('financialRecord.previewIncome')}</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoney(totals?.income ?? 0, currency)}
              </p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted-foreground">{t('financialRecord.previewExpenses')}</p>
              <p className="font-semibold text-red-600 dark:text-red-400">
                {formatMoney(totals?.expense ?? 0, currency)}
              </p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted-foreground">{t('financialRecord.netCashFlow')}</p>
              <p className="font-semibold">{formatMoney(totals?.net ?? 0, currency)}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted-foreground">{t('savings.savingsBalance')}</p>
              <p className="font-semibold">{formatMoney(savings?.balance ?? 0, currency)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
            {t('financialRecord.previewIncludes', { count: rows.length })}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t('financialRecord.previewReminder')}
          </p>
        </div>
      </Modal>

      {/* Share confirmation modal */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('financialRecord.shareTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShareOpen(false)} disabled={sharing}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleShare} loading={sharing}>
              <Share2 className="h-4 w-4" /> {t('financialRecord.share')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <strong>{t('financialRecord.shareWarningStrong')}</strong>{' '}
            {t('financialRecord.shareWarningRest')}
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold text-foreground">{t('financialRecord.aboutToShare')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {user?.business_name || t('financialRecord.myBusiness')} — {periodLabel}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-foreground">
              <li>
                {t('financialRecord.shareListIncome', {
                  amount: formatMoney(totals?.income ?? 0, currency),
                })}
              </li>
              <li>
                {t('financialRecord.shareListExpenses', {
                  amount: formatMoney(totals?.expense ?? 0, currency),
                })}
              </li>
              <li>
                {t('financialRecord.shareListNet', {
                  amount: formatMoney(totals?.net ?? 0, currency),
                })}
              </li>
              <li>
                {t('financialRecord.shareListSavings', {
                  amount: formatMoney(savings?.balance ?? 0, currency),
                })}
              </li>
              <li>{t('financialRecord.shareListCount', { count: rows.length })}</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">{t('financialRecord.shareClipboardNote')}</p>
        </div>
      </Modal>
    </div>
  );
}
