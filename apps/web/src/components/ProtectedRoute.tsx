import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Raio } from './Logo';

/**
 * Protege rotas privadas: enquanto valida a sessão exibe um loader na marca;
 * sem usuário autenticado redireciona para /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--preto-fumaca)',
        }}
      >
        <div style={{ animation: 'brk-pulse 1.2s ease-in-out infinite' }}>
          <Raio tamanho={44} />
        </div>
        <style>{`@keyframes brk-pulse { 0%,100% { opacity: .35; transform: scale(.96); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
