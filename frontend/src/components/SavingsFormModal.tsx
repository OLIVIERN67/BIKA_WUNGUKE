import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { Savings, SavingsGoalProgress, SavingsType } from '../types';
import { createSavings, listGoals, updateSavings } from '../services/savings.service';
import { getErrorMessage } from '../services/api';
import { todayISO } from '../utils/date';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Savings | null;
}

export function SavingsFormModal({ open, onClose, onSaved, editing }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<SavingsType>('deposit');
  const [amount, setAmount] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [note, setNote] = useState('');
  const [savingDate, setSavingDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<SavingsGoalProgress[]>([]);

  useEffect(() => {
    if (!open) return;
    let stale = false;
    listGoals()
      .then((items) => {
        if (!stale) setGoals(items);
      })
      .catch((error) => {
        if (!stale) setGoals([]);
        toast.error(getErrorMessage(error));
      });
    return () => {
      stale = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setGoalId(editing.goal_id ? String(editing.goal_id) : '');
      setNote(editing.note ?? '');
      setSavingDate(String(editing.saving_date).slice(0, 10));
    } else {
      setType('deposit');
      setAmount('');
      setGoalId('');
      setNote('');
      setSavingDate(todayISO());
    }
    setErrors({});
  }, [open, editing]);

  const validate = () => {
    const next: Record<string, string> = {};
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) next.amount = t('savingsModal.amountInvalid');
    if (!savingDate) next.savingDate = t('savingsModal.dateRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const selectedGoal = goals.find((g) => g.id === Number(goalId));
      const payload = {
        type,
        amount: Number(amount),
        goal_id: goalId ? Number(goalId) : null,
        goal: selectedGoal ? selectedGoal.name : '',
        note: note.trim(),
        saving_date: savingDate,
      };
      if (editing) {
        await updateSavings(editing.id, payload);
        toast.success(t('savingsModal.updated'));
      } else {
        await createSavings(payload);
        toast.success(t('savingsModal.saved'));
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('savingsModal.editTitle') : t('savingsModal.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="savings-form" loading={saving}>
            {editing ? t('common.saveChanges') : t('savingsModal.saveRecord')}
          </Button>
        </>
      }
    >
      <form id="savings-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="label">{t('savingsModal.type')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                type === 'deposit'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('savingsTypes.deposit')}
            </button>
            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                type === 'withdrawal'
                  ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('savingsTypes.withdrawal')}
            </button>
          </div>
        </div>

        <Input
          label={t('savingsModal.amount')}
          required
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          placeholder={t('savingsModal.amountPlaceholder')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />

        <Select
          label={t('savingsModal.addToGoal')}
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
        >
          <option value="">{t('savingsModal.noGoal')}</option>
          {goals
            .filter((g) => g.status === 'active')
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </Select>

        <Input
          label={t('savingsModal.date')}
          required
          type="date"
          value={savingDate}
          max={todayISO()}
          onChange={(e) => setSavingDate(e.target.value)}
          error={errors.savingDate}
        />

        <Textarea
          label={t('savingsModal.note')}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className="text-xs text-muted-foreground">{t('savingsModal.disclaimer')}</p>
      </form>
    </Modal>
  );
}
