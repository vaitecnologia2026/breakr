// Healthcheck — usado por monitoramento/orquestracao.
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // GET /health → { status: "ok", ts }
  @Get()
  check(): { status: string; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
