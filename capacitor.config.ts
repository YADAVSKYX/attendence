import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yadavskyx.attendence',
  appName: 'Attendence',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  server: {
    cleartext: true,
  },
};

export default config;
