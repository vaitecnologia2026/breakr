import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

const LINKS = [
  { para: '/', rotulo: 'Dashboard', icone: '⬡', fim: true },
  { para: '/comercial', rotulo: 'Comercial', icone: '◈', fim: false },
  { para: '/clientes', rotulo: 'Clientes', icone: '◉', fim: false },
  { para: '/contratos', rotulo: 'Contratos', icone: '◫', fim: false },
  { para: '/cobrancas', rotulo: 'Cobranças', icone: '◈', fim: false },
  { para: '/projetos', rotulo: 'Projetos', icone: '◫', fim: false },
  { para: '/conteudos', rotulo: 'Conteúdo', icone: '◧', fim: false },
  { para: '/qualidade', rotulo: 'Qualidade', icone: '◈', fim: false },
  { para: '/trafego', rotulo: 'Tráfego', icone: '◈', fim: false },
  { para: '/squads', rotulo: 'Squads', icone: '◉', fim: false },
  { para: '/recrutamento', rotulo: 'Recrutamento', icone: '◈', fim: false },
  { para: '/compras', rotulo: 'Compras', icone: '◫', fim: false },
  { para: '/desenvolvimento', rotulo: 'Bugs & Dev', icone: '◈', fim: false },
  { para: '/automacoes', rotulo: 'Automações', icone: '◈', fim: false },
  { para: '/atendimento', rotulo: 'Atendimento', icone: '◉', fim: false },
] as const;

const LINKS_ADMIN = [
  { para: '/equipe', rotulo: 'Equipe', icone: '◉', fim: false },
  { para: '/configuracoes', rotulo: 'Configurações', icone: '◈', fim: false },
] as const;

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const isAdmin = usuario?.cargo === 'ADMIN' || usuario?.cargo === 'SUPERADMIN';

  return (
    <aside className="brk-sidebar">
      <div className="brk-sidebar-logo">
        <Logo tamanho={24} />
      </div>

      <nav className="brk-sidebar-nav">
        <div className="brk-sidebar-group">
          <span className="brk-sidebar-label">Principal</span>
          {LINKS.map((l) => (
            <SidebarLink key={l.para} {...l} />
          ))}
        </div>

        {isAdmin && (
          <div className="brk-sidebar-group">
            <span className="brk-sidebar-label">Gestão</span>
            {LINKS_ADMIN.map((l) => (
              <SidebarLink key={l.para} {...l} />
            ))}
          </div>
        )}
      </nav>

      <div className="brk-sidebar-footer">
        <div className="brk-sidebar-user">
          <span className="brk-sidebar-avatar">
            {usuario?.nome?.charAt(0).toUpperCase() ?? 'U'}
          </span>
          <div className="brk-sidebar-user-info">
            <span className="brk-sidebar-user-nome">{usuario?.nome ?? '—'}</span>
            <span className="brk-sidebar-user-cargo">{usuario?.cargo ?? ''}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="brk-sidebar-logout"
          title="Sair"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ para, rotulo, fim }: { para: string; rotulo: string; icone: string; fim: boolean }) {
  return (
    <NavLink
      to={para}
      end={fim}
      className={({ isActive }) => `brk-sidebar-item${isActive ? ' active' : ''}`}
    >
      <span className="brk-sidebar-dot" aria-hidden="true" />
      <span className="brk-sidebar-item-label">{rotulo}</span>
    </NavLink>
  );
}

// Hook para sidebar mobile
export function useSidebarMobile() {
  const [aberta, setAberta] = useState(false);
  return { aberta, abrir: () => setAberta(true), fechar: () => setAberta(false), alternar: () => setAberta((v) => !v) };
}
