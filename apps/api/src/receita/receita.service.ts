// Consulta de CNPJ na ReceitaWS (https://receitaws.com.br/v1/cnpj/{cnpj}).
// O token (plano pago) fica em Configuracoes -> Integracoes (Config.parametros
// .integracoes.receita.apiKey). Sem token usa a API publica (limite 3/min).
// Mapeia a resposta para os campos do "Cadastro Completo" (auto-preenchimento).
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegracoesConfigService } from '../ia/integracoes-config.service';

export interface CnpjConsultaResultado {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  nomeSocio?: string;
  email?: string;
  whatsappSocio?: string;
  whatsappFinanceiro?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

@Injectable()
export class ReceitaService {
  private readonly logger = new Logger(ReceitaService.name);

  constructor(private readonly integ: IntegracoesConfigService) {}

  async consultarCnpj(cnpjBruto: string): Promise<CnpjConsultaResultado> {
    const digitos = (cnpjBruto ?? '').replace(/\D/g, '');
    if (digitos.length !== 14) {
      throw new HttpException('CNPJ inválido: informe 14 dígitos.', HttpStatus.BAD_REQUEST);
    }

    const { token } = await this.integ.obterReceitaRaw();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    let resp: Awaited<ReturnType<typeof fetch>>;
    try {
      resp = await fetch(`https://receitaws.com.br/v1/cnpj/${digitos}`, { headers });
    } catch (e) {
      this.logger.warn(`Falha ao consultar ReceitaWS: ${String((e as Error)?.message ?? e)}`);
      throw new HttpException(
        'Não foi possível consultar a Receita agora. Tente novamente.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (resp.status === 429) {
      throw new HttpException(
        'Muitas consultas seguidas à Receita. Aguarde alguns segundos e tente de novo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (resp.status === 504) {
      throw new HttpException(
        'A consulta à Receita expirou (dados em atualização). Tente novamente em instantes.',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }
    if (!resp.ok) {
      throw new HttpException('Não foi possível consultar o CNPJ na Receita.', HttpStatus.BAD_GATEWAY);
    }

    const data = (await resp.json()) as Record<string, unknown>;
    if (data.status && data.status !== 'OK') {
      throw new HttpException(
        String(data.message ?? 'CNPJ não encontrado na Receita.'),
        HttpStatus.NOT_FOUND,
      );
    }

    // Telefone pode vir com dois numeros separados por "/"; usa o primeiro.
    const primeiroTelefone = String(data.telefone ?? '').split('/')[0]?.trim() || '';
    const qsa = Array.isArray(data.qsa) ? (data.qsa as Array<Record<string, unknown>>) : [];
    const socio = qsa.length ? String(qsa[0]?.nome ?? '') : '';
    const texto = (v: unknown) => {
      const s = String(v ?? '').trim();
      return s || undefined;
    };

    return {
      razaoSocial: texto(data.nome),
      nomeFantasia: texto(data.fantasia),
      cnpj: texto(data.cnpj),
      nomeSocio: texto(socio),
      email: texto(data.email),
      whatsappSocio: texto(primeiroTelefone),
      whatsappFinanceiro: texto(primeiroTelefone),
      cep: texto(data.cep),
      endereco: texto(data.logradouro),
      numero: texto(data.numero),
      complemento: texto(data.complemento),
      bairro: texto(data.bairro),
      cidade: texto(data.municipio),
      estado: texto(data.uf),
    };
  }
}
