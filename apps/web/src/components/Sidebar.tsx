import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

// ─── SVG Icon helper ──────────────────────────────────────────────────────────

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// ─── Ícones individuais ───────────────────────────────────────────────────────

const IcoHome = () => (
  <Ico>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Ico>
);

const IcoBriefcase = () => (
  <Ico>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Ico>
);

const IcoUsers = () => (
  <Ico>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Ico>
);

const IcoFileText = () => (
  <Ico>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </Ico>
);

const IcoCreditCard = () => (
  <Ico>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Ico>
);

const IcoLayout = () => (
  <Ico>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </Ico>
);

const IcoImage = () => (
  <Ico>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Ico>
);

const IcoStar = () => (
  <Ico>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Ico>
);

const IcoTrendingUp = () => (
  <Ico>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Ico>
);

const IcoDiamond = () => (
  <Ico>
    <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" />
  </Ico>
);

const IcoUserPlus = () => (
  <Ico>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </Ico>
);

const IcoShoppingBag = () => (
  <Ico>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Ico>
);

const IcoCode = () => (
  <Ico>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Ico>
);

const IcoZap = () => (
  <Ico>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Ico>
);

const IcoMessageCircle = () => (
  <Ico>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Ico>
);

const IcoUserCheck = () => (
  <Ico>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </Ico>
);

const IcoSettings = () => (
  <Ico>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Ico>
);

const IcoChevronLeft = () => (
  <Ico>
    <polyline points="15 18 9 12 15 6" />
  </Ico>
);

const IcoChevronRight = () => (
  <Ico>
    <polyline points="9 18 15 12 9 6" />
  </Ico>
);

const IcoLogOut = () => (
  <Ico>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Ico>
);

// ─── Dados de navegação ───────────────────────────────────────────────────────

interface NavItem {
  para: string;
  rotulo: string;
  icone: React.ReactNode;
  fim?: boolean;
}

const LINKS: NavItem[] = [
  { para: '/', rotulo: 'Dashboard', icone: <IcoHome />, fim: true },
  { para: '/comercial', rotulo: 'Comercial', icone: <IcoBriefcase /> },
  { para: '/clientes', rotulo: 'Clientes', icone: <IcoUsers /> },
  { para: '/contratos', rotulo: 'Contratos', icone: <IcoFileText /> },
  { para: '/cobrancas', rotulo: 'Cobranças', icone: <IcoCreditCard /> },
  { para: '/projetos', rotulo: 'Projetos', icone: <IcoLayout /> },
  { para: '/conteudos', rotulo: 'Conteúdo', icone: <IcoImage /> },
  { para: '/qualidade', rotulo: 'Qualidade', icone: <IcoStar /> },
  { para: '/trafego', rotulo: 'Tráfego', icone: <IcoTrendingUp /> },
  { para: '/squads', rotulo: 'Squads', icone: <IcoDiamond /> },
  { para: '/recrutamento', rotulo: 'Recrutamento', icone: <IcoUserPlus /> },
  { para: '/compras', rotulo: 'Compras', icone: <IcoShoppingBag /> },
  { para: '/desenvolvimento', rotulo: 'Bugs & Dev', icone: <IcoCode /> },
  { para: '/automacoes', rotulo: 'Automações', icone: <IcoZap /> },
  { para: '/atendimento', rotulo: 'Atendimento', icone: <IcoMessageCircle /> },
];

const LINKS_ADMIN: NavItem[] = [
  { para: '/equipe', rotulo: 'Equipe', icone: <IcoUserCheck /> },
  { para: '/configuracoes', rotulo: 'Configurações', icone: <IcoSettings /> },
];

// ─── Componente principal ─────────────────────────────────────────────────────

const COLLAPSED_KEY = 'brk.sidebar.collapsed';

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const isAdmin = usuario?.cargo === 'ADMIN' || usuario?.cargo === 'SUPERADMIN';
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* noop */ }
  }

  return (
    <aside className={`brk-sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="brk-sidebar-logo">
        <Logo tamanho={collapsed ? 20 : 22} />
      </div>

      {/* Navegação */}
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

      {/* Footer */}
      <div className="brk-sidebar-footer">
        {/* Toggle collapse */}
        <button
          type="button"
          className="brk-sidebar-toggle"
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
          <span className="brk-sidebar-toggle-label">Recolher</span>
        </button>

        {/* Usuário + logout */}
        <div className="brk-sidebar-user-area">
          <span className="brk-sidebar-avatar" title={usuario?.nome ?? ''}>
            {usuario?.nome?.charAt(0).toUpperCase() ?? 'U'}
          </span>
          <div className="brk-sidebar-user-info">
            <span className="brk-sidebar-user-nome">{usuario?.nome ?? '—'}</span>
            <span className="brk-sidebar-user-cargo">{usuario?.cargo ?? ''}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="brk-sidebar-logout"
            title="Sair"
          >
            <IcoLogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Link de navegação ────────────────────────────────────────────────────────

function SidebarLink({ para, rotulo, icone, fim }: NavItem) {
  return (
    <NavLink
      to={para}
      end={fim}
      className={({ isActive }) => `brk-sidebar-item${isActive ? ' active' : ''}`}
      title={rotulo}
    >
      <span className="brk-sidebar-icon" aria-hidden="true">{icone}</span>
      <span className="brk-sidebar-item-label">{rotulo}</span>
    </NavLink>
  );
}

// Hook para sidebar mobile
export function useSidebarMobile() {
  const [aberta, setAberta] = useState(false);
  return {
    aberta,
    abrir: () => setAberta(true),
    fechar: () => setAberta(false),
    alternar: () => setAberta((v) => !v),
  };
}
