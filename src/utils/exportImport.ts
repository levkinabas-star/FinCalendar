import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { FileSave } from '../fileSavePlugin';
import type { Account, Transaction, Category, Budget, Debt, PlannedExpense, Currency } from '../types';

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface ExportData {
  accounts: Account[];
  transactions: Transaction[];
  plannedExpenses: PlannedExpense[];
  categories: Category[];
  budgets: Budget[];
  debts: Debt[];
  language: string;
  defaultCurrency: string;
}

export interface ImportResult {
  transactions: Omit<Transaction, 'id' | 'createdAt'>[];
  errors: string[];
  warnings: string[];
  rowCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function tryParseDate(raw: string): Date | null {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  result.push(cell.trim());
  return result;
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map((w) => ({ wch: w }));
}

async function saveBlob(blob: Blob, filename: string, mime: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const { path } = await FileSave.saveBase64({ filename, data: btoa(binary), mime });
    return path;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return `Загрузки/${filename}`;
}

async function saveText(content: string, filename: string, mimeType: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { path } = await FileSave.saveText({ filename, data: content, mime: mimeType });
    return path;
  }
  return saveBlob(new Blob([content], { type: mimeType }), filename, mimeType);
}

function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

export async function exportToCSV(data: ExportData): Promise<string> {
  const { transactions, accounts, categories, language } = data;
  const isRu = language === 'ru';

  const header = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'Description'];
  const rows = transactions
    .filter((tx) => tx.type !== 'transfer')
    .map((tx) => {
      const account = accounts.find((a) => a.id === tx.accountId);
      const category = categories.find((c) => c.id === tx.categoryId);
      return [
        format(new Date(tx.date), 'yyyy-MM-dd'),
        tx.type,
        tx.amount.toString(),
        tx.currency,
        category ? (isRu ? category.name : category.nameEn) : '',
        account?.name ?? '',
        tx.description ?? '',
      ];
    });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const filename = `megacalendar-${today()}.csv`;
  return saveText('\uFEFF' + csv, filename, 'text/csv;charset=utf-8;');
}

// ─── Excel Export ───────────────────────────────────────────────────────────────

export async function exportToExcel(data: ExportData): Promise<string> {
  const { transactions, accounts, categories, budgets, debts, language } = data;
  const isRu = language === 'ru';
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Transactions
  const txRows = transactions
    .filter((tx) => tx.type !== 'transfer')
    .map((tx) => {
      const account = accounts.find((a) => a.id === tx.accountId);
      const category = categories.find((c) => c.id === tx.categoryId);
      return {
        [isRu ? 'Дата' : 'Date']: format(new Date(tx.date), 'dd.MM.yyyy'),
        [isRu ? 'Тип' : 'Type']: tx.type === 'income' ? (isRu ? 'Доход' : 'Income') : (isRu ? 'Расход' : 'Expense'),
        [isRu ? 'Сумма' : 'Amount']: tx.amount,
        [isRu ? 'Валюта' : 'Currency']: tx.currency,
        [isRu ? 'Категория' : 'Category']: category ? (isRu ? category.name : category.nameEn) : '',
        [isRu ? 'Счёт' : 'Account']: account?.name ?? '',
        [isRu ? 'Описание' : 'Description']: tx.description ?? '',
      };
    });
  const txSheet = XLSX.utils.json_to_sheet(txRows);
  setColumnWidths(txSheet, [12, 10, 12, 10, 18, 18, 28]);
  XLSX.utils.book_append_sheet(wb, txSheet, isRu ? 'Транзакции' : 'Transactions');

  // Sheet 2 — Accounts
  const accRows = accounts.map((acc) => ({
    [isRu ? 'Счёт' : 'Account']: acc.name,
    [isRu ? 'Баланс' : 'Balance']: acc.balance,
    [isRu ? 'Валюта' : 'Currency']: acc.currency,
  }));
  const accSheet = XLSX.utils.json_to_sheet(accRows);
  setColumnWidths(accSheet, [22, 14, 10]);
  XLSX.utils.book_append_sheet(wb, accSheet, isRu ? 'Счета' : 'Accounts');

  // Sheet 3 — Budgets
  if (budgets.length > 0) {
    const budgetRows = budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const spent = transactions
        .filter((tx) => tx.type === 'expense' && tx.categoryId === b.categoryId)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return {
        [isRu ? 'Категория' : 'Category']: cat ? (isRu ? cat.name : cat.nameEn) : '',
        [isRu ? 'Лимит' : 'Limit']: b.limit,
        [isRu ? 'Потрачено' : 'Spent']: spent,
        [isRu ? 'Осталось' : 'Remaining']: Math.max(0, b.limit - spent),
        [isRu ? 'Валюта' : 'Currency']: b.currency,
      };
    });
    const budgetSheet = XLSX.utils.json_to_sheet(budgetRows);
    setColumnWidths(budgetSheet, [18, 12, 12, 12, 10]);
    XLSX.utils.book_append_sheet(wb, budgetSheet, isRu ? 'Бюджеты' : 'Budgets');
  }

  // Sheet 4 — Debts
  if (debts.length > 0) {
    const debtRows = debts.map((d) => ({
      [isRu ? 'Имя' : 'Person']: d.personName,
      [isRu ? 'Направление' : 'Direction']: d.direction === 'lent' ? (isRu ? 'Я дал' : 'I lent') : (isRu ? 'Я взял' : 'I borrowed'),
      [isRu ? 'Сумма' : 'Amount']: d.amount,
      [isRu ? 'Оплачено' : 'Paid']: d.paidAmount,
      [isRu ? 'Осталось' : 'Remaining']: d.amount - d.paidAmount,
      [isRu ? 'Валюта' : 'Currency']: d.currency,
      [isRu ? 'Статус' : 'Status']: d.status === 'paid' ? (isRu ? 'Погашен' : 'Paid') : (isRu ? 'Активен' : 'Active'),
      [isRu ? 'Срок' : 'Due Date']: d.dueDate ? format(new Date(d.dueDate), 'dd.MM.yyyy') : '',
      [isRu ? 'Описание' : 'Description']: d.description ?? '',
    }));
    const debtSheet = XLSX.utils.json_to_sheet(debtRows);
    setColumnWidths(debtSheet, [18, 12, 12, 12, 12, 10, 10, 12, 28]);
    XLSX.utils.book_append_sheet(wb, debtSheet, isRu ? 'Долги' : 'Debts');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `megacalendar-${today()}.xlsx`;
  return saveBlob(
    new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

export function exportToPDF(data: ExportData): Promise<string> {
  const { transactions, accounts, categories, language, defaultCurrency } = data;
  const isRu = language === 'ru';
  const dateStr = format(new Date(), 'dd.MM.yyyy');
  const now = new Date();

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const monthTx = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const monthExpense = monthTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  const txRows = transactions
    .filter((tx) => tx.type !== 'transfer')
    .slice(0, 500)
    .map((tx) => {
      const account = accounts.find((a) => a.id === tx.accountId);
      const category = categories.find((c) => c.id === tx.categoryId);
      const color = tx.type === 'income' ? '#10B981' : '#EF4444';
      const sign = tx.type === 'income' ? '+' : '−';
      return `<tr>
        <td>${format(new Date(tx.date), 'dd.MM.yy')}</td>
        <td>${category ? (isRu ? category.name : category.nameEn) : '—'}</td>
        <td>${account?.name ?? '—'}</td>
        <td>${tx.description || '—'}</td>
        <td style="color:${color};font-weight:600;text-align:right">${sign}${tx.amount.toLocaleString()} ${tx.currency}</td>
      </tr>`;
    })
    .join('');

  const accountRows = accounts
    .map((acc) => `<tr>
      <td>${acc.icon} ${acc.name}</td>
      <td style="text-align:right;font-weight:600">${acc.balance.toLocaleString()} ${acc.currency}</td>
    </tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FinCalendar — ${dateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
  h1 { font-size: 22px; color: #3B82F6; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  .summary { display: flex; gap: 20px; margin-bottom: 24px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1; }
  .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .card-value { font-size: 18px; font-weight: 700; color: #1e293b; }
  .card-value.income { color: #10B981; }
  .card-value.expense { color: #EF4444; }
  h2 { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #3B82F6; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 20px; color: #94a3b8; font-size: 10px; text-align: center; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<h1>💰 FinCalendar</h1>
<p class="subtitle">${isRu ? 'Отчёт от' : 'Report'} ${dateStr}</p>
<div class="summary">
  <div class="card">
    <div class="card-label">${isRu ? 'Общий баланс' : 'Total Balance'}</div>
    <div class="card-value">${totalBalance.toLocaleString()} ${defaultCurrency}</div>
  </div>
  <div class="card">
    <div class="card-label">${isRu ? 'Доходы (месяц)' : 'Income (month)'}</div>
    <div class="card-value income">+${monthIncome.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">${isRu ? 'Расходы (месяц)' : 'Expenses (month)'}</div>
    <div class="card-value expense">−${monthExpense.toLocaleString()}</div>
  </div>
</div>
<h2>${isRu ? 'Счета' : 'Accounts'}</h2>
<table>
  <thead><tr><th>${isRu ? 'Счёт' : 'Account'}</th><th style="text-align:right">${isRu ? 'Баланс' : 'Balance'}</th></tr></thead>
  <tbody>${accountRows}</tbody>
</table>
<h2>${isRu ? 'Транзакции' : 'Transactions'}</h2>
<table>
  <thead><tr>
    <th>${isRu ? 'Дата' : 'Date'}</th>
    <th>${isRu ? 'Категория' : 'Category'}</th>
    <th>${isRu ? 'Счёт' : 'Account'}</th>
    <th>${isRu ? 'Описание' : 'Description'}</th>
    <th style="text-align:right">${isRu ? 'Сумма' : 'Amount'}</th>
  </tr></thead>
  <tbody>${txRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8">${isRu ? 'Нет данных' : 'No data'}</td></tr>`}</tbody>
</table>
<p class="footer">FinCalendar · ${dateStr}</p>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const filename = `megacalendar-${today()}.pdf`;
  if (Capacitor.isNativePlatform()) {
    return saveText(html, filename.replace('.pdf', '.html'), 'text/html;charset=utf-8').then(() =>
      `Android/data/megacalendar.app/files/Documents/${filename.replace('.pdf', '.html')}`
    );
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) setTimeout(() => URL.revokeObjectURL(url), 10000);
  return Promise.resolve(filename);
}

// ─── JSON Backup Export ─────────────────────────────────────────────────────────

export async function exportToJSON(data: ExportData): Promise<string> {
  const payload = JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), ...data }, null, 2);
  const filename = `megacalendar-backup-${today()}.json`;
  return saveText(payload, filename, 'application/json');
}

// ─── CSV Import ─────────────────────────────────────────────────────────────────

export function importFromCSV(
  csvText: string,
  accounts: Account[],
  categories: Category[],
  defaultCurrency: Currency
): ImportResult {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { transactions: [], errors: ['Файл пустой / Empty file'], warnings: [], rowCount: 0 };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, '').trim());
  const col = (variants: string[]) =>
    headers.findIndex((h) => variants.some((v) => h.includes(v)));

  const dateIdx     = col(['date', 'дата', 'datum', 'fecha']);
  const typeIdx     = col(['type', 'тип', 'typ']);
  const amountIdx   = col(['amount', 'сумма', 'betrag', 'importe', 'sum']);
  const currencyIdx = col(['currency', 'валюта', 'währung', 'moneda']);
  const categoryIdx = col(['category', 'категория', 'kategorie', 'categoría']);
  const accountIdx  = col(['account', 'счёт', 'счет', 'konto', 'cuenta']);
  const descIdx     = col(['description', 'описание', 'note', 'примечание', 'comment', 'memo', 'notiz']);

  if (amountIdx === -1) {
    return {
      transactions: [],
      errors: ['Не найдена колонка "Amount/Сумма". Проверьте формат файла.'],
      warnings: [],
      rowCount: 0,
    };
  }

  const transactions: Omit<Transaction, 'id' | 'createdAt'>[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);

    const rawAmount = (cols[amountIdx] ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const numAmount = parseFloat(rawAmount);
    if (isNaN(numAmount) || numAmount === 0) {
      warnings.push(`Строка ${i + 1}: некорректная сумма, пропущено`);
      continue;
    }

    let type: 'income' | 'expense' = numAmount >= 0 ? 'income' : 'expense';
    if (typeIdx !== -1) {
      const raw = (cols[typeIdx] ?? '').toLowerCase();
      if (raw.includes('income') || raw.includes('доход') || raw.includes('einnahme') || raw.includes('ingreso')) {
        type = 'income';
      } else if (raw.includes('expense') || raw.includes('расход') || raw.includes('ausgabe') || raw.includes('gasto')) {
        type = 'expense';
      }
    }

    let date = new Date().toISOString();
    if (dateIdx !== -1 && cols[dateIdx]) {
      const parsed = tryParseDate(cols[dateIdx]);
      if (parsed) date = parsed.toISOString();
      else warnings.push(`Строка ${i + 1}: дата не распознана («${cols[dateIdx]}»), использована текущая`);
    }

    let categoryId = '';
    if (categoryIdx !== -1 && cols[categoryIdx]) {
      const name = cols[categoryIdx].toLowerCase().trim();
      const cat = categories.find((c) => c.name.toLowerCase() === name || c.nameEn.toLowerCase() === name);
      if (cat) categoryId = cat.id;
    }

    let accountId = accounts[0]?.id ?? '';
    if (accountIdx !== -1 && cols[accountIdx]) {
      const name = cols[accountIdx].toLowerCase().trim();
      const acc = accounts.find((a) => a.name.toLowerCase() === name);
      if (acc) accountId = acc.id;
    }

    const rawCurrency = currencyIdx !== -1 ? (cols[currencyIdx] ?? '').trim().toUpperCase() : '';
    const currency: Currency = (rawCurrency || accounts.find((a) => a.id === accountId)?.currency || defaultCurrency) as Currency;

    transactions.push({
      accountId,
      type,
      amount: Math.abs(numAmount),
      currency,
      categoryId,
      description: descIdx !== -1 ? (cols[descIdx] ?? '') : '',
      date,
      transferId: undefined,
      transferPeerId: undefined,
      transferPeerAccountId: undefined,
      transferRole: undefined,
    });
  }

  return { transactions, errors: [], warnings, rowCount: transactions.length };
}

// ─── JSON Backup Import ─────────────────────────────────────────────────────────

export function importFromJSON(jsonText: string): Partial<ExportData> | null {
  try {
    const data = JSON.parse(jsonText);
    if (!data.accounts || !data.transactions) return null;
    return data as Partial<ExportData>;
  } catch {
    return null;
  }
}
