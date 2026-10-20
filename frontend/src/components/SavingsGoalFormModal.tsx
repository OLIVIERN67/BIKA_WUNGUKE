import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SavingsGoalProgress } from '../types';
import { createGoal, updateGoal } from '../services/savings.service';
import { getErrorMessage } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: SavingsGoalProgress | null;
}

export function SavingsGoalFormModal({ open, onClose, onSaved, editing }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setTargetAmount(String(editing.target_amount));
      setTargetDate(editing.target_date ? String(editing.target_date).slice(0, 10) : '');
    } else {
      setName('');
      setTargetAmount('');
      setTargetDate('');
    }
    setErrors({});
  }, [open, editing]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('goalModal.nameRequired');
    const value = Number(targetAmount);
    if (!targetAmount || Number.isNaN(value) || value <= 0) {
      next.targetAmount = t('goalModal.amountInvalid');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        target_amount: Number(targetAmount),
        target_date: targetDate || null,
      };
      if (editing) {
        await updateGoal(editing.id, payload);
        toast.success(t('goalModal.updated'));
      } else {
        await createGoal(payload);
        toast.success(t('goalModal.created'));
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
      title={editing ? t('goalModal.editTitle') : t('goalModal.newTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="goal-form" loading={saving}>
            {editing ? t('common.saveChanges') : t('goalModal.createGoal')}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('goalModal.name')}
          required
          placeholder={t('goalModal.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          label={t('goalModal.targetAmount')}
          required
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          placeholder={t('goalModal.targetPlaceholder')}
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          error={errors.targetAmount}
          hint={t('goalModal.targetHint')}
        />
        <Input
          label={t('goalModal.targetDate')}
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          hint={t('goalModal.targetDateHint')}
        />
      </form>
    </Modal>
  );
}
