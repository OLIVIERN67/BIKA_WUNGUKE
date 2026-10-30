import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { Category, PaymentMethod, Transaction, TransactionType } from '../types';
import { createTransaction, updateTransaction } from '../services/transaction.service';
import { getErrorMessage } from '../services/api';
import { todayISO, formatDate } from '../utils/date';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  editing?: Transaction | null;
}

export function TransactionFormModal({ open, onClose, onSaved, categories, editing }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [txnDate, setTxnDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const PAYMENT_METHODS = useMemo<Array<{ value: PaymentMethod; label: string }>>(
    () => [
      { value: 'cash', label: t('paymentMethods.cash') },
      { value: 'mobile_money', label: t('paymentMethods.mobileMoney') },
      { value: 'bank', label: t('paymentMethods.bank') },
      { value: 'credit', label: t('paymentMethods.credit') },
      { value: 'other', label: t('paymentMethods.other') },
    ],
    [t],
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategoryId(editing.category_id ? String(editing.category_id) : '');
      setDescription(editing.description ?? '');
      setPaymentMethod(editing.payment_method);
      setTxnDate(String(editing.txn_date).slice(0, 10));
    } else {
      setType('income');
      setAmount('');
      setCategoryId('');
      setDescription('');
      setPaymentMethod('cash');
      setTxnDate(todayISO());
    }
    setErrors({});
  }, [open, editing]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  useEffect(() => {
    if (categoryId && !filteredCategories.some((c) => String(c.id) === categoryId)) {
      setCategoryId('');
    }
  }, [type, filteredCategories, categoryId]);

  const validate = () => {
    const next: Record<string, string> = {};
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) next.amount = t('transactionModal.amountInvalid');
    if (!txnDate) next.txnDate = t('transactionModal.dateRequired');
    if (!categoryId) next.categoryId = t('transactionModal.categoryRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: Number(amount),
        category_id: categoryId ? Number(categoryId) : null,
        description: description.trim(),
        payment_method: paymentMethod,
        txn_date: txnDate,
      };
      if (editing) {
        await updateTransaction(editing.id, payload);
        toast.success(t('transactionModal.updated'));
      } else {
        await createTransaction(payload);
        toast.success(t('transactionModal.saved'));
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
      title={editing ? t('transactionModal.editTitle') : t('transactionModal.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {editing ? t('common.saveChanges') : t('transactionModal.saveRecord')}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="form-surface space-y-4">
        <div>
          <span className="label">{t('transactionModal.type')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                type === 'income'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('transactionModal.income')}
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                type === 'expense'
                  ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('transactionModal.expense')}
            </button>
          </div>
        </div>

        <Input
          label={t('transactionModal.amount')}
          required
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          placeholder={t('transactionModal.amountPlaceholder')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />

        <Select
          label={t('transactionModal.category')}
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          error={errors.categoryId}
        >
          <option value="">{t('transactionModal.selectCategory')}</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          label={t('transactionModal.date')}
          required
          type="date"
          value={txnDate}
          max={todayISO()}
          onChange={(e) => setTxnDate(e.target.value)}
          error={errors.txnDate}
        />

        <Select
          label={t('transactionModal.paymentMethod')}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>

        <Textarea
          label={t('transactionModal.description')}
          rows={2}
          placeholder={t('transactionModal.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {editing && (
          <p className="text-xs text-muted-foreground">
            {t('transactionModal.createdOn', { date: formatDate(editing.created_at) })}
          </p>
        )}
      </form>
    </Modal>
  );
}
