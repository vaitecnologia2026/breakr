// Registro de push (FCM) do app nativo. Roda SOMENTE dentro do app Capacitor
// (Android/iOS); no navegador todas as funções viram no-op. Como o app é
// server-mode, este código roda dentro da WebView que carrega o site, então é
// aqui — no front — que pedimos a permissão, obtemos o token FCM e o enviamos
// para a API (`POST /push/subscribe`). No logout, removemos o token
// (`POST /push/unsubscribe`).
import { Capacitor } from '@capacitor/core';
import { api } from './api';

const PUSH_TOKEN_KEY = 'breakr.pushToken';
let listenersRegistrados = false;

/**
 * Pede permissão de notificações, registra no FCM e envia o token para a API.
 * Chamar após o login (com o JWT já salvo). Seguro chamar várias vezes.
 */
export async function inicializarPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // só no app nativo

  const { PushNotifications } = await import('@capacitor/push-notifications');

  let permissao = await PushNotifications.checkPermissions();
  if (permissao.receive === 'prompt' || permissao.receive === 'prompt-with-rationale') {
    permissao = await PushNotifications.requestPermissions();
  }
  if (permissao.receive !== 'granted') return;

  if (!listenersRegistrados) {
    listenersRegistrados = true;

    // Token FCM recebido: guarda e envia para a API.
    await PushNotifications.addListener('registration', async (token) => {
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, token.value);
        await api.post('/push/subscribe', {
          token: token.value,
          plataforma: Capacitor.getPlatform(), // 'android' | 'ios'
        });
      } catch {
        // Silencioso: falha de rede não deve travar o app. Tenta de novo no
        // próximo login/abertura.
      }
    });

    await PushNotifications.addListener('registrationError', () => {
      // Silencioso.
    });

    // Toque numa notificação com `link` no data → navega para a rota.
    await PushNotifications.addListener('pushNotificationActionPerformed', (acao) => {
      const link = acao.notification?.data?.link;
      if (typeof link === 'string' && link.startsWith('/')) {
        try {
          window.location.assign(link);
        } catch {
          /* noop */
        }
      }
    });
  }

  await PushNotifications.register();
}

/**
 * Remove o token de push da API. Chamar ANTES de limpar o JWT no logout, para
 * que a chamada seja autenticada.
 */
export async function encerrarPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const token = localStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await api.post('/push/unsubscribe', { token });
  } catch {
    /* noop */
  }
  localStorage.removeItem(PUSH_TOKEN_KEY);
}
