// Bootstrap da API Breakr OS (NestJS).
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validacao automatica de DTOs (class-validator) em todas as rotas.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos nao declarados no DTO
      forbidNonWhitelisted: true, // rejeita payload com campos extras
      transform: true, // converte tipos conforme o DTO
    }),
  );

  // CORS — aceita uma OU várias origens (CORS_ORIGIN separado por vírgula),
  // ex.: "https://breakr.vai-sistema.com,https://breakr-os.vercel.app".
  // Necessário porque credentials:true não permite wildcard.
  const origensConfig = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const origens = origensConfig.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      // Requisições sem origin (curl/health/server-to-server) são permitidas.
      if (!origin || origens.includes(origin)) return cb(null, true);
      return cb(new Error(`Origem não permitida pelo CORS: ${origin}`), false);
    },
    credentials: true,
  });

  // Porta: PaaS (Railway/Render) injeta PORT; senao API_PORT; senao 3000.
  // Bind em 0.0.0.0 para funcionar dentro de container.
  const port = Number(config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '3000');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Breakr OS API rodando na porta ${port}`, 'Bootstrap');
}

void bootstrap();
