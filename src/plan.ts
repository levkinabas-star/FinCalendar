import { useStore } from './store';

export const FREE_LIMITS = {
  accounts: 4,
  transactions: 50,
  plannedExpenses: 5,
  debts: 2,
  customCategories: 5,
} as const;

export function usePlan() {
  const plan = useStore((s) => s.plan);
  const proExpiry = useStore((s) => s.proExpiry);
  const appliedPromoCode = useStore((s) => s.appliedPromoCode);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const plannedExpenses = useStore((s) => s.plannedExpenses);
  const categories = useStore((s) => s.categories);
  const debts = useStore((s) => s.debts);

  const isPro = plan === 'pro' && (proExpiry === null || new Date() < new Date(proExpiry));
  const customCategoriesCount = categories.filter((c) => !c.isPreset).length;

  return {
    isPro,
    plan,
    proExpiry,
    appliedPromoCode,
    canAddAccount: isPro || accounts.length < FREE_LIMITS.accounts,
    canAddTransaction: isPro || transactions.filter((t) => t.type !== 'transfer').length < FREE_LIMITS.transactions,
    canAddPlannedExpense: isPro || plannedExpenses.length < FREE_LIMITS.plannedExpenses,
    canAddCustomCategory: isPro || customCategoriesCount < FREE_LIMITS.customCategories,
    canExportNonJson: isPro,
    canViewStatistics: isPro,
    canUseBudgets: isPro,
    canAddDebt: isPro || debts.length < FREE_LIMITS.debts,
    accountsUsed: accounts.length,
    transactionsUsed: transactions.filter((t) => t.type !== 'transfer').length,
    plannedExpensesUsed: plannedExpenses.length,
    debtsUsed: debts.length,
    customCategoriesUsed: customCategoriesCount,
  };
}
