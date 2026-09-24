import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sa.lantaallam.app',
  appName: 'لنتعلم',
  webDir: 'artifacts/learn-platform/dist/public',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;