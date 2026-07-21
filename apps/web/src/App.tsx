import { Routes, Route } from 'react-router-dom';
import { Bloqueio } from './pages/Bloqueio';

// Ative para desabilitar todos os acessos e exibir apenas os logos.
const SISTEMA_BLOQUEADO = false;
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Portal } from './pages/Portal';
import { Captacao } from './pages/Captacao';
import { CadastroPublico } from './pages/CadastroPublico';
import { AvaliacaoDisc } from './pages/AvaliacaoDisc';
import { CarreirasPublico } from './pages/CarreirasPublico';
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
import { Coordenacao } from './pages/Coordenacao';
import { MeuPainel } from './pages/MeuPainel';
import { Negocios } from './pages/Negocios';
import { Contatos } from './pages/Contatos';
import { Pessoas } from './pages/Pessoas';
import { Empresas } from './pages/Empresas';
import { Atividades } from './pages/Atividades';
import { Metricas } from './pages/Metricas';
import { Recrutamento } from './pages/Recrutamento';
import { CartasOferta } from './pages/CartasOferta';
import { Compras } from './pages/Compras';
import { Desenvolvimento } from './pages/Desenvolvimento';
import { Automacoes } from './pages/Automacoes';
import { Configuracoes } from './pages/Configuracoes';
import { Squads } from './pages/Squads';
import { Equipe } from './pages/Equipe';
import { Usuarios } from './pages/Usuarios';
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
import { Agendamento } from './pages/Agendamento';
import { Comissao } from './pages/Comissao';
import { CampanhasMarketing } from './pages/CampanhasMarketing';
import { TemplatesCampanha } from './pages/TemplatesCampanha';
import { DashboardMarketing } from './pages/DashboardMarketing';
import { AprovacoesMarketing } from './pages/AprovacoesMarketing';
import { MetricasMarketing } from './pages/MetricasMarketing';
import { ComunicadosCliente } from './pages/ComunicadosCliente';
import { AgendarPublico } from './pages/AgendarPublico';
import { GoogleCallback } from './pages/GoogleCallback';
import { Medalhas } from './pages/Medalhas';
import { Perfil } from './pages/Perfil';
import { NotFound } from './pages/NotFound';
import { Planos } from './pages/Planos';
import { AvaliarAtendimento } from './pages/AvaliarAtendimento';
import { PainelDesigner } from './pages/PainelDesigner';
import { Estrategia } from './pages/Estrategia';
import { CentroCusto } from './pages/CentroCusto';
import { NpsCliente } from './pages/NpsCliente';
import { BancoTalentos } from './pages/BancoTalentos';
import { Pesquisas } from './pages/Pesquisas';
import { ContasPagar } from './pages/ContasPagar';
import { ContasReceber } from './pages/ContasReceber';
import { Controladoria } from './pages/Controladoria';
import { CobrancaProtesto } from './pages/CobrancaProtesto';
import { Otimizacoes } from './pages/Otimizacoes';
import { GestaoPublicos } from './pages/GestaoPublicos';
import { LaboratorioCriativos } from './pages/LaboratorioCriativos';
import { Personas } from './pages/Personas';
import { ModelosMensagem } from './pages/ModelosMensagem';
import { ProcessosJuridicos } from './pages/ProcessosJuridicos';

export function App() {
  if (SISTEMA_BLOQUEADO) return <Bloqueio />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/:codigo" element={<Portal />} />
      <Route path="/captacao" element={<Captacao />} />
      <Route path="/cadastro/:token" element={<CadastroPublico />} />
      <Route path="/avaliacao-disc" element={<AvaliacaoDisc />} />
      <Route path="/carreiras" element={<CarreirasPublico />} />
      <Route path="/carreiras/:codigo" element={<CarreirasPublico />} />
      <Route path="/agendar" element={<AgendarPublico />} />
      <Route path="/avaliar-atendimento/:id" element={<AvaliarAtendimento />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

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
        <Route path="coordenacao" element={<Coordenacao />} />
        <Route path="meu-painel" element={<MeuPainel />} />
        <Route path="negocios" element={<Negocios />} />
        <Route path="contatos" element={<Contatos />} />
        <Route path="contatos/pessoas" element={<Pessoas />} />
        <Route path="contatos/empresas" element={<Empresas />} />
        <Route path="atividades" element={<Atividades />} />
        <Route path="agendamento" element={<Agendamento />} />
        <Route path="comissao" element={<Comissao />} />
        <Route path="metricas" element={<Metricas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="planos" element={<Planos />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="conteudos" element={<Conteudos />} />
        <Route path="dashboard-marketing" element={<DashboardMarketing />} />
        <Route path="aprovacoes-marketing" element={<AprovacoesMarketing />} />
        <Route path="metricas-marketing" element={<MetricasMarketing />} />
        <Route path="campanhas" element={<CampanhasMarketing />} />
        <Route path="templates-campanha" element={<TemplatesCampanha />} />
        <Route path="painel-designer" element={<PainelDesigner />} />
        <Route path="estrategia" element={<Estrategia />} />
        <Route path="centro-custo" element={<CentroCusto />} />
        <Route path="nps-cliente" element={<NpsCliente />} />
        <Route path="banco-talentos" element={<BancoTalentos />} />
        <Route path="pesquisas" element={<Pesquisas />} />
        <Route path="contas-pagar" element={<ContasPagar />} />
        <Route path="contas-receber" element={<ContasReceber />} />
        <Route path="controladoria" element={<Controladoria />} />
        <Route path="cobranca-protesto" element={<CobrancaProtesto />} />
        <Route path="otimizacoes" element={<Otimizacoes />} />
        <Route path="gestao-publicos" element={<GestaoPublicos />} />
        <Route path="laboratorio-criativos" element={<LaboratorioCriativos />} />
        <Route path="personas" element={<Personas />} />
        <Route path="modelos-mensagem" element={<ModelosMensagem />} />
        <Route path="processos-juridicos" element={<ProcessosJuridicos />} />
        <Route path="qualidade" element={<Qualidade />} />
        <Route path="trafego" element={<Trafego />} />
        <Route path="squads" element={<Squads />} />
        <Route path="recrutamento" element={<Recrutamento />} />
        <Route path="cartas-oferta" element={<CartasOferta />} />
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
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
