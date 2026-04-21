import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fincalendar.app',
  appName: 'FinCalendar',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'budgettracker',
      keystorePassword: 'BudgetTracker2026!',
      keystoreAliasPassword: 'BudgetTracker2026!',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    LocalNotifications: {
      smallIcon: 'mipmap/ic_launcher',
      iconColor: '#6366F1',
      soundEnabled: true,
      vibrationEnabled: true,
    },
  },
};

export default config;
