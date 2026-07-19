// Conversions API (CAPI) — closed-loop CRM -> Meta (Fase C do dashboard Meta Ads).
// Quando um Lead avanca de etapa/status no funil, envia um evento offline ao Pixel
// da Meta (Lead / InitiateCheckout / Purchase) com a PII hasheada (SHA-256), para a
// Meta otimizar por lead que vira venda — nao so por preenchimento de formulario.
//
// Reutiliza as credenciais ja existentes em Config.integracoes.adsMeta (pixelId +
// token) via IntegracoesConfigService — NAO cria model nem migration. Degrada com
// elegancia: se nao houver pixel/token ou a Meta recusar, apenas retorna
// { ok:false } e NUNCA lanca (o fluxo do CRM nao pode quebrar por causa do CAPI).
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { StatusLead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegracoesConfigService } from '../ia/integracoes-config.service';

const GRAPH = 'https://graph.facebook.com/v25.0';

// Mapeia o status do funil para o evento padrao da Meta. Status sem valor de
// otimizacao (NOVO/CONTATADO/PERDIDO) nao geram evento — evita ruido.
const EVENTO_POR_STATUS: Partial<Record<StatusLead, string>> = {
  [StatusLead.QUALIFICADO]: 'Lead',
  [StatusLead.PROPOSTA]: 'InitiateCheckout',
  [StatusLead.GANHO]: 'Purchase',
};

export interface CapiResposta {
  ok: boolean;
  enviado?: boolean;
  evento?: string;
  erro?: string;
}

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: IntegracoesConfigService,
  ) {}

  // Hash exigido pelo CAPI para PII (lowercase + trim). Vazio -> undefined.
  private hash(valor?: string | null): string | undefined {
    const v = (valor ?? '').trim().toLowerCase();
    if (!v) return undefined;
    return createHash('sha256').update(v).digest('hex');
  }

  // Envia o evento do lead ao Pixel (fire-and-forget no CRM). Nunca lanca.
  async enviarEventoLead(leadId: string, status: StatusLead): Promise<CapiResposta> {
    try {
      const evento = EVENTO_POR_STATUS[status];
      if (!evento) return { ok: true, enviado: false };

      const cred = await this.config.obterAdsMetaRaw();
      if (!cred.pixelId || !cred.token) {
        return { ok: false, enviado: false, erro: 'CAPI nao configurado (pixelId e token).' };
      }

      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { email: true, telefone: true, valorEstimado: true },
      });
      if (!lead) return { ok: false, enviado: false, erro: 'Lead nao encontrado.' };

      const userData: Record<string, string[]> = {};
      const em = this.hash(lead.email);
      const ph = this.hash(lead.telefone?.replace(/\D/g, ''));
      if (em) userData.em = [em];
      if (ph) userData.ph = [ph];

      const customData: Record<string, unknown> = {};
      if (evento === 'Purchase' && lead.valorEstimado != null) {
        customData.value = Number(lead.valorEstimado);
        customData.currency = 'BRL';
      }

      const body = new URLSearchParams();
      body.set(
        'data',
        JSON.stringify([
          {
            event_name: evento,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: userData,
            custom_data: customData,
          },
        ]),
      );
      body.set('access_token', cred.token);

      const resp = await fetch(`${GRAPH}/${cred.pixelId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!resp.ok || json?.error) {
        return { ok: false, enviado: false, evento, erro: json?.error?.message ?? `HTTP ${resp.status}` };
      }
      return { ok: true, enviado: true, evento };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`CAPI falhou (lead ${leadId}): ${msg}`);
      return { ok: false, enviado: false, erro: msg };
    }
  }
}
