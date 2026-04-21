import { useEffect } from 'react';
import { useStore } from '../store';
import { loadFromSupabase, scheduleSave } from '../lib/supabaseSync';

export function useSupabaseSync() {
  const importData = useStore((s) => s.importData);

  // Load from Supabase on mount
  useEffect(() => {
    loadFromSupabase().then((remote) => {
      if (!remote) return;
      importData({
        accounts: (remote.accounts as never) ?? [],
        transactions: (remote.transactions as never) ?? [],
        plannedExpenses: (remote.plannedExpenses as never) ?? [],
        categories: (remote.categories as never) ?? [],
        budgets: (remote.budgets as never) ?? [],
        debts: (remote.debts as never) ?? [],
      });
    });
  }, []);

  // Save to Supabase on any store change
  useEffect(() => {
    const unsub = useStore.subscribe(() => scheduleSave());
    return () => unsub();
  }, []);
}
