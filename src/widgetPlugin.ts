import { registerPlugin } from '@capacitor/core';

export interface WidgetDataPlugin {
  updateData(options: {
    totalBalance: string;
    currency: string;
    txDates: string;
    pendingDates: string;
    completedDates: string;
    debtDates: string;
  }): Promise<{ updated: boolean }>;
  getPendingAction(): Promise<{ action: string }>;
}

export const WidgetData = registerPlugin<WidgetDataPlugin>('WidgetData', {
  // Web stub — no-op outside Android
  web: {
    updateData: async () => ({ updated: false }),
    getPendingAction: async () => ({ action: '' }),
  },
});
