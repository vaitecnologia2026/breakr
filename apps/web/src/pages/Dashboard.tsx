import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { NotificationBell } from '../components/NotificationBell';

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
            <NotificationBell />
            <span className="brk-topbar-version">v0.7</span>
          </div>
        </header>

        <main className="brk-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
