import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import {
  Info,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Pencil,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FullPageSpinner } from '../components/ui/Spinner';
import { StatCard } from '../components/StatCard';
import { SavingsFormModal } from '../components/SavingsFormModal';
import { SavingsGoalFormModal } from '../components/SavingsGoalFormModal';
import { useAuth } from '../context/AuthContext';
import { classNames, formatMoney } from '../utils/format';
import { formatDate } from '../utils/date';
import * as savingsService from '../services/savings.service';
import { getErrorMessage } from '../services/api';
import { Savings, SavingsGoalProgress, SavingsSummary } from '../types';

export function SavingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currency = user?.currency ?? 'RWF';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Savings[]>([]);
  const [goals, setGoals] = useState<SavingsGoalProgress[]>([]);
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Savings | null>(null);
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalProgress | null>(null);
  const [toDelete, setToDelete] = useState<Savings | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoalProgress | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum, goalList] = await Promise.all([
        savingsService.listSavings({ limit: 100 }),
        savingsService.getSavingsSummary(),
        savingsService.listGoals(),
      ]);
      setRows(list.items);
      setSummary(sum);
      setGoals(goalList);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await savingsService.deleteSavings(toDelete.id);
      toast.success(t('savings.deleted'));
      setToDelete(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleGoalDelete = async () => {
    if (!goalToDelete) return;
    try {
      await savingsService.deleteGoal(goalToDelete.id);
      toast.success(t('savings.goalDeleted'));
      setGoalToDelete(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleGoalStatus = async (goal: SavingsGoalProgress) => {
    const next = goal.status === 'active' ? 'closed' : 'active';
    try {
      await savingsService.updateGoal(goal.id, { status: next });
      toast.success(next === 'closed' ? t('savings.goalClosed') : t('savings.goalReopened'));
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const statusTone = (status: SavingsGoalProgress['status']) =>
    status === 'active' ? 'blue' : status === 'achieved' ? 'green' : 'slate';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('savings.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('savings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEditingGoal(null);
              setGoalFormOpen(true);
            }}
          >
            <Target className="h-4 w-4" /> {t('savings.newGoal')}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('savings.addSavings')}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <Trans i18nKey="savings.infoText" components={{ 1: <strong /> }} />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('savings.totalDeposits')}
          value={formatMoney(summary?.total_deposits ?? 0, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label={t('savings.totalWithdrawals')}
          value={formatMoney(summary?.total_withdrawals ?? 0, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label={t('savings.savingsBalance')}
          value={formatMoney(summary?.balance ?? 0, currency)}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="violet"
          hint={t('savings.savingsHint')}
        />
      </div>

      {loading ? (
        <FullPageSpinner label={t('savings.loading')} />
      ) : (
        <>
          {/* Goals */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{t('savings.goalsTitle')}</h2>
              <span className="text-xs text-muted-foreground">
                {t('savings.activeCount', { count: goals.filter((g) => g.status === 'active').length })}
              </span>
            </div>

            {goals.length === 0 ? (
              <Card>
                <EmptyState
                  title={t('savings.noGoalsTitle')}
                  description={t('savings.noGoalsDesc')}
                  icon={<Target className="h-6 w-6" />}
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingGoal(null);
                        setGoalFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> {t('savings.createGoal')}
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal) => (
                  <Card key={goal.id}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{goal.name}</p>
                            <Badge tone={statusTone(goal.status)}>
                              {t(`goalStatus.${goal.status}`)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('savings.target', { amount: formatMoney(goal.target_amount, currency) })}
                            {goal.target_date
                              ? ` • ${t('savings.byDate', { date: formatDate(goal.target_date) })}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => {
                              setEditingGoal(goal);
                              setGoalFormOpen(true);
                            }}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t('savings.editGoal')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleGoalStatus(goal)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={
                              goal.status === 'active' ? t('savings.closeGoal') : t('savings.reopenGoal')
                            }
                          >
                            {goal.status === 'active' ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setGoalToDelete(goal)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                            aria-label={t('savings.deleteGoal')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t('savings.setAsideLabel')}{' '}
                            <strong className="text-brand-700 dark:text-brand-300">
                              {formatMoney(goal.contributed, currency)}
                            </strong>
                          </span>
                          <span className="font-semibold text-foreground">{goal.progress}%</span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={classNames(
                              'h-2.5 rounded-full transition-all',
                              goal.progress >= 100 ? 'bg-emerald-500' : 'bg-brand-500',
                            )}
                            style={{ width: `${Math.min(100, goal.progress)}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {goal.remaining !== null
                              ? t('savings.remaining', { amount: formatMoney(goal.remaining, currency) })
                              : t('savings.remainingUnknown')}
                          </span>
                          <span>{t('savings.contributions', { count: goal.contribution_count })}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('savings.historyTitle')}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {t('savings.recordCount', { count: rows.length })}
              </span>
            </CardHeader>

            {rows.length === 0 ? (
              <EmptyState
                title={t('savings.emptyTitle')}
                description={t('savings.emptyDesc')}
                icon={<PiggyBank className="h-6 w-6" />}
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> {t('savings.addSavings')}
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          row.type === 'deposit'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {row.type === 'deposit' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.goal_name ||
                            row.goal ||
                            (row.type === 'deposit'
                              ? t('savingsTypes.deposit')
                              : t('savingsTypes.withdrawal'))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(row.saving_date)}
                          {row.note ? ` • ${row.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            row.type === 'deposit'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {row.type === 'deposit' ? '+' : '-'} {formatMoney(row.amount, currency)}
                        </p>
                        <Badge tone={row.type === 'deposit' ? 'green' : 'amber'}>
                          {row.type === 'deposit'
                            ? t('savingsTypes.deposit')
                            : t('savingsTypes.withdrawal')}
                        </Badge>
                      </div>
                      <button
                        onClick={() => {
                          setEditing(row);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(row)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <SavingsFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        editing={editing}
      />

      <SavingsGoalFormModal
        open={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        onSaved={load}
        editing={editingGoal}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('savings.deleteSavingsTitle')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(goalToDelete)}
        title={t('savings.deleteGoalTitle')}
        description={t('savings.deleteGoalDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={handleGoalDelete}
        onClose={() => setGoalToDelete(null)}
      />
    </div>
  );
}
