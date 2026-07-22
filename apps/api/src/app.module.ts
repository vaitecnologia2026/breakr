// Modulo raiz da aplicacao Breakr OS.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { HealthModule } from './health/health.module';
import { AutomacaoModule } from './automacao/automacao.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { IntegracoesModule } from './integracoes/integracoes.module';
import { ClientesModule } from './clientes/clientes.module';
import { PlanosModule } from './planos/planos.module';
import { ProdutosModule } from './produtos/produtos.module';
import { PerfisModule } from './perfis/perfis.module';
import { SquadsModule } from './squads/squads.module';
import { ProjetosModule } from './projetos/projetos.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { FaturasModule } from './faturas/faturas.module';
import { ContratosModule } from './contratos/contratos.module';
import { PortalModule } from './portal/portal.module';
import { ConteudosModule } from './conteudos/conteudos.module';
import { ComercialModule } from './comercial/comercial.module';
import { AtividadesComercialModule } from './atividades-comercial/atividades-comercial.module';
import { RhModule } from './rh/rh.module';
import { ComprasModule } from './compras/compras.module';
import { DesenvolvimentoModule } from './desenvolvimento/desenvolvimento.module';
import { PainelModule } from './painel/painel.module';
import { IaModule } from './ia/ia.module';
import { TrafegoModule } from './trafego/trafego.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QualidadeModule } from './qualidade/qualidade.module';
import { AtendimentoModule } from './atendimento/atendimento.module';
import { ComunicadosModule } from './comunicados/comunicados.module';
import { ChatModule } from './chat/chat.module';
import { ReunioesModule } from './reunioes/reunioes.module';
import { CaptacaoModule } from './captacao/captacao.module';
import { InventarioModule } from './inventario/inventario.module';
import { EducacionalModule } from './educacional/educacional.module';
import { OuvidoriaModule } from './ouvidoria/ouvidoria.module';
import { MetasModule } from './metas/metas.module';
import { EnpsModule } from './enps/enps.module';
import { DiscModule } from './disc/disc.module';
import { DocumentosModule } from './documentos/documentos.module';
import { DesempenhoModule } from './desempenho/desempenho.module';
import { ContasPagarModule } from './contas-pagar/contas-pagar.module';
import { ProcessosJuridicosModule } from './processos-juridicos/processos-juridicos.module';
import { CartaOfertaModule } from './carta-oferta/carta-oferta.module';
import { AgendaModule } from './agenda/agenda.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { ComunicadosClienteModule } from './comunicados-cliente/comunicados-cliente.module';
import { AgendarModule } from './agendar/agendar.module';
import { MedalhasModule } from './medalhas/medalhas.module';
import { PainelDesignerModule } from './painel-designer/painel-designer.module';
import { EstrategiaModule } from './estrategia/estrategia.module';
import { CentroCustoModule } from './centro-custo/centro-custo.module';
import { NpsClienteModule } from './nps-cliente/nps-cliente.module';
import { PesquisasModule } from './pesquisas/pesquisas.module';
import { ComissoesModule } from './comissoes/comissoes.module';
import { CampanhasMarketingModule } from './campanhas-marketing/campanhas-marketing.module';
import { ColunasMaterialModule } from './colunas-material/colunas-material.module';
import { TemplatesCampanhaModule } from './templates-campanha/templates-campanha.module';
import { DashboardMarketingModule } from './dashboard-marketing/dashboard-marketing.module';
import { MetricasMarketingModule } from './metricas-marketing/metricas-marketing.module';
import { ReceitaModule } from './receita/receita.module';
import { PersonasModule } from './personas/personas.module';
import { PublicosModule } from './publicos/publicos.module';
import { ModelosMensagemModule } from './modelos-mensagem/modelos-mensagem.module';
import { MidiaModule } from './midia/midia.module';

@Module({
  imports: [
    // Carrega variaveis de ambiente (.env) de forma global.
    ConfigModule.forRoot({ isGlobal: true }),
    // Agendador (cron) in-process — usado pela rotina de renovacao do motor.
    ScheduleModule.forRoot(),
    // Rate-limit (aplicado seletivamente, ex.: login). 60 req/min é o teto padrão.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsuariosModule,
    HealthModule,
    AutomacaoModule,
    NotificacoesModule,
    IntegracoesModule,
    ClientesModule,
    PlanosModule,
    ProdutosModule,
    PerfisModule,
    SquadsModule,
    // Pipeline de entrada (Fase 1): contrato -> cobranca -> NF -> onboarding -> projetos.
    ProjetosModule,
    OnboardingModule,
    FaturasModule,
    ContratosModule,
    // Portal publico do cliente (read-only).
    PortalModule,
    // Operacao de marketing (Fase 2): funil de conteudo.
    ConteudosModule,
    // Back-office (Fase 3): pipeline comercial / CRM.
    ComercialModule,
    // CRM comercial — tela "Atividades" (ligacoes/WhatsApp/tarefas do vendedor).
    AtividadesComercialModule,
    // Back-office (Fase 3): RH, Operacoes (compras), Desenvolvimento (bugs).
    RhModule,
    ComprasModule,
    DesenvolvimentoModule,
    // Painel inicial "Hoje & Atrasados" (agrega todos os modulos).
    PainelModule,
    // Configuracoes de IA (OpenAI / Anthropic / Gemini).
    IaModule,
    // Tráfego pago + IA assistiva (Fase 2 — M17).
    TrafegoModule,
    // Webhooks externos (Autentique, Asaas, etc.) — sem JWT.
    WebhooksModule,
    // Dashboard de Qualidade & Rework (M18).
    QualidadeModule,
    // Inbox WhatsApp / Atendimento (M22).
    AtendimentoModule,
    // Canal de comunicados internos.
    ComunicadosModule,
    // Chat interno (canais + mensagens com polling).
    ChatModule,
    // Reuniões internas do time.
    ReunioesModule,
    // Captação de dados (jurídico) — formulário público de entrada.
    CaptacaoModule,
    // Inventário interno (equipamentos/materiais).
    InventarioModule,
    // Educacional — catálogo de cursos/treinamentos.
    EducacionalModule,
    // RH — ouvidoria, metas trimestrais e eNPS.
    OuvidoriaModule,
    MetasModule,
    EnpsModule,
    // Recrutamento — teste DISC (configurável em Configurações).
    DiscModule,
    // RH — documentos do colaborador (holerite/folha) e desempenho.
    DocumentosModule,
    DesempenhoModule,
    // Financeiro interno — contas a pagar.
    ContasPagarModule,
    // Jurídico — contencioso (processos, fases, prazos).
    ProcessosJuridicosModule,
    // Carta Oferta parametrizável ({{variáveis}}) — recrutamento (inspirado no InHire).
    CartaOfertaModule,
    // Agenda interna — feriados, sala presencial, home office.
    AgendaModule,
    // Calendario de Agendamento (menu Comercial) — eventos por colaborador.
    AgendamentoModule,
    // Comunicados aos clientes (banner no portal).
    ComunicadosClienteModule,
    // Agendamento público com colaborador (booking) + medalhas (gamificação).
    AgendarModule,
    MedalhasModule,
    // Painel do designer (B8): fila por prazo/prioridade + notas pessoais.
    PainelDesignerModule,
    // Aprovacao de estrategia pelo cliente (B6).
    EstrategiaModule,
    // Doc10: centro de custo (l.469-476), NPS de cliente (l.196-198/544-547),
    // pesquisas/surveys do portal (l.44-46).
    CentroCustoModule,
    NpsClienteModule,
    PesquisasModule,
    ComissoesModule,
    CampanhasMarketingModule,
    ColunasMaterialModule,
    TemplatesCampanhaModule,
    DashboardMarketingModule,
    MetricasMarketingModule,
    // Consulta de CNPJ (ReceitaWS) — auto-preenchimento do Cadastro Completo.
    ReceitaModule,
    // Marketing — Personas (avatar do público-alvo, inspirado no eKyte).
    PersonasModule,
    // Marketing — Públicos (planejamento de audiências, inspirado no eKyte).
    PublicosModule,
    // Marketing — Modelos de Mensagem (templates de texto, inspirado no eKyte).
    ModelosMensagemModule,
    MidiaModule,
  ],
})
export class AppModule {}
