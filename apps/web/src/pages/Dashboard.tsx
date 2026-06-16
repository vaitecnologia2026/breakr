import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { NotificationBell } from '../components/NotificationBell';

export function Dashboard() {
  return (
    <div className="brk-layout">
      <Sidebar />

      <div className="brk-main">
        <header className="brk-topbar">
          <div className="brk-topbar-breadcrumb">
            <span>Breakr OS</span>
          </div>
          <div className="brk-topbar-acoes">
            <NotificationBell />
            <span className="brk-topbar-version">v0.6</span>
          </div>
        </header>

        <main className="brk-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
