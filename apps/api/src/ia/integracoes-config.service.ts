// Config de integrações externas (Asaas, Speed, Autentique, WhatsApp/MegaAPI).
// As chaves ficam no campo Config.parametros.integracoes do banco.
// NUNCA retorna a chave inteira — só preview mascarado.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface IntegracaoEntry {
  apiKey?: string | null;
  sandbox?: boolean;
  instancia?: string | null;
  email?: string | null;
  senha?: string | null;
  // URL do webhook n8n do Asaas (dispara a cobranca ao criar o contrato).
  webhook?: string | null;
}

interface Integracoes {
  asaas: IntegracaoEntry;
  speed: IntegracaoEntry;
  autentique: IntegracaoEntry;
  whatsapp: IntegracaoEntry;
  vaicrm: IntegracaoEntry;
}

interface IntegracoesPublicas {
  asaas: { temChave: boolean; preview: string | null; sandbox: boolean; webhook: string | null };
  speed: { temChave: boolean; preview: string | null };
  autentique: { temChave: boolean; preview: string | null };
  whatsapp: { temToken: boolean; preview: string | null; instancia: string | null };
  vaicrm: { temToken: boolean; preview: string | null; email: string | null; temSenha: boolean; configurado: boolean };
}

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class IntegracoesConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private mascarar(chave: string | null | undefined): string | null {
    if (!chave) return null;
    return `••••${chave.slice(-4)}`;
  }

  private async lerParametros(): Promise<Integracoes> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const integ = (params.integracoes as Integracoes) ?? {};
    return {
      asaas: integ.asaas ?? {},
      speed: integ.speed ?? {},
      autentique: integ.autentique ?? {},
      whatsapp: integ.whatsapp ?? {},
      vaicrm: integ.vaicrm ?? {},
    };
  }

  async obter(): Promise<IntegracoesPublicas> {
    const integ = await this.lerParametros();
    return {
      asaas: { temChave: !!integ.asaas.apiKey, preview: this.mascarar(integ.asaas.apiKey), sandbox: integ.asaas.sandbox ?? false, webhook: integ.asaas.webhook ?? null },
      speed: { temChave: !!integ.speed.apiKey, preview: this.mascarar(integ.speed.apiKey) },
      autentique: { temChave: !!integ.autentique.apiKey, preview: this.mascarar(integ.autentique.apiKey) },
      whatsapp: { temToken: !!integ.whatsapp.apiKey, preview: this.mascarar(integ.whatsapp.apiKey), instancia: integ.whatsapp.instancia ?? null },
      vaicrm: {
        temToken: !!integ.vaicrm.apiKey,
        preview: this.mascarar(integ.vaicrm.apiKey),
        email: integ.vaicrm.email ?? null,
        temSenha: !!integ.vaicrm.senha,
        configurado: !!integ.vaicrm.apiKey || !!(integ.vaicrm.email && integ.vaicrm.senha),
      },
    };
  }

  // Uso interno (VaiCrmService): credenciais BRUTAS do VAI CRM (nunca expostas por controller).
  async obterVaiCrmRaw(): Promise<{ apiToken: string | null; email: string | null; senha: string | null }> {
    const integ = await this.lerParametros();
    return {
      apiToken: integ.vaicrm.apiKey ?? null,
      email: integ.vaicrm.email ?? null,
      senha: integ.vaicrm.senha ?? null,
    };
  }

  async atualizar(dto: {
    asaasApiKey?: string;
    asaasSandbox?: boolean;
    asaasWebhook?: string;
    speedApiKey?: string;
    autentiqueToken?: string;
    whatsappToken?: string;
    whatsappInstancia?: string;
    vaicrmToken?: string;
    vaicrmEmail?: string;
    vaicrmSenha?: string;
  }): Promise<IntegracoesPublicas> {
    const integ = await this.lerParametros();
    const limpavel = (v: string | undefined, atual: string | null | undefined) =>
      v === '' ? null : v !== undefined ? v : atual ?? null;

    const novas: Integracoes = {
      asaas: {
        apiKey: limpavel(dto.asaasApiKey, integ.asaas.apiKey),
        sandbox: dto.asaasSandbox ?? integ.asaas.sandbox ?? false,
        webhook: limpavel(dto.asaasWebhook, integ.asaas.webhook),
      },
      speed: { apiKey: limpavel(dto.speedApiKey, integ.speed.apiKey) },
      autentique: { apiKey: limpavel(dto.autentiqueToken, integ.autentique.apiKey) },
      whatsapp: {
        apiKey: limpavel(dto.whatsappToken, integ.whatsapp.apiKey),
        instancia: limpavel(dto.whatsappInstancia, integ.whatsapp.instancia),
      },
      vaicrm: {
        apiKey: limpavel(dto.vaicrmToken, integ.vaicrm.apiKey),
        email: limpavel(dto.vaicrmEmail, integ.vaicrm.email),
        senha: limpavel(dto.vaicrmSenha, integ.vaicrm.senha),
      },
    };

    // Preserva demais chaves de parametros (ex.: portalFrase) — grava só integracoes.
    const configAtual = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const paramsAtuais = (configAtual?.parametros as Record<string, unknown>) ?? {};
    const payload = { ...paramsAtuais, integracoes: novas } as unknown as Parameters<typeof this.prisma.config.upsert>[0]['update']['parametros'];
    await this.prisma.config.upsert({
      where: { id: CONFIG_ID },
      update: { parametros: payload },
      create: { id: CONFIG_ID, branding: {}, parametros: payload },
    });

    return this.obter();
  }
}
