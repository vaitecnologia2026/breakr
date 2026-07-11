// Página de retorno do consentimento OAuth do Google (redirect_uri
// /auth/google/callback). Lê o "code" da URL, envia ao backend para guardar o
// refresh token e volta para Configurações → Integrações com o resultado.
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function GoogleCallback() {
  const navigate = useNavigate();
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      navigate('/configuracoes?google=erro', { replace: true });
      return;
    }
    api
      .post('/agendamento/google/oauth/callback', { code })
      .then(() => navigate('/configuracoes?google=ok', { replace: true }))
      .catch((e: any) => {
        const motivo = e?.response?.data?.message;
        navigate('/configuracoes?google=erro' + (motivo ? '&motivo=' + encodeURIComponent(motivo) : ''), { replace: true });
      });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--texto-suave)', fontSize: 14 }}>
      Conectando ao Google Agenda…
    </div>
  );
}
