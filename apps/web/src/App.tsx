import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Portal } from './pages/Portal';
import { Dashboard } from './pages/Dashboard';
import { Inicio } from './pages/Inicio';
import { Clientes } from './pages/Clientes';
import { Contratos } from './pages/Contratos';
import { Cobrancas } from './pages/Cobrancas';
import { Conteudos } from './pages/Conteudos';
import { Comercial } from './pages/Comercial';
import { Recrutamento } from './pages/Recrutamento';
import { Compras } from './pages/Compras';
import { Desenvolvimento } from './pages/Desenvolvimento';
import { Automacoes } from './pages/Automacoes';
import { Configuracoes } from './pages/Configuracoes';
import { Squads } from './pages/Squads';

/**
 * Tabela de rotas do Breakr OS.
 *  - /login              → tela de autenticação (fora do shell)
 *  - /  (shell protegido) → Dashboard com header/sidebar e <Outlet/>:
 *      · index    → Início (Núcleo)
 *      · /clientes → Clientes
 *      · /squads   → Squads
 *  - *  → redireciona para a raiz
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Portal publico do cliente (fora do shell, sem login) */}
      <Route path="/portal/:codigo" element={<Portal />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="conteudos" element={<Conteudos />} />
        <Route path="comercial" element={<Comercial />} />
        <Route path="recrutamento" element={<Recrutamento />} />
        <Route path="compras" element={<Compras />} />
        <Route path="desenvolvimento" element={<Desenvolvimento />} />
        <Route path="automacoes" element={<Automacoes />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="squads" element={<Squads />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
