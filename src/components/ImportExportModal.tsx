import { useRef, useState } from 'react';
import {
  FileDown, FileUp, FileSpreadsheet, FileText, FileJson,
  CheckCircle, AlertCircle, X, Upload, Download, Crown, FolderOpen,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { FileSave } from '../fileSavePlugin';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { useStore } from '../store';
import { translations } from '../translations';
import { usePlan } from '../plan';
import {
  exportToCSV, exportToExcel, exportToPDF, exportToJSON,
  importFromCSV, importFromJSON,
  type ExportData, type ImportResult,
} from '../utils/exportImport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'export' | 'import';
type ExportType = 'csv' | 'excel' | 'pdf' | 'json';

interface ImportState {
  fileName: string;
  fileSize: number;
  format: 'csv' | 'json';
  result: ImportResult;
  jsonData: Partial<ExportData> | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportExportModal({ isOpen, onClose }: Props) {
  const {
    language, defaultCurrency, accounts, transactions, categories,
    budgets, debts, plannedExpenses, addTransaction, importData,
  } = useStore();
  const t = translations[language];
  const isRu = language === 'ru';
  const { canExportNonJson } = usePlan();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('export');
  const [exportDone, setExportDone] = useState<{ type: ExportType; filename: string } | null>(null);
  const [importDone, setImportDone] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importState, setImportState] = useState<ImportState | null>(null);

  const exportPayload: ExportData = {
    accounts, transactions, categories, budgets, debts, plannedExpenses, language, defaultCurrency,
  };

  async function handleExport(type: ExportType) {
    if (!canExportNonJson && type !== 'json') {
      navigate('/pricing');
      return;
    }
    try {
      let savedPath = '';
      switch (type) {
        case 'csv':   savedPath = await exportToCSV(exportPayload);   break;
        case 'excel': savedPath = await exportToExcel(exportPayload); break;
        case 'pdf':   savedPath = await exportToPDF(exportPayload);   break;
        case 'json':  savedPath = await exportToJSON(exportPayload);  break;
      }
      setExportDone({ type, filename: savedPath });
      setTimeout(() => setExportDone(null), 8000);
    } catch (e) {
      console.error('Export error', e);
    }
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setImportState(null);
    setImportDone(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const format: 'csv' | 'json' = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    const fileSize = file.size;
    const reader = new FileReader();

    reader.onload = (ev) => {
      const text = ev.target?.result as string;

      if (format === 'csv') {
        const result = importFromCSV(text, accounts, categories, defaultCurrency as any);
        setImportState({ fileName: file.name, fileSize, format, result, jsonData: null });
      } else {
        const jsonData = importFromJSON(text);
        if (!jsonData) {
          setImportState({
            fileName: file.name,
            fileSize,
            format,
            result: {
              transactions: [],
              errors: [isRu ? 'Неверный формат JSON' : 'Invalid JSON format'],
              warnings: [],
              rowCount: 0,
            },
            jsonData: null,
          });
        } else {
          const rowCount = (jsonData.transactions?.length ?? 0) + (jsonData.accounts?.length ?? 0);
          setImportState({
            fileName: file.name,
            fileSize,
            format,
            result: { transactions: [], errors: [], warnings: [], rowCount },
            jsonData,
          });
        }
      }
    };

    reader.readAsText(file, 'utf-8');
  }

  function handleConfirmImport() {
    if (!importState) return;
    setImporting(true);

    if (importState.format === 'csv') {
      importState.result.transactions.forEach((tx) => addTransaction(tx));
      const count = importState.result.transactions.length;
      setImportDone(`+${count} ${isRu ? 'транзакций' : 'transactions'}`);
    } else if (importState.jsonData) {
      importData(importState.jsonData);
      setImportDone(isRu ? 'Данные восстановлены' : 'Data restored');
    }

    setImportState(null);
    setImporting(false);
    setTimeout(() => setImportDone(null), 3000);
  }

  const hasErrors = (importState?.result.errors.length ?? 0) > 0;
  const canImport =
    importState !== null &&
    !hasErrors &&
    (importState.format === 'json' || importState.result.transactions.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRu ? 'Импорт / Экспорт' : 'Import / Export'} fullHeight>
      <div className="px-5 pb-8 flex flex-col gap-4">

        {/* Tabs */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
          {(['export', 'import'] as Tab[]).map((tp) => (
            <button
              key={tp}
              onClick={() => handleTabChange(tp)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale flex items-center justify-center gap-2"
              style={{
                background: tab === tp ? '#3B82F6' : 'transparent',
                color: tab === tp ? 'white' : '#64748B',
              }}
            >
              {tp === 'export' ? <FileDown size={14} /> : <FileUp size={14} />}
              {tp === 'export' ? (isRu ? 'Экспорт' : 'Export') : (isRu ? 'Импорт' : 'Import')}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {(exportDone || importDone) && (
          <div
            className="flex flex-col gap-2 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {tab === 'export' && exportDone ? (
                  <>
                    <p className="text-sm text-emerald-400 font-semibold">
                      {isRu ? 'Файл сохранён' : 'File saved'}
                    </p>
                    {exportDone.filename && (
                      <p className="text-xs text-emerald-500 mt-1 font-mono break-all leading-relaxed">
                        📁 {exportDone.filename}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-emerald-400 font-medium">{importDone}</p>
                )}
              </div>
            </div>
            {tab === 'export' && exportDone && Capacitor.isNativePlatform() && (
              <button
                onClick={() => FileSave.openExportsFolder().catch(() => {})}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold active-scale"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399' }}
              >
                <FolderOpen size={14} />
                {isRu ? 'Открыть папку Megacalendar' : 'Open Megacalendar folder'}
              </button>
            )}
          </div>
        )}

        {/* ─── EXPORT TAB ─── */}
        {tab === 'export' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {isRu
                ? 'Скачайте данные в удобном формате или сделайте резервную копию'
                : 'Download your data in a convenient format or create a backup'}
            </p>

            <ExportButton
              icon={canExportNonJson ? <FileSpreadsheet size={20} /> : <Crown size={20} />}
              color={canExportNonJson ? '#10B981' : '#F59E0B'}
              title={`Excel (.xlsx)${canExportNonJson ? '' : ' — Pro'}`}
              subtitle={isRu ? 'Таблица с несколькими листами: транзакции, счета, бюджеты, долги' : 'Multi-sheet: transactions, accounts, budgets, debts'}
              active={exportDone?.type === 'excel'}
              onClick={() => handleExport('excel')}
            />

            <ExportButton
              icon={canExportNonJson ? <FileText size={20} /> : <Crown size={20} />}
              color={canExportNonJson ? '#EF4444' : '#F59E0B'}
              title={`PDF${canExportNonJson ? '' : ' — Pro'}`}
              subtitle={isRu ? 'Красивый отчёт для печати или отправки' : 'Formatted report for printing or sharing'}
              active={exportDone?.type === 'pdf'}
              onClick={() => handleExport('pdf')}
            />

            <ExportButton
              icon={canExportNonJson ? <Download size={20} /> : <Crown size={20} />}
              color={canExportNonJson ? '#3B82F6' : '#F59E0B'}
              title={`CSV (.csv)${canExportNonJson ? '' : ' — Pro'}`}
              subtitle={isRu ? 'Совместим с CoinKeeper, Money Manager и другими' : 'Compatible with CoinKeeper, Money Manager, and more'}
              active={exportDone?.type === 'csv'}
              onClick={() => handleExport('csv')}
            />

            <ExportButton
              icon={<FileJson size={20} />}
              color="#8B5CF6"
              title="JSON (backup)"
              subtitle={isRu ? 'Полная резервная копия всех данных приложения' : 'Full backup of all app data'}
              active={exportDone?.type === 'json'}
              onClick={() => handleExport('json')}
            />

            <div className="px-4 py-3 rounded-2xl" style={{ background: '#131325' }}>
              <p className="text-xs text-slate-500">
                📊 {transactions.length} {isRu ? 'транзакций' : 'transactions'} ·{' '}
                {accounts.length} {isRu ? 'счетов' : 'accounts'} ·{' '}
                {debts.length} {isRu ? 'долгов' : 'debts'}
              </p>
            </div>
          </div>
        )}

        {/* ─── IMPORT TAB — file picker ─── */}
        {tab === 'import' && !importState && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {isRu
                ? 'Загрузите CSV-файл из другого приложения или JSON-резервную копию'
                : 'Upload a CSV file from another app or a JSON backup'}
            </p>

            <button
              type="button"
              className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl active-scale"
              style={{ border: '2px dashed #1E2A40', background: '#0E0E1C' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                <Upload size={22} className="text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-200">{isRu ? 'Выберите файл' : 'Choose a file'}</p>
                <p className="text-xs text-slate-500 mt-1">CSV · JSON</p>
              </div>
            </button>

            <input ref={fileInputRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFileSelect} />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {isRu ? 'Поддерживаемые форматы CSV' : 'Supported CSV formats'}
              </p>
              {[
                { name: 'FinCalendar CSV', desc: isRu ? 'Наш экспорт' : 'Our export' },
                { name: 'CoinKeeper',      desc: isRu ? 'Экспорт операций' : 'Transaction export' },
                { name: 'Money Manager',   desc: isRu ? 'Отчёт CSV' : 'CSV report' },
                { name: isRu ? 'Любой CSV' : 'Generic CSV', desc: 'Date, Amount, Type, Description' },
              ].map((app) => (
                <div key={app.name} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: '#131325' }}>
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-300">{app.name}</span>
                  <span className="text-xs text-slate-500">{app.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── IMPORT TAB — preview ─── */}
        {tab === 'import' && importState && (
          <div className="space-y-4">
            {/* File name + size + reset */}
            <div
              className="flex items-center gap-3 px-3 py-3 rounded-2xl"
              style={{ background: '#131325', border: '1px solid #1E2A40' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: importState.format === 'json' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)' }}
              >
                {importState.format === 'json'
                  ? <FileJson size={18} style={{ color: '#8B5CF6' }} />
                  : <FileDown size={18} style={{ color: '#3B82F6' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{importState.fileName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatFileSize(importState.fileSize)} · {importState.format.toUpperCase()}
                  {' · '}{isRu ? 'Ваши файлы' : 'Device files'}
                </p>
              </div>
              <button
                onClick={() => setImportState(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#1E1E38' }}
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Summary */}
            <div className="px-4 py-3 rounded-2xl space-y-1" style={{ background: '#131325' }}>
              <p className="text-sm font-medium text-slate-200">
                {importState.format === 'csv'
                  ? `${isRu ? 'Найдено транзакций' : 'Transactions found'}: ${importState.result.transactions.length}`
                  : `${isRu ? 'Записей в резервной копии' : 'Records in backup'}: ${importState.result.rowCount}`}
              </p>
              {importState.result.warnings.length > 0 && (
                <p className="text-xs text-yellow-400">
                  ⚠ {importState.result.warnings.length} {isRu ? 'предупреждений' : 'warnings'}
                </p>
              )}
            </div>

            {/* Errors */}
            {hasErrors && (
              <div
                className="px-4 py-3 rounded-2xl space-y-1"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {importState.result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400">{e}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {importState.result.warnings.length > 0 && (
              <div
                className="px-4 py-3 rounded-2xl space-y-1"
                style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
              >
                {importState.result.warnings.slice(0, 5).map((w, i) => (
                  <p key={i} className="text-xs text-yellow-400">⚠ {w}</p>
                ))}
                {importState.result.warnings.length > 5 && (
                  <p className="text-xs text-yellow-500">
                    ... +{importState.result.warnings.length - 5} {isRu ? 'ещё' : 'more'}
                  </p>
                )}
              </div>
            )}

            {/* CSV transaction preview */}
            {importState.format === 'csv' && importState.result.transactions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {isRu ? 'Предпросмотр (первые 5)' : 'Preview (first 5)'}
                </p>
                {importState.result.transactions.slice(0, 5).map((tx, i) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: '#131325' }}>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isIncome ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isIncome ? '#10B981' : '#EF4444',
                        }}
                      >
                        {isIncome ? '+' : '−'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {cat ? (isRu ? cat.name : cat.nameEn) : (isRu ? 'Без категории' : 'No category')}
                          {tx.description ? ` · ${tx.description}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {acc?.name} · {tx.date.slice(0, 10)}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold flex-shrink-0"
                        style={{ color: isIncome ? '#10B981' : '#EF4444' }}
                      >
                        {tx.amount.toLocaleString()} {tx.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setImportState(null)}
                className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
                style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
              >
                {t.cancel}
              </button>
              {canImport && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
                >
                  {importing ? '...' : (isRu ? 'Импортировать' : 'Import')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ExportButton({
  icon, color, title, subtitle, active, onClick,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl active-scale text-left transition-all"
      style={{
        background: active ? `${color}18` : '#1E1E38',
        border: active ? `1.5px solid ${color}60` : '1.5px solid #1E2A40',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      {active ? (
        <CheckCircle size={18} style={{ color }} className="flex-shrink-0" />
      ) : (
        <FileDown size={16} className="text-slate-500 flex-shrink-0" />
      )}
    </button>
  );
}
