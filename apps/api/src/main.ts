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

  const port = Number(config.get<string>('API_PORT', '3000'));
  await app.listen(port);
  Logger.log(`Breakr OS API rodando em http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
