import { Routes, Route } from 'react-router-dom';
import { Bloqueio } from './pages/Bloqueio';

// Ative para desabilitar todos os acessos e exibir apenas os logos.
const SISTEMA_BLOQUEADO = false;
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Portal } from './pages/Portal';
import { Captacao } from './pages/Captacao';
import { AvaliacaoDisc } from './pages/AvaliacaoDisc';
import { Dashboard } from './pages/Dashboard';
import { Inicio } from './pages/Inicio';
import { Clientes } from './pages/Clientes';
import { Onboarding } from './pages/Onboarding';
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
import { Reunioes } from './pages/Reunioes';
import { Inventario } from './pages/Inventario';
import { Educacional } from './pages/Educacional';
import { Ouvidoria } from './pages/Ouvidoria';
import { Metas } from './pages/Metas';
import { Enps } from './pages/Enps';
import { Documentos } from './pages/Documentos';
import { Desempenho } from './pages/Desempenho';
import { Financeiro } from './pages/Financeiro';
import { Agenda } from './pages/Agenda';
import { ComunicadosCliente } from './pages/ComunicadosCliente';
import { AgendarPublico } from './pages/AgendarPublico';
import { Medalhas } from './pages/Medalhas';
import { Perfil } from './pages/Perfil';
import { NotFound } from './pages/NotFound';
import { Planos } from './pages/Planos';
import { AvaliarAtendimento } from './pages/AvaliarAtendimento';

export function App() {
  if (SISTEMA_BLOQUEADO) return <Bloqueio />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/:codigo" element={<Portal />} />
      <Route path="/captacao" element={<Captacao />} />
      <Route path="/avaliacao-disc" element={<AvaliacaoDisc />} />
      <Route path="/agendar" element={<AgendarPublico />} />
      <Route path="/avaliar-atendimento/:id" element={<AvaliarAtendimento />} />

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
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="planos" element={<Planos />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="financeiro" element={<Financeiro />} />
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
        <Route path="comunicados-cliente" element={<ComunicadosCliente />} />
        <Route path="chat" element={<Chat />} />
        <Route path="reunioes" element={<Reunioes />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="medalhas" element={<Medalhas />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="educacional" element={<Educacional />} />
        <Route path="ouvidoria" element={<Ouvidoria />} />
        <Route path="metas" element={<Metas />} />
        <Route path="enps" element={<Enps />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="desempenho" element={<Desempenho />} />
        <Route path="equipe" element={<Equipe />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
