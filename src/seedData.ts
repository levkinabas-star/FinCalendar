import { Account, Transaction, PlannedExpense, Budget, Debt } from './types';

const now = new Date('2026-04-19');

const d = (daysAgo: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const ts = (daysAgo: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'acc-card',
    name: 'Банковская карта',
    balance: 87450,
    currency: 'RUB',
    color: '#6366f1',
    icon: '💳',
    createdAt: ts(90),
  },
  {
    id: 'acc-cash',
    name: 'Наличные',
    balance: 12800,
    currency: 'RUB',
    color: '#10b981',
    icon: '💵',
    createdAt: ts(90),
  },
  {
    id: 'acc-savings',
    name: 'Накопления',
    balance: 310000,
    currency: 'RUB',
    color: '#f59e0b',
    icon: '🏦',
    createdAt: ts(90),
  },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  // Апрель
  { id: 'tx-1', accountId: 'acc-card', type: 'income', amount: 95000, currency: 'RUB', categoryId: 'salary', description: 'Зарплата апрель', date: d(2), createdAt: ts(2) },
  { id: 'tx-2', accountId: 'acc-card', type: 'expense', amount: 3200, currency: 'RUB', categoryId: 'food', description: 'ВкусВилл', date: d(2), createdAt: ts(2) },
  { id: 'tx-3', accountId: 'acc-cash', type: 'expense', amount: 580, currency: 'RUB', categoryId: 'transport', description: 'Такси', date: d(3), createdAt: ts(3) },
  { id: 'tx-4', accountId: 'acc-card', type: 'expense', amount: 12500, currency: 'RUB', categoryId: 'shopping', description: 'Ozon — одежда', date: d(3), createdAt: ts(3) },
  { id: 'tx-5', accountId: 'acc-card', type: 'expense', amount: 890, currency: 'RUB', categoryId: 'subscriptions', description: 'Яндекс Плюс', date: d(4), createdAt: ts(4) },
  { id: 'tx-6', accountId: 'acc-card', type: 'expense', amount: 4100, currency: 'RUB', categoryId: 'food', description: 'Перекрёсток', date: d(5), createdAt: ts(5) },
  { id: 'tx-7', accountId: 'acc-card', type: 'expense', amount: 2400, currency: 'RUB', categoryId: 'entertainment', description: 'Кино + кафе', date: d(6), createdAt: ts(6) },
  { id: 'tx-8', accountId: 'acc-card', type: 'expense', amount: 1650, currency: 'RUB', categoryId: 'health', description: 'Аптека', date: d(7), createdAt: ts(7) },
  { id: 'tx-9', accountId: 'acc-card', type: 'income', amount: 15000, currency: 'RUB', categoryId: 'freelance', description: 'Заказ — лендинг', date: d(8), createdAt: ts(8) },
  { id: 'tx-10', accountId: 'acc-card', type: 'expense', amount: 28000, currency: 'RUB', categoryId: 'housing', description: 'Аренда квартиры', date: d(9), createdAt: ts(9) },
  { id: 'tx-11', accountId: 'acc-card', type: 'expense', amount: 3800, currency: 'RUB', categoryId: 'utilities', description: 'ЖКХ апрель', date: d(10), createdAt: ts(10) },
  { id: 'tx-12', accountId: 'acc-card', type: 'expense', amount: 1200, currency: 'RUB', categoryId: 'transport', description: 'Метро (карта)', date: d(11), createdAt: ts(11) },
  { id: 'tx-13', accountId: 'acc-card', type: 'expense', amount: 6700, currency: 'RUB', categoryId: 'food', description: 'Ресторан с друзьями', date: d(12), createdAt: ts(12) },
  { id: 'tx-14', accountId: 'acc-card', type: 'expense', amount: 990, currency: 'RUB', categoryId: 'subscriptions', description: 'Spotify', date: d(13), createdAt: ts(13) },
  { id: 'tx-15', accountId: 'acc-card', type: 'expense', amount: 5200, currency: 'RUB', categoryId: 'education', description: 'Курс английского', date: d(14), createdAt: ts(14) },
  // Март
  { id: 'tx-16', accountId: 'acc-card', type: 'income', amount: 95000, currency: 'RUB', categoryId: 'salary', description: 'Зарплата март', date: d(32), createdAt: ts(32) },
  { id: 'tx-17', accountId: 'acc-card', type: 'expense', amount: 4500, currency: 'RUB', categoryId: 'food', description: 'Продукты неделя', date: d(33), createdAt: ts(33) },
  { id: 'tx-18', accountId: 'acc-card', type: 'expense', amount: 28000, currency: 'RUB', categoryId: 'housing', description: 'Аренда март', date: d(34), createdAt: ts(34) },
  { id: 'tx-19', accountId: 'acc-card', type: 'expense', amount: 3600, currency: 'RUB', categoryId: 'utilities', description: 'ЖКХ март', date: d(35), createdAt: ts(35) },
  { id: 'tx-20', accountId: 'acc-card', type: 'income', amount: 22000, currency: 'RUB', categoryId: 'freelance', description: 'Фриланс — мобильное приложение', date: d(38), createdAt: ts(38) },
  { id: 'tx-21', accountId: 'acc-card', type: 'expense', amount: 8900, currency: 'RUB', categoryId: 'shopping', description: 'Wildberries', date: d(40), createdAt: ts(40) },
  { id: 'tx-22', accountId: 'acc-card', type: 'expense', amount: 3100, currency: 'RUB', categoryId: 'entertainment', description: 'Концерт', date: d(42), createdAt: ts(42) },
  { id: 'tx-23', accountId: 'acc-card', type: 'expense', amount: 2200, currency: 'RUB', categoryId: 'health', description: 'Врач терапевт', date: d(44), createdAt: ts(44) },
  { id: 'tx-24', accountId: 'acc-card', type: 'expense', amount: 1400, currency: 'RUB', categoryId: 'transport', description: 'Такси март', date: d(46), createdAt: ts(46) },
  // Февраль
  { id: 'tx-25', accountId: 'acc-card', type: 'income', amount: 95000, currency: 'RUB', categoryId: 'salary', description: 'Зарплата февраль', date: d(62), createdAt: ts(62) },
  { id: 'tx-26', accountId: 'acc-card', type: 'expense', amount: 28000, currency: 'RUB', categoryId: 'housing', description: 'Аренда февраль', date: d(63), createdAt: ts(63) },
  { id: 'tx-27', accountId: 'acc-card', type: 'expense', amount: 12000, currency: 'RUB', categoryId: 'gift', description: '14 февраля — подарок', date: d(65), createdAt: ts(65) },
  { id: 'tx-28', accountId: 'acc-card', type: 'expense', amount: 4200, currency: 'RUB', categoryId: 'food', description: 'Продукты февраль', date: d(67), createdAt: ts(67) },
  { id: 'tx-29', accountId: 'acc-savings', type: 'income', amount: 30000, currency: 'RUB', categoryId: 'investment', description: 'Проценты по вкладу', date: d(70), createdAt: ts(70) },
  { id: 'tx-30', accountId: 'acc-card', type: 'expense', amount: 3500, currency: 'RUB', categoryId: 'utilities', description: 'ЖКХ февраль', date: d(72), createdAt: ts(72) },
];

export const SEED_BUDGETS: Budget[] = [
  { id: 'bud-1', categoryId: 'food', limit: 20000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
  { id: 'bud-2', categoryId: 'transport', limit: 5000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
  { id: 'bud-3', categoryId: 'entertainment', limit: 8000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
  { id: 'bud-4', categoryId: 'shopping', limit: 15000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
  { id: 'bud-5', categoryId: 'health', limit: 5000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
  { id: 'bud-6', categoryId: 'subscriptions', limit: 3000, period: 'monthly', currency: 'RUB', createdAt: ts(90) },
];

export const SEED_PLANNED: PlannedExpense[] = [
  {
    id: 'plan-1',
    accountId: 'acc-card',
    type: 'expense',
    amount: 28000,
    currency: 'RUB',
    categoryId: 'housing',
    description: 'Аренда квартиры',
    startDate: '2026-01-05',
    completedDates: ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-2',
    accountId: 'acc-card',
    type: 'expense',
    amount: 3800,
    currency: 'RUB',
    categoryId: 'utilities',
    description: 'ЖКХ',
    startDate: '2026-01-10',
    completedDates: ['2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-3',
    accountId: 'acc-card',
    type: 'expense',
    amount: 890,
    currency: 'RUB',
    categoryId: 'subscriptions',
    description: 'Яндекс Плюс',
    startDate: '2026-01-15',
    completedDates: ['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-4',
    accountId: 'acc-card',
    type: 'income',
    amount: 95000,
    currency: 'RUB',
    categoryId: 'salary',
    description: 'Зарплата',
    startDate: '2026-01-01',
    completedDates: ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-5',
    accountId: 'acc-card',
    type: 'expense',
    amount: 5200,
    currency: 'RUB',
    categoryId: 'education',
    description: 'Курс английского',
    startDate: '2026-01-20',
    completedDates: ['2026-01-20', '2026-02-20', '2026-03-20', '2026-04-20'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-6',
    accountId: 'acc-card',
    type: 'expense',
    amount: 990,
    currency: 'RUB',
    categoryId: 'subscriptions',
    description: 'Spotify',
    startDate: '2026-01-25',
    completedDates: ['2026-01-25', '2026-02-25', '2026-03-25'],
    recurring: { frequency: 'monthly', endDate: '2026-12-31' },
    createdAt: ts(90),
  },
  {
    id: 'plan-7',
    accountId: 'acc-card',
    type: 'expense',
    amount: 45000,
    currency: 'RUB',
    categoryId: 'other',
    description: 'Отпуск — Сочи',
    startDate: '2026-05-10',
    completedDates: [],
    createdAt: ts(5),
  },
  {
    id: 'plan-8',
    accountId: 'acc-card',
    type: 'expense',
    amount: 25000,
    currency: 'RUB',
    categoryId: 'shopping',
    description: 'Новый ноутбук',
    startDate: '2026-04-28',
    completedDates: [],
    createdAt: ts(3),
  },
];

export const SEED_DEBTS: Debt[] = [
  {
    id: 'debt-1',
    direction: 'lent',
    personName: 'Алексей Смирнов',
    amount: 25000,
    currency: 'RUB',
    description: 'Занял до конца месяца',
    dueDate: '2026-04-30',
    accountId: 'acc-card',
    paidAmount: 10000,
    status: 'active',
    payments: [
      { id: 'dp-1', accountId: 'acc-card', amount: 10000, date: d(10), note: 'Частичный возврат' },
    ],
    scheduledPayments: [
      { id: 'sp-1', amount: 15000, dueDate: '2026-04-30', note: 'Остаток долга', completedDates: [] },
    ],
    createdAt: ts(30),
  },
  {
    id: 'debt-2',
    direction: 'borrowed',
    personName: 'Мария Иванова',
    amount: 15000,
    currency: 'RUB',
    description: 'На ремонт',
    dueDate: '2026-05-15',
    accountId: 'acc-cash',
    paidAmount: 0,
    status: 'active',
    payments: [],
    scheduledPayments: [
      { id: 'sp-2', amount: 7500, dueDate: '2026-04-30', note: 'Первый взнос', completedDates: [] },
      { id: 'sp-3', amount: 7500, dueDate: '2026-05-15', note: 'Второй взнос', completedDates: [] },
    ],
    createdAt: ts(20),
  },
  {
    id: 'debt-3',
    direction: 'lent',
    personName: 'Дмитрий Козлов',
    amount: 8000,
    currency: 'RUB',
    description: 'До зарплаты',
    dueDate: '2026-04-25',
    accountId: 'acc-cash',
    paidAmount: 8000,
    status: 'paid',
    payments: [
      { id: 'dp-2', accountId: 'acc-cash', amount: 8000, date: d(5), note: 'Полный возврат' },
    ],
    scheduledPayments: [],
    createdAt: ts(35),
  },
];
