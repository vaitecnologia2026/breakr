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
  ],
})
export class AppModule {}
