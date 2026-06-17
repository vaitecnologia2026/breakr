// Webhooks de integracoes externas. Nenhum endpoint aqui requer JWT —
// a autenticidade e validada por segredo compartilhado (header ou body).
//
// Autentique: POST /integracoes/autentique/webhook
//   Ativar em: painel.autentique.com.br → Integrações → Webhooks
//   URL: https://<api>/integracoes/autentique/webhook
//   Payload: { event: "SIGN" | "VIEW" | "REFUSE", document: { id, name } }
import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EngineService } from '../automacao/engine.service';
import { ContratosService } from '../contratos/contratos.service';

// Rota base /integracoes mantém compatibilidade com URL configurada no Autentique.

interface AutentiqueWebhookPayload {
  event?: string;
  action?: { name?: string };
  document?: { id?: string; name?: string };
}

@Controller('integracoes')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly contratos: ContratosService,
  ) {}

  // Autentique chama este endpoint quando todos os signatários assinaram.
  // Atualiza o contrato para EM_VIGOR e dispara o evento contrato.assinado no motor.
  @Post('autentique/webhook')
  @HttpCode(200)
  async autentiqueWebhook(@Body() payload: AutentiqueWebhookPayload) {
    const evento = payload.event ?? payload.action?.name ?? '';
    const docId = payload.document?.id;

    this.logger.log(`Webhook Autentique: event="${evento}" docId="${docId}"`);

    // Só processa quando todos assinaram (evento SIGN = assinatura completa no v2).
    if (!docId || !['SIGN', 'SIGNED', 'DOCUMENT_SIGNED'].includes(evento.toUpperCase())) {
      return { ok: true, processado: false, motivo: 'evento ignorado' };
    }

    const contrato = await this.prisma.contrato.findFirst({
      where: { autentiqueId: docId },
      select: { id: true, status: true, clienteId: true },
    });

    if (!contrato) {
      this.logger.warn(`Webhook Autentique: docId "${docId}" sem contrato correspondente.`);
      return { ok: true, processado: false, motivo: 'contrato nao encontrado' };
    }

    // Idempotente: já está em vigor ou encerrado → não processa de novo.
    if (['EM_VIGOR', 'ENCERRADO'].includes(contrato.status)) {
      return { ok: true, processado: false, motivo: 'status ja finalizado' };
    }

    // Notifica o financeiro (regra "Ativar cobranca apos assinatura").
    await this.engine.dispatch('contrato.assinado', {
      contratoId: contrato.id,
      clienteId: contrato.clienteId,
    });

    // Coloca em vigor pelo serviço — que, de forma idempotente, gera a 1ª
    // cobrança e dispara 'contrato.em_vigor' (CS assume + segue o fluxo).
    // Sem isto o contrato ficava EM_VIGOR mas sem cobrança/onboarding.
    await this.contratos.colocarEmVigor(contrato.id);

    this.logger.log(`Contrato ${contrato.id} → EM_VIGOR (Autentique docId=${docId})`);
    return { ok: true, processado: true, contratoId: contrato.id };
  }
}
