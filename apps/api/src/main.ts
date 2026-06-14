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

  // CORS liberado apenas para a origem configurada (web).
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
  });

  // Porta: PaaS (Railway/Render) injeta PORT; senao API_PORT; senao 3000.
  // Bind em 0.0.0.0 para funcionar dentro de container.
  const port = Number(config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '3000');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Breakr OS API rodando na porta ${port}`, 'Bootstrap');
}

void bootstrap();
