import { useEffect, useCallback, useRef, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useStore } from '../store';
import { getUpcomingExpenses, formatAmount } from '../utils';
import type { ToastItem, ToastType } from '../components/Toast';

let toastIdCounter = 0;
const mkId = () => `toast-${++toastIdCounter}`;

function buildToasts(
  accounts: ReturnType<typeof useStore.getState>['accounts'],
  plannedExpenses: ReturnType<typeof useStore.getState>['plannedExpenses'],
  debts: ReturnType<typeof useStore.getState>['debts'],
  budgets: ReturnType<typeof useStore.getState>['budgets'],
  transactions: ReturnType<typeof useStore.getState>['transactions'],
  language: string
): ToastItem[] {
  const items: ToastItem[] = [];
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const in3dStr = format(addDays(new Date(), 3), 'yyyy-MM-dd');
  const isRu = language === 'ru';

  // 1. Payments due today
  const todayExpenses = getUpcomingExpenses(plannedExpenses, 1).filter((u) => u.date === todayStr);
  for (const { expense } of todayExpenses) {
    items.push({
      id: mkId(),
      type: 'payment',
      title: isRu ? 'Платёж сегодня' : 'Payment due today',
      message: `${expense.description || (isRu ? 'Запланированный платёж' : 'Planned payment')} — ${formatAmount(expense.amount, expense.currency)}`,
    });
  }

  // 2. Payments due tomorrow
  const tomorrowExpenses = getUpcomingExpenses(plannedExpenses, 2).filter((u) => u.date === tomorrowStr);
  for (const { expense } of tomorrowExpenses) {
    items.push({
      id: mkId(),
      type: 'payment',
      title: isRu ? 'Платёж завтра' : 'Payment due tomorrow',
      message: `${expense.description || (isRu ? 'Запланированный платёж' : 'Planned payment')} — ${formatAmount(expense.amount, expense.currency)}`,
    });
  }

  // 3. Debt due dates approaching
  for (const debt of debts) {
    if (debt.status !== 'active' || !debt.dueDate) continue;
    if (debt.dueDate < todayStr) {
      const isLent = debt.direction === 'lent';
      items.push({
        id: mkId(),
        type: 'debt',
        title: isRu ? 'Просроченный долг' : 'Overdue debt',
        message: isLent
          ? (isRu ? `${debt.personName} должен вернуть ${formatAmount(debt.amount - debt.paidAmount, debt.currency)}` : `${debt.personName} owes ${formatAmount(debt.amount - debt.paidAmount, debt.currency)}`)
          : (isRu ? `Верните долг: ${formatAmount(debt.amount - debt.paidAmount, debt.currency)}` : `Return debt: ${formatAmount(debt.amount - debt.paidAmount, debt.currency)}`),
      });
    } else if (debt.dueDate <= in3dStr) {
      const isLent = debt.direction === 'lent';
      items.push({
        id: mkId(),
        type: 'debt',
        title: isRu ? 'Срок долга близко' : 'Debt due soon',
        message: isLent
          ? (isRu ? `${debt.personName} должен вернуть до ${format(parseISO(debt.dueDate), 'd MMM')}` : `${debt.personName} due by ${format(parseISO(debt.dueDate), 'MMM d')}`)
          : (isRu ? `Возврат долга до ${format(parseISO(debt.dueDate), 'd MMM')}` : `Debt due by ${format(parseISO(debt.dueDate), 'MMM d')}`),
      });
    }

    // Scheduled payments due today/tomorrow
    for (const sp of debt.scheduledPayments ?? []) {
      if (sp.dueDate === todayStr || sp.dueDate === tomorrowStr) {
        const label = sp.dueDate === todayStr
          ? (isRu ? 'сегодня' : 'today')
          : (isRu ? 'завтра' : 'tomorrow');
        items.push({
          id: mkId(),
          type: 'debt',
          title: isRu ? `Выплата по долгу ${label}` : `Debt payment ${label}`,
          message: `${debt.personName} — ${formatAmount(sp.amount, debt.currency)}`,
        });
      }
    }
  }

  // 4. Budget alerts (>= 80%)
  const now = new Date();
  const monthStartStr = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const monthEndStr = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
  for (const budget of budgets) {
    const spent = transactions
      .filter((tx) => tx.type === 'expense' && tx.categoryId === budget.categoryId && tx.date >= monthStartStr && tx.date <= monthEndStr)
      .reduce((s, tx) => s + tx.amount, 0);
    const pct = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    if (pct >= 100) {
      items.push({
        id: mkId(),
        type: 'budget',
        title: isRu ? 'Бюджет превышен!' : 'Budget exceeded!',
        message: isRu
          ? `Потрачено ${formatAmount(spent, budget.currency)} из ${formatAmount(budget.limit, budget.currency)}`
          : `Spent ${formatAmount(spent, budget.currency)} of ${formatAmount(budget.limit, budget.currency)}`,
      });
    } else if (pct >= 80) {
      items.push({
        id: mkId(),
        type: 'budget',
        title: isRu ? `Бюджет на ${pct}%` : `Budget at ${pct}%`,
        message: isRu
          ? `Осталось ${formatAmount(budget.limit - spent, budget.currency)}`
          : `${formatAmount(budget.limit - spent, budget.currency)} remaining`,
      });
    }
  }

  // 5. Low balance warning: if any account will go negative after today's planned expenses
  const totalCurrent = accounts.reduce((s, a) => s + a.balance, 0);
  const todayPlannedTotal = todayExpenses.reduce((s, u) => s + u.expense.amount, 0);
  if (totalCurrent - todayPlannedTotal < 0 && accounts.length > 0) {
    items.push({
      id: mkId(),
      type: 'balance',
      title: isRu ? 'Недостаточно средств' : 'Insufficient funds',
      message: isRu
        ? `После сегодняшних платежей баланс может уйти в минус`
        : `Balance may go negative after today's payments`,
    });
  }

  return items;
}

export function useSmartNotifications() {
  const { accounts, plannedExpenses, debts, budgets, transactions, language, notificationsEnabled, notificationsLastChecked, setNotificationsEnabled, setNotificationsLastChecked } = useStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const checkedRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestPermission = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const ret = await LocalNotifications.requestPermissions();
      return ret.display === 'granted';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const enableNotifications = useCallback(async () => {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
    return granted;
  }, [requestPermission, setNotificationsEnabled]);

  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
  }, [setNotificationsEnabled]);

  const runCheck = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (notificationsLastChecked === todayStr && checkedRef.current) return;
    checkedRef.current = true;

    const items = buildToasts(accounts, plannedExpenses, debts, budgets, transactions, language);
    if (items.length === 0) return;

    setNotificationsLastChecked(todayStr);

    if (notificationsEnabled) {
      const hasNativeNotifs = Capacitor.isNativePlatform();
      const hasBrowserNotifs = !Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted';

      if (hasNativeNotifs) {
        const notifs = items.slice(0, 3).map((item, i) => ({
          id: i + 1,
          title: item.title,
          body: item.message,
        }));
        try {
          await LocalNotifications.schedule({ notifications: notifs });
        } catch { /* non-critical */ }
      } else if (hasBrowserNotifs) {
        items.slice(0, 3).forEach((item) => {
          try {
            new Notification(item.title, { body: item.message, icon: '/icon-192.png' });
          } catch { /* non-critical */ }
        });
      }
    }

    // Always show in-app toasts (max 4 visible at once)
    setToasts(items.slice(0, 4));
  }, [accounts, plannedExpenses, debts, budgets, transactions, language, notificationsEnabled, notificationsLastChecked, setNotificationsLastChecked]);

  useEffect(() => {
    const timer = setTimeout(runCheck, 1500);
    return () => clearTimeout(timer);
  }, [runCheck]);

  return { toasts, dismissToast, enableNotifications, disableNotifications, notificationsEnabled };
}
