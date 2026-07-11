// Webhooks de integracoes externas. Nenhum endpoint aqui requer JWT —
// a autenticidade e validada por segredo compartilhado (header ou body).
//
// Autentique: POST /integracoes/autentique/webhook
//   Ativar em: painel.autentique.com.br → Integrações → Webhooks
//   URL: https://<api>/integracoes/autentique/webhook
//   Payload: { event: "SIGN" | "VIEW" | "REFUSE", document: { id, name } }
import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EngineService } from '../automacao/engine.service';
import { ContratosService } from '../contratos/contratos.service';
import { FaturasService } from '../faturas/faturas.service';

// Rota base /integracoes mantém compatibilidade com URL configurada no Autentique.

interface AutentiqueWebhookPayload {
  event?: string;
  action?: { name?: string };
  document?: { id?: string; name?: string };
}

// Payload do webhook de pagamento do Asaas (enviado direto pelo Asaas ou
// repassado pelo n8n). Só os campos que usamos.
interface AsaasWebhookPayload {
  event?: string;
  payment?: {
    id?: string;
    subscription?: string;
    customer?: string;
    value?: number;
    status?: string;
    externalReference?: string;
  };
}

// Eventos do Asaas que representam "cobrança paga/confirmada".
const EVENTOS_PAGO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('integracoes')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly contratos: ContratosService,
    private readonly faturas: FaturasService,
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

  // Asaas chama este endpoint (direto ou repassado pelo n8n) quando uma cobrança
  // é PAGA/CONFIRMADA. Marca a Fatura correspondente como PAGA — o que alimenta
  // a apuração de comissões (vendas cujo lead pagou após a confirmação do Asaas).
  //
  // Segurança: se ASAAS_WEBHOOK_TOKEN estiver no ambiente, exige o header
  // `asaas-access-token` igual (o Asaas envia esse header quando o webhook tem
  // token). Sem a env, aceita sem token (mesmo padrão do webhook do Autentique).
  //
  // Correlação da cobrança do Asaas -> Fatura do Breakr, nesta ordem:
  //   1) payment.externalReference == id do Contrato (caminho n8n, que grava o
  //      contrato_id como externalReference da assinatura);
  //   2) Fatura.asaasId == payment.id (caminho do adapter Asaas do backend).
  // Sempre responde 200 para o Asaas não reenviar.
  @Post('asaas/webhook')
  @HttpCode(200)
  async asaasWebhook(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') tokenHeader?: string,
  ) {
    const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
    if (tokenEsperado && tokenHeader !== tokenEsperado) {
      this.logger.warn('Webhook Asaas: token inválido — ignorado.');
      return { ok: true, processado: false, motivo: 'token invalido' };
    }

    const evento = (payload.event ?? '').toUpperCase();
    const pagamento = payload.payment ?? {};
    this.logger.log(
      `Webhook Asaas: event="${evento}" paymentId="${pagamento.id ?? ''}" ` +
        `ref="${pagamento.externalReference ?? ''}"`,
    );

    if (!EVENTOS_PAGO.includes(evento)) {
      return { ok: true, processado: false, motivo: 'evento ignorado' };
    }

    // 1) Correlação por externalReference == id do Contrato.
    let faturaId: string | null = null;
    const ref = (pagamento.externalReference ?? '').trim();
    if (ref && UUID_RE.test(ref)) {
      const fatura = await this.prisma.fatura.findFirst({
        where: { contratoId: ref },
        orderBy: { criadoEm: 'asc' },
        select: { id: true },
      });
      if (fatura) faturaId = fatura.id;
    }

    // 2) Fallback: Fatura.asaasId == payment.id.
    if (!faturaId && pagamento.id) {
      const fatura = await this.prisma.fatura.findFirst({
        where: { asaasId: pagamento.id },
        select: { id: true },
      });
      if (fatura) faturaId = fatura.id;
    }

    if (!faturaId) {
      this.logger.warn(
        `Webhook Asaas: pagamento sem fatura correspondente (ref="${ref}" id="${pagamento.id ?? ''}").`,
      );
      return { ok: true, processado: false, motivo: 'fatura nao encontrada' };
    }

    // marcarPaga é idempotente: se já estava PAGA, apenas retorna.
    await this.faturas.marcarPaga(faturaId);
    this.logger.log(`Webhook Asaas: fatura ${faturaId} confirmada como PAGA.`);
    return { ok: true, processado: true, faturaId };
  }
}
