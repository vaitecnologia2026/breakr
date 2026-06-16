import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { NotificationBell } from '../components/NotificationBell';
import { GlobalSearch, abrirBusca } from '../components/GlobalSearch';
import { BrkAI } from '../components/BrkAI';

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
  '/equipe': 'Equipe',
  '/configuracoes': 'Configurações',
};

export function Dashboard() {
  const { pathname } = useLocation();
  const nomePagina = ROTA_NOME[pathname] ?? 'Breakr OS';

  return (
    <div className="brk-layout">
      <Sidebar />

      <div className="brk-main">
        <header className="brk-topbar">
          <div className="brk-topbar-breadcrumb">
            <span>Breakr OS</span>
            <span className="brk-topbar-sep">/</span>
            <span className="brk-topbar-breadcrumb-atual">{nomePagina}</span>
          </div>
          <div className="brk-topbar-acoes">
            {/* Botão de busca na topbar */}
            <button className="brk-topbar-search-btn" onClick={abrirBusca} title="Buscar (Ctrl+K)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Buscar</span>
              <kbd>⌘K</kbd>
            </button>
            <NotificationBell />
            <span className="brk-topbar-version">v0.8</span>
          </div>
        </header>

        <main className="brk-content">
          <Outlet />
        </main>
      </div>

      {/* Globais */}
      <GlobalSearch />
      <BrkAI />
    </div>
  );
}
