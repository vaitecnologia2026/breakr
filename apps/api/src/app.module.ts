// Modulo raiz da aplicacao Breakr OS.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { SquadsModule } from './squads/squads.module';
import { ProjetosModule } from './projetos/projetos.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { FaturasModule } from './faturas/faturas.module';
import { ContratosModule } from './contratos/contratos.module';
import { PortalModule } from './portal/portal.module';
import { ConteudosModule } from './conteudos/conteudos.module';
import { ComercialModule } from './comercial/comercial.module';
import { RhModule } from './rh/rh.module';
import { ComprasModule } from './compras/compras.module';
import { DesenvolvimentoModule } from './desenvolvimento/desenvolvimento.module';
import { PainelModule } from './painel/painel.module';
import { IaModule } from './ia/ia.module';

@Module({
  imports: [
    // Carrega variaveis de ambiente (.env) de forma global.
    ConfigModule.forRoot({ isGlobal: true }),
    // Agendador (cron) in-process — usado pela rotina de renovacao do motor.
    ScheduleModule.forRoot(),
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
    // Back-office (Fase 3): RH, Operacoes (compras), Desenvolvimento (bugs).
    RhModule,
    ComprasModule,
    DesenvolvimentoModule,
    // Painel inicial "Hoje & Atrasados" (agrega todos os modulos).
    PainelModule,
    // Configuracoes de IA (OpenAI / Anthropic / Gemini).
    IaModule,
  ],
})
export class AppModule {}
