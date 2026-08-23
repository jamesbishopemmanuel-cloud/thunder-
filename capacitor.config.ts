import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.veylora.app',
  appName: 'Veylora',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {}
};

export default config;
