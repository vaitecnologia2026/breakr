import { Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';
import { NotificationBell } from '../components/NotificationBell';
import { Logo } from '../components/Logo';

/**
 * Shell pós-login do Breakr OS (Fase 0 — Fundação).
 * Sidebar + header com sininho/usuário/logout + área central que hospeda as
 * rotas filhas via <Outlet/> (Início, Clientes, Squads…).
 */
export function Dashboard() {
  const { usuario, logout } = useAuth();

  // Iniciais para o avatar do header.
  const iniciais = (usuario?.nome ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--preto-fumaca)',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 28px',
            borderBottom: '1px solid var(--borda)',
            background: 'rgba(22, 19, 10, 0.6)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Logo />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <NotificationBell />

            <span
              aria-hidden="true"
              style={{ width: 1, height: 26, background: 'var(--borda)' }}
            />

            <div
              style={{
                textAlign: 'right',
                lineHeight: 1.2,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{usuario?.nome}</span>
              <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                {usuario?.cargo}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="brk-gradient-bg"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {iniciais}
            </div>

            <button
              onClick={logout}
              style={{
                border: '1px solid var(--borda-forte)',
                background: 'transparent',
                color: 'var(--texto-suave)',
                borderRadius: 9,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--laranja-brasa)';
                e.currentTarget.style.color = 'var(--cinza-vapor)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--borda-forte)';
                e.currentTarget.style.color = 'var(--texto-suave)';
              }}
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo das rotas filhas */}
        <main
          style={{
            flex: 1,
            padding: '28px',
            width: '100%',
            maxWidth: 1180,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
