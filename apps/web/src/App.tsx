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
import { Trafego } from './pages/Trafego';
import Qualidade from './pages/Qualidade';
import { Projetos } from './pages/Projetos';
import { Comercial } from './pages/Comercial';
import { Recrutamento } from './pages/Recrutamento';
import { Compras } from './pages/Compras';
import { Desenvolvimento } from './pages/Desenvolvimento';
import { Automacoes } from './pages/Automacoes';
import { Configuracoes } from './pages/Configuracoes';
import { Squads } from './pages/Squads';
import { Equipe } from './pages/Equipe';
import { Atendimento } from './pages/Atendimento';
import { Inbox } from './pages/Inbox';
import { Comunicados } from './pages/Comunicados';
import { Chat } from './pages/Chat';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="comercial" element={<Comercial />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="conteudos" element={<Conteudos />} />
        <Route path="qualidade" element={<Qualidade />} />
        <Route path="trafego" element={<Trafego />} />
        <Route path="squads" element={<Squads />} />
        <Route path="recrutamento" element={<Recrutamento />} />
        <Route path="compras" element={<Compras />} />
        <Route path="desenvolvimento" element={<Desenvolvimento />} />
        <Route path="automacoes" element={<Automacoes />} />
        <Route path="atendimento" element={<Atendimento />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="comunicados" element={<Comunicados />} />
        <Route path="chat" element={<Chat />} />
        <Route path="equipe" element={<Equipe />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
