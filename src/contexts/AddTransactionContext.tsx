import { createContext, useContext } from 'react';

interface AddTransactionContextType {
  openAdd: (mode?: 'expense' | 'income' | 'transfer', date?: string) => void;
}

export const AddTransactionContext = createContext<AddTransactionContextType>({
  openAdd: () => {},
});

export const useAddTransaction = () => useContext(AddTransactionContext);
