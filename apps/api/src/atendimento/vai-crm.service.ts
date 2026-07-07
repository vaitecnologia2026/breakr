// Integração com a API externa do VAI CRM (https://api.vaicrm.com.br).
//
// ADITIVO: este serviço NÃO altera o inbox local (AtendimentoService).
// Ele apenas consome os chats/mensagens do VAI CRM para exibi-los dentro da
// tela de Atendimento do Breakr, numa aba própria ("VAI CRM").
//
// Autenticação (por variáveis de ambiente — nenhum segredo fica no código):
//   VAICRM_API_URL       (opcional) base da API. Padrão: https://api.vaicrm.com.br
//   VAICRM_API_TOKEN     (opcional) API Token permanente ("vai_..."). Se presente, é usado direto.
//   VAICRM_EMAIL         (opcional) e-mail para login (fallback quando não há API Token).
//   VAICRM_PASSWORD      (opcional) senha para login.
// Basta configurar o API Token OU o par e-mail/senha.
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

interface LoginResp {
  access_token?: string;
}

@Injectable()
export class VaiCrmService {
  private readonly logger = new Logger('VaiCrmService');

  // JWT obtido via login (email/senha) — cacheado em memória e renovado sob demanda.
  private jwt: string | null = null;
  private jwtExpiraEm = 0; // epoch ms

  private get baseUrl(): string {
    return (process.env.VAICRM_API_URL ?? 'https://api.vaicrm.com.br').replace(/\/+$/, '');
  }

  private get apiToken(): string | null {
    const t = process.env.VAICRM_API_TOKEN?.trim();
    return t ? t : null;
  }

  private get credenciais(): { email: string; senha: string } | null {
    const email = process.env.VAICRM_EMAIL?.trim();
    const senha = process.env.VAICRM_PASSWORD;
    if (email && senha) return { email, senha };
    return null;
  }

  // A integração está utilizável se houver API Token OU par e-mail/senha.
  isConfigured(): boolean {
    return !!this.apiToken || !!this.credenciais;
  }

  // Status seguro para o frontend (nunca devolve segredos).
  status() {
    return {
      configurado: this.isConfigured(),
      metodo: this.apiToken ? 'api_token' : this.credenciais ? 'login' : null,
      baseUrl: this.baseUrl,
    };
  }

  // Extrai o "exp" (epoch s) de um JWT para saber quando renovar (margem de 60s).
  private lerExpiracaoJwt(token: string): number {
    try {
      const payload = token.split('.')[1];
      const json = Buffer.from(payload, 'base64').toString('utf8');
      const obj = JSON.parse(json) as { exp?: number };
      if (obj?.exp) return obj.exp * 1000 - 60_000;
    } catch {
      /* ignora — trata como expirado */
    }
    return 0;
  }

  private async login(): Promise<string> {
    const cred = this.credenciais;
    if (!cred) {
      throw new HttpException(
        'Integração VAI CRM não configurada (defina VAICRM_API_TOKEN ou VAICRM_EMAIL/VAICRM_PASSWORD).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.senha }),
      });
    } catch (e) {
      this.logger.warn(`login fetch falhou: ${(e as Error).message}`);
      throw new HttpException('Não foi possível contatar o VAI CRM.', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      throw new HttpException('Falha ao autenticar no VAI CRM.', HttpStatus.BAD_GATEWAY);
    }
    const data = (await res.json()) as LoginResp;
    if (!data.access_token) {
      throw new HttpException('VAI CRM não retornou token de acesso.', HttpStatus.BAD_GATEWAY);
    }
    this.jwt = data.access_token;
    this.jwtExpiraEm = this.lerExpiracaoJwt(data.access_token);
    return this.jwt;
  }

  // Retorna o header Authorization apropriado, renovando o JWT se preciso.
  private async authHeader(forcarRelogin = false): Promise<string> {
    if (this.apiToken) return `Bearer ${this.apiToken}`;
    if (forcarRelogin || !this.jwt || Date.now() >= this.jwtExpiraEm) {
      await this.login();
    }
    return `Bearer ${this.jwt}`;
  }

  // Requisição genérica à API do VAI CRM. Em 401 (token JWT expirado), tenta 1 relogin.
  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Integração VAI CRM não configurada.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const url = `${this.baseUrl}${path}`;
    const fazer = async (auth: string): Promise<Response> =>
      fetch(url, {
        method,
        headers: {
          Authorization: auth,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

    let res: Response;
    try {
      res = await fazer(await this.authHeader());
      // JWT expirado no meio do caminho: renova uma vez (não se usa API Token).
      if (res.status === 401 && !this.apiToken) {
        res = await fazer(await this.authHeader(true));
      }
    } catch (e) {
      this.logger.warn(`req ${method} ${path} falhou: ${(e as Error).message}`);
      throw new HttpException('Não foi possível contatar o VAI CRM.', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      this.logger.warn(`VAI CRM ${method} ${path} -> ${res.status}: ${txt.slice(0, 300)}`);
      throw new HttpException(`VAI CRM respondeu ${res.status}.`, HttpStatus.BAD_GATEWAY);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // ── Leitura ────────────────────────────────────────────────────────────────

  listarChats(query: { status?: string; page?: number; limit?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (query.status) qs.set('status', query.status);
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    if (query.search) qs.set('search', query.search);
    const sufixo = qs.toString() ? `?${qs.toString()}` : '';
    return this.req<unknown>('GET', `/chats${sufixo}`);
  }

  tabCounts() {
    return this.req<unknown>('GET', '/chats/tab-counts');
  }

  obterChat(id: string) {
    return this.req<unknown>('GET', `/chats/${id}`);
  }

  mensagens(chatId: string, query: { page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (query.page) qs.set('page', String(query.page));
    if (query.limit) qs.set('limit', String(query.limit));
    const sufixo = qs.toString() ? `?${qs.toString()}` : '';
    return this.req<unknown>('GET', `/chats/${chatId}/messages${sufixo}`);
  }

  // ── Ações ────────────────────────────────────────────────────────────────

  enviarMensagem(chatId: string, content: string) {
    return this.req<unknown>('POST', `/chats/${chatId}/messages`, { content, type: 'text' });
  }

  iniciarAtendimento(chatId: string) {
    return this.req<unknown>('POST', `/chats/${chatId}/start-service`);
  }

  encerrar(chatId: string, reasonId?: string, notes?: string) {
    const body: Record<string, unknown> = {};
    if (reasonId) body.reasonId = reasonId;
    if (notes) body.notes = notes;
    return this.req<unknown>('POST', `/chats/${chatId}/close`, body);
  }

  reabrir(chatId: string) {
    return this.req<unknown>('POST', `/chats/${chatId}/reopen`);
  }
}
