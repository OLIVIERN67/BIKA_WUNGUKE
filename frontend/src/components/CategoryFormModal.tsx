import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Category, TransactionType } from '../types';
import { createCategory, updateCategory } from '../services/category.service';
import { getErrorMessage } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Category | null;
}

const COLORS = ['#10b981', '#0ea5e9', '#f97316', '#8b5cf6', '#ef4444', '#eab308', '#ec4899', '#64748b'];

export function CategoryFormModal({ open, onClose, onSaved, editing }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#10b981');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setType(editing?.type ?? 'expense');
    setColor(editing?.color ?? '#10b981');
    setError('');
  }, [open, editing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 1) {
      setError(t('categories.formNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), type, color };
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success(t('categories.updated'));
      } else {
        await createCategory(payload);
        toast.success(t('categories.created'));
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('categories.editCategory') : t('categories.newCategoryModal')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {editing ? t('common.saveChanges') : t('categories.createCategory')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('categories.formName')}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          placeholder={t('categories.formNamePlaceholder')}
        />
        <Select label={t('categories.formType')} value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
          <option value="income">{t('types.income')}</option>
          <option value="expense">{t('types.expense')}</option>
        </Select>
        <div>
          <span className="label">{t('categories.formColour')}</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                  color === c ? 'ring-2 ring-muted-foreground' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={t('categories.colourOption', { color: c })}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
