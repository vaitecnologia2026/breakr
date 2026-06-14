// Modulo raiz da aplicacao Breakr OS.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { HealthModule } from './health/health.module';
import { AutomacaoModule } from './automacao/automacao.module';

@Module({
  imports: [
    // Carrega variaveis de ambiente (.env) de forma global.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    HealthModule,
    AutomacaoModule,
  ],
})
export class AppModule {}
