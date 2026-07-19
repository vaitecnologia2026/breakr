// Integracao Meta Ads (Marketing API) — M17 Fase 2.
// Conecta a conta de anuncios do Meta para: validar a conexao, criar e gerenciar
// campanhas e ler resultados (insights) direto do Graph API. As credenciais vem
// do IntegracoesConfigService (banco -> .env como fallback); NADA e hardcoded.
// Degrada com elegancia: se nao estiver configurado, o token estiver invalido ou
// o app bloqueado (ex.: "Data Use Checkup"), retorna { ok:false, erro } — nunca
// derruba a aplicacao (todas as chamadas ficam sob try/catch).
import { Injectable } from '@nestjs/common';
import { IntegracoesConfigService } from '../ia/integracoes-config.service';

// Versao do Graph API usada na documentacao da integracao (facebook-marketing).
const GRAPH = 'https://graph.facebook.com/v25.0';

export interface MetaResposta<T = unknown> {
  ok: boolean;
  dados?: T;
  erro?: string;
}

@Injectable()
export class MetaAdsService {
  constructor(private readonly config: IntegracoesConfigService) {}

  private cred() {
    return this.config.obterAdsMetaRaw();
  }

  // Normaliza o ID da conta: aceita "act_123" ou "123".
  private conta(contaId: string): string {
    return contaId.startsWith('act_') ? contaId : `act_${contaId}`;
  }

  // Chamada generica ao Graph: trata erro da Meta (json.error) e falha de rede,
  // sempre devolvendo um MetaResposta — nunca lanca excecao para cima.
  private async chamar<T>(url: string, init?: RequestInit): Promise<MetaResposta<T>> {
    try {
      const resp = await fetch(url, init);
      const json = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!resp.ok || json?.error) {
        return { ok: false, erro: json?.error?.message ?? `HTTP ${resp.status}` };
      }
      return { ok: true, dados: json as T };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, erro: `Falha de rede: ${msg}` };
    }
  }

  // Status da conexao: valida token + conta. Se a Meta responder com erro
  // (ex.: app em "Data Use Checkup"), retorna conectado:false e a mensagem.
  async status(): Promise<
    MetaResposta<{ configurado: boolean; conectado: boolean; usuario?: unknown; conta?: unknown }>
  > {
    const c = await this.cred();
    const configurado = !!c.token && !!c.contaId;
    if (!configurado) {
      return { ok: true, dados: { configurado: false, conectado: false } };
    }
    const me = await this.chamar<Record<string, unknown>>(
      `${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(c.token as string)}`,
    );
    if (!me.ok) {
      return { ok: true, dados: { configurado: true, conectado: false }, erro: me.erro };
    }
    const conta = await this.chamar<Record<string, unknown>>(
      `${GRAPH}/${this.conta(c.contaId as string)}?fields=account_id,name,account_status,currency&access_token=${encodeURIComponent(
        c.token as string,
      )}`,
    );
    if (!conta.ok) {
      return { ok: true, dados: { configurado: true, conectado: false, usuario: me.dados }, erro: conta.erro };
    }
    return { ok: true, dados: { configurado: true, conectado: true, usuario: me.dados, conta: conta.dados } };
  }

  // Lista as campanhas reais da conta de anuncios.
  async listarCampanhas(): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token || !c.contaId) return { ok: false, erro: 'Meta Ads nao configurado (token e conta).' };
    const fields = 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time';
    return this.chamar(
      `${GRAPH}/${this.conta(c.contaId)}/campaigns?fields=${fields}&limit=50&access_token=${encodeURIComponent(
        c.token,
      )}`,
    );
  }

  // Cria uma campanha na conta de anuncios. Por seguranca, cria PAUSADA por padrao.
  async criarCampanha(dto: {
    nome: string;
    objetivo?: string;
    status?: string;
    orcamentoDiario?: number;
    categoriasEspeciais?: string[];
  }): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token || !c.contaId) return { ok: false, erro: 'Meta Ads nao configurado (token e conta).' };
    const body = new URLSearchParams();
    body.set('name', dto.nome);
    body.set('objective', dto.objetivo ?? 'OUTCOME_TRAFFIC');
    body.set('status', dto.status ?? 'PAUSED');
    body.set('special_ad_categories', JSON.stringify(dto.categoriasEspeciais ?? []));
    if (dto.orcamentoDiario !== undefined) {
      // Meta cobra na menor unidade da moeda (centavos).
      body.set('daily_budget', String(Math.round(dto.orcamentoDiario * 100)));
    }
    body.set('access_token', c.token);
    return this.chamar(`${GRAPH}/${this.conta(c.contaId)}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  // Gerencia o status de uma campanha (ACTIVE, PAUSED, ARCHIVED, DELETED).
  async moverStatus(campanhaId: string, status: string): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    const body = new URLSearchParams();
    body.set('status', status);
    body.set('access_token', c.token);
    return this.chamar(`${GRAPH}/${campanhaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  // Resultados (insights): da conta inteira ou de uma campanha especifica.
  async insights(params: {
    campanhaId?: string;
    nivel?: string;
    desde?: string;
    ate?: string;
  }): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token || !c.contaId) return { ok: false, erro: 'Meta Ads nao configurado (token e conta).' };
    // Campos base + conversao/receita (actions/action_values/roas): read-only,
    // aditivo — se a conta nao tiver Pixel/eventos, a Meta simplesmente omite.
    const fields =
      'impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,campaign_name,adset_name,ad_name,' +
      'actions,action_values,purchase_roas,cost_per_action_type';
    const base = params.campanhaId
      ? `${GRAPH}/${params.campanhaId}/insights`
      : `${GRAPH}/${this.conta(c.contaId)}/insights`;
    const usp = new URLSearchParams();
    usp.set('fields', fields);
    if (params.nivel) usp.set('level', params.nivel);
    if (params.desde && params.ate) {
      usp.set('time_range', JSON.stringify({ since: params.desde, until: params.ate }));
    }
    usp.set('access_token', c.token);
    return this.chamar(`${base}?${usp.toString()}`);
  }

  // Serie temporal (grafico gasto x receita): insights com time_increment=1.
  // Traz gasto e valor de conversao por dia. Read-only; sem model.
  async insightsSerie(params: { desde?: string; ate?: string }): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token || !c.contaId) return { ok: false, erro: 'Meta Ads nao configurado (token e conta).' };
    const usp = new URLSearchParams();
    usp.set('fields', 'spend,action_values,purchase_roas,impressions,clicks');
    usp.set('time_increment', '1');
    if (params.desde && params.ate) {
      usp.set('time_range', JSON.stringify({ since: params.desde, until: params.ate }));
    } else {
      usp.set('date_preset', 'last_30d');
    }
    usp.set('access_token', c.token);
    return this.chamar(`${GRAPH}/${this.conta(c.contaId)}/insights?${usp.toString()}`);
  }

  // Hierarquia — conjuntos de anuncio (adsets) de uma campanha. Read-only.
  async listarAdsets(campanhaId: string): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    const fields = 'id,name,status,effective_status,daily_budget,optimization_goal';
    return this.chamar(
      `${GRAPH}/${campanhaId}/adsets?fields=${fields}&limit=50&access_token=${encodeURIComponent(c.token)}`,
    );
  }

  // Hierarquia — anuncios (ads) de uma campanha ou conjunto. Read-only.
  async listarAds(params: { campanhaId?: string; adsetId?: string }): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    const base = params.adsetId ?? params.campanhaId;
    if (!base) return { ok: false, erro: 'Informe a campanha ou o conjunto (adset).' };
    const fields = 'id,name,status,effective_status,creative{id}';
    return this.chamar(
      `${GRAPH}/${base}/ads?fields=${fields}&limit=50&access_token=${encodeURIComponent(c.token)}`,
    );
  }

  // Fase B (escrita) — ajusta o orcamento diario de uma campanha (ads_management).
  // Meta cobra em centavos. Degrada com elegancia como as demais chamadas.
  async ajustarOrcamento(campanhaId: string, orcamentoDiario: number): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    if (!(orcamentoDiario > 0)) return { ok: false, erro: 'Orcamento diario invalido.' };
    const body = new URLSearchParams();
    body.set('daily_budget', String(Math.round(orcamentoDiario * 100)));
    body.set('access_token', c.token);
    return this.chamar(`${GRAPH}/${campanhaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  // --- Descoberta / diagnostico (somente leitura) — apoia a configuracao das
  // credenciais. Reaproveita ideias do wrapper fb-graph do PONS, sem nada novo
  // no banco: apenas GETs ao Graph com o token ja configurado. ---

  // Lista as contas de anuncio do token (/me/adaccounts): ajuda a descobrir o
  // ID correto (act_...) em vez de digitar no chute.
  async listarContasAnuncio(): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    const fields = 'account_id,name,account_status,currency';
    return this.chamar(
      `${GRAPH}/me/adaccounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(c.token)}`,
    );
  }

  // Lista as paginas do token (/me/accounts): ajuda a descobrir o Page ID. So
  // id e name — o access_token de pagina NAO e solicitado nem exposto.
  async listarPaginas(): Promise<MetaResposta> {
    const c = await this.cred();
    if (!c.token) return { ok: false, erro: 'Meta Ads nao configurado (token).' };
    return this.chamar(
      `${GRAPH}/me/accounts?fields=id,name&limit=100&access_token=${encodeURIComponent(c.token)}`,
    );
  }

  // Diagnostica um token (/debug_token): tipo, validade, scopes e app. Usa o
  // app access token (appId|appSecret). Sem token informado, inspeciona o token
  // configurado. Aponta na hora token do tipo errado / app errado / expirado.
  async diagnosticarToken(tokenInput?: string): Promise<MetaResposta> {
    const c = await this.cred();
    const alvo = tokenInput?.trim() || c.token;
    if (!alvo) return { ok: false, erro: 'Informe um token ou configure o token Meta Ads.' };
    if (!c.appId || !c.appSecret) {
      return { ok: false, erro: 'Informe App ID e App Secret em Configuracoes para diagnosticar o token.' };
    }
    const appAccess = `${c.appId}|${c.appSecret}`;
    return this.chamar(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(alvo)}&access_token=${encodeURIComponent(
        appAccess,
      )}`,
    );
  }
}
