import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount } from '../utils';
import { Budget } from '../types';
import Modal from '../components/Modal';
import CategoryPicker from '../components/CategoryPicker';
import ProGate from '../components/ProGate';
import { usePlan } from '../plan';

export default function Budgets() {
  const { language, budgets, categories, transactions, defaultCurrency } = useStore();
  const t = translations[language];
  const dc = defaultCurrency as any;
  const { canUseBudgets } = usePlan();

  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  // Category picker state for add/edit
  const [selectedCat, setSelectedCat] = useState('');
  const [limit, setLimit] = useState('');
  const [pickerError, setPickerError] = useState('');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Compute spending per budget for current month
  const budgetProgress = useMemo(() => {
    return budgets.map((b) => {
      const catSpent = transactions
        .filter((tx) => {
          if (tx.type !== 'expense') return false;
          if (tx.categoryId !== b.categoryId) return false;
          const d = parseISO(tx.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, tx) => s + tx.amount, 0);

      const pct = b.limit > 0 ? Math.round((catSpent / b.limit) * 100) : 0;
      const remaining = b.limit - catSpent;
      const isOver = remaining < 0;
      const isWarning = !isOver && pct >= 80;

      return { ...b, spent: catSpent, pct, remaining, isOver, isWarning };
    });
  }, [budgets, transactions, monthStart, monthEnd]);

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgetProgress.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const openAdd = () => {
    setSelectedCat('');
    setLimit('');
    setPickerError('');
    setShowAdd(true);
  };

  const openEdit = (b: Budget) => {
    setSelectedCat(b.categoryId);
    setLimit(String(b.limit));
    setPickerError('');
    setEditingBudget(b);
  };

  const validate = () => {
    if (!selectedCat) { setPickerError(t.categoryRequired); return false; }
    if (!limit || parseFloat(limit) <= 0) { setPickerError(t.amountRequired); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const { addBudget, updateBudget } = useStore.getState();
    const data = {
      categoryId: selectedCat,
      limit: parseFloat(limit.replace(',', '.')),
      period: 'monthly' as const,
      currency: dc,
    };
    if (editingBudget) {
      updateBudget(editingBudget.id, data);
      setEditingBudget(null);
    } else {
      addBudget(data);
      setShowAdd(false);
      setSelectedCat('');
      setLimit('');
    }
  };

  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getColor = (b: typeof budgetProgress[0]) =>
    b.isOver ? '#EF4444' : b.isWarning ? '#F59E0B' : '#10B981';

  const mainContent = (
    <div className="page-enter pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t.budgetsTitle}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.months[now.getMonth()]} {now.getFullYear()}</p>
        </div>
        <button
          onClick={openAdd}
          className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
        >
          <Plus size={20} color="white" />
        </button>
      </div>

      {/* Overall summary */}
      {budgets.length > 0 && (
        <div className="mx-5 mb-5 rounded-2xl p-4" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300">
              {language === 'ru' ? 'Общий бюджет' : 'Total budget'}
            </span>
            <span className="text-sm font-bold" style={{ color: getColor(budgetProgress.find(() => true)!) }}>
              {overallPct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#1E2A40' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(overallPct, 100)}%`,
                background: getColor(budgetProgress.find((b) => b.isOver) ?? budgetProgress.find((b) => b.isWarning) ?? budgetProgress[0]),
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{formatAmount(totalSpent, dc)} {language === 'ru' ? 'потрачено' : 'spent'}</span>
            <span>{formatAmount(totalBudget - totalSpent, dc)} {language === 'ru' ? 'осталось' : 'left'}</span>
          </div>
        </div>
      )}

      {/* Budget list */}
      {budgetProgress.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">{t.noBudgets}</h3>
          <p className="text-slate-500 text-sm mb-6">
            {language === 'ru'
              ? 'Установите лимиты на категории, чтобы контролировать траты'
              : 'Set spending limits per category to track expenses'}
          </p>
          <button
            onClick={openAdd}
            className="px-6 py-3 rounded-2xl font-semibold text-white active-scale"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
          >
            {t.addBudget}
          </button>
        </div>
      ) : (
        <div className="mx-5 space-y-3">
          {budgetProgress.map((b) => {
            const cat = getCat(b.categoryId);
            const color = getColor(b);
            return (
              <div
                key={b.id}
                className="rounded-2xl p-4"
                style={{ background: '#0E0E1C', border: `1px solid ${b.isOver ? 'rgba(239,68,68,0.3)' : '#1E2A40'}` }}
              >
                {/* Category row */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat?.color ?? '#94A3B8'}22` }}
                  >
                    <span className="text-lg">{cat?.icon ?? '📌'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {language === 'ru' ? cat?.name : cat?.nameEn}
                      </p>
                      {b.isOver && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
                          ⚠ {t.overBudget}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {language === 'ru' ? 'Лимит: ' : 'Limit: '}{formatAmount(b.limit, dc)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(b)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                      style={{ background: '#1E1E38' }}
                    >
                      <Pencil size={12} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => setDeletingBudget(b)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                      style={{ background: '#1E1E38' }}
                    >
                      <Trash2 size={12} color="#EF4444" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color }}>
                      {formatAmount(b.spent, dc)} {language === 'ru' ? 'потрачено' : 'spent'}
                    </span>
                    <span className={b.remaining < 0 ? 'text-red-400' : 'text-slate-400'}>
                      {b.remaining >= 0
                        ? `${formatAmount(b.remaining, dc)} ${language === 'ru' ? 'осталось' : 'left'}`
                        : `${language === 'ru' ? 'Превышение ' : 'Over '}${formatAmount(Math.abs(b.remaining), dc)}`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(b.pct, 100)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-right">{b.pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAdd || !!editingBudget}
        onClose={() => { setShowAdd(false); setEditingBudget(null); }}
        title={editingBudget ? t.editBudget : t.addBudget}
      >
        <div className="px-5 pb-8 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              {t.budgetCategory}
            </label>
            <CategoryPicker
              selectedId={selectedCat}
              onChange={(id) => { setSelectedCat(id); setPickerError(''); }}
              type="expense"
              error={pickerError}
            />
          </div>

          {/* Limit amount */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              {t.budgetLimit} ({dc})
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 text-2xl font-bold"
              style={{
                background: '#1E1E38',
                border: '1px solid #1E2A40',
                borderRadius: 12,
                color: '#EF4444',
              }}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowAdd(false); setEditingBudget(null); }}
              className="flex-1 py-3.5 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
            >
              {t.save}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deletingBudget} onClose={() => setDeletingBudget(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Лимит бюджета будет удалён безвозвратно.'
              : 'Budget limit will be permanently removed.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingBudget(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingBudget) {
                  useStore.getState().deleteBudget(deletingBudget.id);
                  setDeletingBudget(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (!canUseBudgets) {
    return <ProGate feature="Бюджеты" featureEn="Budgets">{mainContent}</ProGate>;
  }
  return mainContent;
}