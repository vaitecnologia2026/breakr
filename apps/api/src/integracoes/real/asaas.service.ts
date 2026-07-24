// Adapter real do Asaas (cobranças / financeiro).
// Ativa quando ASAAS_API_KEY estiver no ambiente.
// ASAAS_SANDBOX=true usa api-sandbox.asaas.com em vez de api.asaas.com.
import { Injectable, Logger } from '@nestjs/common';
import { AsaasCobranca, AsaasCobrancaInput, AsaasPort } from '../ports';

@Injectable()
export class AsaasService implements AsaasPort {
  private readonly logger = new Logger(AsaasService.name);
  private readonly base: string;
  private readonly key: string;

  constructor(apiKey: string, sandbox = false) {
    this.key = apiKey;
    this.base = sandbox
      ? 'https://api-sandbox.asaas.com/v3'
      : 'https://api.asaas.com/v3';
  }

  async criarCobranca(input: AsaasCobrancaInput): Promise<AsaasCobranca> {
    const body = {
      customer: input.clienteId,
      billingType: input.formaPagamento ?? 'BOLETO',
      value: input.valor,
      dueDate: input.vencimento,
      description: input.descricao,
    };
    const res = await this.post<AsaasCobrancaRaw>('/payments', body);
    return this.mapCobranca(res);
  }

  async consultarBoletos(filtro?: { status?: string; clienteId?: string }): Promise<AsaasCobranca[]> {
    const params = new URLSearchParams();
    if (filtro?.status) params.set('status', filtro.status);
    if (filtro?.clienteId) params.set('customer', filtro.clienteId);
    const res = await this.get<{ data: AsaasCobrancaRaw[] }>(`/payments?${params}`);
    return (res.data ?? []).map((r) => this.mapCobranca(r));
  }

  private mapCobranca(r: AsaasCobrancaRaw): AsaasCobranca {
    return {
      id: r.id,
      status: r.status,
      valor: r.value,
      vencimento: r.dueDate,
      linkBoleto: r.bankSlipUrl ?? r.invoiceUrl,
      pixCopiaECola: r.pixCopiaECola,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: this.key },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Asaas POST ${path} ${resp.status}: ${txt.slice(0, 300)}`);
    }
    return resp.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const resp = await fetch(`${this.base}${path}`, {
      headers: { access_token: this.key },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Asaas GET ${path} ${resp.status}: ${txt.slice(0, 300)}`);
    }
    return resp.json() as Promise<T>;
  }
}

interface AsaasCobrancaRaw {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  pixCopiaECola?: string;
}
