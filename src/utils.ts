import { addWeeks, addMonths, addYears, parseISO, format, isAfter, isBefore, isEqual, differenceInDays } from 'date-fns';
import { Currency, PlannedExpense, Debt, ScheduledPayment } from './types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '₽', USD: '$', EUR: '€', GBP: '£',
  KZT: '₸', CNY: '¥', UAH: '₴', BYN: 'Br', AED: 'د.إ', TRY: '₺',
};

export const CURRENCY_NAMES: Record<Currency, { ru: string; en: string }> = {
  RUB: { ru: 'Российский рубль', en: 'Russian Ruble' },
  USD: { ru: 'Доллар США', en: 'US Dollar' },
  EUR: { ru: 'Евро', en: 'Euro' },
  GBP: { ru: 'Фунт стерлингов', en: 'British Pound' },
  KZT: { ru: 'Казахстанский тенге', en: 'Kazakhstani Tenge' },
  CNY: { ru: 'Китайский юань', en: 'Chinese Yuan' },
  UAH: { ru: 'Украинская гривна', en: 'Ukrainian Hryvnia' },
  BYN: { ru: 'Белорусский рубль', en: 'Belarusian Ruble' },
  AED: { ru: 'Дирхам ОАЭ', en: 'UAE Dirham' },
  TRY: { ru: 'Турецкая лира', en: 'Turkish Lira' },
};

export const ALL_CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR', 'GBP', 'KZT', 'CNY', 'UAH', 'BYN', 'AED', 'TRY'];

export function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const formatted = abs.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (currency === 'RUB' || currency === 'KZT' || currency === 'UAH' || currency === 'BYN' || currency === 'TRY') {
    return `${sign}${formatted} ${symbol}`;
  }
  if (currency === 'AED') return `${sign}${formatted} ${symbol}`;
  return `${sign}${symbol}${formatted}`;
}

export function isOccurrence(expense: PlannedExpense, dateStr: string): boolean {
  const startDate = parseISO(expense.startDate);
  const targetDate = parseISO(dateStr);

  if (!expense.recurring) {
    return expense.startDate === dateStr;
  }

  const { frequency, endDate: endDateStr } = expense.recurring;
  const endDate = parseISO(endDateStr);

  if (isBefore(targetDate, startDate) || isAfter(targetDate, endDate)) return false;

  if (frequency === 'weekly') {
    const diff = differenceInDays(targetDate, startDate);
    return diff >= 0 && diff % 7 === 0;
  } else if (frequency === 'monthly') {
    return targetDate.getDate() === startDate.getDate();
  } else if (frequency === 'yearly') {
    return targetDate.getDate() === startDate.getDate() && targetDate.getMonth() === startDate.getMonth();
  }

  return false;
}

export interface MonthEventMap {
  [dateStr: string]: { pending: number; completed: number };
}

export function getDatesWithEventsInMonth(
  expenses: PlannedExpense[],
  year: number,
  month: number
): MonthEventMap {
  const result: MonthEventMap = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd');
    for (const expense of expenses) {
      if (isOccurrence(expense, dateStr)) {
        if (!result[dateStr]) result[dateStr] = { pending: 0, completed: 0 };
        if (expense.completedDates.includes(dateStr)) {
          result[dateStr].completed++;
        } else {
          result[dateStr].pending++;
        }
      }
    }
  }

  return result;
}

export function getExpensesForDate(expenses: PlannedExpense[], dateStr: string) {
  return expenses.filter(e => isOccurrence(e, dateStr));
}

export function getUpcomingExpenses(expenses: PlannedExpense[], days = 30) {
  const today = new Date();
  const result: { expense: PlannedExpense; date: string }[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = format(d, 'yyyy-MM-dd');

    for (const expense of expenses) {
      if (isOccurrence(expense, dateStr) && !expense.completedDates.includes(dateStr)) {
        result.push({ expense, date: dateStr });
      }
    }
  }

  return result;
}

export const ACCOUNT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981',
  '#F59E0B', '#EF4444', '#06B6D4', '#F97316',
  '#6366F1', '#14B8A6', '#84CC16', '#A855F7',
];

export const ACCOUNT_ICONS = [
  '💰', '💳', '🏦', '💎', '🏧', '📱', '🛒', '✈️',
  '🏠', '🚗', '💊', '📚', '🎯', '⭐', '🔑', '💼',
];

export const PRESET_CATEGORIES = [
  { id: 'food', name: 'Еда и кафе', nameEn: 'Food & Cafe', icon: '🍔', type: 'expense' as const, color: '#FF6B6B', isPreset: true },
  { id: 'transport', name: 'Транспорт', nameEn: 'Transport', icon: '🚗', type: 'expense' as const, color: '#4ECDC4', isPreset: true },
  { id: 'shopping', name: 'Покупки', nameEn: 'Shopping', icon: '🛍️', type: 'expense' as const, color: '#DDA0DD', isPreset: true },
  { id: 'entertainment', name: 'Развлечения', nameEn: 'Entertainment', icon: '🎬', type: 'expense' as const, color: '#45B7D1', isPreset: true },
  { id: 'health', name: 'Здоровье', nameEn: 'Health', icon: '💊', type: 'expense' as const, color: '#96CEB4', isPreset: true },
  { id: 'education', name: 'Образование', nameEn: 'Education', icon: '📚', type: 'expense' as const, color: '#98D8C8', isPreset: true },
  { id: 'housing', name: 'Жильё', nameEn: 'Housing', icon: '🏠', type: 'expense' as const, color: '#F7DC6F', isPreset: true },
  { id: 'utilities', name: 'Коммунальные', nameEn: 'Utilities', icon: '💡', type: 'expense' as const, color: '#82E0AA', isPreset: true },
  { id: 'subscriptions', name: 'Подписки', nameEn: 'Subscriptions', icon: '📺', type: 'expense' as const, color: '#BB8FCE', isPreset: true },
  { id: 'salary', name: 'Зарплата', nameEn: 'Salary', icon: '💼', type: 'income' as const, color: '#58D68D', isPreset: true },
  { id: 'freelance', name: 'Фриланс', nameEn: 'Freelance', icon: '💻', type: 'income' as const, color: '#5DADE2', isPreset: true },
  { id: 'investment', name: 'Инвестиции', nameEn: 'Investment', icon: '📈', type: 'income' as const, color: '#F4D03F', isPreset: true },
  { id: 'gift', name: 'Подарок', nameEn: 'Gift', icon: '🎁', type: 'both' as const, color: '#EB84B0', isPreset: true },
  { id: 'other', name: 'Другое', nameEn: 'Other', icon: '📌', type: 'both' as const, color: '#95A5A6', isPreset: true },
];

export interface DebtPaymentMap {
  [dateStr: string]: { count: number; total: number };
}

export function getDebtPaymentsInMonth(debts: Debt[], year: number, month: number): DebtPaymentMap {
  const result: DebtPaymentMap = {};
  for (const debt of debts) {
    for (const payment of debt.payments) {
      const pDate = parseISO(payment.date);
      if (pDate.getFullYear() === year && pDate.getMonth() === month) {
        if (!result[payment.date]) result[payment.date] = { count: 0, total: 0 };
        result[payment.date].count++;
        result[payment.date].total += payment.amount;
      }
    }
  }
  return result;
}

export function getDebtPaymentsForDate(debts: Debt[], dateStr: string) {
  return debts.flatMap((debt) =>
    debt.payments
      .filter((p) => p.date === dateStr)
      .map((p) => ({ ...p, debt }))
  );
}

export interface ScheduledPaymentMap {
  [dateStr: string]: { count: number; total: number };
}

export function getDebtsWithDueDateInMonth(debts: Debt[], year: number, month: number): { [dateStr: string]: Debt[] } {
  const result: { [dateStr: string]: Debt[] } = {};
  for (const debt of debts) {
    if (debt.dueDate && debt.status === 'active') {
      const d = parseISO(debt.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!result[debt.dueDate]) result[debt.dueDate] = [];
        result[debt.dueDate].push(debt);
      }
    }
  }
  return result;
}

export function getScheduledPaymentsInMonth(debts: Debt[], year: number, month: number): ScheduledPaymentMap {
  const result: ScheduledPaymentMap = {};
  for (const debt of debts) {
    const scheduled = debt.scheduledPayments ?? [];
    for (const sp of scheduled) {
      if (sp.paidDate) continue; // skip paid ones
      const pDate = parseISO(sp.dueDate);
      if (pDate.getFullYear() === year && pDate.getMonth() === month) {
        if (!result[sp.dueDate]) result[sp.dueDate] = { count: 0, total: 0 };
        result[sp.dueDate].count++;
        result[sp.dueDate].total += sp.amount;
      }
    }
  }
  return result;
}

export interface DebtScheduledPayment extends ScheduledPayment {
  debt: Debt;
}

export function getScheduledPaymentsForDate(debts: Debt[], dateStr: string): DebtScheduledPayment[] {
  return debts.flatMap((debt) =>
    (debt.scheduledPayments ?? [])
      .filter((sp) => sp.dueDate === dateStr)
      .map((sp) => ({ ...sp, debt }))
  );
}
