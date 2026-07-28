import type { CapacitorConfig } from '@capacitor/cli';

// Breakr Android (Capacitor 8) — SERVER-MODE.
// A WebView carrega o front live do VPS (https://breakr.vaitecnologia.com.br),
// que já é saudável e fala com a API em https://api-breakr.vaitecnologia.com.br.
// O `webDir` aponta para o bundle buildado (apps/web/dist) apenas porque o
// Capacitor exige um dir válido; em runtime o app abre a `server.url` acima.
const config: CapacitorConfig = {
  appId: 'com.vaitecnologia.breakr',
  appName: 'Breakr',
  webDir: 'dist',
  server: {
    url: 'https://breakr.vaitecnologia.com.br',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F0D05',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#0F0D05',
      style: 'DARK',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
