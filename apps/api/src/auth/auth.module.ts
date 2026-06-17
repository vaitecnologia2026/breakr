// Módulo de autenticação — JWT nativo, sem passport.
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        // Em producao a API NAO pode subir com um secret default/conhecido —
        // isso permitiria forjar tokens. Falha o bootstrap se ausente.
        if (!secret) {
          if (config.get<string>('NODE_ENV') === 'production') {
            throw new Error('JWT_SECRET obrigatorio em producao');
          }
          // Fora de producao, permite um fallback de dev (com aviso).
          // eslint-disable-next-line no-console
          console.warn('[auth] JWT_SECRET ausente — usando fallback de desenvolvimento.');
        }
        return {
          secret: secret ?? 'dev-secret-trocar-em-producao',
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES', '1d'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
