import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FullPageSpinner } from '../components/ui/Spinner';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';
import { formatDate } from '../utils/date';
import * as transactionService from '../services/transaction.service';
import { listCategories } from '../services/category.service';
import { getErrorMessage } from '../services/api';
import { Category, Transaction, TransactionType } from '../types';

const PAGE_SIZE = 10;

export function TransactionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currency = user?.currency ?? 'RWF';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [typeFilter, setTypeFilter] = useState<'' | TransactionType>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await transactionService.listTransactions({
        type: typeFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        from: from || undefined,
        to: to || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        sort: 'txn_date',
        order: 'desc',
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, from, to, debouncedSearch, page]);

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

  useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryFilter, from, to, debouncedSearch]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await transactionService.deleteTransaction(toDelete.id);
      toast.success(t('transactions.deleted'));
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (txn: Transaction) => {
    setEditing(txn);
    setFormOpen(true);
  };

  const totalIncome = rows.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('transactions.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('transactions.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('transactions.addRecord')}
        </Button>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> {t('transactions.filters')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input pl-9"
                placeholder={t('transactions.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('transactions.search')}
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '' | TransactionType)}>
              <option value="">{t('types.all')}</option>
              <option value="income">{t('types.income')}</option>
              <option value="expense">{t('types.expense')}</option>
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">{t('transactions.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('period.from')} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('period.to')} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('transactions.recordsShown')}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('transactions.incomeThisPage')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalIncome, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('transactions.expensesThisPage')}</p>
            <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">{formatMoney(totalExpense, currency)}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        {loading ? (
          <FullPageSpinner label={t('transactions.loading')} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('transactions.emptyTitle')}
            description={t('transactions.emptyDesc')}
            icon={<Receipt className="h-6 w-6" />}
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> {t('transactions.addRecord')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="table-th">{t('transactions.date')}</th>
                    <th className="table-th">{t('transactions.type')}</th>
                    <th className="table-th">{t('transactions.category')}</th>
                    <th className="table-th">{t('transactions.description')}</th>
                    <th className="table-th text-right">{t('transactions.amount')}</th>
                    <th className="table-th text-right">{t('transactions.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((txn) => (
                    <tr key={txn.id} className="hover:bg-muted">
                      <td className="table-td whitespace-nowrap">{formatDate(txn.txn_date)}</td>
                      <td className="table-td">
                        {txn.type === 'income' ? (
                          <Badge tone="green">
                            <ArrowUpCircle className="h-3 w-3" /> {t('types.income')}
                          </Badge>
                        ) : (
                          <Badge tone="red">
                            <ArrowDownCircle className="h-3 w-3" /> {t('types.expense')}
                          </Badge>
                        )}
                      </td>
                      <td className="table-td">
                        {txn.category_name ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: txn.category_color ?? '#94a3b8' }}
                            />
                            {txn.category_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('transactions.uncategorised')}</span>
                        )}
                      </td>
                      <td className="table-td max-w-[240px] truncate">{txn.description || '—'}</td>
                      <td
                        className={`table-td text-right font-semibold ${
                          txn.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {txn.type === 'income' ? '+' : '-'} {formatMoney(txn.amount, currency)}
                      </td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(txn)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t('transactions.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setToDelete(txn)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                            aria-label={t('transactions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((txn) => (
                <div key={txn.id} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {txn.type === 'income' ? (
                        <Badge tone="green">{t('types.income')}</Badge>
                      ) : (
                        <Badge tone="red">{t('types.expense')}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(txn.txn_date)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {txn.description || txn.category_name || t('common.record')}
                    </p>
                    {txn.category_name && (
                      <p className="text-xs text-muted-foreground">{txn.category_name}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        txn.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {txn.type === 'income' ? '+' : '-'} {formatMoney(txn.amount, currency)}
                    </p>
                    <div className="mt-1 flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(txn)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                        aria-label={t('transactions.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(txn)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                        aria-label={t('transactions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t('transactions.pageOf', { page, pages, total })}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('transactions.previous')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  {t('transactions.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <TransactionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        categories={categories}
        editing={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('transactions.deleteTitle')}
        description={
          toDelete
            ? t('transactions.deleteDesc', {
                name: toDelete.description || toDelete.category_name || toDelete.type,
                amount: formatMoney(toDelete.amount, currency),
              })
            : undefined
        }
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
