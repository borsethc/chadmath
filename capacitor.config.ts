import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chadborseth.chadmath',
  appName: 'ChadMath',
  webDir: 'public',
  server: {
    url: 'https://chadmath-production-887b.up.railway.app',
    cleartext: true
  }
};

export default config;
