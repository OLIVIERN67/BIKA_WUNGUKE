import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FullPageSpinner } from '../components/ui/Spinner';
import { CategoryFormModal } from '../components/CategoryFormModal';
import * as categoryService from '../services/category.service';
import { getErrorMessage } from '../services/api';
import { Category } from '../types';

export function CategoriesPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await categoryService.listCategories());
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
      await categoryService.deleteCategory(toDelete.id);
      toast.success(t('categories.deleted'));
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const income = categories.filter((c) => c.type === 'income');
  const expense = categories.filter((c) => c.type === 'expense');

  const renderGroup = (title: string, items: Category[], tone: 'green' | 'red') => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge tone={tone}>{items.length}</Badge>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState title={t('categories.emptyTitle')} description={t('categories.emptyDesc')} />
      ) : (
        <div className="divide-y divide-border">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t('common.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(c)}
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
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('categories.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('categories.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> {t('categories.newCategory')}
        </Button>
      </div>

      {loading ? (
        <Card>
          <FullPageSpinner label={t('categories.loading')} />
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            title={t('categories.emptyTitleFull')}
            description={t('categories.emptyDescFull')}
            icon={<Tags className="h-6 w-6" />}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> {t('categories.newCategory')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderGroup(t('categories.incomeCategories'), income, 'green')}
          {renderGroup(t('categories.expenseCategories'), expense, 'red')}
        </div>
      )}

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        editing={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('categories.deleteTitle')}
        description={
          toDelete ? t('categories.deleteDesc', { name: toDelete.name }) : undefined
        }
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
