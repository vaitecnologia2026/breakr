// Bootstrap da API Breakr OS (NestJS).
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Headers de segurança HTTP. CSP desligado (API JSON, não serve HTML; o front
  // é servido pela Vercel) para não interferir no consumo cross-origin.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Tratamento global de exceções — resposta consistente, sem vazar stack.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validacao automatica de DTOs (class-validator) em todas as rotas.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos nao declarados no DTO
      forbidNonWhitelisted: true, // rejeita payload com campos extras
      transform: true, // converte tipos conforme o DTO
    }),
  );

  // CORS — credentials:true não permite wildcard, então validamos a origem:
  //  • lista explícita via CORS_ORIGIN (separada por vírgula), p/ domínio custom;
  //  • qualquer subdomínio *.vercel.app (produção + previews do front);
  //  • requisições sem origin (curl/health/server-to-server).
  // Nunca lança — origem negada apenas não recebe o header (sem 500 no preflight).
  // Origens de produção conhecidas (sempre liberadas, além do CORS_ORIGIN do env).
  const ORIGENS_PADRAO = [
    'https://breakr.vaitecnologia.com.br',
    'https://breakr.vai-sistema.com',
    'http://localhost:5173',
  ];
  const origensConfig = config.get<string>('CORS_ORIGIN', '');
  const origens = [
    ...ORIGENS_PADRAO,
    ...origensConfig.split(',').map((o) => o.trim()).filter(Boolean),
  ];
  function origemPermitida(origin?: string): boolean {
    if (!origin) return true;
    if (origens.includes(origin)) return true;
    try {
      // Previews/produção do front na Vercel.
      return new URL(origin).hostname.endsWith('.vercel.app');
    } catch {
      return false;
    }
  }
  app.enableCors({
    origin: (origin, cb) => cb(null, origemPermitida(origin)),
    credentials: true,
  });

  // Porta: PaaS (Railway/Render) injeta PORT; senao API_PORT; senao 3000.
  // Bind em 0.0.0.0 para funcionar dentro de container.
  const port = Number(config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '3000');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Breakr OS API rodando na porta ${port}`, 'Bootstrap');
}

void bootstrap();
