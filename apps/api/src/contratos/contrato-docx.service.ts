// Geracao do contrato em .docx a partir dos modelos oficiais (COM/SEM Marketing),
// substituindo as tags {{...}} pelos dados do cadastro + planos/produtos do negocio.
// A lista {{ENTREGAVEIS}} usa rawXml (nome em negrito + descricao, em ordem A, B, C...).
import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export type TipoContrato = 'COM_MARKETING' | 'SEM_MARKETING';

export interface EntregavelContrato {
  nome: string;
  descricao?: string | null;
}

export interface DadosContrato {
  codigoContrato: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  email?: string | null;
  whatsappCobranca?: string | null;
  socio?: string | null;
  cpf?: string | null;
  entregaveis: EntregavelContrato[];
  duracaoMeses?: number | null;
  precoMensal: number;
  diaPagamento?: number | null;
  descontoPct?: number | null;
  formaPagamento?: string | null; // BOLETO_PIX | CARTAO
  dataAssinatura?: Date | null;
}

const ARQUIVO: Record<TipoContrato, string> = {
  COM_MARKETING: 'contrato-com-marketing.docx',
  SEM_MARKETING: 'contrato-sem-marketing.docx',
};

@Injectable()
export class ContratoDocxService {
  gerar(tipo: TipoContrato, dados: DadosContrato): Buffer {
    const conteudo = this.carregarTemplate(ARQUIVO[tipo] ?? ARQUIVO.COM_MARKETING);
    const zip = new PizZip(conteudo);
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.render({
      COD_CONTRATO: dados.codigoContrato,
      RAZAO_SOCIAL: dados.razaoSocial ?? '',
      CNPJ: dados.cnpj ?? '',
      ENDERECO: dados.endereco ?? '',
      EMAIL: dados.email ?? '',
      WPP_COBRANCA: dados.whatsappCobranca ?? '',
      SOCIO: dados.socio ?? '',
      CPF: dados.cpf ?? '',
      ENTREGAVEIS: this.montarEntregaveisXml(dados.entregaveis),
      DURACAO: this.formatarDuracao(dados.duracaoMeses),
      PRECO: this.formatarPreco(dados.precoMensal),
      DIA_PAGAMENTO: dados.diaPagamento != null ? String(dados.diaPagamento) : '',
      DESCONTO: dados.descontoPct != null ? `${dados.descontoPct}%` : '',
      FORMA_PAGAMENTO: this.formatarFormaPagamento(dados.formaPagamento),
      DATA: this.formatarData(dados.dataAssinatura),
    });

    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private carregarTemplate(arquivo: string): Buffer {
    const candidatos = [
      join(__dirname, 'templates', arquivo),
      join(__dirname, '..', '..', 'src', 'contratos', 'templates', arquivo),
      join(process.cwd(), 'src', 'contratos', 'templates', arquivo),
      join(process.cwd(), 'apps', 'api', 'src', 'contratos', 'templates', arquivo),
    ];
    const achado = candidatos.find((p) => existsSync(p));
    if (!achado) {
      throw new Error(`Modelo de contrato nao encontrado: ${arquivo}`);
    }
    return readFileSync(achado);
  }

  // ── Formatação das tags ────────────────────────────────────────────────────
  private montarEntregaveisXml(itens: EntregavelContrato[]): string {
    if (!itens || itens.length === 0) {
      return '<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
    }
    const letra = (i: number) => {
      // A, B, ... Z, AA, AB...
      let n = i;
      let s = '';
      do {
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return s;
    };
    return itens
      .map((it, i) => {
        const prefixo = this.esc(`${letra(i)}) `);
        const nome = this.esc(it.nome || '');
        const desc = it.descricao ? this.esc(` – ${it.descricao}`) : '';
        return (
          '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>' +
          `<w:r><w:t xml:space="preserve">${prefixo}</w:t></w:r>` +
          `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${nome}</w:t></w:r>` +
          (desc ? `<w:r><w:t xml:space="preserve">${desc}</w:t></w:r>` : '') +
          '</w:p>'
        );
      })
      .join('');
  }

  private esc(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatarFormaPagamento(forma?: string | null): string {
    if (forma === 'CARTAO') return 'Cartão de Crédito';
    if (forma === 'BOLETO_PIX') return 'Boleto/PIX';
    return forma ?? '';
  }

  private formatarDuracao(meses?: number | null): string {
    if (!meses) return '';
    return `${meses} (${this.numeroExtenso(meses)}) meses`;
  }

  private formatarData(data?: Date | null): string {
    if (!data) return '';
    const d = new Date(data);
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];
    return `${String(d.getDate()).padStart(2, '0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  private formatarPreco(valor: number): string {
    const v = Number(valor) || 0;
    const reais = `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${reais} (${this.valorExtenso(v)})`;
  }

  // ── Número/valor por extenso (pt-BR) ───────────────────────────────────────
  private numeroExtenso(n: number): string {
    const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
      'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    n = Math.floor(n);
    if (n < 0) return '';
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`;
    }
    if (n === 100) return 'cem';
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const r = n % 100;
      return r === 0 ? centenas[c] : `${centenas[c]} e ${this.numeroExtenso(r)}`;
    }
    if (n < 1000000) {
      const milhar = Math.floor(n / 1000);
      const r = n % 1000;
      const pMil = milhar === 1 ? 'mil' : `${this.numeroExtenso(milhar)} mil`;
      if (r === 0) return pMil;
      return `${pMil}${r < 100 || r % 100 === 0 ? ' e ' : ', '}${this.numeroExtenso(r)}`;
    }
    const milhoes = Math.floor(n / 1000000);
    const r = n % 1000000;
    const pMi = milhoes === 1 ? 'um milhão' : `${this.numeroExtenso(milhoes)} milhões`;
    if (r === 0) return pMi;
    return `${pMi}${r < 100 || r % 100 === 0 ? ' e ' : ', '}${this.numeroExtenso(r)}`;
  }

  private valorExtenso(v: number): string {
    const inteiro = Math.floor(v);
    const centavos = Math.round((v - inteiro) * 100);
    const parteReais = `${this.numeroExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`;
    if (centavos === 0) return parteReais;
    const parteCent = `${this.numeroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    return `${parteReais} e ${parteCent}`;
  }
}
