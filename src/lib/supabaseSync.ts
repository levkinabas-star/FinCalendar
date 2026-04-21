import { supabase } from './supabase';
import { useStore } from '../store';

const ROW_ID = 'default';

type SyncData = {
  accounts: unknown[];
  transactions: unknown[];
  plannedExpenses: unknown[];
  categories: unknown[];
  budgets: unknown[];
  debts: unknown[];
  plan: string;
  proExpiry: string | null;
  appliedPromoCode: string | null;
  language: string;
  defaultCurrency: string;
};

export async function loadFromSupabase(): Promise<SyncData | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('id', ROW_ID)
    .single();

  if (error || !data) return null;
  return data.data as SyncData;
}

export async function saveToSupabase(snapshot: SyncData): Promise<void> {
  await supabase.from('user_data').upsert({
    id: ROW_ID,
    data: snapshot,
    updated_at: new Date().toISOString(),
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = useStore.getState();
    saveToSupabase({
      accounts: s.accounts,
      transactions: s.transactions,
      plannedExpenses: s.plannedExpenses,
      categories: s.categories,
      budgets: s.budgets,
      debts: s.debts,
      plan: s.plan,
      proExpiry: s.proExpiry,
      appliedPromoCode: s.appliedPromoCode,
      language: s.language,
      defaultCurrency: s.defaultCurrency,
    });
  }, 1500);
}
