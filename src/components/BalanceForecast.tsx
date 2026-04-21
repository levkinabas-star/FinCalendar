import { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store';
import { formatAmount, getUpcomingExpenses, isOccurrence } from '../utils';

const DAYS = 30;

interface ForecastPoint {
  date: string;
  label: string;
  balance: number;
  change: number;
}

function buildForecast(
  accounts: ReturnType<typeof useStore.getState>['accounts'],
  plannedExpenses: ReturnType<typeof useStore.getState>['plannedExpenses'],
  debts: ReturnType<typeof useStore.getState>['debts'],
  defaultCurrency: string
): ForecastPoint[] {
  const startBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const points: ForecastPoint[] = [];
  let running = startBalance;

  for (let i = 0; i <= DAYS; i++) {
    const d = addDays(new Date(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    let dayChange = 0;

    // Planned expenses/income for this day
    for (const pe of plannedExpenses) {
      if (!isOccurrence(pe, dateStr)) continue;
      if (pe.completedDates.includes(dateStr)) continue;
      if (pe.type === 'income') dayChange += pe.amount;
      else dayChange -= pe.amount;
    }

    // Scheduled debt payments for this day
    for (const debt of debts) {
      if (debt.status !== 'active') continue;
      for (const sp of debt.scheduledPayments ?? []) {
        if (sp.dueDate !== dateStr) continue;
        if (debt.direction === 'lent') dayChange += sp.amount;
        else dayChange -= sp.amount;
      }
    }

    running += dayChange;

    points.push({
      date: dateStr,
      label: i === 0 ? (format(d, 'd') ) : format(d, i % 5 === 0 ? 'd MMM' : 'd'),
      balance: Math.round(running),
      change: Math.round(dayChange),
    });
  }

  return points;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ForecastPoint }>;
  label?: string;
  currency: string;
  language: string;
}

function CustomTooltip({ active, payload, currency, language }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const { balance, change, date } = payload[0].payload;
  const isRu = language === 'ru';
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: '#1A1A2E', border: '1px solid #2A2A4A' }}>
      <p className="text-slate-400 mb-1">{format(new Date(date + 'T00:00:00'), isRu ? 'd MMM' : 'MMM d')}</p>
      <p className="font-bold text-slate-100">{formatAmount(balance, currency as any)}</p>
      {change !== 0 && (
        <p style={{ color: change > 0 ? '#10B981' : '#EF4444' }}>
          {change > 0 ? '+' : ''}{formatAmount(change, currency as any)}
        </p>
      )}
    </div>
  );
}

export default function BalanceForecast() {
  const { accounts, plannedExpenses, debts, defaultCurrency, language } = useStore();
  const [expanded, setExpanded] = useState(false);
  const isRu = language === 'ru';

  const data = useMemo(
    () => buildForecast(accounts, plannedExpenses, debts, defaultCurrency),
    [accounts, plannedExpenses, debts, defaultCurrency]
  );

  if (accounts.length === 0) return null;

  const currentBalance = data[0]?.balance ?? 0;
  const forecastBalance = data[data.length - 1]?.balance ?? 0;
  const delta = forecastBalance - currentBalance;
  const minBalance = Math.min(...data.map((d) => d.balance));
  const willGoNegative = minBalance < 0;

  // Only show ticks every 5 days for cleaner chart
  const tickData = data.filter((_, i) => i === 0 || i % 5 === 0 || i === DAYS);

  return (
    <div className="mx-5 mb-5">
      <button
        className="flex items-center justify-between w-full mb-3 active-scale"
        onClick={() => setExpanded((v) => !v)}
      >
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {isRu ? 'Прогноз баланса' : 'Balance Forecast'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: delta >= 0 ? '#10B981' : '#EF4444' }}>
            {isRu ? 'через 30 дн.' : 'in 30 days'}:{' '}
            {delta >= 0 ? '+' : ''}{formatAmount(delta, defaultCurrency as any)}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {/* Summary cards — always visible */}
      <div
        className="rounded-3xl p-4 relative overflow-hidden"
        style={{
          background: willGoNegative
            ? 'linear-gradient(135deg, #2D1B1B 0%, #1A0E0E 100%)'
            : 'linear-gradient(135deg, #1A2744 0%, #0E1929 100%)',
          border: willGoNegative ? '1px solid #EF444430' : '1px solid #1E3A5F',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-slate-500 mb-0.5">{isRu ? 'Сейчас' : 'Now'}</p>
            <p className="text-lg font-bold text-slate-100">{formatAmount(currentBalance, defaultCurrency as any)}</p>
          </div>
          <div className="text-slate-500 text-xl">→</div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500 mb-0.5">{isRu ? 'Через 30 дней' : 'In 30 days'}</p>
            <p className="text-lg font-bold" style={{ color: forecastBalance >= 0 ? '#F1F5F9' : '#EF4444' }}>
              {formatAmount(forecastBalance, defaultCurrency as any)}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: delta >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
          >
            {delta >= 0
              ? <TrendingUp size={16} color="#10B981" />
              : <TrendingDown size={16} color="#EF4444" />}
          </div>
        </div>

        {willGoNegative && (
          <div className="rounded-xl px-3 py-2 mb-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-red-400">
              {isRu
                ? `Минимальный прогнозный баланс: ${formatAmount(minBalance, defaultCurrency as any)}`
                : `Minimum forecast balance: ${formatAmount(minBalance, defaultCurrency as any)}`}
            </p>
          </div>
        )}

        {/* Chart — shown when expanded or always if compact */}
        {(expanded) && (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  ticks={tickData.map((d) => d.date)}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00');
                    return format(d, 'd');
                  }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip currency={defaultCurrency} language={language} />} />
                {minBalance < 0 && (
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                )}
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={willGoNegative ? '#EF4444' : '#3B82F6'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: willGoNegative ? '#EF4444' : '#3B82F6', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-400 font-medium mt-1 flex items-center gap-1"
          >
            {isRu ? 'Показать график' : 'Show chart'}
            <ChevronDown size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
