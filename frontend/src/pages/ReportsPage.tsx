import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import { StatCard } from '../components/StatCard';
import { MonthlyChart } from '../components/charts/MonthlyChart';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatMoneyDetailed } from '../utils/format';
import { firstOfMonthISO, formatDate, todayISO } from '../utils/date';
import * as reportService from '../services/report.service';
import * as dashboardService from '../services/dashboard.service';
import { getErrorMessage } from '../services/api';
import { ReportPayload, TransactionType, TrendPoint } from '../types';

export function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currency = user?.currency ?? 'RWF';

  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [type, setType] = useState<'' | TransactionType>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [monthly, setMonthly] = useState<TrendPoint[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, monthlyData] = await Promise.all([
        reportService.getReport({
          from: from || undefined,
          to: to || undefined,
          type: type || undefined,
        }),
        dashboardService.getMonthly(6),
      ]);
      setReport(data);
      setMonthly(monthlyData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [from, to, type]);

  useEffect(() => {
    load();
  }, [load]);

  const query = { from: from || undefined, to: to || undefined, type: type || undefined };

  const handleExport = async (kind: 'csv' | 'pdf') => {
    setExporting(kind);
    try {
      if (kind === 'csv') {
        await reportService.exportCsv(query);
        toast.success(t('reports.csvDownloaded'));
      } else {
        await reportService.exportPdf(query);
        toast.success(t('reports.pdfDownloaded'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const totals = report?.totals;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            loading={exporting === 'csv'}
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} loading={exporting === 'pdf'}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Input label={t('reports.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label={t('reports.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select
            label={t('reports.type')}
            value={type}
            onChange={(e) => setType(e.target.value as '' | TransactionType)}
          >
            <option value="">{t('types.all')}</option>
            <option value="income">{t('types.incomeOnly')}</option>
            <option value="expense">{t('types.expensesOnly')}</option>
          </Select>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('reports.income')}
          value={formatMoney(totals?.income ?? 0, currency)}
          icon={<Download className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label={t('reports.expenses')}
          value={formatMoney(totals?.expense ?? 0, currency)}
          icon={<Download className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label={t('reports.netCashFlow')}
          value={formatMoney(totals?.net ?? 0, currency)}
          icon={<BarChart3 className="h-5 w-5" />}
          tone={(totals?.net ?? 0) >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          label={t('reports.records')}
          value={String(totals?.count ?? 0)}
          icon={<FileText className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.monthlyChart')}</CardTitle>
        </CardHeader>
        <CardBody>
          <MonthlyChart data={monthly} currency={currency} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.recordsInPeriod')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {from ? formatDate(from) : t('reports.rangeStart')} – {to ? formatDate(to) : t('reports.rangeEnd')}
          </span>
        </CardHeader>

        {loading ? (
          <FullPageSpinner label={t('reports.loading')} />
        ) : !report || report.rows.length === 0 ? (
          <EmptyState
            title={t('reports.emptyTitle')}
            description={t('reports.emptyDesc')}
            icon={<BarChart3 className="h-6 w-6" />}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="table-th">{t('reports.date')}</th>
                    <th className="table-th">{t('reports.type')}</th>
                    <th className="table-th">{t('reports.category')}</th>
                    <th className="table-th">{t('reports.description')}</th>
                    <th className="table-th text-right">{t('reports.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="table-td whitespace-nowrap">{formatDate(row.txn_date)}</td>
                      <td className="table-td">
                        <Badge tone={row.type === 'income' ? 'green' : 'red'}>
                          {row.type === 'income' ? t('types.income') : t('types.expense')}
                        </Badge>
                      </td>
                      <td className="table-td">{row.category_name ?? t('reports.uncategorised')}</td>
                      <td className="table-td max-w-[260px] truncate">{row.description || '—'}</td>
                      <td className="table-td text-right font-medium">
                        {formatMoneyDetailed(row.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border sm:hidden">
              {report.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Badge tone={row.type === 'income' ? 'green' : 'red'}>
                      {row.type === 'income' ? t('types.income') : t('types.expense')}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(row.txn_date)} • {row.category_name ?? t('reports.uncategorised')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(row.amount, currency)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
