import { useEffect } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { rotaPermitida } from '../lib/permissoes';
import { Sidebar, useSidebarMobile } from '../components/Sidebar';
import { NotificationBell } from '../components/NotificationBell';
import { GlobalSearch, abrirBusca } from '../components/GlobalSearch';
import { BrkAI } from '../components/BrkAI';
import { UserMenu } from '../components/UserMenu';
import { useFavoritos } from '../lib/favoritos';

const ROTA_NOME: Record<string, string> = {
  '/': 'Dashboard',
  '/comercial': 'Comercial',
  '/clientes': 'Clientes',
  '/contratos': 'Contratos',
  '/cobrancas': 'Cobranças',
  '/projetos': 'Projetos',
  '/conteudos': 'Conteúdo',
  '/qualidade': 'Qualidade',
  '/trafego': 'Tráfego',
  '/squads': 'Squads',
  '/recrutamento': 'Recrutamento',
  '/compras': 'Compras',
  '/desenvolvimento': 'Bugs & Dev',
  '/automacoes': 'Automações',
  '/atendimento': 'Atendimento',
  '/inbox': 'Inbox',
  '/comunicados': 'Comunicados',
  '/chat': 'Chat interno',
  '/equipe': 'Equipe',
  '/configuracoes': 'Configurações',
};

// Ícones do mapa de rotas para a barra de favoritos
const ROTA_ICONE: Record<string, React.ReactNode> = {
  '/': <IcoDash />,
  '/comercial': <IcoBrief />,
  '/clientes': <IcoUsers />,
  '/contratos': <IcoFile />,
  '/cobrancas': <IcoCard />,
  '/projetos': <IcoGrid />,
  '/conteudos': <IcoImg />,
  '/qualidade': <IcoStar />,
  '/trafego': <IcoTrend />,
  '/squads': <IcoDiamond />,
  '/recrutamento': <IcoUserPlus />,
  '/compras': <IcoBag />,
  '/desenvolvimento': <IcoCode />,
  '/automacoes': <IcoZap />,
  '/atendimento': <IcoMsg />,
  '/inbox': <IcoInbox />,
  '/comunicados': <IcoBull />,
  '/chat': <IcoChat />,
  '/equipe': <IcoUserCheck />,
  '/configuracoes': <IcoSettings />,
};

function IcoDash() { return <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Ico>; }
function IcoBrief() { return <Ico><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Ico>; }
function IcoUsers() { return <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></Ico>; }
function IcoFile() { return <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Ico>; }
function IcoCard() { return <Ico><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>; }
function IcoGrid() { return <Ico><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></Ico>; }
function IcoImg() { return <Ico><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Ico>; }
function IcoStar() { return <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ico>; }
function IcoTrend() { return <Ico><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Ico>; }
function IcoDiamond() { return <Ico><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></Ico>; }
function IcoUserPlus() { return <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></Ico>; }
function IcoBag() { return <Ico><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></Ico>; }
function IcoCode() { return <Ico><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Ico>; }
function IcoZap() { return <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>; }
function IcoMsg() { return <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>; }
function IcoInbox() { return <Ico><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ico>; }
function IcoBull() { return <Ico><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 22-7z"/></Ico>; }
function IcoChat() { return <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>; }
function IcoUserCheck() { return <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></Ico>; }
function IcoSettings() { return <Ico><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>; }

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// ─── Barra de favoritos ───────────────────────────────────────────────────────

function FavoritesBar() {
  const { favoritos } = useFavoritos();
  if (favoritos.length === 0) return null;

  return (
    <div className="brk-favbar">
      <span className="brk-favbar-label">Favoritos</span>
      {favoritos.map((fav) => {
        const icone = ROTA_ICONE[fav.para];
        return (
          <NavLink
            key={fav.para}
            to={fav.para}
            end={fav.para === '/'}
            className={({ isActive }) => `brk-favbar-item${isActive ? ' active' : ''}`}
            title={fav.rotulo}
          >
            <span className="brk-favbar-item-ico">{icone}</span>
            <span className="brk-favbar-item-nome">{fav.rotulo}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export function Dashboard() {
  const { pathname } = useLocation();
  const { usuario } = useAuth();
  const nomePagina = ROTA_NOME[pathname] ?? 'Breakr';
  const menuMobile = useSidebarMobile();

  // Perfil de acesso: se a rota atual não é permitida, volta ao início.
  // (admin/superadmin e usuários sem perfil enxergam tudo — nada muda.)
  const rotaBloqueada = !rotaPermitida(usuario, pathname);

  // Fecha o menu mobile ao trocar de página.
  useEffect(() => { menuMobile.fechar(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="brk-layout">
      <Sidebar mobileAberta={menuMobile.aberta} />
      {/* Overlay para fechar o menu no mobile ao tocar fora */}
      {menuMobile.aberta && <div className="brk-sidebar-overlay" onClick={menuMobile.fechar} />}

      <div className="brk-main">
        {/* Topbar melhorada */}
        <header className="brk-topbar">
          <div className="brk-topbar-left">
            <button
              className="brk-topbar-menu-btn"
              onClick={menuMobile.alternar}
              aria-label="Abrir menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="brk-topbar-breadcrumb">
              <span className="brk-topbar-breadcrumb-root">Breakr</span>
              <span className="brk-topbar-sep">/</span>
              <span className="brk-topbar-breadcrumb-atual">{nomePagina}</span>
            </div>
          </div>

          {/* Busca central (estilo ClickUp) — barra ampla no centro da topbar. */}
          <div className="brk-topbar-center">
            <button className="brk-topbar-search-btn" onClick={abrirBusca} title="Buscar (Ctrl+K)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>Buscar</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="brk-topbar-right">
            {/* Carrinho — ponto de entrada da solicitação de compras (req. l.482). */}
            <NavLink
              to="/compras"
              title="Solicitar compra"
              aria-label="Solicitar compra"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, color: 'var(--texto-suave)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </NavLink>

            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="brk-content">
          {rotaBloqueada ? <Navigate to="/" replace /> : <Outlet />}
        </main>

        {/* Barra de favoritos */}
        <FavoritesBar />
      </div>

      {/* Globais */}
      <GlobalSearch />
      <BrkAI />
    </div>
  );
}
