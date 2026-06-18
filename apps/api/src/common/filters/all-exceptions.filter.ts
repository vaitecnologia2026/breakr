// Filtro global de exceções — resposta de erro consistente e SEM vazar stack
// trace ao cliente. Erros HTTP (4xx) mantêm status+mensagem; erros inesperados
// viram 500 genérico (o erro real, com stack, é logado só no servidor).
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Erro interno do servidor.';
    if (isHttp) {
      const resp = exception.getResponse();
      message =
        typeof resp === 'string'
          ? resp
          : ((resp as { message?: string | string[] }).message ?? exception.message);
    }

    // Loga o erro real (com stack) apenas no servidor; nunca devolve ao cliente.
    if (!isHttp || status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        (exception as Error)?.stack,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
