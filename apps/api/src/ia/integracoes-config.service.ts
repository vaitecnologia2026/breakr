// Config de integrações externas (Asaas, Speed, Autentique, WhatsApp).
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
  // Google Agenda: JSON de credenciais do Google (Service Account OU cliente
  // OAuth Web), calendario alvo e e-mail a impersonar (Service Account). Para o
  // fluxo OAuth guarda tambem o refresh token e o e-mail da conta conectada.
  serviceAccountJson?: string | null;
  calendarId?: string | null;
  impersonateEmail?: string | null;
  refreshToken?: string | null;
  googleEmail?: string | null;
  // Ads (Meta/Google) — Briefing Marketing (Secao 12, item 13). apiKey guarda o
  // token de acesso; contaId, o ID da conta de anuncios. A leitura automatica de
  // metricas (adapter) e etapa futura — aqui guardamos apenas as credenciais.
  contaId?: string | null;
  // Meta Ads (Marketing API): credenciais adicionais para conectar a conta e
  // criar/gerenciar campanhas e ler resultados. appSecret NUNCA e exposto por
  // controller (so booleano temAppSecret no obter()).
  appId?: string | null;
  appSecret?: string | null;
  pageId?: string | null;
  pixelId?: string | null;
}

interface Integracoes {
  asaas: IntegracaoEntry;
  speed: IntegracaoEntry;
  autentique: IntegracaoEntry;
  whatsapp: IntegracaoEntry;
  vaicrm: IntegracaoEntry;
  google: IntegracaoEntry;
  adsMeta: IntegracaoEntry;
  adsGoogle: IntegracaoEntry;
  receita: IntegracaoEntry;
}

interface IntegracoesPublicas {
  asaas: { temChave: boolean; preview: string | null; sandbox: boolean; webhook: string | null };
  speed: { temChave: boolean; preview: string | null };
  autentique: { temChave: boolean; preview: string | null };
  whatsapp: { temToken: boolean; preview: string | null; instancia: string | null };
  vaicrm: { temToken: boolean; preview: string | null; email: string | null; temSenha: boolean; configurado: boolean };
  google: { configurado: boolean; calendarId: string | null; email: string | null; conectado: boolean; contaConectada: string | null };
  adsMeta: { temToken: boolean; preview: string | null; contaId: string | null; temAppId: boolean; temAppSecret: boolean; appId: string | null; pageId: string | null; pixelId: string | null };
  adsGoogle: { temToken: boolean; preview: string | null; contaId: string | null };
  receita: { temToken: boolean; preview: string | null };
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
      google: integ.google ?? {},
      adsMeta: integ.adsMeta ?? {},
      adsGoogle: integ.adsGoogle ?? {},
      receita: integ.receita ?? {},
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
      google: {
        configurado: !!integ.google.serviceAccountJson,
        calendarId: integ.google.calendarId ?? null,
        email: integ.google.impersonateEmail ?? null,
        conectado: !!integ.google.refreshToken,
        contaConectada: integ.google.googleEmail ?? null,
      },
      adsMeta: {
        temToken: !!integ.adsMeta.apiKey,
        preview: this.mascarar(integ.adsMeta.apiKey),
        contaId: integ.adsMeta.contaId ?? null,
        temAppId: !!integ.adsMeta.appId,
        temAppSecret: !!integ.adsMeta.appSecret,
        appId: integ.adsMeta.appId ?? null,
        pageId: integ.adsMeta.pageId ?? null,
        pixelId: integ.adsMeta.pixelId ?? null,
      },
      adsGoogle: { temToken: !!integ.adsGoogle.apiKey, preview: this.mascarar(integ.adsGoogle.apiKey), contaId: integ.adsGoogle.contaId ?? null },
      receita: { temToken: !!integ.receita.apiKey, preview: this.mascarar(integ.receita.apiKey) },
    };
  }

  // Uso interno (ReceitaService): token BRUTO da ReceitaWS (nunca exposto por controller).
  async obterReceitaRaw(): Promise<{ token: string | null }> {
    const integ = await this.lerParametros();
    return { token: integ.receita.apiKey ?? null };
  }

  // Uso interno (GoogleAgendaService): credenciais BRUTAS do Google Agenda
  // (nunca expostas por controller). O JSON contem chave privada / client_secret.
  async obterGoogleRaw(): Promise<{ serviceAccountJson: string | null; calendarId: string | null; impersonateEmail: string | null; refreshToken: string | null; googleEmail: string | null }> {
    const integ = await this.lerParametros();
    return {
      serviceAccountJson: integ.google.serviceAccountJson ?? null,
      calendarId: integ.google.calendarId ?? null,
      impersonateEmail: integ.google.impersonateEmail ?? null,
      refreshToken: integ.google.refreshToken ?? null,
      googleEmail: integ.google.googleEmail ?? null,
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

  // Uso interno (MetaAdsService): credenciais BRUTAS do Meta Ads (nunca expostas
  // por controller). Le do banco e cai para .env como fallback.
  async obterAdsMetaRaw(): Promise<{
    token: string | null;
    contaId: string | null;
    appId: string | null;
    appSecret: string | null;
    pageId: string | null;
    pixelId: string | null;
  }> {
    const integ = await this.lerParametros();
    return {
      token: integ.adsMeta.apiKey ?? process.env.META_ADS_TOKEN ?? null,
      contaId: integ.adsMeta.contaId ?? process.env.META_ADS_CONTA_ID ?? null,
      appId: integ.adsMeta.appId ?? process.env.META_ADS_APP_ID ?? null,
      appSecret: integ.adsMeta.appSecret ?? process.env.META_ADS_APP_SECRET ?? null,
      pageId: integ.adsMeta.pageId ?? process.env.META_ADS_PAGE_ID ?? null,
      pixelId: integ.adsMeta.pixelId ?? process.env.META_ADS_PIXEL_ID ?? null,
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
    googleServiceAccount?: string;
    googleCalendarId?: string;
    googleImpersonateEmail?: string;
    adsMetaToken?: string;
    adsMetaContaId?: string;
    adsMetaAppId?: string;
    adsMetaAppSecret?: string;
    adsMetaPageId?: string;
    adsMetaPixelId?: string;
    adsGoogleToken?: string;
    adsGoogleContaId?: string;
    receitaToken?: string;
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
      google: {
        serviceAccountJson: limpavel(dto.googleServiceAccount, integ.google.serviceAccountJson),
        calendarId: limpavel(dto.googleCalendarId, integ.google.calendarId),
        impersonateEmail: limpavel(dto.googleImpersonateEmail, integ.google.impersonateEmail),
        // Preserva a conexao OAuth ja existente (nao vem do formulario de credenciais).
        refreshToken: integ.google.refreshToken ?? null,
        googleEmail: integ.google.googleEmail ?? null,
      },
      adsMeta: {
        apiKey: limpavel(dto.adsMetaToken, integ.adsMeta.apiKey),
        contaId: limpavel(dto.adsMetaContaId, integ.adsMeta.contaId),
        appId: limpavel(dto.adsMetaAppId, integ.adsMeta.appId),
        appSecret: limpavel(dto.adsMetaAppSecret, integ.adsMeta.appSecret),
        pageId: limpavel(dto.adsMetaPageId, integ.adsMeta.pageId),
        pixelId: limpavel(dto.adsMetaPixelId, integ.adsMeta.pixelId),
      },
      adsGoogle: {
        apiKey: limpavel(dto.adsGoogleToken, integ.adsGoogle.apiKey),
        contaId: limpavel(dto.adsGoogleContaId, integ.adsGoogle.contaId),
      },
      receita: {
        apiKey: limpavel(dto.receitaToken, integ.receita.apiKey),
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
