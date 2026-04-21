import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Account, Transaction, PlannedExpense, Category, Currency, Language, Budget, Debt, DebtPayment, ScheduledPayment, Plan } from './types';
import { findPromoCode, calcProExpiry, PromoPeriod } from './promoCodes';
import { PRESET_CATEGORIES } from './utils';

interface StoreState {
  plan: Plan;
  proExpiry: string | null;       // null = lifetime, ISO string = expiry date
  appliedPromoCode: string | null;
  language: Language;
  defaultCurrency: Currency;
  accounts: Account[];
  transactions: Transaction[];
  plannedExpenses: PlannedExpense[];
  categories: Category[];
  budgets: Budget[];
  debts: Debt[];

  activatePro: () => void;
  activateProWithExpiry: (expiry: string | null) => void;
  applyPromoCode: (code: string) => { ok: true; period: PromoPeriod; labelRu: string; labelEn: string } | { ok: false; error: 'invalid' };
  setLanguage: (lang: Language) => void;
  setDefaultCurrency: (currency: Currency) => void;

  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Pick<Transaction, 'accountId' | 'type' | 'amount' | 'currency' | 'categoryId' | 'description' | 'date'>) => void;
  deleteTransaction: (id: string) => void;
  addTransfer: (params: {
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    description: string;
    date: string;
  }) => void;
  updateTransfer: (outTxId: string, params: {
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    description: string;
    date: string;
  }) => void;

  addPlannedExpense: (expense: Omit<PlannedExpense, 'id' | 'createdAt' | 'completedDates'>) => void;
  updatePlannedExpense: (id: string, updates: Partial<PlannedExpense>) => void;
  deletePlannedExpense: (id: string) => void;
  togglePlannedCompleted: (id: string, date: string) => void;
  markPlannedCompletedNoDeduction: (id: string, date: string) => void;

  addCategory: (cat: Omit<Category, 'id' | 'isPreset'>) => void;
  deleteCategory: (id: string) => void;

  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  addDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'paidAmount' | 'status' | 'payments' | 'scheduledPayments'> & { initialScheduledPayments?: Omit<ScheduledPayment, 'id'>[] }) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id'>) => void;
  updateDebtPayment: (debtId: string, paymentId: string, updates: Pick<DebtPayment, 'accountId' | 'amount' | 'date' | 'note'>) => void;
  deleteDebtPayment: (debtId: string, paymentId: string) => void;
  revertDebtPaymentToScheduled: (debtId: string, paymentId: string) => void;
  addScheduledPayment: (debtId: string, payment: Omit<ScheduledPayment, 'id'>) => void;
  deleteScheduledPayment: (debtId: string, scheduledId: string) => void;
  markScheduledAsPaid: (debtId: string, scheduledId: string, accountId: string) => void;
  markScheduledCompletedNoDeduction: (debtId: string, scheduledId: string, date: string) => void;
  unmarkScheduledCompleted: (debtId: string, scheduledId: string, date: string) => void;

  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  notificationsLastChecked: string;
  setOnboardingCompleted: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationsLastChecked: (date: string) => void;

  clearAllData: () => void;
  importData: (data: {
    accounts?: Account[];
    transactions?: Transaction[];
    plannedExpenses?: PlannedExpense[];
    categories?: Category[];
    budgets?: Budget[];
    debts?: Debt[];
  }) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      proExpiry: null,
      appliedPromoCode: null,
      language: 'ru',
      defaultCurrency: 'RUB',
      accounts: [],
      transactions: [],
      plannedExpenses: [],
      categories: PRESET_CATEGORIES,
      budgets: [],
      debts: [],
      onboardingCompleted: false,
      notificationsEnabled: false,
      notificationsLastChecked: '',
      setOnboardingCompleted: () => set({ onboardingCompleted: true }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setNotificationsLastChecked: (date) => set({ notificationsLastChecked: date }),

      activatePro: () => set({ plan: 'pro', proExpiry: null, appliedPromoCode: null }),
      activateProWithExpiry: (expiry) => set({ plan: 'pro', proExpiry: expiry, appliedPromoCode: null }),

      applyPromoCode: (code) => {
        const promo = findPromoCode(code);
        if (!promo) return { ok: false, error: 'invalid' };
        if (promo.period === 'disable') {
          set({ plan: 'free', proExpiry: null, appliedPromoCode: null });
        } else {
          const expiry = calcProExpiry(promo.period);
          set({ plan: 'pro', proExpiry: expiry, appliedPromoCode: promo.code });
        }
        return { ok: true, period: promo.period, labelRu: promo.labelRu, labelEn: promo.labelEn };
      },
      setLanguage: (lang) => set({ language: lang }),
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      addAccount: (account) => {
        const newAccount: Account = { ...account, id: uuidv4(), createdAt: new Date().toISOString() };
        set((s) => ({ accounts: [...s.accounts, newAccount] }));
      },

      updateAccount: (id, updates) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
      },

      deleteAccount: (id) => {
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id),
          plannedExpenses: s.plannedExpenses.filter((p) => p.accountId !== id),
        }));
      },

      addTransaction: (tx) => {
        const newTx: Transaction = { ...tx, id: uuidv4(), createdAt: new Date().toISOString() };
        const account = get().accounts.find((a) => a.id === tx.accountId);
        if (account) {
          const delta = tx.type === 'income' ? tx.amount : -tx.amount;
          get().updateAccount(tx.accountId, { balance: account.balance + delta });
        }
        set((s) => ({ transactions: [newTx, ...s.transactions] }));
      },

      updateTransaction: (id, updates) => {
        const old = get().transactions.find((t) => t.id === id);
        if (!old || old.type === 'transfer') return;
        // Reverse old balance
        const oldAccount = get().accounts.find((a) => a.id === old.accountId);
        if (oldAccount) {
          const reverseDelta = old.type === 'income' ? -old.amount : old.amount;
          get().updateAccount(old.accountId, { balance: oldAccount.balance + reverseDelta });
        }
        // Apply new balance (get fresh state after reversal)
        const newAccount = get().accounts.find((a) => a.id === updates.accountId);
        if (newAccount) {
          const delta = updates.type === 'income' ? updates.amount : -updates.amount;
          get().updateAccount(updates.accountId, { balance: newAccount.balance + delta });
        }
        set((s) => ({
          transactions: s.transactions.map((t) => t.id === id ? { ...t, ...updates } : t),
        }));
      },

      deleteTransaction: (id) => {
        const tx = get().transactions.find((t) => t.id === id);
        if (tx) {
          const account = get().accounts.find((a) => a.id === tx.accountId);
          if (account) {
            const delta = tx.type === 'income'
              ? -tx.amount
              : tx.amount;
            get().updateAccount(tx.accountId, { balance: account.balance + delta });
          }
          // If it's a transfer, also delete the peer transaction and reverse its balance
          if (tx.transferId && tx.transferPeerId) {
            const peer = get().transactions.find((t) => t.id === tx.transferPeerId);
            if (peer) {
              const peerAccount = get().accounts.find((a) => a.id === peer.accountId);
              if (peerAccount) {
                // peer is the "incoming" side — reverse it
                get().updateAccount(peer.accountId, { balance: peerAccount.balance - peer.amount });
              }
            }
            set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id && t.id !== tx.transferPeerId) }));
            return;
          }
        }
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      },

      addTransfer: ({ fromAccountId, toAccountId, fromAmount, toAmount, description, date }) => {
        const transferId = uuidv4();
        const outId = uuidv4();
        const inId = uuidv4();
        const now = new Date().toISOString();

        const fromAccount = get().accounts.find((a) => a.id === fromAccountId);
        const toAccount = get().accounts.find((a) => a.id === toAccountId);
        if (!fromAccount || !toAccount) return;

        const outTx: Transaction = {
          id: outId,
          accountId: fromAccountId,
          type: 'transfer',
          amount: fromAmount,
          currency: fromAccount.currency,
          categoryId: 'transfer',
          description: description || `→ ${toAccount.name}`,
          date,
          createdAt: now,
          transferId,
          transferPeerId: inId,
          transferPeerAccountId: toAccountId,
          transferRole: 'out',
        };

        const inTx: Transaction = {
          id: inId,
          accountId: toAccountId,
          type: 'transfer',
          amount: toAmount,
          currency: toAccount.currency,
          categoryId: 'transfer',
          description: description || `← ${fromAccount.name}`,
          date,
          createdAt: now,
          transferId,
          transferPeerId: outId,
          transferPeerAccountId: fromAccountId,
          transferRole: 'in',
        };

        // Update balances
        get().updateAccount(fromAccountId, { balance: fromAccount.balance - fromAmount });
        get().updateAccount(toAccountId, { balance: toAccount.balance + toAmount });

        set((s) => ({ transactions: [outTx, inTx, ...s.transactions] }));
      },

      updateTransfer: (outTxId, { fromAccountId, toAccountId, fromAmount, toAmount, description, date }) => {
        const s = get();
        const outTx = s.transactions.find((t) => t.id === outTxId);
        if (!outTx || !outTx.transferPeerId) return;
        const inTx = s.transactions.find((t) => t.id === outTx.transferPeerId);
        if (!inTx) return;

        // Net balance deltas (reverse old, apply new)
        const deltas: Record<string, number> = {};
        const d = (id: string, v: number) => { deltas[id] = (deltas[id] ?? 0) + v; };
        d(outTx.accountId, +outTx.amount);
        d(inTx.accountId, -inTx.amount);
        d(fromAccountId, -fromAmount);
        d(toAccountId, +toAmount);

        const newFromAcc = s.accounts.find((a) => a.id === fromAccountId);
        const newToAcc = s.accounts.find((a) => a.id === toAccountId);
        const fromCurrency = newFromAcc?.currency ?? outTx.currency;
        const toCurrency = newToAcc?.currency ?? inTx.currency;
        const toAccName = newToAcc?.name ?? '?';
        const fromAccName = newFromAcc?.name ?? '?';

        set((state) => ({
          accounts: state.accounts.map((a) =>
            deltas[a.id] !== undefined ? { ...a, balance: a.balance + deltas[a.id] } : a
          ),
          transactions: state.transactions.map((t) => {
            if (t.id === outTxId) return {
              ...t,
              accountId: fromAccountId,
              amount: fromAmount,
              currency: fromCurrency,
              description: description || `→ ${toAccName}`,
              date,
              transferPeerAccountId: toAccountId,
            };
            if (t.id === outTx.transferPeerId) return {
              ...t,
              accountId: toAccountId,
              amount: toAmount,
              currency: toCurrency,
              description: description || `← ${fromAccName}`,
              date,
              transferPeerAccountId: fromAccountId,
            };
            return t;
          }),
        }));
      },

      addPlannedExpense: (expense) => {
        const newExpense: PlannedExpense = {
          ...expense,
          id: uuidv4(),
          completedDates: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ plannedExpenses: [...s.plannedExpenses, newExpense] }));
      },

      updatePlannedExpense: (id, updates) => {
        set((s) => ({
          plannedExpenses: s.plannedExpenses.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deletePlannedExpense: (id) => {
        set((s) => ({ plannedExpenses: s.plannedExpenses.filter((p) => p.id !== id) }));
      },

      togglePlannedCompleted: (id, date) => {
        const expense = get().plannedExpenses.find((p) => p.id === id);
        if (!expense) return;
        const isCompleted = expense.completedDates.includes(date);
        const account = get().accounts.find((a) => a.id === expense.accountId);

        const isIncome = expense.type === 'income';
        if (isCompleted) {
          // Unmark: reverse balance
          if (account) {
            const delta = isIncome ? -expense.amount : expense.amount;
            get().updateAccount(expense.accountId, { balance: account.balance + delta });
          }
          get().updatePlannedExpense(id, {
            completedDates: expense.completedDates.filter((d) => d !== date),
          });
        } else {
          // Mark as completed: apply balance
          if (account) {
            const delta = isIncome ? expense.amount : -expense.amount;
            get().updateAccount(expense.accountId, { balance: account.balance + delta });
          }
          get().updatePlannedExpense(id, {
            completedDates: [...expense.completedDates, date],
          });
        }
      },

      markPlannedCompletedNoDeduction: (id, date) => {
        const expense = get().plannedExpenses.find((p) => p.id === id);
        if (!expense) return;
        if (expense.completedDates.includes(date)) return;
        get().updatePlannedExpense(id, {
          completedDates: [...expense.completedDates, date],
        });
      },

      addCategory: (cat) => {
        const newCat: Category = { ...cat, id: uuidv4(), isPreset: false };
        set((s) => ({ categories: [...s.categories, newCat] }));
      },

      deleteCategory: (id) => {
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id || c.isPreset) }));
      },

      addBudget: (budget) => {
        const newBudget: Budget = { ...budget, id: uuidv4(), createdAt: new Date().toISOString() };
        set((s) => ({ budgets: [...s.budgets, newBudget] }));
      },

      updateBudget: (id, updates) => {
        set((s) => ({ budgets: s.budgets.map((b) => b.id === id ? { ...b, ...updates } : b) }));
      },

      deleteBudget: (id) => {
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
      },

      addDebt: (debt) => {
        const { initialScheduledPayments, ...debtData } = debt as typeof debt & { initialScheduledPayments?: Omit<ScheduledPayment, 'id'>[] };
        const scheduledPayments: ScheduledPayment[] = (initialScheduledPayments ?? []).map(
          (sp) => ({ ...sp, id: uuidv4() })
        );
        const newDebt: Debt = {
          ...debtData,
          id: uuidv4(),
          paidAmount: 0,
          status: 'active',
          payments: [],
          scheduledPayments,
          createdAt: new Date().toISOString(),
        };
        // Reflect initial transfer in account balance
        if (debtData.accountId) {
          const account = get().accounts.find((a) => a.id === debtData.accountId);
          if (account) {
            // lent = I gave money out → balance decreases
            // borrowed = I received money → balance increases
            const delta = debtData.direction === 'lent' ? -debtData.amount : debtData.amount;
            get().updateAccount(debtData.accountId, { balance: account.balance + delta });
          }
        }
        set((s) => ({ debts: [newDebt, ...s.debts] }));
      },

      updateDebt: (id, updates) => {
        set((s) => ({ debts: s.debts.map((d) => d.id === id ? { ...d, ...updates } : d) }));
      },

      deleteDebt: (id) => {
        const debt = get().debts.find((d) => d.id === id);
        // Reverse the initial balance change if account was linked
        if (debt?.accountId) {
          const account = get().accounts.find((a) => a.id === debt.accountId);
          if (account) {
            const delta = debt.direction === 'lent' ? debt.amount : -debt.amount;
            get().updateAccount(debt.accountId, { balance: account.balance + delta });
          }
        }
        set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }));
      },

      addDebtPayment: (debtId, payment) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const accountId = payment.accountId;
        const account = get().accounts.find((a) => a.id === accountId);
        if (!account) return;

        const newPayment: DebtPayment = { ...payment, id: uuidv4() };
        const newPaidAmount = debt.paidAmount + payment.amount;
        const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'active';

        // Affect account balance:
        // lent = someone owes me → they pay me → balance increases (+)
        // borrowed = I owe someone → I pay them → balance decreases (-)
        const delta = debt.direction === 'lent' ? payment.amount : -payment.amount;
        get().updateAccount(accountId, { balance: account.balance + delta });

        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, payments: [...d.payments, newPayment], paidAmount: newPaidAmount, status: newStatus }
              : d
          ),
        }));
      },

      updateDebtPayment: (debtId, paymentId, updates) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const oldPayment = debt.payments.find((p) => p.id === paymentId);
        if (!oldPayment) return;

        // Reverse old balance change
        const oldAccount = get().accounts.find((a) => a.id === oldPayment.accountId);
        if (oldAccount) {
          const reverseDelta = debt.direction === 'lent' ? -oldPayment.amount : oldPayment.amount;
          get().updateAccount(oldPayment.accountId, { balance: oldAccount.balance + reverseDelta });
        }

        // Apply new balance change
        const newAccount = get().accounts.find((a) => a.id === updates.accountId);
        if (newAccount) {
          const newDelta = debt.direction === 'lent' ? updates.amount : -updates.amount;
          get().updateAccount(updates.accountId, { balance: newAccount.balance + newDelta });
        }

        const newPayments = debt.payments.map((p) =>
          p.id === paymentId ? { ...p, ...updates } : p
        );
        const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'active';

        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, payments: newPayments, paidAmount: newPaidAmount, status: newStatus }
              : d
          ),
        }));
      },

      deleteDebtPayment: (debtId, paymentId) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const payment = debt.payments.find((p) => p.id === paymentId);
        if (!payment) return;
        const account = get().accounts.find((a) => a.id === payment.accountId);
        if (!account) return;

        // Reverse the balance change
        const delta = debt.direction === 'lent' ? -payment.amount : payment.amount;
        get().updateAccount(payment.accountId, { balance: account.balance + delta });

        const newPaidAmount = debt.paidAmount - payment.amount;
        const newPayments = debt.payments.filter((p) => p.id !== paymentId);
        const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'active';

        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, payments: newPayments, paidAmount: Math.max(0, newPaidAmount), status: newStatus }
              : d
          ),
        }));
      },

      revertDebtPaymentToScheduled: (debtId, paymentId) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const payment = debt.payments.find((p) => p.id === paymentId);
        if (!payment) return;
        const account = get().accounts.find((a) => a.id === payment.accountId);
        if (account) {
          const delta = debt.direction === 'lent' ? -payment.amount : payment.amount;
          get().updateAccount(payment.accountId, { balance: account.balance + delta });
        }
        const newPaidAmount = Math.max(0, debt.paidAmount - payment.amount);
        const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'active';
        const newPayments = debt.payments.filter((p) => p.id !== paymentId);
        // If this payment came from a scheduled payment, clear its paidDate (restore to pending)
        let newScheduled = debt.scheduledPayments ?? [];
        if (payment.scheduledPaymentId) {
          newScheduled = newScheduled.map((sp) =>
            sp.id === payment.scheduledPaymentId
              ? { ...sp, paidDate: undefined }
              : sp
          );
        }
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, payments: newPayments, paidAmount: newPaidAmount, status: newStatus, scheduledPayments: newScheduled }
              : d
          ),
        }));
      },

      addScheduledPayment: (debtId, payment) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const newPayment: ScheduledPayment = { ...payment, id: uuidv4(), completedDates: [] };
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, scheduledPayments: [...(d.scheduledPayments ?? []), newPayment] }
              : d
          ),
        }));
      },

      deleteScheduledPayment: (debtId, scheduledId) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? { ...d, scheduledPayments: (d.scheduledPayments ?? []).filter((p) => p.id !== scheduledId) }
              : d
          ),
        }));
      },

      markScheduledAsPaid: (debtId, scheduledId, accountId) => {
        const debt = get().debts.find((d) => d.id === debtId);
        if (!debt) return;
        const scheduled = (debt.scheduledPayments ?? []).find((p) => p.id === scheduledId);
        if (!scheduled) return;
        const account = get().accounts.find((a) => a.id === accountId);
        if (!account) return;

        // Add as regular payment
        const newPayment: DebtPayment = {
          id: uuidv4(),
          accountId,
          amount: scheduled.amount,
          date: scheduled.dueDate,
          note: scheduled.note || (debt.direction === 'lent'
            ? (get().language === 'ru' ? 'План. оплата' : 'Scheduled payment')
            : (get().language === 'ru' ? 'План. оплата' : 'Scheduled payment')),
          scheduledPaymentId: scheduled.id,
          scheduledPaymentDueDate: scheduled.dueDate,
          scheduledPaymentSourceAccountId: scheduled.sourceAccountId,
        };
        const newPaidAmount = debt.paidAmount + scheduled.amount;
        const delta = debt.direction === 'lent' ? scheduled.amount : -scheduled.amount;
        get().updateAccount(accountId, { balance: account.balance + delta });

        const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'active';

        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  payments: [...d.payments, newPayment],
                  paidAmount: newPaidAmount,
                  status: newStatus,
                  scheduledPayments: (d.scheduledPayments ?? []).map((p) =>
                    p.id === scheduledId
                      ? { ...p, paidDate: new Date().toISOString().slice(0, 10) }
                      : p
                  ),
                }
              : d
          ),
        }));
      },

      markScheduledCompletedNoDeduction: (debtId, scheduledId, date) => {
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  scheduledPayments: (d.scheduledPayments ?? []).map((sp) =>
                    sp.id === scheduledId
                      ? { ...sp, completedDates: [...(sp.completedDates ?? []), date] }
                      : sp
                  ),
                }
              : d
          ),
        }));
      },

      unmarkScheduledCompleted: (debtId, scheduledId, date) => {
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  scheduledPayments: (d.scheduledPayments ?? []).map((sp) =>
                    sp.id === scheduledId
                      ? { ...sp, completedDates: (sp.completedDates ?? []).filter((d) => d !== date) }
                      : sp
                  ),
                }
              : d
          ),
        }));
      },

      clearAllData: () => {
        set({ accounts: [], transactions: [], plannedExpenses: [], categories: PRESET_CATEGORIES, budgets: [], debts: [] });
      },

      importData: (data) => {
        set((s) => ({
          accounts: data.accounts ?? s.accounts,
          transactions: data.transactions ?? s.transactions,
          plannedExpenses: data.plannedExpenses ?? s.plannedExpenses,
          categories: data.categories ?? s.categories,
          budgets: data.budgets ?? s.budgets,
          debts: data.debts ?? s.debts,
        }));
      },
    }),
    { name: 'fincalendar-v1' }
  )
);
